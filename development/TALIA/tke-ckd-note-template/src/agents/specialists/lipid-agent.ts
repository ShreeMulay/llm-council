/**
 * Lipid Therapy Specialist Agent
 * Manages statin and PCSK9i therapy for CKD patients
 * Section: lipid_therapy
 * Guidelines: KDIGO 2024, SHARP Trial, ACC/AHA Lipid Guidelines
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
 * Lipid Therapy Specialist Agent
 * Deep expertise in lipid management for CKD patients
 */
export const lipidSpecialistAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  // Extract lipid therapy fields
  const statinStatus = getField<string>(currentData, "lipid_therapy", "statin_status")
  const statinDrugDose = getField<string>(currentData, "lipid_therapy", "statin_drug_dose")
  const statinIntolerance = getField<string>(currentData, "lipid_therapy", "statin_intolerance")
  const pcsk9iStatus = getField<string>(currentData, "lipid_therapy", "pcsk9i_status")
  const pcsk9iDrug = getField<string>(currentData, "lipid_therapy", "pcsk9i_drug")
  const lipidPanel = getField<string>(currentData, "lipid_therapy", "lipid_panel")

  // Patient context
  const ckdStage = patientContext.ckdStage
  const age = patientContext.age
  const isDiabetic = patientContext.isDiabetic

  // Parse lipid panel if available
  let ldl: number | undefined
  let totalChol: number | undefined
  let hdl: number | undefined
  let triglycerides: number | undefined

  if (lipidPanel) {
    // Try to parse common formats
    const ldlMatch = lipidPanel.match(/LDL[:\s]*(\d+)/i)
    const tcMatch = lipidPanel.match(/TC[:\s]*(\d+)|Total[:\s]*(\d+)/i)
    const hdlMatch = lipidPanel.match(/HDL[:\s]*(\d+)/i)
    const tgMatch = lipidPanel.match(/TG[:\s]*(\d+)|Trig[:\s]*(\d+)/i)

    if (ldlMatch) ldl = parseInt(ldlMatch[1])
    if (tcMatch) totalChol = parseInt(tcMatch[1] || tcMatch[2])
    if (hdlMatch) hdl = parseInt(hdlMatch[1])
    if (tgMatch) triglycerides = parseInt(tgMatch[1] || tgMatch[2])
  }

  let interpretation = ""
  let confidence = 0.9

  // Track citations
  if (statinStatus) citations.push({ fieldId: "statin_status", value: statinStatus, source: "provider" })
  if (statinDrugDose) citations.push({ fieldId: "statin_drug_dose", value: statinDrugDose, source: "med_list" })
  if (lipidPanel) citations.push({ fieldId: "lipid_panel", value: lipidPanel, source: "labs_api" })

  // Statin assessment
  if (statinStatus === "on_high_intensity") {
    interpretation = `Statin: high-intensity therapy`
    if (statinDrugDose) interpretation += ` (${statinDrugDose})`
    interpretation += "."

    // LDL goal assessment
    if (ldl !== undefined) {
      if (ldl < 70) {
        interpretation += ` LDL ${ldl} mg/dL - at goal for high-risk CKD.`
      } else if (ldl < 100) {
        interpretation += ` LDL ${ldl} mg/dL - consider intensification for very high-risk patients.`
        if (isDiabetic || ckdStage === "G4" || ckdStage === "G5") {
          actionItems.push(createActionItem(
            "Consider adding ezetimibe for LDL < 70 goal in very high-risk patient",
            "optional",
            "provider"
          ))
        }
      } else {
        interpretation += ` LDL ${ldl} mg/dL - above goal despite high-intensity statin.`
        actionItems.push(createActionItem(
          "Add ezetimibe for additional LDL lowering",
          "routine",
          "provider"
        ))
        if (ldl > 130) {
          actionItems.push(createActionItem(
            "Evaluate PCSK9i candidacy for LDL > 130 on max statin + ezetimibe",
            "routine",
            "provider"
          ))
        }
      }
    }

  } else if (statinStatus === "on_moderate_intensity") {
    interpretation = `Statin: moderate-intensity therapy`
    if (statinDrugDose) interpretation += ` (${statinDrugDose})`
    interpretation += "."

    // Consider intensification for CKD
    if (ckdStage !== "G1" && ckdStage !== "G2") {
      actionItems.push(createActionItem(
        "Consider high-intensity statin for CKD G3-G5 per KDIGO/SHARP",
        "routine",
        "provider"
      ))
    }

    if (ldl !== undefined && ldl >= 100) {
      interpretation += ` LDL ${ldl} mg/dL - above goal.`
      actionItems.push(createActionItem(
        "Intensify statin therapy or add ezetimibe for LDL goal",
        "routine",
        "provider"
      ))
    }

  } else if (statinStatus === "on_low_intensity") {
    interpretation = `Statin: low-intensity therapy`
    if (statinDrugDose) interpretation += ` (${statinDrugDose})`
    interpretation += "."

    actionItems.push(createActionItem(
      "Consider uptitrating to moderate or high-intensity statin for CKD",
      "routine",
      "provider"
    ))

  } else if (statinStatus === "intolerant") {
    interpretation = `Statin intolerant`
    if (statinIntolerance) interpretation += `: ${statinIntolerance}`
    interpretation += "."

    // Alternative therapies
    actionItems.push(createActionItem(
      "Consider alternative lipid-lowering: ezetimibe, bempedoic acid, or PCSK9i",
      "routine",
      "provider"
    ))

    // Rechallenge consideration
    if (statinIntolerance?.includes("myalgia") || statinIntolerance?.includes("muscle")) {
      actionItems.push(createActionItem(
        "Consider statin rechallenge with different agent (rosuvastatin, pitavastatin) or lower dose",
        "optional",
        "provider"
      ))
    }

  } else if (statinStatus === "not_on" || !statinStatus) {
    interpretation = `Statin: not on therapy.`

    // KDIGO recommendation: statin for all CKD G3-G5 age >= 50
    if (ckdStage !== "G1" && ckdStage !== "G2") {
      if (age === undefined || age >= 50) {
        interpretation += " Statin indicated for CKD G3-G5 per KDIGO."
        actionItems.push(createActionItem(
          "Initiate statin therapy - indicated for CKD G3-G5 (SHARP trial evidence)",
          "routine",
          "provider"
        ))
      } else if (age < 50 && isDiabetic) {
        actionItems.push(createActionItem(
          "Consider statin for diabetic CKD patient < 50 years",
          "routine",
          "provider"
        ))
      }
    } else if (isDiabetic && age !== undefined && age >= 40) {
      actionItems.push(createActionItem(
        "Consider statin for diabetic patient >= 40 years per ADA guidelines",
        "routine",
        "provider"
      ))
    }

    // Check for dialysis - different recommendation
    if (ckdStage === "G5D") {
      interpretation += " Note: KDIGO does not recommend initiating statin in dialysis patients (AURORA, 4D trials)."
      confidence = 0.85
    }
  }

  // PCSK9i assessment
  if (pcsk9iStatus === "on") {
    interpretation += ` PCSK9i: on therapy`
    if (pcsk9iDrug) interpretation += ` (${pcsk9iDrug})`
    interpretation += "."

    if (ldl !== undefined && ldl < 55) {
      interpretation += ` LDL ${ldl} mg/dL - excellent control.`
    }

  } else if (pcsk9iStatus === "candidate") {
    interpretation += " PCSK9i candidate identified."
    actionItems.push(createActionItem(
      "Complete PCSK9i prior authorization for high CV risk patient",
      "routine",
      "coordinator"
    ))

  } else if (pcsk9iStatus === "not_on" && ldl !== undefined && ldl > 100) {
    // Evaluate PCSK9i candidacy
    const onMaxStatin = statinStatus === "on_high_intensity"
    const onEzetimibe = statinDrugDose?.toLowerCase().includes("ezetimibe")

    if (onMaxStatin && onEzetimibe && ldl > 100) {
      actionItems.push(createActionItem(
        "Evaluate PCSK9i candidacy - LDL > 100 on max statin + ezetimibe",
        "routine",
        "provider"
      ))
    } else if (statinStatus === "intolerant" && ldl > 130) {
      actionItems.push(createActionItem(
        "Consider PCSK9i for statin-intolerant patient with elevated LDL",
        "routine",
        "provider"
      ))
    }
  }

  // Triglyceride assessment
  if (triglycerides !== undefined && triglycerides > 500) {
    alerts.push(createAlert(
      "lipid_therapy",
      "lipid_panel",
      `Severe hypertriglyceridemia (TG ${triglycerides}) - pancreatitis risk`,
      "high"
    ))
    actionItems.push(createActionItem(
      "Address severe hypertriglyceridemia - consider fibrate, omega-3, or icosapent ethyl",
      "urgent",
      "provider"
    ))
  } else if (triglycerides !== undefined && triglycerides > 200) {
    interpretation += ` Triglycerides ${triglycerides} mg/dL - elevated.`
    actionItems.push(createActionItem(
      "Address elevated triglycerides with lifestyle modifications",
      "optional",
      "provider"
    ))
  }

  // Patient education
  const patientEducation = generatePatientEducation(statinStatus, pcsk9iStatus, ldl)

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
  statinStatus: string | undefined,
  pcsk9iStatus: string | undefined,
  ldl: number | undefined
): string {
  let education = ""

  if (statinStatus?.startsWith("on_")) {
    education = "Your cholesterol medication (statin) helps reduce your risk of heart attack and stroke. "
    education += "People with kidney disease have a higher risk of heart disease, so this medication is especially important for you. "
    
    if (ldl !== undefined) {
      if (ldl < 70) {
        education += "Your LDL cholesterol is well-controlled. "
      } else {
        education += "We are working to get your LDL cholesterol to goal. "
      }
    }
    
    education += "Report any unexplained muscle pain or weakness to your care team."
  } else if (statinStatus === "intolerant") {
    education = "Although you had side effects with statin medication, there are other options to help control your cholesterol. "
    education += "We will discuss alternatives that may work better for you."
  } else {
    education = "Cholesterol medications can help reduce your risk of heart disease, which is common in people with kidney disease. "
    education += "We will discuss whether this medication is right for you."
  }

  if (pcsk9iStatus === "on") {
    education += " Your PCSK9 inhibitor injection provides additional cholesterol lowering beyond what pills can achieve."
  }

  return education
}

export const lipidSpecialistAgentMeta = {
  agentId: "lipid_specialist_agent",
  displayName: "Lipid Therapy Specialist",
  sectionsOwned: ["lipid_therapy"],
  guidelines: [
    "KDIGO 2024 Lipid Management in CKD",
    "SHARP Trial",
    "ACC/AHA Lipid Guidelines",
    "FOURIER Trial",
    "ODYSSEY Outcomes",
  ],
  confidenceThreshold: 0.8,
}
