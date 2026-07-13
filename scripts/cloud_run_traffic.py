#!/usr/bin/env python3
"""Canonicalize and verify complete Cloud Run traffic/tag state."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def canonical_traffic(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Keep every resolved traffic entry, including zero-percent tagged entries."""
    entries = []
    for item in payload.get("status", {}).get("traffic", []):
        revision = item.get("revisionName")
        if not revision:
            raise ValueError("traffic entry is missing a resolved revisionName")
        entries.append(
            {
                "revisionName": revision,
                "percent": int(item.get("percent") or 0),
                "tag": item.get("tag") or None,
            }
        )
    return sorted(entries, key=lambda item: (item["revisionName"], item["tag"] or "", item["percent"]))


def load(path: str) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as stream:
        value = json.load(stream)
    if not isinstance(value, dict):
        raise ValueError("Cloud Run service state must be a JSON object")
    return value


def snapshot(source: str, destination: str) -> None:
    state = canonical_traffic(load(source))
    nonzero_total = sum(item["percent"] for item in state)
    if not state or nonzero_total != 100:
        raise ValueError("captured traffic percentages must total exactly 100")
    Path(destination).write_text(json.dumps(state, sort_keys=True, separators=(",", ":")), encoding="utf-8")


def load_snapshot(path: str) -> list[dict[str, Any]]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("canonical traffic snapshot must be a JSON array")
    return value


def revisions(path: str) -> str:
    totals: dict[str, int] = {}
    for item in load_snapshot(path):
        if item["percent"]:
            totals[item["revisionName"]] = totals.get(item["revisionName"], 0) + item["percent"]
    return ",".join(f"{revision}={percent}" for revision, percent in sorted(totals.items()))


def tags(path: str) -> str:
    tagged = [(item["tag"], item["revisionName"]) for item in load_snapshot(path) if item["tag"]]
    return ",".join(f"{tag}={revision}" for tag, revision in sorted(tagged))


def revision_names(path: str) -> str:
    return ",".join(sorted({item["revisionName"] for item in load_snapshot(path) if item["percent"]}))


def compare(service_state: str, expected_snapshot: str) -> None:
    if canonical_traffic(load(service_state)) != load_snapshot(expected_snapshot):
        raise ValueError("restored Cloud Run traffic/tag state does not exactly match snapshot")


def expected_stage(
    snapshot_path: str, candidate: str, percent: int, candidate_tag: str
) -> list[dict[str, Any]]:
    """Build the exact resolved traffic/tag state expected for a rollout stage."""
    if percent not in {10, 50, 100}:
        raise ValueError("unsupported rollout percentage")
    baseline = load_snapshot(snapshot_path)
    remaining = 100 - percent
    active = [item for item in baseline if item["percent"]]
    scaled = [item["percent"] * remaining / 100 for item in active]
    allocated = [int(value) for value in scaled]
    for index in sorted(
        range(len(active)), key=lambda value: scaled[value] - allocated[value], reverse=True
    )[: remaining - sum(allocated)]:
        allocated[index] += 1
    state = [
        {**item, "percent": value}
        for item, value in zip(active, allocated, strict=True)
        if value or item.get("tag")
    ]
    represented = {(item["revisionName"], item.get("tag")) for item in state}
    state.extend(
        item for item in baseline if item.get("tag") and (item["revisionName"], item.get("tag")) not in represented
    )
    state.append({"revisionName": candidate, "percent": percent, "tag": candidate_tag})
    return sorted(state, key=lambda item: (item["revisionName"], item.get("tag") or "", item["percent"]))


def verify_stage(
    service_state: str, snapshot_path: str, candidate: str, percent: int, candidate_tag: str
) -> None:
    if canonical_traffic(load(service_state)) != expected_stage(
        snapshot_path, candidate, percent, candidate_tag
    ):
        raise ValueError("Cloud Run traffic/tag state does not exactly match requested stage")


def main() -> int:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    capture = subparsers.add_parser("snapshot")
    capture.add_argument("service_state")
    capture.add_argument("output")
    for name in ("revisions", "tags", "revision-names"):
        command = subparsers.add_parser(name)
        command.add_argument("snapshot")
    verify = subparsers.add_parser("compare")
    verify.add_argument("service_state")
    verify.add_argument("snapshot")
    stage = subparsers.add_parser("verify-stage")
    stage.add_argument("service_state")
    stage.add_argument("snapshot")
    stage.add_argument("candidate")
    stage.add_argument("percent", type=int)
    stage.add_argument("candidate_tag")
    args = parser.parse_args()
    try:
        if args.command == "snapshot":
            snapshot(args.service_state, args.output)
        elif args.command == "revisions":
            print(revisions(args.snapshot))
        elif args.command == "tags":
            print(tags(args.snapshot))
        elif args.command == "revision-names":
            print(revision_names(args.snapshot))
        elif args.command == "compare":
            compare(args.service_state, args.snapshot)
        else:
            verify_stage(
                args.service_state, args.snapshot, args.candidate, args.percent, args.candidate_tag
            )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
