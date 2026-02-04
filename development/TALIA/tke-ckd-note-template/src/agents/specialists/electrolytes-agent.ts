/**
 * Electrolytes Specialist Agent
 * Manages electrolyte and acid-base assessment for CKD patients
 * Section: electrolytes
 * Guidelines: KDIGO Electrolytes/Acid-Base, KDIGO 2024
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
 * Electrolytes Specialist Agent
 * Deep expertise in electrolyte and acid-base management for CKD
 */
export const electrolytesSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract electrolyte fields
  const potassium = getField<number>(currentData, "electrolytes", "potassium")
  const sodium = getField<number>(currentData, "electrolytes", "sodium")
  const chloride = getField<number>(currentData, "electrolytes", "chloride")
  const bicarbonate = getField<number>(currentData, "electrolytes", "bicarbonate")
  const magnesium = getField<number>(currentData, "electrolytes", "magnesium")
  const glucose = getField<number>(currentData, "electrolytes", "glucose")
  const electrolytesAtGoal = getField<string>(currentData, "electrolytes", "electrolytes_at_goal")
  const bicarbSupplement = getField<string>(currentData, "electrolytes", "bicarb_supplement")
  const kclSupplement = getField<string>(currentData, "electrolytes", "kcl_supplement")
  const pruritus = getField<string>(currentData, "electrolytes", "pruritus")

  // Patient context
  const ckdStage = patientContext.ckdStage

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (potassium !== undefined) citations.push({ fieldId: "potassium", value: potassium, source: "labs_api" })
  if (sodium !== undefined) citations.push({ fieldId: "sodium", value: sodium, source: "labs_api" })
  if (bicarbonate !== undefined) citations.push({ fieldId: "bicarbonate", value: bicarbonate, source: "labs_api" })

  // Potassium assessment - critical electrolyte in CKD
  if (potassium !== undefined) {
    interpretation = `Potassium ${potassium} mEq/L.`

    if (potassium >= 6.5) {
      alerts.push(createAlert(
        "electrolytes",
        "potassium",
        `Severe hyperkalemia (K+ ${potassium}) - URGENT management required`,
        "critical"
      ))
      interpretation += " SEVERE hyperkalemia - urgent intervention."
      actionItems.push(createActionItem(
        "URGENT: ECG, calcium gluconate, insulin/glucose, consider dialysis",
        "urgent",
        "provider"
      ))
      actionItems.push(createActionItem(
        "Hold all potassium-sparing medications (RAAS, MRA, K+ supplements)",
        "urgent",
        "provider"
      ))
      confidence = 0.7
    } else if (potassium >= 6.0) {
      alerts.push(createAlert(
        "electrolytes",
        "potassium",
        `Significant hyperkalemia (K+ ${potassium}) - urgent management`,
        "critical"
      ))
      interpretation += " Significant hyperkalemia."
      actionItems.push(createActionItem(
        "Urgent hyperkalemia management - ECG, consider calcium, insulin/glucose",
        "urgent",
        "provider"
      ))
      actionItems.push(createActionItem(
        "Review and adjust potassium-elevating medications",
        "urgent",
        "provider"
      ))
    } else if (potassium > 5.5) {
      alerts.push(createAlert(
        "electrolytes",
        "potassium",
        `Hyperkalemia (K+ ${potassium})`,
        "high"
      ))
      interpretation += " Hyperkalemia."
      actionItems.push(createActionItem(
        "Address hyperkalemia - dietary counseling, potassium binder consideration",
        "routine",
        "provider"
      ))
    } else if (potassium > 5.0) {
      interpretation += " Borderline elevated - monitor."
      actionItems.push(createActionItem(
        "Dietary potassium counseling for borderline hyperkalemia",
        "optional",
        "nurse"
      ))
    } else if (potassium >= 3.5 && potassium <= 5.0) {
      interpretation += " Normal."
    } else if (potassium < 3.5) {
      alerts.push(createAlert(
        "electrolytes",
        "potassium",
        `Hypokalemia (K+ ${potassium})`,
        "high"
      ))
      interpretation += " Hypokalemia."
      
      if (potassium < 3.0) {
        actionItems.push(createActionItem(
          "Urgent potassium replacement for severe hypokalemia",
          "urgent",
          "provider"
        ))
      } else {
        actionItems.push(createActionItem(
          "Evaluate and treat hypokalemia - check magnesium, consider supplements",
          "routine",
          "provider"
        ))
      }
      
      // Check for diuretic use
      actionItems.push(createActionItem(
        "Review diuretic therapy for hypokalemia",
        "routine",
        "provider"
      ))
    }
  }

  // Bicarbonate assessment - KDIGO target >= 22 mEq/L
  if (bicarbonate !== undefined) {
    interpretation += ` Bicarbonate ${bicarbonate} mEq/L.`

    if (bicarbonate < 18) {
      alerts.push(createAlert(
        "electrolytes",
        "bicarbonate",
        `Significant metabolic acidosis (HCO3 ${bicarbonate})`,
        "high"
      ))
      interpretation += " Significant metabolic acidosis."
      
      if (!bicarbSupplement) {
        actionItems.push(createActionItem(
          "Initiate bicarbonate supplementation for metabolic acidosis (target >= 22)",
          "routine",
          "provider"
        ))
      } else {
        actionItems.push(createActionItem(
          "Increase bicarbonate supplementation - HCO3 < 18",
          "routine",
          "provider"
        ))
      }
    } else if (bicarbonate < 22) {
      interpretation += " Below KDIGO target."
      actionItems.push(createActionItem(
        "Consider bicarbonate supplementation to target >= 22 mEq/L (KDIGO)",
        "routine",
        "provider"
      ))
    } else if (bicarbonate >= 22 && bicarbonate <= 28) {
      interpretation += " At goal."
    } else if (bicarbonate > 30) {
      interpretation += " Elevated - evaluate for metabolic alkalosis."
      if (bicarbSupplement) {
        actionItems.push(createActionItem(
          "Consider reducing bicarbonate supplementation",
          "routine",
          "provider"
        ))
      }
    }
  }

  // Sodium assessment
  if (sodium !== undefined) {
    interpretation += ` Sodium ${sodium} mEq/L.`

    if (sodium < 125) {
      alerts.push(createAlert(
        "electrolytes",
        "sodium",
        `Severe hyponatremia (Na ${sodium}) - evaluate urgently`,
        "critical"
      ))
      interpretation += " Severe hyponatremia."
      actionItems.push(createActionItem(
        "Urgent evaluation of severe hyponatremia - assess volume status, etiology",
        "urgent",
        "provider"
      ))
    } else if (sodium < 130) {
      alerts.push(createAlert(
        "electrolytes",
        "sodium",
        `Hyponatremia (Na ${sodium})`,
        "high"
      ))
      interpretation += " Hyponatremia."
      actionItems.push(createActionItem(
        "Evaluate hyponatremia - volume status, medications, fluid restriction",
        "routine",
        "provider"
      ))
    } else if (sodium > 150) {
      alerts.push(createAlert(
        "electrolytes",
        "sodium",
        `Hypernatremia (Na ${sodium})`,
        "high"
      ))
      interpretation += " Hypernatremia."
      actionItems.push(createActionItem(
        "Evaluate hypernatremia - assess hydration, free water deficit",
        "routine",
        "provider"
      ))
    } else if (sodium > 145) {
      interpretation += " Mildly elevated."
    }
  }

  // Magnesium assessment
  if (magnesium !== undefined) {
    interpretation += ` Magnesium ${magnesium} mg/dL.`

    if (magnesium < 1.5) {
      interpretation += " Low."
      actionItems.push(createActionItem(
        "Evaluate and treat hypomagnesemia - may contribute to hypokalemia",
        "routine",
        "provider"
      ))
    } else if (magnesium > 2.5) {
      interpretation += " Elevated."
      if (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") {
        actionItems.push(createActionItem(
          "Review magnesium-containing medications for hypermagnesemia",
          "routine",
          "provider"
        ))
      }
    }
  }

  // Anion gap calculation if we have the data
  if (sodium !== undefined && chloride !== undefined && bicarbonate !== undefined) {
    const anionGap = sodium - chloride - bicarbonate
    if (anionGap > 16) {
      interpretation += ` Elevated anion gap (${anionGap}).`
      actionItems.push(createActionItem(
        "Evaluate elevated anion gap - consider uremia, lactic acidosis, ketoacidosis",
        "routine",
        "provider"
      ))
    }
  }

  // Glucose - corrected sodium if hyperglycemic
  if (glucose !== undefined && glucose > 200 && sodium !== undefined) {
    const correctedNa = sodium + 1.6 * ((glucose - 100) / 100)
    interpretation += ` Corrected sodium ${correctedNa.toFixed(0)} mEq/L for hyperglycemia.`
  }

  // Pruritus assessment (uremic symptom)
  if (pruritus && pruritus !== "none") {
    interpretation += ` Pruritus: ${pruritus}.`
    if (pruritus === "severe" || pruritus === "moderate") {
      actionItems.push(createActionItem(
        "Address uremic pruritus - consider gabapentin, antihistamines, or difelikefalin",
        "routine",
        "provider"
      ))
    }
  }

  // Current supplements
  if (bicarbSupplement) {
    interpretation += ` On bicarbonate: ${bicarbSupplement}.`
  }
  if (kclSupplement) {
    interpretation += ` On KCl: ${kclSupplement}.`
  }

  // Goal status
  if (electrolytesAtGoal === "at_goal") {
    interpretation += " Electrolytes at goal."
  }

  // Patient education
  const patientEducation = generatePatientEducation(potassium, bicarbonate)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
    (potassium !== undefined && (potassium >= 6.0 || potassium < 3.0)) ||
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
  potassium: number | undefined,
  bicarbonate: number | undefined
): string {
  let education = "Your kidneys help balance important minerals in your blood. We monitor these levels closely to keep you healthy. "

  if (potassium !== undefined && potassium > 5.0) {
    education += "Your potassium level is elevated. Too much potassium can affect your heart rhythm. "
    education += "Limit high-potassium foods like bananas, oranges, potatoes, tomatoes, and salt substitutes. "
    education += "If prescribed, take your potassium binder medication with meals. "
  } else if (potassium !== undefined && potassium < 3.5) {
    education += "Your potassium level is low. You may need potassium supplements. "
  }

  if (bicarbonate !== undefined && bicarbonate < 22) {
    education += "Your bicarbonate level is low, which means your blood is more acidic than normal. "
    education += "This can affect your muscles and bones. You may need bicarbonate supplements (baking soda pills). "
  }

  education += "Follow your dietary recommendations and take all medications as prescribed."

  return education
}

export const electrolytesSpecialistAgentMeta = {
  agentId: "electrolytes_specialist_agent",
  displayName: "Electrolytes Specialist",
  sectionsOwned: ["electrolytes"],
  guidelines: [
    "KDIGO Electrolytes/Acid-Base Guidelines",
    "KDIGO 2024 CKD Management",
  ],
  confidenceThreshold: 0.8,
}
