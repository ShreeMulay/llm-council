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

export type ViewMode = "initial" | "delta"

export interface Alert {
  id: string
  section_id: string
  field_id: string
  message: string
  severity: "critical" | "high" | "medium" | "low"
}
