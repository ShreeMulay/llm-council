/**
 * Anemia Management Specialist Agent
 * Manages anemia assessment and treatment for CKD patients
 * Section: anemia
 * Guidelines: KDIGO Anemia 2012, KDIGO 2024 Update
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
 * Anemia Specialist Agent
 * Deep expertise in CKD-related anemia management
 */
export const anemiaSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract anemia-specific fields
  const hemoglobin = getField<number>(currentData, "anemia", "hemoglobin")
  const mcv = getField<number>(currentData, "anemia", "mcv")
  const ferritin = getField<number>(currentData, "anemia", "ferritin")
  const tsat = getField<number>(currentData, "anemia", "tsat")
  const anemiaAtGoal = getField<string>(currentData, "anemia", "anemia_at_goal")
  const esaStatus = getField<string>(currentData, "anemia", "esa_status")
  const ivIronStatus = getField<string>(currentData, "anemia", "iv_iron_status")
  const ckdRelated = getField<boolean>(currentData, "anemia", "ckd_related")
  const anemiaClinic = getField<string>(currentData, "anemia", "anemia_clinic")

  // Patient context
  const ckdStage = patientContext.ckdStage

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (hemoglobin !== undefined) citations.push({ fieldId: "hemoglobin", value: hemoglobin, source: "labs_api" })
  if (ferritin !== undefined) citations.push({ fieldId: "ferritin", value: ferritin, source: "labs_api" })
  if (tsat !== undefined) citations.push({ fieldId: "tsat", value: tsat, source: "labs_api" })

  // Hemoglobin assessment
  if (hemoglobin !== undefined) {
    interpretation = `Hemoglobin ${hemoglobin} g/dL.`

    // KDIGO targets: generally 10-11.5 g/dL for CKD, individualize
    if (hemoglobin < 7) {
      alerts.push(createAlert(
        "anemia",
        "hemoglobin",
        `Severe anemia (Hgb ${hemoglobin}) - consider transfusion`,
        "critical"
      ))
      actionItems.push(createActionItem(
        "Evaluate for transfusion - severe anemia with Hgb < 7",
        "urgent",
        "provider"
      ))
      interpretation += " Severe anemia - transfusion threshold."
      confidence = 0.7
    } else if (hemoglobin < 9) {
      alerts.push(createAlert(
        "anemia",
        "hemoglobin",
        `Significant anemia (Hgb ${hemoglobin}) - optimize treatment`,
        "high"
      ))
      interpretation += " Significant anemia requiring optimization."
      actionItems.push(createActionItem(
        "Optimize anemia management - consider ESA initiation or dose adjustment",
        "routine",
        "provider"
      ))
    } else if (hemoglobin < 10) {
      interpretation += " Below KDIGO target range."
      if (anemiaAtGoal !== "at_goal") {
        actionItems.push(createActionItem(
          "Anemia below goal - evaluate iron status and ESA need",
          "routine",
          "provider"
        ))
      }
    } else if (hemoglobin >= 10 && hemoglobin <= 11.5) {
      interpretation += " Within KDIGO target range (10-11.5 g/dL)."
    } else if (hemoglobin > 11.5 && hemoglobin <= 13) {
      interpretation += " Above typical CKD target - individualize."
      if (esaStatus && esaStatus !== "not_on") {
        actionItems.push(createActionItem(
          "Consider ESA dose reduction - Hgb above target",
          "routine",
          "provider"
        ))
      }
    } else if (hemoglobin > 13) {
      alerts.push(createAlert(
        "anemia",
        "hemoglobin",
        `Hgb ${hemoglobin} above target on ESA - reduce dose to avoid CV risk`,
        "medium"
      ))
      if (esaStatus && esaStatus !== "not_on") {
        actionItems.push(createActionItem(
          "Reduce ESA dose - Hgb > 13 associated with increased CV risk (TREAT, CHOIR)",
          "routine",
          "provider"
        ))
      }
    }
  }

  // Iron status assessment (KDIGO: ferritin > 100, TSAT > 20% for CKD ND)
  if (ferritin !== undefined && tsat !== undefined) {
    interpretation += ` Iron status: ferritin ${ferritin} ng/mL, TSAT ${tsat}%.`

    // Absolute iron deficiency
    if (ferritin < 100 || tsat < 20) {
      interpretation += " Iron deficiency present."
      
      if (ferritin < 30) {
        alerts.push(createAlert(
          "anemia",
          "ferritin",
          `Severe iron deficiency (ferritin ${ferritin}) - IV iron indicated`,
          "high"
        ))
        actionItems.push(createActionItem(
          "Initiate IV iron - severe iron deficiency (ferritin < 30)",
          "urgent",
          "provider"
        ))
      } else if (ferritin < 100 || tsat < 20) {
        actionItems.push(createActionItem(
          "Consider IV iron supplementation - iron deficiency (ferritin < 100 or TSAT < 20%)",
          "routine",
          "provider"
        ))
      }

      // Check if on ESA without adequate iron
      if (esaStatus && esaStatus !== "not_on") {
        actionItems.push(createActionItem(
          "Ensure iron repletion before ESA dose escalation - functional iron deficiency",
          "routine",
          "provider"
        ))
      }
    } else if (ferritin > 500 && tsat > 30) {
      interpretation += " Iron replete."
    } else if (ferritin > 800) {
      interpretation += " Ferritin elevated - hold iron supplementation."
      alerts.push(createAlert(
        "anemia",
        "ferritin",
        `Elevated ferritin (${ferritin}) - hold iron, evaluate for inflammation`,
        "medium"
      ))
    }
  } else if (ferritin !== undefined) {
    interpretation += ` Ferritin ${ferritin} ng/mL.`
    if (ferritin < 100) {
      actionItems.push(createActionItem(
        "Check TSAT to complete iron status assessment",
        "routine",
        "nurse"
      ))
    }
  }

  // MCV assessment for anemia type
  if (mcv !== undefined && hemoglobin !== undefined && hemoglobin < 12) {
    if (mcv < 80) {
      interpretation += ` Microcytic (MCV ${mcv}).`
      if (ferritin === undefined || tsat === undefined) {
        actionItems.push(createActionItem(
          "Check iron studies for microcytic anemia",
          "routine",
          "provider"
        ))
      }
    } else if (mcv > 100) {
      interpretation += ` Macrocytic (MCV ${mcv}).`
      actionItems.push(createActionItem(
        "Evaluate macrocytic anemia - check B12, folate, reticulocyte count",
        "routine",
        "provider"
      ))
    }
  }

  // ESA status
  if (esaStatus) {
    interpretation += ` ESA: ${esaStatus}.`
    
    if (esaStatus.includes("epoetin") || esaStatus.includes("darbepoetin")) {
      // ESA hyporesponsiveness check
      if (hemoglobin !== undefined && hemoglobin < 10) {
        actionItems.push(createActionItem(
          "Evaluate ESA hyporesponsiveness - check iron, infection, inflammation",
          "routine",
          "provider"
        ))
      }
    }
  } else if (hemoglobin !== undefined && hemoglobin < 10 && ckdStage !== "G1" && ckdStage !== "G2") {
    // ESA candidacy
    if (ferritin !== undefined && ferritin >= 100 && tsat !== undefined && tsat >= 20) {
      actionItems.push(createActionItem(
        "Consider ESA initiation - iron replete with Hgb < 10",
        "routine",
        "provider"
      ))
    }
  }

  // IV iron status
  if (ivIronStatus) {
    interpretation += ` IV iron: ${ivIronStatus}.`
  }

  // CKD-related anemia documentation
  if (ckdRelated === true) {
    interpretation += " CKD-related anemia confirmed."
  } else if (ckdRelated === false && hemoglobin !== undefined && hemoglobin < 12) {
    interpretation += " Non-CKD etiology - further workup needed."
    actionItems.push(createActionItem(
      "Evaluate non-CKD causes of anemia (GI blood loss, malignancy, hemolysis)",
      "routine",
      "provider"
    ))
  }

  // Anemia clinic referral
  if (anemiaClinic === "referred" || anemiaClinic === "enrolled") {
    interpretation += ` Anemia clinic: ${anemiaClinic}.`
  } else if (hemoglobin !== undefined && hemoglobin < 9 && !anemiaClinic) {
    actionItems.push(createActionItem(
      "Consider anemia clinic referral for complex anemia management",
      "optional",
      "coordinator"
    ))
  }

  // Goal status
  if (anemiaAtGoal === "at_goal") {
    interpretation += " Anemia at goal."
  } else if (anemiaAtGoal === "below_goal") {
    interpretation += " Anemia below goal - optimization needed."
  }

  // Patient education
  const patientEducation = generatePatientEducation(hemoglobin, esaStatus, ferritin)

  const reviewNeeded = 
    alerts.some(a => a.severity === "critical" || a.severity === "high") ||
    (hemoglobin !== undefined && hemoglobin < 9) ||
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
  hemoglobin: number | undefined,
  esaStatus: string | undefined,
  ferritin: number | undefined
): string {
  let education = "Anemia means your blood has fewer red blood cells than normal. This is common in kidney disease because your kidneys make less of a hormone called erythropoietin that tells your body to make red blood cells. "

  if (hemoglobin !== undefined && hemoglobin < 10) {
    education += "Your hemoglobin is below our target, which may cause you to feel tired or short of breath. "
  }

  if (ferritin !== undefined && ferritin < 100) {
    education += "Your iron levels are low. Iron is needed to make red blood cells. We may give you iron through an IV to help build up your iron stores. "
  }

  if (esaStatus && esaStatus !== "not_on") {
    education += "You are receiving medication to help your body make more red blood cells. This is given as an injection. "
  }

  education += "Eating iron-rich foods like lean red meat, beans, and leafy greens can help, but supplements or IV iron may be needed."

  return education
}

export const anemiaSpecialistAgentMeta = {
  agentId: "anemia_specialist_agent",
  displayName: "Anemia Management Specialist",
  sectionsOwned: ["anemia"],
  guidelines: [
    "KDIGO Anemia Guidelines 2012",
    "KDIGO 2024 CKD Management",
    "TREAT Trial",
    "CHOIR Trial",
  ],
  confidenceThreshold: 0.8,
}
