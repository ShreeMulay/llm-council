"""PDF document parser using PyMuPDF for text extraction."""

from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF


@dataclass
class ParsedSection:
    """A section extracted from a document."""

    title: str
    text: str
    page_numbers: list[int] = field(default_factory=list)
    level: int = 0  # heading level (0=body, 1=h1, 2=h2, etc.)


@dataclass
class ParsedDocument:
    """Complete parsed document."""

    source_path: str
    title: str
    sections: list[ParsedSection]
    total_pages: int
    metadata: dict = field(default_factory=dict)


def parse_pdf(file_path: str | Path) -> ParsedDocument:
    """Parse a PDF file into structured sections.

    Uses font size heuristics to detect headings and split into sections.
    Medical guidelines typically have clear heading hierarchies.
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"PDF not found: {file_path}")

    doc = fitz.open(str(file_path))

    # First pass: analyze font sizes to determine heading thresholds
    font_sizes: list[float] = []
    for page in doc:
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    if span["text"].strip():
                        font_sizes.append(span["size"])

    if not font_sizes:
        doc.close()
        return ParsedDocument(
            source_path=str(file_path),
            title=file_path.stem,
            sections=[],
            total_pages=len(doc),
        )

    # Determine body text size (most common) and heading thresholds
    from collections import Counter

    size_counts = Counter(round(s, 1) for s in font_sizes)
    body_size = size_counts.most_common(1)[0][0]

    # Second pass: extract sections based on font size
    sections: list[ParsedSection] = []
    current_section = ParsedSection(title="Introduction", text="", page_numbers=[])
    doc_title = file_path.stem

    for page_num, page in enumerate(doc):
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                line_text = ""
                is_heading = False
                max_font_size = 0.0

                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text:
                        continue
                    line_text += text + " "
                    max_font_size = max(max_font_size, span["size"])

                line_text = line_text.strip()
                if not line_text:
                    continue

                # Detect headings: larger than body text, or bold with different size
                if max_font_size > body_size + 1.5 and len(line_text) < 200:
                    # This looks like a heading — start new section
                    if current_section.text.strip():
                        sections.append(current_section)

                    heading_level = 1 if max_font_size > body_size + 4 else 2
                    current_section = ParsedSection(
                        title=line_text,
                        text="",
                        page_numbers=[page_num + 1],
                        level=heading_level,
                    )

                    # Use first major heading as document title
                    if doc_title == file_path.stem and heading_level == 1:
                        doc_title = line_text
                else:
                    current_section.text += line_text + "\n"
                    if page_num + 1 not in current_section.page_numbers:
                        current_section.page_numbers.append(page_num + 1)

    # Don't forget the last section
    if current_section.text.strip():
        sections.append(current_section)

    doc.close()

    # Clean up sections
    cleaned_sections = []
    for section in sections:
        text = section.text.strip()
        # Skip very short sections (likely noise)
        if len(text) < 20:
            continue
        section.text = text
        cleaned_sections.append(section)

    return ParsedDocument(
        source_path=str(file_path),
        title=doc_title,
        sections=cleaned_sections,
        total_pages=len(doc),
        metadata={"parser": "pymupdf", "file_size": file_path.stat().st_size},
    )
