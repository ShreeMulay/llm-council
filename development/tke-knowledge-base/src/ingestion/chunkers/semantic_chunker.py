"""Semantic chunker that respects document structure and medical content boundaries.

Key principles:
- Respect section boundaries (don't split mid-section if possible)
- Keep drug dosing tables together
- Preserve list items as units
- Add overlap for context continuity
- Target 500-800 tokens per chunk
"""

import re

import tiktoken

from ..parsers.pdf_parser import ParsedDocument, ParsedSection
from ...config import settings


# Use cl100k_base tokenizer (GPT-4/Claude compatible, close to Voyage)
_encoder = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    """Count tokens in text using tiktoken."""
    return len(_encoder.encode(text))


def chunk_document(
    document: ParsedDocument,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[dict]:
    """Chunk a parsed document into semantic chunks.

    Returns a list of dicts with:
    - text: chunk text
    - section_title: section this chunk came from
    - chunk_index: position within the document
    - content_type: text, table, or list
    """
    chunk_size = chunk_size or settings.chunk_size
    chunk_overlap = chunk_overlap or settings.chunk_overlap

    all_chunks: list[dict] = []
    chunk_index = 0

    for section in document.sections:
        section_chunks = _chunk_section(section, chunk_size, chunk_overlap)

        for chunk in section_chunks:
            chunk["chunk_index"] = chunk_index
            chunk["section_title"] = section.title
            all_chunks.append(chunk)
            chunk_index += 1

    return all_chunks


def _chunk_section(
    section: ParsedSection,
    chunk_size: int,
    chunk_overlap: int,
) -> list[dict]:
    """Chunk a single section, respecting content boundaries."""
    text = section.text.strip()
    if not text:
        return []

    token_count = count_tokens(text)

    # If the section fits in one chunk, return it as-is
    if token_count <= chunk_size:
        content_type = _detect_content_type(text)
        return [{"text": text, "content_type": content_type}]

    # Split into paragraphs/logical blocks first
    blocks = _split_into_blocks(text)

    # Merge blocks into chunks, respecting size limits
    chunks: list[dict] = []
    current_parts: list[str] = []
    current_tokens = 0

    for block in blocks:
        block_tokens = count_tokens(block)

        # If a single block exceeds chunk_size, split it by sentences
        if block_tokens > chunk_size:
            # Flush current buffer first
            if current_parts:
                chunk_text = "\n\n".join(current_parts)
                chunks.append(
                    {
                        "text": chunk_text,
                        "content_type": _detect_content_type(chunk_text),
                    }
                )
                current_parts = []
                current_tokens = 0

            # Split oversized block by sentences
            sentence_chunks = _split_by_sentences(block, chunk_size, chunk_overlap)
            chunks.extend(sentence_chunks)
            continue

        # Check if adding this block would exceed the limit
        if current_tokens + block_tokens > chunk_size and current_parts:
            # Flush current chunk
            chunk_text = "\n\n".join(current_parts)
            chunks.append(
                {
                    "text": chunk_text,
                    "content_type": _detect_content_type(chunk_text),
                }
            )

            # Keep last part for overlap context
            overlap_text = current_parts[-1] if current_parts else ""
            overlap_tokens = count_tokens(overlap_text)
            if overlap_tokens <= chunk_overlap:
                current_parts = [overlap_text]
                current_tokens = overlap_tokens
            else:
                current_parts = []
                current_tokens = 0

        current_parts.append(block)
        current_tokens += block_tokens

    # Don't forget the last chunk
    if current_parts:
        chunk_text = "\n\n".join(current_parts)
        chunks.append(
            {
                "text": chunk_text,
                "content_type": _detect_content_type(chunk_text),
            }
        )

    return chunks


def _split_into_blocks(text: str) -> list[str]:
    """Split text into logical blocks (paragraphs, lists, tables).

    Keeps related content together:
    - Numbered/bulleted lists stay as units if small enough
    - Table rows stay together
    - Paragraphs are natural split points
    """
    # Split on double newlines (paragraph boundaries)
    raw_blocks = re.split(r"\n{2,}", text)

    blocks: list[str] = []
    for block in raw_blocks:
        block = block.strip()
        if not block:
            continue
        blocks.append(block)

    return blocks


def _split_by_sentences(text: str, chunk_size: int, chunk_overlap: int) -> list[dict]:
    """Split a large block by sentence boundaries."""
    # Medical text sentence splitter — handles "Dr.", "mg.", "vs.", etc.
    sentences = re.split(
        r"(?<=[.!?])\s+(?=[A-Z])",
        text,
    )

    chunks: list[dict] = []
    current_parts: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        sent_tokens = count_tokens(sentence)

        if current_tokens + sent_tokens > chunk_size and current_parts:
            chunk_text = " ".join(current_parts)
            chunks.append(
                {
                    "text": chunk_text,
                    "content_type": _detect_content_type(chunk_text),
                }
            )
            # Keep last sentence for overlap
            current_parts = [current_parts[-1]] if current_parts else []
            current_tokens = count_tokens(current_parts[0]) if current_parts else 0

        current_parts.append(sentence)
        current_tokens += sent_tokens

    if current_parts:
        chunk_text = " ".join(current_parts)
        chunks.append(
            {
                "text": chunk_text,
                "content_type": _detect_content_type(chunk_text),
            }
        )

    return chunks


def _detect_content_type(text: str) -> str:
    """Detect whether text is a table, list, or regular text."""
    lines = text.strip().split("\n")

    # Check for table-like content (lots of pipes or tabs)
    pipe_lines = sum(1 for line in lines if "|" in line)
    if pipe_lines > len(lines) * 0.5:
        return "table"

    # Check for list content (lots of bullets or numbers)
    list_pattern = re.compile(r"^\s*[-•*]\s|^\s*\d+[.)]\s")
    list_lines = sum(1 for line in lines if list_pattern.match(line))
    if list_lines > len(lines) * 0.5:
        return "list"

    return "text"
