/**
 * Virtual Scribe + OCR Types
 * Types for audio transcription, field extraction, and OCR processing
 */

// Note: SourceType from schema.ts can be used for source field validation
// import type { SourceType } from "../types/schema"

/**
 * Speaker identification for transcription segments
 */
export type Speaker = "provider" | "patient" | "unknown"

/**
 * Transcription segment with timing and speaker info
 */
export interface TranscriptionSegment {
  /** Transcribed text for this segment */
  text: string
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Identified speaker */
  speaker?: Speaker
}

/**
 * Result from audio transcription (Whisper or similar)
 */
export interface TranscriptionResult {
  /** Full transcribed text */
  text: string
  /** Segments with timing info */
  segments: TranscriptionSegment[]
  /** Overall confidence score (0-1) */
  confidence: number
  /** Audio duration in seconds */
  duration: number
}

/**
 * Options for transcription processing
 */
export interface TranscriptionOptions {
  /** Language code (default: "en") */
  language?: string
  /** Enable speaker diarization */
  diarization?: boolean
  /** Prompt to guide transcription (medical terminology) */
  prompt?: string
  /** Temperature for sampling (0 = deterministic) */
  temperature?: number
}

/**
 * Source of extracted field data
 */
export type ExtractionSource = "transcription" | "ocr"

/**
 * A field extracted from transcription or OCR
 */
export interface ExtractedField {
  /** Field ID in format "section_id.field_id" */
  fieldId: string
  /** Extracted value (type depends on field definition) */
  value: unknown
  /** Confidence score (0-1) */
  confidence: number
  /** Source of extraction */
  source: ExtractionSource
  /** Original text that was matched */
  sourceText: string
  /** Whether human review is needed */
  needsReview: boolean
}

/**
 * Result from field extraction
 */
export interface ExtractionResult {
  /** Extracted fields keyed by field ID */
  fields: Record<string, ExtractedField>
  /** Overall confidence score */
  overallConfidence: number
  /** Whether any fields need review */
  reviewNeeded: boolean
}

/**
 * Rectangle region in an image
 */
export interface Rectangle {
  /** Unique identifier for this region */
  id: string
  /** X coordinate (pixels from left) */
  x: number
  /** Y coordinate (pixels from top) */
  y: number
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
}

/**
 * Image region with extracted data
 */
export interface ImageRegion extends Rectangle {
  /** Type of content in this region */
  type: "checkbox" | "text" | "number" | "signature"
  /** Extracted value */
  value: unknown
  /** Confidence score */
  confidence: number
}

/**
 * Result from OCR processing of a single card
 */
export interface OCRCard {
  /** Card code (e.g., "TKE-RAAS") */
  cardCode: string
  /** Extracted fields */
  fields: Record<string, ExtractedField>
  /** Image regions that were processed */
  imageRegions: ImageRegion[]
}

/**
 * Result from OCR processing
 */
export interface OCRResult {
  /** Processed cards */
  cards: OCRCard[]
  /** Overall confidence score */
  overallConfidence: number
}

/**
 * Options for OCR processing
 */
export interface OCROptions {
  /** Expected card code (helps with field mapping) */
  cardCode?: string
  /** Enable OMR checkbox detection */
  detectCheckboxes?: boolean
  /** Enable handwriting recognition */
  handwritingMode?: boolean
  /** Image preprocessing options */
  preprocessing?: {
    /** Auto-rotate to correct orientation */
    autoRotate?: boolean
    /** Enhance contrast */
    enhanceContrast?: boolean
    /** Remove noise */
    denoise?: boolean
  }
}

/**
 * Mapping of card regions to fields
 */
export interface CardFieldMapping {
  /** Card code */
  cardCode: string
  /** Section ID this card maps to */
  sectionId: string
  /** Field mappings: region ID -> field ID */
  fieldMappings: Record<string, string>
  /** Checkbox regions */
  checkboxRegions: Rectangle[]
  /** Text input regions */
  textRegions: Rectangle[]
  /** Number input regions */
  numberRegions: Rectangle[]
}

/**
 * Verification session state
 */
export interface VerificationState {
  /** All extracted fields */
  fields: Record<string, ExtractedField>
  /** Index of current field being reviewed */
  currentFieldIndex: number
  /** Fields that have been approved */
  approvedFields: Set<string>
  /** Fields that have been rejected */
  rejectedFields: Set<string>
  /** Fields that have been edited (fieldId -> new value) */
  editedFields: Map<string, unknown>
}

/**
 * Verification action types
 */
export type VerificationAction =
  | { type: "approve"; fieldId: string }
  | { type: "reject"; fieldId: string }
  | { type: "edit"; fieldId: string; value: unknown }
  | { type: "next" }
  | { type: "previous" }
  | { type: "jumpTo"; index: number }

/**
 * Extraction pattern for a field
 */
export interface ExtractionPattern {
  /** Field ID this pattern extracts */
  fieldId: string
  /** Regex patterns to match */
  patterns: RegExp[]
  /** Parser function for matched value */
  parser?: (match: string) => unknown
  /** Base confidence for this pattern */
  baseConfidence: number
}

/**
 * Medical terminology hints for transcription
 */
export const MEDICAL_TRANSCRIPTION_PROMPT = `
Medical nephrology consultation. Common terms:
- eGFR, GFR, creatinine, BUN, UACR, UPCr
- ACEi, ARB, ARNi, SGLT2i, MRA, GLP-1
- Finerenone, Jardiance, Farxiga, Kerendia
- Losartan, Lisinopril, Entresto
- Hemoglobin, ferritin, TSAT, PTH
- Potassium, sodium, bicarbonate, phosphorus
- CKD stages G1-G5, albuminuria A1-A3
- KDIGO, KFRE, dialysis, transplant
`.trim()

/**
 * Confidence thresholds for extraction
 */
export const EXTRACTION_CONFIDENCE = {
  /** Auto-accept without review */
  AUTO_ACCEPT: 0.95,
  /** Suggest review but allow accept */
  REVIEW_SUGGESTED: 0.8,
  /** Require review before accept */
  REVIEW_REQUIRED: 0.6,
  /** Flag as low confidence */
  LOW_CONFIDENCE: 0.4,
} as const
