/**
 * Mineral Bone Disease Specialist Agent
 * Manages CKD-MBD assessment and treatment
 * Section: mbd
 * Guidelines: KDIGO CKD-MBD 2017, KDIGO 2024 Update
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
 * MBD Specialist Agent
 * Deep expertise in CKD-related mineral bone disease management
 */
export const mbdSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract MBD-specific fields
  const pth = getField<number>(currentData, "mbd", "pth")
  const vitaminD = getField<number>(currentData, "mbd", "vitamin_d25")
  const calcium = getField<number>(currentData, "mbd", "calcium")
  const phosphorus = getField<number>(currentData, "mbd", "phosphorus")
  const albumin = getField<number>(currentData, "mbd", "albumin")
  const correctedCalcium = getField<number>(currentData, "mbd", "corrected_calcium")
  const mbdAtGoal = getField<string>(currentData, "mbd", "mbd_at_goal")
  const vitaminDSupplement = getField<string>(currentData, "mbd", "vitamin_d_supplement")
  const phosphateBinder = getField<string>(currentData, "mbd", "phosphate_binder")
  const calcimimetic = getField<string>(currentData, "mbd", "calcimimetic")

  // Patient context
  const ckdStage = patientContext.ckdStage

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (pth !== undefined) citations.push({ fieldId: "pth", value: pth, source: "labs_api" })
  if (vitaminD !== undefined) citations.push({ fieldId: "vitamin_d25", value: vitaminD, source: "labs_api" })
  if (calcium !== undefined) citations.push({ fieldId: "calcium", value: calcium, source: "labs_api" })
  if (phosphorus !== undefined) citations.push({ fieldId: "phosphorus", value: phosphorus, source: "labs_api" })

  // Calculate corrected calcium if not provided
  let effectiveCalcium = correctedCalcium ?? calcium
  if (!correctedCalcium && calcium !== undefined && albumin !== undefined && albumin < 4.0) {
    effectiveCalcium = calcium + 0.8 * (4.0 - albumin)
    interpretation += `Corrected calcium ${effectiveCalcium.toFixed(1)} mg/dL. `
  }

  // PTH assessment - stage-dependent targets
  if (pth !== undefined) {
    interpretation += `PTH ${pth} pg/mL.`

    // KDIGO: PTH targets vary by CKD stage
    if (ckdStage === "G5" || ckdStage === "G5D") {
      // G5/G5D: 2-9x upper limit of normal (~130-600 pg/mL)
      if (pth > 600) {
        alerts.push(createAlert(
          "mbd",
          "pth",
          `Severely elevated PTH (${pth}) - secondary hyperparathyroidism`,
          "high"
        ))
        interpretation += " Severely elevated - secondary hyperparathyroidism."
        
        if (!calcimimetic) {
          actionItems.push(createActionItem(
            "Consider calcimimetic (cinacalcet) for severe secondary hyperparathyroidism",
            "routine",
            "provider"
          ))
        }
        actionItems.push(createActionItem(
          "Optimize phosphorus control and vitamin D therapy for elevated PTH",
          "routine",
          "provider"
        ))
      } else if (pth > 300) {
        interpretation += " Elevated - monitor and optimize therapy."
        actionItems.push(createActionItem(
          "Optimize MBD therapy - PTH above target range",
          "routine",
          "provider"
        ))
      } else if (pth < 130) {
        interpretation += " Low for CKD G5 - risk of adynamic bone disease."
        alerts.push(createAlert(
          "mbd",
          "pth",
          `Low PTH (${pth}) for CKD G5 - evaluate for adynamic bone disease`,
          "medium"
        ))
        if (calcimimetic) {
          actionItems.push(createActionItem(
            "Consider reducing or holding calcimimetic for low PTH",
            "routine",
            "provider"
          ))
        }
      } else {
        interpretation += " Within target range for CKD G5."
      }
    } else if (ckdStage === "G4") {
      // G4: maintain in normal range or slightly elevated
      if (pth > 150) {
        interpretation += " Elevated for CKD G4."
        actionItems.push(createActionItem(
          "Evaluate elevated PTH - check vitamin D status, phosphorus control",
          "routine",
          "provider"
        ))
      } else if (pth > 65) {
        interpretation += " Mildly elevated - monitor."
      }
    } else if (ckdStage === "G3a" || ckdStage === "G3b") {
      if (pth > 100) {
        interpretation += " Elevated for CKD G3."
        actionItems.push(createActionItem(
          "Check vitamin D status for elevated PTH in CKD G3",
          "routine",
          "provider"
        ))
      }
    }
  }

  // Vitamin D assessment
  if (vitaminD !== undefined) {
    interpretation += ` Vitamin D ${vitaminD} ng/mL.`

    if (vitaminD < 20) {
      interpretation += " Deficient."
      alerts.push(createAlert(
        "mbd",
        "vitamin_d25",
        `Vitamin D deficiency (${vitaminD} ng/mL) - supplement`,
        "medium"
      ))
      actionItems.push(createActionItem(
        "Initiate vitamin D supplementation - target 30-50 ng/mL",
        "routine",
        "provider"
      ))
    } else if (vitaminD < 30) {
      interpretation += " Insufficient."
      actionItems.push(createActionItem(
        "Optimize vitamin D to target 30-50 ng/mL",
        "routine",
        "provider"
      ))
    } else if (vitaminD >= 30 && vitaminD <= 50) {
      interpretation += " Optimal."
    } else if (vitaminD > 80) {
      interpretation += " Elevated - reduce supplementation."
      actionItems.push(createActionItem(
        "Reduce vitamin D supplementation - level > 80 ng/mL",
        "routine",
        "provider"
      ))
    }
  } else if (ckdStage !== "G1" && ckdStage !== "G2") {
    actionItems.push(createActionItem(
      "Check 25-OH vitamin D level for CKD MBD assessment",
      "routine",
      "nurse"
    ))
  }

  // Phosphorus assessment
  if (phosphorus !== undefined) {
    interpretation += ` Phosphorus ${phosphorus} mg/dL.`

    // KDIGO: maintain phosphorus toward normal range
    if (phosphorus > 5.5 && (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D")) {
      alerts.push(createAlert(
        "mbd",
        "phosphorus",
        `Hyperphosphatemia (${phosphorus}) - optimize binder therapy`,
        "high"
      ))
      interpretation += " Elevated."
      
      if (!phosphateBinder) {
        actionItems.push(createActionItem(
          "Initiate phosphate binder therapy for hyperphosphatemia",
          "routine",
          "provider"
        ))
      } else {
        actionItems.push(createActionItem(
          "Optimize phosphate binder therapy - increase dose or add agent",
          "routine",
          "provider"
        ))
      }
      actionItems.push(createActionItem(
        "Reinforce dietary phosphorus restriction counseling",
        "routine",
        "nurse"
      ))
    } else if (phosphorus > 4.5 && (ckdStage === "G4" || ckdStage === "G5")) {
      interpretation += " Borderline elevated."
      actionItems.push(createActionItem(
        "Monitor phosphorus - consider dietary counseling",
        "optional",
        "nurse"
      ))
    } else if (phosphorus < 2.5) {
      alerts.push(createAlert(
        "mbd",
        "phosphorus",
        `Hypophosphatemia (${phosphorus}) - evaluate cause`,
        "medium"
      ))
      interpretation += " Low."
    }
  }

  // Calcium assessment
  if (effectiveCalcium !== undefined) {
    if (effectiveCalcium > 10.5) {
      alerts.push(createAlert(
        "mbd",
        "calcium",
        `Hypercalcemia (Ca ${effectiveCalcium.toFixed(1)}) - evaluate cause`,
        "high"
      ))
      interpretation += ` Calcium elevated (${effectiveCalcium.toFixed(1)}).`
      
      if (vitaminDSupplement) {
        actionItems.push(createActionItem(
          "Hold or reduce vitamin D for hypercalcemia",
          "routine",
          "provider"
        ))
      }
      if (phosphateBinder?.toLowerCase().includes("calcium")) {
        actionItems.push(createActionItem(
          "Switch to non-calcium phosphate binder for hypercalcemia",
          "routine",
          "provider"
        ))
      }
    } else if (effectiveCalcium < 8.4) {
      interpretation += ` Calcium low (${effectiveCalcium.toFixed(1)}).`
      if (effectiveCalcium < 7.5) {
        alerts.push(createAlert(
          "mbd",
          "calcium",
          `Severe hypocalcemia (Ca ${effectiveCalcium.toFixed(1)}) - urgent correction`,
          "critical"
        ))
        actionItems.push(createActionItem(
          "Urgent calcium correction for severe hypocalcemia",
          "urgent",
          "provider"
        ))
      } else {
        actionItems.push(createActionItem(
          "Evaluate and treat hypocalcemia",
          "routine",
          "provider"
        ))
      }
    }
  }

  // Current therapy documentation
  if (vitaminDSupplement) {
    interpretation += ` Vitamin D supplement: ${vitaminDSupplement}.`
  }
  if (phosphateBinder) {
    interpretation += ` Phosphate binder: ${phosphateBinder}.`
  }
  if (calcimimetic) {
    interpretation += ` Calcimimetic: ${calcimimetic}.`
  }

  // Goal status
  if (mbdAtGoal === "at_goal") {
    interpretation += " MBD at goal."
  }

  // Patient education
  const patientEducation = generatePatientEducation(phosphorus, vitaminD, pth)

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
  phosphorus: number | undefined,
  vitaminD: number | undefined,
  pth: number | undefined
): string {
  let education = "Kidney disease can affect your bones and mineral balance. Your kidneys help control calcium, phosphorus, and vitamin D levels in your body. "

  if (phosphorus !== undefined && phosphorus > 5.5) {
    education += "Your phosphorus level is high. Too much phosphorus can weaken your bones and cause calcium to build up in your blood vessels. "
    education += "Limit high-phosphorus foods like dairy, nuts, cola drinks, and processed foods. Take your phosphate binder with every meal and snack. "
  }

  if (vitaminD !== undefined && vitaminD < 30) {
    education += "Your vitamin D level is low. Vitamin D helps your body absorb calcium and keeps your bones strong. You may need a vitamin D supplement. "
  }

  if (pth !== undefined && pth > 300) {
    education += "Your parathyroid hormone (PTH) is elevated. This can cause your body to pull calcium from your bones. We are working to bring this level down with medications. "
  }

  education += "Regular blood tests help us monitor these levels and adjust your treatment."

  return education
}

export const mbdSpecialistAgentMeta = {
  agentId: "mbd_specialist_agent",
  displayName: "Mineral Bone Disease Specialist",
  sectionsOwned: ["mbd"],
  guidelines: [
    "KDIGO CKD-MBD Guidelines 2017",
    "KDIGO 2024 CKD Management",
  ],
  confidenceThreshold: 0.8,
}
