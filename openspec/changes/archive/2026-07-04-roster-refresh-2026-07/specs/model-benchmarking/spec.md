# Delta Spec: July 2026 Benchmark Gate

## MODIFIED Requirements

### Requirement: Benchmark variants SHALL include July 2026 challengers and baselines

The benchmark harness SHALL define July 2026 comparison variants independently from the production council roster and independently from the existing June reasoning-ladder default variants.

#### Scenario: July roster-refresh benchmark variants

GIVEN the July 2026 roster-refresh variant set is selected
WHEN the harness builds variant specs
THEN variants SHALL include `meta-llama/llama-4-maverick` as incumbent baseline
AND `minimax/minimax-m3` as replacement candidate
AND `fireworks/kimi-k2.6` as incumbent baseline
AND `fireworks/kimi-k2.7-code` as replacement candidate
AND `z-ai/glm-5.2` as production GLM baseline
AND `fireworks/glm-5.2` with xHigh reasoning as GLM challenger
AND `anthropic/claude-fable-5` as challenger-only Anthropic comparand
AND SHALL NOT implicitly include unrelated June reasoning-ladder variants unless a separate variant set is selected.

#### Scenario: Fireworks Kimi K2.7 provider mapping

GIVEN the model ID `fireworks/kimi-k2.7-code`
WHEN the Fireworks client builds a request
THEN it SHALL use the Fireworks account model slug for Kimi K2.7 Code
AND it SHALL preserve benchmark purity by not silently falling back inside the benchmark harness.

#### Scenario: Fireworks benchmark variants require explicit model mapping

GIVEN a benchmark variant has provider `fireworks`
WHEN the July variant set is validated
THEN the variant model ID SHALL have an explicit `FIREWORKS_MODEL_MAP` entry
AND unknown Fireworks model IDs SHALL fail before live benchmark spend.

### Requirement: Live benchmark gate SHALL enforce budget and purity

The July 2026 live benchmark SHALL be PHI-free, budget-capped, and no-fallback unless explicitly configured otherwise.

#### Scenario: Spend cap enforcement

GIVEN the operator sets a $25 or lower budget cap
WHEN live benchmark execution begins
THEN the harness SHALL stop additional paid calls before exceeding the cap
AND SHALL record cap status in benchmark artifacts.

#### Scenario: No silent fallback

GIVEN a benchmarked OpenRouter model fails or rejects a setting
WHEN the benchmark call is recorded
THEN the result SHALL record an error or blocked status for that variant
AND SHALL NOT replace the output with another provider/model unless benchmark fallback is explicitly enabled.

#### Scenario: Independent judge is not a candidate

GIVEN an independent judge pass scores July 2026 benchmark outputs
WHEN judge configuration is resolved
THEN the judge model SHOULD be `google/gemini-3.1-pro-preview`
AND the judge SHALL NOT be one of the model variants being judged for that run.

### Requirement: Promotion thresholds SHALL be pre-registered

The July benchmark gate SHALL record decision thresholds before live spend so roster decisions are not made post hoc.

#### Scenario: July promotion threshold metadata

GIVEN the July 2026 roster-refresh benchmark run is configured
WHEN run configuration artifacts are written
THEN they SHALL include pre-registered thresholds for MiniMax-vs-Llama, Kimi-K2.7-vs-K2.6, and GLM-Fireworks-vs-z-ai decisions
AND these thresholds SHALL match the approved OpenSpec proposal.
