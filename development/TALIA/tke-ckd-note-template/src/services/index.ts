/**
 * Services Barrel Export
 * Pre-visit auto-population engine and related services
 */

// Main pre-visit engine
export {
  generatePreVisit,
  quickPreVisitCheck,
  type PreVisitResult,
  type LabData,
  type Medication,
  type CareGap
} from "./pre-visit"

// Lab ingestion
export {
  parseLabData,
  calculateDerivedLabValues,
  getLabDate,
  LAB_FIELD_MAP
} from "./lab-ingestion"

// Medication ingestion
export {
  parseMedList,
  needsSickDayRules,
  calculateGDMTCompliance
} from "./med-ingestion"

// Previous note parsing
export {
  parsePreviousNote,
  extractSection,
  calculateNoteCompleteness,
  type ParsedNoteData
} from "./previous-note-parser"

// Care gaps detection
export {
  detectCareGaps,
  prioritizeCareGaps,
  groupCareGapsBySection,
  getCareGapStats
} from "./care-gaps"
