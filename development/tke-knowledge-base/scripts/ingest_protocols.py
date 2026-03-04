"""Ingest generated protocol markdown files into Qdrant.

Reads all .md files from content/protocols/, parses them as markdown,
chunks, enriches, embeds, and upserts into the knowledge base.

Usage:
    python scripts/ingest_protocols.py
    python scripts/ingest_protocols.py --dry-run
    python scripts/ingest_protocols.py --domain sglt2_inhibitors
"""

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import click
from rich.console import Console

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv()

from src.config import PROTOCOLS_DIR
from src.ingestion.parsers.pdf_parser import ParsedDocument, ParsedSection
from src.ingestion.pipeline import ingest_source
from src.models import Domain, Source, SourceType

console = Console()


def parse_markdown_to_document(file_path: Path) -> ParsedDocument:
    """Parse a markdown file into structured sections using heading hierarchy."""
    content = file_path.read_text()

    # Strip YAML frontmatter
    content = re.sub(r"^---\n.*?\n---\n", "", content, flags=re.DOTALL)

    # Split by headings (## and ###)
    sections: list[ParsedSection] = []
    current_title = file_path.stem.replace("_", " ").title()
    current_text_parts: list[str] = []
    current_level = 0

    for line in content.split("\n"):
        heading_match = re.match(r"^(#{1,4})\s+(.+)", line)
        if heading_match:
            # Save previous section
            text = "\n".join(current_text_parts).strip()
            if text and len(text) > 30:
                sections.append(
                    ParsedSection(
                        title=current_title,
                        text=text,
                        level=current_level,
                    )
                )
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
        metadata={"parser": "markdown", "format": "protocol"},
    )


def make_source(domain_key: str, file_path: Path) -> Source:
    """Create a Source object for a protocol file."""
    # Map domain key to Domain enum
    try:
        domain = Domain(domain_key)
    except ValueError:
        domain = Domain.GENERAL

    display_name = domain_key.replace("_", " ").title()

    return Source(
        id=f"tke-protocol-{domain_key}",
        title=f"TKE Clinical Protocol: {display_name}",
        source_type=SourceType.PRACTICE_PROTOCOL,
        organization="The Kidney Experts",
        domains=[domain],
        file_path=str(file_path),
        notes=f"AI-generated clinical reference for {display_name}, pending physician review",
    )


@click.command()
@click.option("--dry-run", is_flag=True, help="Parse and chunk only")
@click.option("--domain", type=str, help="Ingest a specific domain only")
def main(dry_run: bool, domain: str | None):
    """Ingest protocol markdown files into Qdrant."""
    console.print("[bold]TKE Knowledge Base — Protocol Ingestion[/bold]\n")

    # Find protocol files
    protocol_files = sorted(PROTOCOLS_DIR.glob("*.md"))
    if not protocol_files:
        console.print("[red]No protocol files found in content/protocols/[/red]")
        sys.exit(1)

    if domain:
        protocol_files = [f for f in protocol_files if f.stem == domain]
        if not protocol_files:
            console.print(f"[red]No file found for domain: {domain}[/red]")
            sys.exit(1)

    console.print(f"Found {len(protocol_files)} protocol files\n")

    # We need to monkey-patch the _parse_source function to use our markdown parser
    # since the pipeline expects PDF/HTML. Instead, we'll override at the pipeline level.
    import src.ingestion.pipeline as pipeline

    original_parse = pipeline._parse_source

    def markdown_parse(source: Source) -> ParsedDocument:
        if source.file_path and source.file_path.endswith(".md"):
            return parse_markdown_to_document(Path(source.file_path))
        return original_parse(source)

    pipeline._parse_source = markdown_parse

    all_stats = []
    for i, file_path in enumerate(protocol_files, 1):
        domain_key = file_path.stem
        source = make_source(domain_key, file_path)

        console.print(f"\n[bold]{'=' * 60}[/bold]")
        console.print(f"[bold]File {i}/{len(protocol_files)}: {domain_key}[/bold]")

        stats = ingest_source(source, dry_run=dry_run)
        all_stats.append(stats)

    # Summary
    total_chunks = sum(s["chunks"] for s in all_stats)
    total_tokens = sum(s["tokens"] for s in all_stats)
    console.print(f"\n[bold green]{'=' * 60}[/bold green]")
    console.print(f"[bold green]Ingestion complete![/bold green]")
    console.print(f"  Domains: {len(all_stats)}")
    console.print(f"  Total chunks: {total_chunks}")
    console.print(f"  Total tokens: ~{total_tokens}")
    if not dry_run:
        from src.ingestion.qdrant_client import get_collection_info

        info = get_collection_info()
        console.print(f"  Qdrant points: {info['points_count']}")


if __name__ == "__main__":
    main()
