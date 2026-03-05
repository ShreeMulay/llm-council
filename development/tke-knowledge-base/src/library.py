"""Library service — browse and read all content articles.

Scans the content/ directory, parses YAML frontmatter + markdown,
and returns structured article metadata and full content.
"""

import re
from pathlib import Path

from pydantic import BaseModel, Field

from .config import (
    ALGORITHMS_DIR,
    CONTENT_DIR,
    DRUG_INFO_DIR,
    GUIDELINES_DIR,
    PROTOCOLS_DIR,
    REFERENCES_DIR,
)


# --- Models ---


class ArticleSummary(BaseModel):
    """Lightweight article metadata for listing."""

    id: str = Field(description="Unique article identifier (e.g., 'protocols/proteinuria')")
    title: str = Field(description="Article title extracted from first H1")
    content_type: str = Field(
        description="Content category: protocol, drug_monograph, guideline_summary, decision_algorithm, quick_reference"
    )
    domain: str = Field(description="Primary clinical domain")
    word_count: int = Field(description="Approximate word count")
    generated_date: str | None = Field(default=None, description="Date content was generated")
    status: str = Field(default="pending_review", description="Review status")
    drug_class: str | None = Field(default=None, description="Drug class (drug monographs only)")


class ArticleFull(ArticleSummary):
    """Full article with markdown content."""

    content: str = Field(description="Full markdown content (without frontmatter)")
    sections: list[str] = Field(default_factory=list, description="H2 section titles for TOC")


class LibraryIndex(BaseModel):
    """Complete library listing."""

    total: int
    articles: list[ArticleSummary]
    content_types: dict[str, int] = Field(description="Count by content type")
    domains: dict[str, int] = Field(description="Count by domain")


# --- Content type mapping ---

CONTENT_TYPE_MAP: dict[str, tuple[Path, str]] = {
    "protocols": (PROTOCOLS_DIR, "protocol"),
    "drug_info": (DRUG_INFO_DIR, "drug_monograph"),
    "guidelines": (GUIDELINES_DIR, "guideline_summary"),
    "algorithms": (ALGORITHMS_DIR, "decision_algorithm"),
    "references": (REFERENCES_DIR, "quick_reference"),
}

CONTENT_TYPE_LABELS: dict[str, str] = {
    "protocol": "Clinical Protocol",
    "drug_monograph": "Drug Monograph",
    "guideline_summary": "Guideline Summary",
    "decision_algorithm": "Decision Algorithm",
    "quick_reference": "Quick Reference",
}


# --- Parsing ---

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


def _parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Extract YAML frontmatter and return (metadata_dict, body_markdown)."""
    match = _FRONTMATTER_RE.match(text)
    if not match:
        return {}, text

    raw_yaml = match.group(1)
    body = text[match.end() :]

    # Simple key: value parser (no nested YAML needed)
    meta: dict[str, str] = {}
    for line in raw_yaml.strip().splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()

    return meta, body


def _extract_title(body: str) -> str:
    """Extract the first H1 heading from markdown."""
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("# ") and not stripped.startswith("## "):
            return stripped.lstrip("# ").strip()
    return "Untitled"


def _extract_h2_sections(body: str) -> list[str]:
    """Extract all H2 section titles for table of contents."""
    sections = []
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith("## ") and not stripped.startswith("### "):
            sections.append(stripped.lstrip("# ").strip())
    return sections


def _word_count(text: str) -> int:
    """Approximate word count."""
    return len(text.split())


# --- Public API ---


def scan_articles() -> list[ArticleSummary]:
    """Scan all content directories and return article summaries."""
    articles: list[ArticleSummary] = []

    for folder_name, (dir_path, default_type) in CONTENT_TYPE_MAP.items():
        if not dir_path.exists():
            continue
        for md_file in sorted(dir_path.glob("*.md")):
            text = md_file.read_text(encoding="utf-8")
            meta, body = _parse_frontmatter(text)
            title = _extract_title(body)

            article_id = f"{folder_name}/{md_file.stem}"
            content_type = meta.get("content_type", default_type)
            domain = meta.get("domain", "general")

            articles.append(
                ArticleSummary(
                    id=article_id,
                    title=title,
                    content_type=content_type,
                    domain=domain,
                    word_count=_word_count(body),
                    generated_date=meta.get("generated_date"),
                    status=meta.get("status", "pending_review"),
                    drug_class=meta.get("drug_class"),
                )
            )

    return articles


def get_library_index() -> LibraryIndex:
    """Build the full library index with counts."""
    articles = scan_articles()

    content_types: dict[str, int] = {}
    domains: dict[str, int] = {}
    for a in articles:
        content_types[a.content_type] = content_types.get(a.content_type, 0) + 1
        domains[a.domain] = domains.get(a.domain, 0) + 1

    return LibraryIndex(
        total=len(articles),
        articles=articles,
        content_types=content_types,
        domains=domains,
    )


def get_article(article_id: str) -> ArticleFull | None:
    """Load a single article by its ID (e.g., 'protocols/proteinuria').

    Returns None if the article doesn't exist.
    """
    parts = article_id.split("/", 1)
    if len(parts) != 2:
        return None

    folder_name, stem = parts
    mapping = CONTENT_TYPE_MAP.get(folder_name)
    if not mapping:
        return None

    dir_path, default_type = mapping
    md_file = dir_path / f"{stem}.md"
    if not md_file.exists():
        return None

    text = md_file.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(text)
    title = _extract_title(body)
    sections = _extract_h2_sections(body)
    content_type = meta.get("content_type", default_type)
    domain = meta.get("domain", "general")

    return ArticleFull(
        id=article_id,
        title=title,
        content_type=content_type,
        domain=domain,
        word_count=_word_count(body),
        generated_date=meta.get("generated_date"),
        status=meta.get("status", "pending_review"),
        drug_class=meta.get("drug_class"),
        content=body.strip(),
        sections=sections,
    )
