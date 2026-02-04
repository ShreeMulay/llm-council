/**
 * Epic Note Export Generator
 *
 * Generates a plain text clinic note formatted for copy-paste into Epic EHR.
 * Supports both initial visit (full detail) and follow-up (delta-focused) modes.
 */

import type { FieldValue, SectionRegistry, Section, Field } from "@/types/schema"
import {
  getCKDStage,
  getAlbuminuriaStage,
  calculateGDMTCompliance,
  formatDisplayValue,
  getTrendArrow,
} from "@/lib/utils"

// Required section IDs that always appear in the note
const REQUIRED_SECTION_IDS = [
  "header",
  "kidney_function",
  "bp_fluid",
  "raas",
  "sglt2i",
  "mra",
  "glp1",
]

// Pillar section IDs for GDMT summary
const PILLAR_SECTION_IDS = ["raas", "sglt2i", "mra", "glp1"]

interface PillarStatus {
  name: string
  isOn: boolean
  drug?: string
}

/**
 * Generate an Epic-compatible clinic note from encounter data
 */
export function generateEpicNote(
  currentData: Record<string, FieldValue>,
  previousData: Record<string, FieldValue>,
  sectionRegistry: SectionRegistry,
  viewMode: "initial" | "followup"
): string {
  const lines: string[] = []

  // 1. Dashboard Summary (5-8 lines at top)
  lines.push(generateDashboardSummary(currentData, previousData))
  lines.push("")
  lines.push("=".repeat(60))
  lines.push("")

  // 2. Generate sections
  for (const section of sectionRegistry.sections) {
    const sectionContent = generateSectionContent(
      section,
      currentData,
      previousData,
      viewMode
    )

    if (sectionContent) {
      lines.push(sectionContent)
      lines.push("")
    }
  }

  // 3. Action Items at end
  const actionItems = generateActionItems(currentData, sectionRegistry)
  if (actionItems) {
    lines.push("=".repeat(60))
    lines.push("ACTION ITEMS")
    lines.push("=".repeat(60))
    lines.push(actionItems)
  }

  return lines.join("\n")
}

/**
 * Generate the 5-8 line dashboard summary at the top of the note
 */
function generateDashboardSummary(
  currentData: Record<string, FieldValue>,
  previousData: Record<string, FieldValue>
): string {
  const lines: string[] = []

  // CKD Stage with eGFR trend
  const egfrCurrent = currentData["kidney_function.egfr_current"]
  const egfrPrevious = previousData["kidney_function.egfr_current"]
  const ckdStage = typeof egfrCurrent === "number" ? getCKDStage(egfrCurrent) : "Unknown"

  let egfrLine = `CKD Stage: ${ckdStage}`
  if (typeof egfrCurrent === "number") {
    if (typeof egfrPrevious === "number") {
      const trend = getTrendArrow(egfrCurrent, egfrPrevious)
      egfrLine += ` (eGFR ${egfrPrevious} ${trend} ${egfrCurrent} mL/min)`
    } else {
      egfrLine += ` (eGFR ${egfrCurrent} mL/min)`
    }
  }
  lines.push(egfrLine)

  // Albuminuria Stage with UACR
  const uacrCurrent = currentData["kidney_function.uacr_current"]
  const albuminuriaStage = typeof uacrCurrent === "number" ? getAlbuminuriaStage(uacrCurrent) : "Unknown"
  let uacrLine = `Albuminuria: ${albuminuriaStage}`
  if (typeof uacrCurrent === "number") {
    uacrLine += ` (UACR ${uacrCurrent} mg/g)`
  }
  lines.push(uacrLine)

  // GDMT Compliance
  const gdmt = calculateGDMTCompliance(currentData)
  const pillars = getPillarStatuses(currentData)
  const onPillars = pillars.filter((p) => p.isOn).map((p) => p.name)
  let gdmtLine = `GDMT: ${gdmt.display} pillars`
  if (onPillars.length > 0) {
    gdmtLine += ` (${onPillars.join(", ")})`
  }
  lines.push(gdmtLine)

  // Key Alerts
  const alerts = generateKeyAlerts(currentData, previousData)
  if (alerts.length > 0) {
    lines.push("")
    lines.push("ALERTS:")
    for (const alert of alerts.slice(0, 3)) {
      lines.push(`  * ${alert}`)
    }
  }

  return lines.join("\n")
}

/**
 * Get status of each GDMT pillar
 */
function getPillarStatuses(data: Record<string, FieldValue>): PillarStatus[] {
  return [
    {
      name: "RAAS",
      isOn: ["on_acei", "on_arb", "on_arni"].includes(data["raas.raas_status"] as string),
      drug: data["raas.raas_drug_dose"] as string | undefined,
    },
    {
      name: "SGLT2i",
      isOn: data["sglt2i.sglt2i_status"] === "on",
      drug: data["sglt2i.sglt2i_drug_dose"] as string | undefined,
    },
    {
      name: "MRA",
      isOn: data["mra.mra_status"] === "on",
      drug: data["mra.mra_drug_dose"] as string | undefined,
    },
    {
      name: "GLP-1",
      isOn: data["glp1.glp1_status"] === "on",
      drug: data["glp1.glp1_drug_dose"] as string | undefined,
    },
  ]
}

/**
 * Generate key alerts based on data
 */
function generateKeyAlerts(
  currentData: Record<string, FieldValue>,
  previousData: Record<string, FieldValue>
): string[] {
  const alerts: string[] = []

  // Critical potassium
  const potassium = currentData["electrolytes.potassium"]
  if (typeof potassium === "number") {
    if (potassium > 5.5) alerts.push(`Hyperkalemia: K+ ${potassium} mEq/L`)
    if (potassium < 3.5) alerts.push(`Hypokalemia: K+ ${potassium} mEq/L`)
  }

  // Rapid eGFR decline
  const egfrCurrent = currentData["kidney_function.egfr_current"]
  const egfrPrevious = previousData["kidney_function.egfr_current"]
  if (typeof egfrCurrent === "number" && typeof egfrPrevious === "number") {
    const decline = egfrPrevious - egfrCurrent
    if (decline > 5) {
      alerts.push(`Rapid eGFR decline: ${decline.toFixed(1)} mL/min since last visit`)
    }
  }

  // Triple Whammy risk
  const raasStatus = currentData["raas.raas_status"]
  const nsaidStatus = currentData["nsaid.nsaid_status"]
  const isOnRaas = ["on_acei", "on_arb", "on_arni"].includes(raasStatus as string)
  const isOnNsaid = nsaidStatus !== "not_using" && nsaidStatus !== null && nsaidStatus !== undefined
  if (isOnRaas && isOnNsaid) {
    alerts.push("Triple Whammy Risk: RAAS + NSAID - check diuretic use")
  }

  // Low hemoglobin
  const hemoglobin = currentData["anemia.hemoglobin"]
  if (typeof hemoglobin === "number" && hemoglobin < 10) {
    alerts.push(`Anemia: Hgb ${hemoglobin} g/dL`)
  }

  // Uncontrolled BP
  const systolic = currentData["bp_fluid.systolic_bp"]
  if (typeof systolic === "number" && systolic >= 140) {
    alerts.push(`Uncontrolled BP: ${systolic}/${currentData["bp_fluid.diastolic_bp"] || "?"} mmHg`)
  }

  // Low bicarbonate
  const bicarb = currentData["electrolytes.bicarbonate"]
  if (typeof bicarb === "number" && bicarb < 22) {
    alerts.push(`Metabolic acidosis: HCO3 ${bicarb} mEq/L`)
  }

  return alerts
}

/**
 * Generate content for a single section
 */
function generateSectionContent(
  section: Section,
  currentData: Record<string, FieldValue>,
  previousData: Record<string, FieldValue>,
  viewMode: "initial" | "followup"
): string | null {
  const isRequired = REQUIRED_SECTION_IDS.includes(section.section_id)

  // Check if section has any data
  const hasData = section.fields.some((field) => {
    const key = `${section.section_id}.${field.field_id}`
    const value = currentData[key]
    return value !== null && value !== undefined && value !== ""
  })

  // Check if section has changes
  const hasChanges = section.fields.some((field) => {
    const key = `${section.section_id}.${field.field_id}`
    return currentData[key] !== previousData[key]
  })

  // Skip non-required sections without data
  if (!isRequired && !hasData) {
    return null
  }

  // In followup mode, stable non-required sections get one-liner
  if (viewMode === "followup" && !isRequired && hasData && !hasChanges) {
    return `--- ${section.display_name} ---\nUnchanged from previous visit.`
  }

  const lines: string[] = []
  lines.push(`--- ${section.display_name} ---`)

  // Special handling for pillar sections
  if (PILLAR_SECTION_IDS.includes(section.section_id)) {
    const pillarContent = generatePillarSection(section, currentData, previousData, viewMode)
    lines.push(pillarContent)
    return lines.join("\n")
  }

  // Generate field values
  for (const field of section.fields) {
    const fieldLine = generateFieldLine(
      section.section_id,
      field,
      currentData,
      previousData,
      viewMode
    )
    if (fieldLine) {
      lines.push(fieldLine)
    }
  }

  // Add interpretation placeholder
  lines.push("")
  lines.push(`[AI Interpretation: ${section.section_id}]`)

  return lines.join("\n")
}

/**
 * Generate content for a GDMT pillar section
 */
function generatePillarSection(
  section: Section,
  currentData: Record<string, FieldValue>,
  previousData: Record<string, FieldValue>,
  viewMode: "initial" | "followup"
): string {
  const lines: string[] = []

  const statusKey = `${section.section_id}.${section.section_id === "raas" ? "raas_status" : section.section_id + "_status"}`
  const drugKey = `${section.section_id}.${section.section_id === "raas" ? "raas_drug_dose" : section.section_id + "_drug_dose"}`
  const reasonKey = `${section.section_id}.not_on_reason`

  const status = currentData[statusKey]
  const drug = currentData[drugKey]
  const reason = currentData[reasonKey]
  const prevStatus = previousData[statusKey]

  // Determine if on therapy
  let isOn = false
  if (section.section_id === "raas") {
    isOn = ["on_acei", "on_arb", "on_arni"].includes(status as string)
  } else {
    isOn = status === "on"
  }

  // Status line
  if (isOn) {
    let statusLine = `Status: ON`
    if (drug) {
      statusLine += ` - ${drug}`
    }
    lines.push(statusLine)

    // Check for max dose (RAAS specific)
    if (section.section_id === "raas") {
      const atMax = currentData["raas.at_max_dose"]
      if (atMax === true) {
        lines.push("At max tolerated dose: Yes")
      } else if (atMax === false) {
        lines.push("At max tolerated dose: No - consider uptitration")
      }
    }
  } else {
    let statusLine = `Status: NOT ON`
    if (reason) {
      statusLine += ` - ${formatDisplayValue(reason)}`
    }
    lines.push(statusLine)
  }

  // Show change in followup mode
  if (viewMode === "followup" && status !== prevStatus) {
    lines.push(`  (Changed from: ${formatDisplayValue(prevStatus)})`)
  }

  // Section-specific fields
  if (section.section_id === "sglt2i") {
    const sickDayReviewed = currentData["sglt2i.sick_day_rules_reviewed"]
    if (sickDayReviewed !== null && sickDayReviewed !== undefined) {
      lines.push(`Sick day rules reviewed: ${sickDayReviewed ? "Yes" : "No"}`)
    }
  }

  if (section.section_id === "mra") {
    const kMonitoring = currentData["mra.k_monitoring_schedule"]
    const kBinder = currentData["mra.potassium_binder"]
    if (kMonitoring) lines.push(`K+ monitoring: ${kMonitoring}`)
    if (kBinder) lines.push(`Potassium binder: ${kBinder}`)
  }

  if (section.section_id === "glp1") {
    const weightResponse = currentData["glp1.weight_response"]
    const kidneyBenefit = currentData["glp1.kidney_benefit_documented"]
    if (weightResponse) lines.push(`Weight response: ${weightResponse}`)
    if (kidneyBenefit !== null && kidneyBenefit !== undefined) {
      lines.push(`Kidney benefit documented: ${kidneyBenefit ? "Yes" : "No"}`)
    }
  }

  lines.push("")
  lines.push(`[AI Interpretation: ${section.section_id}]`)

  return lines.join("\n")
}

/**
 * Generate a single field line
 */
function generateFieldLine(
  sectionId: string,
  field: Field,
  currentData: Record<string, FieldValue>,
  previousData: Record<string, FieldValue>,
  viewMode: "initial" | "followup"
): string | null {
  const key = `${sectionId}.${field.field_id}`
  const current = currentData[key]
  const previous = previousData[key]

  // Skip empty values
  if (current === null || current === undefined || current === "") {
    return null
  }

  // Format value with unit
  let valueStr = formatDisplayValue(current)
  if (field.unit && typeof current === "number") {
    valueStr = `${current} ${field.unit}`
  }

  // In followup mode, show changes
  if (viewMode === "followup" && previous !== undefined && previous !== null && current !== previous) {
    const prevStr = formatDisplayValue(previous)
    if (field.unit && typeof previous === "number") {
      valueStr = `${previous} ${field.unit} -> ${current} ${field.unit}`
    } else {
      valueStr = `${prevStr} -> ${valueStr}`
    }
  }

  // Add target range if available and value is out of range
  let targetNote = ""
  if (field.target_range && typeof current === "number") {
    targetNote = ` (target: ${field.target_range})`
  }

  return `${field.display_name}: ${valueStr}${targetNote}`
}

/**
 * Generate action items section
 */
function generateActionItems(
  currentData: Record<string, FieldValue>,
  _sectionRegistry: SectionRegistry
): string {
  const items: string[] = []

  // Check GDMT gaps
  const pillars = getPillarStatuses(currentData)
  for (const pillar of pillars) {
    if (!pillar.isOn) {
      items.push(`* Consider ${pillar.name} initiation - review eligibility and barriers`)
    }
  }

  // Check BP control
  const bpStatus = currentData["bp_fluid.bp_control_status"]
  if (bpStatus === "uncontrolled" || bpStatus === "poorly_controlled") {
    items.push("* Optimize blood pressure management")
  }

  // Check anemia
  const hemoglobin = currentData["anemia.hemoglobin"]
  if (typeof hemoglobin === "number" && hemoglobin < 10) {
    items.push("* Address anemia - check iron studies, consider ESA")
  }

  // Check electrolytes
  const bicarb = currentData["electrolytes.bicarbonate"]
  if (typeof bicarb === "number" && bicarb < 22) {
    items.push("* Treat metabolic acidosis - consider bicarbonate supplementation")
  }

  // Check immunizations
  const fluVaccine = currentData["immunizations.flu_vaccine"]
  if (fluVaccine === "due" || fluVaccine === "overdue") {
    items.push("* Flu vaccine due")
  }

  // Check sick day rules
  const sickDayReviewed = currentData["sick_day.sick_day_rules_reviewed"]
  if (sickDayReviewed === false) {
    items.push("* Review sick day rules with patient")
  }

  // Check NSAID use
  const nsaidStatus = currentData["nsaid.nsaid_status"]
  if (nsaidStatus && nsaidStatus !== "not_using") {
    items.push("* Counsel on NSAID avoidance")
  }

  // Follow-up
  const followUpInterval = currentData["follow_up.follow_up_interval"]
  if (followUpInterval) {
    items.push(`* Follow-up: ${followUpInterval}`)
  }

  // Labs
  items.push("* Labs: CMP, CBC before next visit")

  return items.join("\n")
}
