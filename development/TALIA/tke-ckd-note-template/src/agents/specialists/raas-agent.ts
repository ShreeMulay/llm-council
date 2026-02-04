/**
 * RAAS Inhibition Specialist Agent
 * Manages ACEi/ARB/ARNi therapy for CKD patients
 * Section: raas
 * Guidelines: KDIGO 2024, ONTARGET, ALTITUDE, CREDENCE
 */

import type { AgentInput, AgentOutput, AgentFunction, ActionItem } from "../types"
import {
  createAlert,
  createActionItem,
  getField,
  CONFIDENCE_THRESHOLDS,
} from "../types"
import type { Alert } from "../../types/schema"

/**
 * RAAS Specialist Agent
 * Deep expertise in RAAS inhibitor management for CKD
 */
export const raasSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract RAAS-specific fields
  const raasStatus = getField<string>(currentData, "raas", "raas_status")
  const raasDrugDose = getField<string>(currentData, "raas", "raas_drug_dose")
  const atMaxDose = getField<boolean>(currentData, "raas", "at_max_dose")
  const notOnReason = getField<string>(currentData, "raas", "not_on_reason")
  const crRiseSinceStart = getField<number>(currentData, "raas", "cr_rise_since_start")
  const kOnTherapy = getField<number>(currentData, "raas", "k_on_therapy")

  // Patient context
  const egfr = patientContext.currentEgfr
  const uacr = patientContext.currentUacr
  const albuminuriaStage = patientContext.albuminuriaStage
  const isDiabetic = patientContext.isDiabetic

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (raasStatus) citations.push({ fieldId: "raas_status", value: raasStatus, source: "provider" })
  if (raasDrugDose) citations.push({ fieldId: "raas_drug_dose", value: raasDrugDose, source: "med_list" })
  if (crRiseSinceStart !== undefined) citations.push({ fieldId: "cr_rise_since_start", value: crRiseSinceStart, source: "calculated" })
  if (kOnTherapy !== undefined) citations.push({ fieldId: "k_on_therapy", value: kOnTherapy, source: "labs_api" })

  // Status-based interpretation
  if (raasStatus === "on_acei" || raasStatus === "on_arb" || raasStatus === "on_arni") {
    const agentType = raasStatus.replace("on_", "").toUpperCase()
    interpretation = `On RAAS inhibition: ${agentType}`
    if (raasDrugDose) interpretation += ` (${raasDrugDose})`
    interpretation += "."

    // Dose optimization assessment
    if (!atMaxDose) {
      interpretation += " Not at maximum tolerated dose."
      
      // Check if uptitration is appropriate
      if (egfr !== undefined && egfr > 20 && (kOnTherapy === undefined || kOnTherapy < 5.5)) {
        if (albuminuriaStage === "A2" || albuminuriaStage === "A3") {
          interpretation += " Candidate for dose optimization given proteinuria."
          actionItems.push(createActionItem(
            "Uptitrate RAAS inhibitor to maximum tolerated dose for proteinuria reduction",
            "routine",
            "provider",
            raasDrugDose
          ))
        } else {
          actionItems.push(createActionItem(
            "Consider uptitrating RAAS inhibitor to maximum tolerated dose",
            "optional",
            "provider",
            raasDrugDose
          ))
        }
      }
    } else {
      interpretation += " At maximum tolerated dose."
    }

    // Creatinine rise monitoring (KDIGO: up to 30% acceptable)
    if (crRiseSinceStart !== undefined) {
      if (crRiseSinceStart > 30) {
        interpretation += ` Creatinine rise ${crRiseSinceStart.toFixed(0)}% since initiation warrants evaluation.`
        alerts.push(createAlert(
          "raas",
          "cr_rise_since_start",
          `Cr rise >${crRiseSinceStart.toFixed(0)}% on RAAS inhibitor - evaluate for RAS, dehydration, or excessive diuresis`,
          "high"
        ))
        actionItems.push(createActionItem(
          "Evaluate excessive Cr rise: consider renal artery stenosis, volume depletion, concurrent nephrotoxins",
          "urgent",
          "provider"
        ))
        confidence = 0.75
      } else if (crRiseSinceStart > 20) {
        interpretation += ` Creatinine rise ${crRiseSinceStart.toFixed(0)}% - within acceptable range but monitor closely.`
      }
    }

    // Potassium monitoring
    if (kOnTherapy !== undefined) {
      if (kOnTherapy >= 6.0) {
        interpretation += ` Potassium ${kOnTherapy} mEq/L - severe hyperkalemia.`
        alerts.push(createAlert(
          "raas",
          "k_on_therapy",
          `Severe hyperkalemia (K+ ${kOnTherapy}) on RAAS inhibitor - urgent management required`,
          "critical"
        ))
        actionItems.push(createActionItem(
          "Urgent hyperkalemia management - consider RAAS dose reduction or hold",
          "urgent",
          "provider"
        ))
        confidence = 0.7
      } else if (kOnTherapy > 5.5) {
        interpretation += ` Potassium ${kOnTherapy} mEq/L elevated on therapy.`
        alerts.push(createAlert(
          "raas",
          "k_on_therapy",
          `Hyperkalemia (K+ ${kOnTherapy}) on RAAS inhibitor`,
          "high"
        ))
        actionItems.push(createActionItem(
          "Consider potassium binder (Lokelma, Veltassa) to enable RAAS continuation",
          "routine",
          "provider"
        ))
      } else if (kOnTherapy > 5.0) {
        interpretation += ` Potassium ${kOnTherapy} mEq/L - borderline, monitor closely.`
        actionItems.push(createActionItem(
          "Monitor potassium closely - consider dietary counseling",
          "optional",
          "nurse"
        ))
      }
    }

    // ARNI consideration for HFrEF
    const hfType = getField<string>(currentData, "heart_failure", "hf_type")
    const lvef = getField<number>(currentData, "heart_failure", "lvef")
    if (raasStatus !== "on_arni" && hfType === "HFrEF" && lvef !== undefined && lvef < 40) {
      actionItems.push(createActionItem(
        "Consider ARNI (sacubitril/valsartan) for HFrEF - superior to ACEi/ARB per PARADIGM-HF",
        "routine",
        "provider"
      ))
    }

    // Dual RAAS blockade warning
    const mraStatus = getField<string>(currentData, "mra", "mra_status")
    if (mraStatus?.startsWith("on_") && kOnTherapy !== undefined && kOnTherapy > 5.0) {
      alerts.push(createAlert(
        "raas",
        "k_on_therapy",
        "Dual RAAS blockade (RAAS + MRA) with elevated K+ - close monitoring required",
        "medium"
      ))
    }

  } else if (raasStatus === "not_on") {
    interpretation = `Not on RAAS inhibitor`
    if (notOnReason) {
      interpretation += `: ${notOnReason}.`
    } else {
      interpretation += " - reason not documented."
      confidence = 0.7
    }

    // Evaluate for initiation
    if (egfr !== undefined && egfr > 20) {
      if (albuminuriaStage === "A2" || albuminuriaStage === "A3") {
        interpretation += " RAAS inhibitor indicated for proteinuria."
        actionItems.push(createActionItem(
          "Initiate RAAS inhibitor - first-line therapy for CKD with proteinuria (KDIGO 2024)",
          "urgent",
          "provider"
        ))
      } else if (isDiabetic) {
        interpretation += " Consider RAAS inhibitor for diabetic kidney protection."
        actionItems.push(createActionItem(
          "Consider RAAS inhibitor for diabetic nephropathy prevention",
          "routine",
          "provider"
        ))
      }
    } else if (egfr !== undefined && egfr <= 20) {
      interpretation += " eGFR < 20 - initiation requires careful consideration."
    }

  } else if (raasStatus === "contraindicated") {
    interpretation = `RAAS inhibitor contraindicated`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."
    
    // Document alternative strategies
    actionItems.push(createActionItem(
      "Document alternative proteinuria reduction strategy given RAAS contraindication",
      "optional",
      "provider"
    ))

  } else if (raasStatus === "intolerant") {
    interpretation = `RAAS inhibitor intolerant`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."

    // Suggest alternatives
    if (notOnReason?.includes("cough") || notOnReason?.includes("ACEi")) {
      actionItems.push(createActionItem(
        "Consider ARB trial - ACEi cough does not predict ARB intolerance",
        "routine",
        "provider"
      ))
    } else if (notOnReason?.includes("angioedema")) {
      interpretation += " Angioedema history - ARB relatively contraindicated."
    }
  }

  // Patient education
  const patientEducation = generatePatientEducation(raasStatus, atMaxDose, kOnTherapy)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
    (crRiseSinceStart !== undefined && crRiseSinceStart > 30) ||
    (kOnTherapy !== undefined && kOnTherapy > 5.5) ||
    confidence < CONFIDENCE_THRESHOLDS.REVIEW_SUGGESTED

  return {
    interpretation,
    actionItems,
    confidence: Math.max(0.3, confidence),
    reviewNeeded,
    alerts,
    patientEducation,
    citations,
  }
}

function generatePatientEducation(
  status: string | undefined,
  atMaxDose: boolean | undefined,
  potassium: number | undefined
): string {
  let education = ""

  if (status?.startsWith("on_")) {
    education = "Your blood pressure medication (ACE inhibitor or ARB) is one of the most important medications for protecting your kidneys. "
    education += "It works by reducing pressure inside your kidneys and decreasing protein leakage. "
    
    if (!atMaxDose) {
      education += "We may gradually increase your dose to get the maximum kidney protection. "
    }
    
    if (potassium !== undefined && potassium > 5.0) {
      education += "We are monitoring your potassium level closely while on this medication. Avoid high-potassium foods like bananas, oranges, and potatoes. "
    }
    
    education += "If you become sick with vomiting or diarrhea, contact us about temporarily holding this medication."
  } else {
    education = "ACE inhibitors and ARBs are important medications that protect your kidneys by reducing pressure and protein leakage. "
    education += "We will discuss whether this medication is right for you."
  }

  return education
}

export const raasSpecialistAgentMeta = {
  agentId: "raas_specialist_agent",
  displayName: "RAAS Inhibition Specialist",
  sectionsOwned: ["raas"],
  guidelines: [
    "KDIGO 2024 CKD Management",
    "ONTARGET Trial",
    "ALTITUDE Trial",
    "PARADIGM-HF Trial",
  ],
  confidenceThreshold: 0.8,
}
