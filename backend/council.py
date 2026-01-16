"""3-stage LLM Council orchestration with multi-provider support."""

import re
import asyncio
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict

from .config import (
    COUNCIL_MODELS,
    CHAIRMAN_MODEL,
    is_cerebras_model,
)
from .openrouter import query_model as query_openrouter_model
from .openrouter import query_models_parallel as query_openrouter_models_parallel
from .cerebras import query_cerebras_model, query_cerebras_models_parallel
from .anthropic_client import call_anthropic, is_anthropic_model


async def query_single_model(
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via the appropriate provider.
    
    Args:
        model_id: Model identifier
        messages: Messages to send
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
    
    Returns:
        Response dict or None on error
    """
    if is_cerebras_model(model_id):
        return await query_cerebras_model(model_id, messages, max_tokens, temperature)
    elif is_anthropic_model(model_id):
        try:
            prompt = messages[-1].get("content", "") if messages else ""
            result = await call_anthropic(model_id, prompt, max_tokens)
            return {
                "content": result.get("response", ""),
                "usage": result.get("usage", {}),
                "provider": "anthropic"
            }
        except Exception as e:
            print(f"Anthropic API error for {model_id}: {e}")
            return None
    else:
        return await query_openrouter_model(model_id, messages, max_tokens, temperature)


async def query_anthropic_single(model_id: str, messages: List[Dict[str, str]], max_tokens: int) -> Tuple[str, Optional[Dict[str, Any]]]:
    """Query single Anthropic model and return (model_id, result) tuple."""
    try:
        prompt = messages[-1].get("content", "") if messages else ""
        result = await call_anthropic(model_id, prompt, max_tokens)
        return model_id, {
            "content": result.get("response", ""),
            "usage": result.get("usage", {}),
            "provider": "anthropic"
        }
    except Exception as e:
        print(f"Anthropic API error for {model_id}: {e}")
        return model_id, None


async def query_anthropic_models_parallel(
    model_ids: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7
) -> Dict[str, Optional[Dict[str, Any]]]:
    """Query multiple Anthropic models in parallel."""
    tasks = [query_anthropic_single(m, messages, max_tokens) for m in model_ids]
    results_list = await asyncio.gather(*tasks)
    return dict(results_list)


async def query_models_parallel(
    model_ids: List[str],
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.7
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models via their respective providers in parallel.
    
    Args:
        model_ids: List of model IDs
        messages: Messages to send
        max_tokens: Maximum output tokens
        temperature: Sampling temperature
    
    Returns:
        Dict mapping model_id to response (or None on error)
    """
    cerebras_ids = [m for m in model_ids if is_cerebras_model(m)]
    anthropic_ids = [m for m in model_ids if is_anthropic_model(m)]
    openrouter_ids = [m for m in model_ids if not is_cerebras_model(m) and not is_anthropic_model(m)]
    
    results = {}
    tasks = []
    
    if cerebras_ids:
        tasks.append(query_cerebras_models_parallel(cerebras_ids, messages, max_tokens, temperature))
    
    if anthropic_ids:
        tasks.append(query_anthropic_models_parallel(anthropic_ids, messages, max_tokens, temperature))
    
    if openrouter_ids:
        tasks.append(query_openrouter_models_parallel(openrouter_ids, messages, max_tokens, temperature))
    
    if tasks:
        provider_results = await asyncio.gather(*tasks)
        for pr in provider_results:
            results.update(pr)
    
    return results


async def stage1_collect_responses(
    user_query: str,
    council_models: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Stage 1: Collect individual responses from all council models.

    Args:
        user_query: The user's question
        council_models: Optional override for council models

    Returns:
        List of dicts with 'model', 'response', 'usage' keys
    """
    models = council_models or COUNCIL_MODELS
    messages = [{"role": "user", "content": user_query}]

    # Query all models in parallel
    responses = await query_models_parallel(models, messages)

    # Format results
    stage1_results = []
    for model, response in responses.items():
        if response is not None:  # Only include successful responses
            stage1_results.append({
                "model": model,
                "response": response.get('content', ''),
                "usage": response.get('usage', {}),
                "provider": response.get('provider', 'unknown')
            })

    return stage1_results


async def stage2_collect_rankings(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    council_models: Optional[List[str]] = None
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
    
    # Create anonymized labels for responses (Response A, Response B, etc.)
    labels = [chr(65 + i) for i in range(len(stage1_results))]  # A, B, C, ...

    # Create mapping from label to model name
    label_to_model = {
        f"Response {label}": result['model']
        for label, result in zip(labels, stage1_results)
    }

    # Build the ranking prompt
    responses_text = "\n\n".join([
        f"Response {label}:\n{result['response']}"
        for label, result in zip(labels, stage1_results)
    ])

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

    # Get rankings from all council models in parallel
    responses = await query_models_parallel(models, messages)

    # Format results
    stage2_results = []
    for model, response in responses.items():
        if response is not None:
            full_text = response.get('content', '')
            parsed = parse_ranking_from_text(full_text)
            stage2_results.append({
                "model": model,
                "ranking": full_text,
                "parsed_ranking": parsed,
                "usage": response.get('usage', {}),
                "provider": response.get('provider', 'unknown')
            })

    return stage2_results, label_to_model


async def stage3_synthesize_final(
    user_query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    chairman_model: Optional[str] = None
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
    
    # Build comprehensive context for chairman
    stage1_text = "\n\n".join([
        f"Model: {result['model']}\nResponse: {result['response']}"
        for result in stage1_results
    ])

    # Only include stage2 text if we have rankings
    stage2_text = ""
    if stage2_results:
        stage2_text = "\n\nSTAGE 2 - Peer Rankings:\n" + "\n\n".join([
            f"Model: {result['model']}\nRanking: {result['ranking']}"
            for result in stage2_results
        ])

    chairman_prompt = f"""You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question{", and then ranked each other's responses" if stage2_results else ""}.

Original Question: {user_query}

STAGE 1 - Individual Responses:
{stage1_text}
{stage2_text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
{f"- The peer rankings and what they reveal about response quality" if stage2_results else ""}
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:"""

    messages = [{"role": "user", "content": chairman_prompt}]

    # Query the chairman model
    response = await query_single_model(chairman, messages)

    if response is None:
        # Fallback if chairman fails
        return {
            "model": chairman,
            "response": "Error: Unable to generate final synthesis.",
            "usage": {}
        }

    return {
        "model": chairman,
        "response": response.get('content', ''),
        "usage": response.get('usage', {}),
        "provider": response.get('provider', 'unknown')
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
            numbered_matches = re.findall(r'\d+\.\s*Response [A-Z]', ranking_section)
            if numbered_matches:
                # Extract just the "Response X" part
                result = []
                for m in numbered_matches:
                    match = re.search(r'Response [A-Z]', m)
                    if match:
                        result.append(match.group())
                return result

            # Fallback: Extract all "Response X" patterns in order
            matches = re.findall(r'Response [A-Z]', ranking_section)
            return matches

    # Fallback: try to find any "Response X" patterns in order
    matches = re.findall(r'Response [A-Z]', ranking_text)
    return matches


def calculate_aggregate_rankings(
    stage2_results: List[Dict[str, Any]],
    label_to_model: Dict[str, str]
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
        ranking_text = ranking['ranking']

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
            aggregate.append({
                "model": model,
                "average_rank": round(avg_rank, 2),
                "rankings_count": len(positions)
            })

    # Sort by average rank (lower is better)
    aggregate.sort(key=lambda x: x['average_rank'])

    return aggregate


async def run_full_council(
    user_query: str,
    final_only: bool = False,
    council_models: Optional[List[str]] = None,
    chairman_model: Optional[str] = None
) -> Tuple[List, List, Dict, Dict]:
    """
    Run the complete 3-stage council process.

    Args:
        user_query: The user's question
        final_only: If True, skip Stage 2 (peer review) for faster results
        council_models: Optional override for council models
        chairman_model: Optional override for chairman model

    Returns:
        Tuple of (stage1_results, stage2_results, stage3_result, metadata)
    """
    # Stage 1: Collect individual responses
    stage1_results = await stage1_collect_responses(user_query, council_models)

    # If no models responded successfully, return error
    if not stage1_results:
        return [], [], {
            "model": chairman_model or CHAIRMAN_MODEL,
            "response": "All models failed to respond. Please try again."
        }, {}

    if final_only:
        # Skip Stage 2, just synthesize from Stage 1
        stage3_result = await stage3_synthesize_final(
            user_query, stage1_results, [], chairman_model
        )
        metadata = {
            "aggregate_rankings": [],
            "label_to_model": {},
            "final_only": True
        }
        return stage1_results, [], stage3_result, metadata

    # Stage 2: Collect rankings
    stage2_results, label_to_model = await stage2_collect_rankings(
        user_query, stage1_results, council_models
    )

    # Calculate aggregate rankings
    aggregate_rankings = calculate_aggregate_rankings(stage2_results, label_to_model)

    # Stage 3: Synthesize final answer
    stage3_result = await stage3_synthesize_final(
        user_query,
        stage1_results,
        stage2_results,
        chairman_model
    )

    # Prepare metadata
    metadata = {
        "label_to_model": label_to_model,
        "aggregate_rankings": aggregate_rankings,
        "final_only": False
    }

    return stage1_results, stage2_results, stage3_result, metadata


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

    # Use a fast model for title generation
    response = await query_single_model("google/gemini-2.0-flash-exp", messages, max_tokens=50)

    if response is None:
        # Fallback to a generic title
        return "New Conversation"

    title = response.get('content', 'New Conversation').strip()

    # Clean up the title - remove quotes, limit length
    title = title.strip('"\'')

    # Truncate if too long
    if len(title) > 50:
        title = title[:47] + "..."

    return title
