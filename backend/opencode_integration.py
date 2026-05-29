"""OpenCode integration: /council command formatter and MCP tool support."""

import time
from typing import Any

from .config import CHAIRMAN_MODEL, COUNCIL_MODELS, resolve_model_alias
from .council import run_full_council
from .tool_context import augment_query_with_tool_context


def format_council_markdown(
    query: str,
    stage1_results: list[dict[str, Any]],
    stage2_results: list[dict[str, Any]],
    stage3_result: dict[str, Any],
    metadata: dict[str, Any],
    include_details: bool = True,
    elapsed_seconds: float = 0.0,
) -> str:
    """
    Format council results as structured markdown for OpenCode.

    Args:
        query: The original user query
        stage1_results: Stage 1 responses
        stage2_results: Stage 2 rankings (may be empty if final_only=True)
        stage3_result: Stage 3 chairman synthesis
        metadata: Aggregate metadata (rankings, label_to_model)
        include_details: If False, hide individual Stage 1 responses
        elapsed_seconds: Total time taken for deliberation

    Returns:
        Formatted markdown string
    """
    lines = []

    lines.append("## LLM Council Deliberation\n")
    lines.append(f"**Query**: {query}\n")
    lines.append("---\n")

    # Stage 1: Individual Responses
    if include_details and stage1_results:
        lines.append("### Stage 1: Individual Responses\n")
        for result in stage1_results:
            model = result.get("model", "Unknown")
            content = result.get("response", "No response")
            usage = result.get("usage", {})
            tokens = usage.get("total_tokens", "N/A")
            provider = result.get("provider", "unknown")

            lines.append("<details>")
            lines.append(
                f"<summary><strong>{model}</strong> ({provider}, {tokens} tokens)</summary>\n"
            )
            lines.append(f"{content}\n")
            lines.append("</details>\n")

    # Stage 2: Peer Rankings
    if stage2_results and include_details:
        lines.append("### Stage 2: Peer Rankings\n")

        # Ranking table
        if metadata.get("aggregate_rankings"):
            lines.append("| Rank | Model | Score | Votes |")
            lines.append("|------|-------|-------|-------|")
            medals = ["1", "2", "3"]
            for i, ranking in enumerate(metadata["aggregate_rankings"]):
                rank_display = medals[i] if i < 3 else str(i + 1)
                lines.append(
                    f"| {rank_display} | {ranking['model']} | {ranking['average_rank']} | {ranking['rankings_count']} |"
                )
            lines.append("")

        # Expandable evaluations
        lines.append("<details>")
        lines.append("<summary><strong>Peer Evaluation Details</strong></summary>\n")
        for ranking in stage2_results:
            model = ranking.get("model", "Unknown")
            evaluation = ranking.get("ranking", "No evaluation")
            parsed = ranking.get("parsed_ranking", [])
            lines.append(f"\n**{model}'s evaluation**:")
            lines.append(
                f"Ranking: {' > '.join(parsed) if parsed else 'Could not parse'}"
            )
            lines.append(f"\n{evaluation}\n")
        lines.append("</details>\n")

    # Stage 3: Chairman's Final Synthesis
    lines.append("### Stage 3: Chairman's Final Synthesis\n")
    chairman_model = stage3_result.get("model", "Unknown")
    lines.append(f"**Synthesized by**: {chairman_model}\n")
    lines.append(f"{stage3_result.get('response', 'No response')}\n")
    lines.append("---\n")

    # Footer with stats
    total_tokens = sum(
        r.get("usage", {}).get("total_tokens", 0)
        for r in stage1_results + stage2_results + [stage3_result]
    )
    lines.append(
        f"*Council completed in {elapsed_seconds:.1f}s using {len(stage1_results)} models | ~{total_tokens:,} tokens*"
    )

    return "\n".join(lines)


async def handle_council_command(
    query: str,
    final_only: bool = False,
    compact: bool = False,
    models: list[str] | None = None,
    chairman: str | None = None,
    include_details: bool = True,
    tool_context: bool = True,
) -> dict[str, Any]:
    """
    Handle /council command invocation.

    Args:
        query: User query
        final_only: Skip Stage 2 (peer review) for faster results
        compact: Use only 5 core models (faster/cheaper)
        models: Override council models (optional, can use aliases)
        chairman: Override chairman model (optional, can use alias)
        include_details: Show full details vs summary
        tool_context: Fetch and inject explicit URL context before deliberation

    Returns:
        Dict with markdown output, raw data, and timing info
    """
    start_time = time.time()

    # Resolve model aliases if provided
    council_models = None
    if models:
        council_models = [resolve_model_alias(m) for m in models]

    chairman_model = None
    if chairman:
        chairman_model = resolve_model_alias(chairman)

    augmented_query, tool_context_metadata = await augment_query_with_tool_context(
        query,
        enabled=tool_context,
    )

    # Run the full council deliberation
    stage1, stage2, stage3, metadata = await run_full_council(
        augmented_query,
        final_only=final_only,
        compact=compact,
        council_models=council_models,
        chairman_model=chairman_model,
    )
    metadata = {
        **metadata,
        "tool_context": tool_context_metadata,
    }

    elapsed = time.time() - start_time

    # Format as markdown
    markdown = format_council_markdown(
        query=query,
        stage1_results=stage1,
        stage2_results=stage2,
        stage3_result=stage3,
        metadata=metadata,
        include_details=include_details,
        elapsed_seconds=elapsed,
    )

    return {
        "markdown": markdown,
        "stage1": stage1,
        "stage2": stage2,
        "stage3": stage3,
        "metadata": metadata,
        "timing": {"elapsed_seconds": round(elapsed, 2)},
        "config": {
            "council_models": council_models or COUNCIL_MODELS,
            "chairman_model": chairman_model or CHAIRMAN_MODEL,
            "final_only": final_only,
            "tool_context": tool_context,
        },
    }


# MCP Tool Schema for registration
MCP_TOOL_SCHEMA = {
    "name": "llm_council",
    "description": (
        "Consult 9 LLMs (GPT-5.5, Opus 4.8, GLM-5.1, Gemini 3.1 Pro, Grok 4.3, Kimi K2.6, DeepSeek V4 Pro, Llama 4 Maverick, Qwen 3.5) for peer-reviewed answers. "
        "3-stage deliberation: individual responses -> peer rankings -> chairman synthesis (Opus 4.8). "
        "Explicit URL context is fetched and injected before deliberation by default. Use for complex questions requiring multiple perspectives."
    ),
    "inputSchema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The question or task to ask the council",
            },
            "final_only": {
                "type": "boolean",
                "description": "If true, skip peer review and return only individual + synthesized answer (faster, cheaper)",
                "default": False,
            },
            "compact": {
                "type": "boolean",
                "description": "Use only 5 core models for faster/cheaper deliberation",
                "default": False,
            },
            "include_details": {
                "type": "boolean",
                "description": "Include intermediate responses and evaluations in output",
                "default": True,
            },
            "models": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Optional model aliases/IDs to use instead of the default council",
            },
            "chairman": {
                "type": "string",
                "description": "Optional chairman model alias/ID for final synthesis",
            },
            "tool_context": {
                "type": "boolean",
                "description": "Fetch and inject explicit URL context before deliberation (default true)",
                "default": True,
            },
        },
        "required": ["query"],
    },
}


# Model aliases documentation for help text
MODEL_ALIASES_HELP = """
**Model Aliases** (for /council --models):
- `gpt` -> openai/gpt-5.5
- `opus` -> anthropic/claude-opus-4.8
- `glm` -> fireworks/glm-5.1
- `gemini` or `pro` -> google/gemini-3.1-pro-preview
- `grok` -> x-ai/grok-4.3
- `kimi` -> fireworks/kimi-k2.6
- `deepseek` -> deepseek/deepseek-v4-pro
- `llama` -> meta-llama/llama-4-maverick
- `qwen` -> qwen/qwen3.5-122b-a10b
- `sonnet` -> anthropic/claude-sonnet-4.5
- `flash` -> google/gemini-3-flash-preview

**Example**: `/council --models opus,gemini,glm What is quantum computing?`
"""
