/**
 * Heart Failure Agent
 * Assesses HF status, GDMT optimization, cardiorenal syndrome, and Furoscix candidacy
 * Sections: heart_failure (conditional)
 * Guidelines: AHA/ACC Heart Failure Guidelines
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
 * Classify HF type based on LVEF
 */
function classifyHfByEf(lvef: number): string {
  if (lvef < 40) return "HFrEF (reduced EF)"
  if (lvef <= 49) return "HFmrEF (mildly reduced EF)"
  return "HFpEF (preserved EF)"
}

/**
 * Calculate HF GDMT compliance
 */
function calculateHfGdmt(
  hasBb: boolean,
  hasMra: boolean,
  hasSglt2i: boolean,
  hasArni: boolean
): { count: number; total: number; percentage: number } {
  const count = [hasBb, hasMra, hasSglt2i, hasArni].filter(Boolean).length
  return { count, total: 4, percentage: (count / 4) * 100 }
}

/**
 * Interpret cardiorenal syndrome type
 */
function interpretCrsType(crsType: string): string {
  switch (crsType) {
    case "Type1":
      return "Type 1 (acute cardiorenal) - acute HF causing AKI"
    case "Type2":
      return "Type 2 (chronic cardiorenal) - chronic HF causing progressive CKD"
    case "Type3":
      return "Type 3 (acute renocardiac) - AKI causing acute cardiac dysfunction"
    case "Type4":
      return "Type 4 (chronic renocardiac) - CKD causing chronic cardiac disease"
    case "Type5":
      return "Type 5 (secondary) - systemic condition affecting both"
    default:
      return crsType
  }
}

/**
 * Heart Failure Agent
 */
export const heartFailureAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract heart failure fields
  const hfStatus = getField<string>(currentData, "heart_failure", "hf_status")
  const lvef = getField<number>(currentData, "heart_failure", "lvef")
  const hfType = getField<string>(currentData, "heart_failure", "hf_type")
  const lastEchoDate = getField<string>(currentData, "heart_failure", "last_echo_date")
  const gdmtBb = getField<boolean>(currentData, "heart_failure", "gdmt_bb") ?? false
  const gdmtMra = getField<boolean>(currentData, "heart_failure", "gdmt_mra_hf") ?? false
  const gdmtSglt2i = getField<boolean>(currentData, "heart_failure", "gdmt_sglt2i_hf") ?? false
  const gdmtArni = getField<boolean>(currentData, "heart_failure", "gdmt_arni") ?? false
  const crsType = getField<string>(currentData, "heart_failure", "crs_type")
  const cardiologyFollowup = getField<string>(currentData, "heart_failure", "cardiology_followup")
  const furoscixStatus = getField<string>(currentData, "heart_failure", "furoscix_status")

  // Track citations
  if (lvef !== undefined) {
    citations.push({ fieldId: "lvef", value: lvef, source: "echo" })
  }
  if (hfType !== undefined) {
    citations.push({ fieldId: "hf_type", value: hfType, source: "provider" })
  }

  // Build interpretation
  let interpretation = ""
  let confidence = 0.85

  // HF type and LVEF assessment
  if (hfType && hfType !== "None") {
    interpretation = `Heart failure: ${hfType}.`
    
    if (lvef !== undefined) {
      const efClassification = classifyHfByEf(lvef)
      interpretation += ` LVEF ${lvef}% (${efClassification}).`
    }
  } else {
    interpretation = "No heart failure documented."
    confidence = 0.95 // High confidence when no HF
    return {
      interpretation,
      actionItems: [],
      confidence,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "Your heart function appears normal based on available information.",
      citations,
    }
  }

  // HF GDMT assessment
  const hfGdmt = calculateHfGdmt(gdmtBb, gdmtMra, gdmtSglt2i, gdmtArni)
  interpretation += ` HF GDMT: ${hfGdmt.count}/${hfGdmt.total} pillars on therapy.`

  // Generate GDMT-related alerts and actions
  if (lvef !== undefined && lvef < 40) {
    // HFrEF - all 4 pillars indicated
    if (!gdmtArni) {
      alerts.push(createAlert(
        "heart_failure",
        "gdmt_arni",
        "HFrEF without ARNi - evaluate candidacy for sacubitril/valsartan",
        "high"
      ))
      actionItems.push(createActionItem(
        "Evaluate ARNi (sacubitril/valsartan) candidacy for HFrEF",
        "urgent",
        "provider",
        "sacubitril/valsartan"
      ))
    }
    if (!gdmtBb) {
      actionItems.push(createActionItem(
        "Initiate beta-blocker for HFrEF if not contraindicated",
        "routine",
        "provider"
      ))
    }
    if (!gdmtMra) {
      actionItems.push(createActionItem(
        "Consider MRA (spironolactone/eplerenone) for HFrEF - monitor potassium",
        "routine",
        "provider"
      ))
    }
    if (!gdmtSglt2i) {
      actionItems.push(createActionItem(
        "Initiate SGLT2i for HFrEF (also benefits CKD)",
        "routine",
        "provider"
      ))
    }

    if (lvef < 30 && !gdmtArni) {
      alerts.push(createAlert(
        "heart_failure",
        "lvef",
        `Severely reduced EF (${lvef}%) without ARNi - high priority for optimization`,
        "high"
      ))
    }
  } else if (lvef !== undefined && lvef >= 40) {
    // HFmrEF or HFpEF - SGLT2i still indicated
    if (!gdmtSglt2i) {
      actionItems.push(createActionItem(
        "Consider SGLT2i for HFpEF/HFmrEF - evidence supports benefit",
        "routine",
        "provider"
      ))
    }
  }

  // Cardiorenal syndrome assessment
  if (crsType) {
    interpretation += ` Cardiorenal syndrome: ${interpretCrsType(crsType)}.`
    
    if (crsType === "Type1" || crsType === "Type2") {
      alerts.push(createAlert(
        "heart_failure",
        "crs_type",
        `Active cardiorenal syndrome (${crsType}) - coordinate nephrology/cardiology management`,
        "high"
      ))
      actionItems.push(createActionItem(
        "Coordinate care between nephrology and cardiology for cardiorenal syndrome",
        "urgent",
        "provider"
      ))
    }
  }

  // Furoscix candidacy
  if (furoscixStatus) {
    interpretation += ` Furoscix status: ${furoscixStatus}.`
    
    if (furoscixStatus === "candidate") {
      actionItems.push(createActionItem(
        "Evaluate Furoscix (subcutaneous furosemide) for home diuretic management",
        "routine",
        "provider"
      ))
    }
  }

  // Echo follow-up
  if (lastEchoDate) {
    const echoDate = new Date(lastEchoDate)
    const monthsSinceEcho = (Date.now() - echoDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    
    if (monthsSinceEcho > 12 && lvef !== undefined && lvef < 40) {
      actionItems.push(createActionItem(
        "Consider repeat echocardiogram - last echo > 12 months ago",
        "routine",
        "provider"
      ))
    }
  }

  // Cardiology follow-up
  if (!cardiologyFollowup || cardiologyFollowup === "none") {
    if (lvef !== undefined && lvef < 40) {
      actionItems.push(createActionItem(
        "Ensure cardiology follow-up for HFrEF management",
        "routine",
        "coordinator"
      ))
    }
  }

  // Cross-reference with CKD GDMT
  const ckdSglt2iStatus = getField<string>(currentData, "sglt2i", "sglt2i_status")
  if (gdmtSglt2i && ckdSglt2iStatus !== "on") {
    // Discordance between HF and CKD sections
    interpretation += " Note: SGLT2i documented for HF but not in CKD GDMT section - verify consistency."
    confidence -= 0.1
  }

  const reviewNeeded = 
    (lvef !== undefined && lvef < 30 && !gdmtArni) ||
    (crsType === "Type1" || crsType === "Type2") ||
    hfGdmt.count < 2 ||
    confidence < CONFIDENCE_THRESHOLDS.REVIEW_SUGGESTED

  // Patient education
  const patientEducation = generatePatientEducation(hfType, lvef, hfGdmt)

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
  hfType: string | undefined,
  lvef: number | undefined,
  hfGdmt: { count: number; total: number }
): string {
  let education = "You have heart failure, which means your heart doesn't pump as efficiently as it should. "

  if (lvef !== undefined) {
    if (lvef < 40) {
      education += "Your heart's pumping strength is reduced. "
    } else if (lvef <= 49) {
      education += "Your heart's pumping strength is mildly reduced. "
    } else {
      education += "Your heart's pumping strength is preserved, but it has trouble relaxing. "
    }
  }

  education += `You are on ${hfGdmt.count} of ${hfGdmt.total} recommended heart failure medications. `

  education += "It's important to: limit salt intake, weigh yourself daily, take your medications as prescribed, and report any sudden weight gain or worsening shortness of breath."

  return education
}

export const heartFailureAgentMeta = {
  agentId: "heart_failure_agent",
  displayName: "Heart Failure Agent",
  sectionsOwned: ["heart_failure"],
  guidelines: ["AHA/ACC Heart Failure Guidelines"],
  confidenceThreshold: 0.7,
}
