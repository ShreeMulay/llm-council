/**
 * Kidney Function Agent
 * Assesses kidney function trajectory, proteinuria trends, KFRE risk, and progression markers
 * Sections: kidney_function, hematuria, kidney_stones, gu_history
 * Guidelines: KDIGO 2024 CKD Guidelines
 */

import type { AgentInput, AgentOutput, AgentFunction, ActionItem } from "./types"
import {
  createAlert,
  createActionItem,
  getField,
  percentChange,
  getAlbuminuriaStage,
  CONFIDENCE_THRESHOLDS,
} from "./types"
import type { Alert } from "../types/schema"

/**
 * Calculate BUN:Cr ratio interpretation
 * >20: pre-renal, 10-20: normal, <10: intrinsic
 */
function interpretBunCrRatio(ratio: number): string {
  if (ratio > 20) return "elevated (suggests pre-renal component)"
  if (ratio >= 10) return "normal"
  return "low (suggests intrinsic renal disease)"
}

/**
 * Kidney Function Agent
 * Primary agent for kidney function assessment and progression monitoring
 */
export const kidneyFunctionAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext, sectionId } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract kidney function fields
  const egfr = getField<number>(currentData, "kidney_function", "egfr_current")
  const egfrPrev = getField<number>(previousData, "kidney_function", "egfr_current")
  const egfrSlope = getField<number>(currentData, "kidney_function", "egfr_slope")
  const creatinine = getField<number>(currentData, "kidney_function", "creatinine")
  const bun = getField<number>(currentData, "kidney_function", "bun")
  const uacr = getField<number>(currentData, "kidney_function", "uacr_current")
  const uacrPrev = getField<number>(previousData, "kidney_function", "uacr_current")
  const upcr = getField<number>(currentData, "kidney_function", "upcr_current")
  const kfre2yr = getField<number>(currentData, "kidney_function", "kfre_2yr")
  const kfre5yr = getField<number>(currentData, "kidney_function", "kfre_5yr")
  const renalytixResult = getField<string>(currentData, "kidney_function", "renalytix_result")
  const akiHistory = getField<string>(currentData, "kidney_function", "aki_history")

  // Track citations
  if (egfr !== undefined) {
    citations.push({ fieldId: "egfr_current", value: egfr, source: "labs_api" })
  }
  if (uacr !== undefined) {
    citations.push({ fieldId: "uacr_current", value: uacr, source: "labs_api" })
  }

  // Calculate trends
  const egfrDecline = egfrPrev !== undefined && egfr !== undefined ? egfrPrev - egfr : 0
  const rapidDecline = egfrSlope !== undefined ? egfrSlope < -5 : egfrDecline > 5
  const bunCrRatio = bun !== undefined && creatinine !== undefined && creatinine > 0
    ? bun / creatinine
    : undefined

  // Determine albuminuria stage
  const albuminuriaStage = getAlbuminuriaStage(uacr)
  const isNephroticRange = uacr !== undefined && uacr > 3000

  // Build interpretation
  let interpretation = `CKD Stage ${patientContext.ckdStage}`
  
  if (egfr !== undefined) {
    interpretation += ` with eGFR ${egfr} mL/min/1.73m2`
  }

  if (egfrPrev !== undefined && egfr !== undefined) {
    const change = egfr - egfrPrev
    if (Math.abs(change) >= 3) {
      interpretation += change > 0
        ? `. eGFR improved by ${change.toFixed(1)} mL/min from previous visit.`
        : `. eGFR declined by ${Math.abs(change).toFixed(1)} mL/min from previous visit.`
    } else {
      interpretation += `. eGFR stable from previous visit.`
    }
  } else {
    interpretation += "."
  }

  if (egfrSlope !== undefined) {
    interpretation += ` Annual eGFR slope: ${egfrSlope.toFixed(1)} mL/min/year.`
  }

  if (uacr !== undefined) {
    interpretation += ` Albuminuria ${albuminuriaStage} (UACR ${uacr} mg/g)`
    if (isNephroticRange) {
      interpretation += " - nephrotic-range proteinuria."
    } else if (uacr > 300) {
      interpretation += " indicates high progression risk."
    } else {
      interpretation += "."
    }
  }

  if (bunCrRatio !== undefined) {
    interpretation += ` BUN:Cr ratio ${bunCrRatio.toFixed(1)} (${interpretBunCrRatio(bunCrRatio)}).`
  }

  if (kfre2yr !== undefined && kfre2yr > 10) {
    interpretation += ` KFRE 2-year risk: ${kfre2yr.toFixed(1)}%.`
  }

  // Generate alerts
  if (rapidDecline) {
    alerts.push(createAlert(
      "kidney_function",
      "egfr_slope",
      "Rapid eGFR decline (> -5 mL/min/year) - evaluate for reversible causes",
      "high"
    ))
  }

  if (isNephroticRange) {
    alerts.push(createAlert(
      "kidney_function",
      "uacr_current",
      "Nephrotic-range proteinuria (UACR > 3000 mg/g)",
      "high"
    ))
  }

  if (kfre2yr !== undefined && kfre2yr > 40) {
    alerts.push(createAlert(
      "kidney_function",
      "kfre_2yr",
      `High 2-year KFRE risk (${kfre2yr.toFixed(1)}%) - urgent dialysis/transplant planning needed`,
      "critical"
    ))
  }

  if (egfr !== undefined && egfr < 15) {
    alerts.push(createAlert(
      "kidney_function",
      "egfr_current",
      "eGFR < 15: Evaluate for RRT planning and transplant referral",
      "high"
    ))
  }

  // Generate action items
  if (rapidDecline) {
    actionItems.push(createActionItem(
      "Evaluate for reversible causes of eGFR decline (AKI, dehydration, medication, obstruction)",
      "urgent",
      "provider"
    ))
  }

  if (uacr !== undefined && uacr > 300) {
    const raasStatus = getField<string>(currentData, "raas", "raas_status")
    if (!raasStatus || raasStatus === "not_on") {
      actionItems.push(createActionItem(
        "Optimize RAAS inhibition for proteinuria reduction (target 30-50% UACR reduction)",
        "urgent",
        "provider"
      ))
    } else {
      actionItems.push(createActionItem(
        "Assess RAAS inhibitor dose optimization - consider uptitration if tolerated",
        "routine",
        "provider"
      ))
    }
  }

  if (kfre2yr !== undefined && kfre2yr > 20) {
    actionItems.push(createActionItem(
      "Initiate transplant evaluation discussion if not already done",
      "routine",
      "provider"
    ))
    actionItems.push(createActionItem(
      "Ensure dialysis education has been provided",
      "routine",
      "coordinator"
    ))
  }

  if (renalytixResult === "high_risk") {
    actionItems.push(createActionItem(
      "High Renalytix risk score - intensify GDMT and monitoring",
      "urgent",
      "provider"
    ))
  }

  // Handle hematuria section if applicable
  if (sectionId === "hematuria") {
    const hematuriaPresent = getField<boolean>(currentData, "hematuria", "hematuria_present")
    const workupStatus = getField<string>(currentData, "hematuria", "workup_status")
    
    if (hematuriaPresent && workupStatus !== "complete") {
      interpretation = `Hematuria present. Workup status: ${workupStatus || "not started"}.`
      actionItems.push(createActionItem(
        "Complete hematuria workup per AUA/SUFU guidelines",
        "routine",
        "provider"
      ))
    }
  }

  // Handle kidney stones section if applicable
  if (sectionId === "kidney_stones") {
    const stoneHistory = getField<string>(currentData, "kidney_stones", "stone_history")
    const urine24hCollected = getField<boolean>(currentData, "kidney_stones", "urine_24h_collected")
    
    if (stoneHistory && !urine24hCollected) {
      interpretation = `History of kidney stones: ${stoneHistory}. 24-hour urine collection not yet performed.`
      actionItems.push(createActionItem(
        "Order 24-hour urine collection for stone risk assessment",
        "routine",
        "provider"
      ))
    }
  }

  // Calculate confidence
  let confidence = 0.85
  if (egfr === undefined) confidence -= 0.2
  if (uacr === undefined) confidence -= 0.1
  if (rapidDecline) confidence -= 0.1 // More uncertainty with rapid changes

  const reviewNeeded = rapidDecline || 
    (egfr !== undefined && egfr < 15) || 
    isNephroticRange ||
    (kfre2yr !== undefined && kfre2yr > 40) ||
    confidence < CONFIDENCE_THRESHOLDS.REVIEW_SUGGESTED

  // Patient education
  const patientEducation = generatePatientEducation(egfr, uacr, rapidDecline, kfre2yr)

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
  egfr: number | undefined,
  uacr: number | undefined,
  rapidDecline: boolean,
  kfre2yr: number | undefined
): string {
  let education = "Your kidney function test results: "
  
  if (egfr !== undefined) {
    if (egfr >= 60) {
      education += "Your kidney function is mildly reduced. "
    } else if (egfr >= 30) {
      education += "Your kidney function is moderately reduced. "
    } else if (egfr >= 15) {
      education += "Your kidney function is significantly reduced. "
    } else {
      education += "Your kidney function is severely reduced. "
    }
  }

  if (uacr !== undefined && uacr > 30) {
    education += "There is protein in your urine, which we are working to reduce with medications. "
  }

  if (rapidDecline) {
    education += "Your kidney function has changed more than expected since your last visit. We will investigate why. "
  }

  education += "Continue taking your medications as prescribed and follow your dietary recommendations."

  return education
}

export const kidneyFunctionAgentMeta = {
  agentId: "kidney_function_agent",
  displayName: "Kidney Function Agent",
  sectionsOwned: ["kidney_function", "hematuria", "kidney_stones", "gu_history"],
  guidelines: ["KDIGO 2024 CKD Guidelines"],
  confidenceThreshold: 0.7,
}
