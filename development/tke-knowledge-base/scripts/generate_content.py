"""Generate clinical reference content for all 15 domains using Gemini 3.1 Pro.

This creates comprehensive, guideline-based clinical reference documents
that serve as the L1 Clinical Core of the TKE Knowledge Base.

Usage:
    python scripts/generate_content.py
    python scripts/generate_content.py --domain sglt2_inhibitors
    python scripts/generate_content.py --dry-run
"""

import json
import sys
import time
from pathlib import Path

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

load_dotenv()

from google import genai
from google.genai import types

from src.config import DATA_DIR, PROTOCOLS_DIR, settings

console = Console()

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

DOMAIN_PROMPTS = {
    "proteinuria": """Write a comprehensive clinical reference on PROTEINURIA MANAGEMENT IN CKD covering:
1. KDIGO 2024 albuminuria staging (A1, A2, A3) with UACR cutoffs
2. When and how to measure UACR vs UPCR — first morning void vs random, confirmation testing
3. Treatment targets by CKD stage (UACR <30 mg/g goal, relative reduction goals)
4. First-line therapy: RAAS blockade (ACEi/ARB) titration to maximum tolerated dose
5. Add-on therapy decision tree: SGLT2i → finerenone → combination approaches
6. Sparsentan (Filspari) — role in IgA nephropathy and proteinuric kidney diseases, PROTECT trial data
7. Monitoring frequency: UACR at baseline, after med changes, and at minimum annually
8. Impact of proteinuria reduction on kidney and cardiovascular outcomes
9. Non-pharmacologic measures: sodium restriction, protein intake, weight management
10. Patient education: explaining what protein in urine means, importance of medication adherence
11. Relevant ICD-10 codes (N17-N19, R80.x) and coding considerations
12. When to refer to nephrology based on proteinuria levels""",
    "raas_blockade": """Write a comprehensive clinical reference on RAAS BLOCKADE IN CKD covering:
1. KDIGO 2024 recommendations for ACEi/ARB use in CKD
2. Indications: albuminuria ≥30 mg/g, hypertension with CKD, diabetic kidney disease
3. Drug selection: specific ACEi options (lisinopril, enalapril, ramipril) vs ARBs (losartan, valsartan, irbesartan, telmisartan) with dosing ranges
4. Titration protocol: start low, uptitrate every 2-4 weeks to maximum tolerated dose
5. Monitoring: creatinine + potassium at baseline, 1-2 weeks after initiation/dose change
6. Acceptable creatinine rise: up to 30% from baseline is expected and acceptable
7. Hyperkalemia management: when to hold vs reduce dose vs add potassium binder — Veltassa (patiromer) and Lokelma (SZC) protocols
8. Dual RAAS blockade: why it's NOT recommended (ONTARGET, VA NEPHRON-D)
9. Use in pregnancy: absolute contraindication, counseling requirements
10. Entresto (sacubitril/valsartan) — when ARNI replaces ACEi/ARB (HFrEF indication)
11. eGFR considerations: continue even at low eGFR unless hyperkalemia or >30% creatinine rise
12. Patient education talking points: purpose of medication, potassium-rich food awareness""",
    "sglt2_inhibitors": """Write a comprehensive clinical reference on SGLT2 INHIBITORS IN CKD covering:
1. KDIGO 2024 recommendations: first-line for CKD with eGFR ≥20 and albuminuria
2. Available agents: Farxiga (dapagliflozin) 10mg, Jardiance (empagliflozin) 10mg — dosing is same regardless of eGFR
3. Key trials and their outcomes:
   - DAPA-CKD: 39% reduction in kidney composite endpoint
   - EMPA-KIDNEY: benefit even in non-diabetic CKD
   - CREDENCE: canagliflozin in diabetic CKD
4. Initiation criteria: eGFR ≥20 ml/min (can initiate), continue even if eGFR drops below 20
5. Expected eGFR "dip": 3-5 ml/min initial decline is hemodynamic and EXPECTED — do NOT stop
6. Monitoring protocol: eGFR at baseline, 1 month, then per routine. No need for frequent glucose monitoring in non-diabetics
7. Safety concerns: UTI risk, genital mycotic infections, euglycemic DKA (rare), volume depletion in elderly
8. Drug interactions: insulin/sulfonylurea dose reduction if diabetic (hypoglycemia risk)
9. Perioperative management: hold 3-4 days before major surgery
10. Cardiovascular benefits: HFrEF and HFpEF data (DAPA-HF, EMPEROR-Reduced/Preserved)
11. Patient education: genital hygiene, hydration, sick day rules
12. Prior authorization tips and ICD-10 codes for CKD indication""",
    "finerenone_mra": """Write a comprehensive clinical reference on FINERENONE AND MRAs IN CKD covering:
1. Kerendia (finerenone) — nonsteroidal MRA mechanism, difference from spironolactone/eplerenone
2. KDIGO 2024 positioning: add-on to maximized RAAS blockade + SGLT2i in diabetic CKD
3. Key trials:
   - FIDELIO-DKD: 18% reduction in kidney composite endpoint
   - FIGARO-DKD: 13% reduction in cardiovascular composite
   - Combined FIDELITY analysis
   - FINEARTS-HF: finerenone in HFpEF/HFmrEF
4. Dosing: 10mg daily if eGFR 25-59, 20mg daily if eGFR ≥60. Uptitrate after 4 weeks if K+ ≤4.8
5. Eligibility criteria: T2DM + CKD + UACR ≥30 + K+ <5.0 + on maximized RAAS blockade
6. Monitoring protocol: potassium at baseline, 4 weeks, 4 weeks after dose change, then every 4 months
7. Hyperkalemia management: hold if K+ ≥5.5, restart at lower dose when K+ <5.0
8. Comparison with steroidal MRAs: spironolactone (Aldactone), eplerenone (Inspra) — when to use which
9. Stacking with SGLT2i: safety data, additional benefit, potassium mitigation
10. CYP3A4 interactions: avoid strong inhibitors (ketoconazole, itraconazole, ritonavir)
11. Patient education: importance of potassium monitoring, dietary potassium guidance
12. Prior authorization requirements and coding""",
    "glp1_agonists": """Write a comprehensive clinical reference on GLP-1 RECEPTOR AGONISTS IN CKD covering:
1. Available agents with dosing:
   - Ozempic (semaglutide) 0.25→0.5→1→2 mg weekly
   - Wegovy (semaglutide) for obesity — different indication/dosing
   - Rybelsus (oral semaglutide) 3→7→14 mg daily
   - Mounjaro/Zepbound (tirzepatide) — dual GIP/GLP-1, dosing escalation
   - Trulicity (dulaglutide) 0.75→1.5→3→4.5 mg weekly
   - Victoza (liraglutide) 0.6→1.2→1.8 mg daily
2. FLOW trial: first GLP-1 RA to demonstrate PRIMARY kidney endpoint benefit — 24% reduction in kidney composite
3. Cardiovascular outcome trials: SUSTAIN-6, LEADER, REWIND, SURPASS
4. Kidney-specific benefits: proteinuria reduction, eGFR preservation, weight loss
5. CKD dosing adjustments: most GLP-1 RAs do NOT need dose adjustment for eGFR (except exenatide)
6. Tirzepatide: dual mechanism, SURPASS and SURMOUNT trials, weight loss superiority
7. Side effects: GI (nausea, vomiting, diarrhea) — slow titration, dietary advice
8. Safety concerns: pancreatitis risk, thyroid C-cell tumors (MTC contraindication), gastroparesis
9. Combination with SGLT2i and insulin: dose adjustments, hypoglycemia risk
10. Weight management in CKD: role of GLP-1 RA in obese CKD patients
11. Patient education: injection technique, GI side management, storage
12. Prior authorization strategies and coding for CKD/DKD indication""",
    "chf_gdmt": """Write a comprehensive clinical reference on HEART FAILURE GDMT IN CKD PATIENTS covering:
1. 2022 AHA/ACC/HFSA guidelines: four pillars of GDMT for HFrEF (EF ≤40%)
   - Pillar 1: ARNI — Entresto (sacubitril/valsartan) 24/26→49/51→97/103 mg BID
   - Pillar 2: Beta-blocker — carvedilol (Coreg) 3.125→25mg BID, metoprolol succinate (Toprol-XL) 25→200mg daily, bisoprolol 1.25→10mg daily
   - Pillar 3: MRA — spironolactone 12.5-50mg or eplerenone 25-50mg (or finerenone for DKD)
   - Pillar 4: SGLT2i — Farxiga (dapagliflozin) 10mg or Jardiance (empagliflozin) 10mg
2. HFpEF management: SGLT2i (DELIVER, EMPEROR-Preserved), finerenone (FINEARTS-HF)
3. CKD-specific considerations: dose adjustments by eGFR, hyperkalemia risk with MRA
4. Diuretic management: loop diuretics (furosemide, bumetanide, torsemide) — not GDMT but essential
5. Additional therapies: Verquvo (vericiguat), Corlanor (ivabradine), BiDil (hydralazine/ISDN)
6. Volume management in cardiorenal syndrome: balancing diuresis with AKI risk
7. Key trials: PARADIGM-HF, DAPA-HF, EMPEROR-Reduced, RALES, MERIT-HF
8. Titration strategy: initiate all four pillars at low dose, uptitrate sequentially
9. Monitoring: BNP/NT-proBNP, renal function, potassium, blood pressure, heart rate
10. When to refer to cardiology vs manage in nephrology
11. Patient education: daily weights, sodium restriction (<2g/day), fluid management
12. ICD-10 codes for HF with CKD documentation""",
    "anemia_ckd_mbd": """Write a comprehensive clinical reference on ANEMIA AND CKD-MBD MANAGEMENT covering:

ANEMIA SECTION:
1. KDIGO targets: Hemoglobin 10-11.5 g/dL (do not intentionally exceed 13)
2. Iron-first approach: target ferritin 200-500 ng/mL, TSAT 20-30%
3. IV iron options: ferric carboxymaltose (Injectafer), iron sucrose (Venofer), ferumoxytol (Feraheme)
4. Oral iron: ferrous sulfate 325mg, ferric citrate (Auryxia) — dual iron + phosphate binder
5. ESA therapy: Aranesp (darbepoetin alfa) dosing, Epogen (epoetin alfa) dosing
6. HIF-PHI: Jesduvroq (daprodustat) — oral alternative to ESA, ASCEND trials
7. ESA resistance: causes (iron deficiency, inflammation, infection, malignancy) and workup
8. Monitoring: CBC monthly during ESA, ferritin/TSAT every 3 months

CKD-MBD SECTION:
9. KDIGO 2024 CKD-MBD targets by CKD stage:
   - Phosphorus: maintain normal range (lab-specific)
   - Calcium: avoid hypercalcemia
   - PTH: CKD 3-5 progressively rising above normal; dialysis 2-9x upper normal
   - 25(OH) vitamin D: replete if <30 ng/mL
10. Phosphate binders: calcium-based (PhosLo/Phoslyra), non-calcium (Renvela/sevelamer, Velphoro, Fosrenol/lanthanum), iron-based (Auryxia)
11. Vitamin D: ergocalciferol/cholecalciferol for deficiency; calcitriol (Rocaltrol) or paricalcitol (Zemplar) for secondary hyperparathyroidism
12. Cinacalcet (Sensipar) for uncontrolled hyperparathyroidism
13. Dietary phosphorus education: processed foods, phosphate additives
14. Bone density considerations in CKD — avoid bisphosphonates if eGFR <30""",
    "electrolytes": """Write a comprehensive clinical reference on ELECTROLYTE MANAGEMENT IN CKD covering:

POTASSIUM:
1. Normal range and CKD-specific targets: 3.5-5.0 mEq/L, concern >5.5
2. Hyperkalemia causes in CKD: reduced excretion, RAAS blockade, metabolic acidosis, dietary
3. Acute management: calcium gluconate, insulin/dextrose, albuterol, sodium bicarb, kayexalate
4. Chronic management with potassium binders:
   - Veltassa (patiromer): 8.4g daily, titrate by 8.4g increments, separate from other meds by 3 hours
   - Lokelma (SZC/sodium zirconium cyclosilicate): 10g TID x48h correction, then 5-15g daily maintenance
5. Enabling RAAS blockade: using K+ binders to allow continued ACEi/ARB/MRA therapy
6. Dietary counseling: high-potassium foods to moderate (bananas, oranges, tomatoes, potatoes)
7. Hypokalemia in CKD: causes (diuretics, GI losses), replacement strategies

SODIUM:
8. Hyponatremia: SIADH, heart failure, cirrhosis — management in CKD context
9. Sodium restriction: target <2g/day for blood pressure and volume management

BICARBONATE:
10. Metabolic acidosis in CKD: target serum bicarb ≥22 mEq/L
11. Sodium bicarbonate supplementation: 650-1300mg TID, monitoring
12. Benefits of acidosis correction: slowing CKD progression, reducing muscle wasting
13. Veverimer (potential future option) for metabolic acidosis

MONITORING:
14. BMP frequency by CKD stage: minimum every 3-6 months CKD 3, every 1-3 months CKD 4-5""",
    "diabetes": """Write a comprehensive clinical reference on DIABETES MANAGEMENT IN CKD covering:
1. KDIGO 2022 Diabetes-CKD guideline key recommendations
2. A1c targets in CKD:
   - Generally <7% (individualize)
   - Avoid <6.5% if high hypoglycemia risk
   - A1c may be unreliable in advanced CKD (shortened RBC lifespan) — consider CGM, fructosamine
3. Metformin (Glucophage) in CKD:
   - eGFR ≥45: full dose (up to 2000mg)
   - eGFR 30-44: reduce to max 1000mg, monitor more frequently
   - eGFR <30: discontinue
   - Lactic acidosis risk: hold for contrast, surgery, acute illness
4. SGLT2 inhibitors: primary kidney-protective agents in DKD (cross-reference SGLT2 domain)
5. GLP-1 receptor agonists: second-line after SGLT2i for kidney/CV protection (cross-reference GLP-1 domain)
6. Insulin management in CKD:
   - Reduced clearance → lower insulin requirements as eGFR declines
   - Reduce dose by 25% when eGFR 10-50, by 50% when eGFR <10
   - Hypoglycemia risk increases with declining kidney function
7. DPP-4 inhibitors: dose adjustments by eGFR (sitagliptin, saxagliptin, linagliptin exception — no adjustment)
8. Sulfonylureas: AVOID glipizide/glyburide in advanced CKD (hypoglycemia risk)
9. Diabetic kidney disease screening: annual UACR + eGFR starting at diagnosis (T2DM) or after 5 years (T1DM)
10. Multifactorial risk management: BP, lipids, proteinuria, weight — not just glucose
11. Patient education: hypoglycemia recognition, sick day rules, CGM benefits
12. ICD-10 coding: E11.65 (T2DM with hyperglycemia), E11.22 (DKD), N18.x (CKD stage)""",
    "statins_lipids": """Write a comprehensive clinical reference on LIPID MANAGEMENT IN CKD covering:
1. KDIGO 2024 Lipid guideline recommendations for CKD
2. Statin initiation:
   - CKD stages 1-4 (non-dialysis): statin or statin/ezetimibe recommended (SHARP trial)
   - Age ≥50 with CKD: initiate statin regardless of LDL
   - Age 18-49 with CKD: initiate if diabetes, known CVD, estimated 10-year CV risk >10%
   - Dialysis patients: do NOT initiate statin (no benefit in 4D, AURORA trials), but continue if already on one
3. Preferred statins in CKD:
   - Atorvastatin (Lipitor) 20-80mg — no dose adjustment needed, not removed by dialysis
   - Rosuvastatin (Crestor) 5-20mg — start low in severe CKD (eGFR <30: max 10mg)
4. Statin + Ezetimibe: combination for additional LDL lowering (IMPROVE-IT)
5. PCSK9 inhibitors:
   - Repatha (evolocumab) 140mg q2wk or 420mg monthly SC — FOURIER trial
   - Leqvio (inclisiran) 284mg SC at 0, 3 months, then q6 months — ORION trials, convenient dosing
   - Indications: statin-intolerant, or LDL not at goal despite maximized statin+ezetimibe
6. Bempedoic acid (Nexletol): option for statin-intolerant patients, CLEAR trial
7. LDL targets: no specific CKD target in KDIGO (treat-to-fire approach), but ACC/AHA suggests <70 for very high risk
8. Monitoring: lipid panel at baseline, 6-12 weeks after starting, then annually
9. Statin safety in CKD: myopathy risk (especially with cyclosporine interaction in transplant)
10. Transplant considerations: statin-cyclosporine interaction, pravastatin/fluvastatin preferred
11. Patient education: lifetime therapy, muscle pain reporting, liver function
12. Prior authorization tips for PCSK9 inhibitors""",
    "nsaid_ppi_avoidance": """Write a comprehensive clinical reference on NEPHROTOXIN AVOIDANCE IN CKD covering:

NSAIDs:
1. Mechanism of kidney injury: afferent arteriole vasoconstriction → reduced GFR
2. Risk factors: CKD, dehydration, concurrent RAAS blockade, heart failure, elderly
3. ALL NSAIDs are nephrotoxic: ibuprofen, naproxen, diclofenac, celecoxib, meloxicam — NO safe NSAID in CKD
4. Topical NSAIDs (diclofenac gel): lower systemic exposure but still use with caution
5. Safe alternatives for pain:
   - Acetaminophen (Tylenol) up to 2g/day in CKD (first-line)
   - Topical lidocaine, capsaicin
   - Low-dose tramadol (with caution, dose adjust for eGFR)
   - Physical therapy, heat/ice
   - Duloxetine for chronic pain
6. Acute NSAID exposure management: hydration, hold RAAS blockade temporarily, monitor creatinine

PPIs:
7. Chronic PPI use and kidney risk: acute interstitial nephritis, CKD progression (observational data)
8. PPIs to be aware of: omeprazole, pantoprazole, lansoprazole, esomeprazole
9. Risk mitigation: use lowest effective dose, reassess need regularly, consider H2 blockers
10. When PPIs ARE appropriate: Barrett's, severe GERD, GI bleeding prophylaxis on dual antiplatelet

CONTRAST:
11. Contrast-induced AKI: risk factors, prevention with IV hydration
12. Hold metformin before/after contrast, resume when creatinine stable

OTHER NEPHROTOXINS:
13. Aminoglycosides, vancomycin monitoring, lithium levels, tenofovir
14. Herbal supplements: avoid in CKD (variable content, kidney injury reports)
15. Patient education: check with nephrologist before ANY new OTC medication""",
    "smoking_cessation": """Write a comprehensive clinical reference on SMOKING CESSATION IN CKD covering:
1. Impact of smoking on CKD: accelerated GFR decline, increased proteinuria, cardiovascular risk
2. USPSTF recommendation: ask, advise, assess, assist, arrange (5 As)
3. Pharmacotherapy first-line:
   - Chantix (varenicline) 0.5mg daily x3d → 0.5mg BID x4d → 1mg BID x12wk
     - CKD dosing: eGFR <30: max 0.5mg BID
     - Most effective single agent (OR 2.9 vs placebo)
   - Wellbutrin/Zyban (bupropion SR) 150mg daily x3d → 150mg BID x7-12wk
     - CKD dosing: reduce frequency in eGFR <30
   - Combination: varenicline + NRT may be more effective than either alone
4. Nicotine Replacement Therapy (NRT):
   - Patch (7/14/21mg), gum, lozenge, inhaler, nasal spray
   - No dose adjustment for CKD
   - Can combine patch (baseline) + short-acting (breakthrough)
5. E-cigarettes: NOT recommended as cessation aid — unknown long-term kidney effects
6. Behavioral counseling: quitlines (1-800-QUIT-NOW), motivational interviewing
7. Relapse prevention: most quit attempts fail 2-3 times before success — normalize this
8. Documentation: ICD-10 F17.210 (nicotine dependence, cigarettes), Z87.891 (history of tobacco use)
9. Billing: 99406/99407 for counseling (3-10 min / >10 min), G0436/G0437 for Medicare
10. Patient education: kidney-specific benefits of quitting, timeline of improvement""",
    "gout_uric_acid": """Write a comprehensive clinical reference on GOUT AND URIC ACID MANAGEMENT IN CKD covering:
1. Gout prevalence in CKD: 5x higher than general population, increases with declining eGFR
2. ACR 2020 Gout guideline key recommendations
3. Acute flare management in CKD:
   - Colchicine (Colcrys): 1.2mg then 0.6mg 1hr later; CKD dose: 0.3mg if eGFR <30, avoid in dialysis
   - Corticosteroids: prednisone 30-40mg x5-7d (preferred in advanced CKD)
   - NSAIDs: AVOID in CKD (cross-reference NSAID domain)
   - IL-1 inhibitors: anakinra for refractory flares
4. Urate-lowering therapy (ULT):
   - Allopurinol (Zyloprim): start 100mg daily (50mg if eGFR <30), titrate by 50-100mg q2-4wk to target uric acid <6 mg/dL
   - Febuxostat (Uloric) 40-80mg: alternative if allopurinol intolerant, NO dose adjustment for CKD
     - CARES trial cardiovascular concern — use as second-line
   - Target: serum uric acid <6 mg/dL (some experts target <5 in tophaceous gout)
5. Krystexxa (pegloticase): 8mg IV q2wk
   - Indication: refractory chronic gout failing oral ULT
   - Immunomodulation co-therapy (methotrexate) to reduce antibody formation — MIRROR trial
   - Infusion reactions: premedicate, monitor
   - Contraindication: G6PD deficiency
6. Flare prophylaxis during ULT initiation: low-dose colchicine 0.3-0.6mg daily x3-6 months
7. Dietary modifications: limit purines (organ meats, shellfish, beer), encourage hydration, dairy
8. Relationship between uric acid and CKD progression: controversial, no ULT for asymptomatic hyperuricemia
9. Drug interactions: allopurinol + azathioprine (dangerous — reduce AZA dose 75%)
10. Patient education: ULT is lifelong, flares may worsen initially (that's expected), hydration""",
    "transplant_immunosuppression": """Write a comprehensive clinical reference on KIDNEY TRANSPLANT IMMUNOSUPPRESSION covering:
1. KDIGO Transplant guidelines framework

INDUCTION:
2. High immunologic risk: Thymoglobulin (rATG) 1.5mg/kg x3-5 doses
3. Low immunologic risk: Simulect (basiliximab) 20mg on days 0 and 4
4. Methylprednisolone: 500mg IV intraop, taper to oral prednisone

MAINTENANCE (Triple Therapy):
5. Prograf (tacrolimus):
   - Trough targets: 8-12 ng/mL months 1-3, 6-10 months 3-6, 5-8 after 6 months
   - Envarsus XR (extended-release tacrolimus): once-daily alternative, similar targets
   - Drug interactions: CYP3A4 (azole antifungals, macrolides, grapefruit)
   - Side effects: nephrotoxicity, tremor, diabetes (NODAT), hypertension
6. CellCept (mycophenolate mofetil) 1000mg BID or Myfortic (mycophenolic acid) 720mg BID:
   - GI side effects: dose reduce before discontinuing
   - Teratogenic — absolute contraindication in pregnancy
   - Monitor: CBC for leukopenia
7. Prednisone: 20mg daily tapering to 5mg daily by month 3-6
   - Steroid-free protocols: higher rejection risk but fewer metabolic side effects

ALTERNATIVE AGENTS:
8. Sirolimus/Everolimus (mTOR inhibitors): wound healing issues, proteinuria, mouth ulcers
   - Use case: CNI-sparing protocols, skin cancer history
9. Belatacept (Nulojix): monthly IV, CNI-free option — BENEFIT trial
   - Contraindication: EBV-seronegative recipients (PTLD risk)

MONITORING:
10. Drug levels, DSA monitoring, protocol biopsies (center-dependent)
11. Infection prophylaxis: valganciclovir (CMV), TMP-SMX (PJP), nystatin (candida)
12. Rejection: acute cellular vs antibody-mediated — biopsy-driven treatment
13. Long-term: cancer screening (skin, cervical), bone health, cardiovascular risk management
14. Patient education: medication adherence is CRITICAL, sun protection, avoid live vaccines""",
    "gn_immunosuppression": """Write a comprehensive clinical reference on GLOMERULONEPHRITIS IMMUNOSUPPRESSION covering:
1. KDIGO 2021 GN guideline framework — treat based on specific histologic diagnosis

IgA NEPHROPATHY:
2. Supportive care first: maximize RAAS blockade, SGLT2i, BP <120/80
3. Sparsentan (Filspari): dual endothelin/angiotensin receptor antagonist — PROTECT trial, first disease-specific therapy
4. Corticosteroids: TESTING trial (reduced-dose methylprednisolone + pred), only if progressive disease despite supportive care
5. Targeted-release budesonide (Tarpeyo/Nefecon): NEFIGARD trial, gut-targeted, less systemic steroid effects

MEMBRANOUS NEPHROPATHY:
6. Anti-PLA2R antibody-guided treatment: monitor levels for prognosis and response
7. Rituxan (rituximab) 1g x2 doses (days 1 and 15): first-line per MENTOR trial — non-inferior to cyclosporine with better sustained remission
8. Cyclophosphamide-based regimens: modified Ponticelli (alternating with steroids) — effective but more toxicity
9. Calcineurin inhibitors: tacrolimus or cyclosporine as alternative (high relapse rate)

LUPUS NEPHRITIS (Class III-V):
10. Induction: Mycophenolate (CellCept) 2-3g/day OR IV cyclophosphamide (Euro-Lupus protocol)
11. Voclosporin (Lupkynis) 23.7mg BID + mycophenolate + low-dose steroids — AURORA trial: improved renal response
12. Belimumab (Benlysta) add-on: BLISS-LN trial, reduced renal flares
13. Maintenance: mycophenolate (preferred) or azathioprine

ANCA VASCULITIS:
14. Induction: rituximab (RAVE trial) OR cyclophosphamide + steroids
15. Avacopan (Tavneos): C5a receptor inhibitor, ADVOCATE trial — steroid-sparing
16. Maintenance: rituximab q6 months (MAINRITSAN) — superior to azathioprine
17. Plasma exchange: reserved for severe pulmonary hemorrhage or dialysis-dependent GN (PEXIVAS)

FSGS:
18. Primary FSGS: high-dose steroids (prednisone 1mg/kg x4-16 weeks) — partial response rates vary
19. Calcineurin inhibitors: tacrolimus or cyclosporine for steroid-resistant/dependent
20. Rituximab: emerging data for steroid-dependent FSGS

GENERAL MONITORING:
21. Infection screening: Hepatitis B/C, TB, HIV before immunosuppression
22. Vaccination: update BEFORE starting immunotherapy (avoid live vaccines after)
23. Monitoring: CBC, CMP, urinalysis, quantitative immunoglobulins, infection surveillance""",
    "general": """Write a comprehensive clinical reference on GENERAL CKD MANAGEMENT covering:
1. CKD staging by eGFR and albuminuria (KDIGO heat map):
   - G1: ≥90, G2: 60-89, G3a: 45-59, G3b: 30-44, G4: 15-29, G5: <15
   - A1: <30 mg/g, A2: 30-300 mg/g, A3: >300 mg/g
2. eGFR calculation: CKD-EPI 2021 (race-free equation)
3. When to refer to nephrology:
   - eGFR <30 (G4-5)
   - UACR >300 persistently
   - Rapid eGFR decline (>5 ml/min/year)
   - Unexplained hematuria with proteinuria
   - Refractory hypertension (≥3 agents)
   - Hereditary kidney disease suspicion
   - Electrolyte abnormalities (refractory hyperkalemia, metabolic acidosis)
4. Blood pressure targets: KDIGO 2024 target <120 systolic (if tolerated) — SPRINT-CKD data
5. Lifestyle modifications: sodium <2g/day, protein 0.8g/kg/day (non-dialysis), exercise, weight management
6. AKI in CKD: recognition, prevention, recovery monitoring
7. CKD progression monitoring: eGFR slope, proteinuria trends
8. Dialysis preparation: when to discuss (eGFR <20), access planning (eGFR <15-20), modality education
9. Conservative management option: for elderly/comorbid patients who decline dialysis
10. Preventive care in CKD: vaccinations (flu, pneumonia, COVID, Hep B), cancer screening
11. Medication dose adjustments: general principles for GFR-based dosing
12. ICD-10 coding: N18.1-N18.6 (CKD stages), N18.9 (unspecified), Z94.0 (kidney transplant status)
13. CKD quality metrics: NQF, MIPS measures for nephrology""",
}


def generate_domain_content(domain: str, prompt: str) -> str:
    """Generate content for a single domain using Gemini 3.1 Pro."""
    client = genai.Client(api_key=settings.gemini_api_key)

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.3,
            max_output_tokens=8192,
        ),
    )

    return response.text


@click.command()
@click.option("--domain", type=str, help="Generate content for a specific domain only")
@click.option("--dry-run", is_flag=True, help="Show prompts without generating")
@click.option("--delay", type=float, default=5.0, help="Delay between API calls (seconds)")
def main(domain: str | None, dry_run: bool, delay: float):
    """Generate clinical reference content for TKE Knowledge Base."""
    console.print("[bold]TKE Knowledge Base — Content Generation[/bold]\n")
    console.print(f"Model: {settings.gemini_model}")
    console.print(f"Output: {PROTOCOLS_DIR}\n")

    PROTOCOLS_DIR.mkdir(parents=True, exist_ok=True)

    domains = DOMAIN_PROMPTS
    if domain:
        if domain not in domains:
            console.print(f"[red]Unknown domain: {domain}[/red]")
            console.print(f"Available: {', '.join(domains.keys())}")
            sys.exit(1)
        domains = {domain: domains[domain]}

    console.print(f"Generating content for {len(domains)} domains\n")

    for i, (domain_key, prompt) in enumerate(domains.items(), 1):
        console.print(f"[bold cyan]{'=' * 60}[/bold cyan]")
        console.print(f"[bold]Domain {i}/{len(domains)}: {domain_key}[/bold]")

        output_path = PROTOCOLS_DIR / f"{domain_key}.md"

        if dry_run:
            console.print(f"  Prompt length: {len(prompt)} chars")
            console.print(f"  Would save to: {output_path}")
            continue

        try:
            console.print("  Generating with Gemini 3.1 Pro...")
            content = generate_domain_content(domain_key, prompt)

            # Add metadata header
            header = f"""---
domain: {domain_key}
generated_by: {settings.gemini_model}
generated_date: {time.strftime("%Y-%m-%d")}
status: pending_review
reviewer: Dr. Mulay
---

"""
            full_content = header + content

            output_path.write_text(full_content)
            console.print(f"  [green]Saved: {output_path} ({len(content)} chars)[/green]")

        except Exception as e:
            console.print(f"  [red]Error: {e}[/red]")

        # Rate limiting
        if i < len(domains) and not dry_run:
            console.print(f"  [dim]Waiting {delay}s for rate limit...[/dim]")
            time.sleep(delay)

    console.print(f"\n[bold green]Content generation complete![/bold green]")
    console.print(f"Files saved to: {PROTOCOLS_DIR}")
    console.print("\nNext steps:")
    console.print("  1. Review generated content for accuracy")
    console.print("  2. Run ingestion: python scripts/ingest_protocols.py")


if __name__ == "__main__":
    main()
