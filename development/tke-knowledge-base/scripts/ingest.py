"""Ingestion script — ingest sources into the knowledge base.

Usage:
    # Ingest all sources in the registry
    python scripts/ingest.py

    # Dry run (parse and chunk only, no embedding/upsert)
    python scripts/ingest.py --dry-run

    # Ingest a specific source by ID
    python scripts/ingest.py --source-id kdigo-ckd-2024

    # Ingest a single file directly
    python scripts/ingest.py --file content/guidelines/kdigo-ckd-2024.pdf --source-id kdigo-ckd-2024
"""

import json
import sys
from pathlib import Path

import click
from rich.console import Console

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.config import DATA_DIR
from src.ingestion.pipeline import ingest_batch, ingest_source
from src.models import Domain, Source, SourceType

console = Console()


def load_source_registry() -> list[Source]:
    """Load sources from the registry file."""
    registry_path = DATA_DIR / "source_registry.json"
    if not registry_path.exists():
        console.print("[yellow]No source registry found. Create data/source_registry.json[/yellow]")
        return []

    with open(registry_path) as f:
        data = json.load(f)

    sources = []
    for s in data.get("sources", []):
        sources.append(
            Source(
                id=s["id"],
                title=s["title"],
                source_type=SourceType(s["source_type"]),
                organization=s.get("organization", ""),
                url=s.get("url"),
                publication_date=s.get("publication_date"),
                version=s.get("version"),
                domains=[Domain(d) for d in s.get("domains", [])],
                file_path=s.get("file_path"),
                last_checked=s.get("last_checked"),
                notes=s.get("notes"),
            )
        )

    return sources


@click.command()
@click.option("--dry-run", is_flag=True, help="Parse and chunk only, don't embed or upsert")
@click.option("--source-id", type=str, help="Ingest a specific source by ID")
@click.option("--file", "file_path", type=str, help="Ingest a single file directly")
def main(dry_run: bool, source_id: str | None, file_path: str | None):
    """Ingest sources into the TKE Knowledge Base."""
    console.print("[bold]TKE Knowledge Base — Ingestion Pipeline[/bold]\n")

    if file_path:
        # Ingest a single file
        path = Path(file_path)
        if not path.exists():
            console.print(f"[red]File not found: {file_path}[/red]")
            sys.exit(1)

        source = Source(
            id=source_id or path.stem,
            title=path.stem.replace("-", " ").replace("_", " ").title(),
            source_type=SourceType.GUIDELINE,
            organization="Manual Upload",
            file_path=str(path),
            domains=[],
        )
        ingest_source(source, dry_run=dry_run)
        return

    # Load from registry
    sources = load_source_registry()
    if not sources:
        console.print("[yellow]No sources to ingest.[/yellow]")
        console.print("Add sources to data/source_registry.json or use --file flag.")
        return

    if source_id:
        # Filter to specific source
        sources = [s for s in sources if s.id == source_id]
        if not sources:
            console.print(f"[red]Source '{source_id}' not found in registry[/red]")
            sys.exit(1)

    console.print(f"Found {len(sources)} sources to ingest")
    if dry_run:
        console.print("[yellow]DRY RUN mode — no embedding or upserting[/yellow]")

    ingest_batch(sources, dry_run=dry_run)


if __name__ == "__main__":
    main()
