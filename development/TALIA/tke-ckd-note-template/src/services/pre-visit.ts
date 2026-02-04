/**
 * Pre-Visit Auto-Population Engine
 * Main orchestrator for pre-visit data aggregation and care gap detection
 */

import { parseLabData, calculateDerivedLabValues, type LabData } from "./lab-ingestion"
import { parseMedList, calculateGDMTCompliance, needsSickDayRules, type Medication } from "./med-ingestion"
import { parsePreviousNote } from "./previous-note-parser"
import { detectCareGaps, prioritizeCareGaps, getCareGapStats, type CareGap } from "./care-gaps"

export interface PreVisitResult {
  autoPopulatedFields: Record<string, unknown>
  careGaps: CareGap[]
  preVisitBrief: string
  dataCompleteness: number  // 0-100%
  gdmtCompliance: {
    score: number
    total: number
    pillars: string[]
  }
  metadata: {
    labDataCount: number
    medCount: number
    previousNoteAvailable: boolean
    careGapStats: {
      total: number
      byPriority: Record<string, number>
      byType: Record<string, number>
    }
  }
}

/**
 * Key fields for completeness calculation
 */
const COMPLETENESS_FIELDS = [
  // Kidney Core
  "kidney_function.egfr_current",
  "kidney_function.creatinine",
  "kidney_function.uacr_current",
  "header.ckd_stage",
  "header.ckd_etiology",
  
  // Cardiovascular
  "bp_fluid.systolic_bp",
  "bp_fluid.diastolic_bp",
  
  // Pharmacotherapy
  "raas.raas_status",
  "sglt2i.sglt2i_status",
  "mra.mra_status",
  "glp1.glp1_status",
  
  // Metabolic
  "diabetes.diabetic_status",
  "diabetes.hba1c",
  
  // CKD Complications
  "anemia.hemoglobin",
  "electrolytes.potassium",
  "electrolytes.bicarbonate",
  "mbd.calcium",
  "mbd.phosphorus",
  
  // Risk Mitigation
  "tobacco.smoking_status",
  "nsaid.nsaid_status"
]

/**
 * Calculate data completeness percentage
 */
function calculateCompleteness(fields: Record<string, unknown>): number {
  let found = 0
  
  for (const fieldKey of COMPLETENESS_FIELDS) {
    const value = fields[fieldKey]
    if (value !== undefined && value !== null && value !== "") {
      found++
    }
  }
  
  return Math.round((found / COMPLETENESS_FIELDS.length) * 100)
}

/**
 * Generate pre-visit brief summary
 */
function generateBrief(
  fields: Record<string, unknown>,
  careGaps: CareGap[],
  gdmt: { score: number; total: number; pillars: string[] }
): string {
  const lines: string[] = []
  
  // CKD Stage and eGFR
  const ckdStage = fields["header.ckd_stage"] as string | undefined
  const egfr = fields["kidney_function.egfr_current"] as number | undefined
  const egfrPrev = fields["kidney_function.egfr_previous"] as number | undefined
  const egfrTrend = fields["kidney_function.egfr_trend"] as string | undefined
  
  if (ckdStage || egfr) {
    let line = `CKD ${ckdStage || "stage unknown"}`
    if (egfr !== undefined) {
      line += `, eGFR ${egfr}`
      if (egfrPrev !== undefined) {
        const diff = egfr - egfrPrev
        const arrow = diff > 0 ? "+" : ""
        line += ` (${arrow}${diff} from ${egfrPrev})`
      }
      if (egfrTrend) {
        line += ` - ${egfrTrend}`
      }
    }
    lines.push(line)
  }
  
  // UACR/Proteinuria
  const uacr = fields["kidney_function.uacr_current"] as number | undefined
  const uacrPrev = fields["kidney_function.uacr_previous"] as number | undefined
  if (uacr !== undefined) {
    let line = `UACR ${uacr} mg/g`
    if (uacrPrev !== undefined) {
      const trend = uacr < uacrPrev ? "improving" : uacr > uacrPrev ? "worsening" : "stable"
      line += ` (${trend} from ${uacrPrev})`
    }
    // Albuminuria stage
    if (uacr < 30) {
      line += " - A1 (normal)"
    } else if (uacr < 300) {
      line += " - A2 (moderately increased)"
    } else {
      line += " - A3 (severely increased)"
    }
    lines.push(line)
  }
  
  // GDMT Compliance
  lines.push(`GDMT: ${gdmt.score}/${gdmt.total} pillars (${gdmt.pillars.join(", ") || "none"})`)
  
  // Key labs
  const keyLabs: string[] = []
  const hgb = fields["anemia.hemoglobin"] as number | undefined
  if (hgb !== undefined) keyLabs.push(`Hgb ${hgb}`)
  const k = fields["electrolytes.potassium"] as number | undefined
  if (k !== undefined) keyLabs.push(`K ${k}`)
  const bicarb = fields["electrolytes.bicarbonate"] as number | undefined
  if (bicarb !== undefined) keyLabs.push(`HCO3 ${bicarb}`)
  const a1c = fields["diabetes.hba1c"] as number | undefined
  if (a1c !== undefined) keyLabs.push(`A1c ${a1c}%`)
  
  if (keyLabs.length > 0) {
    lines.push(`Key labs: ${keyLabs.join(", ")}`)
  }
  
  // BP
  const sbp = fields["bp_fluid.systolic_bp"] as number | undefined
  const dbp = fields["bp_fluid.diastolic_bp"] as number | undefined
  if (sbp !== undefined && dbp !== undefined) {
    const bpStatus = sbp < 120 ? "at goal" : sbp < 130 ? "near goal" : "above goal"
    lines.push(`BP ${sbp}/${dbp} - ${bpStatus}`)
  }
  
  // High priority care gaps
  const highGaps = careGaps.filter(g => g.priority === "high")
  if (highGaps.length > 0) {
    lines.push("")
    lines.push(`HIGH PRIORITY GAPS (${highGaps.length}):`)
    for (const gap of highGaps.slice(0, 3)) {
      lines.push(`  - ${gap.description}`)
    }
    if (highGaps.length > 3) {
      lines.push(`  ... and ${highGaps.length - 3} more`)
    }
  }
  
  // Planning alerts
  const kfre = fields["kidney_function.kfre_2yr"] as number | undefined
  if (kfre !== undefined && kfre > 20) {
    lines.push("")
    lines.push(`ALERT: KFRE 2-year ${kfre}% - transplant/dialysis planning indicated`)
  }
  
  return lines.join("\n")
}

/**
 * Main pre-visit generation function
 */
export async function generatePreVisit(
  patientId: string,
  labData?: LabData[],
  medList?: Medication[],
  previousNote?: string
): Promise<PreVisitResult> {
  const autoPopulatedFields: Record<string, unknown> = {}
  
  // 1. Parse lab data
  if (labData && labData.length > 0) {
    const labFields = parseLabData(labData)
    Object.assign(autoPopulatedFields, labFields)
    
    // Calculate derived values
    const derivedFields = calculateDerivedLabValues(autoPopulatedFields)
    Object.assign(autoPopulatedFields, derivedFields)
  }
  
  // 2. Parse medication list
  if (medList && medList.length > 0) {
    const medFields = parseMedList(medList)
    Object.assign(autoPopulatedFields, medFields)
  }
  
  // 3. Extract from previous note
  if (previousNote && previousNote.trim().length > 0) {
    const previousFields = parsePreviousNote(previousNote)
    // Only add previous note fields if not already populated from current data
    for (const [key, value] of Object.entries(previousFields)) {
      if (autoPopulatedFields[key] === undefined) {
        autoPopulatedFields[key] = value
      }
    }
  }
  
  // 4. Calculate GDMT compliance
  const gdmtCompliance = calculateGDMTCompliance(autoPopulatedFields)
  autoPopulatedFields["header.gdmt_compliance"] = `${gdmtCompliance.score}/${gdmtCompliance.total}`
  
  // 5. Check if sick day rules needed
  if (needsSickDayRules(autoPopulatedFields)) {
    autoPopulatedFields["_meta.needs_sick_day_rules"] = true
  }
  
  // 6. Detect care gaps
  const rawCareGaps = detectCareGaps(autoPopulatedFields, patientId)
  const careGaps = prioritizeCareGaps(rawCareGaps)
  
  // 7. Calculate data completeness
  const dataCompleteness = calculateCompleteness(autoPopulatedFields)
  
  // 8. Generate pre-visit brief
  const preVisitBrief = generateBrief(autoPopulatedFields, careGaps, gdmtCompliance)
  
  // 9. Compile metadata
  const metadata = {
    labDataCount: labData?.length || 0,
    medCount: medList?.length || 0,
    previousNoteAvailable: !!previousNote && previousNote.trim().length > 0,
    careGapStats: getCareGapStats(careGaps)
  }
  
  return {
    autoPopulatedFields,
    careGaps,
    preVisitBrief,
    dataCompleteness,
    gdmtCompliance,
    metadata
  }
}

/**
 * Quick pre-visit check (minimal data)
 */
export function quickPreVisitCheck(
  egfr?: number,
  uacr?: number,
  ckdStage?: string
): { needsAttention: boolean; reasons: string[] } {
  const reasons: string[] = []
  
  if (egfr !== undefined && egfr < 30) {
    reasons.push("Advanced CKD (eGFR < 30)")
  }
  
  if (uacr !== undefined && uacr >= 300) {
    reasons.push("Severely increased albuminuria (A3)")
  }
  
  if (ckdStage === "G4" || ckdStage === "G5" || ckdStage === "G5D") {
    reasons.push("Advanced CKD stage - planning needed")
  }
  
  return {
    needsAttention: reasons.length > 0,
    reasons
  }
}

// Re-export types for convenience
export type { LabData } from "./lab-ingestion"
export type { Medication } from "./med-ingestion"
export type { CareGap } from "./care-gaps"
