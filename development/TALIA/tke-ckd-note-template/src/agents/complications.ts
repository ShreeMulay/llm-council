/**
 * CKD Complications Agent
 * Manages anemia, mineral bone disease, electrolytes, diabetes, gout, and obesity
 * Sections: anemia, mbd, electrolytes, diabetes, gout, obesity
 * Guidelines: KDIGO Anemia, KDIGO CKD-MBD, KDIGO Electrolytes/Acid-Base, ADA Standards 2025
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
 * Complications Agent
 */
export const complicationsAgent: AgentFunction = async (input) => {
  const { currentData, previousData, patientContext, sectionId } = input
  const alerts: Alert[] = []
  const actionItems: ActionItem[] = []
  const citations: { fieldId: string; value: string | number | boolean; source: string }[] = []

  let interpretation = ""
  let confidence = 0.85

  // Route to section-specific handler
  switch (sectionId) {
    case "anemia":
      interpretation = await interpretAnemia(currentData, alerts, actionItems, citations, patientContext)
      break
    case "mbd":
      interpretation = await interpretMbd(currentData, alerts, actionItems, citations, patientContext)
      break
    case "electrolytes":
      interpretation = await interpretElectrolytes(currentData, alerts, actionItems, citations, patientContext)
      break
    case "diabetes":
      interpretation = await interpretDiabetes(currentData, alerts, actionItems, citations, patientContext)
      break
    case "gout":
      interpretation = await interpretGout(currentData, alerts, actionItems, citations)
      break
    case "obesity":
      interpretation = await interpretObesity(currentData, alerts, actionItems, citations, patientContext)
      break
    default:
      interpretation = "Section not handled by complications agent."
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

async function interpretAnemia(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string }
): Promise<string> {
  const hemoglobin = getField<number>(data, "anemia", "hemoglobin")
  const ferritin = getField<number>(data, "anemia", "ferritin")
  const tsat = getField<number>(data, "anemia", "tsat")
  const anemiaAtGoal = getField<string>(data, "anemia", "anemia_at_goal")
  const esaStatus = getField<string>(data, "anemia", "esa_status")
  const ivIronStatus = getField<string>(data, "anemia", "iv_iron_status")
  const ckdRelated = getField<boolean>(data, "anemia", "ckd_related")

  let interpretation = ""

  if (hemoglobin !== undefined) {
    citations.push({ fieldId: "hemoglobin", value: hemoglobin, source: "labs_api" })
    interpretation = `Hemoglobin ${hemoglobin} g/dL.`

    // KDIGO targets: 10-12 g/dL for CKD
    if (hemoglobin < 7) {
      alerts.push(createAlert("anemia", "hemoglobin", `Severe anemia (Hgb ${hemoglobin}) - consider transfusion`, "critical"))
      actionItems.push(createActionItem("Evaluate for transfusion - severe anemia", "urgent", "provider"))
    } else if (hemoglobin < 10) {
      alerts.push(createAlert("anemia", "hemoglobin", `Anemia below target (Hgb ${hemoglobin})`, "medium"))
    }
  }

  // Iron status
  if (ferritin !== undefined && tsat !== undefined) {
    citations.push({ fieldId: "ferritin", value: ferritin, source: "labs_api" })
    citations.push({ fieldId: "tsat", value: tsat, source: "labs_api" })
    interpretation += ` Iron status: ferritin ${ferritin} ng/mL, TSAT ${tsat}%.`

    // KDIGO: ferritin >100 and TSAT >20% for CKD ND
    if (ferritin < 100 || tsat < 20) {
      actionItems.push(createActionItem(
        "Iron deficiency - consider IV iron supplementation",
        "routine",
        "provider"
      ))
    }
  }

  if (esaStatus) {
    interpretation += ` ESA: ${esaStatus}.`
  }

  if (anemiaAtGoal === "at_goal") {
    interpretation += " Anemia at goal."
  } else if (anemiaAtGoal === "below_goal") {
    interpretation += " Anemia below goal - optimization needed."
  }

  return interpretation
}

async function interpretMbd(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string }
): Promise<string> {
  const pth = getField<number>(data, "mbd", "pth")
  const vitaminD = getField<number>(data, "mbd", "vitamin_d25")
  const calcium = getField<number>(data, "mbd", "calcium")
  const phosphorus = getField<number>(data, "mbd", "phosphorus")
  const mbdAtGoal = getField<string>(data, "mbd", "mbd_at_goal")

  let interpretation = ""

  if (pth !== undefined) {
    citations.push({ fieldId: "pth", value: pth, source: "labs_api" })
    interpretation = `PTH ${pth} pg/mL.`

    // PTH targets vary by CKD stage
    if (context.ckdStage === "G5" || context.ckdStage === "G5D") {
      // G5: 2-9x upper limit of normal (~130-600 pg/mL)
      if (pth > 600) {
        alerts.push(createAlert("mbd", "pth", `Elevated PTH (${pth}) - evaluate for secondary hyperparathyroidism`, "high"))
        actionItems.push(createActionItem("Optimize vitamin D and phosphorus control for elevated PTH", "routine", "provider"))
      }
    } else if (pth > 150) {
      actionItems.push(createActionItem("Evaluate elevated PTH - check vitamin D status", "routine", "provider"))
    }
  }

  if (vitaminD !== undefined) {
    citations.push({ fieldId: "vitamin_d25", value: vitaminD, source: "labs_api" })
    interpretation += ` Vitamin D ${vitaminD} ng/mL.`

    if (vitaminD < 30) {
      actionItems.push(createActionItem(
        "Vitamin D insufficiency - supplement to target 30-50 ng/mL",
        "routine",
        "provider"
      ))
    }
  }

  if (calcium !== undefined && phosphorus !== undefined) {
    citations.push({ fieldId: "calcium", value: calcium, source: "labs_api" })
    citations.push({ fieldId: "phosphorus", value: phosphorus, source: "labs_api" })
    interpretation += ` Calcium ${calcium} mg/dL, phosphorus ${phosphorus} mg/dL.`

    if (phosphorus > 5.5 && (context.ckdStage === "G4" || context.ckdStage === "G5")) {
      alerts.push(createAlert("mbd", "phosphorus", `Hyperphosphatemia (${phosphorus}) - review phosphate binders`, "high"))
      actionItems.push(createActionItem("Optimize phosphate binder therapy", "routine", "provider"))
    }

    if (calcium > 10.5) {
      alerts.push(createAlert("mbd", "calcium", `Hypercalcemia (${calcium}) - evaluate cause`, "medium"))
    }
  }

  if (mbdAtGoal === "at_goal") {
    interpretation += " MBD at goal."
  }

  return interpretation
}

async function interpretElectrolytes(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string }
): Promise<string> {
  const potassium = getField<number>(data, "electrolytes", "potassium")
  const sodium = getField<number>(data, "electrolytes", "sodium")
  const bicarbonate = getField<number>(data, "electrolytes", "bicarbonate")
  const magnesium = getField<number>(data, "electrolytes", "magnesium")

  let interpretation = ""

  if (potassium !== undefined) {
    citations.push({ fieldId: "potassium", value: potassium, source: "labs_api" })
    interpretation = `Potassium ${potassium} mEq/L.`

    if (potassium >= 6.0) {
      alerts.push(createAlert("electrolytes", "potassium", `Severe hyperkalemia (K+ ${potassium}) - urgent management`, "critical"))
      actionItems.push(createActionItem("Urgent hyperkalemia management - ECG, calcium, insulin/glucose", "urgent", "provider"))
    } else if (potassium > 5.5) {
      alerts.push(createAlert("electrolytes", "potassium", `Hyperkalemia (K+ ${potassium})`, "high"))
      actionItems.push(createActionItem("Address hyperkalemia - dietary counseling, potassium binder", "routine", "provider"))
    } else if (potassium < 3.5) {
      alerts.push(createAlert("electrolytes", "potassium", `Hypokalemia (K+ ${potassium})`, "high"))
      actionItems.push(createActionItem("Evaluate and treat hypokalemia", "routine", "provider"))
    }
  }

  if (bicarbonate !== undefined) {
    citations.push({ fieldId: "bicarbonate", value: bicarbonate, source: "labs_api" })
    interpretation += ` Bicarbonate ${bicarbonate} mEq/L.`

    // KDIGO: maintain bicarb >= 22
    if (bicarbonate < 18) {
      alerts.push(createAlert("electrolytes", "bicarbonate", `Significant metabolic acidosis (HCO3 ${bicarbonate})`, "high"))
      actionItems.push(createActionItem("Initiate or increase bicarbonate supplementation", "routine", "provider"))
    } else if (bicarbonate < 22) {
      actionItems.push(createActionItem("Consider bicarbonate supplementation to target >= 22 mEq/L", "routine", "provider"))
    }
  }

  if (sodium !== undefined) {
    citations.push({ fieldId: "sodium", value: sodium, source: "labs_api" })
    interpretation += ` Sodium ${sodium} mEq/L.`

    if (sodium < 130) {
      alerts.push(createAlert("electrolytes", "sodium", `Hyponatremia (Na ${sodium})`, "high"))
    } else if (sodium > 150) {
      alerts.push(createAlert("electrolytes", "sodium", `Hypernatremia (Na ${sodium})`, "high"))
    }
  }

  if (magnesium !== undefined) {
    citations.push({ fieldId: "magnesium", value: magnesium, source: "labs_api" })
    interpretation += ` Magnesium ${magnesium} mg/dL.`

    if (magnesium < 1.5) {
      actionItems.push(createActionItem("Evaluate and treat hypomagnesemia", "routine", "provider"))
    }
  }

  return interpretation
}

async function interpretDiabetes(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { currentEgfr?: number }
): Promise<string> {
  const diabeticStatus = getField<string>(data, "diabetes", "diabetic_status")
  const hba1c = getField<number>(data, "diabetes", "hba1c")
  const hba1cTarget = getField<number>(data, "diabetes", "hba1c_target")
  const annualEyeExam = getField<string>(data, "diabetes", "annual_eye_exam")
  const annualFootExam = getField<string>(data, "diabetes", "annual_foot_exam")

  if (diabeticStatus === "not_diabetic") {
    return "Non-diabetic."
  }

  let interpretation = `Diabetes: ${diabeticStatus}.`

  if (hba1c !== undefined) {
    citations.push({ fieldId: "hba1c", value: hba1c, source: "labs_api" })
    const target = hba1cTarget ?? 7.0
    interpretation += ` HbA1c ${hba1c}% (target <${target}%).`

    if (hba1c > 9) {
      alerts.push(createAlert("diabetes", "hba1c", `Uncontrolled diabetes (HbA1c ${hba1c}%)`, "high"))
      actionItems.push(createActionItem("Intensify diabetes management - consider endocrinology referral", "routine", "provider"))
    } else if (hba1c > target) {
      actionItems.push(createActionItem("Optimize glycemic control toward individualized target", "routine", "provider"))
    }
  }

  // Annual screening checks
  if (annualEyeExam !== "done") {
    actionItems.push(createActionItem("Order annual diabetic eye exam", "routine", "coordinator"))
  }
  if (annualFootExam !== "done") {
    actionItems.push(createActionItem("Complete annual diabetic foot exam", "routine", "provider"))
  }

  // Metformin safety check
  if (context.currentEgfr !== undefined && context.currentEgfr < 30) {
    actionItems.push(createActionItem("Review metformin - contraindicated if eGFR < 30", "routine", "provider"))
  }

  return interpretation
}

async function interpretGout(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[]
): Promise<string> {
  const goutHistory = getField<string>(data, "gout", "gout_history")
  const uricAcid = getField<number>(data, "gout", "uric_acid")
  const currentTherapy = getField<string>(data, "gout", "current_therapy")
  const krystexxa = getField<string>(data, "gout", "krystexxa_status")

  if (!goutHistory && (uricAcid === undefined || uricAcid <= 6.0)) {
    return "No gout history. Uric acid at goal."
  }

  let interpretation = goutHistory ? `Gout history: ${goutHistory}.` : ""

  if (uricAcid !== undefined) {
    citations.push({ fieldId: "uric_acid", value: uricAcid, source: "labs_api" })
    interpretation += ` Uric acid ${uricAcid} mg/dL.`

    if (uricAcid > 6.0) {
      actionItems.push(createActionItem("Optimize urate-lowering therapy to target <6.0 mg/dL", "routine", "provider"))
    }
  }

  if (currentTherapy) {
    interpretation += ` Current therapy: ${currentTherapy}.`
  }

  if (krystexxa === "candidate") {
    actionItems.push(createActionItem("Evaluate Krystexxa candidacy for refractory gout", "routine", "provider"))
  }

  return interpretation
}

async function interpretObesity(
  data: Record<string, unknown>,
  alerts: Alert[],
  actionItems: ActionItem[],
  citations: { fieldId: string; value: string | number | boolean; source: string }[],
  context: { ckdStage: string }
): Promise<string> {
  const bmi = getField<number>(data, "obesity", "bmi")
  const weightTrend = getField<string>(data, "obesity", "weight_trend_6mo")
  const obesityClinicReferral = getField<boolean>(data, "obesity", "obesity_clinic_referral")
  const bariatricHistory = getField<boolean>(data, "obesity", "bariatric_surgery_history")

  if (bmi === undefined || bmi < 30) {
    return bmi !== undefined ? `BMI ${bmi.toFixed(1)} kg/m2 - not obese.` : "BMI not recorded."
  }

  citations.push({ fieldId: "bmi", value: bmi, source: "vitals" })
  let interpretation = `BMI ${bmi.toFixed(1)} kg/m2 (Class ${bmi >= 40 ? "III" : bmi >= 35 ? "II" : "I"} obesity).`

  if (weightTrend) {
    interpretation += ` 6-month weight trend: ${weightTrend}.`
  }

  // GLP-1 RA cross-reference
  const glp1Status = getField<string>(data, "glp1", "glp1_status")
  if (glp1Status !== "on") {
    actionItems.push(createActionItem(
      "Consider GLP-1 RA for weight management and kidney protection",
      "routine",
      "provider"
    ))
  }

  if (!obesityClinicReferral && bmi >= 35) {
    actionItems.push(createActionItem("Consider obesity medicine referral", "optional", "provider"))
  }

  if (bariatricHistory) {
    interpretation += " History of bariatric surgery."
  }

  return interpretation
}

function generatePatientEducation(sectionId: string, data: Record<string, unknown>): string {
  switch (sectionId) {
    case "anemia":
      return "Anemia means your blood has fewer red blood cells than normal. This is common in kidney disease. We may treat it with iron supplements or other medications to help you feel less tired."
    case "mbd":
      return "Kidney disease can affect your bones and mineral balance. We monitor your calcium, phosphorus, and vitamin D levels and may prescribe medications to keep them in balance."
    case "electrolytes":
      return "Your kidneys help balance important minerals in your blood. We monitor potassium, sodium, and bicarbonate levels. Following dietary recommendations helps keep these in balance."
    case "diabetes":
      return "Good blood sugar control helps protect your kidneys. Take your diabetes medications as prescribed and monitor your blood sugar regularly."
    case "gout":
      return "Gout causes painful joint inflammation from high uric acid. Kidney disease can make gout harder to control. We aim to keep your uric acid below 6.0 mg/dL."
    case "obesity":
      return "Maintaining a healthy weight helps protect your kidneys and heart. We can discuss weight management options including medications and lifestyle changes."
    default:
      return "Managing CKD complications is important for your overall health. Follow your care team's recommendations."
  }
}

export const complicationsAgentMeta = {
  agentId: "complications_agent",
  displayName: "CKD Complications Agent",
  sectionsOwned: ["anemia", "mbd", "electrolytes", "diabetes", "gout", "obesity"],
  guidelines: [
    "KDIGO Anemia Guidelines",
    "KDIGO CKD-MBD Guidelines",
    "KDIGO Electrolytes/Acid-Base",
    "ADA Standards of Care 2025",
  ],
  confidenceThreshold: 0.7,
}
