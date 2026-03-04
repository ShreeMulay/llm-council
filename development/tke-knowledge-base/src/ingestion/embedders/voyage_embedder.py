"""Voyage AI embedding with batch processing.

Uses voyage-3-large (1024 dimensions) for best medical text retrieval.
Supports batch embedding of up to 96 texts per request.
"""

import voyageai
from rich.progress import Progress, SpinnerColumn, TextColumn

from ...config import settings


def get_client() -> voyageai.Client:
    """Get Voyage AI client."""
    if not settings.voyage_api_key:
        raise ValueError("VOYAGE_API_KEY not set. Set TKE_KB_VOYAGE_API_KEY environment variable.")
    return voyageai.Client(api_key=settings.voyage_api_key)


def embed_documents(
    texts: list[str],
    show_progress: bool = True,
) -> list[list[float]]:
    """Embed a list of document texts using Voyage AI.

    Args:
        texts: List of document texts to embed
        show_progress: Whether to show progress bar

    Returns:
        List of embedding vectors (1024 dimensions each)
    """
    client = get_client()
    all_embeddings: list[list[float]] = []
    batch_size = settings.voyage_batch_size

    if show_progress:
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            transient=True,
        ) as progress:
            task = progress.add_task(
                f"Embedding {len(texts)} documents...",
                total=len(texts),
            )

            for i in range(0, len(texts), batch_size):
                batch = texts[i : i + batch_size]
                response = client.embed(
                    texts=batch,
                    model=settings.voyage_model,
                    input_type="document",
                )
                all_embeddings.extend(response.embeddings)
                progress.update(task, advance=len(batch))
    else:
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            response = client.embed(
                texts=batch,
                model=settings.voyage_model,
                input_type="document",
            )
            all_embeddings.extend(response.embeddings)

    return all_embeddings


def embed_query(query: str) -> list[float]:
    """Embed a single query text using Voyage AI.

    Uses input_type="query" which is trained differently from documents
    for better retrieval performance.
    """
    client = get_client()
    response = client.embed(
        texts=[query],
        model=settings.voyage_model,
        input_type="query",
    )
    return response.embeddings[0]
