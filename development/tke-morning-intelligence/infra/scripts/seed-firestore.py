#!/usr/bin/env python3
"""
Seed Firestore for TKE Morning Intelligence.

Creates:
  - master-lists/config       (from master-lists.json)
  - pharmacopoeia/{drug}      (from medications.json — 63 docs)
  - content-memory/dedup      (empty initial state)
  - settings/config           (basic app settings)
  - observances/calendar      (from observances.json)

Usage:
  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json
  python3 infra/scripts/seed-firestore.py [--project tke-morning-intel] [--dry-run]
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from google.cloud import firestore


def load_json(path: Path) -> dict | list:
    with open(path) as f:
        return json.load(f)


def seed_master_lists(db: firestore.Client, seed_dir: Path, dry_run: bool) -> int:
    """Upload master-lists.json as a single document at master-lists/config."""
    data = load_json(seed_dir / "master-lists.json")
    ref = db.collection("master-lists").document("config")

    if dry_run:
        print(
            f"  [DRY RUN] Would write master-lists/config ({len(json.dumps(data))} bytes)"
        )
        return 1

    ref.set(data)
    print(f"  Created master-lists/config")
    return 1


def seed_pharmacopoeia(db: firestore.Client, seed_dir: Path, dry_run: bool) -> int:
    """Upload each medication as a document keyed by genericName (lowercase)."""
    meds = load_json(seed_dir / "medications.json")
    count = 0
    batch = db.batch()
    batch_size = 0

    for med in meds:
        generic_name = med["genericName"].lower()
        ref = db.collection("pharmacopoeia").document(generic_name)

        if dry_run:
            print(f"  [DRY RUN] Would write pharmacopoeia/{generic_name}")
        else:
            batch.set(ref, med)
            batch_size += 1

            # Firestore batches limited to 500 ops
            if batch_size >= 400:
                batch.commit()
                batch = db.batch()
                batch_size = 0

        count += 1

    # Commit remaining
    if not dry_run and batch_size > 0:
        batch.commit()

    print(f"  Created {count} documents in pharmacopoeia/")
    return count


def seed_content_memory(db: firestore.Client, dry_run: bool) -> int:
    """Create empty dedup memory document."""
    data = {
        "recent_quotes_authors": [],
        "recent_nephrology_events": [],
        "lastUpdated": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    ref = db.collection("content-memory").document("dedup")

    if dry_run:
        print(f"  [DRY RUN] Would write content-memory/dedup")
        return 1

    ref.set(data)
    print(f"  Created content-memory/dedup")
    return 1


def seed_settings(db: firestore.Client, dry_run: bool) -> int:
    """Create settings/config with basic app configuration."""
    data = {
        "version": "1.0.0",
        "phase": 1,
        "timezone": "America/Chicago",
        "location": {
            "city": "Jackson",
            "state": "Tennessee",
            "lat": 35.6145,
            "lon": -88.8139,
        },
        "practice": {
            "name": "The Kidney Experts, PLLC",
            "bhag": "Ridding the World of the Need for Dialysis!",
            "tagline": "Big Expertise. Small-Town Heart.",
        },
        "schedule": {
            "runTime": "06:00",
            "timezone": "America/Chicago",
            "skipWeekends": True,
            "skipHolidays": False,
        },
        "contentSections": [
            "systems_thinking",
            "quote",
            "nephrology_history",
            "ai_ideas",
            "did_you_know",
            "medication",
        ],
        "delivery": {
            "method": "webhook",
            "cards": ["mindset", "operations", "celebration"],
        },
        "dedup": {
            "maxRecentAuthors": 30,
            "maxRecentEvents": 30,
        },
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    ref = db.collection("settings").document("config")

    if dry_run:
        print(f"  [DRY RUN] Would write settings/config")
        return 1

    ref.set(data)
    print(f"  Created settings/config")
    return 1


def seed_observances(db: firestore.Client, seed_dir: Path, dry_run: bool) -> int:
    """Upload observances.json as a single document at observances/calendar."""
    data = load_json(seed_dir / "observances.json")
    ref = db.collection("observances").document("calendar")

    if dry_run:
        print(
            f"  [DRY RUN] Would write observances/calendar ({len(json.dumps(data))} bytes)"
        )
        return 1

    ref.set(data)
    print(f"  Created observances/calendar")
    return 1


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed Firestore for TKE Morning Intelligence"
    )
    parser.add_argument("--project", default="tke-morning-intel", help="GCP project ID")
    parser.add_argument("--database", default="(default)", help="Firestore database ID")
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview without writing"
    )
    args = parser.parse_args()

    # Resolve seed directory
    script_dir = Path(__file__).resolve().parent
    seed_dir = script_dir.parent / "seed"

    if not seed_dir.exists():
        print(f"ERROR: Seed directory not found at {seed_dir}", file=sys.stderr)
        sys.exit(1)

    # Verify required files
    required_files = ["medications.json", "master-lists.json", "observances.json"]
    for fname in required_files:
        if not (seed_dir / fname).exists():
            print(
                f"ERROR: Required file {fname} not found in {seed_dir}", file=sys.stderr
            )
            sys.exit(1)

    # Check credentials
    creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path:
        print(
            "WARNING: GOOGLE_APPLICATION_CREDENTIALS not set. Using application default credentials.",
            file=sys.stderr,
        )

    print(f"TKE Morning Intelligence — Firestore Seeder")
    print(f"{'=' * 50}")
    print(f"  Project:    {args.project}")
    print(f"  Database:   {args.database}")
    print(f"  Seed dir:   {seed_dir}")
    print(f"  Credentials: {creds_path or 'application default'}")
    print(f"  Dry run:    {args.dry_run}")
    print(f"{'=' * 50}")
    print()

    # Initialize Firestore client
    db = firestore.Client(project=args.project, database=args.database)

    total = 0

    print("[1/5] Seeding master-lists/config...")
    total += seed_master_lists(db, seed_dir, args.dry_run)

    print(f"[2/5] Seeding pharmacopoeia/ (medications)...")
    total += seed_pharmacopoeia(db, seed_dir, args.dry_run)

    print("[3/5] Seeding content-memory/dedup...")
    total += seed_content_memory(db, args.dry_run)

    print("[4/5] Seeding settings/config...")
    total += seed_settings(db, args.dry_run)

    print("[5/5] Seeding observances/calendar...")
    total += seed_observances(db, seed_dir, args.dry_run)

    print()
    print(f"{'=' * 50}")
    action = "Would create" if args.dry_run else "Created"
    print(f"Done! {action} {total} documents total.")
    if args.dry_run:
        print("Re-run without --dry-run to write to Firestore.")


if __name__ == "__main__":
    main()
