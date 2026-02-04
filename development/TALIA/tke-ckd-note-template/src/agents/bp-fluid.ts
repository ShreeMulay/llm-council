/**
 * Blood Pressure & Fluid Agent
 * Assesses BP control per SPRINT/KDIGO targets, fluid status, and Daxor BVA results
 * Sections: bp_fluid
 * Guidelines: KDIGO 2024 BP in CKD, SPRINT Trial
 */

import type { AgentInput, AgentOutput, AgentFunction, ActionItem } from "./types"
import {
  createAlert,
  createActionItem,
  getField,
  CONFIDENCE_THRESHOLDS,
} from "./types"
import type { Alert } from "../types/schema"

/**
 * Interpret BP control status based on SPRINT targets
 */
function interpretBpControl(systolic: number, diastolic: number): {
  status: string
  target: string
  atGoal: boolean
} {
  // SPRINT target: <120 systolic for most CKD patients
  const sprintTarget = 120
  const diastolicTarget = 80

  if (systolic >= 180 || diastolic >= 120) {
    return { status: "hypertensive urgency/emergency", target: "<120/<80", atGoal: false }
  }
  if (systolic < 90) {
    return { status: "hypotensive", target: "<120/<80", atGoal: false }
  }
  if (systolic < sprintTarget && diastolic < diastolicTarget) {
    return { status: "at SPRINT target", target: "<120/<80", atGoal: true }
  }
  if (systolic < 130 && diastolic < 80) {
    return { status: "controlled but above SPRINT target", target: "<120/<80", atGoal: false }
  }
  if (systolic < 140 && diastolic < 90) {
    return { status: "stage 1 hypertension", target: "<120/<80", atGoal: false }
  }
  return { status: "uncontrolled hypertension", target: "<120/<80", atGoal: false }
}

/**
 * Interpret edema severity
 */
function interpretEdema(edema: string): { severity: string; needsAction: boolean } {
  switch (edema) {
    case "none":
    case "trace":
      return { severity: "minimal", needsAction: false }
    case "1+":
      return { severity: "mild", needsAction: false }
    case "2+":
      return { severity: "moderate", needsAction: true }
    case "3+":
    case "4+":
      return { severity: "severe", needsAction: true }
    default:
      return { severity: "unknown", needsAction: false }
  }
}

/**
 * Blood Pressure & Fluid Agent
 */
export const bpFluidAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract BP and fluid fields
  const systolic = getField<number>(currentData, "bp_fluid", "systolic_bp")
  const diastolic = getField<number>(currentData, "bp_fluid", "diastolic_bp")
  const heartRate = getField<number>(currentData, "bp_fluid", "heart_rate")
  const o2Sat = getField<number>(currentData, "bp_fluid", "o2_saturation")
  const bpControlStatus = getField<string>(currentData, "bp_fluid", "bp_control_status")
  const homeBpAvailable = getField<boolean>(currentData, "bp_fluid", "home_bp_available")
  const edema = getField<string>(currentData, "bp_fluid", "edema")
  const fluidStatus = getField<string>(currentData, "bp_fluid", "fluid_status")
  const daxorResult = getField<string>(currentData, "bp_fluid", "daxor_bva_result")

  // Previous values for comparison
  const systolicPrev = getField<number>(previousData, "bp_fluid", "systolic_bp")

  // Track citations
  if (systolic !== undefined) {
    citations.push({ fieldId: "systolic_bp", value: systolic, source: "vitals" })
  }
  if (diastolic !== undefined) {
    citations.push({ fieldId: "diastolic_bp", value: diastolic, source: "vitals" })
  }

  // Build interpretation
  let interpretation = ""
  let confidence = 0.85

  if (systolic !== undefined && diastolic !== undefined) {
    const bpAnalysis = interpretBpControl(systolic, diastolic)
    interpretation = `Blood pressure ${systolic}/${diastolic} mmHg - ${bpAnalysis.status}.`

    if (systolicPrev !== undefined) {
      const change = systolic - systolicPrev
      if (Math.abs(change) >= 10) {
        interpretation += change > 0
          ? ` Systolic increased by ${change} mmHg from previous visit.`
          : ` Systolic improved by ${Math.abs(change)} mmHg from previous visit.`
      }
    }

    // Generate BP-related alerts
    if (systolic >= 180 || diastolic >= 120) {
      alerts.push(createAlert(
        "bp_fluid",
        "systolic_bp",
        `Hypertensive urgency/emergency: ${systolic}/${diastolic} mmHg - immediate evaluation required`,
        "critical"
      ))
      actionItems.push(createActionItem(
        "Evaluate for hypertensive emergency - assess end-organ damage",
        "urgent",
        "provider"
      ))
    } else if (systolic < 90) {
      alerts.push(createAlert(
        "bp_fluid",
        "systolic_bp",
        `Hypotension: ${systolic}/${diastolic} mmHg - review antihypertensive medications`,
        "high"
      ))
      actionItems.push(createActionItem(
        "Review and consider reducing antihypertensive medications",
        "urgent",
        "provider"
      ))
    } else if (!bpAnalysis.atGoal) {
      if (systolic >= 140 || diastolic >= 90) {
        actionItems.push(createActionItem(
          "Intensify antihypertensive therapy to achieve SPRINT target (<120 systolic)",
          "routine",
          "provider"
        ))
      } else if (systolic >= 120) {
        actionItems.push(createActionItem(
          "Consider further BP optimization toward SPRINT target if tolerated",
          "optional",
          "provider"
        ))
      }
    }
  } else {
    interpretation = "Blood pressure not recorded."
    confidence -= 0.3
  }

  // Heart rate and O2 sat
  if (heartRate !== undefined) {
    interpretation += ` Heart rate ${heartRate} bpm.`
    if (heartRate > 100) {
      actionItems.push(createActionItem(
        "Evaluate tachycardia - consider causes (anemia, volume status, thyroid)",
        "routine",
        "provider"
      ))
    }
  }

  if (o2Sat !== undefined && o2Sat < 94) {
    alerts.push(createAlert(
      "bp_fluid",
      "o2_saturation",
      `Low oxygen saturation: ${o2Sat}%`,
      "high"
    ))
    actionItems.push(createActionItem(
      "Evaluate hypoxemia - consider pulmonary edema, infection, or other causes",
      "urgent",
      "provider"
    ))
  }

  // Fluid status assessment
  if (edema !== undefined) {
    const edemaAnalysis = interpretEdema(edema)
    interpretation += ` Edema: ${edema} (${edemaAnalysis.severity}).`

    if (edemaAnalysis.needsAction) {
      alerts.push(createAlert(
        "bp_fluid",
        "edema",
        `Significant edema (${edema}) - assess for fluid overload`,
        "high"
      ))
      actionItems.push(createActionItem(
        "Assess volume status and consider diuretic adjustment",
        "routine",
        "provider"
      ))
    }
  }

  if (fluidStatus !== undefined) {
    interpretation += ` Fluid status: ${fluidStatus}.`
    
    if (fluidStatus === "hypervolemic") {
      actionItems.push(createActionItem(
        "Optimize diuretic therapy for volume overload",
        "routine",
        "provider"
      ))
      actionItems.push(createActionItem(
        "Reinforce sodium restriction (<2g/day)",
        "routine",
        "nurse"
      ))
    } else if (fluidStatus === "hypovolemic") {
      actionItems.push(createActionItem(
        "Evaluate for dehydration - consider holding diuretics temporarily",
        "routine",
        "provider"
      ))
    }
  }

  // Daxor BVA results
  if (daxorResult) {
    interpretation += ` Daxor blood volume analysis: ${daxorResult}.`
    citations.push({ fieldId: "daxor_bva_result", value: daxorResult, source: "manual" })
  }

  // Home BP monitoring
  if (homeBpAvailable === false) {
    actionItems.push(createActionItem(
      "Recommend home blood pressure monitoring for better BP assessment",
      "optional",
      "nurse"
    ))
  }

  // Consider orthostatic hypotension in elderly
  if (patientContext.age !== undefined && patientContext.age >= 65) {
    if (systolic !== undefined && systolic < 110) {
      actionItems.push(createActionItem(
        "Assess for orthostatic hypotension and fall risk in elderly patient",
        "routine",
        "provider"
      ))
    }
  }

  const reviewNeeded = 
    (systolic !== undefined && (systolic >= 180 || systolic < 90)) ||
    (diastolic !== undefined && diastolic >= 120) ||
    (o2Sat !== undefined && o2Sat < 94) ||
    confidence < CONFIDENCE_THRESHOLDS.REVIEW_SUGGESTED

  // Patient education
  const patientEducation = generatePatientEducation(systolic, diastolic, edema, fluidStatus)

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
  systolic: number | undefined,
  diastolic: number | undefined,
  edema: string | undefined,
  fluidStatus: string | undefined
): string {
  let education = ""

  if (systolic !== undefined && diastolic !== undefined) {
    if (systolic < 120 && diastolic < 80) {
      education += "Your blood pressure is well controlled. "
    } else if (systolic < 140 && diastolic < 90) {
      education += "Your blood pressure is slightly elevated. We aim for a target below 120/80. "
    } else {
      education += "Your blood pressure needs better control. Taking medications as prescribed and limiting salt intake will help. "
    }
  }

  if (edema && edema !== "none" && edema !== "trace") {
    education += "You have some swelling, which may indicate fluid retention. Limiting salt and taking your water pills as prescribed can help. "
  }

  if (fluidStatus === "hypervolemic") {
    education += "You are retaining extra fluid. Please limit salt to less than 2 grams per day and take your diuretic as prescribed. "
  }

  education += "Check your blood pressure at home if you have a monitor and bring the readings to your next visit."

  return education
}

export const bpFluidAgentMeta = {
  agentId: "bp_fluid_agent",
  displayName: "Blood Pressure & Fluid Agent",
  sectionsOwned: ["bp_fluid"],
  guidelines: ["KDIGO 2024 BP in CKD", "SPRINT Trial"],
  confidenceThreshold: 0.7,
}
