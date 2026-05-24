"""Tests for Stage 0 tool-context URL prefetching."""

import pytest

from backend.tool_context import (
    ToolContextConfig,
    augment_query_with_tool_context,
    build_augmented_query,
    extract_urls,
    html_to_text,
    is_public_http_url,
)


def test_extract_urls_deduplicates_and_strips_punctuation():
    query = (
        "Analyze https://example.com/a.txt, then https://example.com/a.txt "
        "and dashboard (https://example.com/dashboard/index.html)."
    )

    assert extract_urls(query) == [
        "https://example.com/a.txt",
        "https://example.com/dashboard/index.html",
    ]


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/transcript.txt",
        "http://storage.googleapis.com/bucket/file.txt",
    ],
)
def test_is_public_http_url_allows_public_http_urls(url):
    assert is_public_http_url(url) is True


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "https://localhost:8800/health",
        "http://127.0.0.1:8800/health",
        "http://10.0.0.1/secret",
        "http://192.168.1.10/secret",
        "http://172.16.0.1/secret",
        "http://169.254.169.254/latest/meta-data",
    ],
)
def test_is_public_http_url_blocks_unsafe_targets(url):
    assert is_public_http_url(url) is False


def test_html_to_text_removes_scripts_and_compacts_text():
    html = """
    <html><head><script>secret()</script><style>.x{}</style></head>
    <body><h1>Session Analysis</h1><p>User clicked the CTA.</p></body></html>
    """

    text = html_to_text(html)

    assert "Session Analysis" in text
    assert "User clicked the CTA" in text
    assert "secret()" not in text
    assert ".x{}" not in text


def test_build_augmented_query_includes_original_query_and_sources():
    augmented = build_augmented_query(
        original_query="Deep analysis on this transcript: https://example.com/t.txt",
        sources=[
            {
                "url": "https://example.com/t.txt",
                "ok": True,
                "status_code": 200,
                "content_type": "text/plain",
                "text": "Patient says the onboarding flow is confusing.",
                "char_count": 47,
                "truncated": False,
            }
        ],
    )

    assert "Original user request" in augmented
    assert "Deep analysis on this transcript" in augmented
    assert "Fetched source context" in augmented
    assert "https://example.com/t.txt" in augmented
    assert "Patient says the onboarding flow is confusing" in augmented
    assert "Do not claim you accessed external URLs beyond the excerpts" in augmented


@pytest.mark.asyncio
async def test_augment_query_fetches_public_url_with_injected_context(respx_mock):
    url = "https://example.com/transcript.txt"
    respx_mock.get(url).respond(200, text="Transcript body here", headers={"content-type": "text/plain"})

    augmented, metadata = await augment_query_with_tool_context(
        f"Analyze this: {url}",
        config=ToolContextConfig(max_chars_per_url=100, max_total_chars=200),
    )

    assert "Transcript body here" in augmented
    assert metadata["enabled"] is True
    assert metadata["urls"] == [url]
    assert metadata["sources"][0]["ok"] is True
    assert metadata["sources"][0]["char_count"] == len("Transcript body here")


@pytest.mark.asyncio
async def test_augment_query_records_blocked_private_url_without_fetching(respx_mock):
    url = "http://127.0.0.1:8800/secrets"

    augmented, metadata = await augment_query_with_tool_context(f"Analyze this: {url}")

    assert augmented.startswith("Analyze this")
    assert metadata["sources"][0]["ok"] is False
    assert metadata["sources"][0]["error"] == "Blocked unsafe URL"
    assert len(respx_mock.calls) == 0
