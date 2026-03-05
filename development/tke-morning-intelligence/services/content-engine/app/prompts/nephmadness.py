"""
Prompt template for NephMadness 2026 bracket write-ups.

Generates educational content about each region/matchup for the
Celebrations card during March 2026.
"""


def build_region_prompt(
    region_name: str,
    team_a: str,
    team_b: str,
    blurb: str,
    phase: str,
    phase_description: str,
    bracket_url: str,
) -> str:
    return f"""<task>
Generate an engaging, educational NephMadness 2026 bracket write-up for a nephrology
practice's daily morning message. This should be fun and educational — like a sports
announcer covering a medical science tournament.
</task>

<context>
NephMadness is AJKD Blog's annual March Madness-style tournament featuring nephrology
topics instead of basketball teams. Year 14. Bracket submissions open March 1-31, 2026.
Bracket URL: {bracket_url}
</context>

<region>
Region: {region_name}
Team A: {team_a}
Team B: {team_b}
Background: {blurb}
</region>

<phase>
Phase: {phase}
Instructions: {phase_description}
</phase>

<rules>
- Write 3-4 sentences of engaging educational content
- Use tournament/sports metaphors mixed with medical science
- Be enthusiastic but scientifically accurate
- For 'region' phase: introduce both teams and why this matchup matters
- For 'matchup' phase: compare evidence for each team, hint at a potential winner
- Include a call-to-action to submit brackets
- Target audience: nephrology practice staff (doctors, nurses, MAs, admin)
- Make it accessible — not everyone is a nephrologist
- NO emojis — those are added by the card builder
</rules>

Return a JSON object with these fields:
- "headline": A catchy 5-8 word headline (tournament style)
- "body": The 3-4 sentence educational write-up
- "callToAction": A short 1-sentence bracket submission reminder"""


def build_prediction_prompt(
    all_regions: list[dict],
    phase_description: str,
    bracket_url: str,
) -> str:
    regions_text = "\n".join(f"  - {r['name']}: {r['teamA']} vs {r['teamB']}" for r in all_regions)

    return f"""<task>
Generate a NephMadness 2026 cross-region prediction/analysis for a nephrology
practice's daily morning message.
</task>

<context>
NephMadness 2026 — all 8 regions:
{regions_text}
Bracket URL: {bracket_url}
</context>

<phase>
Instructions: {phase_description}
</phase>

<rules>
- Write 3-4 sentences of engaging analysis
- Use tournament/sports metaphors mixed with medical science
- Speculate on which topics/teams are strongest based on current evidence and clinical impact
- Be enthusiastic and encourage bracket submissions
- Target audience: nephrology practice staff
- NO emojis
</rules>

Return a JSON object with these fields:
- "headline": A catchy 5-8 word headline
- "body": The 3-4 sentence analysis
- "callToAction": A short bracket submission reminder"""
