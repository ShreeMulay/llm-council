/**
 * GLP-1 Receptor Agonist Specialist Agent
 * Manages GLP-1 RA therapy for CKD patients
 * Section: glp1
 * Guidelines: KDIGO 2024, FLOW Trial, SUSTAIN-6, LEADER, REWIND
 */

import type { AgentInput, AgentOutput, AgentFunction, ActionItem } from "../types"
import {
  createAlert,
  createActionItem,
  getField,
  CONFIDENCE_THRESHOLDS,
} from "../types"
import type { Alert } from "../../types/schema"

/**
 * GLP-1 RA Specialist Agent
 * Deep expertise in GLP-1 receptor agonist management for CKD
 */
export const glp1SpecialistAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract GLP-1 specific fields
  const glp1Status = getField<string>(currentData, "glp1", "glp1_status")
  const glp1DrugDose = getField<string>(currentData, "glp1", "glp1_drug_dose")
  const notOnReason = getField<string>(currentData, "glp1", "not_on_reason")
  const weightResponse = getField<string>(currentData, "glp1", "weight_response")
  const kidneyBenefitDocumented = getField<boolean>(currentData, "glp1", "kidney_benefit_documented")

  // Patient context
  const egfr = patientContext.currentEgfr
  const isDiabetic = patientContext.isDiabetic
  const uacr = patientContext.currentUacr

  // Cross-reference BMI and weight
  const bmi = getField<number>(currentData, "obesity", "bmi") ?? getField<number>(currentData, "header", "bmi")
  const weight = getField<number>(currentData, "header", "weight")
  const prevWeight = getField<number>(previousData, "header", "weight")

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (glp1Status) citations.push({ fieldId: "glp1_status", value: glp1Status, source: "provider" })
  if (glp1DrugDose) citations.push({ fieldId: "glp1_drug_dose", value: glp1DrugDose, source: "med_list" })

  if (glp1Status === "on") {
    interpretation = `GLP-1 RA: on therapy`
    if (glp1DrugDose) interpretation += ` (${glp1DrugDose})`
    interpretation += "."

    // Weight response tracking
    if (weight !== undefined && prevWeight !== undefined) {
      const weightChange = weight - prevWeight
      const percentChange = (weightChange / prevWeight) * 100

      if (weightChange < 0) {
        interpretation += ` Weight loss ${Math.abs(weightChange).toFixed(1)} lbs (${Math.abs(percentChange).toFixed(1)}%).`
      } else if (weightChange > 0) {
        interpretation += ` Weight gain ${weightChange.toFixed(1)} lbs.`
        if (percentChange > 5) {
          actionItems.push(createActionItem(
            "Evaluate weight gain on GLP-1 RA - assess adherence, dose optimization",
            "routine",
            "provider"
          ))
        }
      }
    } else if (weightResponse) {
      interpretation += ` Weight response: ${weightResponse}.`
    }

    // Kidney benefit documentation (FLOW trial)
    if (!kidneyBenefitDocumented && isDiabetic) {
      actionItems.push(createActionItem(
        "Document kidney benefit indication for GLP-1 RA (FLOW trial: 24% reduction in kidney events)",
        "optional",
        "provider"
      ))
    } else if (kidneyBenefitDocumented) {
      interpretation += " Kidney benefit indication documented."
    }

    // Dose optimization
    const drugLower = glp1DrugDose?.toLowerCase() ?? ""
    if (drugLower.includes("semaglutide")) {
      if (drugLower.includes("0.25") || drugLower.includes("0.5")) {
        actionItems.push(createActionItem(
          "Consider uptitrating semaglutide to 1mg or 2mg for maximum kidney/CV benefit",
          "optional",
          "provider"
        ))
      }
    } else if (drugLower.includes("dulaglutide")) {
      if (drugLower.includes("0.75") || drugLower.includes("1.5")) {
        actionItems.push(createActionItem(
          "Consider uptitrating dulaglutide to 3mg or 4.5mg for enhanced benefit",
          "optional",
          "provider"
        ))
      }
    }

    // GI tolerability
    const giIntolerance = getField<boolean>(currentData, "glp1", "gi_intolerance")
    if (giIntolerance) {
      interpretation += " GI side effects reported."
      actionItems.push(createActionItem(
        "Address GI intolerance: slower titration, dietary modifications, or consider alternative GLP-1 RA",
        "routine",
        "provider"
      ))
    }

    // Pancreatitis warning
    const pancreatitisHistory = getField<boolean>(currentData, "glp1", "pancreatitis_history")
    if (pancreatitisHistory) {
      alerts.push(createAlert(
        "glp1",
        "pancreatitis_history",
        "History of pancreatitis - monitor closely on GLP-1 RA",
        "medium"
      ))
    }

  } else if (glp1Status === "not_on" || !glp1Status) {
    interpretation = `GLP-1 RA: not on therapy`
    if (notOnReason) {
      interpretation += ` (${notOnReason}).`
    } else {
      interpretation += "."
    }

    // Candidacy assessment
    if (isDiabetic) {
      // FLOW trial criteria: T2DM + CKD (eGFR 25-75 or UACR >= 300)
      const flowEligible = (egfr !== undefined && egfr >= 25 && egfr <= 75) || 
                          (uacr !== undefined && uacr >= 300)

      if (flowEligible) {
        interpretation += " GLP-1 RA candidate per FLOW trial criteria."
        
        if (!notOnReason || notOnReason === "not_evaluated") {
          actionItems.push(createActionItem(
            "Initiate GLP-1 RA for T2DM + CKD - kidney protection benefit (FLOW trial)",
            "routine",
            "provider"
          ))
          actionItems.push(createActionItem(
            "Consider semaglutide (FLOW trial agent) or dulaglutide (AWARD-7 kidney data)",
            "optional",
            "provider"
          ))
        }
      } else if (egfr !== undefined && egfr > 75) {
        interpretation += " eGFR > 75 - GLP-1 RA still beneficial for CV protection."
        actionItems.push(createActionItem(
          "Consider GLP-1 RA for cardiovascular protection in T2DM (SUSTAIN-6, LEADER)",
          "optional",
          "provider"
        ))
      }

      // Weight-based indication
      if (bmi !== undefined && bmi >= 30) {
        interpretation += ` BMI ${bmi.toFixed(1)} - additional weight management indication.`
        actionItems.push(createActionItem(
          "GLP-1 RA indicated for obesity management in addition to kidney/CV protection",
          "routine",
          "provider"
        ))
      }

    } else {
      // Non-diabetic - weight management indication
      if (bmi !== undefined && bmi >= 30) {
        interpretation += ` Non-diabetic with BMI ${bmi.toFixed(1)} - GLP-1 RA candidate for weight management.`
        actionItems.push(createActionItem(
          "Consider GLP-1 RA (semaglutide/tirzepatide) for obesity management",
          "routine",
          "provider"
        ))
      }
    }

    // Address specific barriers
    if (notOnReason === "cost") {
      actionItems.push(createActionItem(
        "Explore GLP-1 RA patient assistance programs or prior authorization",
        "routine",
        "coordinator"
      ))
    } else if (notOnReason === "gi_intolerance") {
      actionItems.push(createActionItem(
        "Consider GLP-1 RA rechallenge with slower titration or alternative agent",
        "optional",
        "provider"
      ))
    } else if (notOnReason === "injection_aversion") {
      actionItems.push(createActionItem(
        "Discuss oral semaglutide (Rybelsus) as alternative to injectable GLP-1 RA",
        "optional",
        "provider"
      ))
    }

  } else if (glp1Status === "contraindicated") {
    interpretation = `GLP-1 RA contraindicated`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."

    // MTC/MEN2 contraindication
    if (notOnReason?.includes("MTC") || notOnReason?.includes("MEN2")) {
      interpretation += " Medullary thyroid carcinoma or MEN2 history - absolute contraindication."
    }

  } else if (glp1Status === "intolerant") {
    interpretation = `GLP-1 RA intolerant`
    if (notOnReason) interpretation += `: ${notOnReason}`
    interpretation += "."

    // Suggest alternatives
    if (notOnReason?.includes("nausea") || notOnReason?.includes("vomiting")) {
      actionItems.push(createActionItem(
        "Consider tirzepatide (GIP/GLP-1) which may have better GI tolerability for some patients",
        "optional",
        "provider"
      ))
    }
  }

  // Cross-reference with SGLT2i
  const sglt2iStatus = getField<string>(currentData, "sglt2i", "sglt2i_status")
  if (sglt2iStatus === "on" && glp1Status === "on") {
    interpretation += " On both SGLT2i and GLP-1 RA - optimal GDMT."
  }

  // Patient education
  const patientEducation = generatePatientEducation(glp1Status, isDiabetic, bmi)

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
  status: string | undefined,
  isDiabetic: boolean | undefined,
  bmi: number | undefined
): string {
  let education = ""

  if (status === "on") {
    education = "Your GLP-1 medication is an important part of your treatment plan. "
    
    if (isDiabetic) {
      education += "It helps control your blood sugar and has been shown to protect your kidneys and heart. "
    }
    
    if (bmi !== undefined && bmi >= 30) {
      education += "This medication also helps with weight loss, which benefits your kidney health. "
    }
    
    education += "Common side effects include nausea, which usually improves over time. "
    education += "Eat smaller meals and avoid fatty foods to reduce stomach upset. "
    education += "If you experience severe abdominal pain, stop the medication and contact us immediately."
  } else {
    education = "GLP-1 medications are newer treatments that can help protect your kidneys and heart. "
    if (isDiabetic) {
      education += "For patients with diabetes and kidney disease, these medications have been shown to slow kidney disease progression. "
    }
    if (bmi !== undefined && bmi >= 30) {
      education += "They also help with weight loss, which can benefit your overall health. "
    }
    education += "We will discuss whether this medication is right for you."
  }

  return education
}

export const glp1SpecialistAgentMeta = {
  agentId: "glp1_specialist_agent",
  displayName: "GLP-1 RA Specialist",
  sectionsOwned: ["glp1"],
  guidelines: [
    "KDIGO 2024 CKD Management",
    "FLOW Trial",
    "SUSTAIN-6 Trial",
    "LEADER Trial",
    "REWIND Trial",
    "AWARD-7 Trial",
  ],
  confidenceThreshold: 0.8,
}
