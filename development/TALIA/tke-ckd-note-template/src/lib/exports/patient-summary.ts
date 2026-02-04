/**
 * Patient Summary Export
 *
 * Generates a plain-language patient summary at 6th grade reading level.
 * No medical jargon - designed for patients to understand their kidney health.
 */

import type { FieldValue, SectionRegistry } from "@/types/schema"
import { getCKDStage } from "@/lib/utils"

/**
 * Get plain language description of CKD stage
 */
function getKidneyHealthDescription(stage: string): string {
  switch (stage) {
    case "G1":
    case "G2":
      return "Your kidneys are working well"
    case "G3a":
      return "Your kidneys are mildly reduced"
    case "G3b":
      return "Your kidneys are moderately reduced"
    case "G4":
      return "Your kidneys are significantly reduced"
    case "G5":
      return "Your kidneys need close monitoring"
    default:
      return "Your kidney function is being monitored"
  }
}

/**
 * Format a date value for display
 */
function formatDate(value: FieldValue): string {
  if (!value) return "[Date not set]"
  if (value instanceof Date) {
    return value.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }
  // Handle string dates
  const date = new Date(String(value))
  if (isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/**
 * Get medication purpose in plain language
 */
function getMedicationPurpose(drugName: string): string {
  const name = drugName.toLowerCase()

  // RAAS inhibitors
  if (
    name.includes("lisinopril") ||
    name.includes("enalapril") ||
    name.includes("ramipril") ||
    name.includes("benazepril") ||
    name.includes("captopril") ||
    name.includes("fosinopril") ||
    name.includes("quinapril") ||
    name.includes("trandolapril") ||
    name.includes("perindopril") ||
    name.includes("moexipril")
  ) {
    return "Protects your kidneys and heart"
  }
  if (
    name.includes("losartan") ||
    name.includes("valsartan") ||
    name.includes("irbesartan") ||
    name.includes("olmesartan") ||
    name.includes("telmisartan") ||
    name.includes("candesartan") ||
    name.includes("azilsartan")
  ) {
    return "Protects your kidneys and heart"
  }
  if (name.includes("entresto") || name.includes("sacubitril")) {
    return "Protects your heart and kidneys"
  }

  // SGLT2 inhibitors
  if (
    name.includes("empagliflozin") ||
    name.includes("jardiance") ||
    name.includes("dapagliflozin") ||
    name.includes("farxiga") ||
    name.includes("canagliflozin") ||
    name.includes("invokana")
  ) {
    return "Slows kidney disease and helps your heart"
  }

  // MRAs
  if (
    name.includes("finerenone") ||
    name.includes("kerendia") ||
    name.includes("spironolactone") ||
    name.includes("eplerenone")
  ) {
    return "Protects your kidneys and reduces swelling"
  }

  // GLP-1 agonists
  if (
    name.includes("semaglutide") ||
    name.includes("ozempic") ||
    name.includes("wegovy") ||
    name.includes("rybelsus") ||
    name.includes("liraglutide") ||
    name.includes("victoza") ||
    name.includes("saxenda") ||
    name.includes("dulaglutide") ||
    name.includes("trulicity") ||
    name.includes("tirzepatide") ||
    name.includes("mounjaro") ||
    name.includes("zepbound")
  ) {
    return "Helps with blood sugar and protects your kidneys"
  }

  // Statins
  if (
    name.includes("statin") ||
    name.includes("atorvastatin") ||
    name.includes("rosuvastatin") ||
    name.includes("simvastatin") ||
    name.includes("pravastatin") ||
    name.includes("lovastatin") ||
    name.includes("pitavastatin") ||
    name.includes("fluvastatin")
  ) {
    return "Lowers cholesterol to protect your heart"
  }

  // Blood pressure medications
  if (
    name.includes("amlodipine") ||
    name.includes("nifedipine") ||
    name.includes("diltiazem") ||
    name.includes("verapamil")
  ) {
    return "Helps control your blood pressure"
  }
  if (
    name.includes("metoprolol") ||
    name.includes("carvedilol") ||
    name.includes("atenolol") ||
    name.includes("bisoprolol")
  ) {
    return "Helps your heart and blood pressure"
  }

  // Diuretics
  if (
    name.includes("furosemide") ||
    name.includes("lasix") ||
    name.includes("bumetanide") ||
    name.includes("torsemide")
  ) {
    return "Removes extra fluid from your body"
  }
  if (
    name.includes("hydrochlorothiazide") ||
    name.includes("hctz") ||
    name.includes("chlorthalidone")
  ) {
    return "Helps with blood pressure and fluid"
  }

  // Diabetes medications
  if (name.includes("metformin")) {
    return "Helps control your blood sugar"
  }
  if (name.includes("insulin")) {
    return "Controls your blood sugar"
  }

  // Anemia medications
  if (
    name.includes("epoetin") ||
    name.includes("darbepoetin") ||
    name.includes("aranesp") ||
    name.includes("procrit")
  ) {
    return "Helps your body make red blood cells"
  }
  if (name.includes("iron") || name.includes("ferric") || name.includes("venofer")) {
    return "Helps with your iron levels and blood"
  }

  // Vitamin D
  if (
    name.includes("vitamin d") ||
    name.includes("cholecalciferol") ||
    name.includes("ergocalciferol") ||
    name.includes("calcitriol")
  ) {
    return "Helps your bones stay strong"
  }

  // Phosphate binders
  if (
    name.includes("sevelamer") ||
    name.includes("renvela") ||
    name.includes("velphoro") ||
    name.includes("phoslyra")
  ) {
    return "Keeps your phosphorus levels healthy"
  }

  // Potassium binders
  if (
    name.includes("patiromer") ||
    name.includes("veltassa") ||
    name.includes("lokelma") ||
    name.includes("kayexalate")
  ) {
    return "Keeps your potassium at a safe level"
  }

  // Bicarbonate
  if (name.includes("sodium bicarbonate") || name.includes("bicarb")) {
    return "Helps balance acid in your blood"
  }

  // Gout medications
  if (name.includes("allopurinol") || name.includes("febuxostat")) {
    return "Prevents gout attacks"
  }

  // Default
  return "Helps with your health"
}

/**
 * Extract medications from data and format with purposes
 */
function extractMedications(data: Record<string, FieldValue>): string[] {
  const medications: string[] = []

  // Check common medication fields
  const medFields = [
    "raas.raas_drug_dose",
    "sglt2i.sglt2i_drug_dose",
    "mra.mra_drug_dose",
    "glp1.glp1_drug_dose",
    "lipid_therapy.statin_drug_dose",
    "anemia.esa_status",
    "anemia.iv_iron_status",
    "mbd.vitamin_d_supplement",
    "mbd.phosphate_binder",
    "electrolytes.bicarb_supplement",
    "electrolytes.kcl_supplement",
    "mra.potassium_binder",
    "gout.current_therapy",
  ]

  for (const field of medFields) {
    const value = data[field]
    if (value && typeof value === "string" && value.trim()) {
      const purpose = getMedicationPurpose(value)
      medications.push(`${value} - ${purpose}`)
    }
  }

  return medications
}

/**
 * Extract top priorities from data
 */
function extractPriorities(
  data: Record<string, FieldValue>,
  _sectionRegistry: SectionRegistry
): string[] {
  const priorities: string[] = []

  // Check eGFR trend
  const egfrCurrent = data["kidney_function.egfr_current"]
  const egfrPrevious = data["kidney_function.egfr_previous"]
  if (
    typeof egfrCurrent === "number" &&
    typeof egfrPrevious === "number" &&
    egfrCurrent < egfrPrevious
  ) {
    priorities.push("Your kidney function - it went down slightly")
  } else if (typeof egfrCurrent === "number" && typeof egfrPrevious === "number") {
    priorities.push("Your kidney function - keeping it stable")
  }

  // Check blood pressure
  const bpStatus = data["bp_fluid.bp_control_status"]
  if (bpStatus === "uncontrolled" || bpStatus === "poorly_controlled") {
    priorities.push("Your blood pressure - still a bit high")
  } else if (bpStatus === "controlled") {
    priorities.push("Your blood pressure - keeping it in a good range")
  }

  // Check proteinuria
  const uacrCurrent = data["kidney_function.uacr_current"]
  if (typeof uacrCurrent === "number" && uacrCurrent > 30) {
    priorities.push("Your protein in urine - we want this lower")
  }

  // Check anemia
  const hemoglobin = data["anemia.hemoglobin"]
  if (typeof hemoglobin === "number" && hemoglobin < 10) {
    priorities.push("Your blood count - we want to improve this")
  }

  // Check potassium
  const potassium = data["electrolytes.potassium"]
  if (typeof potassium === "number" && (potassium > 5.5 || potassium < 3.5)) {
    priorities.push("Your potassium level - keeping it in a safe range")
  }

  // Check diabetes control
  const hba1c = data["diabetes.hba1c"]
  if (typeof hba1c === "number" && hba1c > 7.5) {
    priorities.push("Your blood sugar control - we want to improve this")
  }

  // Return top 3
  return priorities.slice(0, 3)
}

/**
 * Generate actionable patient items
 */
function generateActionItems(data: Record<string, FieldValue>): string[] {
  const actions: string[] = []

  // Always include medication adherence
  actions.push("Take your medications every day")

  // Check sodium/diet
  const dietAdherence = data["sodium.diet_adherence"]
  if (dietAdherence !== "good") {
    actions.push("Limit salt to help your blood pressure")
  }

  // Check BP
  const bpStatus = data["bp_fluid.bp_control_status"]
  if (bpStatus === "uncontrolled" || bpStatus === "poorly_controlled") {
    actions.push("Check your blood pressure at home if you can")
  }

  // Hydration
  actions.push("Drink water, avoid sugary drinks")

  // Exercise
  actions.push("Walk 30 minutes most days")

  // Check smoking
  const smokingStatus = data["tobacco.smoking_status"]
  if (smokingStatus === "current") {
    actions.push("Talk to us about quitting smoking - it helps your kidneys")
  }

  // NSAID avoidance
  const nsaidStatus = data["nsaid.nsaid_status"]
  if (nsaidStatus === "using" || nsaidStatus === "occasional") {
    actions.push("Avoid ibuprofen, Advil, Aleve - they can hurt your kidneys")
  }

  // Sick day rules
  const sickDayReviewed = data["sick_day.sick_day_rules_reviewed"]
  if (sickDayReviewed) {
    actions.push("Remember your sick day rules - hold certain medications when ill")
  }

  // Return 3-5 items
  return actions.slice(0, 5)
}

/**
 * Generate a plain-language patient summary
 *
 * @param currentData - Current encounter data keyed by "section_id.field_id"
 * @param sectionRegistry - The section registry for field metadata
 * @returns Plain text patient summary at 6th grade reading level
 */
export function generatePatientSummary(
  currentData: Record<string, FieldValue>,
  sectionRegistry: SectionRegistry
): string {
  const lines: string[] = []

  // Header
  lines.push("YOUR KIDNEY HEALTH VISIT SUMMARY")
  lines.push("=================================")

  // Patient info
  const patientName = currentData["header.patient_name"] || "[Patient Name]"
  const visitDate = formatDate(currentData["header.visit_date"] || new Date())
  lines.push(`Patient: ${patientName}`)
  lines.push(`Date: ${visitDate}`)
  lines.push("")

  // Your Kidney Health section
  lines.push("YOUR KIDNEY HEALTH")
  lines.push("------------------")

  const egfr = currentData["kidney_function.egfr_current"]
  let stage = currentData["header.ckd_stage"] as string | null

  // Calculate stage from eGFR if not provided
  if (!stage && typeof egfr === "number") {
    stage = getCKDStage(egfr)
  }

  if (stage) {
    const description = getKidneyHealthDescription(stage)
    lines.push(`${description} (Stage ${stage}).`)
  }

  if (typeof egfr === "number") {
    lines.push(`Your kidney number (eGFR) is ${egfr}. A healthy kidney is 90 or above.`)
  }
  lines.push("")

  // Your Medications section
  lines.push("YOUR MEDICATIONS")
  lines.push("----------------")

  const medications = extractMedications(currentData)
  if (medications.length > 0) {
    for (const med of medications) {
      lines.push(`* ${med}`)
    }
  } else {
    lines.push("* Your medication list will be reviewed with you")
  }
  lines.push("")

  // What We're Watching section
  lines.push("WHAT WE'RE WATCHING")
  lines.push("-------------------")

  const priorities = extractPriorities(currentData, sectionRegistry)
  if (priorities.length > 0) {
    priorities.forEach((priority, index) => {
      lines.push(`${index + 1}. ${priority}`)
    })
  } else {
    lines.push("1. Your kidney function - keeping it stable")
    lines.push("2. Your blood pressure - keeping it in a good range")
    lines.push("3. Your overall health")
  }
  lines.push("")

  // What You Can Do section
  lines.push("WHAT YOU CAN DO")
  lines.push("---------------")

  const actions = generateActionItems(currentData)
  for (const action of actions) {
    lines.push(`* ${action}`)
  }
  lines.push("")

  // Your Next Visit section
  lines.push("YOUR NEXT VISIT")
  lines.push("---------------")

  const nextVisitDate = currentData["planning.next_visit_date"]
  if (nextVisitDate) {
    lines.push(`Date: ${formatDate(nextVisitDate)}`)
  } else {
    lines.push("Date: [To be scheduled]")
  }
  lines.push("Before you come: Get blood and urine tests 1 week before")
  lines.push("")

  // Contact info
  lines.push("QUESTIONS? Call us: (731) 660-0014")
  lines.push('The Kidney Experts - "Big Expertise. Small-Town Heart."')

  return lines.join("\n")
}
