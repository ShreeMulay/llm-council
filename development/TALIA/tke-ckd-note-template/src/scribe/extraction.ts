/**
 * Field Extraction Service
 * Extracts structured fields from transcription text using patterns and NLP
 */

import type {
  TranscriptionResult,
  ExtractionResult,
  ExtractedField,
  ExtractionPattern,
} from "./types"
import type { SectionRegistry } from "../types/schema"

/**
 * Extraction patterns for common CKD fields
 * Maps field IDs to regex patterns that extract values
 */
export const EXTRACTION_PATTERNS: ExtractionPattern[] = [
  // Kidney Function
  {
    fieldId: "kidney_function.egfr_current",
    patterns: [
      /eGFR\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /GFR\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /kidney function.*?(\d+)\s*(?:percent|%|mL)/i,
      /estimated GFR.*?(\d+)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.85,
  },
  {
    fieldId: "kidney_function.creatinine",
    patterns: [
      /creatinine\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /Cr\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.85,
  },
  {
    fieldId: "kidney_function.uacr_current",
    patterns: [
      /UACR\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /urine albumin.*?creatinine.*?(\d+)/i,
      /albumin.*?creatinine ratio.*?(\d+)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.8,
  },
  {
    fieldId: "kidney_function.upcr_current",
    patterns: [
      /UPCr\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /urine protein.*?creatinine.*?(\d+)/i,
      /protein.*?creatinine ratio.*?(\d+)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.8,
  },

  // Blood Pressure & Fluid
  {
    fieldId: "bp_fluid.systolic_bp",
    patterns: [
      /blood pressure\s*(?:is|of|:)?\s*(\d+)\s*(?:over|\/)/i,
      /BP\s*(?:is|of|:)?\s*(\d+)\s*(?:over|\/)/i,
      /systolic\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.9,
  },
  {
    fieldId: "bp_fluid.diastolic_bp",
    patterns: [
      /blood pressure\s*(?:is|of|:)?\s*\d+\s*(?:over|\/)\s*(\d+)/i,
      /BP\s*(?:is|of|:)?\s*\d+\s*(?:over|\/)\s*(\d+)/i,
      /diastolic\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.9,
  },
  {
    fieldId: "bp_fluid.heart_rate",
    patterns: [
      /heart rate\s*(?:is|of|:)?\s*(\d+)/i,
      /pulse\s*(?:is|of|:)?\s*(\d+)/i,
      /HR\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.9,
  },
  {
    fieldId: "bp_fluid.edema",
    patterns: [
      /edema\s*(?:is|:)?\s*(none|trace|1\+|2\+|3\+|4\+)/i,
      /(no|trace|mild|moderate|severe)\s*edema/i,
      /(\d\+)\s*(?:pitting\s*)?edema/i,
    ],
    parser: (match) => normalizeEdema(match),
    baseConfidence: 0.85,
  },

  // Electrolytes
  {
    fieldId: "electrolytes.potassium",
    patterns: [
      /potassium\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /K\+?\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.9,
  },
  {
    fieldId: "electrolytes.sodium",
    patterns: [
      /sodium\s*(?:is|of|:)?\s*(\d+)/i,
      /Na\+?\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.9,
  },
  {
    fieldId: "electrolytes.bicarbonate",
    patterns: [
      /bicarbonate\s*(?:is|of|:)?\s*(\d+)/i,
      /bicarb\s*(?:is|of|:)?\s*(\d+)/i,
      /CO2\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.85,
  },

  // Anemia
  {
    fieldId: "anemia.hemoglobin",
    patterns: [
      /hemoglobin\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /Hgb\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /Hb\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.9,
  },
  {
    fieldId: "anemia.ferritin",
    patterns: [
      /ferritin\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.85,
  },
  {
    fieldId: "anemia.tsat",
    patterns: [
      /TSAT\s*(?:is|of|:)?\s*(\d+)/i,
      /transferrin saturation\s*(?:is|of|:)?\s*(\d+)/i,
      /iron saturation\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.85,
  },

  // MBD
  {
    fieldId: "mbd.pth",
    patterns: [
      /PTH\s*(?:is|of|:)?\s*(\d+)/i,
      /parathyroid hormone\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.85,
  },
  {
    fieldId: "mbd.calcium",
    patterns: [
      /calcium\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /Ca\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.85,
  },
  {
    fieldId: "mbd.phosphorus",
    patterns: [
      /phosphorus\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /phos\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.85,
  },
  {
    fieldId: "mbd.vitamin_d25",
    patterns: [
      /vitamin D\s*(?:is|of|:)?\s*(\d+)/i,
      /25-hydroxy.*?vitamin D\s*(?:is|of|:)?\s*(\d+)/i,
      /25-OH.*?D\s*(?:is|of|:)?\s*(\d+)/i,
    ],
    parser: (match) => parseInt(match, 10),
    baseConfidence: 0.8,
  },

  // Diabetes
  {
    fieldId: "diabetes.hba1c",
    patterns: [
      /A1C\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /HbA1c\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /hemoglobin A1C\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.9,
  },

  // Gout
  {
    fieldId: "gout.uric_acid",
    patterns: [
      /uric acid\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
      /urate\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.85,
  },

  // Header/Vitals
  {
    fieldId: "header.weight",
    patterns: [
      /weight\s*(?:is|of|:)?\s*(\d+(?:\.\d+)?)\s*(?:pounds|lbs?)?/i,
      /weighs\s*(\d+(?:\.\d+)?)\s*(?:pounds|lbs?)?/i,
    ],
    parser: (match) => parseFloat(match),
    baseConfidence: 0.9,
  },
]

/**
 * Normalize edema values to standard format
 */
function normalizeEdema(value: string): string {
  const lower = value.toLowerCase().trim()
  if (lower === "no" || lower === "none") return "None"
  if (lower === "trace" || lower === "mild") return "Trace"
  if (lower === "moderate") return "2+"
  if (lower === "severe") return "3+"
  if (/^\d\+$/.test(lower)) return lower
  return value
}

/**
 * Parse field value based on field type
 */
function parseFieldValue(
  _fieldId: string,
  rawValue: string,
  pattern: ExtractionPattern
): unknown {
  if (pattern.parser) {
    return pattern.parser(rawValue)
  }
  return rawValue
}

/**
 * Calculate confidence based on pattern match quality
 */
function calculateConfidence(
  pattern: ExtractionPattern,
  matchIndex: number,
  _textLength: number
): number {
  // Start with base confidence
  let confidence = pattern.baseConfidence

  // Reduce confidence for later patterns (less specific)
  confidence -= matchIndex * 0.05

  // Ensure confidence stays in valid range
  return Math.max(0.3, Math.min(1.0, confidence))
}

/**
 * Extract structured fields from transcription text
 *
 * @param transcription - Transcription result
 * @param sectionRegistry - Section registry for field definitions
 * @returns Extraction result with fields and confidence
 *
 * @example
 * ```typescript
 * const result = await extractFromTranscription(transcription, registry)
 * for (const [fieldId, field] of Object.entries(result.fields)) {
 *   console.log(`${fieldId}: ${field.value} (${field.confidence})`)
 * }
 * ```
 */
export async function extractFromTranscription(
  transcription: TranscriptionResult,
  _sectionRegistry?: SectionRegistry
): Promise<ExtractionResult> {
  const fields: Record<string, ExtractedField> = {}
  const text = transcription.text

  if (!text || text.trim().length === 0) {
    return {
      fields: {},
      overallConfidence: 0,
      reviewNeeded: false,
    }
  }

  // Try each extraction pattern
  for (const pattern of EXTRACTION_PATTERNS) {
    // Skip if we already have a higher-confidence match for this field
    if (fields[pattern.fieldId]?.confidence >= pattern.baseConfidence) {
      continue
    }

    // Try each regex pattern
    for (let i = 0; i < pattern.patterns.length; i++) {
      const regex = pattern.patterns[i]
      const match = text.match(regex)

      if (match && match[1]) {
        const confidence = calculateConfidence(pattern, i, text.length)
        const value = parseFieldValue(pattern.fieldId, match[1], pattern)

        fields[pattern.fieldId] = {
          fieldId: pattern.fieldId,
          value,
          confidence,
          source: "transcription",
          sourceText: match[0],
          needsReview: confidence < 0.9, // Always review if not high confidence
        }
        break // Found a match, move to next pattern
      }
    }
  }

  // Calculate overall confidence
  const fieldValues = Object.values(fields)
  const overallConfidence =
    fieldValues.length > 0
      ? fieldValues.reduce((sum, f) => sum + f.confidence, 0) / fieldValues.length
      : 0

  // Determine if review is needed
  const reviewNeeded = fieldValues.some((f) => f.needsReview)

  return {
    fields,
    overallConfidence,
    reviewNeeded,
  }
}

/**
 * Extract fields using LLM for complex patterns
 *
 * Falls back to LLM when regex patterns don't match
 * but clinical context suggests values are present
 *
 * @param transcription - Transcription result
 * @param targetFields - Field IDs to extract
 * @returns Extraction result
 */
export async function extractWithLLM(
  _transcription: TranscriptionResult,
  _targetFields: string[]
): Promise<ExtractionResult> {
  // In production: Call LLM API with structured output
  //
  // const prompt = `
  // Extract the following clinical values from this transcription:
  // ${targetFields.join(", ")}
  //
  // Transcription:
  // ${transcription.text}
  //
  // Return JSON with format:
  // { "field_id": { "value": ..., "confidence": 0-1, "source_text": "..." } }
  // `
  //
  // const response = await callLLM(prompt)
  // return parseExtractionResponse(response)

  // For now, return empty result
  return {
    fields: {},
    overallConfidence: 0,
    reviewNeeded: true,
  }
}

/**
 * Merge extraction results, preferring higher confidence
 *
 * @param results - Array of extraction results
 * @returns Merged result
 */
export function mergeExtractionResults(
  results: ExtractionResult[]
): ExtractionResult {
  const merged: Record<string, ExtractedField> = {}

  for (const result of results) {
    for (const [fieldId, field] of Object.entries(result.fields)) {
      if (!merged[fieldId] || field.confidence > merged[fieldId].confidence) {
        merged[fieldId] = field
      }
    }
  }

  const fieldValues = Object.values(merged)
  const overallConfidence =
    fieldValues.length > 0
      ? fieldValues.reduce((sum, f) => sum + f.confidence, 0) / fieldValues.length
      : 0

  return {
    fields: merged,
    overallConfidence,
    reviewNeeded: fieldValues.some((f) => f.needsReview),
  }
}

/**
 * Get fields that need review
 *
 * @param result - Extraction result
 * @returns Array of fields needing review
 */
export function getFieldsNeedingReview(
  result: ExtractionResult
): ExtractedField[] {
  return Object.values(result.fields).filter((f) => f.needsReview)
}

/**
 * Get fields by section
 *
 * @param result - Extraction result
 * @param sectionId - Section ID to filter by
 * @returns Fields for that section
 */
export function getFieldsBySection(
  result: ExtractionResult,
  sectionId: string
): Record<string, ExtractedField> {
  const sectionFields: Record<string, ExtractedField> = {}

  for (const [fieldId, field] of Object.entries(result.fields)) {
    if (fieldId.startsWith(`${sectionId}.`)) {
      sectionFields[fieldId] = field
    }
  }

  return sectionFields
}

/**
 * Add custom extraction pattern
 *
 * @param pattern - Pattern to add
 */
export function addExtractionPattern(pattern: ExtractionPattern): void {
  EXTRACTION_PATTERNS.push(pattern)
}

/**
 * Get all registered extraction patterns
 *
 * @returns Array of patterns
 */
export function getExtractionPatterns(): ExtractionPattern[] {
  return [...EXTRACTION_PATTERNS]
}
