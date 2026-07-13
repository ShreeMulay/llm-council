#!/usr/bin/env python3
"""Collect content-free Cloud Run service-URL revision routing evidence."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from collections import Counter
from collections.abc import Callable
from typing import Any


class RoutingVerificationError(ValueError):
    """Raised when sampled service routing does not match the rollout stage."""


def fetch_revision(url: str, timeout: float = 20.0) -> str:
    request = urllib.request.Request(f"{url.rstrip('/')}/health", headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status, body = response.status, response.read()
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        raise RoutingVerificationError("service health sampling failed") from exc
    if status != 200:
        raise RoutingVerificationError(f"service health returned HTTP {status}")
    try:
        payload = json.loads(body)
        revision = payload["artifacts"]["application_revision"]
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        raise RoutingVerificationError("service health omitted application revision") from exc
    if not isinstance(revision, str) or not revision:
        raise RoutingVerificationError("service health returned invalid application revision")
    return revision


def verify_service_routing(
    url: str,
    candidate: str,
    prior_revisions: set[str],
    *,
    samples: int,
    percent: int,
    fetcher: Callable[[str, float], str] = fetch_revision,
    timeout: float = 20.0,
) -> dict[str, Any]:
    if not 5 <= samples <= 200:
        raise RoutingVerificationError("routing samples must be between 5 and 200")
    if percent not in {10, 50, 100}:
        raise RoutingVerificationError("unsupported traffic stage")
    observed = Counter(fetcher(url, timeout) for _ in range(samples))
    allowed = {candidate, *prior_revisions}
    if not set(observed) <= allowed:
        raise RoutingVerificationError("service URL reached an unexpected revision")
    if percent == 100:
        if set(observed) != {candidate}:
            raise RoutingVerificationError("100% stage did not route only to candidate")
    elif prior_revisions:
        if candidate not in observed or not (set(observed) & prior_revisions):
            raise RoutingVerificationError("staged service URL did not observe both prior and candidate revisions")
    elif set(observed) != {candidate}:
        raise RoutingVerificationError("stage without prior traffic did not route only to candidate")
    return {"sample_count": samples, "observed_revision_counts": dict(sorted(observed.items()))}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify sampled Cloud Run service routing")
    parser.add_argument("url")
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--prior-revisions", default="")
    parser.add_argument("--samples", type=int, required=True)
    parser.add_argument("--percent", type=int, required=True)
    args = parser.parse_args(argv)
    try:
        evidence = verify_service_routing(
            args.url,
            args.candidate,
            {item for item in args.prior_revisions.split(",") if item},
            samples=args.samples,
            percent=args.percent,
        )
    except RoutingVerificationError:
        print("FAIL: service routing verification failed", file=sys.stderr)
        return 1
    print(json.dumps(evidence, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
