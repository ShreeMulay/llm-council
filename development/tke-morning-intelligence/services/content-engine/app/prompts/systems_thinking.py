"""Prompt template for the Systems Thinking Coach section."""

CONCEPTS = {
    "Feedback Loops": "Circular chains of cause and effect where outputs feed back as inputs. Reinforcing loops amplify change; balancing loops stabilize systems.",
    "Second-Order Effects": "The indirect consequences that follow from the direct (first-order) effects of a decision. Often more impactful and harder to predict.",
    "Leverage Points": "Places in a system where a small change can produce large, lasting improvements. Identified by Donella Meadows as the most powerful intervention sites.",
    "Stock and Flow": "Stocks are accumulations (things you can count at a point in time); flows are the rates that change stocks. Understanding both reveals system dynamics.",
    "Emergence": "Complex behaviors and properties that arise from simple interactions between parts of a system, not predictable from any single component alone.",
    "The Iceberg Model": "Most of a system is invisible. Events sit above the waterline; patterns, structures, and mental models lie beneath and drive what we see.",
    "Constraint Theory": "Every system has at least one constraint (bottleneck) that limits its overall throughput. Improving anything other than the constraint is an illusion of progress.",
    "Pareto Principle": "Roughly 80% of effects come from 20% of causes. Identifying the vital few inputs that drive the majority of outcomes focuses effort where it matters most.",
    "Delays in Systems": "Time lags between an action and its observable effect. Delays cause oscillation, overshoot, and poor decision-making when ignored.",
    "Resilience vs. Efficiency": "Optimizing purely for efficiency removes redundancy and slack, making systems brittle. Resilience requires deliberate buffers and diversity.",
    "Homeostasis": "A system's tendency to maintain internal stability through self-regulating feedback mechanisms, resisting external disturbances.",
    "Unintended Consequences": "Outcomes that were not foreseen or intended by a purposeful action. Often arise from ignoring system complexity and interconnections.",
    "Goodhart's Law": "When a measure becomes a target, it ceases to be a good measure. People optimize for the metric rather than the underlying goal.",
    "The OODA Loop": "Observe-Orient-Decide-Act. A rapid decision cycle that emphasizes speed of iteration and updating mental models with new information.",
    "Chesterton's Fence": "Before removing something that seems pointless, first understand why it was put there. Reforms should respect existing system logic before changing it.",
    "Inversion": "Instead of asking how to achieve success, ask what would guarantee failure—then avoid those things. Solving problems backward reveals hidden risks.",
    "First Principles": "Breaking a problem down to its most fundamental truths and reasoning up from there, rather than reasoning by analogy or convention.",
    "The Map is Not the Territory": "Models, metrics, and dashboards are simplifications of reality. Confusing the representation with the thing itself leads to blind spots.",
    "Occam's Razor": "Among competing explanations, the simplest one that accounts for all the evidence is most likely correct. Avoid unnecessary complexity.",
    "Antifragility": "Beyond resilience: some systems actually gain from disorder, stress, and volatility. Designed correctly, shocks make them stronger.",
}


def build_prompt(concept: str, theme: dict | None = None) -> str:
    """Build the systems thinking coach prompt.

    Args:
        concept: The systems thinking concept to teach today.
        theme: Optional theme context with keys like 'name', 'description'.

    Returns:
        XML-tagged prompt string for Vertex AI Gemini.
    """
    concept_definitions = "\n".join(
        f'  <concept name="{name}">{definition}</concept>' for name, definition in CONCEPTS.items()
    )

    theme_block = ""
    if theme:
        theme_block = f"""
<theme>
  <name>{theme.get("name", "")}</name>
  <description>{theme.get("description", "")}</description>
</theme>"""

    return f"""<system>
You are a systems thinking coach for a nephrology practice called The Kidney Experts (TKE).
Your mission is to make one systems thinking concept accessible, practical, and memorable
for a busy healthcare team each morning.

TKE's BHAG: "Ridding the World of the Need for Dialysis!"
TKE's operating principle: "What happens to one, happens to all." (Shared Fate)
</system>

<concept_library>
{concept_definitions}
</concept_library>

<today_assignment>
  <concept>{concept}</concept>
</today_assignment>
{theme_block}
<instructions>
1. Select the assigned concept from the concept library above.
2. Write a concise, jargon-light explanation of the core idea (2-3 sentences max).
3. Create a nephrology-specific example that connects the concept to daily clinical or operational reality.
4. Pose a practical challenge the team can think about today.
5. End with a reflection question that deepens understanding.
</instructions>

<rules>
- The nephrologyExample MUST be specific to CKD, dialysis, transplant, or clinic operations. Generic healthcare examples are NOT acceptable.
- Keep language warm, direct, and accessible to non-clinical staff too.
- The emoji should visually represent the concept.
- todayChallenge should be actionable within a single workday.
- reflectionQuestion should provoke genuine thought, not have an obvious answer.
</rules>

<output_schema>
{{
  "concept": "string — the systems thinking concept name",
  "emoji": "string — single emoji representing the concept",
  "coreIdea": "string — 2-3 sentence plain-language explanation",
  "nephrologyExample": "string — concrete example from CKD/dialysis/transplant/clinic operations",
  "todayChallenge": "string — one actionable thing the team can do or observe today",
  "reflectionQuestion": "string — a thought-provoking question to sit with"
}}
</output_schema>

Return ONLY valid JSON matching the schema. No markdown code blocks."""
