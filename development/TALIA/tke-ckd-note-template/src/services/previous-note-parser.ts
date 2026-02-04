/**
 * Previous Note Parser Service
 * Extracts structured data from previous clinic notes
 */

export interface ParsedNoteData {
  fields: Record<string, unknown>
  extractedText: Record<string, string>
  confidence: Record<string, number>
}

/**
 * Regex patterns for extracting data from notes
 */
const EXTRACTION_PATTERNS = {
  // Kidney Function
  egfr: [
    /eGFR[:\s]+(\d+(?:\.\d+)?)/i,
    /GFR[:\s]+(\d+(?:\.\d+)?)/i,
    /estimated\s+GFR[:\s]+(\d+(?:\.\d+)?)/i
  ],
  creatinine: [
    /Cr(?:eatinine)?[:\s]+(\d+(?:\.\d+)?)/i,
    /serum\s+creatinine[:\s]+(\d+(?:\.\d+)?)/i
  ],
  uacr: [
    /UACR[:\s]+(\d+(?:\.\d+)?)/i,
    /urine\s+albumin[\/\s]+creatinine[:\s]+(\d+(?:\.\d+)?)/i
  ],
  
  // CKD Stage
  ckd_stage: [
    /CKD\s+(?:Stage\s+)?([G]?[1-5][ab]?[D]?)/i,
    /Stage\s+([1-5][ab]?)\s+CKD/i,
    /CKD\s+([1-5][ab]?)/i
  ],
  
  // Etiology
  ckd_etiology: [
    /(?:CKD\s+)?(?:etiology|due\s+to|secondary\s+to)[:\s]+([^\.]+)/i,
    /(?:diabetic|hypertensive)\s+(?:nephropathy|kidney\s+disease)/i
  ],
  
  // Blood Pressure
  bp: [
    /BP[:\s]+(\d{2,3})[\/\s]+(\d{2,3})/i,
    /blood\s+pressure[:\s]+(\d{2,3})[\/\s]+(\d{2,3})/i
  ],
  
  // Weight
  weight: [
    /(?:weight|wt)[:\s]+(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg)?/i
  ],
  
  // HbA1c
  hba1c: [
    /(?:HbA1c|A1c|hemoglobin\s+A1c)[:\s]+(\d+(?:\.\d+)?)\s*%?/i
  ],
  
  // Follow-up interval
  follow_up: [
    /(?:follow[- ]?up|f\/u|return)[:\s]+(?:in\s+)?(\d+)\s*(weeks?|months?|days?)/i,
    /(?:RTC|return\s+to\s+clinic)[:\s]+(\d+)\s*(weeks?|months?|days?)/i
  ],
  
  // Transplant status
  transplant: [
    /transplant[:\s]+(candidate|not\s+a\s+candidate|evaluating|listed|workup)/i
  ],
  
  // Dialysis modality
  dialysis_modality: [
    /(?:dialysis\s+)?modality[:\s]+(HD|PD|HHD|hemodialysis|peritoneal)/i,
    /prefers?\s+(HD|PD|HHD|hemodialysis|peritoneal)/i
  ],
  
  // KFRE
  kfre: [
    /KFRE\s+(?:2[- ]?year)?[:\s]+(\d+(?:\.\d+)?)\s*%?/i,
    /(?:2[- ]?year\s+)?kidney\s+failure\s+risk[:\s]+(\d+(?:\.\d+)?)\s*%?/i
  ]
}

/**
 * Section header patterns for context-aware extraction
 * Used by extractSection function
 */
export const SECTION_HEADERS = [
  /(?:^|\n)(?:#+\s*)?(?:KIDNEY\s+FUNCTION|RENAL\s+FUNCTION)/i,
  /(?:^|\n)(?:#+\s*)?(?:BLOOD\s+PRESSURE|BP\s+&\s+FLUID)/i,
  /(?:^|\n)(?:#+\s*)?(?:MEDICATIONS?|MED\s+LIST)/i,
  /(?:^|\n)(?:#+\s*)?(?:ASSESSMENT|A\/P|PLAN)/i,
  /(?:^|\n)(?:#+\s*)?(?:DIABETES|DM\s+MANAGEMENT)/i,
  /(?:^|\n)(?:#+\s*)?(?:ANEMIA|BLOOD\s+HEALTH)/i,
  /(?:^|\n)(?:#+\s*)?(?:TRANSPLANT|DIALYSIS)/i
]

/**
 * Extract a value using multiple patterns
 */
function extractWithPatterns(
  text: string,
  patterns: RegExp[]
): { value: string | null; confidence: number } {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return {
        value: match[1],
        confidence: 0.8 // Base confidence for regex match
      }
    }
  }
  return { value: null, confidence: 0 }
}

/**
 * Parse previous note and extract structured data
 */
export function parsePreviousNote(noteText: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  
  if (!noteText || noteText.trim().length === 0) {
    return fields
  }
  
  // Extract eGFR (as previous)
  const egfrResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.egfr)
  if (egfrResult.value) {
    fields["kidney_function.egfr_previous"] = parseFloat(egfrResult.value)
  }
  
  // Extract creatinine
  const crResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.creatinine)
  if (crResult.value) {
    // Store as previous if we're parsing a previous note
    fields["kidney_function.creatinine_previous"] = parseFloat(crResult.value)
  }
  
  // Extract UACR (as previous)
  const uacrResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.uacr)
  if (uacrResult.value) {
    fields["kidney_function.uacr_previous"] = parseFloat(uacrResult.value)
  }
  
  // Extract CKD stage
  const stageResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.ckd_stage)
  if (stageResult.value) {
    // Normalize to G format
    let stage = stageResult.value.toUpperCase()
    if (!stage.startsWith("G")) {
      stage = `G${stage}`
    }
    fields["header.ckd_stage"] = stage
  }
  
  // Extract CKD etiology
  const etiologyResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.ckd_etiology)
  if (etiologyResult.value) {
    fields["header.ckd_etiology"] = etiologyResult.value.trim()
  }
  
  // Extract BP
  const bpMatch = noteText.match(EXTRACTION_PATTERNS.bp[0])
  if (bpMatch) {
    fields["bp_fluid.systolic_bp_previous"] = parseInt(bpMatch[1])
    fields["bp_fluid.diastolic_bp_previous"] = parseInt(bpMatch[2])
  }
  
  // Extract weight
  const weightResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.weight)
  if (weightResult.value) {
    fields["header.weight_previous"] = parseFloat(weightResult.value)
  }
  
  // Extract HbA1c
  const a1cResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.hba1c)
  if (a1cResult.value) {
    fields["diabetes.hba1c_previous"] = parseFloat(a1cResult.value)
  }
  
  // Extract follow-up interval
  const fuMatch = noteText.match(EXTRACTION_PATTERNS.follow_up[0])
  if (fuMatch) {
    fields["header.follow_up_interval"] = `${fuMatch[1]} ${fuMatch[2]}`
  }
  
  // Extract transplant status
  const txResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.transplant)
  if (txResult.value) {
    const status = txResult.value.toLowerCase()
    if (status.includes("candidate") && !status.includes("not")) {
      fields["transplant.transplant_candidate"] = "yes"
    } else if (status.includes("not")) {
      fields["transplant.transplant_candidate"] = "no"
    } else if (status.includes("evaluat") || status.includes("workup")) {
      fields["transplant.transplant_candidate"] = "evaluating"
    } else if (status.includes("listed")) {
      fields["transplant.current_status"] = "listed"
    }
  }
  
  // Extract dialysis modality preference
  const modalityResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.dialysis_modality)
  if (modalityResult.value) {
    const modality = modalityResult.value.toUpperCase()
    if (modality.includes("PERITONEAL") || modality === "PD") {
      fields["dialysis.modality_preference"] = "PD"
    } else if (modality.includes("HOME") || modality === "HHD") {
      fields["dialysis.modality_preference"] = "HHD"
    } else {
      fields["dialysis.modality_preference"] = "HD"
    }
  }
  
  // Extract KFRE
  const kfreResult = extractWithPatterns(noteText, EXTRACTION_PATTERNS.kfre)
  if (kfreResult.value) {
    fields["kidney_function.kfre_2yr"] = parseFloat(kfreResult.value)
  }
  
  return fields
}

/**
 * Extract specific section from note text
 */
export function extractSection(noteText: string, sectionName: string): string | null {
  const sectionPatterns: Record<string, RegExp> = {
    kidney_function: /(?:KIDNEY\s+FUNCTION|RENAL\s+FUNCTION)[:\s]*([\s\S]*?)(?=\n(?:#+\s*)?[A-Z]{2,}|\n\n\n|$)/i,
    assessment: /(?:ASSESSMENT|A\/P)[:\s]*([\s\S]*?)(?=\n(?:#+\s*)?[A-Z]{2,}|\n\n\n|$)/i,
    plan: /(?:PLAN)[:\s]*([\s\S]*?)(?=\n(?:#+\s*)?[A-Z]{2,}|\n\n\n|$)/i,
    medications: /(?:MEDICATIONS?|MED\s+LIST)[:\s]*([\s\S]*?)(?=\n(?:#+\s*)?[A-Z]{2,}|\n\n\n|$)/i
  }
  
  const pattern = sectionPatterns[sectionName]
  if (!pattern) return null
  
  const match = noteText.match(pattern)
  return match ? match[1].trim() : null
}

/**
 * Calculate data completeness from previous note
 */
export function calculateNoteCompleteness(fields: Record<string, unknown>): number {
  const keyFields = [
    "kidney_function.egfr_previous",
    "header.ckd_stage",
    "header.ckd_etiology",
    "bp_fluid.systolic_bp_previous",
    "header.follow_up_interval"
  ]
  
  let found = 0
  for (const field of keyFields) {
    if (fields[field] !== undefined && fields[field] !== null) {
      found++
    }
  }
  
  return Math.round((found / keyFields.length) * 100)
}
