"""
Prompt template for weekend weather one-liner generation.

Uses Gemini 3.1 Flash-Lite for a fast, fun, personal weather quip.
These are shown on weekend cards to replace the clinical tone.
"""


def build_prompt(temp_f: int, description: str, day_name: str) -> str:
    return f"""<task>
Generate a short, fun, personal one-liner about the weather for a weekend day.
This is for a medical office team's morning message — keep it light and upbeat.
</task>

<weather>
Day: {day_name}
Temperature: {temp_f}°F
Conditions: {description}
</weather>

<rules>
- ONE sentence only, max 15 words
- Fun, personal tone — this is their day off
- Reference the actual weather conditions
- Can suggest weekend activities (cookout, stay cozy, get outside, etc.)
- NO clinical/medical references
- NO emojis — those are added by the card builder
- NO quotes around your response
</rules>

<examples>
- Perfect weather for a cookout!
- Bundle up — it's a great day for hot cocoa and a movie.
- Gorgeous day to hit the lake or fire up the grill.
- Rain means guilt-free couch time — enjoy it!
- Sweater weather at its finest.
</examples>

Return a JSON object with a single field "quip" containing your one-liner."""
