"""Generate ALL remaining knowledge base content using Gemini 3.1 Pro.

Content types:
1. Drug monographs (grouped by class) -> content/drug_info/
2. Guideline summaries (15 sources) -> content/guidelines/
3. Clinical decision algorithms -> content/algorithms/
4. Quick reference tables -> content/references/

Usage:
    python scripts/generate_all_content.py
    python scripts/generate_all_content.py --type drugs
    python scripts/generate_all_content.py --type guidelines
    python scripts/generate_all_content.py --type algorithms
    python scripts/generate_all_content.py --type references
    python scripts/generate_all_content.py --dry-run
"""

import json
import sys
import time
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

from src.config import DATA_DIR, DRUG_INFO_DIR, GUIDELINES_DIR, settings

console = Console()

CONTENT_DIR = project_root / "content"
ALGORITHMS_DIR = CONTENT_DIR / "algorithms"
REFERENCES_DIR = CONTENT_DIR / "references"

SYSTEM_PROMPT = """You are an expert nephrology clinical reference author writing for The Kidney Experts (TKE), a nephrology practice in West Tennessee. You are creating comprehensive clinical reference content for a knowledge base used by nephrologists, APPs, and clinical staff.

RULES:
1. Base ALL content on the latest published guidelines (KDIGO, ADA, ACC/AHA, ACR, etc.). Cite specific guideline names and years.
2. ALWAYS use BOTH brand and generic drug names: "Farxiga (dapagliflozin)" not just one.
3. Include specific dosing, titration schedules, and monitoring parameters.
4. Include lab targets with specific numbers (e.g., "target UACR <30 mg/g").
5. Include decision trees: when to start, escalate, switch, or stop therapy.
6. Note CKD-specific dosing adjustments and eGFR thresholds.
7. Include relevant ICD-10 and CPT codes where applicable.
8. Include patient education talking points.
9. Flag safety concerns, contraindications, and drug interactions prominently.
10. Write in a clinical reference style — concise, factual, scannable with headers and bullets.
11. This is REFERENCE content only — not patient-specific medical advice.
12. Mark anything that may need local TKE protocol customization with [TKE PROTOCOL NEEDED].

FORMAT:
Use markdown with clear hierarchical headers (##, ###, ####).
Use tables for dosing, monitoring schedules, and comparisons.
Use bullet points for lists.
Keep each major section substantial (200-400 words) for good chunking."""


def generate_content(prompt: str, system: str = SYSTEM_PROMPT) -> str:
    """Generate content using Gemini 3.1 Pro."""
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system,
            temperature=0.3,
            max_output_tokens=8192,
        ),
    )
    return response.text


def add_frontmatter(
    content: str, content_type: str, domain: str | None = None, extra: dict | None = None
) -> str:
    """Add YAML frontmatter to generated content."""
    parts = [
        "---",
        f"content_type: {content_type}",
    ]
    if domain:
        parts.append(f"domain: {domain}")
    parts.extend(
        [
            f"generated_by: {settings.gemini_model}",
            f"generated_date: {time.strftime('%Y-%m-%d')}",
            "status: pending_review",
            "reviewer: Dr. Mulay",
        ]
    )
    if extra:
        for k, v in extra.items():
            parts.append(f"{k}: {v}")
    parts.append("---\n\n")
    return "\n".join(parts) + content


# =============================================================================
# DRUG MONOGRAPHS
# =============================================================================


def get_drug_class_groups() -> dict[str, list[dict]]:
    """Group drugs by class from drug_mappings.json."""
    with open(DATA_DIR / "drug_mappings.json") as f:
        data = json.load(f)

    groups: dict[str, list[dict]] = {}
    for drug in data["drugs"]:
        cls = drug["drug_class"]
        groups.setdefault(cls, []).append(drug)
    return groups


DRUG_MONOGRAPH_PROMPT_TEMPLATE = """Write a comprehensive clinical drug monograph for use in a nephrology practice knowledge base. This monograph covers the **{drug_class}** class with the following agents:

{drug_list}

For EACH drug in this class, cover these sections:

## [Brand Name] ([Generic Name])

### Mechanism of Action
- How it works, receptor/target specificity

### Indications in Nephrology
- FDA-approved indications relevant to CKD/nephrology
- Off-label uses common in nephrology practice
- Key supporting clinical trials with outcomes data (include trial names and key numbers)

### Dosing
- Standard dosing with titration schedules
- **CKD dose adjustments by eGFR range** (this is CRITICAL):
  - eGFR ≥60: [dose]
  - eGFR 30-59: [dose]
  - eGFR 15-29: [dose]
  - eGFR <15 / Dialysis: [dose]
- Hepatic adjustments if relevant

### Monitoring
- Baseline labs required before starting
- Follow-up lab schedule (what labs, how often)
- Therapeutic drug monitoring (if applicable — trough levels, timing)

### Adverse Effects & Safety
- Common side effects (>5%)
- Serious/rare side effects
- Black box warnings
- Contraindications (absolute and relative)
- **CKD-specific safety concerns**

### Drug Interactions
- Major interactions (especially with other nephrology drugs)
- CYP450 interactions if relevant
- Food interactions

### Special Populations
- Pregnancy category / contraindications
- Elderly considerations in CKD
- Transplant considerations (if relevant)

### Patient Counseling Points
- What to tell patients when starting this medication
- Warning signs to report
- Storage and administration tips

### Prior Authorization & Coding
- Common ICD-10 codes for approval
- Tips for prior authorization success
- Cost considerations and patient assistance programs

After individual drug sections, include:

## Class Comparison
- Table comparing all agents in this class (dosing, eGFR thresholds, key trials, cost)
- When to choose one agent over another
- Switching between agents within the class
"""


def generate_drug_monographs(dry_run: bool, delay: float) -> int:
    """Generate drug monographs grouped by drug class."""
    DRUG_INFO_DIR.mkdir(parents=True, exist_ok=True)
    groups = get_drug_class_groups()

    console.print(f"\n[bold cyan]DRUG MONOGRAPHS[/bold cyan]")
    console.print(
        f"  {len(groups)} drug classes, {sum(len(v) for v in groups.values())} total drugs\n"
    )

    count = 0
    for i, (drug_class, drugs) in enumerate(sorted(groups.items()), 1):
        safe_name = drug_class.lower().replace(" ", "_").replace("/", "_").replace("-", "_")
        output_path = DRUG_INFO_DIR / f"{safe_name}.md"

        drug_list = ""
        for d in drugs:
            brands = ", ".join(d["brands"]) if d["brands"] else "(no brand)"
            drug_list += f"- **{brands}** ({d['generic']}) — {d['drug_class']}\n"
            if d.get("aliases"):
                drug_list += f"  Aliases: {', '.join(d['aliases'])}\n"

        prompt = DRUG_MONOGRAPH_PROMPT_TEMPLATE.format(
            drug_class=drug_class,
            drug_list=drug_list,
        )

        console.print(f"  [{i}/{len(groups)}] {drug_class} ({len(drugs)} drugs)")

        if output_path.exists():
            console.print(f"    [dim]Skipping (already exists)[/dim]")
            count += 1
            continue

        if dry_run:
            console.print(f"    Would save to: {output_path}")
            count += 1
            continue

        try:
            content = generate_content(prompt)
            # Determine primary domain from first drug
            primary_domain = drugs[0]["domains"][0] if drugs[0]["domains"] else "general"
            full_content = add_frontmatter(
                content,
                "drug_monograph",
                primary_domain,
                {"drug_class": drug_class, "drug_count": str(len(drugs))},
            )
            output_path.write_text(full_content)
            console.print(f"    [green]Saved ({len(content)} chars)[/green]")
            count += 1
        except Exception as e:
            console.print(f"    [red]Error: {e}[/red]")

        if i < len(groups) and not dry_run:
            console.print(f"    [dim]Waiting {delay}s...[/dim]")
            time.sleep(delay)

    return count


# =============================================================================
# GUIDELINE SUMMARIES
# =============================================================================

GUIDELINE_SUMMARY_PROMPT_TEMPLATE = """Write a comprehensive clinical guideline summary for use in a nephrology practice knowledge base.

Guideline: **{title}**
Organization: {organization}
Publication Date: {pub_date}
Version: {version}
URL: {url}
Relevant Domains: {domains}
Notes: {notes}

Cover these sections:

## Overview
- What this guideline covers and why it matters for nephrology practice
- Target population and intended audience
- What changed from the previous version (if applicable)

## Key Recommendations
For each major recommendation area:
### [Topic Area]
- Specific recommendations with evidence grades (1A, 1B, 2C, etc.)
- Target values with specific numbers
- Drug recommendations with BOTH brand and generic names
- CKD-stage specific modifications

## Practice Points
- Practical implementation tips for a nephrology clinic
- Common clinical scenarios and how the guideline applies
- Grey areas where clinical judgment is needed

## Evidence Summary
- Key supporting trials (name, population, primary endpoint, key result)
- Number needed to treat / number needed to harm where relevant
- Limitations of the evidence

## What's New / Changed
- Major changes from prior versions of this guideline
- New drugs or therapies included
- Changed targets or thresholds

## How TKE Applies This Guideline
- Which TKE clinical domains this guideline informs
- Integration with other guidelines (e.g., KDIGO + ADA for diabetic CKD)
- [TKE PROTOCOL NEEDED] markers for local adaptation

## Quick Reference
- Table of key targets and thresholds from this guideline
- One-page summary of the most important recommendations
"""


def generate_guideline_summaries(dry_run: bool, delay: float) -> int:
    """Generate guideline summaries from source_registry.json."""
    GUIDELINES_DIR.mkdir(parents=True, exist_ok=True)

    with open(DATA_DIR / "source_registry.json") as f:
        data = json.load(f)

    sources = data["sources"]

    console.print(f"\n[bold cyan]GUIDELINE SUMMARIES[/bold cyan]")
    console.print(f"  {len(sources)} authoritative sources\n")

    count = 0
    for i, src in enumerate(sources, 1):
        output_path = GUIDELINES_DIR / f"{src['id']}.md"

        prompt = GUIDELINE_SUMMARY_PROMPT_TEMPLATE.format(
            title=src["title"],
            organization=src["organization"],
            pub_date=src.get("publication_date", "Unknown"),
            version=src.get("version", "N/A"),
            url=src.get("url", "N/A"),
            domains=", ".join(src.get("domains", [])),
            notes=src.get("notes", ""),
        )

        console.print(f"  [{i}/{len(sources)}] {src['id']}: {src['title'][:60]}")

        if output_path.exists():
            console.print(f"    [dim]Skipping (already exists)[/dim]")
            count += 1
            continue

        if dry_run:
            console.print(f"    Would save to: {output_path}")
            count += 1
            continue

        try:
            content = generate_content(prompt)
            primary_domain = src["domains"][0] if src.get("domains") else "general"
            full_content = add_frontmatter(
                content,
                "guideline_summary",
                primary_domain,
                {"source_id": src["id"], "organization": src["organization"]},
            )
            output_path.write_text(full_content)
            console.print(f"    [green]Saved ({len(content)} chars)[/green]")
            count += 1
        except Exception as e:
            console.print(f"    [red]Error: {e}[/red]")

        if i < len(sources) and not dry_run:
            console.print(f"    [dim]Waiting {delay}s...[/dim]")
            time.sleep(delay)

    return count


# =============================================================================
# CLINICAL DECISION ALGORITHMS
# =============================================================================

DECISION_ALGORITHMS = {
    "ckd_initial_workup": {
        "title": "CKD Initial Workup and Staging Algorithm",
        "domain": "general",
        "prompt": """Write a clinical decision algorithm for INITIAL CKD WORKUP AND STAGING:

1. When to suspect CKD: risk factors, incidental lab findings
2. Confirmation: repeat eGFR and UACR at 3 months
3. CKD-EPI 2021 equation — when eGFR and cystatin C should be used
4. KDIGO staging: GFR categories (G1-G5) × Albuminuria categories (A1-A3) — include the FULL heat map with risk levels (green/yellow/orange/red)
5. Etiology workup: what labs/imaging for each suspected cause
6. Nephrology referral criteria (eGFR <30, UACR >300, rapid decline, unexplained hematuria, refractory HTN)
7. Initial management plan by stage
8. Monitoring frequency by KDIGO risk category

Include the KDIGO heat map as a markdown table with risk colors.""",
    },
    "proteinuria_treatment_escalation": {
        "title": "Proteinuria Treatment Escalation Algorithm",
        "domain": "proteinuria",
        "prompt": """Write a clinical decision algorithm for PROTEINURIA TREATMENT ESCALATION:

Step-by-step decision tree:
1. Confirm proteinuria: UACR >30 mg/g on 2+ samples
2. KDIGO targets: UACR <30 mg/g (ideal) or ≥30% reduction from baseline
3. Step 1: Maximize RAAS blockade (ACEi/ARB to max tolerated dose)
   - Check creatinine + K+ at 1-2 weeks
   - Acceptable: up to 30% creatinine rise
   - If K+ >5.5: add Veltassa (patiromer) or Lokelma (SZC), don't stop RAAS
4. Step 2: Add SGLT2 inhibitor — Farxiga (dapagliflozin) 10mg if eGFR ≥20
   - Expected eGFR dip 3-5: DO NOT STOP
5. Step 3: Add Kerendia (finerenone) if T2DM + UACR ≥30 + K+ <5.0
6. Step 4: Consider Filspari (sparsentan) for IgA nephropathy
7. Non-pharmacologic: sodium <2g/day, protein 0.8g/kg/day
8. Recheck UACR at each step after 3 months
9. If still not at target: reassess diagnosis, consider biopsy

Format as a clear flowchart-style decision tree with YES/NO branch points.""",
    },
    "hyperkalemia_management": {
        "title": "Hyperkalemia Management Algorithm",
        "domain": "electrolytes",
        "prompt": """Write a clinical decision algorithm for HYPERKALEMIA MANAGEMENT IN CKD:

ACUTE (K+ ≥6.0 or ECG changes):
1. Cardiac monitoring, ECG
2. Calcium gluconate 10% 10mL IV over 2-3 min (membrane stabilization)
3. Regular insulin 10 units IV + D50W 25g (intracellular shift)
4. Albuterol 10-20mg nebulized (additive with insulin)
5. Sodium bicarbonate if acidotic (limited utility alone)
6. Kayexalate (SPS) 15-30g — slower onset, GI binding
7. Consider emergent dialysis if refractory

SUBACUTE (K+ 5.5-5.9, no ECG changes):
1. Dietary review: identify high-K+ foods
2. Review medications: hold/reduce RAAS blockade temporarily?
3. Start Lokelma (SZC) 10g TID x 48 hours correction dose
4. OR Veltassa (patiromer) 8.4g daily
5. Transition to maintenance:
   - Lokelma 5-15g daily
   - Veltassa 8.4-25.2g daily
6. RESUME RAAS blockade once K+ <5.0

CHRONIC (Enabling RAAS blockade/MRA therapy):
1. Goal: maintain K+ <5.0 to allow RAAS blockade + finerenone
2. Veltassa or Lokelma as standing medication
3. Dietary potassium counseling
4. Correct metabolic acidosis (bicarb ≥22)
5. Avoid potassium-sparing drugs unless needed

Include K+ thresholds for holding/restarting each RAAS agent and finerenone.
Include a comparison table of Veltassa vs Lokelma (onset, dosing, drug interactions, cost).""",
    },
    "sglt2i_initiation": {
        "title": "SGLT2 Inhibitor Initiation and Management Algorithm",
        "domain": "sglt2_inhibitors",
        "prompt": """Write a clinical decision algorithm for SGLT2 INHIBITOR INITIATION in CKD:

ELIGIBILITY CHECK:
1. eGFR ≥20 ml/min/1.73m² (can initiate)
2. No history of recurrent DKA or type 1 diabetes
3. No active foot ulcers or high amputation risk
4. Not pregnant or planning pregnancy

WHICH AGENT:
- Farxiga (dapagliflozin) 10mg daily — DAPA-CKD data, FDA-approved for CKD regardless of diabetes
- Jardiance (empagliflozin) 10mg daily — EMPA-KIDNEY data, similar efficacy
- Both: single dose, no titration needed, no dose adjustment for eGFR

PRE-INITIATION:
1. Check eGFR, BMP, glucose, A1c
2. If on insulin or sulfonylurea: REDUCE dose by 20-30% (hypoglycemia risk)
3. If on loop diuretic: consider reducing dose (volume depletion risk in elderly)
4. Counsel on genital hygiene (mycotic infection prevention)

POST-INITIATION MONITORING:
- 1 month: eGFR, BMP — expect 3-5 ml/min eGFR dip (hemodynamic, DO NOT STOP)
- 3 months: eGFR, UACR
- Then: per routine CKD monitoring

WHEN TO STOP:
- Dialysis initiation (no benefit data on dialysis)
- Pregnancy
- Recurrent DKA (rare in T2DM)
- Do NOT stop for eGFR declining below 20 if already started

SICK DAY RULES:
- Hold during acute illness (vomiting, dehydration, surgery)
- Hold 3-4 days before major surgery
- Resume when eating/drinking normally

Include a table: SGLT2i comparison (agent, dose, key trials, FDA indications, cost).""",
    },
    "anemia_workup_treatment": {
        "title": "CKD Anemia Workup and Treatment Algorithm",
        "domain": "anemia_ckd_mbd",
        "prompt": """Write a clinical decision algorithm for CKD ANEMIA WORKUP AND TREATMENT:

INITIAL WORKUP (Hgb <10 g/dL in CKD):
1. CBC with differential, reticulocyte count
2. Iron studies: ferritin + TSAT
3. Vitamin B12, folate
4. Rule out GI bleeding: stool guaiac, consider GI referral if iron deficiency
5. Reticulocyte production index

IRON-FIRST APPROACH (KDIGO):
Decision tree based on ferritin and TSAT:
- Ferritin <100 OR TSAT <20%: absolute iron deficiency → IV iron
- Ferritin 100-500 AND TSAT 20-30%: functional iron deficiency → trial IV iron
- Ferritin >500 AND TSAT >30%: iron replete → proceed to ESA evaluation

IV IRON OPTIONS:
| Agent | Dose | Schedule | Advantages |
- Injectafer (ferric carboxymaltose): 750mg x2 doses, 1 week apart — fewest visits
- Venofer (iron sucrose): 200mg x5 doses — most clinic experience
- Feraheme (ferumoxytol): 510mg x2 doses, 3-8 days apart

Oral iron: Auryxia (ferric citrate) 1 tablet TID — dual iron + phosphate binder

ESA THERAPY (if iron-replete, Hgb still <10):
- Target Hgb: 10-11.5 g/dL (do NOT intentionally exceed 13)
- Aranesp (darbepoetin alfa): 0.45 mcg/kg SC q2-4 weeks
- Epogen (epoetin alfa): 50-100 units/kg SC 3x/week
- Jesduvroq (daprodustat): oral HIF-PHI alternative, 1-4mg daily

ESA RESISTANCE (Hgb not responding despite adequate ESA + iron):
1. Recheck iron stores, TSAT
2. Screen for inflammation: CRP, ESR
3. Rule out: infection, malignancy, hemolysis, B12/folate deficiency, blood loss
4. Consider bone marrow evaluation if unexplained

Include a monitoring schedule table for each therapy.""",
    },
    "ckd_mbd_management": {
        "title": "CKD-MBD Management Algorithm",
        "domain": "anemia_ckd_mbd",
        "prompt": """Write a clinical decision algorithm for CKD-MBD (Mineral Bone Disease) MANAGEMENT:

MONITORING BY CKD STAGE (KDIGO 2024):
| Lab | CKD 3 | CKD 4 | CKD 5/5D |
| Calcium | q6-12mo | q3-6mo | q1-3mo |
| Phosphorus | q6-12mo | q3-6mo | q1-3mo |
| PTH | baseline+PRN | q6-12mo | q3-6mo |
| 25(OH)D | baseline+PRN | q6-12mo | q6-12mo |
| ALP | q12mo | q12mo | q12mo |

STEP 1: VITAMIN D REPLETION
- If 25(OH)D <30 ng/mL: ergocalciferol 50,000 IU weekly x 8-12 weeks, then monthly
- Recheck in 3 months
- If PTH still elevated despite replete 25(OH)D → proceed to Step 2

STEP 2: PHOSPHORUS MANAGEMENT
- If phosphorus elevated:
  - Dietary counseling: avoid processed foods, phosphate additives
  - Phosphate binders (choose based on calcium/cost/pill burden):
    - Renvela (sevelamer): 800mg TID with meals — no calcium load
    - Velphoro (sucroferric oxyhydroxide): 500mg TID — fewer pills, also provides iron
    - Auryxia (ferric citrate): 210mg elemental iron per tablet — dual phosphate+iron
    - PhosLo (calcium acetate): cheap, but limit in hypercalcemia

STEP 3: SECONDARY HYPERPARATHYROIDISM
- If PTH progressively rising despite Steps 1-2:
  - CKD 3-5 (non-dialysis): active vitamin D — Rocaltrol (calcitriol) 0.25mcg daily or Zemplar (paricalcitol) 1-2mcg daily
  - Dialysis: Sensipar (cinacalcet) 30mg daily, titrate q2-4 weeks to target PTH 2-9x upper normal
  - Monitor calcium closely — avoid hypercalcemia

STEP 4: REFRACTORY HYPERPARATHYROIDISM
- If PTH >800 despite maximal medical therapy → surgical parathyroidectomy referral
- Especially if hypercalcemia coexists

BONE DENSITY:
- Avoid bisphosphonates if eGFR <30 (adynamic bone risk)
- Prolia (denosumab): can be used but severe rebound hypercalcemia if stopped → must not discontinue abruptly""",
    },
    "hf_gdmt_optimization_ckd": {
        "title": "Heart Failure GDMT Optimization in CKD Algorithm",
        "domain": "chf_gdmt",
        "prompt": """Write a clinical decision algorithm for HEART FAILURE GDMT OPTIMIZATION IN CKD PATIENTS:

CLASSIFICATION:
1. HFrEF (EF ≤40%): All 4 pillars recommended
2. HFmrEF (EF 41-49%): SGLT2i, consider ARNI/BB/MRA
3. HFpEF (EF ≥50%): SGLT2i, diuretics, manage comorbidities

FOUR PILLARS OF GDMT FOR HFrEF:
Start ALL four at low doses simultaneously (or within 2 weeks), then uptitrate:

PILLAR 1 — ARNI or ACEi/ARB:
- Entresto (sacubitril/valsartan): 24/26mg BID → 49/51mg BID → 97/103mg BID
  - Must have 36-hour washout from ACEi before starting
  - eGFR ≥20: no dose adjustment needed
  - If K+ >5.5: hold, manage K+, restart when <5.0
- OR ACEi/ARB if Entresto not tolerated/available

PILLAR 2 — Beta-blocker:
- Coreg (carvedilol): 3.125mg BID → 6.25 → 12.5 → 25mg BID (50mg BID if >85kg)
- Toprol-XL (metoprolol succinate): 12.5-25mg daily → 50 → 100 → 200mg daily
- Zebeta (bisoprolol): 1.25mg daily → 2.5 → 5 → 10mg daily
- Uptitrate every 2 weeks if HR >60 and SBP >100

PILLAR 3 — MRA:
- Aldactone (spironolactone) 12.5-25mg daily OR Inspra (eplerenone) 25-50mg daily
- OR Kerendia (finerenone) if T2DM + CKD (addresses both HF and kidney)
- K+ must be <5.0, eGFR ≥25
- Check K+ at 1 week and 4 weeks after starting

PILLAR 4 — SGLT2i:
- Farxiga (dapagliflozin) 10mg OR Jardiance (empagliflozin) 10mg
- Works in HFrEF AND HFpEF (DAPA-HF, EMPEROR-Reduced, DELIVER, EMPEROR-Preserved)
- Can start at any eGFR ≥20

ADDITIONAL THERAPIES:
- Verquvo (vericiguat): if recent HF hospitalization on maximal GDMT
- Corlanor (ivabradine): if HR ≥70 on max beta-blocker, sinus rhythm
- BiDil (hydralazine/ISDN): especially if African American or can't tolerate ARNI/ACEi/ARB

DIURETICS (symptom management, NOT GDMT):
- Furosemide/bumetanide/torsemide for congestion
- Torsemide may be preferred (better bioavailability)
- Adjust based on daily weights, NOT by protocol

CKD-SPECIFIC PITFALLS:
- Monitor renal function with each uptitration
- AKI risk with aggressive diuresis
- Cardiorenal syndrome: when to accept higher creatinine for better HF control

Include a titration schedule table for all 4 pillars.""",
    },
    "diabetic_kidney_disease_management": {
        "title": "Diabetic Kidney Disease Management Algorithm",
        "domain": "diabetes",
        "prompt": """Write a clinical decision algorithm for DIABETIC KIDNEY DISEASE (DKD) MANAGEMENT:

SCREENING:
- T2DM: annual UACR + eGFR starting at diagnosis
- T1DM: annual UACR + eGFR starting 5 years after diagnosis
- Confirm abnormal UACR with repeat testing (2 of 3 positive within 3-6 months)

STAGING:
- Classify by both eGFR (G1-G5) and albuminuria (A1-A3) using KDIGO heat map

MULTIFACTORIAL MANAGEMENT (KDIGO 2022 Diabetes-CKD):

1. GLYCEMIC CONTROL:
   - A1c target: generally <7% (individualize — avoid <6.5% if hypoglycemia risk)
   - A1c unreliable in advanced CKD (shortened RBC lifespan) → consider CGM, fructosamine
   - Metformin (Glucophage): full dose eGFR ≥45, reduce eGFR 30-44, STOP eGFR <30
   - SGLT2i: Farxiga/Jardiance — PRIMARY kidney-protective agent, initiate if eGFR ≥20
   - GLP-1 RA: Ozempic (semaglutide) / Trulicity (dulaglutide) — add-on for CV/kidney benefit (FLOW trial)
   - Reduce insulin doses as eGFR declines (25% reduction eGFR 10-50, 50% eGFR <10)

2. BLOOD PRESSURE:
   - Target <130/80 (KDIGO); consider <120 systolic if tolerated (SPRINT-CKD)
   - First-line: ACEi/ARB — maximize dose for proteinuria reduction

3. PROTEINURIA:
   - Maximize RAAS blockade → add SGLT2i → add Kerendia (finerenone) if eligible
   - Target UACR <30 mg/g or ≥30% reduction

4. LIPIDS:
   - Statin therapy for all CKD patients ≥50 years
   - Atorvastatin (Lipitor) 20mg or rosuvastatin (Crestor) 10mg

5. WEIGHT MANAGEMENT:
   - GLP-1 RA for dual benefit (glucose + weight)
   - Consider Zepbound (tirzepatide) for significant obesity + DKD

6. SMOKING CESSATION

Include the KDIGO pillars diagram as a prioritized list.
Include a medication stacking flowchart: RAAS → SGLT2i → GLP-1RA → Finerenone.""",
    },
    "gout_ckd_management": {
        "title": "Gout Management in CKD Algorithm",
        "domain": "gout_uric_acid",
        "prompt": """Write a clinical decision algorithm for GOUT MANAGEMENT IN CKD PATIENTS:

ACUTE FLARE MANAGEMENT:
Decision tree based on eGFR:
- eGFR ≥30:
  - First-line: Colcrys (colchicine) 1.2mg then 0.6mg 1 hour later (low-dose regimen)
  - Alternative: Prednisone 30-40mg daily x 5-7 days
  - AVOID NSAIDs in ALL CKD patients
- eGFR 15-29:
  - First-line: Prednisone 30-40mg daily x 5-7 days (preferred)
  - Colchicine: REDUCE to 0.3mg single dose, avoid in severe renal impairment
  - Intra-articular steroid injection for monoarticular flare
- eGFR <15 or Dialysis:
  - Prednisone (preferred)
  - AVOID colchicine
  - IL-1 inhibitor (anakinra) for refractory cases

URATE-LOWERING THERAPY (ULT) — ACR 2020:
Indications to start ULT:
- ≥2 flares/year
- Tophi present
- Urate arthropathy on imaging
- Urolithiasis

Step 1: Zyloprim (allopurinol)
- Start 100mg daily (50mg if eGFR <30)
- Titrate by 50-100mg every 2-4 weeks
- Target serum uric acid <6 mg/dL
- HLA-B*5801 testing recommended before starting (especially if Southeast Asian, African American, Korean)
- Max dose NOT limited by eGFR — titrate to target (ACR 2020 change from prior practice)

Step 2: Uloric (febuxostat) 40-80mg daily
- If allopurinol intolerant or failed
- NO dose adjustment for CKD
- CARES trial CV concern — inform patient, use as second-line
- Monitor LFTs

Step 3: Krystexxa (pegloticase) 8mg IV q2 weeks
- For refractory chronic gout failing oral ULT
- Co-treat with immunomodulation (methotrexate) per MIRROR trial to reduce antibodies
- Check G6PD before starting (contraindicated if deficient)
- Pre-medication for infusion reactions

FLARE PROPHYLAXIS during ULT initiation:
- Low-dose colchicine 0.3-0.6mg daily for 3-6 months
- OR low-dose prednisone 5mg daily if colchicine contraindicated

Include: allopurinol vs febuxostat comparison table
Include: Krystexxa eligibility checklist""",
    },
    "membranous_nephropathy_treatment": {
        "title": "Membranous Nephropathy Treatment Algorithm",
        "domain": "gn_immunosuppression",
        "prompt": """Write a clinical decision algorithm for MEMBRANOUS NEPHROPATHY TREATMENT:

INITIAL WORKUP:
1. Anti-PLA2R antibody (present in ~70% of primary MN)
2. Secondary causes workup: ANA, hepatitis B/C, HIV, malignancy screen (age-appropriate), NSAID/drug exposure
3. Quantify proteinuria: 24-hour urine protein or UPCR
4. Kidney biopsy with IgG subclass staining

RISK STRATIFICATION:
- Low risk: proteinuria <3.5g/day and stable eGFR → supportive care
- Moderate risk: proteinuria 3.5-8g/day, OR high anti-PLA2R
- High risk: proteinuria >8g/day, declining eGFR, very high anti-PLA2R

TREATMENT ALGORITHM:

STEP 1: SUPPORTIVE CARE (all patients, 3-6 months observation for moderate risk):
- Maximize ACEi/ARB
- Add SGLT2 inhibitor — Farxiga (dapagliflozin) 10mg
- Sodium restriction, statin, BP control
- Edema management: furosemide + metolazone if needed
- DVT prophylaxis if albumin <2.5 and proteinuria >10g

STEP 2: IMMUNOSUPPRESSIVE THERAPY (if persistent nephrotic-range proteinuria after 3-6 months supportive care):

**First-line: Rituxan (rituximab)** — MENTOR trial (NEJM 2019)
- Dose: 1000mg IV on Day 1 and Day 15
- Non-inferior to cyclosporine at 12 months
- SUPERIOR sustained remission at 24 months (60% vs 20%)
- Monitor: CD20 count, immunoglobulins, hepatitis B reactivation
- Repeat at 6 months if anti-PLA2R still positive

**Alternative: Modified Ponticelli (cyclophosphamide-based)**
- Alternating months: methylprednisolone IV + oral prednisone → cyclophosphamide (Cytoxan)
- More toxic but effective (40+ years of data)
- Consider if rituximab not available or failed

**Second-line: Calcineurin inhibitors**
- Prograf (tacrolimus) 0.05mg/kg/day or cyclosporine (Neoral) 3.5mg/kg/day
- High relapse rate after discontinuation (50-60%)
- Useful as bridge therapy

MONITORING:
- Anti-PLA2R antibody levels: immunologic remission often precedes clinical remission
- Proteinuria: UPCR monthly
- Renal function: eGFR monthly during treatment

Include: MENTOR trial summary with numbers
Include: anti-PLA2R guided treatment decision table""",
    },
}


def generate_decision_algorithms(dry_run: bool, delay: float) -> int:
    """Generate clinical decision algorithm documents."""
    ALGORITHMS_DIR.mkdir(parents=True, exist_ok=True)

    console.print(f"\n[bold cyan]CLINICAL DECISION ALGORITHMS[/bold cyan]")
    console.print(f"  {len(DECISION_ALGORITHMS)} algorithms\n")

    count = 0
    for i, (key, algo) in enumerate(DECISION_ALGORITHMS.items(), 1):
        output_path = ALGORITHMS_DIR / f"{key}.md"
        console.print(f"  [{i}/{len(DECISION_ALGORITHMS)}] {algo['title']}")

        if output_path.exists():
            console.print(f"    [dim]Skipping (already exists)[/dim]")
            count += 1
            continue

        if dry_run:
            console.print(f"    Would save to: {output_path}")
            count += 1
            continue

        try:
            content = generate_content(algo["prompt"])
            full_content = add_frontmatter(content, "decision_algorithm", algo["domain"])
            output_path.write_text(full_content)
            console.print(f"    [green]Saved ({len(content)} chars)[/green]")
            count += 1
        except Exception as e:
            console.print(f"    [red]Error: {e}[/red]")

        if i < len(DECISION_ALGORITHMS) and not dry_run:
            console.print(f"    [dim]Waiting {delay}s...[/dim]")
            time.sleep(delay)

    return count


# =============================================================================
# QUICK REFERENCE TABLES
# =============================================================================

REFERENCE_TABLES = {
    "ckd_lab_targets": {
        "title": "CKD Lab Targets Quick Reference",
        "domain": "general",
        "prompt": """Create a comprehensive QUICK REFERENCE TABLE document for CKD LAB TARGETS.

Include these tables:

## CKD Staging (KDIGO 2024)
Table: GFR categories (G1-G5) with eGFR ranges and descriptions
Table: Albuminuria categories (A1-A3) with UACR ranges

## Lab Monitoring Schedule by CKD Stage
Table: Which labs, how often, for each CKD stage (3a, 3b, 4, 5, 5D)
Include: BMP, CBC, iron studies, lipids, PTH, vitamin D, phosphorus, calcium, UACR, A1c

## Treatment Targets
Table with columns: Parameter | Target | Guideline Source
Include:
- Blood pressure (<120 systolic if tolerated — KDIGO 2024/SPRINT)
- UACR (<30 mg/g or ≥30% reduction)
- A1c (<7% individualized)
- Hemoglobin (10-11.5 g/dL)
- Ferritin (200-500 ng/mL) and TSAT (20-30%)
- Potassium (3.5-5.0 mEq/L)
- Bicarbonate (≥22 mEq/L)
- Phosphorus (normal range by lab)
- PTH (CKD 3-5: not excessively elevated; 5D: 2-9x upper normal)
- 25(OH) Vitamin D (≥30 ng/mL)
- Uric acid (<6 mg/dL if on ULT for gout)
- LDL (no specific CKD target — use ACC/AHA risk categories)

## eGFR Thresholds for Drug Decisions
Table: Drug | Start if eGFR | Stop if eGFR | Notes
Include all major nephrology drugs""",
    },
    "drug_dosing_by_egfr": {
        "title": "Drug Dosing Adjustments by eGFR",
        "domain": "general",
        "prompt": """Create a comprehensive DRUG DOSING BY eGFR quick reference table.

For EACH of these drugs, create a row in a large table:

| Drug (Brand/Generic) | Class | eGFR ≥60 | eGFR 30-59 | eGFR 15-29 | eGFR <15/Dialysis | Notes |

RAAS BLOCKADE:
- Lisinopril (Prinivil/Zestril), Enalapril (Vasotec), Ramipril (Altace)
- Losartan (Cozaar), Valsartan (Diovan), Irbesartan (Avapro), Telmisartan (Micardis)
- Entresto (sacubitril/valsartan)

SGLT2 INHIBITORS:
- Farxiga (dapagliflozin), Jardiance (empagliflozin)

FINERENONE/MRA:
- Kerendia (finerenone), Aldactone (spironolactone), Inspra (eplerenone)

GLP-1 RAs:
- Ozempic (semaglutide), Mounjaro (tirzepatide), Trulicity (dulaglutide), Victoza (liraglutide)

DIABETES:
- Metformin (Glucophage), sitagliptin (Januvia), linagliptin (Tradjenta)

GOUT:
- Allopurinol (Zyloprim), Febuxostat (Uloric), Colchicine (Colcrys)

ANEMIA:
- Aranesp (darbepoetin), Epogen (epoetin), Jesduvroq (daprodustat)

PHOSPHATE BINDERS:
- Renvela (sevelamer), Velphoro, Auryxia (ferric citrate), PhosLo (calcium acetate)

POTASSIUM BINDERS:
- Veltassa (patiromer), Lokelma (SZC)

LIPIDS:
- Atorvastatin (Lipitor), Rosuvastatin (Crestor)

SMOKING CESSATION:
- Chantix (varenicline), Wellbutrin/Zyban (bupropion)

PAIN:
- Acetaminophen, Tramadol, Gabapentin, Pregabalin

Also include a separate section on drugs to AVOID in CKD and why.""",
    },
    "monitoring_schedules": {
        "title": "Medication Monitoring Schedules",
        "domain": "general",
        "prompt": """Create a comprehensive MEDICATION MONITORING SCHEDULES quick reference.

For each major drug class, provide a table:

| Drug | Baseline Labs | After Start/Change | Routine Monitoring | Alert Values |

Cover:
1. RAAS blockade (ACEi/ARB): Cr, K+ at baseline, 1-2 weeks, then q3-6 months
2. SGLT2 inhibitors: eGFR at baseline, 1 month; glucose if diabetic
3. Kerendia (finerenone): K+ at baseline, 4 weeks, 4 weeks post-change, then q4 months
4. ESAs (Aranesp/Epogen): CBC monthly, iron q3 months, reticulocyte count if poor response
5. IV Iron: ferritin + TSAT 4-8 weeks after course completion
6. Tacrolimus (Prograf): trough levels per transplant protocol, BMP, CBC, glucose
7. Mycophenolate (CellCept): CBC q2 weeks x3 months, then monthly
8. Statin therapy: lipid panel baseline, 6-12 weeks, then annually; LFTs if symptomatic
9. Allopurinol/Febuxostat: uric acid q2-4 weeks during titration, LFTs for febuxostat
10. Phosphate binders: calcium, phosphorus, PTH per CKD stage schedule
11. GLP-1 RAs: A1c q3 months, weight, pancreatitis symptoms
12. Potassium binders: K+ q1-4 weeks initially, then q1-3 months
13. Metformin: BMP q3-6 months, B12 annually, hold for contrast procedures

Also include a "SICK DAY RULES" section:
Which drugs to hold during acute illness (SGLT2i, metformin, diuretics, RAAS blockade) and when to resume.""",
    },
    "clinical_trial_summary": {
        "title": "Key Clinical Trials in Nephrology Quick Reference",
        "domain": "general",
        "prompt": """Create a QUICK REFERENCE TABLE of KEY CLINICAL TRIALS in nephrology.

For each trial, provide a row in a table:

| Trial Name | Year | Drug/Intervention | Population | Primary Endpoint | Key Result | NNT | Guideline Impact |

Include ALL of these trials:

SGLT2 INHIBITORS:
- DAPA-CKD (dapagliflozin, CKD ±diabetes)
- EMPA-KIDNEY (empagliflozin, CKD broad)
- CREDENCE (canagliflozin, diabetic CKD)
- DAPA-HF (dapagliflozin, HFrEF)
- EMPEROR-Reduced (empagliflozin, HFrEF)
- DELIVER (dapagliflozin, HFpEF)
- EMPEROR-Preserved (empagliflozin, HFpEF)

FINERENONE:
- FIDELIO-DKD (finerenone, kidney outcomes)
- FIGARO-DKD (finerenone, CV outcomes)
- FIDELITY (combined analysis)
- FINEARTS-HF (finerenone, HFpEF)

GLP-1 RAs:
- FLOW (semaglutide, kidney outcomes)
- SUSTAIN-6 (semaglutide, CV outcomes)
- LEADER (liraglutide, CV outcomes)
- REWIND (dulaglutide, CV outcomes)
- SURPASS (tirzepatide vs semaglutide)

RAAS:
- ONTARGET (dual RAAS blockade — DON'T DO THIS)
- VA NEPHRON-D (dual RAAS — DON'T DO THIS)
- PARADIGM-HF (sacubitril/valsartan, HFrEF)

GN:
- MENTOR (rituximab vs cyclosporine, membranous)
- TESTING (steroids, IgA nephropathy)
- NEFIGARD (budesonide, IgA nephropathy)
- PROTECT (sparsentan, IgA nephropathy)
- AURORA (voclosporin, lupus nephritis)
- BLISS-LN (belimumab, lupus nephritis)
- RAVE (rituximab, ANCA vasculitis)
- ADVOCATE (avacopan, ANCA vasculitis)
- PEXIVAS (plasma exchange, vasculitis)

LIPIDS:
- SHARP (statin/ezetimibe in CKD)
- 4D, AURORA (statins in dialysis — NO benefit)
- FOURIER (evolocumab, PCSK9i)

OTHER:
- SPRINT-CKD (intensive BP in CKD)
- RALES (spironolactone, HFrEF)
- MIRROR (pegloticase + methotrexate, gout)

After the table, add a "PRACTICE-CHANGING SUMMARY" section highlighting the top 10 most impactful trials for current nephrology practice.""",
    },
    "icd10_cpt_codes": {
        "title": "Nephrology ICD-10 and CPT Codes Quick Reference",
        "domain": "general",
        "prompt": """Create a comprehensive ICD-10 AND CPT CODE QUICK REFERENCE for nephrology practice.

## CKD Staging Codes
| Stage | ICD-10 | Description |
- N18.1 through N18.6 (CKD stages 1-5 and ESRD)
- N18.9 (CKD unspecified)
- N18.30-N18.32 (CKD stage 3 unspecified/3a/3b)
- N17.x (AKI)

## Proteinuria & Albuminuria
- R80.x codes
- N08.x (glomerular disorders in diseases classified elsewhere)

## Diabetic Kidney Disease
- E11.22 (T2DM with DKD)
- E11.65 (T2DM with hyperglycemia)
- E10.22 (T1DM with DKD)

## Glomerulonephritis
- N04.x (nephrotic syndrome subtypes)
- N05.x (unspecified nephritic syndrome)
- IgA: N02.8
- Membranous: N04.2
- Lupus nephritis: M32.14

## Transplant
- Z94.0 (kidney transplant status)
- T86.1x (kidney transplant complications)

## Heart Failure with CKD
- I50.x (HF codes)
- Combination coding for CKD + HF

## Anemia of CKD
- D63.1 (anemia in CKD)

## CKD-MBD
- E21.1 (secondary hyperparathyroidism)
- E83.39 (hyperphosphatemia)

## Gout
- M10.x (gout subtypes)
- M1A.x (chronic gout)

## Common CPT Codes
- E&M codes for nephrology visits
- 36415, 36416 (venipuncture)
- 90935-90937 (hemodialysis)
- Infusion codes for IV iron, rituximab, pegloticase
- Kidney biopsy codes
- Transplant evaluation codes

## Modifier Reference
Common modifiers used in nephrology billing

Include tips for proper documentation to support coding.""",
    },
}


def generate_reference_tables(dry_run: bool, delay: float) -> int:
    """Generate quick reference table documents."""
    REFERENCES_DIR.mkdir(parents=True, exist_ok=True)

    console.print(f"\n[bold cyan]QUICK REFERENCE TABLES[/bold cyan]")
    console.print(f"  {len(REFERENCE_TABLES)} reference documents\n")

    count = 0
    for i, (key, ref) in enumerate(REFERENCE_TABLES.items(), 1):
        output_path = REFERENCES_DIR / f"{key}.md"
        console.print(f"  [{i}/{len(REFERENCE_TABLES)}] {ref['title']}")

        if output_path.exists():
            console.print(f"    [dim]Skipping (already exists)[/dim]")
            count += 1
            continue

        if dry_run:
            console.print(f"    Would save to: {output_path}")
            count += 1
            continue

        try:
            content = generate_content(ref["prompt"])
            full_content = add_frontmatter(content, "quick_reference", ref["domain"])
            output_path.write_text(full_content)
            console.print(f"    [green]Saved ({len(content)} chars)[/green]")
            count += 1
        except Exception as e:
            console.print(f"    [red]Error: {e}[/red]")

        if i < len(REFERENCE_TABLES) and not dry_run:
            console.print(f"    [dim]Waiting {delay}s...[/dim]")
            time.sleep(delay)

    return count


# =============================================================================
# MAIN
# =============================================================================


@click.command()
@click.option(
    "--type",
    "content_type",
    type=click.Choice(["drugs", "guidelines", "algorithms", "references", "all"]),
    default="all",
    help="Type of content to generate",
)
@click.option("--dry-run", is_flag=True, help="Show what would be generated without calling API")
@click.option("--delay", type=float, default=5.0, help="Delay between API calls (seconds)")
def main(content_type: str, dry_run: bool, delay: float):
    """Generate all remaining TKE Knowledge Base content."""
    console.print("[bold]TKE Knowledge Base — Full Content Generation[/bold]")
    console.print(f"Model: {settings.gemini_model}")
    console.print(f"Content type: {content_type}")
    if dry_run:
        console.print("[yellow]DRY RUN MODE — no API calls will be made[/yellow]")
    console.print()

    results = {}

    if content_type in ("drugs", "all"):
        results["drugs"] = generate_drug_monographs(dry_run, delay)

    if content_type in ("guidelines", "all"):
        results["guidelines"] = generate_guideline_summaries(dry_run, delay)

    if content_type in ("algorithms", "all"):
        results["algorithms"] = generate_decision_algorithms(dry_run, delay)

    if content_type in ("references", "all"):
        results["references"] = generate_reference_tables(dry_run, delay)

    # Summary
    console.print(f"\n[bold green]{'=' * 60}[/bold green]")
    console.print("[bold green]Content Generation Complete![/bold green]")
    for ct, count in results.items():
        console.print(f"  {ct}: {count} files")
    total = sum(results.values())
    console.print(f"  [bold]Total: {total} files generated[/bold]")

    console.print("\n[bold]Next steps:[/bold]")
    console.print("  1. Review generated content for accuracy")
    console.print("  2. Run ingestion: python scripts/ingest_all_content.py")


if __name__ == "__main__":
    main()
