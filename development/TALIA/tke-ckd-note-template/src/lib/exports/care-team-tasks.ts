/**
 * Care Team Tasks Export
 *
 * Generates role-based task lists from encounter data for MA, Care Coordinator,
 * Billing, and Provider roles. Derives tasks from clinical data, GDMT gaps,
 * critical values, and screening status.
 */

import type { FieldValue, SectionRegistry, CriticalValue } from "@/types/schema"

// Critical value thresholds from field-types.json
const CRITICAL_VALUES: Record<string, CriticalValue> = {
  potassium: { panic_low: 2.5, panic_high: 6.0 },
  sodium: { panic_low: 120, panic_high: 160 },
  hemoglobin: { panic_low: 6.0, panic_high: null },
  calcium: { panic_low: 6.5, panic_high: 13.0 },
  phosphorus: { panic_low: 1.0, panic_high: 7.0 },
  creatinine: { panic_low: null, panic_high: 10.0 },
  bicarbonate: { panic_low: 10, panic_high: null },
  glucose: { panic_low: 40, panic_high: 500 },
}

// GDMT pillar education card mappings
const GDMT_EDUCATION_CARDS: Record<string, string> = {
  raas: "TKE-RAAS",
  sglt2i: "TKE-SGLT",
  mra: "TKE-FINE",
  glp1: "TKE-GLP1",
}

export type CareTaskRole = "MA" | "Care Coordinator" | "Billing" | "Provider"
export type CareTaskPriority = "high" | "medium" | "low"

export interface CareTask {
  role: CareTaskRole
  task: string
  deadline?: string
  priority: CareTaskPriority
}

interface TaskGeneratorContext {
  currentData: Record<string, FieldValue>
  sectionRegistry: SectionRegistry
  tasks: CareTask[]
}

/**
 * Get a field value from the data using section.field format
 */
function getValue(data: Record<string, FieldValue>, key: string): FieldValue {
  return data[key] ?? null
}

/**
 * Get a numeric value, returning null if not a number
 */
function getNumericValue(data: Record<string, FieldValue>, key: string): number | null {
  const val = getValue(data, key)
  if (typeof val === "number") return val
  if (typeof val === "string") {
    const parsed = parseFloat(val)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Get a date value, returning null if not valid
 */
function getDateValue(data: Record<string, FieldValue>, key: string): Date | null {
  const val = getValue(data, key)
  if (val instanceof Date) return val
  if (typeof val === "string" && val) {
    const parsed = new Date(val)
    return isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

/**
 * Check if a date is older than N months from now
 */
function isOlderThanMonths(date: Date | null, months: number): boolean {
  if (!date) return true // If no date, consider it overdue
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  return date < cutoff
}

/**
 * Check if a value is critical based on thresholds
 */
function isCriticalValue(fieldId: string, value: number | null): boolean {
  if (value === null) return false
  const thresholds = CRITICAL_VALUES[fieldId]
  if (!thresholds) return false

  if (thresholds.panic_low !== null && value < thresholds.panic_low) return true
  if (thresholds.panic_high !== null && value > thresholds.panic_high) return true
  return false
}

/**
 * Generate MA tasks: vitals, screenings, patient education cards
 */
function generateMATasks(ctx: TaskGeneratorContext): void {
  const { currentData, tasks } = ctx

  // Check frailty screening (grip strength)
  const gripStrength = getNumericValue(currentData, "physical_performance.grip_strength_dominant")
  const frailtyStatus = getValue(currentData, "physical_performance.frailty_status")

  if (gripStrength === null && frailtyStatus !== "robust") {
    tasks.push({
      role: "MA",
      task: "Complete grip strength screening (frailty protocol)",
      priority: "high",
    })
  }

  // Check PHQ-2 screening
  const phq2Score = getNumericValue(currentData, "depression.phq2_score")
  if (phq2Score === null) {
    tasks.push({
      role: "MA",
      task: "Administer PHQ-2 depression screening",
      priority: "medium",
    })
  } else if (phq2Score >= 3) {
    // Positive PHQ-2, need PHQ-9
    const phq9Score = getNumericValue(currentData, "depression.phq9_score")
    if (phq9Score === null) {
      tasks.push({
        role: "MA",
        task: "Administer PHQ-9 (positive PHQ-2 screen)",
        priority: "high",
      })
    }
  }

  // Check fall risk assessment for elderly
  const fallRisk = getValue(currentData, "fall_risk.fall_risk")
  const ckdStage = getValue(currentData, "header.ckd_stage")
  if (fallRisk === null && (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D")) {
    tasks.push({
      role: "MA",
      task: "Complete fall risk assessment",
      priority: "medium",
    })
  }

  // GDMT education cards for gaps
  const gdmtPillars = [
    { section: "raas", field: "raas_status", onValues: ["on_acei", "on_arb", "on_arni"], name: "RAAS inhibitor" },
    { section: "sglt2i", field: "sglt2i_status", onValues: ["on"], name: "SGLT2i" },
    { section: "mra", field: "mra_status", onValues: ["on"], name: "MRA/Finerenone" },
    { section: "glp1", field: "glp1_status", onValues: ["on"], name: "GLP-1 RA" },
  ]

  for (const pillar of gdmtPillars) {
    const status = getValue(currentData, `${pillar.section}.${pillar.field}`)
    const notOnReason = getValue(currentData, `${pillar.section}.not_on_reason`)

    // If not on therapy and not contraindicated, deliver education card
    if (
      status &&
      !pillar.onValues.includes(status as string) &&
      status !== "contraindicated" &&
      notOnReason !== "contraindicated"
    ) {
      const cardCode = GDMT_EDUCATION_CARDS[pillar.section]
      tasks.push({
        role: "MA",
        task: `Deliver ${pillar.name} education card (${cardCode})`,
        priority: "medium",
      })
    }
  }

  // Sick day rules card if on relevant medications
  const sickDayReviewed = getValue(currentData, "sick_day.sick_day_rules_reviewed")
  const raasStatus = getValue(currentData, "raas.raas_status")
  const sglt2iStatus = getValue(currentData, "sglt2i.sglt2i_status")

  if (
    !sickDayReviewed &&
    (raasStatus === "on_acei" ||
      raasStatus === "on_arb" ||
      raasStatus === "on_arni" ||
      sglt2iStatus === "on")
  ) {
    tasks.push({
      role: "MA",
      task: "Deliver sick day rules card (TKE-SICK)",
      priority: "medium",
    })
  }

  // Vitals check - weight trend
  const weight = getNumericValue(currentData, "header.weight")
  if (weight === null) {
    tasks.push({
      role: "MA",
      task: "Obtain patient weight",
      priority: "high",
    })
  }

  // BP check
  const systolicBP = getNumericValue(currentData, "bp_fluid.systolic_bp")
  const diastolicBP = getNumericValue(currentData, "bp_fluid.diastolic_bp")
  if (systolicBP === null || diastolicBP === null) {
    tasks.push({
      role: "MA",
      task: "Obtain blood pressure",
      priority: "high",
    })
  }
}

/**
 * Generate Care Coordinator tasks: referrals, prior auths, follow-up scheduling
 */
function generateCareCoordinatorTasks(ctx: TaskGeneratorContext): void {
  const { currentData, tasks } = ctx

  // Follow-up scheduling based on CKD stage
  const ckdStage = getValue(currentData, "header.ckd_stage")
  const nextAppointment = getDateValue(currentData, "follow_up.next_appointment")
  const followUpInterval = getValue(currentData, "follow_up.follow_up_interval")

  if (!nextAppointment && followUpInterval) {
    tasks.push({
      role: "Care Coordinator",
      task: `Schedule nephrology follow-up: ${followUpInterval}`,
      priority: "high",
    })
  }

  // Referrals from follow_up section
  const referralsPlaced = getValue(currentData, "follow_up.referrals_placed")
  if (referralsPlaced && typeof referralsPlaced === "string" && referralsPlaced.trim()) {
    tasks.push({
      role: "Care Coordinator",
      task: `Process referrals: ${referralsPlaced}`,
      priority: "high",
    })
  }

  // Prior auth for SGLT2i if newly started
  const sglt2iStatus = getValue(currentData, "sglt2i.sglt2i_status")
  const sglt2iDrug = getValue(currentData, "sglt2i.sglt2i_drug_dose")
  const priorAuthPending = getValue(currentData, "medication_adherence.prior_auth_pending")

  if (sglt2iStatus === "on" && sglt2iDrug && !priorAuthPending) {
    // Check if this might need prior auth
    tasks.push({
      role: "Care Coordinator",
      task: `Verify prior auth status for SGLT2i (${sglt2iDrug})`,
      priority: "medium",
    })
  }

  // Prior auth for GLP-1 RA
  const glp1Status = getValue(currentData, "glp1.glp1_status")
  const glp1Drug = getValue(currentData, "glp1.glp1_drug_dose")
  if (glp1Status === "on" && glp1Drug) {
    tasks.push({
      role: "Care Coordinator",
      task: `Verify prior auth status for GLP-1 RA (${glp1Drug})`,
      priority: "medium",
    })
  }

  // Transplant workup coordination
  const transplantCandidate = getValue(currentData, "transplant.transplant_candidate")
  const transplantStatus = getValue(currentData, "transplant.current_status")
  if (transplantCandidate === "yes" && transplantStatus === "in_workup") {
    const workupPct = getNumericValue(currentData, "transplant.workup_completion_pct")
    tasks.push({
      role: "Care Coordinator",
      task: `Continue transplant workup coordination (${workupPct ?? 0}% complete)`,
      priority: "high",
    })
  }

  // Dialysis planning coordination
  const dialysisEducation = getValue(currentData, "dialysis.dialysis_education")
  if (
    (ckdStage === "G4" || ckdStage === "G5") &&
    !dialysisEducation
  ) {
    tasks.push({
      role: "Care Coordinator",
      task: "Schedule dialysis education session",
      priority: "high",
    })
  }

  // Vascular access surgery referral
  const accessStatus = getValue(currentData, "dialysis.vascular_access_status")
  const surgeryReferralDate = getDateValue(currentData, "dialysis.surgery_referral_date")
  if (accessStatus === "AVF_planned" && !surgeryReferralDate) {
    tasks.push({
      role: "Care Coordinator",
      task: "Coordinate vascular access surgery referral",
      priority: "high",
    })
  }

  // Dietitian referral
  const dietitianReferral = getValue(currentData, "nutrition.dietitian_referral")
  if (dietitianReferral === true) {
    tasks.push({
      role: "Care Coordinator",
      task: "Schedule dietitian consultation",
      priority: "medium",
    })
  }

  // CCM enrollment
  const ccmEnrollment = getValue(currentData, "ccm.ccm_enrollment")
  if (ccmEnrollment === "not_enrolled") {
    tasks.push({
      role: "Care Coordinator",
      task: "Discuss CCM enrollment with patient",
      priority: "low",
    })
  }

  // Care gaps from CCM
  const careGaps = getValue(currentData, "ccm.care_gaps")
  if (careGaps && typeof careGaps === "string" && careGaps.trim()) {
    tasks.push({
      role: "Care Coordinator",
      task: `Address care gaps: ${careGaps}`,
      priority: "medium",
    })
  }
}

/**
 * Generate Billing tasks: CCM time tracking, E/M documentation notes
 */
function generateBillingTasks(ctx: TaskGeneratorContext): void {
  const { currentData, tasks } = ctx

  // CCM time tracking
  const ccmActive = getValue(currentData, "ccm.ccm_active")
  // Note: lastCcmContact could be used for CCM billing frequency validation
  // const lastCcmContact = getDateValue(currentData, "ccm.last_ccm_contact")

  if (ccmActive === true) {
    tasks.push({
      role: "Billing",
      task: "Document CCM time for this encounter",
      priority: "medium",
    })
  }

  // Time/complexity documentation
  const timeComplexity = getValue(currentData, "follow_up.time_complexity")
  if (!timeComplexity) {
    tasks.push({
      role: "Billing",
      task: "Document time/complexity for E/M coding",
      priority: "medium",
    })
  }

  // ACP billing
  const goalsOfCareDiscussed = getValue(currentData, "acp.goals_of_care_discussed")
  const acpBilled = getValue(currentData, "acp.cpt_99497_99498")
  if (goalsOfCareDiscussed === true && !acpBilled) {
    tasks.push({
      role: "Billing",
      task: "Bill CPT 99497/99498 for ACP discussion",
      priority: "medium",
    })
  }

  // Prior auth pending items
  const priorAuthPending = getValue(currentData, "medication_adherence.prior_auth_pending")
  if (priorAuthPending && typeof priorAuthPending === "string" && priorAuthPending.trim()) {
    tasks.push({
      role: "Billing",
      task: `Follow up on prior auth: ${priorAuthPending}`,
      priority: "high",
    })
  }

  // Insurance barriers
  const insuranceBarriers = getValue(currentData, "sdoh.insurance_barriers")
  if (insuranceBarriers && typeof insuranceBarriers === "string" && insuranceBarriers.trim() && insuranceBarriers !== "none") {
    tasks.push({
      role: "Billing",
      task: `Address insurance barriers: ${insuranceBarriers}`,
      priority: "medium",
    })
  }
}

/**
 * Generate Provider tasks: orders to sign, critical follow-ups
 */
function generateProviderTasks(ctx: TaskGeneratorContext): void {
  const { currentData, tasks } = ctx

  // Labs due check
  const labDate = getDateValue(currentData, "header.lab_date")
  if (isOlderThanMonths(labDate, 3)) {
    tasks.push({
      role: "Provider",
      task: "Order labs before next visit (CMP, CBC, UACR)",
      priority: "high",
    })
  }

  // Critical value follow-ups
  const criticalFields = [
    { key: "electrolytes.potassium", name: "Potassium", fieldId: "potassium" },
    { key: "electrolytes.sodium", name: "Sodium", fieldId: "sodium" },
    { key: "anemia.hemoglobin", name: "Hemoglobin", fieldId: "hemoglobin" },
    { key: "mbd.calcium", name: "Calcium", fieldId: "calcium" },
    { key: "mbd.phosphorus", name: "Phosphorus", fieldId: "phosphorus" },
    { key: "kidney_function.creatinine", name: "Creatinine", fieldId: "creatinine" },
    { key: "electrolytes.bicarbonate", name: "Bicarbonate", fieldId: "bicarbonate" },
    { key: "electrolytes.glucose", name: "Glucose", fieldId: "glucose" },
  ]

  for (const field of criticalFields) {
    const value = getNumericValue(currentData, field.key)
    if (isCriticalValue(field.fieldId, value)) {
      tasks.push({
        role: "Provider",
        task: `URGENT: Address critical ${field.name} value (${value})`,
        priority: "high",
      })
    }
  }

  // eGFR decline alert
  const egfrCurrent = getNumericValue(currentData, "kidney_function.egfr_current")
  const egfrPrevious = getNumericValue(currentData, "kidney_function.egfr_previous")
  const egfrSlope = getNumericValue(currentData, "kidney_function.egfr_slope")

  if (egfrSlope !== null && egfrSlope < -5) {
    tasks.push({
      role: "Provider",
      task: `Review rapid eGFR decline (slope: ${egfrSlope} mL/min/year)`,
      priority: "high",
    })
  } else if (egfrCurrent !== null && egfrPrevious !== null) {
    const decline = egfrPrevious - egfrCurrent
    if (decline > 5) {
      tasks.push({
        role: "Provider",
        task: `Review eGFR decline: ${egfrPrevious} -> ${egfrCurrent}`,
        priority: "high",
      })
    }
  }

  // BP control
  const bpControlStatus = getValue(currentData, "bp_fluid.bp_control_status")
  const systolicBP = getNumericValue(currentData, "bp_fluid.systolic_bp")
  if (bpControlStatus === "uncontrolled" || (systolicBP !== null && systolicBP >= 140)) {
    tasks.push({
      role: "Provider",
      task: "Address uncontrolled blood pressure",
      priority: "high",
    })
  }

  // GDMT optimization opportunities
  const gdmtPillars = [
    { section: "raas", field: "raas_status", onValues: ["on_acei", "on_arb", "on_arni"], name: "RAAS inhibitor", maxDoseField: "at_max_dose" },
    { section: "sglt2i", field: "sglt2i_status", onValues: ["on"], name: "SGLT2i" },
    { section: "mra", field: "mra_status", onValues: ["on"], name: "MRA" },
    { section: "glp1", field: "glp1_status", onValues: ["on"], name: "GLP-1 RA" },
  ]

  let gdmtGaps = 0
  for (const pillar of gdmtPillars) {
    const status = getValue(currentData, `${pillar.section}.${pillar.field}`)
    if (!status || (!pillar.onValues.includes(status as string) && status !== "contraindicated")) {
      gdmtGaps++
    }
  }

  if (gdmtGaps > 0) {
    tasks.push({
      role: "Provider",
      task: `Review GDMT optimization (${4 - gdmtGaps}/4 pillars on therapy)`,
      priority: gdmtGaps >= 2 ? "high" : "medium",
    })
  }

  // RAAS max dose check
  const raasStatus = getValue(currentData, "raas.raas_status")
  const atMaxDose = getValue(currentData, "raas.at_max_dose")
  if (
    (raasStatus === "on_acei" || raasStatus === "on_arb" || raasStatus === "on_arni") &&
    atMaxDose !== true
  ) {
    tasks.push({
      role: "Provider",
      task: "Consider uptitrating RAAS inhibitor to max tolerated dose",
      priority: "medium",
    })
  }

  // Anemia management
  const hemoglobin = getNumericValue(currentData, "anemia.hemoglobin")
  const anemiaAtGoal = getValue(currentData, "anemia.anemia_at_goal")
  if (hemoglobin !== null && hemoglobin < 10 && anemiaAtGoal !== "at_goal") {
    tasks.push({
      role: "Provider",
      task: "Review anemia management plan",
      priority: "high",
    })
  }

  // Proteinuria management
  const uacrCurrent = getNumericValue(currentData, "kidney_function.uacr_current")
  if (uacrCurrent !== null && uacrCurrent > 300) {
    tasks.push({
      role: "Provider",
      task: `Address significant proteinuria (UACR: ${uacrCurrent} mg/g)`,
      priority: "high",
    })
  }

  // Transplant evaluation
  const ckdStage = getValue(currentData, "header.ckd_stage")
  const transplantCandidate = getValue(currentData, "transplant.transplant_candidate")
  const kfre2yr = getNumericValue(currentData, "kidney_function.kfre_2yr")

  if (
    (ckdStage === "G4" || ckdStage === "G5" || (kfre2yr !== null && kfre2yr > 20)) &&
    !transplantCandidate
  ) {
    tasks.push({
      role: "Provider",
      task: "Discuss transplant candidacy with patient",
      priority: "medium",
    })
  }

  // ACP discussion for advanced CKD
  const acpDocumented = getValue(currentData, "acp.acp_documented")
  if ((ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") && !acpDocumented) {
    tasks.push({
      role: "Provider",
      task: "Initiate advance care planning discussion",
      priority: "medium",
    })
  }
}

/**
 * Format tasks into a printable string
 */
function formatTasks(
  tasks: CareTask[],
  patientName?: string,
  visitDate?: string
): string {
  const lines: string[] = []

  // Header
  const header = `CARE TEAM TASKS${patientName ? ` - ${patientName}` : ""}${visitDate ? ` - ${visitDate}` : ""}`
  lines.push(header)
  lines.push("=".repeat(header.length))
  lines.push("")

  // Group by role
  const roleOrder: CareTaskRole[] = ["MA", "Care Coordinator", "Billing", "Provider"]
  const priorityOrder: CareTaskPriority[] = ["high", "medium", "low"]

  for (const role of roleOrder) {
    const roleTasks = tasks
      .filter((t) => t.role === role)
      .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))

    if (roleTasks.length === 0) continue

    lines.push(`${role.toUpperCase()} TASKS`)
    lines.push("-".repeat(`${role.toUpperCase()} TASKS`.length))

    for (const task of roleTasks) {
      const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
      const deadlineStr = task.deadline ? ` (by ${task.deadline})` : ""
      lines.push(`[ ] ${priorityLabel}: ${task.task}${deadlineStr}`)
    }

    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Main export function: generates care team tasks from encounter data
 */
export function generateCareTeamTasks(
  currentData: Record<string, FieldValue>,
  sectionRegistry: SectionRegistry
): { tasks: CareTask[]; formatted: string } {
  const tasks: CareTask[] = []

  const ctx: TaskGeneratorContext = {
    currentData,
    sectionRegistry,
    tasks,
  }

  // Generate tasks for each role
  generateMATasks(ctx)
  generateCareCoordinatorTasks(ctx)
  generateBillingTasks(ctx)
  generateProviderTasks(ctx)

  // Get patient name and visit date for formatting
  const patientName = currentData["header.patient_name"] as string | undefined
  const visitDate = currentData["header.visit_date"]
  const visitDateStr =
    visitDate instanceof Date
      ? visitDate.toLocaleDateString()
      : typeof visitDate === "string"
        ? visitDate
        : undefined

  const formatted = formatTasks(tasks, patientName, visitDateStr)

  return { tasks, formatted }
}
