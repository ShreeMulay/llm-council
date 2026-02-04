/**
 * Pharmacotherapy (4 Pillars) Agent
 * Manages RAAS inhibition, SGLT2i, MRA (finerenone), GLP-1 RA, and lipid therapy
 * Sections: raas, sglt2i, mra, glp1, lipid_therapy
 * Guidelines: KDIGO 2024, CREDENCE, DAPA-CKD, EMPA-KIDNEY, FIDELIO-DKD, FIGARO-DKD, FLOW, CONFIDENCE
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
 * Calculate GDMT compliance (X/4 pillars)
 */
function calculateGdmtCompliance(
  raasStatus: string | undefined,
  sglt2iStatus: string | undefined,
  mraStatus: string | undefined,
  glp1Status: string | undefined
): { count: number; total: number; details: string[] } {
  const details: string[] = []
  let count = 0

  // RAAS: on_acei, on_arb, on_arni count as on therapy
  if (raasStatus?.startsWith("on_")) {
    count++
    details.push("RAAS: on therapy")
  } else {
    details.push(`RAAS: ${raasStatus || "not documented"}`)
  }

  // SGLT2i
  if (sglt2iStatus === "on") {
    count++
    details.push("SGLT2i: on therapy")
  } else {
    details.push(`SGLT2i: ${sglt2iStatus || "not documented"}`)
  }

  // MRA
  if (mraStatus === "on_finerenone" || mraStatus === "on_spironolactone" || mraStatus === "on_eplerenone") {
    count++
    details.push("MRA: on therapy")
  } else {
    details.push(`MRA: ${mraStatus || "not documented"}`)
  }

  // GLP-1
  if (glp1Status === "on") {
    count++
    details.push("GLP-1: on therapy")
  } else {
    details.push(`GLP-1: ${glp1Status || "not documented"}`)
  }

  return { count, total: 4, details }
}

/**
 * Pharmacotherapy Agent
 */
export const pharmacotherapyAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext, sectionId } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract all pillar statuses
  const raasStatus = getField<string>(currentData, "raas", "raas_status")
  const raasDrugDose = getField<string>(currentData, "raas", "raas_drug_dose")
  const raasAtMaxDose = getField<boolean>(currentData, "raas", "at_max_dose")
  const raasNotOnReason = getField<string>(currentData, "raas", "not_on_reason")
  const crRiseSinceStart = getField<number>(currentData, "raas", "cr_rise_since_start")
  const kOnTherapy = getField<number>(currentData, "raas", "k_on_therapy")

  const sglt2iStatus = getField<string>(currentData, "sglt2i", "sglt2i_status")
  const sglt2iDrugDose = getField<string>(currentData, "sglt2i", "sglt2i_drug_dose")
  const sglt2iNotOnReason = getField<string>(currentData, "sglt2i", "not_on_reason")
  const sickDayRulesReviewed = getField<boolean>(currentData, "sglt2i", "sick_day_rules_reviewed")

  const mraStatus = getField<string>(currentData, "mra", "mra_status")
  const mraDrugDose = getField<string>(currentData, "mra", "mra_drug_dose")
  const mraNotOnReason = getField<string>(currentData, "mra", "not_on_reason")
  const potassiumBinder = getField<string>(currentData, "mra", "potassium_binder")

  const glp1Status = getField<string>(currentData, "glp1", "glp1_status")
  const glp1DrugDose = getField<string>(currentData, "glp1", "glp1_drug_dose")
  const glp1NotOnReason = getField<string>(currentData, "glp1", "not_on_reason")
  const kidneyBenefitDocumented = getField<boolean>(currentData, "glp1", "kidney_benefit_documented")

  const statinStatus = getField<string>(currentData, "lipid_therapy", "statin_status")
  const pcsk9iStatus = getField<string>(currentData, "lipid_therapy", "pcsk9i_status")

  // Calculate GDMT compliance
  const gdmt = calculateGdmtCompliance(raasStatus, sglt2iStatus, mraStatus, glp1Status)

  let interpretation = ""
  let confidence = 0.85

  // Section-specific interpretation
  if (sectionId === "raas") {
    interpretation = interpretRaas(raasStatus, raasDrugDose, raasAtMaxDose, raasNotOnReason, crRiseSinceStart, kOnTherapy, alerts, actionItems, patientContext)
  } else if (sectionId === "sglt2i") {
    interpretation = interpretSglt2i(sglt2iStatus, sglt2iDrugDose, sglt2iNotOnReason, sickDayRulesReviewed, alerts, actionItems, patientContext)
  } else if (sectionId === "mra") {
    interpretation = interpretMra(mraStatus, mraDrugDose, mraNotOnReason, kOnTherapy, potassiumBinder, alerts, actionItems, patientContext)
  } else if (sectionId === "glp1") {
    interpretation = interpretGlp1(glp1Status, glp1DrugDose, glp1NotOnReason, kidneyBenefitDocumented, alerts, actionItems, patientContext)
  } else if (sectionId === "lipid_therapy") {
    interpretation = interpretLipidTherapy(statinStatus, pcsk9iStatus, alerts, actionItems, patientContext)
  } else {
    // General GDMT summary
    interpretation = `CKD GDMT: ${gdmt.count}/${gdmt.total} pillars on therapy. ${gdmt.details.join("; ")}.`
  }

  // Add GDMT compliance alert if suboptimal
  if (gdmt.count < 2) {
    alerts.push(createAlert(
      "raas",
      "raas_status",
      `Sub-optimal GDMT: only ${gdmt.count}/${gdmt.total} pillars on therapy`,
      "high"
    ))
  }

  // Track key citations
  if (raasStatus) citations.push({ fieldId: "raas_status", value: raasStatus, source: "provider" })
  if (sglt2iStatus) citations.push({ fieldId: "sglt2i_status", value: sglt2iStatus, source: "provider" })
  if (mraStatus) citations.push({ fieldId: "mra_status", value: mraStatus, source: "provider" })
  if (glp1Status) citations.push({ fieldId: "glp1_status", value: glp1Status, source: "provider" })

  const reviewNeeded = 
    gdmt.count < 2 ||
    (kOnTherapy !== undefined && kOnTherapy > 5.5) ||
    (crRiseSinceStart !== undefined && crRiseSinceStart > 30) ||
    confidence < CONFIDENCE_THRESHOLDS.REVIEW_SUGGESTED

  // Patient education
  const patientEducation = generatePatientEducation(gdmt, sectionId)

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

function interpretRaas(
  status: string | undefined,
  drugDose: string | undefined,
  atMaxDose: boolean | undefined,
  notOnReason: string | undefined,
  crRise: number | undefined,
  potassium: number | undefined,
  alerts: Alert[],
  actionItems: ActionItem[],
  context: { currentUacr?: number }
): string {
  let interpretation = ""

  if (status?.startsWith("on_")) {
    interpretation = `RAAS inhibition: ${status.replace("on_", "").toUpperCase()}`
    if (drugDose) interpretation += ` (${drugDose})`
    interpretation += atMaxDose ? " at max tolerated dose." : " - not at max dose."

    if (!atMaxDose && context.currentUacr && context.currentUacr > 300) {
      actionItems.push(createActionItem(
        "Consider uptitrating RAAS inhibitor for proteinuria reduction",
        "routine",
        "provider"
      ))
    }

    // Safety monitoring
    if (crRise !== undefined && crRise > 30) {
      alerts.push(createAlert(
        "raas",
        "cr_rise_since_start",
        `Excessive creatinine rise (${crRise.toFixed(0)}%) on RAAS inhibitor - evaluate`,
        "high"
      ))
      actionItems.push(createActionItem(
        "Evaluate excessive Cr rise on RAAS - consider dose reduction or discontinuation",
        "urgent",
        "provider"
      ))
    }

    if (potassium !== undefined && potassium > 5.5) {
      alerts.push(createAlert(
        "raas",
        "k_on_therapy",
        `Hyperkalemia (K+ ${potassium} mEq/L) on RAAS inhibitor`,
        "high"
      ))
      actionItems.push(createActionItem(
        "Address hyperkalemia - consider potassium binder or RAAS dose adjustment",
        "urgent",
        "provider"
      ))
    }
  } else {
    interpretation = `RAAS inhibition: not on therapy`
    if (notOnReason) interpretation += ` (reason: ${notOnReason})`
    interpretation += "."

    if (!notOnReason || notOnReason === "not_evaluated") {
      actionItems.push(createActionItem(
        "Evaluate RAAS inhibitor candidacy - first-line for CKD with proteinuria",
        "routine",
        "provider"
      ))
    }
  }

  return interpretation
}

function interpretSglt2i(
  status: string | undefined,
  drugDose: string | undefined,
  notOnReason: string | undefined,
  sickDayReviewed: boolean | undefined,
  alerts: Alert[],
  actionItems: ActionItem[],
  context: { currentEgfr?: number }
): string {
  let interpretation = ""

  if (status === "on") {
    interpretation = `SGLT2i: on therapy`
    if (drugDose) interpretation += ` (${drugDose})`
    interpretation += "."

    if (!sickDayReviewed) {
      alerts.push(createAlert(
        "sglt2i",
        "sick_day_rules_reviewed",
        "Sick day rules not reviewed this visit for patient on SGLT2i",
        "medium"
      ))
      actionItems.push(createActionItem(
        "Review sick day rules for SGLT2i (hold during acute illness)",
        "routine",
        "nurse"
      ))
    }
  } else {
    interpretation = `SGLT2i: not on therapy`
    if (notOnReason) interpretation += ` (reason: ${notOnReason})`
    interpretation += "."

    // Check eligibility
    if (context.currentEgfr !== undefined && context.currentEgfr >= 20) {
      if (!notOnReason || notOnReason === "not_evaluated") {
        actionItems.push(createActionItem(
          "Initiate SGLT2i - eligible with eGFR >= 20 (DAPA-CKD, EMPA-KIDNEY evidence)",
          "urgent",
          "provider"
        ))
      }
    } else if (context.currentEgfr !== undefined && context.currentEgfr < 20) {
      interpretation += " eGFR < 20 - below initiation threshold."
    }
  }

  return interpretation
}

function interpretMra(
  status: string | undefined,
  drugDose: string | undefined,
  notOnReason: string | undefined,
  potassium: number | undefined,
  potassiumBinder: string | undefined,
  alerts: Alert[],
  actionItems: ActionItem[],
  context: { isDiabetic?: boolean; currentUacr?: number }
): string {
  let interpretation = ""

  if (status?.startsWith("on_")) {
    const mraType = status.replace("on_", "")
    interpretation = `MRA: ${mraType}`
    if (drugDose) interpretation += ` (${drugDose})`
    interpretation += "."

    // Potassium monitoring for MRA
    if (potassium !== undefined && potassium > 5.0) {
      if (potassium > 5.5) {
        alerts.push(createAlert(
          "mra",
          "k_on_therapy",
          `Hyperkalemia (K+ ${potassium} mEq/L) on MRA - close monitoring required`,
          "high"
        ))
      }
      if (!potassiumBinder) {
        actionItems.push(createActionItem(
          "Consider potassium binder to enable MRA continuation",
          "routine",
          "provider"
        ))
      }
    }
  } else {
    interpretation = `MRA: not on therapy`
    if (notOnReason) interpretation += ` (reason: ${notOnReason})`
    interpretation += "."

    // Finerenone candidacy per FIDELIO/FIGARO
    if (context.isDiabetic && context.currentUacr && context.currentUacr >= 30) {
      if (!notOnReason || notOnReason === "not_evaluated") {
        actionItems.push(createActionItem(
          "Evaluate finerenone candidacy - indicated for T2DM with albuminuria (FIDELIO/FIGARO)",
          "routine",
          "provider"
        ))
      }
    }
  }

  return interpretation
}

function interpretGlp1(
  status: string | undefined,
  drugDose: string | undefined,
  notOnReason: string | undefined,
  kidneyBenefitDocumented: boolean | undefined,
  alerts: Alert[],
  actionItems: ActionItem[],
  context: { isDiabetic?: boolean }
): string {
  let interpretation = ""

  if (status === "on") {
    interpretation = `GLP-1 RA: on therapy`
    if (drugDose) interpretation += ` (${drugDose})`
    interpretation += "."

    if (!kidneyBenefitDocumented) {
      actionItems.push(createActionItem(
        "Document kidney benefit indication for GLP-1 RA (FLOW trial evidence)",
        "optional",
        "provider"
      ))
    }
  } else {
    interpretation = `GLP-1 RA: not on therapy`
    if (notOnReason) interpretation += ` (reason: ${notOnReason})`
    interpretation += "."

    // GLP-1 candidacy per FLOW trial
    if (context.isDiabetic) {
      if (!notOnReason || notOnReason === "not_evaluated") {
        actionItems.push(createActionItem(
          "Evaluate GLP-1 RA candidacy for T2DM with CKD (FLOW trial kidney benefit)",
          "routine",
          "provider"
        ))
      }
    }
  }

  return interpretation
}

function interpretLipidTherapy(
  statinStatus: string | undefined,
  pcsk9iStatus: string | undefined,
  alerts: Alert[],
  actionItems: ActionItem[],
  context: { ckdStage: string }
): string {
  let interpretation = ""

  if (statinStatus === "on_high_intensity" || statinStatus === "on_moderate_intensity") {
    interpretation = `Statin therapy: ${statinStatus.replace("on_", "").replace("_", " ")}.`
  } else if (statinStatus === "intolerant") {
    interpretation = "Statin intolerant."
    actionItems.push(createActionItem(
      "Consider alternative lipid-lowering therapy (ezetimibe, bempedoic acid)",
      "routine",
      "provider"
    ))
  } else {
    interpretation = "Statin therapy: not on therapy."
    // CKD patients benefit from statins per KDIGO
    if (context.ckdStage !== "G1" && context.ckdStage !== "G2") {
      actionItems.push(createActionItem(
        "Initiate statin therapy - indicated for CKD G3-G5 per KDIGO",
        "routine",
        "provider"
      ))
    }
  }

  if (pcsk9iStatus === "on") {
    interpretation += " PCSK9i on therapy."
  } else if (pcsk9iStatus === "candidate") {
    actionItems.push(createActionItem(
      "Evaluate PCSK9i initiation for high CV risk patient",
      "routine",
      "provider"
    ))
  }

  return interpretation
}

function generatePatientEducation(
  gdmt: { count: number; total: number; details: string[] },
  sectionId: string
): string {
  let education = ""

  if (sectionId === "raas") {
    education = "Your blood pressure medication (ACE inhibitor or ARB) helps protect your kidneys by reducing pressure and protein leakage. "
  } else if (sectionId === "sglt2i") {
    education = "Your SGLT2 inhibitor medication helps protect your kidneys and heart. Remember to hold this medication if you become sick with vomiting or diarrhea. "
  } else if (sectionId === "mra") {
    education = "Your MRA medication helps protect your kidneys and heart. We monitor your potassium levels closely while on this medication. "
  } else if (sectionId === "glp1") {
    education = "Your GLP-1 medication helps with blood sugar control and has been shown to protect your kidneys. "
  } else if (sectionId === "lipid_therapy") {
    education = "Your cholesterol medication helps reduce your risk of heart disease, which is important for kidney health. "
  } else {
    education = `You are on ${gdmt.count} of ${gdmt.total} recommended kidney-protective medications. `
    education += "These medications work together to slow kidney disease progression and protect your heart. "
  }

  education += "Take all medications as prescribed and report any side effects to your care team."

  return education
}

export const pharmacotherapyAgentMeta = {
  agentId: "pharmacotherapy_agent",
  displayName: "Pharmacotherapy (4 Pillars) Agent",
  sectionsOwned: ["raas", "sglt2i", "mra", "glp1", "lipid_therapy"],
  guidelines: [
    "KDIGO 2024 CKD Management",
    "CREDENCE Trial",
    "DAPA-CKD Trial",
    "EMPA-KIDNEY Trial",
    "FIDELIO-DKD Trial",
    "FIGARO-DKD Trial",
    "FLOW Trial",
    "CONFIDENCE Trial",
  ],
  confidenceThreshold: 0.7,
}
