"""3-stage LLM Council orchestration with multi-provider support."""

import asyncio
import hashlib
import json
import logging
import random
import re
import time
from collections import defaultdict
from collections.abc import AsyncGenerator
from dataclasses import asdict, replace
from typing import Any

from .execution_planning import ExecutionPlan, build_execution_plan, curate_responses
from .model_registry import load_registry
from .parallel_intelligence import EvidenceBundle

logger = logging.getLogger("llm-council.council")


def execution_plan_metadata(plan: ExecutionPlan) -> dict[str, Any]:
    """Return public, secret-free execution provenance."""
    operations = (*plan.stage1, *plan.evaluators, plan.chairman)
    unique = {operation.logical_id: operation for operation in operations}
    return {
        "digest": plan.digest,
        "registry_version": plan.registry_version,
        "registry_digest": plan.registry_digest,
        "projection_digest": plan.projection_digest,
        "roster": [operation.logical_id for operation in plan.stage1],
        "evaluators": [operation.logical_id for operation in plan.evaluators],
        "chairman": plan.chairman.logical_id,
        "models": [
            {
                "model": model,
                "roles": list(plan.roles[model]),
                "provider": operation.route.provider,
                "route_id": operation.route.route_id,
            }
            for model, operation in unique.items()
        ],
    }

# Maximum characters per model response when building Stage 2/3 prompts.
# Prevents context window explosion when individual models produce very long outputs.
# 12,000 chars ~ 3,000 tokens. With 5 models that's ~15K tokens of context,
# leaving plenty of room for the ranking/synthesis prompt and response.
MAX_RESPONSE_CHARS_FOR_PROMPT = 12_000

# Per-model timeout for individual provider calls.
# Prevents a single dead/slow provider from blocking the entire council.
# Individual models that exceed this are skipped (others continue).
PER_MODEL_TIMEOUT_SECONDS = 180  # 3 minutes per model
STAGE2_EVALUATOR_TIMEOUT_SECONDS = 2 * PER_MODEL_TIMEOUT_SECONDS + 30
CHAIRMAN_TIMEOUT_SECONDS = 2 * PER_MODEL_TIMEOUT_SECONDS + 30

# Stage 1 response cache: (model_id + prompt_hash) -> (response, timestamp)
# TTL: 1 hour. Saves ~30% cost when same model+prompt called twice (e.g., GPT-5.5 in Stage 1 + Stage 2)
_stage1_cache: dict[str, tuple[dict[str, Any], float]] = {}
CACHE_TTL_SECONDS = 3600
STAGE1_CACHE_MAX_ENTRIES = 512


def _get_cache_key(model_id: str | Any, prompt: str) -> str:
    """Generate cache key for Stage 1 responses."""
    if isinstance(model_id, str):
        identity: Any = {"version": 1, "model": model_id}
    else:
        operation = asdict(model_id)
        operation.pop("messages", None)
        identity = {"version": 2, "operation": operation}
    payload = json.dumps(identity, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(f"{payload}:{prompt}".encode()).hexdigest()[:16]


def _get_cached_response(model_id: str | Any, prompt: str) -> dict[str, Any] | None:
    """Get cached Stage 1 response if available and not expired."""
    key = _get_cache_key(model_id, prompt)
    if key in _stage1_cache:
        response, timestamp = _stage1_cache[key]
        if time.time() - timestamp < CACHE_TTL_SECONDS:
            logger.info("Stage 1 cache hit")
            return response
        else:
            del _stage1_cache[key]
    return None


def _sweep_stage1_cache(now: float | None = None) -> None:
    """Evict expired and oldest Stage 1 cache entries to keep cache bounded."""
    now = time.time() if now is None else now
    expired_keys = [
        key for key, (_, timestamp) in _stage1_cache.items()
        if now - timestamp >= CACHE_TTL_SECONDS
    ]
    for key in expired_keys:
        del _stage1_cache[key]

    overflow = len(_stage1_cache) - STAGE1_CACHE_MAX_ENTRIES
    if overflow > 0:
        oldest_keys = sorted(_stage1_cache, key=lambda key: _stage1_cache[key][1])[:overflow]
        for key in oldest_keys:
            del _stage1_cache[key]


def _cache_response(model_id: str | Any, prompt: str, response: dict[str, Any]):
    """Cache Stage 1 response."""
    _sweep_stage1_cache()
    key = _get_cache_key(model_id, prompt)
    _stage1_cache[key] = (response, time.time())
    _sweep_stage1_cache()


def _project_stage1_result(model: str, response: dict[str, Any]) -> dict[str, Any]:
    """Project one normalized dispatcher terminal result without losing provenance."""
    return {
        "model": model,
        "response": response.get("content", ""),
        "usage": response.get("usage", {}),
        "provider": response.get("provider", "unknown"),
        "route_id": response.get("route_id"),
        "fallback_used": response.get("fallback_used", False),
        "error": response.get("error"),
        "terminal_status": response.get(
            "terminal_status", "succeeded" if response.get("content") else "failed"
        ),
    }


def _order_stage1_results(
    results: list[dict[str, Any]], plan: ExecutionPlan
) -> list[dict[str, Any]]:
    """Order terminal Stage 1 projections by the immutable captured seat order."""
    seat = {operation.logical_id: index for index, operation in enumerate(plan.stage1)}
    return sorted(results, key=lambda result: seat[result["model"]])


async def _execute_stage1_operation(operation, cache_prompt: str) -> dict[str, Any]:
    """Resolve one planned Stage 1 seat through the shared normalized cache path."""
    cached = _get_cached_response(operation, cache_prompt)
    if cached is None:
        cached = await _dispatcher().execute(operation)
        _cache_response(operation, cache_prompt, cached)
    return _project_stage1_result(operation.logical_id, cached)


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


def get_evaluator_models(council_models: list[str]) -> list[str]:
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
    evaluator_model: str, responses: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Filter out the evaluator's own Stage 1 response to prevent self-evaluation bias.

    Research shows models can recognize their own outputs above chance,
    leading to 5-20% self-preference inflation in rankings.
    """
    return [r for r in responses if r.get("model") != evaluator_model]


def shuffle_responses_for_evaluator(
    responses: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Randomize response order for each evaluator to reduce position bias.

    LLMs suffer from "lost in the middle" — they attend less to responses
    in the middle of long prompts. Randomizing order per evaluator averages
    out this bias across the evaluation panel.
    """
    shuffled = responses.copy()
    random.shuffle(shuffled)
    return shuffled


def select_top_responses(
    stage1_results: list[dict[str, Any]],
    stage2_results: list[dict[str, Any]],
    n_top: int = 3,
    n_wildcard: int = 1,
    n_diversity: int = 1,
) -> list[dict[str, Any]]:
    """Curate top responses for the chairman from Stage 1 + Stage 2.

    Selection strategy:
    1. Top N by aggregate evaluator score (consensus picks)
    2. 1 wildcard: highest disagreement response (protects minority correct answers)
    3. 1 diversity pick: best response from model not in top N

    This prevents the chairman from being overwhelmed by 9 responses while
    preserving both consensus signal and dissenting voices.
    """
    target_count = n_top + n_wildcard + n_diversity
    if len(stage1_results) <= target_count:
        # Not enough responses for full curation, return all
        return stage1_results

    global_label_to_model = {
        f"Response {chr(65 + index)}": result["model"]
        for index, result in enumerate(stage1_results)
    }
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, global_label_to_model)
    by_model = {result["model"]: result for result in stage1_results}

    if not aggregate_rankings:
        return stage1_results[:target_count]

    ranked_models = [entry["model"] for entry in aggregate_rankings if entry["model"] in by_model]
    selected_models: list[str] = []

    for model in ranked_models:
        if model not in selected_models:
            selected_models.append(model)
        if len(selected_models) == n_top:
            break

    top_models = set(selected_models)

    # Wildcard: highest disagreement among non-consensus responses.
    disagreement_scores: list[tuple[float, float, str]] = []
    for entry in aggregate_rankings:
        model = entry["model"]
        if model in top_models or model not in by_model:
            continue
        positions = entry.get("positions", [])
        spread = (max(positions) - min(positions)) if positions else 0
        disagreement_scores.append((float(spread), -float(entry["average_rank"]), model))

    wildcard_models = [
        model for *_unused, model in sorted(disagreement_scores, reverse=True)[:n_wildcard]
        if model not in selected_models
    ]
    selected_models.extend(wildcard_models)

    # Diversity: next best model not already selected.
    for model in ranked_models:
        if model not in selected_models:
            selected_models.append(model)
        if len(selected_models) == target_count:
            break

    # Fill from original order only if sparse evaluator coverage left gaps.
    for result in stage1_results:
        model = result["model"]
        if model not in selected_models:
            selected_models.append(model)
        if len(selected_models) == target_count:
            break

    return [by_model[model] for model in selected_models[:target_count]]


from .cerebras import query_cerebras_model
from .config import (
    CHAIRMAN_MODEL,
    COUNCIL_MODELS,
    calculate_max_response_chars,
)
from .fireworks_client import query_fireworks_model
from .gemini_client import query_gemini_model
from .model_dispatcher import DispatchRequest, ModelDispatcher
from .moonshot_client import query_moonshot_model
from .openrouter import query_model as query_openrouter_model
from .vertex_anthropic_client import query_vertex_anthropic_model
from .xai_client import query_xai_model


def _dispatcher() -> ModelDispatcher:
    """Build a dispatcher with module-local adapters for patch-compatible callers."""
    return ModelDispatcher(adapters={
        "openrouter": query_openrouter_model,
        "vertex": query_vertex_anthropic_model,
        "fireworks": query_fireworks_model,
        "cerebras": query_cerebras_model,
        "moonshot": query_moonshot_model,
        "xai": query_xai_model,
        "gemini": query_gemini_model,
    })


async def _query_primary(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    reasoning_effort: str | None = None,
) -> dict[str, Any] | None:
    """Query a model via only its exact primary registry route."""
    return await _dispatcher().query(DispatchRequest(
        model_id, messages, max_tokens, temperature, reasoning_effort,
        timeout=PER_MODEL_TIMEOUT_SECONDS, allow_fallbacks=False,
    ))


async def query_single_model(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    reasoning_effort: str | None = None,
) -> dict[str, Any] | None:
    """
    Query a single model via primary provider, with OpenRouter fallback.

    Safety: Fable's primary Vertex AI route is PHI-eligible only in covered
    Google Cloud projects/services under BAA. Its OpenRouter fallback is
    non-PHI/deidentified only; this service does not perform PHI detection.
    """
    return await _dispatcher().query(DispatchRequest(
        model_id, messages, max_tokens, temperature, reasoning_effort,
        timeout=PER_MODEL_TIMEOUT_SECONDS,
    ))


async def _query_single_with_reasoning_override(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    reasoning_effort: str | None = None,
) -> dict[str, Any] | None:
    """Query a single model with per-call reasoning effort override.

    Used for dual-mode models like GPT-5.5:
    - Stage 1 (responder): medium reasoning
    - Stage 2 (evaluator): high reasoning

    OpenRouter and Fireworks models support reasoning_effort override.
    """
    return await _dispatcher().query(DispatchRequest(
        model_id, messages, max_tokens, temperature, reasoning_effort,
        timeout=PER_MODEL_TIMEOUT_SECONDS,
    ))


async def query_models_parallel(
    model_ids: list[str],
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    per_model_timeout: float = PER_MODEL_TIMEOUT_SECONDS,
) -> dict[str, dict[str, Any] | None]:
    """
    Query multiple models via their respective providers in parallel.

    Each model has an individual timeout (per_model_timeout). If a model
    exceeds the timeout, it returns None and other models continue.
    This prevents a single dead provider from blocking the entire council.
    """

    async def _query_with_timeout(
        model_id: str,
    ) -> tuple[str, dict[str, Any] | None]:
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
    model_ids: list[str],
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    max_retries: int = 2,
    backoff_base: float = 1.5,
) -> dict[str, dict[str, Any] | None]:
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
    user_query: str,
    council_models: list[str] | None = None,
    execution_plan: ExecutionPlan | None = None,
    evidence_bundle: EvidenceBundle | None = None,
) -> list[dict[str, Any]]:
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
    models = [operation.logical_id for operation in execution_plan.stage1] if execution_plan else (council_models or COUNCIL_MODELS)
    messages = [{"role": "user", "content": user_query}]
    if evidence_bundle is not None:
        messages.append({"role": "system", "content": evidence_bundle.message()})
    cache_prompt = user_query + ("\n" + evidence_bundle.message() if evidence_bundle else "")

    logger.info("Stage 1: querying %d models with retries", len(models))

    if execution_plan:
        operations = [
            replace(op, messages=tuple((m["role"], m["content"]) for m in messages))
            for op in execution_plan.stage1
        ]
        stage1_results = list(await asyncio.gather(*[
            _execute_stage1_operation(operation, cache_prompt) for operation in operations
        ]))
    else:
        cached = {model: _get_cached_response(model, cache_prompt) for model in models}
        to_query = [model for model, response in cached.items() if response is None]
        responses = await query_models_with_retries(to_query, messages) if to_query else {}
        for model, response in responses.items():
            if response is not None:
                _cache_response(model, cache_prompt, response)
        responses = {**{model: response for model, response in cached.items() if response is not None}, **responses}
        stage1_results = []
        for model in models:
            response = responses.get(model)
            if response is not None:
                stage1_results.append(_project_stage1_result(model, response))

    if execution_plan:
        stage1_results = _order_stage1_results(stage1_results, execution_plan)

    logger.info(
        "Stage 1 complete: %d/%d models responded", len(stage1_results), len(models)
    )
    return stage1_results


async def stage2_collect_rankings(
    user_query: str,
    stage1_results: list[dict[str, Any]],
    council_models: list[str] | None = None,
    execution_plan: ExecutionPlan | None = None,
) -> tuple[list[dict[str, Any]], dict[str, str]]:
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
    evaluators = [operation.logical_id for operation in execution_plan.evaluators] if execution_plan else get_evaluator_models(models)
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
        for label, result in zip(labels, stage1_results, strict=False)
    }

    # Build evaluator-specific prompts with self-exclusion and randomized order
    evaluator_tasks = []

    planned_evaluators = {op.logical_id: op for op in execution_plan.evaluators} if execution_plan else {}
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
            for label, result in zip(shuffled_labels, shuffled_results, strict=False)
        }

        # Dynamic truncation based on model tier and council size
        num_models = len(models)
        responses_text = "\n\n".join(
            [
                f"Response {label}:\n{_truncate_for_prompt(result['response'], calculate_max_response_chars(result['model'], num_models))}"
                for label, result in zip(shuffled_labels, shuffled_results, strict=False)
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
        if execution_plan:
            operation = planned_evaluators[evaluator]
            task = _dispatcher().execute(replace(operation, messages=tuple((item["role"], item["content"]) for item in messages)))
        elif evaluator == "openai/gpt-5.5":
            # Override with evaluator-specific reasoning effort
            from .config import get_model_reasoning_effort
            reasoning = get_model_reasoning_effort("openai/gpt-5.5-evaluator")
            # Pass reasoning override through query_single_model
            task = _query_single_with_reasoning_override(evaluator, messages, reasoning_effort=reasoning)
        else:
            task = query_single_model(evaluator, messages)

        evaluator_tasks.append((evaluator, task, evaluator_label_to_model))

    # Execute evaluator queries in parallel
    async def _bounded_evaluator_query(task):
        try:
            return await asyncio.wait_for(
                task, timeout=STAGE2_EVALUATOR_TIMEOUT_SECONDS
            )
        except asyncio.TimeoutError:
            logger.error(
                "Stage 2 evaluator timed out after %.0fs",
                STAGE2_EVALUATOR_TIMEOUT_SECONDS,
            )
            return None

    responses = await asyncio.gather(
        *[_bounded_evaluator_query(task) for _, task, _ in evaluator_tasks]
    )

    # Format results
    stage2_results = []
    for (evaluator, _, eval_label_to_model), response in zip(evaluator_tasks, responses, strict=False):
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
    stage1_results: list[dict[str, Any]],
    stage2_results: list[dict[str, Any]],
    chairman_model: str | None = None,
    execution_plan: ExecutionPlan | None = None,
) -> dict[str, Any]:
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
    chairman = execution_plan.chairman.logical_id if execution_plan else (chairman_model or CHAIRMAN_MODEL)

    # Curate top 5 responses for the chairman (prevents context explosion with 9 models)
    # Top 3 by consensus + 1 wildcard (high disagreement) + 1 diversity pick
    if execution_plan:
        global_labels = {f"Response {chr(65 + index)}": result["model"] for index, result in enumerate(stage1_results)}
        aggregate = calculate_aggregate_rankings(stage2_results, global_labels)
        curated_results = curate_responses(execution_plan, stage1_results, aggregate)
    else:
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
{"- The peer evaluations and what they reveal about response quality" if stage2_results else ""}
- Any patterns of agreement or disagreement
- The wildcard/diversity responses may contain valuable minority perspectives

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]

    # Query the chairman model
    try:
        if execution_plan:
            operation = replace(execution_plan.chairman, messages=tuple((item["role"], item["content"]) for item in messages))
            response = await _dispatcher().execute(operation)
        else:
            response = await asyncio.wait_for(query_single_model(chairman, messages), timeout=CHAIRMAN_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        logger.error(
            "Chairman model %s timed out after %.0fs", chairman, CHAIRMAN_TIMEOUT_SECONDS
        )
        response = None

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


def parse_ranking_from_text(ranking_text: str) -> list[str]:
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
    stage2_results: list[dict[str, Any]], label_to_model: dict[str, str]
) -> list[dict[str, Any]]:
    """
    Calculate aggregate rankings across all models.

    Args:
        stage2_results: Rankings from each model
        label_to_model: Mapping from anonymous labels to model names

    Returns:
        List of dicts with model name and average rank, sorted best to worst
    """
    # Track positions for each model
    model_positions: dict[str, list[int]] = defaultdict(list)

    for ranking in stage2_results:
        evaluator_label_to_model = ranking.get("label_to_model") or label_to_model

        # Use already-parsed ranking when present, otherwise parse structured text.
        parsed_ranking = ranking.get("parsed_ranking") or parse_ranking_from_text(
            ranking.get("ranking", "")
        )

        for position, label in enumerate(parsed_ranking, start=1):
            if label in evaluator_label_to_model:
                model_name = evaluator_label_to_model[label]
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
                    "positions": positions,
                }
            )

    # Sort by average rank (lower is better)
    aggregate.sort(key=lambda x: x["average_rank"])

    return aggregate


async def run_full_council(
    user_query: str,
    final_only: bool = False,
    compact: bool = False,
    council_models: list[str] | None = None,
    chairman_model: str | None = None,
    execution_plan: ExecutionPlan | None = None,
    evidence_bundle: EvidenceBundle | None = None,
) -> tuple[list, list, dict, dict]:
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
    plan = execution_plan or build_execution_plan(load_registry(), {
        "query": user_query,
        "compact": compact,
        "models": council_models,
        "chairman": chairman_model,
        "mode": "sync",
    })
    council_models = [operation.logical_id for operation in plan.stage1]
    chairman_model = plan.chairman.logical_id

    # Use compact council if requested and no explicit override
    if compact and not council_models:
        from .config import COMPACT_COUNCIL_MODELS
        council_models = COMPACT_COUNCIL_MODELS

    # Stage 1: Collect individual responses
    stage1_results = await stage1_collect_responses(user_query, council_models, plan, evidence_bundle)
    successful_stage1 = [result for result in stage1_results if result.get("response")]

    # If no models responded successfully, return error
    if not successful_stage1:
        failure = {
            "model": chairman_model,
            "response": "All models failed to respond. Please try again.",
            "usage": {},
            "provider": "not_called",
            "route_id": None,
            "fallback_used": False,
            "error": {"code": "stage1_exhausted", "message": "All Stage 1 operations failed"},
            "terminal_status": "failed",
        }
        return (
            stage1_results,
            [],
            failure,
            {"aggregate_rankings": [], "label_to_model": {}, "final_only": final_only,
             "compact": compact, "execution_plan": execution_plan_metadata(plan)},
        )

    if final_only:
        # Skip Stage 2, just synthesize from Stage 1
        stage3_result = await stage3_synthesize_final(
            user_query, successful_stage1, [], chairman_model, plan
        )
        metadata = {"aggregate_rankings": [], "label_to_model": {}, "final_only": True, "compact": compact, "execution_plan": execution_plan_metadata(plan)}
        return stage1_results, [], stage3_result, metadata

    # Stage 2: Collect rankings
    stage2_results, label_to_model = await stage2_collect_rankings(
        user_query, successful_stage1, [operation.logical_id for operation in plan.evaluators], plan
    )

    # Calculate aggregate rankings
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)

    # Stage 3: Synthesize final answer
    stage3_result = await stage3_synthesize_final(
        user_query, successful_stage1, stage2_results, chairman_model, plan
    )

    # Prepare metadata
    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
        "final_only": False,
        "compact": compact,
        "execution_plan": execution_plan_metadata(plan),
    }

    return stage1_results, stage2_results, stage3_result, metadata


async def _query_single_with_retry(
    model_id: str,
    messages: list[dict[str, str]],
    max_tokens: int = 32768,
    temperature: float = 0.7,
    max_retries: int = 2,
    backoff_base: float = 1.5,
) -> dict[str, Any]:
    """
    Query a single model with retries and OpenRouter fallback.

    Uses the SAME provider routing as query_models_parallel:
    fireworks, cerebras, xAI, Vertex Anthropic → direct providers.
    Everything else → OpenRouter (with ID translation via fallback map).

    Returns a dict with model, response, usage, provider keys.
    Always returns a result (with empty response on total failure).
    """
    result = await _dispatcher().query(DispatchRequest(
        model_id,
        messages,
        max_tokens,
        temperature,
        timeout=PER_MODEL_TIMEOUT_SECONDS,
        max_retries=max_retries,
        backoff_base=backoff_base,
    ))
    if not result:
        return {"model": model_id, "response": "", "usage": {}, "provider": "failed"}
    return {
        "model": model_id,
        "response": result.get("content", ""),
        "usage": result.get("usage", {}),
        "provider": result.get("provider", "unknown"),
    }


async def _query_planned_operation(operation):
    """Run a captured operation and preserve the legacy stream result shape."""
    result = await _dispatcher().execute(operation)
    if not result:
        return {"model": operation.logical_id, "response": "", "usage": {}, "provider": "failed", "route_id": operation.routes[-1].route_id, "fallback_used": len(operation.routes) > 1, "error": {"code": "provider_exhausted", "message": "All captured routes failed"}, "terminal_status": "failed"}
    return _project_stage1_result(operation.logical_id, result)


async def stream_council(
    user_query: str,
    final_only: bool = False,
    council_models: list[str] | None = None,
    chairman_model: str | None = None,
    execution_plan: ExecutionPlan | None = None,
    evidence_bundle: EvidenceBundle | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
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
    plan = execution_plan or build_execution_plan(load_registry(), {
        "query": user_query, "models": council_models, "chairman": chairman_model, "mode": "stream"
    })
    models = [operation.logical_id for operation in plan.stage1]
    chairman = plan.chairman.logical_id

    # --- Stage 1: Stream individual responses ---
    yield {"event": "stage_start", "stage": 1, "models": models}
    logger.info("Stream Stage 1: querying %d models", len(models))

    stage1_results: list[dict[str, Any]] = []
    stage1_messages = [{"role": "user", "content": user_query}]
    if evidence_bundle is not None:
        stage1_messages.append({"role": "system", "content": evidence_bundle.message()})
    cache_prompt = user_query + ("\n" + evidence_bundle.message() if evidence_bundle else "")
    tasks = {
        asyncio.create_task(_execute_stage1_operation(
            replace(op, messages=tuple((m["role"], m["content"]) for m in stage1_messages)),
            cache_prompt,
        )): op.logical_id
        for op in plan.stage1
    }

    responded = 0
    for coro in asyncio.as_completed(tasks.keys()):
        result = await coro
        responded += 1
        stage1_results.append(result)
        if result.get("response"):
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

    successful_stage1 = [result for result in stage1_results if result.get("response")]
    if not successful_stage1:
        yield {
            "event": "error",
            "message": "All models failed to respond.",
        }
        failure = {
            "model": chairman,
            "response": "All models failed to respond. Please try again.",
            "usage": {},
            "provider": "not_called",
            "route_id": None,
            "fallback_used": False,
            "error": {"code": "stage1_exhausted", "message": "All Stage 1 operations failed"},
            "terminal_status": "failed",
        }
        yield {
            "event": "complete",
            "stage1": _order_stage1_results(stage1_results, plan),
            "stage2": [],
            "stage3": failure,
            "metadata": {"label_to_model": {}, "aggregate_rankings": [],
                         "final_only": final_only, "execution_plan": execution_plan_metadata(plan)},
        }
        return

    # --- Stage 2: Peer rankings (if not final_only) ---
    stage2_results: list[dict[str, Any]] = []
    label_to_model: dict[str, str] = {}
    aggregate_rankings: list[dict[str, Any]] = []

    if not final_only:
        evaluators = [operation.logical_id for operation in plan.evaluators]
        yield {"event": "stage_start", "stage": 2, "models": evaluators}
        logger.info(
            "Stream Stage 2: querying %d evaluator models for rankings",
            len(evaluators),
        )

        stage2_results, label_to_model = await stage2_collect_rankings(
            user_query, successful_stage1, evaluators, plan
        )

        responded_evaluators = {result["model"] for result in stage2_results}
        for ranked, result in enumerate(stage2_results, start=1):
            yield {
                "event": "model_response",
                "stage": 2,
                "model": result["model"],
                "parsed_ranking": result.get("parsed_ranking", []),
                "provider": result.get("provider", "unknown"),
                "progress": f"{ranked}/{len(evaluators)}",
            }

        for evaluator in evaluators:
            if evaluator not in responded_evaluators:
                yield {
                    "event": "model_failed",
                    "stage": 2,
                    "model": evaluator,
                    "progress": f"{len(stage2_results)}/{len(evaluators)}",
                }

        aggregate_rankings = calculate_aggregate_rankings(
            stage2_results, label_to_model
        )
        yield {
            "event": "stage_complete",
            "stage": 2,
            "count": f"{len(stage2_results)}/{len(evaluators)}",
        }

    # --- Stage 3: Chairman synthesis ---
    yield {"event": "stage_start", "stage": 3, "chairman": chairman}
    logger.info("Stream Stage 3: chairman %s synthesizing", chairman)

    stage3_result = await stage3_synthesize_final(
        user_query, successful_stage1, stage2_results, chairman, plan
    )

    stage1_results = _order_stage1_results(stage1_results, plan)
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
        "execution_plan": execution_plan_metadata(plan),
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
