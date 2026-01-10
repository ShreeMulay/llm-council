from fastapi import HTTPException, APIRouter
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime
import signal
import multiprocessing
from contextlib import redirect_stdout, redirect_stderr
from io import StringIO

router = APIRouter(prefix="/api", tags=["execute"])


class ExecuteRequest(BaseModel):
    provider: str = Field(..., description="Provider name (e.g., 'openrouter', 'cerebras', 'fireworks')")
    model: str = Field(..., description="Model ID (e.g., 'anthropic/claude-3-haiku')")
    code: str = Field(..., description="Python code to execute")
    timeout: int = Field(default=30, ge=1, le=300, description="Timeout in seconds (1-300)")

    @field_validator('provider')
    @classmethod
    def validate_provider(cls, v: str) -> str:
        valid_providers = ['openrouter', 'cerebras', 'fireworks']
        if v.lower() not in valid_providers:
            raise ValueError(f'Invalid provider. Must be one of: {", ".join(valid_providers)}')
        return v.lower()


class Node(BaseModel):
    id: str
    type: str


class Edge(BaseModel):
    source: str
    target: str
    condition: Optional[str] = None


class GraphStructure(BaseModel):
    nodes: list[Node]
    edges: list[Edge]


class Metrics(BaseModel):
    provider: str
    model: str
    inputTokens: int = Field(default=0, validation_alias='input_tokens', serialization_alias='inputTokens')
    outputTokens: int = Field(default=0, validation_alias='output_tokens', serialization_alias='outputTokens')
    totalTokens: int = Field(default=0, validation_alias='total_tokens', serialization_alias='totalTokens')
    durationMs: int = Field(default=0, validation_alias='duration_ms', serialization_alias='durationMs')
    tokensPerSecond: float = Field(default=0.0, validation_alias='tokens_per_second', serialization_alias='tokensPerSecond')
    costUsd: float = Field(default=0.0, validation_alias='cost_usd', serialization_alias='costUsd')


class ExecuteResponse(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None
    metrics: Optional[Metrics] = None
    graphStructure: Optional[GraphStructure] = None


# Placeholder for actual LangGraph execution
# This will be implemented with actual LangGraph integration
def execute_code(
    provider: str,
    model: str,
    code: str,
    timeout: int = 30,
) -> tuple[str, Dict[str, Any], Dict[str, Any]]:
    """Execute code using LangGraph and return output, graph structure, and metrics.

    Args:
        provider: The LLM provider to use
        model: The model to use
        code: The Python code to execute
        timeout: Maximum execution time in seconds

    Returns:
        Tuple of (output, graph_structure, metrics)
    """
    # TODO: Implement actual LangGraph execution
    # For now, return mock data
    graph_structure = {
        "nodes": [{"id": "agent", "type": "llm"}],
        "edges": [],
    }

    metrics = {
        "input_tokens": 100,
        "output_tokens": 50,
        "duration_ms": 500,
    }

    return "Code executed successfully", graph_structure, metrics


# Placeholder for getting provider instance
def get_provider(provider_name: str):
    """Get provider instance by name.

    Args:
        provider_name: Name of the provider ('openrouter', 'cerebras', 'fireworks')

    Returns:
        Provider instance
    """
    # TODO: Implement actual provider retrieval
    return None


def calculate_metrics(
    input_tokens: int,
    output_tokens: int,
    duration_ms: int,
    provider: str,
    model: str,
) -> Metrics:
    """Calculate execution metrics including cost.

    Args:
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        duration_ms: Execution duration in milliseconds
        provider: Provider name
        model: Model ID

    Returns:
        Metrics object with calculated values
    """
    total_tokens = input_tokens + output_tokens
    duration_seconds = duration_ms / 1000.0
    tokens_per_second = total_tokens / duration_seconds if duration_seconds > 0 else 0

    # For now, use default pricing (will be retrieved from provider in actual implementation)
    input_price_per_million = 0.15  # Default estimate
    output_price_per_million = 0.60  # Default estimate

    cost_usd = (input_tokens * input_price_per_million + output_tokens * output_price_per_million) / 1_000_000

    return Metrics(
        provider=provider,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        total_tokens=total_tokens,
        duration_ms=duration_ms,
        tokens_per_second=tokens_per_second,
        cost_usd=cost_usd,
    )


@router.post("/execute", response_model=ExecuteResponse)
async def execute(request: ExecuteRequest):
    """Execute code using LangGraph and return results with metrics.

    Args:
        request: Execution request with provider, model, code, and timeout

    Returns:
        ExecuteResponse with output, error (if any), metrics, and graph structure
    """
    try:
        # Execute code with timeout
        timeout_value = request.timeout if request.timeout is not None else 30
        output, graph_structure, raw_metrics = execute_code(
            provider=request.provider,
            model=request.model,
            code=request.code,
            timeout=timeout_value,
        )

        # Calculate full metrics including cost
        metrics = calculate_metrics(
            input_tokens=raw_metrics.get("input_tokens", 0),
            output_tokens=raw_metrics.get("output_tokens", 0),
            duration_ms=raw_metrics.get("duration_ms", 0),
            provider=request.provider,
            model=request.model,
        )

        return ExecuteResponse(
            success=True,
            output=output,
            metrics=metrics,
            graphStructure=graph_structure,
        )

    except Exception as e:
        return ExecuteResponse(
            success=False,
            output="",
            error=str(e),
        )