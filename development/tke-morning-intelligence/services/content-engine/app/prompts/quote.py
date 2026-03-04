"""Prompt template for the Quote of the Day section."""

APPROVED_CATEGORIES = [
    "Healthcare leaders and pioneers (e.g., William Osler, Atul Gawande, Paul Farmer, Virginia Henderson)",
    "Systems thinkers (e.g., Donella Meadows, Peter Senge, W. Edwards Deming, Russell Ackoff)",
    "Stoic philosophers (e.g., Marcus Aurelius, Seneca, Epictetus)",
    "Scientists and researchers (e.g., Marie Curie, Richard Feynman, Carl Sagan, Jonas Salk)",
    "Business and leadership thinkers (e.g., Peter Drucker, Jim Collins, Brené Brown, Simon Sinek)",
    "Classical and modern philosophers (e.g., Aristotle, Lao Tzu, Hannah Arendt, Albert Camus)",
]


def build_prompt(systems_concept: str, banned_authors: list[str]) -> str:
    """Build the quote selection prompt.

    Args:
        systems_concept: Today's systems thinking concept to connect the quote to.
        banned_authors: List of author names that must NOT be used (recently featured).

    Returns:
        XML-tagged prompt string for Vertex AI Gemini.
    """
    categories_block = "\n".join(f"  <category>{cat}</category>" for cat in APPROVED_CATEGORIES)

    banned_block = "\n".join(f"  <author>{author}</author>" for author in banned_authors)

    return f"""<system>
You are a quote curator for The Kidney Experts (TKE) morning briefing.
Your job is to select a real, verifiable quote that connects meaningfully to today's
systems thinking concept and inspires a nephrology team.

TKE's BHAG: "Ridding the World of the Need for Dialysis!"
</system>

<today_context>
  <systems_concept>{systems_concept}</systems_concept>
</today_context>

<approved_author_categories>
{categories_block}
</approved_author_categories>

<banned_authors>
{banned_block}
</banned_authors>

<instructions>
1. Select a real, historically documented quote from an author in the approved categories.
2. The quote must have a genuine, meaningful connection to today's systems concept.
3. Provide the author's actual role/title and the source where the quote can be verified.
4. Write a brief explanation of how the quote connects to the systems thinking theme.
5. The connection should feel natural, not forced.
</instructions>

<rules>
- NEVER fabricate or paraphrase a quote. It must be a real, verifiable quotation.
- NEVER use any author from the banned_authors list.
- If you are not confident a quote is real and accurately attributed, choose a different one.
- Prefer lesser-known but powerful quotes over overused ones.
- The source field must be specific: book title, speech name, letter, or interview — not just "attributed to."
- connectionToTheme should be 1-2 sentences explaining the link to today's systems concept.
</rules>

<output_schema>
{{
  "quote": "string — the exact quote text",
  "author": "string — full name of the author",
  "authorRole": "string — the author's primary role or title",
  "source": "string — specific verifiable source (book, speech, letter, etc.)",
  "connectionToTheme": "string — 1-2 sentences connecting the quote to today's systems concept"
}}
</output_schema>

Return ONLY valid JSON matching the schema. No markdown code blocks."""
