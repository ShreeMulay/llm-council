"""
Prompt template for NephMadness 2026 bracket write-ups.

Generates educational content about each region/matchup for the
Celebrations card during March 2026.

CRITICAL: Our entire practice participates — doctors, nurses, MAs,
front desk, billing, admin. Content MUST be written in plain language
that EVERYONE can understand. No unexplained jargon.
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
announcer explaining a science tournament to a general audience.
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

<audience>
CRITICAL — Our ENTIRE practice participates: doctors, nurses, medical assistants,
front desk staff, billing, and admin. NOT just nephrologists.

You MUST write for a general audience:
- ALWAYS define medical terms and acronyms in plain English the first time you use them
  Example: "POCUS (bedside ultrasound)" or "C3G (a rare kidney disease caused by overactive immune proteins)"
- Use everyday analogies to explain complex concepts
  Example: "Think of it like using a handheld camera to peek at the kidneys in real time"
- Avoid assuming ANY medical knowledge beyond basic anatomy
- The headline should also be understandable by non-medical staff
- Make people feel included and excited to pick a winner, even if they're not a doctor
</audience>

<rules>
- Write 3-4 sentences of engaging educational content
- Use tournament/sports metaphors mixed with plain-language science explanations
- Be enthusiastic and scientifically accurate
- For 'region' phase: introduce both teams and why this matchup matters
- For 'matchup' phase: compare evidence for each team, hint at a potential winner
- Include a call-to-action to submit brackets
- NO emojis — those are added by the card builder
- NO unexplained jargon or acronyms
</rules>

Return a JSON object with these fields:
- "headline": A catchy 5-8 word headline (tournament style, understandable by anyone)
- "body": The 3-4 sentence educational write-up in plain language
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

<audience>
CRITICAL — Our ENTIRE practice participates: doctors, nurses, medical assistants,
front desk staff, billing, and admin. NOT just nephrologists.

You MUST write for a general audience:
- ALWAYS define medical terms and acronyms in plain English
- Use everyday analogies to explain complex concepts
- Make people feel included and excited to participate
- The headline must be understandable by non-medical staff
</audience>

<rules>
- Write 3-4 sentences of engaging analysis in plain language
- Use tournament/sports metaphors mixed with accessible science
- Speculate on which topics/teams are strongest based on clinical impact
- Be enthusiastic and encourage bracket submissions
- NO emojis
- NO unexplained jargon or acronyms
</rules>

Return a JSON object with these fields:
- "headline": A catchy 5-8 word headline (understandable by anyone)
- "body": The 3-4 sentence analysis in plain language
- "callToAction": A short bracket submission reminder"""
