/**
 * Obesity Specialist Agent
 * Manages obesity assessment and weight management for CKD patients
 * Section: obesity
 * Guidelines: Obesity Medicine Association, KDIGO 2024
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
 * Obesity Specialist Agent
 * Deep expertise in obesity and weight management for CKD patients
 */
export const obesitySpecialistAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract obesity-specific fields
  const bmi = getField<number>(currentData, "obesity", "bmi") ?? getField<number>(currentData, "header", "bmi")
  const weightTrend6mo = getField<string>(currentData, "obesity", "weight_trend_6mo")
  const obesityClinicReferral = getField<boolean>(currentData, "obesity", "obesity_clinic_referral")
  const bariatricSurgeryHistory = getField<boolean>(currentData, "obesity", "bariatric_surgery_history")

  // Weight from header
  const weight = getField<number>(currentData, "header", "weight")
  const prevWeight = getField<number>(previousData, "header", "weight")

  // Patient context
  const isDiabetic = patientContext.isDiabetic
  const ckdStage = patientContext.ckdStage

  let interpretation = ""
  let confidence = 0.9

  // Not obese - quick return
  if (bmi !== undefined && bmi < 30) {
    let message = `BMI ${bmi.toFixed(1)} kg/m2`
    if (bmi >= 25) {
      message += " - overweight."
      return {
        interpretation: message,
        actionItems: [createActionItem(
          "Counsel on healthy weight maintenance to prevent CKD progression",
          "optional",
          "nurse"
        )],
        confidence: 0.95,
        reviewNeeded: false,
        alerts: [],
        patientEducation: "Maintaining a healthy weight helps protect your kidneys. Continue with healthy eating and regular physical activity.",
        citations: [{ fieldId: "bmi", value: bmi, source: "vitals" }],
      }
    }
    message += " - normal weight."
    return {
      interpretation: message,
      actionItems: [],
      confidence: 0.95,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "Your weight is in a healthy range. Continue with healthy eating and regular physical activity.",
      citations: [{ fieldId: "bmi", value: bmi, source: "vitals" }],
    }
  }

  // BMI not available
  if (bmi === undefined) {
    return {
      interpretation: "BMI not recorded.",
      actionItems: [createActionItem(
        "Record height and weight to calculate BMI",
        "routine",
        "nurse"
      )],
      confidence: 0.7,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "",
      citations: [],
    }
  }

  // Track citations
  citations.push({ fieldId: "bmi", value: bmi, source: "vitals" })
  if (weight !== undefined) citations.push({ fieldId: "weight", value: weight, source: "vitals" })

  // Obesity classification
  let obesityClass = ""
  if (bmi >= 40) {
    obesityClass = "Class III (severe)"
    alerts.push(createAlert(
      "obesity",
      "bmi",
      `Severe obesity (BMI ${bmi.toFixed(1)}) - significant CKD progression risk`,
      "high"
    ))
  } else if (bmi >= 35) {
    obesityClass = "Class II"
  } else {
    obesityClass = "Class I"
  }

  interpretation = `BMI ${bmi.toFixed(1)} kg/m2 (${obesityClass} obesity).`

  // Weight trend
  if (weight !== undefined && prevWeight !== undefined) {
    const weightChange = weight - prevWeight
    const percentChange = (weightChange / prevWeight) * 100

    if (weightChange < 0) {
      interpretation += ` Weight loss ${Math.abs(weightChange).toFixed(1)} lbs (${Math.abs(percentChange).toFixed(1)}%) since last visit.`
      if (percentChange <= -5) {
        interpretation += " Clinically significant weight loss - excellent progress."
      }
    } else if (weightChange > 0) {
      interpretation += ` Weight gain ${weightChange.toFixed(1)} lbs since last visit.`
      if (percentChange >= 5) {
        alerts.push(createAlert(
          "obesity",
          "bmi",
          `Significant weight gain (${percentChange.toFixed(1)}%) - evaluate`,
          "medium"
        ))
        actionItems.push(createActionItem(
          "Evaluate significant weight gain - assess fluid status, diet, medications",
          "routine",
          "provider"
        ))
      }
    }
  } else if (weightTrend6mo) {
    interpretation += ` 6-month weight trend: ${weightTrend6mo}.`
  }

  // GLP-1 RA cross-reference
  const glp1Status = getField<string>(currentData, "glp1", "glp1_status")
  if (glp1Status !== "on") {
    interpretation += " GLP-1 RA candidate for weight management."
    actionItems.push(createActionItem(
      "Consider GLP-1 RA (semaglutide/tirzepatide) for obesity and kidney protection",
      "routine",
      "provider"
    ))
    
    if (isDiabetic) {
      actionItems.push(createActionItem(
        "GLP-1 RA indicated for T2DM + obesity + CKD - triple benefit",
        "routine",
        "provider"
      ))
    }
  } else {
    interpretation += " On GLP-1 RA for weight management."
  }

  // Obesity medicine referral
  if (!obesityClinicReferral && bmi >= 35) {
    actionItems.push(createActionItem(
      "Consider obesity medicine referral for comprehensive weight management",
      "optional",
      "coordinator"
    ))
  } else if (obesityClinicReferral) {
    interpretation += " Obesity clinic referral in place."
  }

  // Bariatric surgery consideration
  if (bariatricSurgeryHistory) {
    interpretation += " History of bariatric surgery."
    actionItems.push(createActionItem(
      "Monitor for nutritional deficiencies post-bariatric surgery",
      "routine",
      "provider"
    ))
  } else if (bmi >= 40 || (bmi >= 35 && isDiabetic)) {
    // Bariatric surgery candidacy
    actionItems.push(createActionItem(
      "Discuss bariatric surgery as option for severe obesity",
      "optional",
      "provider"
    ))
    
    // Transplant consideration
    if (ckdStage === "G4" || ckdStage === "G5") {
      const transplantCandidate = getField<string>(currentData, "transplant", "transplant_candidate")
      if (transplantCandidate === "yes" || transplantCandidate === "evaluating") {
        actionItems.push(createActionItem(
          "BMI may be barrier to transplant listing - prioritize weight loss",
          "routine",
          "provider"
        ))
      }
    }
  }

  // Lifestyle interventions
  actionItems.push(createActionItem(
    "Reinforce dietary counseling for weight management",
    "routine",
    "nurse"
  ))

  // Dietitian referral
  const dietitianReferral = getField<boolean>(currentData, "sodium", "dietitian_referral")
  if (!dietitianReferral) {
    actionItems.push(createActionItem(
      "Consider dietitian referral for medical nutrition therapy",
      "optional",
      "coordinator"
    ))
  }

  // Physical activity
  actionItems.push(createActionItem(
    "Encourage physical activity as tolerated for weight management",
    "optional",
    "nurse"
  ))

  // Patient education
  const patientEducation = generatePatientEducation(bmi, glp1Status, bariatricSurgeryHistory)

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
  bmi: number | undefined,
  glp1Status: string | undefined,
  bariatricHistory: boolean | undefined
): string {
  let education = "Maintaining a healthy weight is important for your kidney health. "
  education += "Extra weight puts more stress on your kidneys and can speed up kidney disease progression. "

  if (bmi !== undefined && bmi >= 30) {
    education += "Even a 5-10% weight loss can significantly improve your health and slow kidney disease. "
  }

  education += "Focus on eating more vegetables, lean proteins, and whole grains while limiting processed foods and sugary drinks. "
  education += "Regular physical activity, even walking 30 minutes most days, helps with weight management. "

  if (glp1Status === "on") {
    education += "Your GLP-1 medication helps with weight loss in addition to protecting your kidneys. "
  }

  if (bariatricHistory) {
    education += "After bariatric surgery, it's important to take your vitamins and supplements as prescribed and attend follow-up appointments. "
  }

  education += "We are here to support you in your weight management journey."

  return education
}

export const obesitySpecialistAgentMeta = {
  agentId: "obesity_specialist_agent",
  displayName: "Obesity Specialist",
  sectionsOwned: ["obesity"],
  guidelines: [
    "Obesity Medicine Association Guidelines",
    "KDIGO 2024 CKD Management",
    "ADA Obesity Management in Diabetes",
  ],
  confidenceThreshold: 0.8,
}
