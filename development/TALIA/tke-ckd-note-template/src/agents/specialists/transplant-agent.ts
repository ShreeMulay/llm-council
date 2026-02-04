/**
 * Transplant Readiness Specialist Agent
 * Manages transplant evaluation and readiness for CKD patients
 * Section: transplant
 * Guidelines: KDIGO Transplant, AST Guidelines
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
 * Transplant Specialist Agent
 * Deep expertise in transplant readiness assessment for CKD
 */
export const transplantSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract transplant-specific fields
  const transplantCandidate = getField<string>(currentData, "transplant", "transplant_candidate")
  const transplantCenters = getField<string>(currentData, "transplant", "transplant_centers")
  const currentStatus = getField<string>(currentData, "transplant", "current_status")
  const livingDonor = getField<boolean>(currentData, "transplant", "living_donor")
  const workupCompletionPct = getField<number>(currentData, "transplant", "workup_completion_pct")
  const barriers = getField<string>(currentData, "transplant", "barriers")
  const bmiBarrier = getField<boolean>(currentData, "transplant", "bmi_barrier")

  // Patient context
  const ckdStage = patientContext.ckdStage
  const age = patientContext.age
  const kfre2yr = patientContext.kfre2yr

  // Cross-reference BMI
  const bmi = getField<number>(currentData, "obesity", "bmi") ?? getField<number>(currentData, "header", "bmi")

  let interpretation = ""
  let confidence = 0.9

  // Check if transplant section is applicable
  const shouldEvaluate = ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D" ||
                         (kfre2yr !== undefined && kfre2yr > 20)

  if (!shouldEvaluate) {
    return {
      interpretation: "Transplant evaluation not yet indicated based on CKD stage.",
      actionItems: [],
      confidence: 0.95,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "Kidney transplant is an option for patients with advanced kidney disease. We will discuss this when appropriate.",
      citations: [],
    }
  }

  // Transplant candidacy
  if (transplantCandidate) {
    citations.push({ fieldId: "transplant_candidate", value: transplantCandidate, source: "provider" })
    interpretation = `Transplant candidate: ${transplantCandidate}.`

    if (transplantCandidate === "yes") {
      // Active candidate - track progress
      if (currentStatus) {
        interpretation += ` Status: ${currentStatus}.`
        citations.push({ fieldId: "current_status", value: currentStatus, source: "provider" })

        if (currentStatus === "listed") {
          interpretation += " Listed for transplant."
          
          // Living donor assessment
          if (livingDonor) {
            interpretation += " Living donor identified."
            actionItems.push(createActionItem(
              "Follow up on living donor evaluation progress",
              "routine",
              "coordinator"
            ))
          } else {
            actionItems.push(createActionItem(
              "Discuss living donor options with patient and family",
              "optional",
              "provider"
            ))
          }
        } else if (currentStatus === "evaluating") {
          interpretation += " Evaluation in progress."
          
          if (workupCompletionPct !== undefined) {
            interpretation += ` Workup ${workupCompletionPct}% complete.`
            citations.push({ fieldId: "workup_completion_pct", value: workupCompletionPct, source: "coordinator" })
            
            if (workupCompletionPct < 50) {
              actionItems.push(createActionItem(
                "Expedite transplant workup - less than 50% complete",
                "routine",
                "coordinator"
              ))
            }
          }
        } else if (currentStatus === "on_hold") {
          interpretation += " Evaluation on hold."
          alerts.push(createAlert(
            "transplant",
            "current_status",
            "Transplant evaluation on hold - address barriers",
            "medium"
          ))
        }
      } else {
        // Candidate but no status - needs referral
        actionItems.push(createActionItem(
          "Initiate transplant center referral for eligible candidate",
          "routine",
          "coordinator"
        ))
      }

      // Transplant centers
      if (transplantCenters) {
        interpretation += ` Centers: ${transplantCenters}.`
      } else {
        actionItems.push(createActionItem(
          "Discuss transplant center options with patient",
          "routine",
          "provider"
        ))
      }

    } else if (transplantCandidate === "no") {
      interpretation += " Not a transplant candidate."
      
      if (barriers) {
        interpretation += ` Barriers: ${barriers}.`
        citations.push({ fieldId: "barriers", value: barriers, source: "provider" })
      }
      
      // Ensure conservative management discussed
      actionItems.push(createActionItem(
        "Ensure goals of care discussion for non-transplant candidate",
        "routine",
        "provider"
      ))

    } else if (transplantCandidate === "evaluating" || transplantCandidate === "undetermined") {
      interpretation += " Candidacy being evaluated."
      actionItems.push(createActionItem(
        "Complete transplant candidacy assessment",
        "routine",
        "provider"
      ))
    }
  } else {
    // No transplant status documented
    interpretation = "Transplant candidacy not documented."
    
    if (age !== undefined && age < 75) {
      actionItems.push(createActionItem(
        "Assess transplant candidacy for advanced CKD patient",
        "routine",
        "provider"
      ))
    } else if (age !== undefined && age >= 75) {
      actionItems.push(createActionItem(
        "Discuss transplant vs conservative management for elderly patient",
        "routine",
        "provider"
      ))
    }
  }

  // Barrier assessment
  if (barriers) {
    interpretation += ` Barriers: ${barriers}.`
    
    // Address specific barriers
    if (barriers.toLowerCase().includes("cardiac")) {
      actionItems.push(createActionItem(
        "Complete cardiac workup for transplant clearance",
        "routine",
        "coordinator"
      ))
    }
    if (barriers.toLowerCase().includes("infection")) {
      actionItems.push(createActionItem(
        "Address active infections before transplant listing",
        "routine",
        "provider"
      ))
    }
    if (barriers.toLowerCase().includes("malignancy") || barriers.toLowerCase().includes("cancer")) {
      actionItems.push(createActionItem(
        "Confirm cancer-free interval per transplant center requirements",
        "routine",
        "provider"
      ))
    }
  }

  // BMI barrier
  if (bmiBarrier || (bmi !== undefined && bmi >= 40)) {
    alerts.push(createAlert(
      "transplant",
      "bmi_barrier",
      `BMI ${bmi?.toFixed(1) || "elevated"} may be barrier to transplant listing`,
      "high"
    ))
    interpretation += " BMI barrier identified."
    actionItems.push(createActionItem(
      "Prioritize weight loss for transplant eligibility - consider GLP-1 RA, bariatric surgery",
      "routine",
      "provider"
    ))
  } else if (bmi !== undefined && bmi >= 35) {
    interpretation += " BMI may limit transplant center options."
    actionItems.push(createActionItem(
      "Discuss weight management for optimal transplant candidacy",
      "routine",
      "provider"
    ))
  }

  // Preemptive transplant consideration
  if (ckdStage === "G4" && transplantCandidate !== "no") {
    const egfr = patientContext.currentEgfr
    if (egfr !== undefined && egfr <= 20) {
      actionItems.push(createActionItem(
        "Consider preemptive transplant listing - eGFR approaching 20",
        "routine",
        "provider"
      ))
    }
  }

  // Immunization status for transplant
  actionItems.push(createActionItem(
    "Ensure transplant-required immunizations are up to date",
    "optional",
    "nurse"
  ))

  // Patient education
  const patientEducation = generatePatientEducation(transplantCandidate, currentStatus, livingDonor)

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
  transplantCandidate: string | undefined,
  currentStatus: string | undefined,
  livingDonor: boolean | undefined
): string {
  let education = "Kidney transplant is often the best treatment option for kidney failure. "
  education += "A transplanted kidney can provide better quality of life and longer survival compared to dialysis. "

  if (transplantCandidate === "yes") {
    if (currentStatus === "listed") {
      education += "You are on the transplant waiting list. "
      if (livingDonor) {
        education += "Having a living donor can significantly shorten your wait time. "
      } else {
        education += "Consider talking to family and friends about living donation - it can significantly shorten wait time. "
      }
    } else if (currentStatus === "evaluating") {
      education += "You are being evaluated for transplant. Complete all required tests and appointments to move forward. "
    }
  } else if (transplantCandidate === "no") {
    education += "Based on your current health, transplant may not be the best option for you. "
    education += "We will focus on other treatments to maintain your quality of life. "
  } else {
    education += "We will discuss whether transplant is right for you based on your overall health. "
  }

  education += "Ask your care team any questions you have about transplant."

  return education
}

export const transplantSpecialistAgentMeta = {
  agentId: "transplant_specialist_agent",
  displayName: "Transplant Readiness Specialist",
  sectionsOwned: ["transplant"],
  guidelines: [
    "KDIGO Transplant Guidelines",
    "AST Transplant Guidelines",
    "UNOS Policies",
  ],
  confidenceThreshold: 0.8,
}
