/**
 * Planning & Screening Agent
 * Handles care planning, transitions, and preventive screening
 * Sections: transplant, dialysis, acp, ccm, immunizations, depression, fall_risk, sleep_apnea, sdoh, physical_performance, nutrition
 * Guidelines: KDIGO Transplant, KDIGO Dialysis Initiation, CDC Immunization, PHQ-9 Guidelines
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
 * Planning & Screening Agent
 */
export const planningScreeningAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext, sectionId } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  let interpretation = ""
  let confidence = 0.85

  // Route to section-specific handler
  switch (sectionId) {
    case "transplant":
      interpretation = await interpretTransplant(currentData, alerts, actionItems, citations, patientContext)
      break
    case "dialysis":
      interpretation = await interpretDialysis(currentData, alerts, actionItems, citations, patientContext)
      break
    case "acp":
      interpretation = await interpretAcp(currentData, alerts, actionItems, citations, patientContext)
      break
    case "ccm":
      interpretation = await interpretCcm(currentData, alerts, actionItems, citations)
      break
    case "immunizations":
      interpretation = await interpretImmunizations(currentData, alerts, actionItems, citations, patientContext)
      break
    case "depression":
      interpretation = await interpretDepression(currentData, alerts, actionItems, citations)
      break
    case "fall_risk":
      interpretation = await interpretFallRisk(currentData, alerts, actionItems, citations, patientContext)
      break
    case "sleep_apnea":
      interpretation = await interpretSleepApnea(currentData, alerts, actionItems, citations)
      break
    case "sdoh":
      interpretation = await interpretSdoh(currentData, alerts, actionItems, citations)
      break
    case "physical_performance":
      interpretation = await interpretPhysicalPerformance(currentData, alerts, actionItems, citations, patientContext)
      break
    case "nutrition":
      interpretation = await interpretNutrition(currentData, alerts, actionItems, citations, patientContext)
      break
    default:
      interpretation = "Section not handled by planning/screening agent."
      confidence = 0.5
  }

  const reviewNeeded =
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
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

async function interpretTransplant(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string; kfre2yr?: number }
): Promise<string> {
  const transplantCandidate = getField<string>(data, "transplant", "transplant_candidate")
  const transplantCenters = getField<string>(data, "transplant", "transplant_centers")
  const currentStatus = getField<string>(data, "transplant", "current_status")
  const livingDonor = getField<boolean>(data, "transplant", "living_donor")
  const workupCompletion = getField<number>(data, "transplant", "workup_completion_pct")
  const barriers = getField<string>(data, "transplant", "barriers")
  const bmiBarrier = getField<boolean>(data, "transplant", "bmi_barrier")

  let interpretation = ""

  if (transplantCandidate) {
    citations.push({ fieldId: "transplant_candidate", value: transplantCandidate, source: "provider" })
    interpretation = `Transplant candidacy: ${transplantCandidate}.`

    if (transplantCandidate === "candidate" || transplantCandidate === "evaluating") {
      if (transplantCenters) {
        interpretation += ` Listed at: ${transplantCenters}.`
      } else {
        actionItems.push(createActionItem(
          "Refer to transplant center for evaluation",
          "routine",
          "coordinator"
        ))
      }

      if (currentStatus) {
        interpretation += ` Status: ${currentStatus}.`
        if (currentStatus === "active_listed") {
          interpretation += " Actively listed for transplant."
        } else if (currentStatus === "on_hold") {
          alerts.push(createAlert(
            "transplant",
            "current_status",
            "Transplant listing on hold - address barriers",
            "medium"
          ))
        }
      }

      if (livingDonor) {
        interpretation += " Living donor identified."
      } else {
        actionItems.push(createActionItem(
          "Discuss living donor options with patient and family",
          "routine",
          "coordinator"
        ))
      }

      if (workupCompletion !== undefined) {
        interpretation += ` Workup ${workupCompletion}% complete.`
        if (workupCompletion < 50) {
          actionItems.push(createActionItem(
            "Expedite transplant workup completion",
            "routine",
            "coordinator"
          ))
        }
      }
    } else if (transplantCandidate === "not_candidate") {
      if (barriers) {
        interpretation += ` Barriers: ${barriers}.`
      }
    }
  } else {
    // Check if transplant evaluation should be initiated
    if (context.ckdStage === "G4" || context.ckdStage === "G5" || (context.kfre2yr !== undefined && context.kfre2yr > 20)) {
      alerts.push(createAlert(
        "transplant",
        "transplant_candidate",
        "Transplant candidacy not documented for advanced CKD patient",
        "high"
      ))
      actionItems.push(createActionItem(
        "Evaluate and document transplant candidacy",
        "urgent",
        "provider"
      ))
      interpretation = "Transplant candidacy not yet evaluated."
    } else {
      interpretation = "Transplant evaluation not indicated at current CKD stage."
    }
  }

  if (bmiBarrier) {
    interpretation += " BMI is a barrier to transplant listing."
    actionItems.push(createActionItem(
      "Address BMI barrier for transplant - consider GLP-1 RA or obesity medicine referral",
      "routine",
      "provider"
    ))
  }

  return interpretation
}

async function interpretDialysis(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string; kfre2yr?: number; currentEgfr?: number }
): Promise<string> {
  const dialysisEducation = getField<boolean>(data, "dialysis", "dialysis_education")
  const modalityPreference = getField<string>(data, "dialysis", "modality_preference")
  const vascularAccessStatus = getField<string>(data, "dialysis", "vascular_access_status")
  const accessLocation = getField<string>(data, "dialysis", "access_location")
  const surgeryReferralDate = getField<string>(data, "dialysis", "surgery_referral_date")
  const timelineToDialysis = getField<string>(data, "dialysis", "timeline_to_dialysis")
  const veinPreservation = getField<boolean>(data, "dialysis", "vein_preservation")

  let interpretation = ""

  // Check if dialysis planning is indicated
  const needsDialysisPlanning = 
    context.ckdStage === "G4" || 
    context.ckdStage === "G5" || 
    context.ckdStage === "G5D" ||
    (context.kfre2yr !== undefined && context.kfre2yr > 20)

  if (!needsDialysisPlanning) {
    return "Dialysis planning not indicated at current CKD stage."
  }

  // Dialysis education
  if (dialysisEducation) {
    citations.push({ fieldId: "dialysis_education", value: dialysisEducation, source: "provider" })
    interpretation = "Dialysis education completed."
  } else {
    alerts.push(createAlert(
      "dialysis",
      "dialysis_education",
      "Dialysis education not completed for advanced CKD patient",
      "high"
    ))
    actionItems.push(createActionItem(
      "Schedule dialysis education session",
      "urgent",
      "coordinator"
    ))
    interpretation = "Dialysis education not yet completed."
  }

  // Modality preference
  if (modalityPreference) {
    interpretation += ` Modality preference: ${modalityPreference}.`
    citations.push({ fieldId: "modality_preference", value: modalityPreference, source: "patient" })
  } else {
    actionItems.push(createActionItem(
      "Discuss dialysis modality options (HD vs PD vs home HD)",
      "routine",
      "provider"
    ))
  }

  // Vascular access
  if (vascularAccessStatus) {
    interpretation += ` Vascular access: ${vascularAccessStatus}.`
    citations.push({ fieldId: "vascular_access_status", value: vascularAccessStatus, source: "provider" })

    if (vascularAccessStatus === "none" && context.currentEgfr !== undefined && context.currentEgfr < 20) {
      alerts.push(createAlert(
        "dialysis",
        "vascular_access_status",
        "No vascular access with eGFR < 20 - urgent access planning needed",
        "critical"
      ))
      actionItems.push(createActionItem(
        "Urgent vascular surgery referral for access creation",
        "urgent",
        "provider"
      ))
    } else if (vascularAccessStatus === "none" && context.ckdStage === "G4") {
      actionItems.push(createActionItem(
        "Refer to vascular surgery for access planning (AVF preferred)",
        "routine",
        "provider"
      ))
    } else if (vascularAccessStatus === "avf_maturing") {
      interpretation += " AVF maturing."
    } else if (vascularAccessStatus === "avf_functional") {
      interpretation += " AVF functional and ready for use."
    }

    if (accessLocation) {
      interpretation += ` Location: ${accessLocation}.`
    }
  }

  // Timeline
  if (timelineToDialysis) {
    interpretation += ` Estimated timeline to dialysis: ${timelineToDialysis}.`
  }

  // Vein preservation
  if (veinPreservation === false) {
    alerts.push(createAlert(
      "dialysis",
      "vein_preservation",
      "Vein preservation not documented - protect non-dominant arm",
      "medium"
    ))
    actionItems.push(createActionItem(
      "Counsel on vein preservation - avoid blood draws/IVs in non-dominant arm",
      "routine",
      "nurse"
    ))
  }

  return interpretation
}

async function interpretAcp(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string; age?: number }
): Promise<string> {
  const acpDocumented = getField<boolean>(data, "acp", "acp_documented")
  const acpDate = getField<string>(data, "acp", "acp_date")
  const surpriseQuestion = getField<string>(data, "acp", "surprise_question")
  const goalsOfCareDiscussed = getField<boolean>(data, "acp", "goals_of_care_discussed")
  const polstCompleted = getField<boolean>(data, "acp", "polst_completed")
  const healthcareProxy = getField<string>(data, "acp", "healthcare_proxy")
  const conservativeMgmtDiscussed = getField<boolean>(data, "acp", "conservative_mgmt_discussed")
  const cptBilled = getField<boolean>(data, "acp", "cpt_99497_99498")

  let interpretation = ""

  // Check if ACP is indicated
  const needsAcp = 
    context.ckdStage === "G4" || 
    context.ckdStage === "G5" || 
    context.ckdStage === "G5D" ||
    (context.age !== undefined && context.age > 75)

  if (acpDocumented) {
    citations.push({ fieldId: "acp_documented", value: acpDocumented, source: "chart" })
    interpretation = "Advance care planning documented."
    if (acpDate) {
      interpretation += ` Last updated: ${acpDate}.`
    }
  } else if (needsAcp) {
    alerts.push(createAlert(
      "acp",
      "acp_documented",
      "Advance care planning not documented for advanced CKD/elderly patient",
      "high"
    ))
    actionItems.push(createActionItem(
      "Initiate advance care planning discussion",
      "routine",
      "provider"
    ))
    interpretation = "Advance care planning not yet documented."
  } else {
    interpretation = "Advance care planning not yet indicated."
  }

  // Surprise question
  if (surpriseQuestion) {
    interpretation += ` Surprise question: ${surpriseQuestion}.`
    if (surpriseQuestion === "no") {
      alerts.push(createAlert(
        "acp",
        "surprise_question",
        "Negative surprise question - prioritize goals of care discussion",
        "high"
      ))
      actionItems.push(createActionItem(
        "Prioritize goals of care and palliative care discussion",
        "urgent",
        "provider"
      ))
    }
  }

  // Goals of care
  if (goalsOfCareDiscussed) {
    interpretation += " Goals of care discussed."
  } else if (needsAcp) {
    actionItems.push(createActionItem(
      "Discuss goals of care with patient and family",
      "routine",
      "provider"
    ))
  }

  // POLST
  if (polstCompleted) {
    interpretation += " POLST completed."
  }

  // Healthcare proxy
  if (healthcareProxy) {
    interpretation += ` Healthcare proxy: ${healthcareProxy}.`
  } else if (needsAcp) {
    actionItems.push(createActionItem(
      "Identify and document healthcare proxy",
      "routine",
      "coordinator"
    ))
  }

  // Conservative management
  if (conservativeMgmtDiscussed) {
    interpretation += " Conservative management discussed as an option."
  }

  // Billing
  if (goalsOfCareDiscussed && !cptBilled) {
    actionItems.push(createActionItem(
      "Bill CPT 99497/99498 for ACP discussion",
      "optional",
      "provider"
    ))
  }

  return interpretation
}

async function interpretCcm(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const ccmEnrollment = getField<string>(data, "ccm", "ccm_enrollment")
  const ccmActive = getField<boolean>(data, "ccm", "ccm_active")
  const lastCcmContact = getField<string>(data, "ccm", "last_ccm_contact")
  const careGaps = getField<string>(data, "ccm", "care_gaps")

  let interpretation = ""

  if (ccmEnrollment) {
    citations.push({ fieldId: "ccm_enrollment", value: ccmEnrollment, source: "coordinator" })
    interpretation = `CCM enrollment: ${ccmEnrollment}.`

    if (ccmEnrollment === "enrolled") {
      if (ccmActive) {
        interpretation += " Actively engaged in CCM."
      } else {
        alerts.push(createAlert(
          "ccm",
          "ccm_active",
          "CCM enrolled but not active - re-engage patient",
          "medium"
        ))
        actionItems.push(createActionItem(
          "Re-engage patient in CCM program",
          "routine",
          "coordinator"
        ))
      }

      if (lastCcmContact) {
        interpretation += ` Last contact: ${lastCcmContact}.`
      }
    } else if (ccmEnrollment === "eligible") {
      actionItems.push(createActionItem(
        "Enroll eligible patient in CCM program",
        "routine",
        "coordinator"
      ))
    } else if (ccmEnrollment === "declined") {
      interpretation += " Patient declined CCM enrollment."
    }
  } else {
    actionItems.push(createActionItem(
      "Assess CCM eligibility and enrollment status",
      "optional",
      "coordinator"
    ))
    interpretation = "CCM enrollment status not documented."
  }

  if (careGaps) {
    interpretation += ` Care gaps identified: ${careGaps}.`
    alerts.push(createAlert(
      "ccm",
      "care_gaps",
      `Care gaps identified by CCM: ${careGaps}`,
      "medium"
    ))
  }

  return interpretation
}

async function interpretImmunizations(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string; age?: number }
): Promise<string> {
  const fluVaccine = getField<string>(data, "immunizations", "flu_vaccine")
  const pneumococcal = getField<string>(data, "immunizations", "pneumococcal_pcv20")
  const hepB = getField<string>(data, "immunizations", "hep_b")
  const covidVaccine = getField<string>(data, "immunizations", "covid_vaccine")
  const shingrix = getField<string>(data, "immunizations", "shingrix")
  const tdap = getField<string>(data, "immunizations", "tdap")

  const vaccineStatus: string[] = []
  const dueVaccines: string[] = []

  // Flu vaccine
  if (fluVaccine === "current") {
    vaccineStatus.push("Flu: current")
  } else {
    dueVaccines.push("flu")
    actionItems.push(createActionItem(
      "Administer annual flu vaccine",
      "routine",
      "nurse"
    ))
  }

  // Pneumococcal
  if (pneumococcal === "current" || pneumococcal === "complete") {
    vaccineStatus.push("Pneumococcal: complete")
  } else {
    dueVaccines.push("pneumococcal (PCV20)")
    actionItems.push(createActionItem(
      "Administer pneumococcal vaccine (PCV20 preferred for CKD)",
      "routine",
      "nurse"
    ))
  }

  // Hepatitis B - especially important for transplant candidates
  if (hepB === "immune" || hepB === "complete") {
    vaccineStatus.push("Hep B: immune")
  } else {
    dueVaccines.push("Hepatitis B")
    const isTransplantCandidate = context.ckdStage === "G4" || context.ckdStage === "G5"
    if (isTransplantCandidate) {
      alerts.push(createAlert(
        "immunizations",
        "hep_b",
        "Hepatitis B immunity not documented - critical for transplant candidates",
        "high"
      ))
      actionItems.push(createActionItem(
        "Check Hep B serology and vaccinate if not immune (priority for transplant)",
        "urgent",
        "nurse"
      ))
    } else {
      actionItems.push(createActionItem(
        "Check Hep B serology and vaccinate if not immune",
        "routine",
        "nurse"
      ))
    }
  }

  // COVID
  if (covidVaccine === "current") {
    vaccineStatus.push("COVID: current")
  } else {
    dueVaccines.push("COVID")
    actionItems.push(createActionItem(
      "Update COVID vaccination",
      "routine",
      "nurse"
    ))
  }

  // Shingrix (age 50+)
  if (context.age !== undefined && context.age >= 50) {
    if (shingrix === "complete") {
      vaccineStatus.push("Shingrix: complete")
    } else {
      dueVaccines.push("Shingrix")
      actionItems.push(createActionItem(
        "Complete Shingrix series (2 doses)",
        "routine",
        "nurse"
      ))
    }
  }

  // Tdap
  if (tdap === "current") {
    vaccineStatus.push("Tdap: current")
  } else {
    dueVaccines.push("Tdap")
    actionItems.push(createActionItem(
      "Update Tdap vaccination",
      "optional",
      "nurse"
    ))
  }

  let interpretation = ""
  if (vaccineStatus.length > 0) {
    interpretation = `Immunizations current: ${vaccineStatus.join(", ")}.`
  }
  if (dueVaccines.length > 0) {
    interpretation += ` Due: ${dueVaccines.join(", ")}.`
    if (dueVaccines.length >= 3) {
      alerts.push(createAlert(
        "immunizations",
        "flu_vaccine",
        `Multiple immunizations due (${dueVaccines.length})`,
        "medium"
      ))
    }
  }

  return interpretation || "Immunization status not documented."
}

async function interpretDepression(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const phq2Score = getField<number>(data, "depression", "phq2_score")
  const phq9Score = getField<number>(data, "depression", "phq9_score")
  const depressionStatus = getField<string>(data, "depression", "depression_status")
  const treatmentReferral = getField<string>(data, "depression", "treatment_referral")
  const cognitiveScreen = getField<string>(data, "depression", "cognitive_screen")

  let interpretation = ""

  if (phq2Score !== undefined) {
    citations.push({ fieldId: "phq2_score", value: phq2Score, source: "screening" })
    interpretation = `PHQ-2 score: ${phq2Score}/6.`

    if (phq2Score >= 3) {
      // Positive PHQ-2 screen
      if (phq9Score !== undefined) {
        citations.push({ fieldId: "phq9_score", value: phq9Score, source: "screening" })
        interpretation += ` PHQ-9 score: ${phq9Score}/27.`

        if (phq9Score >= 20) {
          alerts.push(createAlert(
            "depression",
            "phq9_score",
            `Severe depression (PHQ-9: ${phq9Score}) - urgent mental health referral`,
            "critical"
          ))
          actionItems.push(createActionItem(
            "Urgent mental health referral for severe depression",
            "urgent",
            "provider"
          ))
        } else if (phq9Score >= 15) {
          alerts.push(createAlert(
            "depression",
            "phq9_score",
            `Moderately severe depression (PHQ-9: ${phq9Score})`,
            "high"
          ))
          actionItems.push(createActionItem(
            "Consider antidepressant and/or mental health referral",
            "routine",
            "provider"
          ))
        } else if (phq9Score >= 10) {
          actionItems.push(createActionItem(
            "Monitor depression symptoms - consider treatment if persistent",
            "routine",
            "provider"
          ))
        } else if (phq9Score >= 5) {
          interpretation += " Mild depressive symptoms."
        }
      } else {
        alerts.push(createAlert(
          "depression",
          "phq2_score",
          "Positive PHQ-2 screen - complete PHQ-9",
          "medium"
        ))
        actionItems.push(createActionItem(
          "Complete PHQ-9 for positive PHQ-2 screen",
          "routine",
          "nurse"
        ))
      }
    } else {
      interpretation += " Negative depression screen."
    }
  } else {
    actionItems.push(createActionItem(
      "Complete PHQ-2 depression screening",
      "routine",
      "nurse"
    ))
    interpretation = "Depression screening not completed."
  }

  if (treatmentReferral) {
    interpretation += ` Treatment: ${treatmentReferral}.`
  }

  if (cognitiveScreen) {
    interpretation += ` Cognitive screen: ${cognitiveScreen}.`
  }

  return interpretation
}

async function interpretFallRisk(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { age?: number }
): Promise<string> {
  const fallRisk = getField<string>(data, "fall_risk", "fall_risk")
  const falls12mo = getField<number>(data, "fall_risk", "falls_12mo")
  const contributingFactors = getField<string>(data, "fall_risk", "contributing_factors")

  let interpretation = ""

  if (fallRisk) {
    citations.push({ fieldId: "fall_risk", value: fallRisk, source: "screening" })
    interpretation = `Fall risk: ${fallRisk}.`

    if (fallRisk === "high") {
      alerts.push(createAlert(
        "fall_risk",
        "fall_risk",
        "High fall risk - implement fall prevention strategies",
        "high"
      ))
      actionItems.push(createActionItem(
        "Review medications for fall risk (sedatives, antihypertensives)",
        "routine",
        "provider"
      ))
      actionItems.push(createActionItem(
        "Refer to physical therapy for fall prevention",
        "routine",
        "coordinator"
      ))
    }
  } else if (context.age !== undefined && context.age >= 65) {
    actionItems.push(createActionItem(
      "Complete fall risk assessment for elderly patient",
      "routine",
      "nurse"
    ))
    interpretation = "Fall risk not assessed."
  }

  if (falls12mo !== undefined) {
    interpretation += ` Falls in past 12 months: ${falls12mo}.`
    if (falls12mo >= 2) {
      alerts.push(createAlert(
        "fall_risk",
        "falls_12mo",
        `Multiple falls (${falls12mo}) in past year - high risk`,
        "high"
      ))
    } else if (falls12mo === 1) {
      actionItems.push(createActionItem(
        "Evaluate circumstances of fall and implement prevention",
        "routine",
        "provider"
      ))
    }
  }

  if (contributingFactors) {
    interpretation += ` Contributing factors: ${contributingFactors}.`
  }

  return interpretation || "Fall risk assessment not applicable."
}

async function interpretSleepApnea(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const sleepStudyDone = getField<boolean>(data, "sleep_apnea", "sleep_study_done")
  const osaDiagnosis = getField<boolean>(data, "sleep_apnea", "osa_diagnosis")
  const cpapCompliance = getField<string>(data, "sleep_apnea", "cpap_compliance")
  const stopBangScore = getField<number>(data, "sleep_apnea", "stop_bang_score")

  let interpretation = ""

  if (osaDiagnosis) {
    citations.push({ fieldId: "osa_diagnosis", value: osaDiagnosis, source: "chart" })
    interpretation = "Obstructive sleep apnea diagnosed."

    if (cpapCompliance) {
      interpretation += ` CPAP compliance: ${cpapCompliance}.`
      if (cpapCompliance === "non_compliant") {
        alerts.push(createAlert(
          "sleep_apnea",
          "cpap_compliance",
          "CPAP non-compliance - increases CV and CKD progression risk",
          "medium"
        ))
        actionItems.push(createActionItem(
          "Address CPAP compliance barriers - consider alternative therapies",
          "routine",
          "provider"
        ))
      }
    } else {
      actionItems.push(createActionItem(
        "Assess CPAP compliance",
        "routine",
        "nurse"
      ))
    }
  } else if (stopBangScore !== undefined) {
    citations.push({ fieldId: "stop_bang_score", value: stopBangScore, source: "screening" })
    interpretation = `STOP-BANG score: ${stopBangScore}/8.`

    if (stopBangScore >= 5) {
      alerts.push(createAlert(
        "sleep_apnea",
        "stop_bang_score",
        `High STOP-BANG score (${stopBangScore}) - high probability of OSA`,
        "high"
      ))
      if (!sleepStudyDone) {
        actionItems.push(createActionItem(
          "Order sleep study for high-risk patient",
          "routine",
          "provider"
        ))
      }
    } else if (stopBangScore >= 3) {
      interpretation += " Intermediate risk for OSA."
      if (!sleepStudyDone) {
        actionItems.push(createActionItem(
          "Consider sleep study for intermediate-risk patient",
          "optional",
          "provider"
        ))
      }
    } else {
      interpretation += " Low risk for OSA."
    }
  } else {
    interpretation = "Sleep apnea screening not completed."
  }

  return interpretation
}

async function interpretSdoh(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const transportation = getField<string>(data, "sdoh", "transportation")
  const housingStability = getField<string>(data, "sdoh", "housing_stability")
  const foodSecurity = getField<string>(data, "sdoh", "food_security")
  const healthLiteracy = getField<string>(data, "sdoh", "health_literacy")
  const insuranceBarriers = getField<string>(data, "sdoh", "insurance_barriers")
  const caregiverSupport = getField<string>(data, "sdoh", "caregiver_support")

  const barriers: string[] = []
  let interpretation = "SDOH assessment: "

  if (transportation) {
    if (transportation === "barrier") {
      barriers.push("transportation")
      actionItems.push(createActionItem(
        "Arrange transportation assistance for appointments",
        "routine",
        "coordinator"
      ))
    }
  }

  if (housingStability) {
    if (housingStability === "unstable" || housingStability === "homeless") {
      barriers.push("housing")
      alerts.push(createAlert(
        "sdoh",
        "housing_stability",
        "Housing instability - refer to social work",
        "high"
      ))
      actionItems.push(createActionItem(
        "Social work referral for housing assistance",
        "urgent",
        "coordinator"
      ))
    }
  }

  if (foodSecurity) {
    if (foodSecurity === "insecure") {
      barriers.push("food security")
      actionItems.push(createActionItem(
        "Connect with food assistance resources (SNAP, food banks)",
        "routine",
        "coordinator"
      ))
    }
  }

  if (healthLiteracy) {
    if (healthLiteracy === "low") {
      barriers.push("health literacy")
      actionItems.push(createActionItem(
        "Use teach-back method and simplified materials",
        "routine",
        "nurse"
      ))
    }
  }

  if (insuranceBarriers) {
    barriers.push(`insurance: ${insuranceBarriers}`)
    actionItems.push(createActionItem(
      "Address insurance barriers with billing/financial counselor",
      "routine",
      "coordinator"
    ))
  }

  if (barriers.length > 0) {
    interpretation += `Barriers identified: ${barriers.join(", ")}.`
    if (barriers.length >= 2) {
      alerts.push(createAlert(
        "sdoh",
        "transportation",
        `Multiple SDOH barriers (${barriers.length}) - comprehensive social work evaluation`,
        "high"
      ))
    }
  } else {
    interpretation += "No significant barriers identified."
  }

  if (caregiverSupport) {
    interpretation += ` Caregiver support: ${caregiverSupport}.`
  }

  return interpretation
}

async function interpretPhysicalPerformance(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { currentEgfr?: number }
): Promise<string> {
  const gripStrength = getField<number>(data, "physical_performance", "grip_strength_dominant")
  const lowGripFlag = getField<boolean>(data, "physical_performance", "low_grip_flag")
  const sitToStand = getField<number>(data, "physical_performance", "sit_to_stand_30sec")
  const gaitSpeed = getField<number>(data, "physical_performance", "gait_speed_4m")
  const tugTime = getField<number>(data, "physical_performance", "tug_time")
  const sppbScore = getField<number>(data, "physical_performance", "sppb_score")
  const clinicalFrailtyScale = getField<number>(data, "physical_performance", "clinical_frailty_scale")
  const frailtyStatus = getField<string>(data, "physical_performance", "frailty_status")

  const metrics: string[] = []
  let interpretation = ""

  // Grip strength
  if (gripStrength !== undefined) {
    citations.push({ fieldId: "grip_strength_dominant", value: gripStrength, source: "staff" })
    metrics.push(`Grip: ${gripStrength} kg`)
    
    if (lowGripFlag) {
      alerts.push(createAlert(
        "physical_performance",
        "grip_strength_dominant",
        "Low grip strength - sarcopenia indicator",
        "medium"
      ))
    }
  }

  // Sit-to-stand
  if (sitToStand !== undefined) {
    citations.push({ fieldId: "sit_to_stand_30sec", value: sitToStand, source: "staff" })
    metrics.push(`STS: ${sitToStand} reps`)
    
    if (sitToStand < 10) {
      actionItems.push(createActionItem(
        "Low sit-to-stand performance - consider renal rehab referral",
        "routine",
        "provider"
      ))
    }
  }

  // Gait speed
  if (gaitSpeed !== undefined) {
    citations.push({ fieldId: "gait_speed_4m", value: gaitSpeed, source: "staff" })
    metrics.push(`Gait: ${gaitSpeed} m/s`)
    
    if (gaitSpeed < 0.8) {
      alerts.push(createAlert(
        "physical_performance",
        "gait_speed_4m",
        `Slow gait speed (${gaitSpeed} m/s) - frailty indicator`,
        "medium"
      ))
    }
  }

  // TUG
  if (tugTime !== undefined) {
    metrics.push(`TUG: ${tugTime} sec`)
    if (tugTime > 12) {
      actionItems.push(createActionItem(
        "Elevated TUG time - fall risk, consider PT referral",
        "routine",
        "provider"
      ))
    }
  }

  // SPPB
  if (sppbScore !== undefined) {
    metrics.push(`SPPB: ${sppbScore}/12`)
    if (sppbScore < 8) {
      alerts.push(createAlert(
        "physical_performance",
        "sppb_score",
        `Low SPPB score (${sppbScore}) - significant functional impairment`,
        "high"
      ))
    }
  }

  // Frailty
  if (frailtyStatus) {
    interpretation = `Frailty status: ${frailtyStatus}.`
    if (frailtyStatus === "frail" || frailtyStatus === "pre_frail") {
      // Cross-reference with eGFR
      if (context.currentEgfr !== undefined && context.currentEgfr < 30) {
        alerts.push(createAlert(
          "physical_performance",
          "frailty_status",
          "Frailty with advanced CKD - high-risk combination",
          "high"
        ))
      }
      actionItems.push(createActionItem(
        "Refer to renal rehabilitation program",
        "routine",
        "coordinator"
      ))
    }
  }

  if (clinicalFrailtyScale !== undefined) {
    interpretation += ` Clinical Frailty Scale: ${clinicalFrailtyScale}/9.`
    if (clinicalFrailtyScale >= 5) {
      alerts.push(createAlert(
        "physical_performance",
        "clinical_frailty_scale",
        `Frail (CFS ${clinicalFrailtyScale}) - adjust treatment intensity expectations`,
        "medium"
      ))
    }
  }

  if (metrics.length > 0) {
    interpretation += ` Physical performance: ${metrics.join(", ")}.`
  }

  return interpretation || "Physical performance not assessed."
}

async function interpretNutrition(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string }
): Promise<string> {
  const proteinIntake = getField<string>(data, "nutrition", "protein_intake")
  const proteinTarget = getField<string>(data, "nutrition", "protein_target")
  const potassiumRestriction = getField<string>(data, "nutrition", "potassium_restriction")
  const phosphorusRestriction = getField<string>(data, "nutrition", "phosphorus_restriction")
  const plantBasedDiscussed = getField<boolean>(data, "nutrition", "plant_based_diet_discussed")
  const malnutritionScreen = getField<string>(data, "nutrition", "malnutrition_screen")
  const dietitianReferral = getField<boolean>(data, "nutrition", "dietitian_referral")

  let interpretation = ""

  // Protein intake
  if (proteinIntake) {
    citations.push({ fieldId: "protein_intake", value: proteinIntake, source: "patient" })
    interpretation = `Protein intake: ${proteinIntake}.`
    
    if (proteinIntake === "excessive") {
      actionItems.push(createActionItem(
        "Counsel on moderate protein intake (0.8 g/kg/day for CKD 3-5)",
        "routine",
        "provider"
      ))
    } else if (proteinIntake === "inadequate") {
      alerts.push(createAlert(
        "nutrition",
        "protein_intake",
        "Inadequate protein intake - malnutrition risk",
        "medium"
      ))
      actionItems.push(createActionItem(
        "Dietitian referral for protein-energy wasting prevention",
        "routine",
        "coordinator"
      ))
    }
  }

  // Restrictions
  const restrictions: string[] = []
  if (potassiumRestriction && potassiumRestriction !== "none") {
    restrictions.push(`K+ ${potassiumRestriction}`)
  }
  if (phosphorusRestriction && phosphorusRestriction !== "none") {
    restrictions.push(`Phos ${phosphorusRestriction}`)
  }
  if (restrictions.length > 0) {
    interpretation += ` Dietary restrictions: ${restrictions.join(", ")}.`
  }

  // Plant-based diet
  if (plantBasedDiscussed) {
    interpretation += " Plant-based diet options discussed."
  } else if (context.ckdStage === "G3a" || context.ckdStage === "G3b" || context.ckdStage === "G4") {
    actionItems.push(createActionItem(
      "Discuss plant-based protein options for CKD",
      "optional",
      "provider"
    ))
  }

  // Malnutrition screening
  if (malnutritionScreen) {
    interpretation += ` Malnutrition screen: ${malnutritionScreen}.`
    if (malnutritionScreen === "at_risk" || malnutritionScreen === "malnourished") {
      alerts.push(createAlert(
        "nutrition",
        "malnutrition_screen",
        `Malnutrition risk (${malnutritionScreen}) - urgent dietitian referral`,
        "high"
      ))
      if (!dietitianReferral) {
        actionItems.push(createActionItem(
          "Urgent dietitian referral for malnutrition",
          "urgent",
          "coordinator"
        ))
      }
    }
  }

  // Dietitian referral
  if (dietitianReferral) {
    interpretation += " Dietitian referral placed."
  } else if (context.ckdStage === "G4" || context.ckdStage === "G5") {
    actionItems.push(createActionItem(
      "Refer to renal dietitian for advanced CKD nutrition counseling",
      "routine",
      "coordinator"
    ))
  }

  return interpretation || "Nutrition assessment not completed."
}

function generatePatientEducation(sectionId: string, data: Record<string, unknown>): string {
  switch (sectionId) {
    case "transplant":
      return "A kidney transplant is often the best treatment option for kidney failure. We evaluate whether you are a candidate and help you through the process. Having a living donor can shorten wait times significantly."
    case "dialysis":
      return "If your kidneys can no longer filter your blood adequately, dialysis can do this job. There are different types - hemodialysis and peritoneal dialysis. We'll help you understand your options and prepare in advance."
    case "acp":
      return "Advance care planning helps ensure your wishes are known and respected. This includes choosing a healthcare proxy and discussing your goals for care. These conversations help your family and care team support you."
    case "ccm":
      return "Our Chronic Care Management program provides extra support between visits. A care coordinator checks in regularly, helps coordinate your care, and addresses any concerns."
    case "immunizations":
      return "Vaccines are especially important when you have kidney disease because your immune system may be weaker. We recommend flu, pneumonia, hepatitis B, and other vaccines to protect you."
    case "depression":
      return "Depression is common in people with chronic kidney disease. If you're feeling down, hopeless, or have lost interest in things you used to enjoy, please tell us. Effective treatments are available."
    case "fall_risk":
      return "Falls can be dangerous, especially with kidney disease. We assess your risk and can recommend exercises, medication adjustments, or home safety changes to help prevent falls."
    case "sleep_apnea":
      return "Sleep apnea is common in kidney disease and can worsen both your kidneys and heart. If you snore loudly or feel tired despite sleeping, a sleep study may help."
    case "sdoh":
      return "We want to understand any challenges you face with transportation, housing, food, or other needs. Our team can connect you with resources to help."
    case "physical_performance":
      return "Staying physically active helps protect your kidneys and overall health. We measure your strength and mobility to track your progress and identify if you could benefit from exercise programs."
    case "nutrition":
      return "Diet plays an important role in managing kidney disease. We work with dietitians to help you eat well while protecting your kidneys. This may include adjusting protein, salt, potassium, or phosphorus intake."
    default:
      return "Planning ahead and staying up-to-date on screenings helps us provide the best care for your kidney health."
  }
}

export const planningScreeningAgentMeta = {
  agentId: "planning_screening_agent",
  displayName: "Planning & Screening Agent",
  sectionsOwned: [
    "transplant",
    "dialysis",
    "acp",
    "ccm",
    "immunizations",
    "depression",
    "fall_risk",
    "sleep_apnea",
    "sdoh",
    "physical_performance",
    "nutrition",
  ],
  guidelines: [
    "KDIGO Transplant Guidelines",
    "KDIGO Dialysis Initiation",
    "CDC Immunization Schedule",
    "PHQ-9 Guidelines",
    "KDIGO Supportive Care",
  ],
  confidenceThreshold: 0.7,
}
