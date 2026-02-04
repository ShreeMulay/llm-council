/**
 * Medication Safety Agent
 * Monitors Triple Whammy, NSAID use, PPI overuse, sick day rules, contrast precautions, and adherence
 * Sections: tobacco, nsaid, ppi, sick_day, contrast, medication_adherence
 * Guidelines: Fax manager medication safety rules
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
 * Check for Triple Whammy (RAAS + diuretic + NSAID)
 */
function checkTripleWhammy(
  raasStatus: string | undefined,
  nsaidStatus: string | undefined,
  onDiuretic: boolean
): boolean {
  const onRaas = raasStatus?.startsWith("on_") ?? false
  const onNsaid = nsaidStatus !== "not_using" && nsaidStatus !== undefined
  return onRaas && onDiuretic && onNsaid
}

/**
 * Medication Safety Agent
 */
export const medicationSafetyAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext, sectionId } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  let interpretation = ""
  let confidence = 0.85

  // Cross-cutting safety checks (run for all sections)
  const raasStatus = getField<string>(currentData, "raas", "raas_status")
  const nsaidStatus = getField<string>(currentData, "nsaid", "nsaid_status")
  const fluidStatus = getField<string>(currentData, "bp_fluid", "fluid_status")
  const onDiuretic = fluidStatus === "hypervolemic" || getField<boolean>(currentData, "medication_adherence", "on_diuretic") === true

  // Triple Whammy check
  if (checkTripleWhammy(raasStatus, nsaidStatus, onDiuretic)) {
    alerts.push(createAlert(
      "nsaid",
      "nsaid_status",
      "TRIPLE WHAMMY: ACEi/ARB + diuretic + NSAID detected - high AKI risk",
      "critical"
    ))
    actionItems.push(createActionItem(
      "URGENT: Discontinue NSAID - Triple Whammy combination detected",
      "urgent",
      "provider"
    ))
  }

  // Section-specific interpretation
  switch (sectionId) {
    case "tobacco":
      interpretation = await interpretTobacco(currentData, alerts, actionItems, citations)
      break
    case "nsaid":
      interpretation = await interpretNsaid(currentData, alerts, actionItems, citations, patientContext)
      break
    case "ppi":
      interpretation = await interpretPpi(currentData, alerts, actionItems, citations)
      break
    case "sick_day":
      interpretation = await interpretSickDay(currentData, alerts, actionItems, citations)
      break
    case "contrast":
      interpretation = await interpretContrast(currentData, alerts, actionItems, citations, patientContext)
      break
    case "medication_adherence":
      interpretation = await interpretAdherence(currentData, alerts, actionItems, citations)
      break
    default:
      interpretation = "Section not handled by medication safety agent."
      confidence = 0.5
  }

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical") ||
    confidence < CONFIDENCE_THRESHOLDS.REVIEW_SUGGESTED

  const patientEducation = generatePatientEducation(sectionId, currentData)

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

async function interpretTobacco(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const smokingStatus = getField<string>(data, "tobacco", "smoking_status")
  const packYears = getField<number>(data, "tobacco", "pack_years")
  const vapingStatus = getField<string>(data, "tobacco", "vaping_status")
  const cessationCounseling = getField<boolean>(data, "tobacco", "cessation_counseling")

  let interpretation = ""

  if (smokingStatus) {
    citations.push({ fieldId: "smoking_status", value: smokingStatus, source: "provider" })
    interpretation = `Smoking status: ${smokingStatus}.`

    if (smokingStatus === "current") {
      alerts.push(createAlert(
        "tobacco",
        "smoking_status",
        "Active smoker - tobacco accelerates CKD progression",
        "high"
      ))
      actionItems.push(createActionItem(
        "Provide tobacco cessation counseling and resources",
        "routine",
        "provider"
      ))
      actionItems.push(createActionItem(
        "Consider pharmacotherapy for smoking cessation (varenicline, bupropion, NRT)",
        "routine",
        "provider"
      ))
    }

    if (packYears !== undefined && packYears > 0) {
      interpretation += ` Pack-years: ${packYears}.`
    }
  }

  if (vapingStatus && vapingStatus !== "never") {
    interpretation += ` Vaping: ${vapingStatus}.`
    if (vapingStatus === "current") {
      actionItems.push(createActionItem(
        "Counsel on vaping cessation - unknown long-term kidney effects",
        "routine",
        "provider"
      ))
    }
  }

  if (smokingStatus === "current" && !cessationCounseling) {
    actionItems.push(createActionItem(
      "Document tobacco cessation counseling provided",
      "routine",
      "nurse"
    ))
  }

  return interpretation || "Tobacco status not documented."
}

async function interpretNsaid(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { currentEgfr?: number }
): Promise<string> {
  const nsaidStatus = getField<string>(data, "nsaid", "nsaid_status")
  const specificNsaid = getField<string>(data, "nsaid", "specific_nsaid")
  const counseledOnAvoidance = getField<boolean>(data, "nsaid", "counseled_on_avoidance")
  const alternativesDiscussed = getField<string>(data, "nsaid", "alternatives_discussed")

  let interpretation = ""

  if (nsaidStatus) {
    citations.push({ fieldId: "nsaid_status", value: nsaidStatus, source: "provider" })
    interpretation = `NSAID status: ${nsaidStatus}.`

    if (nsaidStatus !== "not_using") {
      if (specificNsaid) {
        interpretation += ` Using: ${specificNsaid}.`
      }

      // NSAID warnings based on eGFR
      if (context.currentEgfr !== undefined) {
        if (context.currentEgfr < 60) {
          alerts.push(createAlert(
            "nsaid",
            "nsaid_status",
            `NSAID use with eGFR < 60 - counsel on avoidance`,
            "high"
          ))
          actionItems.push(createActionItem(
            "Counsel patient to avoid NSAIDs - recommend acetaminophen as alternative",
            "urgent",
            "provider"
          ))
        } else if (context.currentEgfr < 90) {
          alerts.push(createAlert(
            "nsaid",
            "nsaid_status",
            "NSAID use with reduced kidney function - use with caution",
            "medium"
          ))
        }
      }
    }
  }

  if (!counseledOnAvoidance && context.currentEgfr !== undefined && context.currentEgfr < 60) {
    actionItems.push(createActionItem(
      "Document NSAID avoidance counseling",
      "routine",
      "nurse"
    ))
  }

  if (alternativesDiscussed) {
    interpretation += ` Alternatives discussed: ${alternativesDiscussed}.`
  }

  return interpretation || "NSAID status not documented."
}

async function interpretPpi(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const ppiStatus = getField<string>(data, "ppi", "ppi_status")
  const ppiDrugDose = getField<string>(data, "ppi", "ppi_drug_dose")
  const alternativeRecommended = getField<string>(data, "ppi", "alternative_recommended")

  let interpretation = ""

  if (ppiStatus) {
    citations.push({ fieldId: "ppi_status", value: ppiStatus, source: "provider" })
    interpretation = `PPI status: ${ppiStatus}.`

    if (ppiDrugDose) {
      interpretation += ` (${ppiDrugDose})`
    }

    if (ppiStatus === "on_questionable") {
      alerts.push(createAlert(
        "ppi",
        "ppi_status",
        "PPI without clear indication - consider de-escalation (AIN/CKD progression risk)",
        "medium"
      ))
      actionItems.push(createActionItem(
        "Evaluate PPI indication - consider step-down to H2 blocker or discontinuation",
        "routine",
        "provider"
      ))
    }
  }

  if (alternativeRecommended) {
    interpretation += ` Alternative recommended: ${alternativeRecommended}.`
  }

  return interpretation || "PPI status not documented."
}

async function interpretSickDay(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const sickDayRulesReviewed = getField<boolean>(data, "sick_day", "sick_day_rules_reviewed")
  const medsToHoldListGiven = getField<boolean>(data, "sick_day", "meds_to_hold_list_given")
  const patientUnderstanding = getField<boolean>(data, "sick_day", "patient_understanding")

  // Check if patient is on medications requiring sick day rules
  const raasStatus = getField<string>(data, "raas", "raas_status")
  const sglt2iStatus = getField<string>(data, "sglt2i", "sglt2i_status")
  const mraStatus = getField<string>(data, "mra", "mra_status")

  const needsSickDayRules = 
    raasStatus?.startsWith("on_") ||
    sglt2iStatus === "on" ||
    mraStatus?.startsWith("on_")

  let interpretation = ""

  if (sickDayRulesReviewed) {
    citations.push({ fieldId: "sick_day_rules_reviewed", value: sickDayRulesReviewed, source: "provider" })
    interpretation = "Sick day rules reviewed this visit."

    if (medsToHoldListGiven) {
      interpretation += " Medications-to-hold list provided."
    }

    if (patientUnderstanding) {
      interpretation += " Patient demonstrates understanding."
    }
  } else if (needsSickDayRules) {
    alerts.push(createAlert(
      "sick_day",
      "sick_day_rules_reviewed",
      "Sick day rules not reviewed - patient on RAAS/SGLT2i/MRA",
      "medium"
    ))
    actionItems.push(createActionItem(
      "Review sick day rules: hold RAAS, SGLT2i, MRA, diuretics during acute illness",
      "routine",
      "nurse"
    ))
    actionItems.push(createActionItem(
      "Provide written medications-to-hold list",
      "routine",
      "nurse"
    ))
    interpretation = "Sick day rules not reviewed this visit."
  } else {
    interpretation = "Sick day rules not applicable (not on high-risk medications)."
  }

  return interpretation
}

async function interpretContrast(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { currentEgfr?: number }
): Promise<string> {
  const contrastIn30Days = getField<boolean>(data, "contrast", "contrast_in_30_days")
  const preHydrationUsed = getField<boolean>(data, "contrast", "pre_hydration_used")
  const holdNephrotoxins = getField<boolean>(data, "contrast", "hold_nephrotoxins")

  let interpretation = ""

  if (contrastIn30Days) {
    citations.push({ fieldId: "contrast_in_30_days", value: contrastIn30Days, source: "chart" })
    interpretation = "Contrast exposure within last 30 days."

    if (context.currentEgfr !== undefined && context.currentEgfr < 45) {
      alerts.push(createAlert(
        "contrast",
        "contrast_in_30_days",
        "Recent contrast exposure with eGFR < 45 - monitor for contrast-induced AKI",
        "high"
      ))
      actionItems.push(createActionItem(
        "Monitor creatinine 48-72 hours post-contrast",
        "routine",
        "coordinator"
      ))
    }

    if (preHydrationUsed) {
      interpretation += " Pre-hydration protocol used."
    } else {
      actionItems.push(createActionItem(
        "Document pre-hydration protocol for future contrast studies",
        "optional",
        "provider"
      ))
    }

    if (holdNephrotoxins) {
      interpretation += " Nephrotoxins held peri-procedure."
    }
  } else {
    interpretation = "No recent contrast exposure."
  }

  // Future contrast precautions
  if (context.currentEgfr !== undefined && context.currentEgfr < 30) {
    actionItems.push(createActionItem(
      "For future contrast studies: ensure pre-hydration and hold metformin/nephrotoxins",
      "optional",
      "provider"
    ))
  }

  return interpretation
}

async function interpretAdherence(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const adherenceAssessment = getField<string>(data, "medication_adherence", "adherence_assessment")
  const costBarriers = getField<boolean>(data, "medication_adherence", "cost_barriers")
  const priorAuthPending = getField<string>(data, "medication_adherence", "prior_auth_pending")
  const pharmacyAccess = getField<string>(data, "medication_adherence", "pharmacy_access")
  const pregnancyContraception = getField<string>(data, "medication_adherence", "pregnancy_contraception")

  let interpretation = ""

  if (adherenceAssessment) {
    citations.push({ fieldId: "adherence_assessment", value: adherenceAssessment, source: "provider" })
    interpretation = `Medication adherence: ${adherenceAssessment}.`

    if (adherenceAssessment === "poor" || adherenceAssessment === "fair") {
      alerts.push(createAlert(
        "medication_adherence",
        "adherence_assessment",
        `Suboptimal medication adherence (${adherenceAssessment}) - identify barriers`,
        "medium"
      ))
    }
  }

  // Barriers assessment
  const barriers: string[] = []

  if (costBarriers) {
    barriers.push("cost")
    actionItems.push(createActionItem(
      "Explore patient assistance programs or generic alternatives for cost barriers",
      "routine",
      "coordinator"
    ))
  }

  if (priorAuthPending) {
    barriers.push(`prior auth pending: ${priorAuthPending}`)
    actionItems.push(createActionItem(
      `Follow up on prior authorization for ${priorAuthPending}`,
      "routine",
      "coordinator"
    ))
  }

  if (pharmacyAccess === "poor") {
    barriers.push("pharmacy access")
    actionItems.push(createActionItem(
      "Evaluate mail-order pharmacy or 90-day supplies for access issues",
      "routine",
      "coordinator"
    ))
  }

  if (barriers.length > 0) {
    interpretation += ` Barriers identified: ${barriers.join(", ")}.`
  }

  if (pregnancyContraception) {
    interpretation += ` Pregnancy/contraception: ${pregnancyContraception}.`
  }

  return interpretation || "Medication adherence not assessed."
}

function generatePatientEducation(sectionId: string, data: Record<string, unknown>): string {
  switch (sectionId) {
    case "tobacco":
      return "Smoking harms your kidneys and speeds up kidney disease. Quitting smoking is one of the best things you can do for your kidney health. We can help with medications and support."
    case "nsaid":
      return "Pain relievers like ibuprofen (Advil, Motrin) and naproxen (Aleve) can harm your kidneys. Use acetaminophen (Tylenol) instead for pain relief. Always check with us before taking any new medications."
    case "ppi":
      return "Acid-reducing medications (like omeprazole/Prilosec) may affect kidney health if used long-term without a clear need. We periodically review if you still need this medication."
    case "sick_day":
      return "When you are sick with vomiting, diarrhea, or fever, temporarily stop certain medications to protect your kidneys. Keep your medications-to-hold list handy and call us if you're unsure."
    case "contrast":
      return "CT scans and some other tests use contrast dye that can temporarily affect your kidneys. We take precautions like giving you fluids and temporarily stopping certain medications."
    case "medication_adherence":
      return "Taking your medications as prescribed is crucial for protecting your kidneys. If you have trouble affording or getting your medications, please let us know so we can help."
    default:
      return "Medication safety is important for protecting your kidneys. Always check with your care team before starting any new medications."
  }
}

export const medicationSafetyAgentMeta = {
  agentId: "medication_safety_agent",
  displayName: "Medication Safety Agent",
  sectionsOwned: ["tobacco", "nsaid", "ppi", "sick_day", "contrast", "medication_adherence"],
  guidelines: ["Fax manager medication safety rules"],
  confidenceThreshold: 0.8,
}
