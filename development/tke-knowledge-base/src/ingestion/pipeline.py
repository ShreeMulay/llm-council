"""Main ingestion pipeline: parse -> chunk -> enrich -> embed -> upsert.

This is the primary entry point for ingesting content into the knowledge base.
"""

from datetime import datetime
from pathlib import Path

from rich.console import Console
from rich.table import Table

from ..config import settings
from ..models import ChunkMetadata, ContentStatus, Domain, Source
from .chunkers.semantic_chunker import chunk_document, count_tokens
from .embedders.voyage_embedder import embed_documents
from .enrichers.metadata_enricher import detect_all_domains, detect_domain, extract_drug_names
from .parsers.html_parser import parse_html_file, parse_url
from .parsers.pdf_parser import ParsedDocument, parse_pdf
from .qdrant_client import delete_by_source, ensure_collection, get_collection_info, upsert_chunks

console = Console()


def ingest_source(
    source: Source,
    dry_run: bool = False,
) -> dict:
    """Ingest a single source into the knowledge base.

    Full pipeline: parse -> chunk -> enrich -> embed -> upsert

    Args:
        source: Source metadata
        dry_run: If True, parse and chunk but don't embed or upsert

    Returns:
        Dictionary with ingestion stats
    """
    console.print(f"\n[bold blue]Ingesting: {source.title}[/bold blue]")
    console.print(f"  Source: {source.file_path or source.url}")
    console.print(f"  Type: {source.source_type}")

    stats = {
        "source_id": source.id,
        "title": source.title,
        "sections": 0,
        "chunks": 0,
        "tokens": 0,
        "embedded": False,
        "upserted": False,
    }

    # Step 1: Parse
    console.print("  [dim]Step 1/4: Parsing...[/dim]")
    document = _parse_source(source)
    stats["sections"] = len(document.sections)
    console.print(f"  [green]Parsed {stats['sections']} sections[/green]")

    if not document.sections:
        console.print("  [yellow]No sections found, skipping[/yellow]")
        return stats

    # Step 2: Chunk
    console.print("  [dim]Step 2/4: Chunking...[/dim]")
    chunks = chunk_document(document)
    stats["chunks"] = len(chunks)
    stats["tokens"] = sum(count_tokens(c["text"]) for c in chunks)
    console.print(f"  [green]{stats['chunks']} chunks, ~{stats['tokens']} tokens[/green]")

    if not chunks:
        console.print("  [yellow]No chunks generated, skipping[/yellow]")
        return stats

    # Step 3: Enrich with metadata
    console.print("  [dim]Step 3/4: Enriching metadata...[/dim]")
    metadata_list = []
    for chunk in chunks:
        text = chunk["text"]
        primary_domain = detect_domain(text, chunk.get("section_title", ""))
        all_domains = detect_all_domains(text, chunk.get("section_title", ""))
        drug_names = extract_drug_names(text)

        # Use source's domains if chunk detection is too generic
        if primary_domain == Domain.GENERAL and source.domains:
            primary_domain = source.domains[0]

        meta = ChunkMetadata(
            text=text,
            source_id=source.id,
            source_title=source.title,
            domain=primary_domain,
            domains=[d.value for d in all_domains],
            drug_names=drug_names,
            section_title=chunk.get("section_title"),
            chunk_index=chunk.get("chunk_index", 0),
            content_type=chunk.get("content_type", "text"),
            status=ContentStatus.APPROVED,
            created_at=datetime.now().isoformat(),
            last_verified=datetime.now().isoformat(),
            source_url=source.url,
        )
        metadata_list.append(meta)

    console.print(f"  [green]Enriched {len(metadata_list)} chunks with metadata[/green]")

    if dry_run:
        console.print("  [yellow]DRY RUN — skipping embedding and upsert[/yellow]")
        _print_chunk_summary(metadata_list)
        return stats

    # Step 4a: Embed
    console.print("  [dim]Step 4a/4: Embedding with Voyage AI...[/dim]")
    texts = [m.text for m in metadata_list]
    embeddings = embed_documents(texts)
    stats["embedded"] = True
    console.print(f"  [green]Generated {len(embeddings)} embeddings[/green]")

    # Step 4b: Delete old chunks for this source (re-ingestion)
    console.print("  [dim]Step 4b/4: Upserting to Qdrant...[/dim]")
    ensure_collection()
    delete_by_source(source.id)

    # Step 4c: Upsert
    count = upsert_chunks(embeddings, metadata_list)
    stats["upserted"] = True
    console.print(f"  [green]Upserted {count} points to Qdrant[/green]")

    return stats


def ingest_batch(
    sources: list[Source],
    dry_run: bool = False,
) -> list[dict]:
    """Ingest multiple sources into the knowledge base."""
    console.print(f"\n[bold]Ingesting {len(sources)} sources[/bold]")

    if not dry_run:
        ensure_collection()

    all_stats = []
    for i, source in enumerate(sources, 1):
        console.print(f"\n[bold]{'=' * 60}[/bold]")
        console.print(f"[bold]Source {i}/{len(sources)}[/bold]")
        stats = ingest_source(source, dry_run=dry_run)
        all_stats.append(stats)

    # Print summary
    _print_batch_summary(all_stats)

    if not dry_run:
        info = get_collection_info()
        console.print(
            f"\n[bold green]Collection now has {info['points_count']} total points[/bold green]"
        )

    return all_stats


def _parse_source(source: Source) -> ParsedDocument:
    """Parse a source based on its type and file path."""
    if source.file_path:
        path = Path(source.file_path)
        if not path.is_absolute():
            path = Path(settings.db_path).parent.parent / path

        if path.suffix.lower() == ".pdf":
            return parse_pdf(path)
        elif path.suffix.lower() in (".html", ".htm"):
            return parse_html_file(str(path))
        else:
            # Treat as plain text
            text = path.read_text()
            from .parsers.pdf_parser import ParsedSection

            return ParsedDocument(
                source_path=str(path),
                title=source.title,
                sections=[ParsedSection(title=source.title, text=text)],
                total_pages=1,
            )

    elif source.url:
        return parse_url(source.url)

    else:
        raise ValueError(f"Source '{source.id}' has no file_path or url")


def _print_chunk_summary(metadata_list: list[ChunkMetadata]) -> None:
    """Print a summary of chunks for dry run inspection."""
    table = Table(title="Chunk Summary")
    table.add_column("#", style="dim")
    table.add_column("Domain", style="cyan")
    table.add_column("Section", style="green")
    table.add_column("Tokens", justify="right")
    table.add_column("Drugs", style="yellow")
    table.add_column("Type")

    for i, meta in enumerate(metadata_list[:20]):  # Show first 20
        table.add_row(
            str(i + 1),
            meta.domain.value,
            (meta.section_title or "")[:40],
            str(count_tokens(meta.text)),
            ", ".join(meta.drug_names[:3]),
            meta.content_type,
        )

    if len(metadata_list) > 20:
        table.add_row("...", f"({len(metadata_list) - 20} more)", "", "", "", "")

    console.print(table)


def _print_batch_summary(all_stats: list[dict]) -> None:
    """Print summary of batch ingestion."""
    table = Table(title="\nIngestion Summary")
    table.add_column("Source", style="cyan")
    table.add_column("Sections", justify="right")
    table.add_column("Chunks", justify="right")
    table.add_column("Tokens", justify="right")
    table.add_column("Status", style="green")

    total_chunks = 0
    total_tokens = 0

    for stats in all_stats:
        status = (
            "Upserted"
            if stats["upserted"]
            else ("Dry run" if not stats["embedded"] else "Embedded")
        )
        table.add_row(
            stats["title"][:50],
            str(stats["sections"]),
            str(stats["chunks"]),
            str(stats["tokens"]),
            status,
        )
        total_chunks += stats["chunks"]
        total_tokens += stats["tokens"]

    table.add_row(
        "[bold]TOTAL[/bold]",
        "",
        f"[bold]{total_chunks}[/bold]",
        f"[bold]{total_tokens}[/bold]",
        "",
    )

    console.print(table)
