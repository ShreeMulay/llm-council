"""Query pipeline: preprocess -> embed -> search -> build context -> generate.

This is the core RAG pipeline that handles user queries.
"""

import time
from datetime import datetime

from rich.console import Console

from ..config import settings
from ..ingestion.embedders.voyage_embedder import embed_query
from ..ingestion.enrichers.metadata_enricher import detect_domain, expand_drug_query
from ..ingestion.qdrant_client import search as qdrant_search
from ..models import ChatQuery, ChatResponse, Domain, RetrievedChunk

console = Console()


def query(chat_query: ChatQuery) -> ChatResponse:
    """Execute the full RAG query pipeline.

    Steps:
    1. Preprocess query (expand drug names, detect domain)
    2. Embed query with Voyage AI
    3. Search Qdrant for relevant chunks
    4. Build context from top results
    5. Generate answer with Gemini

    Args:
        chat_query: The user's question

    Returns:
        ChatResponse with answer, citations, and metadata
    """
    start_time = time.time()
    question = chat_query.question

    # Step 1: Preprocess
    expanded_question = expand_drug_query(question)
    detected_domain = chat_query.domain_filter or detect_domain(question)

    # Use domain filter only if we're confident about the domain
    domain_filter = None
    if detected_domain != Domain.GENERAL:
        domain_filter = detected_domain.value

    # Step 2: Embed query
    query_embedding = embed_query(expanded_question)

    # Step 3: Search Qdrant
    results = qdrant_search(
        query_embedding=query_embedding,
        top_k=settings.search_top_k,
        score_threshold=settings.score_threshold,
        domain_filter=domain_filter,
    )

    # If domain-filtered search returns too few results, try without filter
    if len(results) < 3 and domain_filter:
        results = qdrant_search(
            query_embedding=query_embedding,
            top_k=settings.search_top_k,
            score_threshold=settings.score_threshold,
            domain_filter=None,
        )

    # Step 4: Build retrieved chunks
    retrieved_chunks: list[RetrievedChunk] = []
    domains_searched: set[str] = set()

    for point in results[: settings.context_top_k]:
        payload = point.payload or {}
        chunk = RetrievedChunk(
            text=payload.get("text", ""),
            score=point.score,
            source_title=payload.get("source_title", "Unknown"),
            source_id=payload.get("source_id", ""),
            source_url=payload.get("source_url"),
            domain=Domain(payload.get("domain", "general")),
            drug_names=payload.get("drug_names", []),
            section_title=payload.get("section_title"),
        )
        retrieved_chunks.append(chunk)
        domains_searched.add(payload.get("domain", "general"))

    # Step 5: Generate answer
    if retrieved_chunks:
        answer, confidence = _generate_answer(question, retrieved_chunks)
    else:
        answer = (
            "I don't have specific information on this topic in my knowledge base. "
            "Please consult the relevant clinical guidelines or ask Dr. Mulay directly."
        )
        confidence = 0.0

    elapsed_ms = int((time.time() - start_time) * 1000)

    return ChatResponse(
        answer=answer,
        citations=retrieved_chunks,
        confidence=confidence,
        domains_searched=[Domain(d) for d in domains_searched],
        query_time_ms=elapsed_ms,
    )


def _generate_answer(question: str, chunks: list[RetrievedChunk]) -> tuple[str, float]:
    """Generate an answer using Gemini with retrieved context.

    Returns (answer_text, confidence_score).
    """
    from google import genai

    # Build context from retrieved chunks
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        source_info = f"[Source {i}: {chunk.source_title}"
        if chunk.section_title:
            source_info += f" — {chunk.section_title}"
        source_info += "]"
        context_parts.append(f"{source_info}\n{chunk.text}")

    context = "\n\n---\n\n".join(context_parts)

    # System prompt for medical KB
    system_prompt = """You are the TKE Knowledge Base Assistant for The Kidney Experts, a nephrology practice.

RULES:
1. Answer ONLY based on the provided context. Do not use outside knowledge.
2. ALWAYS cite your sources using [Source N] notation — EVERY factual statement MUST have at least one [Source N] citation inline. This is MANDATORY.
3. Use BOTH brand and generic drug names: e.g., "Farxiga (dapagliflozin)".
4. If the context doesn't contain enough information to answer, say "I don't have sufficient information on this topic in my knowledge base."
5. Be concise but thorough. Use bullet points for clarity when appropriate.
6. Include specific numbers, targets, and dosing from the sources.
7. Mention relevant clinical trial names (e.g., DAPA-CKD, MENTOR, FLOW) when discussed in context.
8. For drug dosing, always mention CKD-specific dose adjustments and monitoring requirements.
9. Never provide patient-specific medical advice — this is reference information only.

RESPONSE FORMAT:
- Start with a direct, specific answer to the question
- Support EVERY claim with [Source N] citations
- Use bullet points and specific numbers/targets
- Mention guideline names (KDIGO, ADA, ACC/AHA) when referenced in context
- End with monitoring notes or important caveats"""

    prompt = f"""Context from TKE Knowledge Base:

{context}

---

Question: {question}

Answer based ONLY on the context above:"""

    # Call Gemini
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,  # Low temperature for factual accuracy
            max_output_tokens=2048,
        ),
    )

    answer = response.text

    # Estimate confidence based on retrieval scores
    avg_score = sum(c.score for c in chunks) / len(chunks) if chunks else 0
    confidence = min(avg_score, 1.0)

    return answer, confidence
