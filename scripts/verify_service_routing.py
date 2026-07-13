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
from pathlib import Path
from typing import Any


class RoutingVerificationError(ValueError):
    """Raised when sampled service routing does not match the rollout stage."""


def fetch_identity(url: str, timeout: float = 20.0) -> dict[str, Any]:
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
        if payload.get("status") != "healthy" or not isinstance(payload.get("config"), dict):
            raise RoutingVerificationError("service health returned an invalid identity")
        identity = {"status": "healthy", "config": payload["config"]}
        if "artifacts" in payload:
            if not isinstance(payload["artifacts"], dict) or not payload["artifacts"]:
                raise RoutingVerificationError("service health returned an invalid identity")
            required = {
                "registry_digest", "projection_digests", "application_revision", "image_digest"
            }
            if not required <= payload["artifacts"].keys() or any(
                payload["artifacts"].get(field) in (None, "", {}) for field in required
            ):
                raise RoutingVerificationError("service health returned a partial identity")
            identity["artifacts"] = payload["artifacts"]
        return identity
    except (json.JSONDecodeError, TypeError) as exc:
        raise RoutingVerificationError("service health returned an invalid identity") from exc


def verify_service_routing(
    url: str,
    prior_identity: dict[str, Any],
    candidate_identity: dict[str, Any],
    *,
    samples: int,
    percent: int,
    fetcher: Callable[[str, float], dict[str, Any]] = fetch_identity,
    timeout: float = 20.0,
) -> dict[str, Any]:
    if not 5 <= samples <= 200:
        raise RoutingVerificationError("routing samples must be between 5 and 200")
    if percent not in {10, 50, 100}:
        raise RoutingVerificationError("unsupported traffic stage")
    observed: Counter[str] = Counter()
    for _ in range(samples):
        identity = fetcher(url, timeout)
        if identity == prior_identity:
            observed["prior"] += 1
        elif identity == candidate_identity:
            observed["candidate"] += 1
        else:
            raise RoutingVerificationError("service URL reached an unknown health identity")
    if percent == 100:
        if set(observed) != {"candidate"}:
            raise RoutingVerificationError("100% stage did not route only to candidate")
    elif set(observed) != {"prior", "candidate"}:
        raise RoutingVerificationError("staged service URL did not observe both prior and candidate identities")
    return {"sample_count": samples, "observed_identity_counts": dict(sorted(observed.items()))}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Verify sampled Cloud Run service routing")
    parser.add_argument("url")
    parser.add_argument("--prior-identity", required=True)
    parser.add_argument("--candidate-identity", required=True)
    parser.add_argument("--samples", type=int, required=True)
    parser.add_argument("--percent", type=int, required=True)
    args = parser.parse_args(argv)
    try:
        evidence = verify_service_routing(
            args.url,
            json.loads(Path(args.prior_identity).read_text(encoding="utf-8")),
            json.loads(Path(args.candidate_identity).read_text(encoding="utf-8")),
            samples=args.samples,
            percent=args.percent,
        )
    except (RoutingVerificationError, OSError, json.JSONDecodeError):
        print("FAIL: service routing verification failed", file=sys.stderr)
        return 1
    print(json.dumps(evidence, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
