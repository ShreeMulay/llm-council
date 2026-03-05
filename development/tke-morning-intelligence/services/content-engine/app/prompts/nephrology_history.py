"""Prompt template for the On This Day in Nephrology/Medical History section."""


def build_prompt(
    month_name: str,
    day_of_month: int,
    search_context: str | None,
    recent_events: list[str],
) -> str:
    """Build the nephrology history 'On This Day' prompt.

    Args:
        month_name: Full name of the current month (e.g., "March").
        day_of_month: Day number (e.g., 4).
        search_context: Optional pre-fetched search results about events on this date.
        recent_events: List of recently used events to avoid repetition.

    Returns:
        XML-tagged prompt string for Vertex AI Gemini.
    """
    search_block = ""
    if search_context:
        search_block = f"""
<search_context>
The following information was retrieved from a web search about medical and nephrology
events on or around this date. Use this as a starting point but verify accuracy:
{search_context}
</search_context>"""

    recent_block = ""
    if recent_events:
        events_list = "\n".join(f"  <event>{event}</event>" for event in recent_events)
        recent_block = f"""
<recently_used_events>
Do NOT repeat any of these events:
{events_list}
</recently_used_events>"""

    return f"""<system>
You are a medical historian specializing in nephrology and kidney medicine for
The Kidney Experts (TKE) morning briefing. Your job is to find a fascinating
"On This Day" event from medical or nephrology history.

TKE's BHAG: "Ridding the World of the Need for Dialysis!"
</system>

<today_date>
  <month>{month_name}</month>
  <day>{day_of_month}</day>
</today_date>
{search_block}
{recent_block}
<instructions>
1. Identify a real historical event from medical or nephrology history that occurred
   in {month_name} (ideally on or very near {month_name} {day_of_month}).
2. Prioritize nephrology-specific events: dialysis milestones, transplant firsts,
   kidney disease discoveries, notable nephrologists' contributions.
3. If no nephrology event exists for this date, use a broader medical/scientific event
   that connects to kidney care or healthcare systems.
4. Include the specific year, month, and day the event occurred.
5. Explain why this event matters to modern nephrology practice.
6. Add a fun or surprising fact related to the event.
</instructions>

<rules>
- CRITICAL: The event MUST have occurred in {month_name}. Do NOT use events from other months.
- The year, month, and day must be historically accurate.
- The month and day fields must be integers (month 1-12, day 1-31).
- Prefer nephrology-specific events over general medical history.
- The significance should connect to modern nephrology practice or TKE's mission.
- The funFact should be genuinely surprising or little-known.
- Include specific names, dates, and places — not vague references.
- If using search_context, verify the information is consistent and plausible.
  Do not blindly repeat search results that seem inaccurate.
</rules>

<output_schema>
{{
  "event": "string — concise description of the historical event",
  "year": "string — the 4-digit year the event occurred (e.g. '1954')",
  "month": "integer — the month the event occurred (1-12)",
  "day": "integer — the day of month the event occurred (1-31)",
  "emoji": "string — single emoji representing the event",
  "significance": "string — why this matters to modern nephrology (1-2 sentences)",
  "funFact": "string — a surprising or little-known related fact"
}}
</output_schema>

Return ONLY valid JSON matching the schema. No markdown code blocks."""
