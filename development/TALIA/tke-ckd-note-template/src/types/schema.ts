/**
 * Types derived from the section-registry.json schema
 */

export type FieldType = "number" | "enum" | "text" | "date" | "boolean" | "calculated"

export type VisitMode = "always" | "initial_only" | "conditional"

export type SourceType =
  | "labs_api"
  | "med_list"
  | "vitals"
  | "provider"
  | "patient"
  | "calculated"
  | "previous_note"
  | "fax_manager"
  | "ocr_scan"
  | "transcription"
  | "chart"
  | "staff"
  | "screening"
  | "coordinator"
  | "billing"
  | "scheduling"
  | "exam"
  | "protocol"
  | "manual"
  | "echo"
  | "pathology"
  | "dietitian"
  | "by_referral"
  | "auto_populated"

export type DomainGroup =
  | "header"
  | "kidney_core"
  | "cardiovascular"
  | "pharmacotherapy"
  | "metabolic"
  | "ckd_complications"
  | "risk_mitigation"
  | "planning"
  | "screening"
  | "care_coordination"

export interface Field {
  field_id: string
  display_name: string
  type: FieldType
  enum_ref?: string
  unit: string | null
  source: SourceType[]
  target_range: string | null
  required: boolean
}

export interface Section {
  section_number: number
  section_id: string
  display_name: string
  domain_group: DomainGroup
  domain_color: string | null
  card_codes: string[]
  visit_mode: VisitMode
  condition: string | null
  ai_agent: string
  interpretation_prompt: string
  fields: Field[]
}

export interface CrossCuttingAlert {
  alert_id: string
  display_name: string
  card_code: string
  agent: string
  trigger: string
  action: string
  severity: "critical" | "high" | "medium" | "low"
}

export interface SectionRegistry {
  sections: Section[]
  cross_cutting_alerts: CrossCuttingAlert[]
}

export interface EnumDefinition {
  values: string[]
  section: string
}

export interface PhysiologicalBound {
  min: number
  max: number
  unit: string
}

export interface CriticalValue {
  panic_low: number | null
  panic_high: number | null
}

export interface DomainGroupMeta {
  index: number
  display: string
  color: string | null
  hex: string | null
}

export interface FieldTypes {
  field_types: Record<string, unknown>
  source_types: string[]
  domain_groups: Record<string, DomainGroupMeta>
  visit_modes: Record<string, { description: string }>
  enums: Record<string, EnumDefinition>
  physiological_bounds: Record<string, PhysiologicalBound>
  critical_values: Record<string, CriticalValue>
  action_thresholds: Record<string, { action_low?: number; action_high?: number }>
}

// Value types for encounter data
export type FieldValue = string | number | boolean | Date | null

export interface EncounterData {
  [key: string]: FieldValue // key format: "section_id.field_id"
}

export type ViewMode = "baseline" | "progression"

/** Section review states for AI-first workflow */
export type SectionState =
  | "needs_review"  // Yellow - AI low confidence or data conflict
  | "ai_ready"      // Blue - AI high confidence, no conflicts
  | "accepted"      // Green - Provider verified
  | "edited"        // Purple - Provider modified AI
  | "critical"      // Red, pulsing - Critical value, blocks sign-off
  | "conflict"      // Orange - Sources disagree, must resolve

/** User roles for role-based UI */
export type UserRole = "provider" | "scribe" | "ma"

/** Alert with optional link to section */
export interface Alert {
  id: string
  section_id: string
  field_id: string
  message: string
  severity: "critical" | "high" | "medium" | "low"
}

/** Needs Attention queue item */
export interface AttentionItem {
  id: string
  section_id: string
  field_id?: string
  type: "critical" | "changed" | "gap" | "conflict"
  message: string
  /** Quick actions available for this item */
  actions?: Array<{ label: string; action: string }>
}

/** AI provenance citation - tracks where AI got its data */
export interface ProvenanceCitation {
  source: SourceType
  label: string
  /** e.g. "CMP 2026-01-28", "Pharmacy fill 2026-01-15" */
  detail: string
  /** ISO timestamp of the source data */
  timestamp?: string
  /** Confidence level: high (lab result), medium (previous note), low (inference) */
  confidence: "high" | "medium" | "low"
}

/** AI interpretation for a section */
export interface AIInterpretationData {
  /** The AI-generated interpretation text */
  text: string
  /** Confidence score 0-1 */
  confidence: number
  /** Source citations for the interpretation */
  citations: ProvenanceCitation[]
  /** Action items suggested by AI */
  actionItems: string[]
  /** Timestamp of generation */
  generatedAt: string
  /** Which AI agent generated this */
  agentId: string
}

/** Sparkline data point */
export interface SparklinePoint {
  date: string
  value: number
}

/** Sparkline configuration for a metric */
export interface SparklineConfig {
  fieldKey: string
  label: string
  unit: string
  /** Color for the line */
  color: string
  /** Optional target range for reference band */
  targetLow?: number
  targetHigh?: number
  /** Data points (most recent last) */
  data: SparklinePoint[]
}

/** Encounter progress tracking */
export interface EncounterProgress {
  totalSections: number
  aiReady: number
  accepted: number
  edited: number
  needsReview: number
  critical: number
  conflict: number
  /** Percentage of sections that are accepted or edited (finalized) */
  percentComplete: number
}
