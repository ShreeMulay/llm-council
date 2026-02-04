/**
 * MRA/Finerenone Specialist Agent
 * Manages mineralocorticoid receptor antagonist therapy for CKD
 * Section: mra
 * Guidelines: KDIGO 2024, FIDELIO-DKD, FIGARO-DKD, FIDELITY
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
 * MRA Specialist Agent
 * Deep expertise in MRA/finerenone management for CKD
 */
export const mraSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract MRA-specific fields
  const mraStatus = getField<string>(currentData, "mra", "mra_status")
  const mraDrugDose = getField<string>(currentData, "mra", "mra_drug_dose")
  const notOnReason = getField<string>(currentData, "mra", "not_on_reason")
  const kMonitoringSchedule = getField<string>(currentData, "mra", "k_monitoring_schedule")
  const potassiumBinder = getField<string>(currentData, "mra", "potassium_binder")

  // Cross-reference potassium from RAAS section or electrolytes
  const kOnTherapy = getField<number>(currentData, "raas", "k_on_therapy") 
    ?? getField<number>(currentData, "electrolytes", "potassium")

  // Patient context
  const egfr = patientContext.currentEgfr
  const uacr = patientContext.currentUacr
  const isDiabetic = patientContext.isDiabetic
  const albuminuriaStage = patientContext.albuminuriaStage

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (mraStatus) citations.push({ fieldId: "mra_status", value: mraStatus, source: "provider" })
  if (mraDrugDose) citations.push({ fieldId: "mra_drug_dose", value: mraDrugDose, source: "med_list" })
  if (kOnTherapy !== undefined) citations.push({ fieldId: "k_on_therapy", value: kOnTherapy, source: "labs_api" })

  if (mraStatus === "on_finerenone") {
    interpretation = `MRA: finerenone`
    if (mraDrugDose) interpretation += ` (${mraDrugDose})`
    interpretation += "."

    // Finerenone-specific monitoring
    // FIDELIO/FIGARO: K+ monitoring at 1 month, then periodically
    if (!kMonitoringSchedule) {
      actionItems.push(createActionItem(
        "Establish potassium monitoring schedule for finerenone (check at 1 month, then q3-6 months)",
        "routine",
        "provider"
      ))
    }

    // Potassium management
    if (kOnTherapy !== undefined) {
      if (kOnTherapy >= 5.5) {
        interpretation += ` Potassium ${kOnTherapy} mEq/L - elevated on finerenone.`
        alerts.push(createAlert(
          "mra",
          "k_on_therapy",
          `Hyperkalemia (K+ ${kOnTherapy}) on finerenone - dose adjustment may be needed`,
          "high"
        ))
        
        if (kOnTherapy >= 6.0) {
          actionItems.push(createActionItem(
            "Hold finerenone for K+ >= 6.0 - restart at lower dose when K+ < 5.0",
            "urgent",
            "provider"
          ))
        } else {
          if (!potassiumBinder) {
            actionItems.push(createActionItem(
              "Consider potassium binder (Lokelma, Veltassa) to enable finerenone continuation",
              "routine",
              "provider"
            ))
          }
          actionItems.push(createActionItem(
            "Consider finerenone dose reduction (20mg -> 10mg) for K+ 5.5-6.0",
            "routine",
            "provider"
          ))
        }
        confidence = 0.75
      } else if (kOnTherapy > 5.0) {
        interpretation += ` Potassium ${kOnTherapy} mEq/L - borderline, close monitoring.`
        actionItems.push(createActionItem(
          "Recheck potassium in 1-2 weeks given borderline elevation on finerenone",
          "routine",
          "nurse"
        ))
      } else {
        interpretation += ` Potassium ${kOnTherapy} mEq/L - well-controlled.`
      }
    }

    // Dose optimization
    if (mraDrugDose?.includes("10") && kOnTherapy !== undefined && kOnTherapy < 4.8) {
      actionItems.push(createActionItem(
        "Consider uptitrating finerenone 10mg to 20mg if K+ stable < 4.8",
        "optional",
        "provider"
      ))
    }

  } else if (mraStatus === "on_spironolactone" || mraStatus === "on_eplerenone") {
    const mraType = mraStatus.replace("on_", "")
    interpretation = `MRA: ${mraType}`
    if (mraDrugDose) interpretation += ` (${mraDrugDose})`
    interpretation += "."

    // Traditional MRA monitoring
    if (kOnTherapy !== undefined && kOnTherapy > 5.0) {
      interpretation += ` Potassium ${kOnTherapy} mEq/L on ${mraType}.`
      if (kOnTherapy > 5.5) {
        alerts.push(createAlert(
          "mra",
          "k_on_therapy",
          `Hyperkalemia (K+ ${kOnTherapy}) on ${mraType} - close monitoring required`,
          "high"
        ))
        if (!potassiumBinder) {
          actionItems.push(createActionItem(
            "Consider potassium binder to enable MRA continuation",
            "routine",
            "provider"
          ))
        }
      }
    }

    // Consider finerenone switch for diabetic CKD
    if (isDiabetic && albuminuriaStage !== "A1") {
      actionItems.push(createActionItem(
        "Consider switching to finerenone for diabetic CKD - superior cardiorenal outcomes (FIDELIO/FIGARO)",
        "optional",
        "provider"
      ))
    }

    // Gynecomastia check for spironolactone
    if (mraStatus === "on_spironolactone") {
      const gynecomastia = getField<boolean>(currentData, "mra", "gynecomastia")
      if (gynecomastia) {
        interpretation += " Gynecomastia reported."
        actionItems.push(createActionItem(
          "Consider switching spironolactone to eplerenone or finerenone for gynecomastia",
          "routine",
          "provider"
        ))
      }
    }

  } else if (mraStatus === "not_on" || !mraStatus) {
    interpretation = `MRA: not on therapy`
    if (notOnReason) {
      interpretation += ` (${notOnReason}).`
    } else {
      interpretation += "."
    }

    // Finerenone candidacy per FIDELIO/FIGARO criteria
    // T2DM + CKD + albuminuria + on max RAAS
    if (isDiabetic) {
      const raasStatus = getField<string>(currentData, "raas", "raas_status")
      const raasAtMaxDose = getField<boolean>(currentData, "raas", "at_max_dose")

      if (raasStatus?.startsWith("on_") && raasAtMaxDose) {
        if (uacr !== undefined && uacr >= 30) {
          if (egfr !== undefined && egfr >= 25) {
            interpretation += " Finerenone candidate per FIDELIO/FIGARO criteria."
            
            if (kOnTherapy === undefined || kOnTherapy <= 4.8) {
              actionItems.push(createActionItem(
                "Initiate finerenone - indicated for T2DM + CKD + albuminuria on max RAAS (FIDELIO/FIGARO)",
                "routine",
                "provider"
              ))
              actionItems.push(createActionItem(
                "Start finerenone 10mg if eGFR < 60, 20mg if eGFR >= 60",
                "optional",
                "provider"
              ))
            } else {
              interpretation += ` Baseline K+ ${kOnTherapy} - optimize before finerenone initiation.`
              actionItems.push(createActionItem(
                "Optimize potassium to <= 4.8 before finerenone initiation",
                "routine",
                "provider"
              ))
            }
          } else if (egfr !== undefined && egfr >= 15) {
            interpretation += " eGFR 15-25 - finerenone may be considered with close monitoring."
          }
        } else if (uacr !== undefined && uacr < 30) {
          interpretation += " UACR < 30 - below finerenone indication threshold."
        }
      } else if (!raasStatus?.startsWith("on_")) {
        interpretation += " Optimize RAAS inhibitor before considering finerenone."
      } else if (!raasAtMaxDose) {
        interpretation += " Uptitrate RAAS to max dose before adding finerenone."
      }
    } else {
      // Non-diabetic - traditional MRA for HF or resistant HTN
      const hfType = getField<string>(currentData, "heart_failure", "hf_type")
      if (hfType === "HFrEF") {
        actionItems.push(createActionItem(
          "Consider spironolactone or eplerenone for HFrEF (RALES, EMPHASIS-HF)",
          "routine",
          "provider"
        ))
      }
    }

  } else if (mraStatus === "contraindicated") {
    interpretation = `MRA contraindicated`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."

  } else if (mraStatus === "intolerant") {
    interpretation = `MRA intolerant`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."

    // Suggest alternatives
    if (notOnReason?.includes("hyperkalemia")) {
      actionItems.push(createActionItem(
        "Consider MRA rechallenge with concurrent potassium binder",
        "optional",
        "provider"
      ))
    }
  }

  // Potassium binder documentation
  if (potassiumBinder) {
    interpretation += ` On potassium binder: ${potassiumBinder}.`
    citations.push({ fieldId: "potassium_binder", value: potassiumBinder, source: "med_list" })
  }

  // Patient education
  const patientEducation = generatePatientEducation(mraStatus, potassiumBinder)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
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
  potassiumBinder: string | undefined
): string {
  let education = ""

  if (status?.startsWith("on_")) {
    if (status === "on_finerenone") {
      education = "Finerenone is a newer medication that helps protect your kidneys and heart. "
      education += "It works differently than your blood pressure medications but also helps reduce protein in your urine. "
    } else {
      education = "Your MRA medication (spironolactone or eplerenone) helps protect your heart and kidneys. "
    }
    
    education += "We monitor your potassium level closely while on this medication because it can cause potassium to rise. "
    education += "Avoid high-potassium foods like bananas, oranges, tomatoes, and potatoes. "
    
    if (potassiumBinder) {
      education += "You are also taking a potassium binder to help keep your potassium level safe. Take it as directed with meals. "
    }
  } else {
    education = "MRA medications like finerenone can provide additional kidney and heart protection for patients with diabetes and kidney disease. "
    education += "We will discuss whether this medication is right for you."
  }

  return education
}

export const mraSpecialistAgentMeta = {
  agentId: "mra_specialist_agent",
  displayName: "MRA/Finerenone Specialist",
  sectionsOwned: ["mra"],
  guidelines: [
    "KDIGO 2024 CKD Management",
    "FIDELIO-DKD Trial",
    "FIGARO-DKD Trial",
    "FIDELITY Analysis",
    "RALES Trial",
    "EMPHASIS-HF Trial",
  ],
  confidenceThreshold: 0.8,
}
