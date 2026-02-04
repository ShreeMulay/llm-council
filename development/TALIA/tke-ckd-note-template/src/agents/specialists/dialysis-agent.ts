/**
 * Dialysis Planning Specialist Agent
 * Manages dialysis planning and vascular access for CKD patients
 * Section: dialysis
 * Guidelines: KDIGO Dialysis Initiation, KDOQI Vascular Access
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
 * Dialysis Planning Specialist Agent
 * Deep expertise in dialysis planning and vascular access for CKD
 */
export const dialysisSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract dialysis-specific fields
  const dialysisEducation = getField<boolean>(currentData, "dialysis", "dialysis_education")
  const modalityPreference = getField<string>(currentData, "dialysis", "modality_preference")
  const vascularAccessStatus = getField<string>(currentData, "dialysis", "vascular_access_status")
  const accessLocation = getField<string>(currentData, "dialysis", "access_location")
  const surgeryReferralDate = getField<string>(currentData, "dialysis", "surgery_referral_date")
  const timelineToDialysis = getField<string>(currentData, "dialysis", "timeline_to_dialysis")
  const veinPreservation = getField<boolean>(currentData, "dialysis", "vein_preservation")

  // Patient context
  const ckdStage = patientContext.ckdStage
  const egfr = patientContext.currentEgfr
  const kfre2yr = patientContext.kfre2yr

  let interpretation = ""
  let confidence = 0.9

  // Check if dialysis planning is applicable
  const shouldPlan = ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D" ||
                     (kfre2yr !== undefined && kfre2yr > 20) ||
                     (egfr !== undefined && egfr < 20)

  if (!shouldPlan) {
    return {
      interpretation: "Dialysis planning not yet indicated based on CKD stage.",
      actionItems: [createActionItem(
        "Counsel on vein preservation for future access",
        "optional",
        "nurse"
      )],
      confidence: 0.95,
      reviewNeeded: false,
      alerts: [],
      patientEducation: "Protecting the veins in your arms is important for future treatment options. Avoid blood draws and IVs in your non-dominant arm when possible.",
      citations: [],
    }
  }

  // Dialysis education
  if (dialysisEducation) {
    interpretation = "Dialysis education completed."
    citations.push({ fieldId: "dialysis_education", value: dialysisEducation, source: "provider" })
  } else {
    interpretation = "Dialysis education not completed."
    alerts.push(createAlert(
      "dialysis",
      "dialysis_education",
      "Dialysis education needed for advanced CKD patient",
      "medium"
    ))
    actionItems.push(createActionItem(
      "Schedule dialysis education class for patient and family",
      "routine",
      "coordinator"
    ))
  }

  // Modality preference
  if (modalityPreference) {
    interpretation += ` Modality preference: ${modalityPreference}.`
    citations.push({ fieldId: "modality_preference", value: modalityPreference, source: "patient" })

    if (modalityPreference === "home_hd" || modalityPreference === "pd") {
      interpretation += " Home modality preferred."
      actionItems.push(createActionItem(
        "Ensure home dialysis training resources are available",
        "optional",
        "coordinator"
      ))
      
      if (modalityPreference === "pd") {
        actionItems.push(createActionItem(
          "Evaluate for PD catheter placement timing",
          "routine",
          "provider"
        ))
      }
    } else if (modalityPreference === "in_center_hd") {
      interpretation += " In-center hemodialysis preferred."
    } else if (modalityPreference === "undecided") {
      actionItems.push(createActionItem(
        "Continue modality education to help patient decide",
        "routine",
        "nurse"
      ))
    } else if (modalityPreference === "conservative") {
      interpretation += " Conservative management preferred."
      actionItems.push(createActionItem(
        "Ensure goals of care and ACP documented for conservative management",
        "routine",
        "provider"
      ))
    }
  } else {
    actionItems.push(createActionItem(
      "Discuss dialysis modality options with patient",
      "routine",
      "provider"
    ))
  }

  // Vascular access assessment
  if (vascularAccessStatus) {
    interpretation += ` Vascular access: ${vascularAccessStatus}.`
    citations.push({ fieldId: "vascular_access_status", value: vascularAccessStatus, source: "provider" })

    if (vascularAccessStatus === "mature_avf") {
      interpretation += " Mature AVF in place - optimal."
      if (accessLocation) {
        interpretation += ` Location: ${accessLocation}.`
      }
    } else if (vascularAccessStatus === "maturing_avf") {
      interpretation += " AVF maturing."
      actionItems.push(createActionItem(
        "Monitor AVF maturation - check for adequate flow and size",
        "routine",
        "provider"
      ))
    } else if (vascularAccessStatus === "avg") {
      interpretation += " AVG in place."
      if (accessLocation) {
        interpretation += ` Location: ${accessLocation}.`
      }
    } else if (vascularAccessStatus === "catheter") {
      interpretation += " Catheter-dependent."
      alerts.push(createAlert(
        "dialysis",
        "vascular_access_status",
        "Catheter-dependent - prioritize permanent access",
        "high"
      ))
      actionItems.push(createActionItem(
        "Prioritize permanent vascular access creation to reduce catheter complications",
        "urgent",
        "provider"
      ))
    } else if (vascularAccessStatus === "none" || vascularAccessStatus === "not_created") {
      interpretation += " No access created."
      
      // Timing based on eGFR and KFRE
      if (egfr !== undefined && egfr < 15) {
        alerts.push(createAlert(
          "dialysis",
          "vascular_access_status",
          "No vascular access with eGFR < 15 - urgent referral needed",
          "critical"
        ))
        actionItems.push(createActionItem(
          "URGENT: Refer for vascular access creation - eGFR < 15",
          "urgent",
          "coordinator"
        ))
      } else if (egfr !== undefined && egfr < 20) {
        alerts.push(createAlert(
          "dialysis",
          "vascular_access_status",
          "No vascular access with eGFR < 20 - referral needed",
          "high"
        ))
        actionItems.push(createActionItem(
          "Refer for vascular access creation - eGFR approaching dialysis threshold",
          "routine",
          "coordinator"
        ))
      } else if (kfre2yr !== undefined && kfre2yr > 40) {
        actionItems.push(createActionItem(
          "Consider vascular access referral - high KFRE risk",
          "routine",
          "provider"
        ))
      }
    } else if (vascularAccessStatus === "failed") {
      interpretation += " Previous access failed."
      actionItems.push(createActionItem(
        "Evaluate options for new vascular access after failure",
        "routine",
        "provider"
      ))
    }
  } else if (modalityPreference !== "pd" && modalityPreference !== "conservative") {
    // Need to assess access status
    actionItems.push(createActionItem(
      "Assess vascular access status and planning",
      "routine",
      "provider"
    ))
  }

  // Surgery referral tracking
  if (surgeryReferralDate) {
    interpretation += ` Surgery referral: ${surgeryReferralDate}.`
    citations.push({ fieldId: "surgery_referral_date", value: surgeryReferralDate, source: "provider" })
  }

  // Timeline to dialysis
  if (timelineToDialysis) {
    interpretation += ` Estimated timeline: ${timelineToDialysis}.`
    citations.push({ fieldId: "timeline_to_dialysis", value: timelineToDialysis, source: "calculated" })

    if (timelineToDialysis.includes("< 6 months") || timelineToDialysis.includes("<6")) {
      alerts.push(createAlert(
        "dialysis",
        "timeline_to_dialysis",
        "Dialysis anticipated within 6 months - ensure readiness",
        "high"
      ))
      
      if (!dialysisEducation) {
        actionItems.push(createActionItem(
          "URGENT: Complete dialysis education - dialysis imminent",
          "urgent",
          "coordinator"
        ))
      }
      
      if (vascularAccessStatus === "none" || vascularAccessStatus === "not_created") {
        actionItems.push(createActionItem(
          "URGENT: Expedite vascular access creation",
          "urgent",
          "coordinator"
        ))
      }
    }
  }

  // Vein preservation
  if (veinPreservation === false) {
    alerts.push(createAlert(
      "dialysis",
      "vein_preservation",
      "Vein preservation not documented - critical for future access",
      "medium"
    ))
    actionItems.push(createActionItem(
      "Document vein preservation counseling - avoid blood draws/IVs in non-dominant arm",
      "routine",
      "nurse"
    ))
  } else if (veinPreservation) {
    interpretation += " Vein preservation counseled."
  }

  // Dialysis unit selection
  if (ckdStage === "G5" && modalityPreference === "in_center_hd") {
    actionItems.push(createActionItem(
      "Discuss dialysis unit options and patient preferences",
      "optional",
      "coordinator"
    ))
  }

  // Patient education
  const patientEducation = generatePatientEducation(modalityPreference, vascularAccessStatus, dialysisEducation)

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
  modalityPreference: string | undefined,
  vascularAccessStatus: string | undefined,
  dialysisEducation: boolean | undefined
): string {
  let education = "As kidney function declines, you may eventually need dialysis or a kidney transplant. "
  education += "Learning about your options now helps you make the best decision for your lifestyle. "

  if (!dialysisEducation) {
    education += "We recommend attending a dialysis education class to learn about your options. "
  }

  if (modalityPreference === "home_hd" || modalityPreference === "pd") {
    education += "Home dialysis gives you more flexibility and independence. Training is provided to help you feel confident. "
  } else if (modalityPreference === "in_center_hd") {
    education += "In-center hemodialysis is done at a dialysis center, typically three times per week. "
  }

  if (vascularAccessStatus === "none" || vascularAccessStatus === "not_created") {
    education += "If you choose hemodialysis, you will need a vascular access (usually a fistula in your arm). "
    education += "This is created surgically and needs time to mature before use. "
  } else if (vascularAccessStatus === "maturing_avf") {
    education += "Your fistula is maturing. Do the exercises as instructed to help it develop. "
  }

  education += "IMPORTANT: Protect the veins in your non-dominant arm - avoid blood draws and IVs there. "
  education += "These veins may be needed for dialysis access."

  return education
}

export const dialysisSpecialistAgentMeta = {
  agentId: "dialysis_specialist_agent",
  displayName: "Dialysis Planning Specialist",
  sectionsOwned: ["dialysis"],
  guidelines: [
    "KDIGO Dialysis Initiation Guidelines",
    "KDOQI Vascular Access Guidelines",
    "ISPD PD Guidelines",
  ],
  confidenceThreshold: 0.8,
}
