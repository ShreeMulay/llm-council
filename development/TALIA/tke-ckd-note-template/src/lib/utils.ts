import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with optional unit suffix
 */
export function formatValue(value: number | string | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value === "") return "—"
  return unit ? `${value} ${unit}` : String(value)
}

/**
 * Get trend arrow based on comparison
 */
export function getTrendArrow(current: number, previous: number): "↑" | "↓" | "→" {
  if (current > previous) return "↑"
  if (current < previous) return "↓"
  return "→"
}

/**
 * Calculate GDMT compliance from 4 pillars status
 */
export function calculateGDMTCompliance(data: Record<string, unknown>): { count: number; total: 4; display: string } {
  const pillars = [
    { section: "raas", field: "raas_status", onValues: ["on_acei", "on_arb", "on_arni"] },
    { section: "sglt2i", field: "sglt2i_status", onValues: ["on"] },
    { section: "mra", field: "mra_status", onValues: ["on"] },
    { section: "glp1", field: "glp1_status", onValues: ["on"] },
  ]

  let count = 0
  for (const pillar of pillars) {
    const value = data[`${pillar.section}.${pillar.field}`]
    if (pillar.onValues.includes(value as string)) {
      count++
    }
  }

  return { count, total: 4, display: `${count}/4` }
}

/**
 * Check if a value is within physiological bounds
 */
export function checkPhysiologicalBounds(
  value: number,
  bounds: { min: number; max: number }
): "normal" | "out_of_bounds" {
  if (value < bounds.min || value > bounds.max) return "out_of_bounds"
  return "normal"
}

/**
 * Check if a value is critical/panic
 */
export function checkCriticalValue(
  value: number,
  criticals: { panic_low: number | null; panic_high: number | null }
): "normal" | "critical_low" | "critical_high" {
  if (criticals.panic_low !== null && value < criticals.panic_low) return "critical_low"
  if (criticals.panic_high !== null && value > criticals.panic_high) return "critical_high"
  return "normal"
}

/**
 * Get CKD stage from eGFR
 */
export function getCKDStage(egfr: number): string {
  if (egfr >= 90) return "G1"
  if (egfr >= 60) return "G2"
  if (egfr >= 45) return "G3a"
  if (egfr >= 30) return "G3b"
  if (egfr >= 15) return "G4"
  return "G5"
}

/**
 * Get albuminuria stage from UACR
 */
export function getAlbuminuriaStage(uacr: number): string {
  if (uacr < 30) return "A1"
  if (uacr <= 300) return "A2"
  return "A3"
}

/**
 * Domain group to display name
 */
export const DOMAIN_DISPLAY_NAMES: Record<string, string> = {
  header: "Header",
  kidney_core: "Kidney Core",
  cardiovascular: "Cardiovascular-Renal",
  pharmacotherapy: "4 Pillars (GDMT)",
  metabolic: "Metabolic",
  ckd_complications: "CKD Complications",
  risk_mitigation: "Risk Mitigation",
  planning: "Planning & Transitions",
  screening: "Screening & Prevention",
  care_coordination: "Care Coordination",
}

/**
 * Domain group to CSS class
 */
export const DOMAIN_CSS_CLASSES: Record<string, string> = {
  kidney_core: "section-header-kidney-core",
  cardiovascular: "section-header-cardiovascular",
  pharmacotherapy: "section-header-pharmacotherapy",
  metabolic: "section-header-metabolic",
  ckd_complications: "section-header-ckd-complications",
  risk_mitigation: "section-header-risk-mitigation",
  planning: "section-header-planning",
  screening: "section-header-screening",
  care_coordination: "section-header-care-coordination",
}

/**
 * Format any field value for display (handles Date, number, boolean, etc.)
 */
export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (value instanceof Date) return value.toLocaleDateString()
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return String(value)
  return String(value)
}
