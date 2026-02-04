/**
 * Gout Specialist Agent
 * Manages gout assessment and treatment for CKD patients
 * Section: gout
 * Guidelines: ACR Gout Guidelines, KDIGO 2024
 */

import type { AgentFunction, ActionItem } from "../types"
import {
  createAlert,
  createActionItem,
  getField,
  CONFIDENCE_THRESHOLDS,
} from "../types"
import type { Alert } from "../../types/schema"

/**
 * Gout Specialist Agent
 * Deep expertise in gout management for CKD patients
 */
export const goutSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract gout-specific fields
  const goutHistory = getField<string>(currentData, "gout", "gout_history")
  const uricAcid = getField<number>(currentData, "gout", "uric_acid")
  const uricAcidStatus = getField<string>(currentData, "gout", "uric_acid_status")
  const currentTherapy = getField<string>(currentData, "gout", "current_therapy")
  const krystexxaStatus = getField<string>(currentData, "gout", "krystexxa_status")
  const lastFlare = getField<string>(currentData, "gout", "last_flare")

  // Patient context
  const egfr = patientContext.currentEgfr
  const ckdStage = patientContext.ckdStage

  let interpretation = ""
  let confidence = 0.9

  // No gout history and normal uric acid
  if (!goutHistory && (uricAcid === undefined || uricAcid <= 6.0)) {
    return {
      interpretation: "No gout history. Uric acid at goal.",
      actionItems: [],
      confidence: 0.95,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "You do not have gout. Staying hydrated and limiting purine-rich foods helps prevent gout.",
      citations: uricAcid !== undefined ? [{ fieldId: "uric_acid", value: uricAcid, source: "labs_api" }] : [],
    }
  }

  // Track citations
  if (uricAcid !== undefined) citations.push({ fieldId: "uric_acid", value: uricAcid, source: "labs_api" })
  if (goutHistory) citations.push({ fieldId: "gout_history", value: goutHistory, source: "provider" })

  // Gout history
  if (goutHistory) {
    interpretation = `Gout history: ${goutHistory}.`
  }

  // Uric acid assessment - target < 6.0 mg/dL (< 5.0 for tophaceous gout)
  if (uricAcid !== undefined) {
    interpretation += ` Uric acid ${uricAcid} mg/dL.`

    if (uricAcid > 9.0) {
      alerts.push(createAlert(
        "gout",
        "uric_acid",
        `Severely elevated uric acid (${uricAcid}) - high flare risk`,
        "high"
      ))
      interpretation += " Severely elevated - high flare risk."
      actionItems.push(createActionItem(
        "Optimize urate-lowering therapy urgently - uric acid > 9",
        "urgent",
        "provider"
      ))
    } else if (uricAcid > 6.0) {
      interpretation += " Above target (<6.0)."
      actionItems.push(createActionItem(
        "Optimize urate-lowering therapy to target <6.0 mg/dL",
        "routine",
        "provider"
      ))
    } else if (uricAcid <= 6.0 && uricAcid > 5.0) {
      interpretation += " At goal (<6.0)."
      
      // Check for tophaceous gout - stricter target
      if (goutHistory?.toLowerCase().includes("toph")) {
        interpretation += " Consider stricter target <5.0 for tophaceous gout."
        actionItems.push(createActionItem(
          "Consider uric acid target <5.0 for tophaceous gout",
          "optional",
          "provider"
        ))
      }
    } else if (uricAcid <= 5.0) {
      interpretation += " Excellent control."
    }
  } else if (goutHistory) {
    actionItems.push(createActionItem(
      "Check uric acid level for gout monitoring",
      "routine",
      "nurse"
    ))
  }

  // Current therapy assessment
  if (currentTherapy) {
    interpretation += ` Current therapy: ${currentTherapy}.`

    // Allopurinol dosing in CKD
    if (currentTherapy.toLowerCase().includes("allopurinol")) {
      if (egfr !== undefined && egfr < 30) {
        // Lower starting dose but can titrate up
        interpretation += " Note: Allopurinol can be used in CKD with careful titration."
        if (uricAcid !== undefined && uricAcid > 6.0) {
          actionItems.push(createActionItem(
            "Titrate allopurinol slowly in CKD - can exceed 'renal dosing' with monitoring",
            "routine",
            "provider"
          ))
        }
      }
    }

    // Febuxostat consideration
    if (currentTherapy.toLowerCase().includes("febuxostat")) {
      interpretation += " On febuxostat (no renal dose adjustment needed)."
    }
  } else if (goutHistory && uricAcid !== undefined && uricAcid > 6.0) {
    // Not on therapy but should be
    actionItems.push(createActionItem(
      "Initiate urate-lowering therapy for gout with uric acid > 6.0",
      "routine",
      "provider"
    ))
    
    // Drug selection based on CKD
    if (egfr !== undefined && egfr < 30) {
      actionItems.push(createActionItem(
        "Consider febuxostat (no renal adjustment) or low-dose allopurinol with titration",
        "optional",
        "provider"
      ))
    } else {
      actionItems.push(createActionItem(
        "Start allopurinol 100mg daily, titrate to uric acid goal",
        "optional",
        "provider"
      ))
    }
  }

  // Flare prophylaxis
  if (lastFlare) {
    interpretation += ` Last flare: ${lastFlare}.`
    
    // If recently started ULT or had recent flare, ensure prophylaxis
    actionItems.push(createActionItem(
      "Ensure flare prophylaxis (colchicine or low-dose NSAID if tolerated) during ULT initiation",
      "optional",
      "provider"
    ))
    
    // Colchicine dosing in CKD
    if (egfr !== undefined && egfr < 30) {
      actionItems.push(createActionItem(
        "Use reduced colchicine dose (0.3mg daily or every other day) for CKD",
        "optional",
        "provider"
      ))
    }
  }

  // Krystexxa (pegloticase) assessment
  if (krystexxaStatus === "on") {
    interpretation += " On Krystexxa (pegloticase)."
    actionItems.push(createActionItem(
      "Monitor for Krystexxa infusion reactions and uric acid response",
      "routine",
      "provider"
    ))
  } else if (krystexxaStatus === "candidate") {
    interpretation += " Krystexxa candidate identified."
    actionItems.push(createActionItem(
      "Evaluate Krystexxa candidacy for refractory gout - refer to rheumatology",
      "routine",
      "coordinator"
    ))
  } else if (goutHistory?.toLowerCase().includes("refractory") || 
             goutHistory?.toLowerCase().includes("toph") ||
             (uricAcid !== undefined && uricAcid > 9.0 && currentTherapy)) {
    // Potential Krystexxa candidate
    actionItems.push(createActionItem(
      "Consider Krystexxa referral for refractory/tophaceous gout",
      "optional",
      "provider"
    ))
  }

  // NSAID avoidance reminder
  if (ckdStage !== "G1" && ckdStage !== "G2") {
    actionItems.push(createActionItem(
      "Avoid NSAIDs for gout flares in CKD - use colchicine or steroids",
      "optional",
      "provider"
    ))
  }

  // Patient education
  const patientEducation = generatePatientEducation(uricAcid, currentTherapy, egfr)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
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
  uricAcid: number | undefined,
  currentTherapy: string | undefined,
  egfr: number | undefined
): string {
  let education = "Gout is caused by high uric acid levels that form crystals in your joints, causing painful inflammation. "
  education += "Kidney disease can make gout harder to control because your kidneys remove less uric acid. "

  if (uricAcid !== undefined) {
    if (uricAcid > 6.0) {
      education += `Your uric acid level of ${uricAcid} is above our goal of 6.0. `
      education += "Keeping uric acid below 6.0 helps prevent gout attacks and dissolve existing crystals. "
    } else {
      education += `Your uric acid level of ${uricAcid} is at goal. Keep taking your medication as prescribed. `
    }
  }

  if (currentTherapy) {
    education += "Your uric acid-lowering medication works best when taken every day, even when you feel fine. "
  }

  education += "Limit foods high in purines like red meat, organ meats, shellfish, and beer. "
  education += "Stay well hydrated with water. "
  
  if (egfr !== undefined && egfr < 60) {
    education += "Avoid anti-inflammatory medications (NSAIDs like ibuprofen) as they can harm your kidneys. "
  }

  education += "If you have a gout flare, contact us for treatment options that are safe for your kidneys."

  return education
}

export const goutSpecialistAgentMeta = {
  agentId: "gout_specialist_agent",
  displayName: "Gout Specialist",
  sectionsOwned: ["gout"],
  guidelines: [
    "ACR Gout Guidelines 2020",
    "KDIGO 2024 CKD Management",
  ],
  confidenceThreshold: 0.8,
}
