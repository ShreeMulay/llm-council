"""Ingest ALL generated content into Qdrant.

Handles all content types:
- content/protocols/ (16 domain protocols)
- content/drug_info/ (drug monographs by class)
- content/guidelines/ (15 guideline summaries)
- content/algorithms/ (clinical decision algorithms)
- content/references/ (quick reference tables)

Optionally wipes the collection first for clean re-ingestion.

Usage:
    python scripts/ingest_all_content.py
    python scripts/ingest_all_content.py --wipe
    python scripts/ingest_all_content.py --type protocols
    python scripts/ingest_all_content.py --dry-run
"""

import re
import sys
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv()

from src.config import CONTENT_DIR, DRUG_INFO_DIR, GUIDELINES_DIR, PROTOCOLS_DIR
from src.ingestion.parsers.pdf_parser import ParsedDocument, ParsedSection
from src.ingestion.pipeline import ingest_source
from src.models import Domain, Source, SourceType

console = Console()

ALGORITHMS_DIR = CONTENT_DIR / "algorithms"
REFERENCES_DIR = CONTENT_DIR / "references"


def parse_markdown_to_document(file_path: Path) -> ParsedDocument:
    """Parse a markdown file into structured sections using heading hierarchy."""
    content = file_path.read_text()

    # Strip YAML frontmatter
    content = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

    sections: list[ParsedSection] = []
    current_title = file_path.stem.replace("_", " ").title()
    current_text_parts: list[str] = []
    current_level = 0

    for line in content.split("\n"):
        heading_match = re.match(r"^(#{1,4})\s+(.+)", line)
        if heading_match:
            text = "\n".join(current_text_parts).strip()
            if text and len(text) > 30:
                sections.append(ParsedSection(title=current_title, text=text, level=current_level))
            current_title = heading_match.group(2).strip()
            current_level = len(heading_match.group(1))
            current_text_parts = []
        else:
            current_text_parts.append(line)

    # Last section
    text = "\n".join(current_text_parts).strip()
    if text and len(text) > 30:
        sections.append(ParsedSection(title=current_title, text=text, level=current_level))

    return ParsedDocument(
        source_path=str(file_path),
        title=file_path.stem.replace("_", " ").title(),
        sections=sections,
        total_pages=1,
        metadata={"parser": "markdown", "format": file_path.parent.name},
    )


def make_source(
    file_path: Path, content_type: str, source_prefix: str, source_type: SourceType
) -> Source:
    """Create a Source object for a content file."""
    stem = file_path.stem
    display_name = stem.replace("_", " ").title()

    # Try to detect domain from frontmatter
    text = file_path.read_text()
    domain = Domain.GENERAL
    frontmatter_match = re.search(r"^---\n(.*?)\n---", text, re.DOTALL)
    if frontmatter_match:
        fm = frontmatter_match.group(1)
        domain_match = re.search(r"domain:\s*(\S+)", fm)
        if domain_match:
            try:
                domain = Domain(domain_match.group(1))
            except ValueError:
                domain = Domain.GENERAL

    return Source(
        id=f"{source_prefix}-{stem}",
        title=f"TKE {content_type}: {display_name}",
        source_type=source_type,
        organization="The Kidney Experts",
        domains=[domain],
        file_path=str(file_path),
        notes=f"AI-generated {content_type.lower()} for {display_name}, pending physician review",
    )


def get_content_dirs(content_type: str | None) -> list[tuple[Path, str, str, SourceType]]:
    """Get directories and metadata for each content type."""
    all_dirs = [
        (PROTOCOLS_DIR, "Clinical Protocol", "tke-protocol", SourceType.PRACTICE_PROTOCOL),
        (DRUG_INFO_DIR, "Drug Monograph", "tke-drug", SourceType.DRUG_LABEL),
        (GUIDELINES_DIR, "Guideline Summary", "tke-guideline", SourceType.GUIDELINE),
        (ALGORITHMS_DIR, "Decision Algorithm", "tke-algorithm", SourceType.PRACTICE_PROTOCOL),
        (REFERENCES_DIR, "Quick Reference", "tke-reference", SourceType.PRACTICE_PROTOCOL),
    ]

    type_map = {
        "protocols": [all_dirs[0]],
        "drugs": [all_dirs[1]],
        "guidelines": [all_dirs[2]],
        "algorithms": [all_dirs[3]],
        "references": [all_dirs[4]],
    }

    if content_type and content_type != "all":
        return type_map.get(content_type, [])
    return all_dirs


def wipe_collection():
    """Delete all points from the Qdrant collection."""
    from qdrant_client import models as qmodels

    from src.ingestion.qdrant_client import get_client
    from src.config import settings

    client = get_client()
    console.print("[yellow]Wiping all points from collection...[/yellow]")

    # Delete all points by using an empty filter (match everything)
    # We delete by scrolling and deleting in batches
    collection_name = settings.qdrant_collection

    # Get current count
    info = client.get_collection(collection_name)
    current_count = info.points_count

    if current_count == 0:
        console.print("[green]Collection already empty[/green]")
        return

    console.print(f"  Current points: {current_count}")

    # Scroll and delete all points
    offset = None
    deleted = 0
    while True:
        results, next_offset = client.scroll(
            collection_name=collection_name,
            limit=100,
            offset=offset,
            with_payload=False,
            with_vectors=False,
        )
        if not results:
            break
        point_ids = [r.id for r in results]
        client.delete(
            collection_name=collection_name,
            points_selector=qmodels.PointIdsList(points=point_ids),
        )
        deleted += len(point_ids)
        console.print(f"  Deleted {deleted}/{current_count} points...")
        offset = next_offset
        if offset is None:
            break

    console.print(f"[green]Wiped {deleted} points from collection[/green]")


@click.command()
@click.option(
    "--type",
    "content_type",
    type=click.Choice(["protocols", "drugs", "guidelines", "algorithms", "references", "all"]),
    default="all",
    help="Type of content to ingest",
)
@click.option("--wipe", is_flag=True, help="Wipe ALL existing data before ingesting")
@click.option("--dry-run", is_flag=True, help="Parse and chunk only, don't embed/upsert")
def main(content_type: str, wipe: bool, dry_run: bool):
    """Ingest all generated content into Qdrant."""
    console.print("[bold]TKE Knowledge Base — Full Content Ingestion[/bold]\n")

    if wipe and not dry_run:
        wipe_collection()
        console.print()

    # Monkey-patch the pipeline's parser to handle markdown
    import src.ingestion.pipeline as pipeline

    original_parse = pipeline._parse_source

    def markdown_parse(source: Source) -> ParsedDocument:
        if source.file_path and source.file_path.endswith(".md"):
            return parse_markdown_to_document(Path(source.file_path))
        return original_parse(source)

    pipeline._parse_source = markdown_parse

    # Process each content type
    content_dirs = get_content_dirs(content_type)
    all_stats = []

    for dir_path, ct_name, prefix, stype in content_dirs:
        if not dir_path.exists():
            console.print(f"[yellow]Skipping {ct_name}: {dir_path} not found[/yellow]")
            continue

        files = sorted(dir_path.glob("*.md"))
        if not files:
            console.print(f"[yellow]Skipping {ct_name}: no .md files[/yellow]")
            continue

        console.print(f"\n[bold cyan]{'=' * 60}[/bold cyan]")
        console.print(f"[bold cyan]{ct_name.upper()} ({len(files)} files)[/bold cyan]")

        for i, file_path in enumerate(files, 1):
            source = make_source(file_path, ct_name, prefix, stype)
            console.print(f"\n  [{i}/{len(files)}] {file_path.name}")

            stats = ingest_source(source, dry_run=dry_run)
            all_stats.append({"type": ct_name, **stats})

    # Summary table
    console.print(f"\n[bold green]{'=' * 60}[/bold green]")
    console.print("[bold green]Ingestion Complete![/bold green]\n")

    table = Table(title="Ingestion Summary")
    table.add_column("Type", style="cyan")
    table.add_column("Source", style="white")
    table.add_column("Chunks", justify="right")
    table.add_column("Tokens", justify="right")

    by_type: dict[str, dict] = {}
    for s in all_stats:
        t = s["type"]
        by_type.setdefault(t, {"chunks": 0, "tokens": 0, "count": 0})
        by_type[t]["chunks"] += s["chunks"]
        by_type[t]["tokens"] += s["tokens"]
        by_type[t]["count"] += 1

    for t, totals in by_type.items():
        table.add_row(t, f"{totals['count']} files", str(totals["chunks"]), str(totals["tokens"]))

    total_chunks = sum(s["chunks"] for s in all_stats)
    total_tokens = sum(s["tokens"] for s in all_stats)
    table.add_row(
        "[bold]TOTAL[/bold]",
        f"[bold]{len(all_stats)} files[/bold]",
        f"[bold]{total_chunks}[/bold]",
        f"[bold]{total_tokens}[/bold]",
    )
    console.print(table)

    if not dry_run:
        from src.ingestion.qdrant_client import get_collection_info

        info = get_collection_info()
        console.print(
            f"\n[bold green]Qdrant collection: {info['points_count']} total points[/bold green]"
        )

    console.print("\n[bold]Next steps:[/bold]")
    console.print("  python scripts/evaluate.py --verbose")


if __name__ == "__main__":
    main()
