"""Deployment traffic and council smoke safety tests."""

import copy
import json
import os
import subprocess
import urllib.request
from pathlib import Path

import pytest

from scripts.cloud_run_traffic import canonical_traffic, compare, revisions, snapshot, tags
from scripts.verify_council_smoke import (
    COMPLETION_COST_UPPER_BOUND_PER_MILLION,
    EXPECTED_CHAIRMAN,
    EXPECTED_CHAIRMAN_OUTPUT,
    EXPECTED_CHAIRMAN_ROUTE,
    EXPECTED_EVALUATOR_ROUTES,
    EXPECTED_EVALUATORS,
    EXPECTED_MODELS,
    EXPECTED_ROUTES,
    PROMPT_COST_UPPER_BOUND_PER_MILLION,
    SYNTHETIC_QUERY,
    SmokeVerificationError,
    _sample_metrics,
    canonical_smoke_plan,
    compare_evidence,
    parse_sse_complete,
    post_council,
    post_council_stream,
    run_smoke,
    verify_payload,
)
from scripts.verify_council_smoke import (
    main as smoke_main,
)
from scripts.verify_service_routing import RoutingVerificationError, verify_service_routing


def service_state():
    return {
        "status": {
            "traffic": [
                {"revisionName": "stable-a", "percent": 70},
                {"revisionName": "stable-b", "percent": 30, "tag": "stable"},
                {"revisionName": "old-debug", "percent": 0, "tag": "debug"},
            ]
        }
    }


def smoke_payload():
    stage1 = [
        {
            "model": model,
            "route_id": route,
            "selected_route_id": route,
            "fallback_used": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "terminal_status": "succeeded",
            "error": None,
            "response": "synthetic result",
            "usage": {"prompt_tokens": 60, "completion_tokens": 40, "total_tokens": 100},
        }
        for model, route in zip(EXPECTED_MODELS, EXPECTED_ROUTES, strict=True)
    ]
    stage2 = [
        {
            "model": model,
            "ranking": "synthetic ranking",
            "provider": "synthetic-provider",
            "route_id": route,
            "selected_route_id": route,
            "fallback_used": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "terminal_status": "succeeded",
            "error": None,
            "parsed_ranking": ["Response A"],
            "usage": {"prompt_tokens": 30, "completion_tokens": 20, "total_tokens": 50},
        }
        for model, route in zip(
            EXPECTED_EVALUATORS,
            EXPECTED_EVALUATOR_ROUTES,
            strict=True,
        )
    ]
    return {
        "stage1": stage1,
        "stage2": stage2,
        "stage3": {
            "model": EXPECTED_CHAIRMAN,
            "response": "synthetic synthesis",
            "provider": "vertex-anthropic",
            "route_id": EXPECTED_CHAIRMAN_ROUTE,
            "selected_route_id": EXPECTED_CHAIRMAN_ROUTE,
            "fallback_used": False,
            "allow_declared_route_failover": False,
            "allow_provider_substitution": False,
            "terminal_status": "succeeded",
            "error": None,
            "usage": {"prompt_tokens": 60, "completion_tokens": 40, "total_tokens": 100},
        },
        "metadata": {
            "execution_plan": {
                "models": [
                    {"model": model, "route_id": route}
                    for model, route in zip(EXPECTED_MODELS, EXPECTED_ROUTES, strict=True)
                ],
                "registry_digest": "reviewed-registry",
                "settings": {
                    "allow_declared_route_failover": False,
                    "allow_provider_substitution": False,
                },
            }
        },
        "timing": {"elapsed_seconds": 10},
    }


def _make_objective_output(payload):
    payload["stage3"]["response"] = EXPECTED_CHAIRMAN_OUTPUT
    return payload


def test_smoke_fixture_matches_canonical_compact_no_fallback_plan():
    plan = canonical_smoke_plan()

    assert [item["model"] for item in smoke_payload()["stage1"]] == [item.logical_id for item in plan.stage1]
    assert [item["selected_route_id"] for item in smoke_payload()["stage1"]] == [item.route.route_id for item in plan.stage1]
    assert [item.logical_id for item in plan.evaluators] == [
        "anthropic/claude-fable-5",
        "openai/gpt-5.6-sol",
    ]
    assert [item["model"] for item in smoke_payload()["stage2"]] == [item.logical_id for item in plan.evaluators]
    assert plan.settings.allow_declared_route_failover is False
    assert plan.settings.allow_provider_substitution is False


def test_smoke_http_request_explicitly_disables_both_policies(monkeypatch):
    observed = {}

    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def read(self):
            return b"{}"

    def urlopen(request, timeout):
        observed["body"] = json.loads(request.data)
        observed["timeout"] = timeout
        return Response()

    monkeypatch.setattr(urllib.request, "urlopen", urlopen)

    post_council("https://candidate.example", "key", 30)

    assert observed["body"]["allow_declared_route_failover"] is False
    assert observed["body"]["allow_provider_substitution"] is False


def _sse(payload, *, terminated=True):
    lines = [b'data: {"event":"stage_start","stage":1}\n', b"\n"]
    lines.append(f"data: {json.dumps({'event': 'complete', **payload})}\n".encode())
    if terminated:
        lines.append(b"\n")
    return lines


def test_stream_http_request_is_strict_and_parses_complete_without_network(monkeypatch):
    observed = {}
    payload = _make_objective_output(smoke_payload())

    class Response:
        status = 200

        def __init__(self):
            self.lines = iter(_sse(payload))

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def readline(self, _limit):
            return next(self.lines, b"")

    def urlopen(request, timeout):
        observed["url"] = request.full_url
        observed["body"] = json.loads(request.data)
        observed["timeout"] = timeout
        return Response()

    monkeypatch.setattr(urllib.request, "urlopen", urlopen)
    complete, _elapsed = post_council_stream("https://candidate.example", "key", 30)

    assert observed["url"].endswith("/api/council/stream")
    assert observed["body"]["query"] == SYNTHETIC_QUERY
    assert observed["body"]["allow_declared_route_failover"] is False
    assert observed["body"]["allow_provider_substitution"] is False
    assert complete["event"] == "complete"
    verify_payload(complete, 10, max_latency=100, max_tokens=60000, max_cost=2)


@pytest.mark.parametrize(
    ("lines", "message"),
    [
        ([b"data: not-json\n", b"\n"], "malformed"),
        ([b'data: {"event":"complete"}\n'], "without a complete"),
        ([b'data: {"event":"error"}\n', b"\n"], "unexpected"),
        ([b"event: complete\n", b"\n"], "framing"),
    ],
)
def test_stream_rejects_malformed_missing_complete_truncated_and_unexpected_events(lines, message):
    with pytest.raises(SmokeVerificationError, match=message):
        parse_sse_complete(lines)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda value: value["stage2"][0].update(selected_route_id="wrong-route"),
        lambda value: value["stage3"].update(fallback_used=True),
    ],
)
def test_stream_rejects_fallback_or_route_mismatch(mutation):
    payload = _make_objective_output(smoke_payload())
    mutation(payload)
    complete = parse_sse_complete(_sse(payload))
    with pytest.raises(SmokeVerificationError, match="route|fallback"):
        verify_payload(complete, 10, max_latency=100, max_tokens=60000, max_cost=2)


def test_stream_rejects_policy_omission():
    payload = _make_objective_output(smoke_payload())
    payload["stage1"][0].pop("allow_provider_substitution")
    complete = parse_sse_complete(_sse(payload))
    with pytest.raises(SmokeVerificationError, match="provenance"):
        verify_payload(complete, 10, max_latency=100, max_tokens=60000, max_cost=2)


def test_smoke_rejects_sync_stream_provenance_mismatch():
    sync = _make_objective_output(smoke_payload())
    streamed = copy.deepcopy(sync)
    streamed["stage1"][0]["selected_route_id"] = "different-route"

    with pytest.raises(SmokeVerificationError, match="sync/stream"):
        run_smoke(
            "https://candidate.example", "project", "secret", samples=5, stream_samples=1,
            timeout=100, max_latency=100, max_tokens=60000, max_cost=2,
            strict_candidate=False, secret_loader=lambda *_args: "key",
            poster=lambda *_args: (sync, 10), stream_poster=lambda *_args: (streamed, 10),
        )


def test_complete_traffic_snapshot_preserves_and_verifies_zero_percent_tag(tmp_path):
    source = tmp_path / "service.json"
    expected = tmp_path / "traffic.json"
    source.write_text(__import__("json").dumps(service_state()))
    snapshot(str(source), str(expected))

    assert "old-debug" in expected.read_text()
    assert '"percent":0' in expected.read_text()
    assert revisions(str(expected)) == "stable-a=70,stable-b=30"
    assert tags(str(expected)) == "debug=old-debug,stable=stable-b"
    compare(str(source), str(expected))

    lossy = service_state()
    lossy["status"]["traffic"].pop()
    source.write_text(__import__("json").dumps(lossy))
    with pytest.raises(ValueError, match="exactly match"):
        compare(str(source), str(expected))


def test_canonical_traffic_ignores_urls_but_not_complete_assignment_state():
    payload = service_state()
    payload["status"]["traffic"][2]["url"] = "https://tag.example"
    assert canonical_traffic(payload)[0].keys() == {"revisionName", "percent", "tag"}


@pytest.mark.parametrize(
    ("mutation", "message"),
    [
        (lambda value: value["stage1"][0].update(model="openai/gpt-5.5"), "provenance"),
        (lambda value: value["stage1"][0].update(fallback_used=True), "fallback"),
        (lambda value: value["stage1"][0].update(error={"code": "failed"}), "unsuccessful"),
        (lambda value: value["timing"].update(elapsed_seconds=999), "latency"),
        (
            lambda value: value["stage1"][0]["usage"].update(
                prompt_tokens=999999, completion_tokens=0, total_tokens=999999
            ),
            "token",
        ),
    ],
)
def test_smoke_rejects_old_roster_fallback_error_latency_and_tokens(mutation, message):
    payload = _make_objective_output(smoke_payload())
    mutation(payload)
    with pytest.raises(SmokeVerificationError, match=message):
        verify_payload(payload, 10, max_latency=100, max_tokens=60000, max_cost=2)


def test_smoke_rejects_cost_ceiling():
    with pytest.raises(SmokeVerificationError, match="cost"):
        verify_payload(_make_objective_output(smoke_payload()), 10, max_latency=100, max_tokens=60000, max_cost=0.001)


@pytest.mark.parametrize("stage", ("stage1", "stage2", "stage3"))
def test_smoke_rejects_missing_usage_in_each_successful_stage(stage):
    payload = _make_objective_output(smoke_payload())
    item = payload[stage][0] if isinstance(payload[stage], list) else payload[stage]
    item.pop("usage")

    with pytest.raises(SmokeVerificationError, match="usage.*missing"):
        verify_payload(payload, 10, max_latency=100, max_tokens=60000, max_cost=2)


@pytest.mark.parametrize(
    "usage",
    [
        {"prompt_tokens": -1, "completion_tokens": 2, "total_tokens": 1},
        {"prompt_tokens": 1, "completion_tokens": 2, "total_tokens": 4},
        {"prompt_tokens": 1, "completion_tokens": None, "total_tokens": 1},
    ],
)
def test_smoke_rejects_negative_inconsistent_or_nonnumeric_usage(usage):
    payload = _make_objective_output(smoke_payload())
    payload["stage1"][0]["usage"] = usage

    with pytest.raises(SmokeVerificationError, match="usage"):
        verify_payload(payload, 10, max_latency=100, max_tokens=60000, max_cost=2)


def test_smoke_uses_separate_reviewed_conservative_cost_bounds():
    payload = _make_objective_output(smoke_payload())
    metrics = _sample_metrics(payload, 10)
    expected_prompt_tokens = 420
    expected_completion_tokens = 280

    assert PROMPT_COST_UPPER_BOUND_PER_MILLION >= 50
    assert COMPLETION_COST_UPPER_BOUND_PER_MILLION >= 100
    assert metrics["conservative_cost_usd"] == pytest.approx(
        (
            expected_prompt_tokens * PROMPT_COST_UPPER_BOUND_PER_MILLION
            + expected_completion_tokens * COMPLETION_COST_UPPER_BOUND_PER_MILLION
        )
        / 1_000_000
    )


@pytest.mark.parametrize(
    "response",
    [
        f"prefix {EXPECTED_CHAIRMAN_OUTPUT}",
        f"{EXPECTED_CHAIRMAN_OUTPUT} suffix",
        f"{EXPECTED_CHAIRMAN_OUTPUT}; 2+2=5",
    ],
)
def test_smoke_rejects_extra_chairman_output(response):
    payload = smoke_payload()
    payload["stage3"]["response"] = response

    with pytest.raises(SmokeVerificationError, match="quality"):
        verify_payload(payload, 10, max_latency=100, max_tokens=60000, max_cost=2)


@pytest.mark.parametrize(
    "mutation",
    [
        lambda value: value["stage2"][0].update(selected_route_id="openrouter:wrong"),
        lambda value: value["stage2"][0].update(fallback_used=True),
        lambda value: value["stage3"].update(selected_route_id="openrouter:anthropic/claude-fable-5"),
        lambda value: value["stage3"].update(fallback_used=True),
    ],
)
def test_smoke_rejects_evaluator_or_chairman_route_mismatch_and_fallback(mutation):
    payload = _make_objective_output(smoke_payload())
    mutation(payload)
    with pytest.raises(SmokeVerificationError, match="route|fallback"):
        verify_payload(payload, 10, max_latency=100, max_tokens=60000, max_cost=2)


def test_smoke_mocks_secret_manager_and_network_without_disclosure(capsys):
    calls = []

    def secret_loader(project, secret):
        calls.append(("gcloud", project, secret))
        return "super-secret-council-key"

    def poster(url, key, timeout):
        calls.append(("network", url, key, timeout))
        return _make_objective_output(smoke_payload()), 10

    run_smoke(
        "https://candidate.example",
        "project",
        "secret-name",
        timeout=100,
        max_latency=100,
        max_tokens=60000,
        max_cost=2,
        secret_loader=secret_loader,
        poster=poster,
    )
    output = capsys.readouterr().out + capsys.readouterr().err
    assert calls[0] == ("gcloud", "project", "secret-name")
    assert calls[1][0] == "network"
    assert "super-secret-council-key" not in output
    assert SYNTHETIC_QUERY not in output
    assert "synthetic result" not in output
    evidence_text = json.dumps(
        run_smoke(
            "https://candidate.example", "project", "secret-name", samples=5,
            timeout=100, max_latency=100, max_tokens=60000, max_cost=2,
            secret_loader=secret_loader, poster=poster,
        )
    )
    assert "super-secret-council-key" not in evidence_text
    assert SYNTHETIC_QUERY not in evidence_text
    assert "synthetic result" not in evidence_text


def test_baseline_proof_detects_changed_restored_route():
    baseline = _make_objective_output(smoke_payload())
    proof = verify_payload(
        baseline, 10, max_latency=100, max_tokens=60000, max_cost=2, strict_candidate=False
    )
    changed = copy.deepcopy(baseline)
    changed["stage1"][0]["selected_route_id"] = "different-route"
    with pytest.raises(SmokeVerificationError, match="baseline"):
        verify_payload(
            changed,
            10,
            max_latency=100,
            max_tokens=60000,
            max_cost=2,
            expected_proof=proof,
            strict_candidate=False,
        )


def legacy_smoke_payload():
    payload = _make_objective_output(smoke_payload())
    payload["stage1"][0]["model"] = "openai/gpt-5.5"
    for item in [*payload["stage1"], *payload["stage2"], payload["stage3"]]:
        for field in (
            "route_id", "selected_route_id", "fallback_used",
            "allow_declared_route_failover", "allow_provider_substitution",
            "terminal_status", "usage",
        ):
            item.pop(field, None)
    payload.pop("metadata")
    return payload


def test_legacy_baseline_preserves_available_provenance_without_inventing_route_success():
    payload = legacy_smoke_payload()

    proof = verify_payload(
        payload, 10, max_latency=100, max_tokens=60000, max_cost=2,
        strict_candidate=False, legacy_baseline=True,
    )

    assert proof["provenance_contract"] == "legacy-unavailable"
    assert proof["stage1"][0]["model"] == "openai/gpt-5.5"
    assert proof["stage1"][0]["provider"] is None
    assert proof["stage1"][0]["configured_route_id"] is None
    assert proof["stage1"][0]["observed_route_id"] is None
    metrics = _sample_metrics(payload, 10, legacy_baseline=True)
    assert metrics["route_success"] is None
    assert metrics["token_count"] is None
    verify_payload(
        copy.deepcopy(payload), 10, max_latency=100, max_tokens=60000, max_cost=2,
        expected_proof=proof, strict_candidate=False, legacy_baseline=True,
    )


@pytest.mark.parametrize(
    "mutation",
    [
        lambda item: item.update(error={"code": "failed"}),
        lambda item: item.update(fallback_used=True),
        lambda item: item.update(terminal_status="failed"),
        lambda item: item.update(response=""),
    ],
)
def test_legacy_baseline_rejects_explicit_failure_fallback_error_or_missing_content(mutation):
    payload = legacy_smoke_payload()
    mutation(payload["stage1"][0])
    with pytest.raises(SmokeVerificationError, match="legacy baseline"):
        verify_payload(
            payload, 10, max_latency=100, max_tokens=60000, max_cost=2,
            strict_candidate=False, legacy_baseline=True,
        )


def test_modern_baseline_still_requires_observed_route_success():
    payload = _make_objective_output(smoke_payload())
    payload["stage1"][0].pop("selected_route_id")
    with pytest.raises(SmokeVerificationError, match="route success"):
        verify_payload(
            payload, 10, max_latency=100, max_tokens=60000, max_cost=2,
            strict_candidate=False,
        )


@pytest.mark.parametrize(
    "arguments",
    [
        ["--baseline"],
        ["--baseline", "--legacy-baseline"],
        ["--legacy-baseline", "--proof-out", "proof.json"],
        ["--baseline", "--proof-out", "proof.json", "--expected-proof", "prior.json"],
    ],
)
def test_baseline_cli_rejects_missing_conflicting_or_unpaired_proof_actions(
    arguments, monkeypatch
):
    def unexpected_run(*_args, **_kwargs):
        raise AssertionError("invalid baseline invocation must fail before smoke requests")

    monkeypatch.setattr("scripts.verify_council_smoke.run_smoke", unexpected_run)

    assert smoke_main(["https://service", "--project", "project", *arguments]) == 1


@pytest.mark.parametrize("action", ["capture", "compare"])
@pytest.mark.parametrize("legacy", [False, True])
def test_baseline_cli_allows_exactly_capture_or_rollback_comparison(
    action, legacy, monkeypatch, tmp_path
):
    evidence = {"provenance": {"stage1": []}}
    monkeypatch.setattr(
        "scripts.verify_council_smoke.run_smoke", lambda *_args, **_kwargs: evidence
    )
    arguments = ["https://service", "--project", "project", "--baseline"]
    if legacy:
        arguments.append("--legacy-baseline")
    proof = tmp_path / "proof.json"
    if action == "capture":
        arguments.extend(["--proof-out", str(proof)])
    else:
        proof.write_text(json.dumps(evidence), encoding="utf-8")
        arguments.extend(["--expected-proof", str(proof)])

    assert smoke_main(arguments) == 0
    if action == "capture":
        assert json.loads(proof.read_text(encoding="utf-8")) == evidence


def evidence(**metrics):
    defaults = {
        "quality_score": 100.0,
        "objective_correct_rate": 1.0,
        "factual_error_rate": 0.0,
        "evaluator_format_success_rate": 1.0,
        "route_success_rate": 1.0,
        "error_rate": 0.0,
        "p95_elapsed_latency_seconds": 10.0,
        "p95_reported_latency_seconds": 10.0,
        "mean_token_count": 1000.0,
        "mean_conservative_cost_usd": 0.03,
    }
    defaults.update(metrics)
    return {
        "sample_count": 5,
        "stream_sample_count": 1,
        "metrics": defaults,
        "stream_metrics": copy.deepcopy(defaults),
        "provenance": {},
        "stream_provenance": {},
    }


def test_smoke_rejects_insufficient_samples_and_relative_regression():
    with pytest.raises(SmokeVerificationError, match="insufficient"):
        compare_evidence({**evidence(), "sample_count": 4}, evidence())
    with pytest.raises(SmokeVerificationError, match="quality"):
        compare_evidence(evidence(quality_score=96.0), evidence())
    with pytest.raises(SmokeVerificationError, match="latency"):
        compare_evidence(evidence(p95_elapsed_latency_seconds=12.1), evidence())


def test_service_routing_requires_mixed_revisions_at_10_and_50_and_candidate_only_at_100():
    prior = {"status": "healthy", "config": {"roster": "legacy"}}
    candidate = {
        "status": "healthy", "config": {"roster": "candidate"},
        "artifacts": {
            "application_revision": "candidate", "image_digest": "sha256:value",
            "registry_digest": "registry", "projection_digests": {"backend": "digest"},
        },
    }
    for percent in (10, 50):
        observed = iter([prior, candidate, prior, candidate, prior])

        def fetch_mixed(_url, _timeout, values=observed):
            return next(values)

        proof = verify_service_routing(
            "https://service", prior, candidate, samples=5, percent=percent,
            fetcher=fetch_mixed,
        )
        assert proof["observed_identity_counts"] == {"candidate": 2, "prior": 3}
    proof = verify_service_routing(
        "https://service", prior, candidate, samples=5, percent=100,
        fetcher=lambda _url, _timeout: candidate,
    )
    assert proof["observed_identity_counts"] == {"candidate": 5}
    with pytest.raises(RoutingVerificationError, match="both"):
        verify_service_routing(
            "https://service", prior, candidate, samples=5, percent=10,
            fetcher=lambda _url, _timeout: prior,
        )

    unknown = copy.deepcopy(candidate)
    unknown["config"]["roster"] = "unknown"
    with pytest.raises(RoutingVerificationError, match="unknown"):
        verify_service_routing(
            "https://service", prior, candidate, samples=5, percent=100,
            fetcher=lambda _url, _timeout: unknown,
        )


@pytest.mark.parametrize("legacy_baseline", [False, True])
def test_rollout_with_mock_gcloud_rehearses_restore_and_reapply(tmp_path, legacy_baseline):
    root = Path(__file__).parents[1]
    state = tmp_path / "state.json"
    log = tmp_path / "gcloud.log"
    verify_log = tmp_path / "verify.log"
    state.write_text(json.dumps(service_state()))
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    gcloud = fake_bin / "gcloud"
    gcloud.write_text(
        """#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args = sys.argv[1:]
state_path, log_path = Path(os.environ['FAKE_STATE']), Path(os.environ['FAKE_LOG'])
with log_path.open('a') as stream: stream.write(' '.join(args) + '\\n')
state = json.loads(state_path.read_text())
if args[:3] == ['run', 'services', 'describe']:
    fmt = next((x for x in args if x.startswith('--format=')), '')
    if 'latestCreatedRevisionName' in fmt: print('candidate-rev')
    elif 'status.url' in fmt: print('https://service.example')
    else: print(json.dumps(state))
elif args[:2] == ['run', 'deploy']:
    tag = next(x.split('=',1)[1] for x in args if x.startswith('--tag='))
    state['status']['traffic'].append({'revisionName':'candidate-rev','percent':0,'tag':tag,'url':'https://shadow.example'})
    state_path.write_text(json.dumps(state))
elif args[:3] == ['run', 'services', 'update-traffic']:
    revisions = next((x.split('=', 1)[1] for x in args if x.startswith('--to-revisions=')), None)
    clear = '--clear-tags' in args
    if revisions is not None:
        tagged = {} if clear else {x['revisionName']:x['tag'] for x in state['status']['traffic'] if x.get('tag')}
        assignments = []
        for part in revisions.split(','):
            revision, percent = part.rsplit('=', 1)
            item = {'revisionName':revision,'percent':int(percent)}
            if revision in tagged: item['tag'] = tagged.pop(revision)
            assignments.append(item)
        state['status']['traffic'] = assignments + [{'revisionName':revision,'percent':0,'tag':tag} for revision,tag in tagged.items()]
    tag_arg = next((x.split('=', 1)[1] for x in args if x.startswith('--set-tags=')), None)
    if tag_arg:
        for part in tag_arg.split(','):
            tag, revision = part.split('=', 1)
            match = next((x for x in state['status']['traffic'] if x['revisionName'] == revision), None)
            if match is None: state['status']['traffic'].append({'revisionName':revision,'percent':0,'tag':tag,'url':'https://shadow.example'})
            else:
                match['tag'] = tag
                if revision == 'candidate-rev': match['url'] = 'https://shadow.example'
    state_path.write_text(json.dumps(state))
else:
    raise SystemExit('unexpected fake gcloud command')
"""
    )
    gcloud.chmod(0o755)
    health = tmp_path / "health.py"
    health.write_text(
        """import json, os, pathlib, sys
args=sys.argv[1:]
with pathlib.Path(os.environ['FAKE_VERIFY_LOG']).open('a') as stream: stream.write('health ' + ' '.join(args) + '\\n')
if '--identity-out' in args:
 identity={'status':'healthy','config':{}}
 if os.environ.get('LEGACY_BASELINE') != '1': identity['artifacts']={'application_revision':'prior-app'}
 pathlib.Path(args[args.index('--identity-out')+1]).write_text(json.dumps(identity))
if '--expected-identity' in args: json.loads(pathlib.Path(args[args.index('--expected-identity')+1]).read_text())
"""
    )
    smoke = tmp_path / "smoke.py"
    smoke.write_text(
        """import json, os, pathlib, sys
args=sys.argv[1:]
with pathlib.Path(os.environ['FAKE_VERIFY_LOG']).open('a') as stream: stream.write('smoke ' + ' '.join(args) + '\\n')
proof={'schema_version':2,'sample_count':5,'provenance':{'stage1':[['baseline','route']]},'metrics':{'quality_score':100,'objective_correct_rate':1,'factual_error_rate':0,'evaluator_format_success_rate':1,'route_success_rate':1,'error_rate':0,'p95_elapsed_latency_seconds':1,'p95_reported_latency_seconds':1,'mean_token_count':1,'mean_conservative_cost_usd':0.001}}
if '--proof-out' in args: pathlib.Path(args[args.index('--proof-out')+1]).write_text(json.dumps(proof))
if '--expected-proof' in args: assert json.loads(pathlib.Path(args[args.index('--expected-proof')+1]).read_text()) == proof
"""
    )
    routing = tmp_path / "routing.py"
    routing.write_text("import sys\n")
    env = {
        **os.environ,
        "PATH": f"{fake_bin}:{os.environ['PATH']}",
        "FAKE_STATE": str(state),
        "FAKE_LOG": str(log),
        "FAKE_VERIFY_LOG": str(verify_log),
        "LEGACY_BASELINE": "1" if legacy_baseline else "0",
        "PROJECT": "test-project",
        "REGION": "test-region",
        "SERVICE": "test-service",
        "IMAGE_DIGEST": "registry/image@sha256:" + "a" * 64,
        "DEPLOY_REVISION": "revision",
        "ROLLOUT_OBSERVATION_SECONDS": "0",
        "HEALTH_VERIFIER": str(health),
        "SMOKE_VERIFIER": str(smoke),
        "ROUTING_VERIFIER": str(routing),
    }
    result = subprocess.run(
        ["bash", "scripts/cloud_run_semantic_rollout.sh"],
        cwd=root,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    commands = log.read_text().splitlines()
    assignments = [line for line in commands if "--to-revisions=" in line]
    candidate_assignments = [line for line in assignments if "candidate-rev=" in line]
    assert [next(part for part in line.split() if part.startswith("--to-revisions=")) for line in candidate_assignments] == [
        "--to-revisions=candidate-rev=10,stable-a=63,stable-b=27",
        "--to-revisions=candidate-rev=10,stable-a=63,stable-b=27",
        "--to-revisions=candidate-rev=50,stable-a=35,stable-b=15",
        "--to-revisions=candidate-rev=100",
    ]
    assert any("--clear-tags" in line and "stable-a=70,stable-b=30" in line for line in commands)
    assert any("--set-tags=debug=old-debug,stable=stable-b" in line for line in commands)
    verifier_calls = verify_log.read_text().splitlines()
    candidate_calls = [line for line in verifier_calls if "https://shadow.example" in line]
    assert all("--legacy-baseline" not in line for line in candidate_calls)
    if legacy_baseline:
        baseline_calls = [line for line in verifier_calls if line.startswith("smoke https://service.example")]
        assert baseline_calls and all("--legacy-baseline" in line for line in baseline_calls)
        assert any(
            line.startswith("health https://service.example")
            and "--expected-identity" in line
            and "--allow-legacy-identity-without-artifacts" in line
            for line in verifier_calls
        )
    else:
        assert all("--legacy-baseline" not in line for line in verifier_calls)


def test_rollout_restores_state_when_deploy_fails_after_partial_mutation(tmp_path):
    root = Path(__file__).parents[1]
    original = {"status": {"traffic": [{"revisionName": "stable", "percent": 100}]}}
    state, log = tmp_path / "state.json", tmp_path / "gcloud.log"
    state.write_text(json.dumps(original))
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    gcloud = fake_bin / "gcloud"
    gcloud.write_text(
        """#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
args=sys.argv[1:]; state=Path(os.environ['FAKE_STATE']); log=Path(os.environ['FAKE_LOG'])
with log.open('a') as stream: stream.write(' '.join(args)+'\\n')
value=json.loads(state.read_text())
if args[:3] == ['run','services','describe']:
    fmt=next((item for item in args if item.startswith('--format=')),'')
    print('https://service.example' if 'status.url' in fmt else json.dumps(value))
elif args[:2] == ['run','deploy']:
    value['status']['traffic'].append({'revisionName':'partial','percent':0,'tag':'shadow'})
    state.write_text(json.dumps(value)); raise SystemExit(9)
elif args[:3] == ['run','services','update-traffic']:
    revisions=next(item.split('=',1)[1] for item in args if item.startswith('--to-revisions='))
    value['status']['traffic']=[{'revisionName':part.rsplit('=',1)[0],'percent':int(part.rsplit('=',1)[1])} for part in revisions.split(',')]
    state.write_text(json.dumps(value))
else: raise SystemExit('unexpected command')
"""
    )
    gcloud.chmod(0o755)
    health = tmp_path / "health.py"
    health.write_text(
        "import json,pathlib,sys\na=sys.argv\np=pathlib.Path(a[a.index('--identity-out')+1])\np.write_text(json.dumps({'status':'healthy','config':{},'artifacts':{'application_revision':'prior'}}))\n"
    )
    smoke = tmp_path / "smoke.py"
    smoke.write_text(
        "import json,pathlib,sys\na=sys.argv\np=pathlib.Path(a[a.index('--proof-out')+1])\np.write_text(json.dumps({'sample_count':5,'provenance':{},'metrics':{}}))\n"
    )
    result = subprocess.run(
        ["bash", "scripts/cloud_run_semantic_rollout.sh"],
        cwd=root,
        env={
            **os.environ,
            "PATH": f"{fake_bin}:{os.environ['PATH']}",
            "FAKE_STATE": str(state),
            "FAKE_LOG": str(log),
            "PROJECT": "project",
            "REGION": "region",
            "SERVICE": "service",
            "IMAGE_DIGEST": "image@sha256:" + "a" * 64,
            "DEPLOY_REVISION": "candidate",
            "ROLLOUT_OBSERVATION_SECONDS": "0",
            "HEALTH_VERIFIER": str(health),
            "SMOKE_VERIFIER": str(smoke),
        },
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert json.loads(state.read_text()) == original
    assert "--clear-tags --to-revisions=stable=100" in log.read_text()
