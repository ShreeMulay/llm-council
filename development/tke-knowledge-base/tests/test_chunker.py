"""Tests for semantic chunker."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.ingestion.chunkers.semantic_chunker import (
    _detect_content_type,
    chunk_document,
    count_tokens,
)
from src.ingestion.parsers.pdf_parser import ParsedDocument, ParsedSection


class TestTokenCounting:
    """Test token counting."""

    def test_counts_tokens(self):
        text = "This is a simple test sentence."
        tokens = count_tokens(text)
        assert tokens > 0
        assert tokens < 20

    def test_empty_string(self):
        assert count_tokens("") == 0

    def test_medical_text(self):
        text = "Dapagliflozin 10mg daily reduces eGFR decline by 39% (DAPA-CKD trial)."
        tokens = count_tokens(text)
        assert tokens > 5


class TestContentTypeDetection:
    """Test content type detection."""

    def test_detects_table(self):
        text = """| Drug | Dose | Frequency |
| dapagliflozin | 10mg | daily |
| empagliflozin | 10mg | daily |"""
        assert _detect_content_type(text) == "table"

    def test_detects_list(self):
        text = """- Check eGFR at baseline
- Repeat at 2 weeks
- Monitor potassium monthly
- Adjust dose as needed"""
        assert _detect_content_type(text) == "list"

    def test_detects_text(self):
        text = "SGLT2 inhibitors have been shown to reduce the rate of eGFR decline in patients with CKD."
        assert _detect_content_type(text) == "text"


class TestChunking:
    """Test document chunking."""

    def test_short_section_single_chunk(self):
        doc = ParsedDocument(
            source_path="test.pdf",
            title="Test",
            sections=[ParsedSection(title="Intro", text="This is a short section.", level=1)],
            total_pages=1,
        )
        chunks = chunk_document(doc, chunk_size=100)
        assert len(chunks) == 1
        assert chunks[0]["text"] == "This is a short section."

    def test_long_section_multiple_chunks(self):
        # Create a section that exceeds chunk size
        long_text = "This is a test sentence about nephrology. " * 200
        doc = ParsedDocument(
            source_path="test.pdf",
            title="Test",
            sections=[ParsedSection(title="Long Section", text=long_text, level=1)],
            total_pages=1,
        )
        chunks = chunk_document(doc, chunk_size=100, chunk_overlap=10)
        assert len(chunks) > 1

    def test_preserves_section_title(self):
        doc = ParsedDocument(
            source_path="test.pdf",
            title="Test",
            sections=[
                ParsedSection(title="SGLT2 Inhibitors", text="Important content here.", level=1)
            ],
            total_pages=1,
        )
        chunks = chunk_document(doc, chunk_size=100)
        assert chunks[0]["section_title"] == "SGLT2 Inhibitors"

    def test_chunk_index_increments(self):
        doc = ParsedDocument(
            source_path="test.pdf",
            title="Test",
            sections=[
                ParsedSection(title="Section 1", text="Content one.", level=1),
                ParsedSection(title="Section 2", text="Content two.", level=1),
            ],
            total_pages=1,
        )
        chunks = chunk_document(doc, chunk_size=100)
        assert chunks[0]["chunk_index"] == 0
        assert chunks[1]["chunk_index"] == 1

    def test_empty_document(self):
        doc = ParsedDocument(
            source_path="test.pdf",
            title="Test",
            sections=[],
            total_pages=0,
        )
        chunks = chunk_document(doc)
        assert len(chunks) == 0
