# Deliberation Spec: 9-Model Optimized Council

## Requirement: Stage 1 — Collect Responses

The system SHALL query all configured council models in parallel and cache responses.

### Scenario: Full 9-Model Collection

- **GIVEN** 9 models configured
- **WHEN** user submits query
- **THEN** it makes parallel async calls to all 9 models
- **AND** each call has a per-model timeout of 180 seconds
- **AND** responses are cached by (model_id, prompt_hash) for 1 hour
- **AND** if a model fails, it continues with remaining models
- **AND** it proceeds to Stage 2 if at least 5 models responded

### Scenario: Compact Mode Collection

- **GIVEN** `compact=true` flag
- **WHEN** user submits query
- **THEN** it uses only the core 5 models
- **AND** proceeds with standard Stage 2 and Stage 3

## Requirement: Stage 2 — Evaluate (Evaluator Subset)

The system SHALL use only 3 evaluator models to rank responses, with self-exclusion and randomized order.

### Scenario: Evaluator Selection

- **GIVEN** 9 models responded in Stage 1
- **WHEN** Stage 2 begins
- **THEN** it selects the top 3 evaluators from the priority list that are present in the active council
- **AND** excludes any evaluator that is not in the active council
- **AND** if fewer than 3 evaluators are available, uses all available

### Scenario: Self-Exclusion

- **GIVEN** GPT-5.5 is both a Stage 1 responder and a Stage 2 evaluator
- **WHEN** GPT-5.5 evaluates responses
- **THEN** its own Stage 1 response is excluded from the evaluation prompt
- **AND** it ranks only the other 8 responses

### Scenario: Randomized Order Per Evaluator

- **GIVEN** 9 responses to evaluate
- **WHEN** each evaluator receives the evaluation prompt
- **THEN** the response order is randomized differently for each evaluator
- **AND** the same response may appear in position 3 for Opus and position 7 for DeepSeek
- **AND** this reduces position bias (lost-in-the-middle effect)

### Scenario: Tiered Truncation for Evaluators

- **GIVEN** 9 responses of varying lengths
- **WHEN** building the evaluation prompt
- **THEN** strong model responses are truncated to 8K chars
- **AND** medium model responses to 10K chars
- **AND** weak model responses to 12K chars
- **AND** truncation occurs at paragraph boundaries with `[TRUNCATED]` marker

## Requirement: Stage 3 — Curate + Synthesize

The system SHALL curate the top 5 responses for the chairman, including a wildcard slot.

### Scenario: Response Curation

- **GIVEN** 9 Stage 1 responses and 3 Stage 2 evaluations
- **WHEN** preparing Stage 3 context
- **THEN** it selects:
  - Top 3 responses by aggregate evaluator score
  - 1 wildcard: response with highest evaluator disagreement (Kendall's W < 0.5)
  - 1 diversity pick: best response from a model not in top 3
- **AND** compresses each evaluation to 2-3 sentence summary
- **AND** the chairman receives 5 responses + 3 summaries + original query

### Scenario: Chairman Synthesis

- **GIVEN** 5 curated responses and 3 evaluation summaries
- **WHEN** the chairman synthesizes
- **THEN** it produces a comprehensive final answer
- **AND** considers evaluator consensus and dissent
- **AND** includes confidence signal when evaluators disagreed

## Requirement: Failure Handling

The system SHALL handle partial failures gracefully at every stage.

### Scenario: Stage 1 Partial Failure

- **GIVEN** 2 of 9 models fail in Stage 1
- **WHEN** Stage 1 completes
- **THEN** it proceeds with 7 responses
- **AND** Stage 2 evaluators see 7 responses instead of 9
- **AND** curation selects top 3 + wildcard + diversity from 7

### Scenario: Stage 2 Evaluator Failure

- **GIVEN** 1 of 3 evaluators fails
- **WHEN** Stage 2 completes
- **THEN** it proceeds with 2 evaluator rankings
- **AND** curation uses available rankings
- **AND** if all evaluators fail, falls back to top-5 by response length (heuristic)

### Scenario: Chairman Failure

- **GIVEN** the chairman model fails
- **WHEN** Stage 3 is attempted
- **THEN** it retries once with OpenRouter fallback
- **AND** if still failing, returns the top-ranked Stage 1 response as final answer
- **AND** includes error metadata

## Technical Implementation

### Evaluator Selection

```python
def get_evaluator_models(council_models: List[str]) -> List[str]:
    """Select top 3 evaluators from priority list present in council."""
    available = [m for m in EVALUATOR_PRIORITY if m in council_models]
    return available[:3]
```

### Self-Exclusion

```python
def build_evaluation_prompt(
    evaluator_model: str,
    responses: List[Dict],
    original_query: str
) -> str:
    """Build prompt excluding evaluator's own response."""
    filtered = [r for r in responses if r["model"] != evaluator_model]
    # Randomize order
    shuffled = random.sample(filtered, len(filtered))
    # ... build prompt
```

### Curation Logic

```python
def select_top_responses(
    stage1_results: List[Dict],
    stage2_results: List[Dict],
    n_top: int = 3,
    n_wildcard: int = 1,
    n_diversity: int = 1,
) -> List[Dict]:
    """Select curated responses for chairman."""
    # Top N by aggregate score
    top = get_top_by_score(stage1_results, stage2_results, n_top)
    
    # Wildcard: highest disagreement
    wildcard = get_highest_disagreement(stage1_results, stage2_results)
    
    # Diversity: best from model not in top
    diversity = get_diversity_pick(stage1_results, stage2_results, exclude_models=[r["model"] for r in top])
    
    return top + [wildcard] + [diversity]
```

### Caching

```python
# In-memory cache with TTL
stage1_cache: Dict[str, Tuple[Dict, float]] = {}  # (model+prompt_hash) -> (response, timestamp)
CACHE_TTL_SECONDS = 3600  # 1 hour

def get_cache_key(model_id: str, prompt: str) -> str:
    return hashlib.sha256(f"{model_id}:{prompt}".encode()).hexdigest()[:16]
```
