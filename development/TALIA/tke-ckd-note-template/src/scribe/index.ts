/**
 * Virtual Scribe + OCR Module
 * Barrel export for scribe services
 */

// Types
export type {
  Speaker,
  TranscriptionSegment,
  TranscriptionResult,
  TranscriptionOptions,
  ExtractionSource,
  ExtractedField,
  ExtractionResult,
  Rectangle,
  ImageRegion,
  OCRCard,
  OCRResult,
  OCROptions,
  CardFieldMapping,
  VerificationState,
  VerificationAction,
  ExtractionPattern,
} from "./types"

export {
  MEDICAL_TRANSCRIPTION_PROMPT,
  EXTRACTION_CONFIDENCE,
} from "./types"

// Transcription
export {
  transcribeAudio,
  transcribeWithDiarization,
  mergeConsecutiveSpeakerSegments,
  extractProviderStatements,
  extractPatientStatements,
  getSegmentAtTime,
  getWordCount,
  getSpeakingTimePerSpeaker,
  formatAsDialogue,
} from "./transcription"

// Extraction
export {
  extractFromTranscription,
  extractWithLLM,
  mergeExtractionResults,
  getFieldsNeedingReview,
  getFieldsBySection,
  addExtractionPattern,
  getExtractionPatterns,
  EXTRACTION_PATTERNS,
} from "./extraction"

// OCR
export {
  processCardImage,
  processMultipleCards,
  detectOMRCheckboxes,
  getRegionPixels,
  preprocessImage,
  detectCardCode,
  validateExtractedFields,
  mergeOCRWithEncounterData,
  getSupportedCardCodes,
  isCardCodeSupported,
  registerCardFieldMapping,
  getFieldMapForCard,
} from "./ocr"

// Verification
export {
  createVerificationSession,
  approveField,
  rejectField,
  editField,
  nextField,
  previousField,
  jumpToField,
  verificationReducer,
  getFinalFields,
  getCurrentField,
  getCurrentFieldId,
  getVerificationProgress,
  isVerificationComplete,
  getUnreviewedFields,
  getFieldsSortedByConfidence,
  autoApproveHighConfidence,
  getVerificationSummary,
  resetVerification,
  approveAllRemaining,
  rejectAllRemaining,
} from "./verification"
