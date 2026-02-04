/**
 * SGLT2 Inhibitor Specialist Agent
 * Manages SGLT2i therapy for CKD patients
 * Section: sglt2i
 * Guidelines: KDIGO 2024, DAPA-CKD, EMPA-KIDNEY, CREDENCE
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
 * SGLT2i Specialist Agent
 * Deep expertise in SGLT2 inhibitor management for CKD
 */
export const sglt2iSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract SGLT2i-specific fields
  const sglt2iStatus = getField<string>(currentData, "sglt2i", "sglt2i_status")
  const sglt2iDrugDose = getField<string>(currentData, "sglt2i", "sglt2i_drug_dose")
  const notOnReason = getField<string>(currentData, "sglt2i", "not_on_reason")
  const initialEgfrDipDocumented = getField<boolean>(currentData, "sglt2i", "initial_egfr_dip_documented")
  const sickDayRulesReviewed = getField<boolean>(currentData, "sglt2i", "sick_day_rules_reviewed")

  // Patient context
  const egfr = patientContext.currentEgfr
  const isDiabetic = patientContext.isDiabetic
  const ckdStage = patientContext.ckdStage

  // Previous data for comparison
  const prevEgfr = getField<number>(previousData, "kidney_function", "egfr_current")

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (sglt2iStatus) citations.push({ fieldId: "sglt2i_status", value: sglt2iStatus, source: "provider" })
  if (sglt2iDrugDose) citations.push({ fieldId: "sglt2i_drug_dose", value: sglt2iDrugDose, source: "med_list" })

  if (sglt2iStatus === "on") {
    interpretation = `SGLT2i: on therapy`
    if (sglt2iDrugDose) interpretation += ` (${sglt2iDrugDose})`
    interpretation += "."

    // Check for initial eGFR dip (expected, hemodynamic)
    if (prevEgfr !== undefined && egfr !== undefined) {
      const egfrChange = egfr - prevEgfr
      const percentChange = (egfrChange / prevEgfr) * 100

      if (percentChange < -10 && percentChange >= -30) {
        if (!initialEgfrDipDocumented) {
          interpretation += ` Initial eGFR dip of ${Math.abs(percentChange).toFixed(0)}% observed - expected hemodynamic effect.`
          actionItems.push(createActionItem(
            "Document initial SGLT2i eGFR dip as expected hemodynamic effect (DAPA-CKD, EMPA-KIDNEY)",
            "routine",
            "provider"
          ))
        } else {
          interpretation += " Initial eGFR dip documented."
        }
      } else if (percentChange < -30) {
        interpretation += ` Significant eGFR decline ${Math.abs(percentChange).toFixed(0)}% - exceeds expected dip.`
        alerts.push(createAlert(
          "sglt2i",
          "initial_egfr_dip_documented",
          `eGFR decline ${Math.abs(percentChange).toFixed(0)}% exceeds expected SGLT2i dip - evaluate`,
          "high"
        ))
        actionItems.push(createActionItem(
          "Evaluate excessive eGFR decline - consider volume depletion, concurrent nephrotoxins",
          "urgent",
          "provider"
        ))
        confidence = 0.75
      }
    }

    // Sick day rules
    if (!sickDayRulesReviewed) {
      alerts.push(createAlert(
        "sglt2i",
        "sick_day_rules_reviewed",
        "Sick day rules not reviewed this visit for patient on SGLT2i",
        "medium"
      ))
      actionItems.push(createActionItem(
        "Review sick day rules: hold SGLT2i during acute illness (vomiting, diarrhea, dehydration)",
        "routine",
        "nurse"
      ))
    } else {
      interpretation += " Sick day rules reviewed."
    }

    // DKA risk counseling for diabetics
    if (isDiabetic) {
      actionItems.push(createActionItem(
        "Ensure euglycemic DKA awareness documented for diabetic patient on SGLT2i",
        "optional",
        "provider"
      ))
    }

    // Check for UTI/genital infection history
    const recentInfection = getField<boolean>(currentData, "sglt2i", "recent_gti")
    if (recentInfection) {
      interpretation += " History of genital tract infection on SGLT2i."
      actionItems.push(createActionItem(
        "Counsel on genital hygiene and infection prevention with SGLT2i",
        "routine",
        "nurse"
      ))
    }

  } else if (sglt2iStatus === "not_on" || !sglt2iStatus) {
    interpretation = `SGLT2i: not on therapy`
    if (notOnReason) {
      interpretation += ` (${notOnReason}).`
    } else {
      interpretation += "."
    }

    // Eligibility assessment per KDIGO 2024
    if (egfr !== undefined) {
      if (egfr >= 20) {
        // Eligible for initiation
        interpretation += ` eGFR ${egfr} - eligible for SGLT2i initiation.`
        
        if (!notOnReason || notOnReason === "not_evaluated") {
          const priority = egfr >= 25 ? "urgent" : "routine"
          actionItems.push(createActionItem(
            `Initiate SGLT2i - indicated for CKD with eGFR >= 20 (DAPA-CKD, EMPA-KIDNEY evidence)`,
            priority,
            "provider"
          ))
          
          // Specific drug recommendations
          if (isDiabetic) {
            actionItems.push(createActionItem(
              "Consider dapagliflozin 10mg or empagliflozin 10mg (both FDA-approved for DKD)",
              "optional",
              "provider"
            ))
          } else {
            actionItems.push(createActionItem(
              "Consider dapagliflozin 10mg (FDA-approved for CKD regardless of diabetes)",
              "optional",
              "provider"
            ))
          }
        }
      } else if (egfr >= 15 && egfr < 20) {
        interpretation += ` eGFR ${egfr} - below standard initiation threshold but may continue if already on therapy.`
        actionItems.push(createActionItem(
          "SGLT2i initiation not recommended at eGFR < 20 - document reason for not starting",
          "optional",
          "provider"
        ))
      } else {
        interpretation += ` eGFR ${egfr} - below SGLT2i initiation threshold.`
      }
    }

    // Address specific barriers
    if (notOnReason === "cost") {
      actionItems.push(createActionItem(
        "Explore SGLT2i patient assistance programs or generic options",
        "routine",
        "coordinator"
      ))
    } else if (notOnReason === "recurrent_uti" || notOnReason === "recurrent_gti") {
      interpretation += " Recurrent infections may be manageable with proper counseling."
      actionItems.push(createActionItem(
        "Re-evaluate SGLT2i candidacy with infection prevention counseling",
        "optional",
        "provider"
      ))
    }

  } else if (sglt2iStatus === "contraindicated") {
    interpretation = `SGLT2i contraindicated`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."
    confidence = 0.85

  } else if (sglt2iStatus === "intolerant") {
    interpretation = `SGLT2i intolerant`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."

    // Consider alternative SGLT2i
    if (notOnReason && !notOnReason.includes("class effect")) {
      actionItems.push(createActionItem(
        "Consider trial of alternative SGLT2i if intolerance was drug-specific",
        "optional",
        "provider"
      ))
    }
  }

  // Cross-reference with heart failure
  const hfType = getField<string>(currentData, "heart_failure", "hf_type")
  if (hfType && hfType !== "None" && sglt2iStatus !== "on") {
    interpretation += " Note: SGLT2i also indicated for heart failure."
    actionItems.push(createActionItem(
      "SGLT2i indicated for both CKD and HF - prioritize initiation",
      "urgent",
      "provider"
    ))
  }

  // Patient education
  const patientEducation = generatePatientEducation(sglt2iStatus, isDiabetic)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
    (sglt2iStatus !== "on" && egfr !== undefined && egfr >= 20 && !notOnReason) ||
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
  isDiabetic: boolean | undefined
): string {
  let education = ""

  if (status === "on") {
    education = "Your SGLT2 inhibitor medication is one of the most important medications for protecting your kidneys. "
    education += "It works by reducing pressure in your kidneys and has been shown to slow kidney disease progression. "
    education += "IMPORTANT: If you become sick with vomiting, diarrhea, or cannot eat/drink, STOP this medication and call us. "
    education += "You may restart once you are eating and drinking normally. "
    
    if (isDiabetic) {
      education += "This medication also helps with blood sugar control. Watch for signs of low blood sugar if you take other diabetes medications. "
    }
    
    education += "Drink plenty of water and practice good hygiene to prevent urinary or genital infections."
  } else {
    education = "SGLT2 inhibitors are newer medications that have been shown to protect your kidneys and slow kidney disease progression. "
    education += "We will discuss whether this medication is right for you based on your kidney function and other health conditions."
  }

  return education
}

export const sglt2iSpecialistAgentMeta = {
  agentId: "sglt2i_specialist_agent",
  displayName: "SGLT2 Inhibitor Specialist",
  sectionsOwned: ["sglt2i"],
  guidelines: [
    "KDIGO 2024 CKD Management",
    "DAPA-CKD Trial",
    "EMPA-KIDNEY Trial",
    "CREDENCE Trial",
  ],
  confidenceThreshold: 0.8,
}
