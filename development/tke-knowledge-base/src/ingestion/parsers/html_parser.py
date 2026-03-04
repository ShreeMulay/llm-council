"""HTML/web page parser using trafilatura for clean content extraction."""

from dataclasses import dataclass, field

import httpx
import trafilatura
from bs4 import BeautifulSoup

from .pdf_parser import ParsedDocument, ParsedSection


def parse_html_file(file_path: str) -> ParsedDocument:
    """Parse a local HTML file into structured sections."""
    with open(file_path) as f:
        html_content = f.read()
    return _parse_html_content(html_content, source_path=file_path)


def parse_url(url: str, timeout: float = 30.0) -> ParsedDocument:
    """Fetch and parse a web page into structured sections."""
    response = httpx.get(url, timeout=timeout, follow_redirects=True)
    response.raise_for_status()
    return _parse_html_content(response.text, source_path=url)


def _parse_html_content(html: str, source_path: str) -> ParsedDocument:
    """Parse HTML content into structured sections.

    Uses trafilatura for main content extraction, then BeautifulSoup
    for section splitting based on headings.
    """
    # Extract main content with trafilatura (strips nav, ads, footers)
    extracted = trafilatura.extract(
        html,
        include_tables=True,
        include_links=True,
        output_format="txt",
    )

    # Also parse with BeautifulSoup for heading structure
    soup = BeautifulSoup(html, "html.parser")

    # Get the title
    title = ""
    title_tag = soup.find("title")
    if title_tag:
        title = title_tag.get_text(strip=True)
    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
    if not title:
        title = source_path.split("/")[-1]

    # Try to split into sections using headings
    sections = _split_by_headings(soup)

    # If heading-based splitting fails, use trafilatura output as single section
    if not sections and extracted:
        sections = [ParsedSection(title=title, text=extracted, level=0)]

    return ParsedDocument(
        source_path=source_path,
        title=title,
        sections=sections,
        total_pages=1,
        metadata={"parser": "trafilatura+beautifulsoup"},
    )


def _split_by_headings(soup: BeautifulSoup) -> list[ParsedSection]:
    """Split HTML content into sections based on heading tags."""
    sections: list[ParsedSection] = []
    current_title = "Introduction"
    current_level = 0
    current_text_parts: list[str] = []

    # Find main content area
    main = soup.find("main") or soup.find("article") or soup.find("body")
    if not main:
        return []

    for element in main.descendants:
        if element.name in ("h1", "h2", "h3", "h4"):
            # Save previous section
            text = "\n".join(current_text_parts).strip()
            if text and len(text) > 20:
                sections.append(
                    ParsedSection(
                        title=current_title,
                        text=text,
                        level=current_level,
                    )
                )

            current_title = element.get_text(strip=True)
            current_level = int(element.name[1])
            current_text_parts = []

        elif element.name in ("p", "li", "td", "th", "div", "span"):
            text = element.get_text(strip=True)
            if text and not any(
                child.name in ("p", "li", "div")
                for child in element.children
                if hasattr(child, "name")
            ):
                current_text_parts.append(text)

    # Don't forget the last section
    text = "\n".join(current_text_parts).strip()
    if text and len(text) > 20:
        sections.append(ParsedSection(title=current_title, text=text, level=current_level))

    return sections
