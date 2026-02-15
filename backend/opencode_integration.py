"""OpenCode integration: /council command formatter and MCP tool support."""

import time
from typing import List, Dict, Any, Optional

from .council import run_full_council
from .config import MODEL_ALIASES, COUNCIL_MODELS, CHAIRMAN_MODEL, resolve_model_alias


def format_council_markdown(
    query: str,
    stage1_results: List[Dict[str, Any]],
    stage2_results: List[Dict[str, Any]],
    stage3_result: Dict[str, Any],
    metadata: Dict[str, Any],
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

            lines.append(f"<details>")
            lines.append(
                f"<summary><strong>{model}</strong> ({provider}, {tokens} tokens)</summary>\n"
            )
            lines.append(f"{content}\n")
            lines.append(f"</details>\n")

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
    models: Optional[List[str]] = None,
    chairman: Optional[str] = None,
    include_details: bool = True,
) -> Dict[str, Any]:
    """
    Handle /council command invocation.

    Args:
        query: User query
        final_only: Skip Stage 2 (peer review) for faster results
        models: Override council models (optional, can use aliases)
        chairman: Override chairman model (optional, can use alias)
        include_details: Show full details vs summary

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

    # Run the full council deliberation
    stage1, stage2, stage3, metadata = await run_full_council(
        query,
        final_only=final_only,
        council_models=council_models,
        chairman_model=chairman_model,
    )

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
        },
    }


# MCP Tool Schema for registration
MCP_TOOL_SCHEMA = {
    "name": "llm_council",
    "description": (
        "Consult multiple LLMs (Opus 4.6, Gemini Flash 3.0, Grok 4.1, GLM 4.7) for peer-reviewed answers. "
        "3-stage deliberation: individual responses -> peer rankings -> chairman synthesis. "
        "Use for complex questions requiring multiple perspectives or when high accuracy is critical."
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
            "include_details": {
                "type": "boolean",
                "description": "Include intermediate responses and evaluations in output",
                "default": True,
            },
        },
        "required": ["query"],
    },
}


# Model aliases documentation for help text
MODEL_ALIASES_HELP = """
**Model Aliases** (for /council --models):
- `opus` -> anthropic/claude-opus-4.6
- `gemini` or `flash` -> google/gemini-3-flash-preview
- `grok` -> x-ai/grok-4.1-fast
- `glm` -> zai-glm-4.7
- `sonnet` -> anthropic/claude-sonnet-4.5

**Example**: `/council --models opus,gemini,glm What is quantum computing?`
"""
