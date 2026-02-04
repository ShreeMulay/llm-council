/**
 * Physical Performance/Frailty Specialist Agent
 * Manages physical performance and frailty assessment for CKD patients
 * Section: physical_performance
 * Guidelines: KDIGO 2024, Fried Frailty Criteria
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
 * Physical Performance Specialist Agent
 * Deep expertise in frailty and physical function assessment for CKD
 */
export const physicalPerformanceSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract physical performance fields
  const gaitSpeed = getField<number>(currentData, "physical_performance", "gait_speed")
  const gripStrength = getField<number>(currentData, "physical_performance", "grip_strength")
  const sitToStand = getField<number>(currentData, "physical_performance", "sit_to_stand_time")
  const frailtyScore = getField<number>(currentData, "physical_performance", "frailty_score")
  const frailtyStatus = getField<string>(currentData, "physical_performance", "frailty_status")
  const fallHistory = getField<boolean>(currentData, "physical_performance", "fall_history")
  const ptReferral = getField<boolean>(currentData, "physical_performance", "pt_referral")
  const exerciseProgram = getField<string>(currentData, "physical_performance", "exercise_program")

  // Patient context
  const age = patientContext.age
  const ckdStage = patientContext.ckdStage

  let interpretation = ""
  let confidence = 0.85

  // Gait speed assessment (< 0.8 m/s indicates frailty risk)
  if (gaitSpeed !== undefined) {
    citations.push({ fieldId: "gait_speed", value: gaitSpeed, source: "exam" })
    interpretation = `Gait speed ${gaitSpeed} m/s.`

    if (gaitSpeed < 0.6) {
      alerts.push(createAlert(
        "physical_performance",
        "gait_speed",
        `Severely reduced gait speed (${gaitSpeed} m/s) - high frailty risk`,
        "high"
      ))
      interpretation += " Severely reduced - high frailty risk."
      actionItems.push(createActionItem(
        "Refer to physical therapy for gait and strength training",
        "routine",
        "coordinator"
      ))
    } else if (gaitSpeed < 0.8) {
      interpretation += " Reduced - frailty indicator."
      actionItems.push(createActionItem(
        "Consider physical therapy referral for reduced gait speed",
        "routine",
        "provider"
      ))
    } else if (gaitSpeed >= 1.0) {
      interpretation += " Normal."
    }
  }

  // Grip strength assessment
  if (gripStrength !== undefined) {
    citations.push({ fieldId: "grip_strength", value: gripStrength, source: "exam" })
    interpretation += ` Grip strength ${gripStrength} kg.`

    // Thresholds vary by sex - using general cutoffs
    if (gripStrength < 20) {
      interpretation += " Reduced - sarcopenia indicator."
      actionItems.push(createActionItem(
        "Evaluate for sarcopenia - consider resistance training program",
        "routine",
        "provider"
      ))
    }
  }

  // Sit-to-stand test (5 repetitions, > 12 seconds indicates impairment)
  if (sitToStand !== undefined) {
    citations.push({ fieldId: "sit_to_stand_time", value: sitToStand, source: "exam" })
    interpretation += ` Sit-to-stand: ${sitToStand} seconds.`

    if (sitToStand > 15) {
      interpretation += " Impaired lower extremity function."
      actionItems.push(createActionItem(
        "Address lower extremity weakness with targeted exercises",
        "routine",
        "provider"
      ))
    } else if (sitToStand > 12) {
      interpretation += " Borderline impaired."
    }
  }

  // Frailty assessment
  if (frailtyStatus) {
    interpretation += ` Frailty status: ${frailtyStatus}.`
    citations.push({ fieldId: "frailty_status", value: frailtyStatus, source: "provider" })

    if (frailtyStatus === "frail") {
      alerts.push(createAlert(
        "physical_performance",
        "frailty_status",
        "Patient is frail - impacts treatment decisions and prognosis",
        "high"
      ))
      
      // Frailty impacts transplant candidacy
      if (ckdStage === "G4" || ckdStage === "G5") {
        actionItems.push(createActionItem(
          "Address frailty before transplant evaluation - may impact candidacy",
          "routine",
          "provider"
        ))
      }
      
      // Prehabilitation
      actionItems.push(createActionItem(
        "Consider prehabilitation program for frail patient",
        "routine",
        "coordinator"
      ))
    } else if (frailtyStatus === "pre_frail") {
      interpretation += " Pre-frail - intervention opportunity."
      actionItems.push(createActionItem(
        "Intervene to prevent frailty progression - exercise, nutrition optimization",
        "routine",
        "provider"
      ))
    }
  } else if (frailtyScore !== undefined) {
    citations.push({ fieldId: "frailty_score", value: frailtyScore, source: "calculated" })
    interpretation += ` Frailty score: ${frailtyScore}/5.`

    if (frailtyScore >= 3) {
      interpretation += " Frail."
    } else if (frailtyScore >= 1) {
      interpretation += " Pre-frail."
    } else {
      interpretation += " Robust."
    }
  } else if (age !== undefined && age >= 65) {
    actionItems.push(createActionItem(
      "Perform frailty assessment for elderly CKD patient",
      "routine",
      "nurse"
    ))
  }

  // Fall history
  if (fallHistory) {
    interpretation += " History of falls."
    alerts.push(createAlert(
      "physical_performance",
      "fall_history",
      "Fall history - increased injury risk",
      "medium"
    ))
    actionItems.push(createActionItem(
      "Implement fall prevention strategies - PT, home safety evaluation",
      "routine",
      "provider"
    ))
    actionItems.push(createActionItem(
      "Review medications for fall risk (sedatives, antihypertensives)",
      "routine",
      "provider"
    ))
  }

  // Physical therapy status
  if (ptReferral) {
    interpretation += " PT referral in place."
  } else if (frailtyStatus === "frail" || frailtyStatus === "pre_frail" || 
             (gaitSpeed !== undefined && gaitSpeed < 0.8)) {
    actionItems.push(createActionItem(
      "Refer to physical therapy for strength and balance training",
      "routine",
      "coordinator"
    ))
  }

  // Exercise program
  if (exerciseProgram) {
    interpretation += ` Exercise program: ${exerciseProgram}.`
  } else {
    actionItems.push(createActionItem(
      "Encourage regular physical activity as tolerated",
      "optional",
      "nurse"
    ))
  }

  // CKD-specific considerations
  if (ckdStage === "G5D") {
    // Dialysis patients have high frailty prevalence
    if (!frailtyStatus) {
      actionItems.push(createActionItem(
        "Assess frailty in dialysis patient - high prevalence population",
        "routine",
        "provider"
      ))
    }
    
    // Intradialytic exercise
    actionItems.push(createActionItem(
      "Consider intradialytic exercise program",
      "optional",
      "provider"
    ))
  }

  // Sarcopenia screening
  if ((age !== undefined && age >= 65) || ckdStage === "G4" || ckdStage === "G5") {
    if (!gripStrength && !gaitSpeed) {
      actionItems.push(createActionItem(
        "Screen for sarcopenia - measure gait speed and/or grip strength",
        "optional",
        "nurse"
      ))
    }
  }

  // Patient education
  const patientEducation = generatePatientEducation(frailtyStatus, fallHistory, exerciseProgram)

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
  frailtyStatus: string | undefined,
  fallHistory: boolean | undefined,
  exerciseProgram: string | undefined
): string {
  let education = "Staying physically active is important for your health, even with kidney disease. "
  education += "Regular exercise helps maintain muscle strength, balance, and energy levels. "

  if (frailtyStatus === "frail" || frailtyStatus === "pre_frail") {
    education += "We've noticed some changes in your physical function. "
    education += "Working with a physical therapist can help you regain strength and improve your quality of life. "
  }

  if (fallHistory) {
    education += "Since you've had falls, we want to help prevent future falls. "
    education += "Remove tripping hazards at home, use handrails, and consider wearing supportive shoes. "
  }

  if (exerciseProgram) {
    education += "Continue with your exercise program as prescribed. "
  } else {
    education += "Start with gentle activities like walking or chair exercises. "
    education += "Even 10-15 minutes of activity most days can make a difference. "
  }

  education += "Talk to your care team before starting any new exercise program."

  return education
}

export const physicalPerformanceSpecialistAgentMeta = {
  agentId: "physical_performance_specialist_agent",
  displayName: "Physical Performance/Frailty Specialist",
  sectionsOwned: ["physical_performance", "fall_risk"],
  guidelines: [
    "KDIGO 2024 CKD Management",
    "Fried Frailty Criteria",
    "EWGSOP2 Sarcopenia Guidelines",
  ],
  confidenceThreshold: 0.8,
}
