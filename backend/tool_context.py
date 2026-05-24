"""Stage 0 tool-context preprocessing for council queries.

This module gives the council a bounded, safe retrieval step for explicitly
provided public URLs. It is intentionally not a general browser or arbitrary
tool runner: v1 fetches text/HTML resources, blocks obvious SSRF targets, and
injects excerpts into the prompt before Stage 1.
"""

from __future__ import annotations

import html
import ipaddress
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

URL_RE = re.compile(r"https?://[^\s<>'\"`]+", re.IGNORECASE)
TRAILING_PUNCTUATION = ").,;:!?]}"


@dataclass(frozen=True)
class ToolContextConfig:
    """Limits for URL fetching and prompt injection."""

    max_urls: int = 5
    max_chars_per_url: int = 25_000
    max_total_chars: int = 60_000
    timeout_seconds: float = 20.0
    max_redirects: int = 3


class _TextExtractor(HTMLParser):
    """Minimal HTML-to-text extractor using the standard library."""

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg", "canvas"}:
            self._skip_depth += 1
        if tag.lower() in {"p", "div", "section", "article", "br", "li", "h1", "h2", "h3", "h4", "tr"}:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript", "svg", "canvas"} and self._skip_depth > 0:
            self._skip_depth -= 1
        if tag.lower() in {"p", "div", "section", "article", "li", "h1", "h2", "h3", "h4", "tr"}:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        if self._skip_depth == 0 and data.strip():
            self.parts.append(data)


def extract_urls(query: str) -> list[str]:
    """Extract unique HTTP(S) URLs from a query, preserving first-seen order."""
    seen: set[str] = set()
    urls: list[str] = []
    for match in URL_RE.findall(query):
        url = match.rstrip(TRAILING_PUNCTUATION)
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def is_public_http_url(url: str) -> bool:
    """Return True if URL is http(s) and not an obvious private/SSRF target."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        return False
    if not parsed.hostname:
        return False

    hostname = parsed.hostname.strip().lower().rstrip(".")
    if hostname in {"localhost", "localhost.localdomain"}:
        return False

    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        # Hostname, not a literal IP. DNS rebinding protection is out of scope
        # for v1, but localhost-style hostnames are blocked above.
        return True

    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def html_to_text(html_content: str) -> str:
    """Convert HTML to compact readable text."""
    parser = _TextExtractor()
    parser.feed(html_content)
    raw_text = html.unescape(" ".join(parser.parts))
    lines = [re.sub(r"\s+", " ", line).strip() for line in raw_text.splitlines()]
    return "\n".join(line for line in lines if line)


def _decode_response(response: httpx.Response, content_type: str) -> str:
    text = response.text
    if "html" in content_type.lower():
        return html_to_text(text)
    return text


def _truncate(text: str, max_chars: int) -> tuple[str, bool]:
    if len(text) <= max_chars:
        return text, False
    return text[:max_chars].rstrip() + "\n\n[TRUNCATED]", True


async def fetch_url_source(
    url: str,
    client: httpx.AsyncClient,
    config: ToolContextConfig,
) -> dict[str, Any]:
    """Fetch one URL and return source metadata plus extracted text."""
    if not is_public_http_url(url):
        return {"url": url, "ok": False, "error": "Blocked unsafe URL"}

    current_url = url
    for redirect_count in range(config.max_redirects + 1):
        try:
            response = await client.get(current_url)
        except Exception as exc:  # pragma: no cover - exact httpx exception varies
            return {"url": url, "ok": False, "error": f"Fetch failed: {exc}"}

        if response.status_code in {301, 302, 303, 307, 308} and response.headers.get("location"):
            next_url = urljoin(current_url, response.headers["location"])
            if not is_public_http_url(next_url):
                return {"url": url, "ok": False, "error": "Redirect blocked unsafe URL"}
            current_url = next_url
            continue

        content_type = response.headers.get("content-type", "unknown")
        if response.status_code >= 400:
            return {
                "url": url,
                "final_url": str(response.url),
                "ok": False,
                "status_code": response.status_code,
                "content_type": content_type,
                "error": f"HTTP {response.status_code}",
            }

        text = _decode_response(response, content_type)
        text, truncated = _truncate(text, config.max_chars_per_url)
        return {
            "url": url,
            "final_url": str(response.url),
            "ok": True,
            "status_code": response.status_code,
            "content_type": content_type,
            "text": text,
            "char_count": len(text),
            "truncated": truncated,
            "redirects": redirect_count,
        }

    return {"url": url, "ok": False, "error": "Too many redirects"}


def build_augmented_query(original_query: str, sources: list[dict[str, Any]]) -> str:
    """Build the prompt sent to council models from original query + sources."""
    ok_sources = [source for source in sources if source.get("ok") and source.get("text")]
    if not ok_sources:
        return original_query

    lines = [
        "You are analyzing a user request with fetched source context.",
        "Ground your answer in the provided excerpts.",
        "Do not claim you accessed external URLs beyond the excerpts below.",
        "If a source excerpt is incomplete, say what can and cannot be concluded.",
        "",
        "## Original user request",
        original_query,
        "",
        "## Fetched source context",
    ]

    for index, source in enumerate(ok_sources, start=1):
        lines.extend(
            [
                "",
                f"### Source {index}: {source['url']}",
                f"Content-Type: {source.get('content_type', 'unknown')} | Status: {source.get('status_code', 'unknown')} | Characters: {source.get('char_count', 0)} | Truncated: {source.get('truncated', False)}",
                "```text",
                source.get("text", ""),
                "```",
            ]
        )

    return "\n".join(lines)


def _metadata_for_sources(enabled: bool, urls: list[str], sources: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "enabled": enabled,
        "urls": urls,
        "sources": [
            {k: v for k, v in source.items() if k != "text"}
            for source in sources
        ],
    }


async def augment_query_with_tool_context(
    query: str,
    enabled: bool = True,
    config: ToolContextConfig | None = None,
) -> tuple[str, dict[str, Any]]:
    """Fetch explicit URLs and return (augmented_query, metadata)."""
    config = config or ToolContextConfig()
    urls = extract_urls(query)[: config.max_urls]
    if not enabled or not urls:
        return query, _metadata_for_sources(enabled, urls, [])

    sources: list[dict[str, Any]] = []
    remaining_chars = config.max_total_chars
    async with httpx.AsyncClient(timeout=config.timeout_seconds, follow_redirects=False) as client:
        for url in urls:
            per_url_config = ToolContextConfig(
                max_urls=config.max_urls,
                max_chars_per_url=min(config.max_chars_per_url, max(0, remaining_chars)),
                max_total_chars=config.max_total_chars,
                timeout_seconds=config.timeout_seconds,
                max_redirects=config.max_redirects,
            )
            source = await fetch_url_source(url, client, per_url_config)
            if source.get("ok") and source.get("text"):
                remaining_chars -= len(source["text"])
            sources.append(source)
            if remaining_chars <= 0:
                break

    return build_augmented_query(query, sources), _metadata_for_sources(enabled, urls, sources)
