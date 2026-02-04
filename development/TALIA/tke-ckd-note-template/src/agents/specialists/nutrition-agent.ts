/**
 * Nutrition Assessment Specialist Agent
 * Manages nutrition assessment and dietary counseling for CKD patients
 * Section: sodium, nutrition
 * Guidelines: KDOQI Nutrition, KDIGO 2024
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
 * Nutrition Specialist Agent
 * Deep expertise in CKD nutrition management
 */
export const nutritionSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract nutrition-specific fields
  const sodiumTarget = getField<string>(currentData, "sodium", "sodium_target")
  const dietAdherence = getField<string>(currentData, "sodium", "diet_adherence")
  const dietitianReferral = getField<boolean>(currentData, "sodium", "dietitian_referral")

  // Additional nutrition fields from nutrition section if exists
  const albumin = getField<number>(currentData, "mbd", "albumin")
  const prealbumin = getField<number>(currentData, "nutrition", "prealbumin")
  const nutritionStatus = getField<string>(currentData, "nutrition", "nutrition_status")
  const proteinIntake = getField<string>(currentData, "nutrition", "protein_intake")
  const appetiteStatus = getField<string>(currentData, "nutrition", "appetite_status")

  // Patient context
  const ckdStage = patientContext.ckdStage
  const isDiabetic = patientContext.isDiabetic

  // Cross-reference weight/BMI
  const bmi = getField<number>(currentData, "obesity", "bmi") ?? getField<number>(currentData, "header", "bmi")

  let interpretation = ""
  let confidence = 0.85

  // Sodium restriction assessment
  interpretation = `Sodium restriction: target ${sodiumTarget || "<2g/day"}.`

  if (dietAdherence) {
    interpretation += ` Adherence: ${dietAdherence}.`
    citations.push({ fieldId: "diet_adherence", value: dietAdherence, source: "patient" })

    if (dietAdherence === "poor" || dietAdherence === "non_adherent") {
      alerts.push(createAlert(
        "sodium",
        "diet_adherence",
        "Poor dietary sodium adherence - impacts BP and fluid control",
        "medium"
      ))
      actionItems.push(createActionItem(
        "Reinforce dietary sodium restriction counseling",
        "routine",
        "nurse"
      ))
      if (!dietitianReferral) {
        actionItems.push(createActionItem(
          "Refer to renal dietitian for sodium restriction education",
          "routine",
          "coordinator"
        ))
      }
    } else if (dietAdherence === "moderate") {
      actionItems.push(createActionItem(
        "Continue dietary counseling - moderate sodium adherence",
        "optional",
        "nurse"
      ))
    }
  } else {
    actionItems.push(createActionItem(
      "Assess dietary sodium adherence",
      "routine",
      "nurse"
    ))
  }

  // Protein intake assessment
  if (proteinIntake) {
    interpretation += ` Protein intake: ${proteinIntake}.`
    
    // KDOQI: 0.6-0.8 g/kg/day for CKD G3-G5 not on dialysis
    // Higher protein for dialysis patients
    if (ckdStage === "G5D") {
      if (proteinIntake === "low" || proteinIntake === "restricted") {
        actionItems.push(createActionItem(
          "Increase protein intake for dialysis patient - target 1.0-1.2 g/kg/day",
          "routine",
          "provider"
        ))
      }
    } else if (ckdStage === "G4" || ckdStage === "G5") {
      if (proteinIntake === "high") {
        actionItems.push(createActionItem(
          "Consider moderate protein restriction (0.6-0.8 g/kg/day) for advanced CKD",
          "optional",
          "provider"
        ))
      }
    }
  }

  // Nutritional status assessment
  if (albumin !== undefined) {
    citations.push({ fieldId: "albumin", value: albumin, source: "labs_api" })
    interpretation += ` Albumin ${albumin} g/dL.`

    if (albumin < 3.0) {
      alerts.push(createAlert(
        "nutrition",
        "albumin",
        `Severe hypoalbuminemia (${albumin}) - malnutrition risk`,
        "high"
      ))
      interpretation += " Severe hypoalbuminemia - malnutrition concern."
      actionItems.push(createActionItem(
        "Evaluate for protein-energy wasting - consider nutrition support",
        "routine",
        "provider"
      ))
      if (!dietitianReferral) {
        actionItems.push(createActionItem(
          "Urgent dietitian referral for malnutrition",
          "urgent",
          "coordinator"
        ))
      }
    } else if (albumin < 3.5) {
      interpretation += " Mild hypoalbuminemia."
      actionItems.push(createActionItem(
        "Monitor nutritional status - albumin below normal",
        "routine",
        "provider"
      ))
    }
  }

  if (prealbumin !== undefined) {
    citations.push({ fieldId: "prealbumin", value: prealbumin, source: "labs_api" })
    interpretation += ` Prealbumin ${prealbumin} mg/dL.`

    if (prealbumin < 15) {
      interpretation += " Low prealbumin - acute nutritional depletion."
      actionItems.push(createActionItem(
        "Address acute nutritional depletion - low prealbumin",
        "routine",
        "provider"
      ))
    }
  }

  // Appetite assessment
  if (appetiteStatus) {
    interpretation += ` Appetite: ${appetiteStatus}.`

    if (appetiteStatus === "poor" || appetiteStatus === "anorexia") {
      alerts.push(createAlert(
        "nutrition",
        "appetite_status",
        "Poor appetite - risk for malnutrition",
        "medium"
      ))
      actionItems.push(createActionItem(
        "Evaluate causes of poor appetite - uremia, medications, depression",
        "routine",
        "provider"
      ))
      
      // Consider appetite stimulants
      if (ckdStage === "G5" || ckdStage === "G5D") {
        actionItems.push(createActionItem(
          "Consider appetite stimulant (megestrol) for uremic anorexia",
          "optional",
          "provider"
        ))
      }
    }
  }

  // Potassium dietary counseling
  const potassium = getField<number>(currentData, "electrolytes", "potassium")
  if (potassium !== undefined && potassium > 5.0) {
    actionItems.push(createActionItem(
      "Reinforce low-potassium diet counseling",
      "routine",
      "nurse"
    ))
  }

  // Phosphorus dietary counseling
  const phosphorus = getField<number>(currentData, "mbd", "phosphorus")
  if (phosphorus !== undefined && phosphorus > 4.5 && (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D")) {
    actionItems.push(createActionItem(
      "Reinforce low-phosphorus diet counseling",
      "routine",
      "nurse"
    ))
  }

  // Diabetic diet considerations
  if (isDiabetic) {
    actionItems.push(createActionItem(
      "Ensure carbohydrate-controlled diet counseling for diabetic CKD",
      "optional",
      "nurse"
    ))
  }

  // Fluid restriction for advanced CKD
  if (ckdStage === "G5" || ckdStage === "G5D") {
    const fluidStatus = getField<string>(currentData, "bp_fluid", "fluid_status")
    if (fluidStatus === "hypervolemic" || fluidStatus === "volume_overload") {
      actionItems.push(createActionItem(
        "Reinforce fluid restriction counseling for volume overload",
        "routine",
        "nurse"
      ))
    }
  }

  // Dietitian referral status
  if (dietitianReferral) {
    interpretation += " Dietitian referral in place."
  } else if (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") {
    actionItems.push(createActionItem(
      "Consider renal dietitian referral for advanced CKD",
      "optional",
      "coordinator"
    ))
  }

  // Underweight concern
  if (bmi !== undefined && bmi < 18.5) {
    alerts.push(createAlert(
      "nutrition",
      "bmi",
      `Underweight (BMI ${bmi.toFixed(1)}) - malnutrition risk`,
      "high"
    ))
    actionItems.push(createActionItem(
      "Evaluate underweight patient for malnutrition and protein-energy wasting",
      "routine",
      "provider"
    ))
  }

  // Patient education
  const patientEducation = generatePatientEducation(ckdStage, isDiabetic, dietAdherence)

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
  ckdStage: string,
  isDiabetic: boolean | undefined,
  dietAdherence: string | undefined
): string {
  let education = "Diet plays an important role in managing kidney disease. "

  education += "Limiting sodium (salt) to less than 2 grams per day helps control blood pressure and reduce fluid retention. "
  education += "Avoid processed foods, canned soups, and fast food which are high in sodium. "

  if (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") {
    education += "You may also need to limit potassium (found in bananas, oranges, potatoes) and phosphorus (found in dairy, nuts, cola). "
  }

  if (isDiabetic) {
    education += "Managing your carbohydrate intake helps control blood sugar, which protects your kidneys. "
  }

  if (dietAdherence === "poor" || dietAdherence === "non_adherent") {
    education += "We understand dietary changes can be challenging. A dietitian can help you find foods you enjoy that fit your kidney diet. "
  }

  education += "Ask your care team for a referral to a renal dietitian for personalized guidance."

  return education
}

export const nutritionSpecialistAgentMeta = {
  agentId: "nutrition_specialist_agent",
  displayName: "Nutrition Assessment Specialist",
  sectionsOwned: ["sodium", "nutrition"],
  guidelines: [
    "KDOQI Nutrition Guidelines",
    "KDIGO 2024 CKD Management",
  ],
  confidenceThreshold: 0.8,
}
