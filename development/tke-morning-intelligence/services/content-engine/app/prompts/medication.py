"""Prompt template for the Medication of the Day section."""


def build_prompt(generic_name: str, medication_api_data: dict | None = None) -> str:
    """Build the medication education prompt.

    Args:
        generic_name: The generic drug name (e.g., "lisinopril", "furosemide").
        medication_api_data: Optional dict of verified medication data from an API
            (e.g., OpenFDA, RxNorm). If provided, the LLM should use these as
            ground-truth facts rather than relying on training data alone.

    Returns:
        XML-tagged prompt string for Vertex AI Gemini.
    """
    api_block = ""
    if medication_api_data:
        api_block = f"""
<verified_medication_data>
The following data was retrieved from a verified pharmaceutical API.
Use this as ground truth. Do NOT contradict these facts. You may supplement
with additional clinical knowledge, but the API data takes precedence.

{_format_api_data(medication_api_data)}
</verified_medication_data>"""

    return f"""<system>
You are a clinical pharmacist educator specializing in nephrology for
The Kidney Experts (TKE) morning briefing. Your job is to teach the team
about one medication per day — its mechanism, renal considerations, and
practical clinical pearls.

TKE's BHAG: "Ridding the World of the Need for Dialysis!"
TKE's value: "Data Over Opinion" — accuracy is non-negotiable for medication information.
</system>

<today_assignment>
  <generic_name>{generic_name}</generic_name>
</today_assignment>
{api_block}
<instructions>
1. Provide the brand name, drug class, and primary use for the assigned medication.
2. Explain the mechanism of action clearly and accurately for a mixed clinical/non-clinical audience.
3. Detail renal dosing considerations — this is critical for a nephrology practice.
4. Share a practical clinical pearl that the team can use in daily practice.
5. List 3-5 common side effects.
6. Provide a patient counseling point — what should patients know about this medication?
</instructions>

<rules>
- CRITICAL: The mechanism of action (howItWorks) MUST accurately match the drug class.
  For example:
    - ACE inhibitors block angiotensin-converting enzyme (NOT angiotensin II receptors)
    - ARBs block angiotensin II AT1 receptors (NOT the converting enzyme)
    - Loop diuretics inhibit Na-K-2Cl cotransporter in the loop of Henle (NOT thiazide-sensitive NCC)
    - Thiazides inhibit NCC in the distal convoluted tubule (NOT the loop of Henle)
    - SGLT2 inhibitors block sodium-glucose cotransporter 2 in the proximal tubule
    - Calcineurin inhibitors block calcineurin/NFAT pathway in T cells
  Getting the mechanism wrong for the drug class is an unacceptable error.
- If verified_medication_data is provided, use it as ground truth. Do NOT contradict API data.
- renalDosing must include specific GFR thresholds or CKD stage adjustments where applicable.
- pearlForPractice should be genuinely useful — not a restatement of basic pharmacology.
- commonSideEffects should list 3-5 items, ordered by clinical frequency.
- patientCounselingPoint should be in plain language a patient can understand.
- The emoji should represent the drug class or its primary therapeutic area.
</rules>

<output_schema>
{{
  "genericName": "string — the generic drug name",
  "brandName": "string — the most common US brand name",
  "drugClass": "string — pharmacological class",
  "emoji": "string — single emoji representing the drug or its use",
  "primaryUse": "string — what this medication is primarily prescribed for",
  "howItWorks": "string — mechanism of action in clear, accurate language",
  "renalDosing": "string — renal dose adjustments with specific GFR/CKD stage thresholds",
  "pearlForPractice": "string — practical clinical pearl for the nephrology team",
  "commonSideEffects": ["string — side effect 1", "string — side effect 2", "...3-5 total"],
  "patientCounselingPoint": "string — what to tell the patient in plain language"
}}
</output_schema>

Return ONLY valid JSON matching the schema. No markdown code blocks."""


def _format_api_data(data: dict) -> str:
    """Format API data as readable XML key-value pairs for the prompt.

    Args:
        data: Dictionary of medication data from an API.

    Returns:
        XML-formatted string of the data.
    """
    lines = []
    for key, value in data.items():
        if isinstance(value, list):
            items = ", ".join(str(v) for v in value)
            lines.append(f"  <{key}>{items}</{key}>")
        elif isinstance(value, dict):
            sub_items = "; ".join(f"{k}: {v}" for k, v in value.items())
            lines.append(f"  <{key}>{sub_items}</{key}>")
        else:
            lines.append(f"  <{key}>{value}</{key}>")
    return "\n".join(lines)
