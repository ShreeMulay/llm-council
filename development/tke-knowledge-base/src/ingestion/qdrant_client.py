"""Qdrant vector database client for TKE Knowledge Base.

Handles collection creation, document upserting, and search.
"""

import uuid

from qdrant_client import QdrantClient, models
from rich.console import Console

from ..config import settings
from ..models import ChunkMetadata

console = Console()


def get_client() -> QdrantClient:
    """Get Qdrant client instance."""
    if settings.qdrant_api_key:
        return QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )
    return QdrantClient(url=settings.qdrant_url)


def ensure_collection(client: QdrantClient | None = None) -> None:
    """Create the collection if it doesn't exist.

    Configuration optimized for medical text retrieval:
    - COSINE distance (standard for semantic similarity)
    - INT8 scalar quantization (99% accuracy, 2x speed, 4x compression)
    - Payload indexing for domain and drug_names filtering
    """
    client = client or get_client()
    collection_name = settings.qdrant_collection

    # Check if collection already exists
    collections = client.get_collections().collections
    existing_names = [c.name for c in collections]

    if collection_name in existing_names:
        console.print(f"[green]Collection '{collection_name}' already exists[/green]")
        return

    console.print(f"[yellow]Creating collection '{collection_name}'...[/yellow]")

    client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=1024,  # Voyage 3-large/4-large dimension
            distance=models.Distance.COSINE,
            on_disk=True,
        ),
        quantization_config=models.ScalarQuantization(
            scalar=models.ScalarQuantizationConfig(
                type=models.ScalarType.INT8,
                quantile=0.99,
                always_ram=True,
            )
        ),
    )

    # Create payload indexes for filtering
    client.create_payload_index(
        collection_name=collection_name,
        field_name="domain",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=collection_name,
        field_name="domains",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=collection_name,
        field_name="drug_names",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=collection_name,
        field_name="source_id",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )
    client.create_payload_index(
        collection_name=collection_name,
        field_name="status",
        field_schema=models.PayloadSchemaType.KEYWORD,
    )

    console.print(f"[green]Collection '{collection_name}' created successfully[/green]")


def upsert_chunks(
    embeddings: list[list[float]],
    metadata_list: list[ChunkMetadata],
    client: QdrantClient | None = None,
    batch_size: int = 100,
) -> int:
    """Upsert chunks with embeddings into Qdrant.

    Args:
        embeddings: List of embedding vectors
        metadata_list: List of chunk metadata
        client: Optional Qdrant client (creates one if not provided)
        batch_size: Number of points per upsert batch

    Returns:
        Number of points upserted
    """
    if len(embeddings) != len(metadata_list):
        raise ValueError(f"Mismatch: {len(embeddings)} embeddings vs {len(metadata_list)} metadata")

    client = client or get_client()
    collection_name = settings.qdrant_collection
    total = 0

    for i in range(0, len(embeddings), batch_size):
        batch_embeddings = embeddings[i : i + batch_size]
        batch_metadata = metadata_list[i : i + batch_size]

        points = []
        for embedding, meta in zip(batch_embeddings, batch_metadata):
            point_id = str(uuid.uuid4())
            payload = meta.model_dump()

            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload,
                )
            )

        client.upsert(
            collection_name=collection_name,
            points=points,
        )
        total += len(points)

    return total


def search(
    query_embedding: list[float],
    top_k: int | None = None,
    score_threshold: float | None = None,
    domain_filter: str | None = None,
    client: QdrantClient | None = None,
) -> list[models.ScoredPoint]:
    """Search for similar chunks in Qdrant.

    Args:
        query_embedding: Query vector from Voyage AI
        top_k: Number of results to return
        score_threshold: Minimum similarity score
        domain_filter: Optional domain to filter by
        client: Optional Qdrant client

    Returns:
        List of scored points with metadata
    """
    client = client or get_client()
    top_k = top_k or settings.search_top_k
    score_threshold = score_threshold or settings.score_threshold

    # Build filter
    query_filter = None
    if domain_filter:
        query_filter = models.Filter(
            should=[
                models.FieldCondition(
                    key="domain",
                    match=models.MatchValue(value=domain_filter),
                ),
                models.FieldCondition(
                    key="domains",
                    match=models.MatchAny(any=[domain_filter]),
                ),
            ]
        )

    results = client.query_points(
        collection_name=settings.qdrant_collection,
        query=query_embedding,
        limit=top_k,
        score_threshold=score_threshold,
        query_filter=query_filter,
        with_payload=True,
    )

    return results.points


def delete_by_source(source_id: str, client: QdrantClient | None = None) -> int:
    """Delete all chunks from a specific source.

    Useful for re-ingesting updated content.
    """
    client = client or get_client()

    result = client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="source_id",
                        match=models.MatchValue(value=source_id),
                    )
                ]
            )
        ),
    )

    return result.status


def get_collection_info(client: QdrantClient | None = None) -> dict:
    """Get collection statistics."""
    client = client or get_client()
    info = client.get_collection(settings.qdrant_collection)
    return {
        "points_count": info.points_count,
        "vectors_count": info.vectors_count,
        "status": info.status.value,
        "segments_count": len(info.segments) if info.segments else 0,
    }
