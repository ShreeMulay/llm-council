/**
 * Diabetes Management Specialist Agent
 * Manages diabetes assessment and treatment for CKD patients
 * Section: diabetes
 * Guidelines: ADA Standards of Care 2025, KDIGO 2024
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
 * Diabetes Specialist Agent
 * Deep expertise in diabetes management for CKD patients
 */
export const diabetesSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract diabetes-specific fields
  const diabeticStatus = getField<string>(currentData, "diabetes", "diabetic_status")
  const hba1c = getField<number>(currentData, "diabetes", "hba1c")
  const hba1cDate = getField<string>(currentData, "diabetes", "hba1c_date")
  const hba1cTarget = getField<number>(currentData, "diabetes", "hba1c_target")
  const insulinStatus = getField<string>(currentData, "diabetes", "insulin_status")
  const endocrinologyReferral = getField<boolean>(currentData, "diabetes", "endocrinology_referral")
  const annualEyeExam = getField<string>(currentData, "diabetes", "annual_eye_exam")
  const annualFootExam = getField<string>(currentData, "diabetes", "annual_foot_exam")
  const eversenseCgm = getField<boolean>(currentData, "diabetes", "eversense_cgm")

  // Patient context
  const egfr = patientContext.currentEgfr
  const ckdStage = patientContext.ckdStage
  const age = patientContext.age

  let interpretation = ""
  let confidence = 0.9

  // Non-diabetic - quick return
  if (diabeticStatus === "not_diabetic") {
    return {
      interpretation: "Non-diabetic.",
      actionItems: [],
      confidence: 0.95,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "You do not have diabetes. Maintaining a healthy weight and diet helps prevent diabetes.",
      citations: [],
    }
  }

  // Track citations
  if (diabeticStatus) citations.push({ fieldId: "diabetic_status", value: diabeticStatus, source: "provider" })
  if (hba1c !== undefined) citations.push({ fieldId: "hba1c", value: hba1c, source: "labs_api" })

  // Diabetes type
  interpretation = `Diabetes: ${diabeticStatus}.`

  // HbA1c assessment
  if (hba1c !== undefined) {
    // Individualized target based on CKD stage, age, comorbidities
    const target = hba1cTarget ?? determineHba1cTarget(ckdStage, age)
    interpretation += ` HbA1c ${hba1c}% (target <${target}%).`

    if (hba1c > 10) {
      alerts.push(createAlert(
        "diabetes",
        "hba1c",
        `Severely uncontrolled diabetes (HbA1c ${hba1c}%)`,
        "high"
      ))
      interpretation += " Severely uncontrolled."
      actionItems.push(createActionItem(
        "Urgent diabetes management intensification - consider endocrinology referral",
        "urgent",
        "provider"
      ))
      if (!endocrinologyReferral) {
        actionItems.push(createActionItem(
          "Refer to endocrinology for uncontrolled diabetes",
          "routine",
          "coordinator"
        ))
      }
      confidence = 0.75
    } else if (hba1c > 9) {
      alerts.push(createAlert(
        "diabetes",
        "hba1c",
        `Uncontrolled diabetes (HbA1c ${hba1c}%)`,
        "high"
      ))
      interpretation += " Uncontrolled."
      actionItems.push(createActionItem(
        "Intensify diabetes management - medication adjustment needed",
        "routine",
        "provider"
      ))
    } else if (hba1c > target) {
      interpretation += " Above individualized target."
      actionItems.push(createActionItem(
        "Optimize glycemic control toward individualized target",
        "routine",
        "provider"
      ))
    } else if (hba1c < 6.5 && insulinStatus && insulinStatus !== "not_on_insulin") {
      interpretation += " At risk for hypoglycemia."
      alerts.push(createAlert(
        "diabetes",
        "hba1c",
        `HbA1c ${hba1c}% on insulin - hypoglycemia risk`,
        "medium"
      ))
      actionItems.push(createActionItem(
        "Consider reducing insulin for hypoglycemia prevention",
        "routine",
        "provider"
      ))
    } else {
      interpretation += " At goal."
    }

    // HbA1c reliability in CKD
    if (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") {
      interpretation += " Note: HbA1c may be less reliable in advanced CKD."
      if (!eversenseCgm) {
        actionItems.push(createActionItem(
          "Consider CGM for more accurate glycemic monitoring in advanced CKD",
          "optional",
          "provider"
        ))
      }
    }
  } else {
    actionItems.push(createActionItem(
      "Check HbA1c - not available in recent labs",
      "routine",
      "nurse"
    ))
  }

  // Medication safety in CKD
  if (egfr !== undefined) {
    // Metformin thresholds
    if (egfr < 30) {
      actionItems.push(createActionItem(
        "Review metformin - contraindicated if eGFR < 30 (discontinue if on therapy)",
        "routine",
        "provider"
      ))
    } else if (egfr < 45) {
      actionItems.push(createActionItem(
        "Review metformin dose - reduce to max 1000mg/day for eGFR 30-45",
        "routine",
        "provider"
      ))
    }

    // Sulfonylurea caution
    if (egfr < 30) {
      actionItems.push(createActionItem(
        "Review sulfonylurea use - increased hypoglycemia risk in advanced CKD",
        "routine",
        "provider"
      ))
    }
  }

  // GDMT cross-reference
  const sglt2iStatus = getField<string>(currentData, "sglt2i", "sglt2i_status")
  const glp1Status = getField<string>(currentData, "glp1", "glp1_status")

  if (sglt2iStatus !== "on" && egfr !== undefined && egfr >= 20) {
    actionItems.push(createActionItem(
      "SGLT2i indicated for T2DM + CKD - prioritize initiation",
      "routine",
      "provider"
    ))
  }

  if (glp1Status !== "on") {
    actionItems.push(createActionItem(
      "GLP-1 RA indicated for T2DM + CKD per FLOW trial",
      "routine",
      "provider"
    ))
  }

  // Insulin status
  if (insulinStatus) {
    interpretation += ` Insulin: ${insulinStatus}.`
    
    if (insulinStatus.includes("basal") && insulinStatus.includes("bolus")) {
      interpretation += " On intensive insulin regimen."
    }
  }

  // Annual screening checks
  if (annualEyeExam !== "done") {
    actionItems.push(createActionItem(
      "Order annual diabetic retinopathy screening",
      "routine",
      "coordinator"
    ))
  } else {
    interpretation += " Eye exam done."
  }

  if (annualFootExam !== "done") {
    actionItems.push(createActionItem(
      "Complete annual diabetic foot exam",
      "routine",
      "provider"
    ))
  } else {
    interpretation += " Foot exam done."
  }

  // CGM status
  if (eversenseCgm) {
    interpretation += " On Eversense CGM."
  } else if (insulinStatus && insulinStatus !== "not_on_insulin") {
    actionItems.push(createActionItem(
      "Consider CGM for insulin-requiring diabetic patient",
      "optional",
      "provider"
    ))
  }

  // Patient education
  const patientEducation = generatePatientEducation(hba1c, hba1cTarget, egfr)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
    (hba1c !== undefined && hba1c > 9) ||
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

function determineHba1cTarget(ckdStage: string, age: number | undefined): number {
  // ADA/KDIGO individualized targets
  // More relaxed targets for advanced CKD, elderly, hypoglycemia risk
  
  if (ckdStage === "G5" || ckdStage === "G5D") {
    return 8.0 // More relaxed for dialysis
  }
  
  if (age !== undefined && age >= 75) {
    return 8.0 // More relaxed for elderly
  }
  
  if (ckdStage === "G4") {
    return 7.5 // Slightly relaxed for advanced CKD
  }
  
  return 7.0 // Standard target
}

function generatePatientEducation(
  hba1c: number | undefined,
  target: number | undefined,
  egfr: number | undefined
): string {
  let education = "Good blood sugar control helps protect your kidneys and prevent complications. "

  if (hba1c !== undefined) {
    const targetVal = target ?? 7.0
    if (hba1c > targetVal) {
      education += `Your HbA1c of ${hba1c}% is above your target of ${targetVal}%. `
      education += "We will work together to improve your blood sugar control. "
    } else {
      education += `Your HbA1c of ${hba1c}% is at your goal. Keep up the good work! `
    }
  }

  education += "Take your diabetes medications as prescribed. "
  
  if (egfr !== undefined && egfr < 45) {
    education += "Some diabetes medications need dose adjustments with kidney disease. We monitor this closely. "
  }

  education += "Check your blood sugar regularly and report any episodes of low blood sugar (shakiness, sweating, confusion). "
  education += "Get your annual eye exam and foot exam to check for diabetes complications."

  return education
}

export const diabetesSpecialistAgentMeta = {
  agentId: "diabetes_specialist_agent",
  displayName: "Diabetes Management Specialist",
  sectionsOwned: ["diabetes"],
  guidelines: [
    "ADA Standards of Care 2025",
    "KDIGO 2024 CKD Management",
    "KDIGO Diabetes in CKD Guidelines",
  ],
  confidenceThreshold: 0.8,
}
