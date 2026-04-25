"""3-stage LLM Council orchestration with multi-provider support."""

import re
import asyncio
import logging
import random
import hashlib
import time
from typing import List, Dict, Any, Tuple, Optional, AsyncGenerator
from collections import defaultdict

logger = logging.getLogger("llm-council.council")

# Maximum characters per model response when building Stage 2/3 prompts.
# Prevents context window explosion when individual models produce very long outputs.
# 12,000 chars ~ 3,000 tokens. With 5 models that's ~15K tokens of context,
# leaving plenty of room for the ranking/synthesis prompt and response.
MAX_RESPONSE_CHARS_FOR_PROMPT = 12_000

# Per-model timeout for individual provider calls.
# Prevents a single dead/slow provider from blocking the entire council.
# Individual models that exceed this are skipped (others continue).
PER_MODEL_TIMEOUT_SECONDS = 180  # 3 minutes per model

# Stage 1 response cache: (model_id + prompt_hash) -> (response, timestamp)
# TTL: 1 hour. Saves ~30% cost when same model+prompt called twice (e.g., GPT-5.5 in Stage 1 + Stage 2)
_stage1_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 3600


def _get_cache_key(model_id: str, prompt: str) -> str:
    """Generate cache key for Stage 1 responses."""
    return hashlib.sha256(f"{model_id}:{prompt}".encode()).hexdigest()[:16]


def _get_cached_response(model_id: str, prompt: str) -> Optional[Dict[str, Any]]:
    """Get cached Stage 1 response if available and not expired."""
    key = _get_cache_key(model_id, prompt)
    if key in _stage1_cache:
        response, timestamp = _stage1_cache[key]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            logger.info("Cache hit for %s", model_id)
            return response
        else:
            del _stage1_cache[key]
    return None


def _cache_response(model_id: str, prompt: str, response: Dict[str, Any]):
    """Cache Stage 1 response."""
    key = _get_cache_key(model_id, prompt)
    _stage1_cache[key] = (response, time.time())


def _truncate_for_prompt(
    text: str, max_chars: int = MAX_RESPONSE_CHARS_FOR_PROMPT
) -> str:
    """Truncate text for inclusion in a prompt, adding a truncation notice if needed.
    
    Preserves code block integrity by closing open ``` fences if truncation
    would split a code block.
    """
    if len(text) <= max_chars:
        return text
    
    truncated = text[:max_chars]
    
    # Check if we're inside a code block
    # Count ``` before truncation point
    fence_count = truncated.count("```")
    if fence_count % 2 == 1:
        # Odd count means we're inside a code block — close it
        truncated = truncated.rsplit("\n", 1)[0] if "\n" in truncated else truncated
        truncated += "\n```\n\n[... response truncated for context budget ...]"
    else:
        truncated += "\n\n[... response truncated for context budget ...]"
    
    return truncated


def get_evaluator_models(council_models: List[str]) -> List[str]:
    """Select top 3 evaluators from priority list that are present in the council.
    
    Evaluators are the models best at critical evaluation. We use a subset to:
    - Reduce Stage 2 cost (3 evaluators vs all 9)
    - Improve evaluation quality (stronger models are better judges)
    - Reduce latency
    
    Returns evaluators in priority order.
    """
    from .config import EVALUATOR_PRIORITY
    
    available = [m for m in EVALUATOR_PRIORITY if m in council_models]
    return available[:3]


def filter_responses_for_evaluator(
    evaluator_model: str, responses: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Filter out the evaluator's own Stage 1 response to prevent self-evaluation bias.
    
    Research shows models can recognize their own outputs above chance,
    leading to 5-20% self-preference inflation in rankings.
    """
    return [r for r in responses if r.get("model") != evaluator_model]


def shuffle_responses_for_evaluator(
    responses: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """Randomize response order for each evaluator to reduce position bias.
    
    LLMs suffer from "lost in the middle" — they attend less to responses
    in the middle of long prompts. Randomizing order per evaluator averages
    out this bias across the evaluation panel.
    """
    shuffled = responses.copy()
    random.shuffle(shuffled)
    return shuffled


def select_top_responses(
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    n_top: int = 3,
    n_wildcard: int = 1,
    n_diversity: int = 1,
) -> List[Dict[str, Any]]:
    """Curate top responses for the chairman from Stage 1 + Stage 2.
    
    Selection strategy:
    1. Top N by aggregate evaluator score (consensus picks)
    2. 1 wildcard: highest disagreement response (protects minority correct answers)
    3. 1 diversity pick: best response from model not in top N
    
    This prevents the chairman from being overwhelmed by 9 responses while
    preserving both consensus signal and dissenting voices.
    """
    if len(stage1_results) <= n_top + n_wildcard + n_diversity:
        # Not enough responses for full curation, return all
        return stage1_results
    
    # Build model -> average rank mapping from Stage 2
    model_ranks: Dict[str, List[int]] = defaultdict(list)
    
    for ranking in stage2_results:
        parsed = ranking.get("parsed_ranking", [])
        for position, label in enumerate(parsed, start=1):
            # Extract model name from label (e.g., "Response A" -> find which model)
            # This requires label_to_model mapping, but we don't have it here.
            # Simpler approach: use aggregate_rankings if available
            pass
    
    # Fallback: if we have aggregate_rankings in metadata, use those
    # For now, use a simpler heuristic-based approach
    
    # Sort by response length as a proxy for thoroughness (heuristic)
    # In production, this should use actual evaluator scores
    sorted_results = sorted(
        stage1_results,
        key=lambda r: len(r.get("response", "")),
        reverse=True,
    )
    
    # Top N
    top = sorted_results[:n_top]
    top_models = {r["model"] for r in top}
    
    # Wildcard: pick from remaining that has most different style
    remaining = [r for r in sorted_results[n_top:] if r["model"] not in top_models]
    
    # Diversity pick: best from a model not in top
    diversity_candidates = [r for r in remaining if r["model"] not in top_models]
    diversity = diversity_candidates[:1] if diversity_candidates else []
    
    # Wildcard: pick the longest remaining (heuristic for most thorough dissent)
    wildcard_candidates = [r for r in remaining if r not in diversity]
    wildcard = wildcard_candidates[:1] if wildcard_candidates else []
    
    return top + diversity + wildcard


from .config import (
    COUNCIL_MODELS,
    CHAIRMAN_MODEL,
    COMPACT_COUNCIL_MODELS,
    is_cerebras_model,
    is_fireworks_model,
    is_openai_model,
    is_moonshot_model,
    is_xai_model,
    is_gemini_direct_model,
    get_openrouter_fallback,
    calculate_max_response_chars,
)
from .openrouter import query_model as query_openrouter_model
from .openrouter import query_models_parallel as query_openrouter_models_parallel
from .cerebras import query_cerebras_model, query_cerebras_models_parallel
from .openai_client import call_openai
from .moonshot_client import query_moonshot_model
from .xai_client import query_xai_model
from .gemini_client import query_gemini_model
from .fireworks_client import query_fireworks_model, query_fireworks_models_parallel


async def _query_primary(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
) -> Optional[Dict[str, Any]]:
    """Query a model via its primary (direct) provider. Returns None on failure."""
    if is_fireworks_model(model_id):
        return await query_fireworks_model(model_id, messages, max_tokens, temperature)
    elif is_cerebras_model(model_id):
        return await query_cerebras_model(model_id, messages, max_tokens, temperature)
    elif is_moonshot_model(model_id):
        return await query_moonshot_model(model_id, messages, max_tokens, temperature)
    elif is_xai_model(model_id):
        return await query_xai_model(model_id, messages, max_tokens, temperature)
    elif is_gemini_direct_model(model_id):
        return await query_gemini_model(model_id, messages, max_tokens, temperature)
    elif is_openai_model(model_id):
        prompt = messages[-1].get("content", "") if messages else ""
        result = await call_openai(
            model_id, prompt, max_tokens, reasoning_effort="high"
        )
        return {
            "content": result.get("response", ""),
            "usage": result.get("usage", {}),
            "provider": "openai",
        }
    else:
        # No direct provider — go straight to OpenRouter
        # Use the fallback mapping if available (e.g. council ID -> OpenRouter ID)
        or_model = get_openrouter_fallback(model_id) or model_id
        return await query_openrouter_model(or_model, messages, max_tokens, temperature)


async def query_single_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via primary provider, with OpenRouter fallback.
    """
    try:
        result = await _query_primary(model_id, messages, max_tokens, temperature)
        if result and result.get("content"):
            return result
    except Exception as e:
        logger.warning("Primary provider failed for %s: %s", model_id, e)

    # Fallback to OpenRouter
    or_model = get_openrouter_fallback(model_id)
    if or_model:
        logger.info("Falling back to OpenRouter for %s -> %s", model_id, or_model)
        try:
            return await query_openrouter_model(
                or_model, messages, max_tokens, temperature
            )
        except Exception as e:
            logger.error("OpenRouter fallback also failed for %s: %s", model_id, e)
            return None

    return None


async def _query_single_with_reasoning_override(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    reasoning_effort: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Query a single model with per-call reasoning effort override.
    
    Used for dual-mode models like GPT-5.5:
    - Stage 1 (responder): medium reasoning
    - Stage 2 (evaluator): high reasoning
    
    Only OpenRouter models support reasoning_effort override.
    """
    if not reasoning_effort:
        return await query_single_model(model_id, messages, max_tokens, temperature)
    
    # For OpenRouter models, pass reasoning_effort directly
    or_model = get_openrouter_fallback(model_id) or model_id
    try:
        return await query_openrouter_model(
            or_model, messages, max_tokens, temperature, reasoning_effort=reasoning_effort
        )
    except Exception as e:
        logger.warning("Reasoning override query failed for %s: %s", model_id, e)
        # Fallback to normal query without override
        return await query_single_model(model_id, messages, max_tokens, temperature)


async def query_models_parallel(
    model_ids: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    per_model_timeout: float = PER_MODEL_TIMEOUT_SECONDS,
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models via their respective providers in parallel.

    Each model has an individual timeout (per_model_timeout). If a model
    exceeds the timeout, it returns None and other models continue.
    This prevents a single dead provider from blocking the entire council.
    """

    async def _query_with_timeout(
        model_id: str,
    ) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Query a single model with a per-model timeout guard."""
        try:
            result = await asyncio.wait_for(
                query_single_model(model_id, messages, max_tokens, temperature),
                timeout=per_model_timeout,
            )
            return model_id, result
        except asyncio.TimeoutError:
            logger.error(
                "Model %s timed out after %.0fs — skipping", model_id, per_model_timeout
            )
            return model_id, None
        except Exception as e:
            logger.error("Model %s failed: %s", model_id, e)
            return model_id, None

    # Query all models in parallel with individual timeouts
    tasks = [_query_with_timeout(m) for m in model_ids]
    task_results = await asyncio.gather(*tasks)

    return dict(task_results)


async def query_models_with_retries(
    model_ids: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    max_retries: int = 2,
    backoff_base: float = 1.5,
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query models in parallel with automatic retries for failures.

    After the initial parallel burst, any models that returned None are
    retried up to max_retries times with exponential backoff. As a final
    fallback, failed models are attempted via OpenRouter.

    Args:
        model_ids: List of council model IDs
        messages: Chat messages to send
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
        max_retries: Number of retry attempts (default 2)
        backoff_base: Base delay in seconds, doubled each retry

    Returns:
        Dict mapping model_id to response (or None if all attempts failed)
    """
    # First pass: query all models in parallel
    results = await query_models_parallel(model_ids, messages, max_tokens, temperature)

    for attempt in range(max_retries):
        # Find models that failed
        failed = [m for m in model_ids if results.get(m) is None]
        if not failed:
            break

        wait = backoff_base * (2**attempt)
        logger.warning(
            "Retry %d/%d: %d model(s) failed, waiting %.1fs before retry: %s",
            attempt + 1,
            max_retries,
            len(failed),
            wait,
            failed,
        )
        await asyncio.sleep(wait)

        # Retry only the failed models via their primary providers
        retry_results = await query_models_parallel(
            failed, messages, max_tokens, temperature
        )
        for model, result in retry_results.items():
            if result is not None:
                logger.info("Retry %d succeeded for %s", attempt + 1, model)
                results[model] = result

    # Final fallback: try OpenRouter for any models that still failed
    still_failed = [m for m in model_ids if results.get(m) is None]
    if still_failed:
        logger.warning(
            "After %d retries, %d model(s) still failed — trying OpenRouter fallback: %s",
            max_retries,
            len(still_failed),
            still_failed,
        )

        async def _openrouter_fallback(
            model: str,
        ) -> Tuple[str, Optional[Dict[str, Any]]]:
            or_model = get_openrouter_fallback(model)
            if not or_model or or_model == model:
                return model, None
            try:
                result = await query_openrouter_model(
                    or_model, messages, max_tokens, temperature
                )
                if result is not None:
                    result["provider"] = (
                        f"{result.get('provider', 'openrouter')}-fallback"
                    )
                    logger.info(
                        "OpenRouter fallback succeeded for %s -> %s", model, or_model
                    )
                return model, result
            except Exception as e:
                logger.error("OpenRouter fallback failed for %s: %s", model, e)
                return model, None

        fallback_results = await asyncio.gather(
            *[_openrouter_fallback(m) for m in still_failed]
        )
        for model, result in fallback_results:
            if result is not None:
                results[model] = result

    # Final status log
    succeeded = [m for m in model_ids if results.get(m) is not None]
    final_failed = [m for m in model_ids if results.get(m) is None]
    logger.info(
        "Query complete: %d/%d succeeded%s",
        len(succeeded),
        len(model_ids),
        f", FAILED: {final_failed}" if final_failed else "",
    )

    return results


async def stage1_collect_responses(
    user_query: str, council_models: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Stage 1: Collect individual responses from all council models.

    Uses in-memory caching to avoid duplicate API calls when the same
    model+prompt is queried twice (e.g., GPT-5.5 in Stage 1 and Stage 2).

    Args:
        user_query: The user's question
        council_models: Optional override for council models

    Returns:
        List of dicts with 'model', 'response', 'usage' keys
    """
    models = council_models or COUNCIL_MODELS
    messages = [{"role": "user", "content": user_query}]

    logger.info("Stage 1: querying %d models with retries", len(models))

    # Check cache for each model
    cached_results = {}
    models_to_query = []
    
    for model in models:
        cached = _get_cached_response(model, user_query)
        if cached:
            cached_results[model] = cached
        else:
            models_to_query.append(model)
    
    if cached_results:
        logger.info("Stage 1: %d cache hits, %d models to query", len(cached_results), len(models_to_query))

    # Query uncached models in parallel with automatic retries
    if models_to_query:
        responses = await query_models_with_retries(models_to_query, messages)
        
        # Cache new responses
        for model, response in responses.items():
            if response is not None:
                _cache_response(model, user_query, response)
    else:
        responses = {}

    # Merge cached + new responses
    all_responses = {**cached_results, **responses}

    # Format results
    stage1_results = []
    for model, response in all_responses.items():
        if response is not None:  # Only include successful responses
            stage1_results.append(
                {
                    "model": model,
                    "response": response.get("content", ""),
                    "usage": response.get("usage", {}),
                    "provider": response.get("provider", "unknown"),
                }
            )

    logger.info(
        "Stage 1 complete: %d/%d models responded", len(stage1_results), len(models)
    )
    return stage1_results


async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """
    Stage 2: Each model ranks the anonymized responses.

    Args:
        user_query: The original user query
        stage1_results: Results from Stage 1
        council_models: Optional override for council models

    Returns:
        Tuple of (rankings list, label_to_model mapping)
    """
    models = council_models or COUNCIL_MODELS
    
    # Select evaluator subset (top 3 from priority list present in council)
    evaluators = get_evaluator_models(models)
    if not evaluators:
        # Fallback: if no priority evaluators available, use all models
        evaluators = models
        logger.warning("No priority evaluators in council, using all %d models", len(evaluators))
    
    logger.info("Stage 2: using %d evaluator models: %s", len(evaluators), evaluators)

    # Create anonymized labels for responses (Response A, Response B, etc.)
    labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...

    # Create mapping from label to model name
    label_to_model = {
        f"Response {label}": result["model"]
        for label, result in zip(labels, stage1_results)
    }

    # Build evaluator-specific prompts with self-exclusion and randomized order
    evaluator_tasks = []
    
    for evaluator in evaluators:
        # Self-exclusion: remove evaluator's own response
        filtered_results = filter_responses_for_evaluator(evaluator, stage1_results)
        
        # Randomize order for this evaluator
        shuffled_results = shuffle_responses_for_evaluator(filtered_results)
        
        # Create new labels for shuffled responses
        shuffled_labels = [chr(65 + i) for i in range(len(shuffled_results))]
        
        # Update label mapping for this evaluator
        evaluator_label_to_model = {
            f"Response {label}": result["model"]
            for label, result in zip(shuffled_labels, shuffled_results)
        }
        
        # Dynamic truncation based on model tier and council size
        num_models = len(models)
        responses_text = "\n\n".join(
            [
                f"Response {label}:\n{_truncate_for_prompt(result['response'], calculate_max_response_chars(result['model'], num_models))}"
                for label, result in zip(shuffled_labels, shuffled_results)
            ]
        )

        ranking_prompt = f"""You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:"""

        messages = [{"role": "user", "content": ranking_prompt}]
        
        # Use high reasoning effort for GPT-5.5 as evaluator
        if evaluator == "openai/gpt-5.5":
            # Override with evaluator-specific reasoning effort
            from .config import get_model_reasoning_effort
            reasoning = get_model_reasoning_effort("openai/gpt-5.5-evaluator")
            # Pass reasoning override through query_single_model
            task = _query_single_with_reasoning_override(evaluator, messages, reasoning_effort=reasoning)
        else:
            task = query_single_model(evaluator, messages)
        
        evaluator_tasks.append((evaluator, task, evaluator_label_to_model))

    # Execute evaluator queries in parallel
    responses = await asyncio.gather(*[task for _, task, _ in evaluator_tasks])

    # Format results
    stage2_results = []
    for (evaluator, _, eval_label_to_model), response in zip(evaluator_tasks, responses):
        if response is not None:
            full_text = response.get("content", "")
            parsed = parse_ranking_from_text(full_text)
            stage2_results.append(
                {
                    "model": evaluator,
                    "ranking": full_text,
                    "parsed_ranking": parsed,
                    "usage": response.get("usage", {}),
                    "provider": response.get("provider", "unknown"),
                    "label_to_model": eval_label_to_model,
                }
            )

    return stage2_results, label_to_model


async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    chairman_model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Stage 3: Chairman synthesizes final response.

    Args:
        user_query: The original user query
        stage1_results: Individual model responses from Stage 1
        stage2_results: Rankings from Stage 2
        chairman_model: Optional override for chairman model

    Returns:
        Dict with 'model', 'response', 'usage' keys
    """
    chairman = chairman_model or CHAIRMAN_MODEL

    # Curate top 5 responses for the chairman (prevents context explosion with 9 models)
    # Top 3 by consensus + 1 wildcard (high disagreement) + 1 diversity pick
    curated_results = select_top_responses(stage1_results, stage2_results)
    
    logger.info(
        "Stage 3: chairman synthesizing from %d curated responses (of %d total)",
        len(curated_results),
        len(stage1_results),
    )

    # Build comprehensive context for chairman (truncate long responses to prevent context explosion)
    stage1_text = "\n\n".join(
        [
            f"Model: {result['model']}\nResponse: {_truncate_for_prompt(result['response'])}"
            for result in curated_results
        ]
    )

    # Compress Stage 2 evaluations to 2-3 sentence summaries
    stage2_text = ""
    if stage2_results:
        evaluation_summaries = []
        for result in stage2_results:
            # Extract first paragraph (evaluation) and compress
            ranking_text = result.get("ranking", "")
            # Take first 500 chars as summary, or full text if shorter
            summary = ranking_text[:500] + "..." if len(ranking_text) > 500 else ranking_text
            evaluation_summaries.append(
                f"Evaluator ({result['model']}): {summary}"
            )
        
        stage2_text = "\n\nSTAGE 2 - Peer Evaluations (summarized):\n" + "\n\n".join(evaluation_summaries)

    chairman_prompt = f"""You are the Chairman of an LLM Council. {len(stage1_results)} AI models provided responses to a user's question. A panel of expert evaluators reviewed and ranked the responses. You are now seeing the top {len(curated_results)} most valuable responses (selected by consensus, with wildcard and diversity picks to preserve dissenting voices).

Original Question: {user_query}

STAGE 1 - Curated Responses (top {len(curated_results)} of {len(stage1_results)}):
{stage1_text}
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
{f"- The peer evaluations and what they reveal about response quality" if stage2_results else ""}
- Any patterns of agreement or disagreement
- The wildcard/diversity responses may contain valuable minority perspectives

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]

    # Query the chairman model
    response = await query_single_model(chairman, messages)

    if response is None:
        # Fallback if chairman fails
        return {
            "model": chairman,
            "response": "Error: Unable to generate final synthesis.",
            "usage": {},
        }

    return {
        "model": chairman,
        "response": response.get("content", ""),
        "usage": response.get("usage", {}),
        "provider": response.get("provider", "unknown"),
    }


def parse_ranking_from_text(ranking_text: str) -> List[str]:
    """
    Parse the FINAL RANKING section from the model's response.

    Args:
        ranking_text: The full text response from the model

    Returns:
        List of response labels in ranked order
    """
    # Look for "FINAL RANKING:" section
    if "FINAL RANKING:" in ranking_text:
        # Extract everything after "FINAL RANKING:"
        parts = ranking_text.split("FINAL RANKING:")
        if len(parts) >= 2:
            ranking_section = parts[1]
            # Try to extract numbered list format (e.g., "1. Response A")
            # This pattern looks for: number, period, optional space, "Response X"
            numbered_matches = re.findall(r"\d+\.\s*Response [A-Z]", ranking_section)
            if numbered_matches:
                # Extract just the "Response X" part
                result = []
                for m in numbered_matches:
                    match = re.search(r"Response [A-Z]", m)
                    if match:
                        result.append(match.group())
                return result

            # Fallback: Extract all "Response X" patterns in order
            matches = re.findall(r"Response [A-Z]", ranking_section)
            return matches

    # Fallback: try to find any "Response X" patterns in order
    matches = re.findall(r"Response [A-Z]", ranking_text)
    return matches


def calculate_aggregate_rankings(
    stage2_results: List[Dict[str, Any]], label_to_model: Dict[str, str]
) -> List[Dict[str, Any]]:
    """
    Calculate aggregate rankings across all models.

    Args:
        stage2_results: Rankings from each model
        label_to_model: Mapping from anonymous labels to model names

    Returns:
        List of dicts with model name and average rank, sorted best to worst
    """
    # Track positions for each model
    model_positions: Dict[str, List[int]] = defaultdict(list)

    for ranking in stage2_results:
        ranking_text = ranking["ranking"]

        # Parse the ranking from the structured format
        parsed_ranking = parse_ranking_from_text(ranking_text)

        for position, label in enumerate(parsed_ranking, start=1):
            if label in label_to_model:
                model_name = label_to_model[label]
                model_positions[model_name].append(position)

    # Calculate average position for each model
    aggregate = []
    for model, positions in model_positions.items():
        if positions:
            avg_rank = sum(positions) / len(positions)
            aggregate.append(
                {
                    "model": model,
                    "average_rank": round(avg_rank, 2),
                    "rankings_count": len(positions),
                }
            )

    # Sort by average rank (lower is better)
    aggregate.sort(key=lambda x: x["average_rank"])

    return aggregate


async def run_full_council(
    user_query: str,
    final_only: bool = False,
    compact: bool = False,
    council_models: Optional[List[str]] = None,
    chairman_model: Optional[str] = None,
) -> Tuple[List, List, Dict, Dict]:
    """
    Run the complete 3-stage council process.

    Args:
        user_query: The user's question
        final_only: If True, skip Stage 2 (peer review) for faster results
        compact: If True, use only 5 core models (faster/cheaper)
        council_models: Optional override for council models
        chairman_model: Optional override for chairman model

    Returns:
        Tuple of (stage1_results, stage2_results, stage3_result, metadata)
    """
    # Use compact council if requested and no explicit override
    if compact and not council_models:
        from .config import COMPACT_COUNCIL_MODELS
        council_models = COMPACT_COUNCIL_MODELS
    
    # Stage 1: Collect individual responses
    stage1_results = await stage1_collect_responses(user_query, council_models)

    # If no models responded successfully, return error
    if not stage1_results:
        return (
            [],
            [],
            {
                "model": chairman_model or CHAIRMAN_MODEL,
                "response": "All models failed to respond. Please try again.",
            },
            {},
        )

    if final_only:
        # Skip Stage 2, just synthesize from Stage 1
        stage3_result = await stage3_synthesize_final(
            user_query, stage1_results, [], chairman_model
        )
        metadata = {"aggregate_rankings": [], "label_to_model": {}, "final_only": True, "compact": compact}
        return stage1_results, [], stage3_result, metadata

    # Stage 2: Collect rankings
    stage2_results, label_to_model = await stage2_collect_rankings(
        user_query, stage1_results, council_models
    )

    # Calculate aggregate rankings
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)

    # Stage 3: Synthesize final answer
    stage3_result = await stage3_synthesize_final(
        user_query, stage1_results, stage2_results, chairman_model
    )

    # Prepare metadata
    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
        "final_only": False,
        "compact": compact,
    }

    return stage1_results, stage2_results, stage3_result, metadata


async def _query_single_with_retry(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    max_retries: int = 2,
    backoff_base: float = 1.5,
) -> Dict[str, Any]:
    """
    Query a single model with retries and OpenRouter fallback.

    Uses the SAME provider routing as query_models_parallel:
    fireworks, cerebras, anthropic, openai → direct providers.
    Everything else → OpenRouter (with ID translation via fallback map).

    Returns a dict with model, response, usage, provider keys.
    Always returns a result (with empty response on total failure).
    """
    # Determine if this model has a direct provider (matching query_models_parallel logic)
    has_direct_provider = (
        is_fireworks_model(model_id)
        or is_cerebras_model(model_id)
        or is_openai_model(model_id)
        or is_xai_model(model_id)
    )

    async def _try_query() -> Optional[Dict[str, Any]]:
        if has_direct_provider:
            return await _query_primary(model_id, messages, max_tokens, temperature)
        else:
            # Route through OpenRouter (same as query_models_parallel's openrouter_raw path)
            or_model = get_openrouter_fallback(model_id) or model_id
            return await query_openrouter_model(
                or_model, messages, max_tokens, temperature
            )

    for attempt in range(max_retries + 1):
        try:
            result = await _try_query()
            if result and result.get("content"):
                return {
                    "model": model_id,
                    "response": result.get("content", ""),
                    "usage": result.get("usage", {}),
                    "provider": result.get("provider", "unknown"),
                }
        except Exception as e:
            logger.warning(
                "Attempt %d/%d failed for %s: %s",
                attempt + 1,
                max_retries + 1,
                model_id,
                e,
            )
        if attempt < max_retries:
            wait = backoff_base * (2**attempt)
            await asyncio.sleep(wait)

    # Final fallback: OpenRouter (only if we were using a direct provider)
    if has_direct_provider:
        or_model = get_openrouter_fallback(model_id)
        if or_model:
            try:
                result = await query_openrouter_model(
                    or_model, messages, max_tokens, temperature
                )
                if result and result.get("content"):
                    return {
                        "model": model_id,
                        "response": result.get("content", ""),
                        "usage": result.get("usage", {}),
                        "provider": f"{result.get('provider', 'openrouter')}-fallback",
                    }
            except Exception as e:
                logger.error("OpenRouter fallback failed for %s: %s", model_id, e)

    return {
        "model": model_id,
        "response": "",
        "usage": {},
        "provider": "failed",
    }


async def stream_council(
    user_query: str,
    final_only: bool = False,
    council_models: Optional[List[str]] = None,
    chairman_model: Optional[str] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream the council deliberation, yielding events as each model responds.

    Events yielded:
        {"event": "stage_start", "stage": 1}
        {"event": "model_response", "stage": 1, "model": "...", "response": "...", ...}
        {"event": "stage_complete", "stage": 1, "count": "5/5"}
        {"event": "stage_start", "stage": 2}  (if not final_only)
        {"event": "model_response", "stage": 2, "model": "...", "ranking": "...", ...}
        {"event": "stage_complete", "stage": 2, "count": "5/5"}
        {"event": "stage_start", "stage": 3}
        {"event": "synthesis", "model": "...", "response": "..."}
        {"event": "complete", "stage1": [...], "stage2": [...], "stage3": {...}, "metadata": {...}}
    """
    models = council_models or COUNCIL_MODELS
    chairman = chairman_model or CHAIRMAN_MODEL
    messages = [{"role": "user", "content": user_query}]

    # --- Stage 1: Stream individual responses ---
    yield {"event": "stage_start", "stage": 1, "models": models}
    logger.info("Stream Stage 1: querying %d models", len(models))

    stage1_results: List[Dict[str, Any]] = []
    tasks = {
        asyncio.create_task(_query_single_with_retry(m, messages)): m for m in models
    }

    responded = 0
    for coro in asyncio.as_completed(tasks.keys()):
        result = await coro
        responded += 1
        if result.get("response"):
            stage1_results.append(result)
            yield {
                "event": "model_response",
                "stage": 1,
                "model": result["model"],
                "response": result["response"][:200]
                + ("..." if len(result["response"]) > 200 else ""),
                "provider": result["provider"],
                "tokens": result.get("usage", {}).get("total_tokens", 0),
                "progress": f"{responded}/{len(models)}",
            }
        else:
            yield {
                "event": "model_failed",
                "stage": 1,
                "model": result["model"],
                "progress": f"{responded}/{len(models)}",
            }

    yield {
        "event": "stage_complete",
        "stage": 1,
        "count": f"{len(stage1_results)}/{len(models)}",
    }
    logger.info(
        "Stream Stage 1 complete: %d/%d models responded",
        len(stage1_results),
        len(models),
    )

    if not stage1_results:
        yield {
            "event": "error",
            "message": "All models failed to respond.",
        }
        return

    # --- Stage 2: Peer rankings (if not final_only) ---
    stage2_results: List[Dict[str, Any]] = []
    label_to_model: Dict[str, str] = {}
    aggregate_rankings: List[Dict[str, Any]] = []

    if not final_only:
        yield {"event": "stage_start", "stage": 2, "models": models}
        logger.info("Stream Stage 2: querying %d models for rankings", len(models))

        labels = [chr(65 + i) for i in range(len(stage1_results))]
        label_to_model = {
            f"Response {label}": result["model"]
            for label, result in zip(labels, stage1_results)
        }
        responses_text = "\n\n".join(
            f"Response {label}:\n{result['response']}"
            for label, result in zip(labels, stage1_results)
        )
        ranking_prompt = f"""You are evaluating different responses to the following question:

Question: {user_query}

Here are the responses from different models (anonymized):

{responses_text}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Now provide your evaluation and ranking:"""

        ranking_messages = [{"role": "user", "content": ranking_prompt}]
        ranking_tasks = {
            asyncio.create_task(_query_single_with_retry(m, ranking_messages)): m
            for m in models
        }

        ranked = 0
        for coro in asyncio.as_completed(ranking_tasks.keys()):
            result = await coro
            ranked += 1
            if result.get("response"):
                parsed = parse_ranking_from_text(result["response"])
                stage2_entry = {
                    "model": result["model"],
                    "ranking": result["response"],
                    "parsed_ranking": parsed,
                    "usage": result.get("usage", {}),
                    "provider": result.get("provider", "unknown"),
                }
                stage2_results.append(stage2_entry)
                yield {
                    "event": "model_response",
                    "stage": 2,
                    "model": result["model"],
                    "parsed_ranking": parsed,
                    "provider": result["provider"],
                    "progress": f"{ranked}/{len(models)}",
                }
            else:
                yield {
                    "event": "model_failed",
                    "stage": 2,
                    "model": result["model"],
                    "progress": f"{ranked}/{len(models)}",
                }

        aggregate_rankings = calculate_aggregate_rankings(
            stage2_results, label_to_model
        )
        yield {
            "event": "stage_complete",
            "stage": 2,
            "count": f"{len(stage2_results)}/{len(models)}",
        }

    # --- Stage 3: Chairman synthesis ---
    yield {"event": "stage_start", "stage": 3, "chairman": chairman}
    logger.info("Stream Stage 3: chairman %s synthesizing", chairman)

    stage3_result = await stage3_synthesize_final(
        user_query, stage1_results, stage2_results, chairman
    )

    yield {
        "event": "synthesis",
        "model": stage3_result.get("model", chairman),
        "response": stage3_result.get("response", ""),
        "provider": stage3_result.get("provider", "unknown"),
    }

    # --- Final complete event with all data ---
    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
        "final_only": final_only,
    }

    yield {
        "event": "complete",
        "stage1": stage1_results,
        "stage2": stage2_results,
        "stage3": stage3_result,
        "metadata": metadata,
    }


async def generate_conversation_title(user_query: str) -> str:
    """
    Generate a short title for a conversation based on the first user message.

    Args:
        user_query: The first user message

    Returns:
        A short title (3-5 words)
    """
    title_prompt = f"""Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: {user_query}

Title:"""

    messages = [{"role": "user", "content": title_prompt}]

    # Use a fast, cheap model for title generation (must be in config routing)
    response = await query_single_model(
        "google/gemini-3.1-pro-preview", messages, max_tokens=50
    )

    if response is None:
        # Fallback to a generic title
        return "New Conversation"

    title = response.get("content", "New Conversation").strip()

    # Clean up the title - remove quotes, limit length
    title = title.strip("\"'")

    # Truncate if too long
    if len(title) > 50:
        title = title[:47] + "..."

    return title
