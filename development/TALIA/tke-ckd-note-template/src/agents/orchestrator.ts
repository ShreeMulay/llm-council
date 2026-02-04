/**
 * Agent Orchestrator
 * Coordinates all AI agents for the CKD note template
 * Runs agents in parallel and generates dashboard summary
 * 
 * Supports both generalist agents (for broad coverage) and specialist agents
 * (for detailed clinical logic in specific domains)
 */

import type { EncounterData, Section } from "../types/schema"
import type { AgentFunction, AgentOutput, PatientContext } from "./types"
import { getCkdStageFromEgfr, getAlbuminuriaStage, getField } from "./types"

// Generalist agents
import { kidneyFunctionAgent } from "./kidney-function"
import { bpFluidAgent } from "./bp-fluid"
import { heartFailureAgent } from "./heart-failure"
import { pharmacotherapyAgent } from "./pharmacotherapy"
import { complicationsAgent } from "./complications"
import { medicationSafetyAgent } from "./medication-safety"
import { planningScreeningAgent } from "./planning-screening"

// Specialist agents (15 total)
import {
  raasSpecialistAgent,
  sglt2iSpecialistAgent,
  mraSpecialistAgent,
  glp1SpecialistAgent,
  lipidSpecialistAgent,
  anemiaSpecialistAgent,
  mbdSpecialistAgent,
  electrolytesSpecialistAgent,
  diabetesSpecialistAgent,
  goutSpecialistAgent,
  obesitySpecialistAgent,
  nutritionSpecialistAgent,
  physicalPerformanceSpecialistAgent,
  transplantSpecialistAgent,
  dialysisSpecialistAgent,
} from "./specialists"

/**
 * Configuration for agent selection
 * Set to true to use specialist agents for supported sections
 */
const USE_SPECIALIST_AGENTS = true

/**
 * Map of section IDs to specialist agents (more detailed clinical logic)
 */
const specialistAgentMap: Record<string, AgentFunction> = {
  // Pharmacotherapy Specialists
  raas: raasSpecialistAgent,
  sglt2i: sglt2iSpecialistAgent,
  mra: mraSpecialistAgent,
  glp1: glp1SpecialistAgent,
  lipid_therapy: lipidSpecialistAgent,

  // Complications Specialists
  anemia: anemiaSpecialistAgent,
  mbd: mbdSpecialistAgent,
  electrolytes: electrolytesSpecialistAgent,
  diabetes: diabetesSpecialistAgent,
  gout: goutSpecialistAgent,
  obesity: obesitySpecialistAgent,

  // Dedicated Specialists
  sodium: nutritionSpecialistAgent,
  nutrition: nutritionSpecialistAgent,
  physical_performance: physicalPerformanceSpecialistAgent,
  fall_risk: physicalPerformanceSpecialistAgent,
  transplant: transplantSpecialistAgent,
  dialysis: dialysisSpecialistAgent,
}

/**
 * Map of section IDs to generalist agents (fallback)
 */
const generalistAgentMap: Record<string, AgentFunction> = {
  // Kidney Core (kidney_function_agent)
  kidney_function: kidneyFunctionAgent,
  hematuria: kidneyFunctionAgent,
  kidney_stones: kidneyFunctionAgent,
  gu_history: kidneyFunctionAgent,

  // Cardiovascular (bp_fluid_agent, heart_failure_agent)
  bp_fluid: bpFluidAgent,
  heart_failure: heartFailureAgent,

  // Pharmacotherapy (pharmacotherapy_agent)
  lipid_therapy: pharmacotherapyAgent,
  raas: pharmacotherapyAgent,
  sglt2i: pharmacotherapyAgent,
  mra: pharmacotherapyAgent,
  glp1: pharmacotherapyAgent,

  // Metabolic & CKD Complications (complications_agent)
  diabetes: complicationsAgent,
  gout: complicationsAgent,
  obesity: complicationsAgent,
  anemia: complicationsAgent,
  mbd: complicationsAgent,
  electrolytes: complicationsAgent,

  // Risk Mitigation (medication_safety_agent)
  tobacco: medicationSafetyAgent,
  nsaid: medicationSafetyAgent,
  ppi: medicationSafetyAgent,
  sick_day: medicationSafetyAgent,
  contrast: medicationSafetyAgent,
  sodium: medicationSafetyAgent,
  medication_adherence: medicationSafetyAgent,

  // Planning & Transitions (planning_screening_agent)
  transplant: planningScreeningAgent,
  dialysis: planningScreeningAgent,
  acp: planningScreeningAgent,
  ccm: planningScreeningAgent,

  // Screening & Prevention (planning_screening_agent)
  immunizations: planningScreeningAgent,
  depression: planningScreeningAgent,
  fall_risk: planningScreeningAgent,
  sleep_apnea: planningScreeningAgent,
  sdoh: planningScreeningAgent,
  physical_performance: planningScreeningAgent,
  nutrition: planningScreeningAgent,

  // Care Coordination
  special_clinics: planningScreeningAgent,
  follow_up: planningScreeningAgent,
}

/**
 * Combined agent map (for backward compatibility)
 * Prefers specialist agents when USE_SPECIALIST_AGENTS is true
 */
const agentMap: Record<string, AgentFunction> = USE_SPECIALIST_AGENTS
  ? { ...generalistAgentMap, ...specialistAgentMap }
  : generalistAgentMap

/**
 * Build patient context from encounter data
 */
export function buildPatientContext(data: EncounterData): PatientContext {
  const egfr = getField<number>(data, "kidney_function", "egfr_current")
  const uacr = getField<number>(data, "kidney_function", "uacr_current")
  const kfre2yr = getField<number>(data, "kidney_function", "kfre_2yr")

  // Calculate CKD stage
  const ckdStage = getCkdStageFromEgfr(egfr)
  const albuminuriaStage = getAlbuminuriaStage(uacr)

  // Calculate GDMT compliance
  const raasStatus = getField<string>(data, "raas", "raas_status")
  const sglt2iStatus = getField<string>(data, "sglt2i", "sglt2i_status")
  const mraStatus = getField<string>(data, "mra", "mra_status")
  const glp1Status = getField<string>(data, "glp1", "glp1_status")

  let gdmtCount = 0
  if (raasStatus?.startsWith("on_")) gdmtCount++
  if (sglt2iStatus === "on") gdmtCount++
  if (mraStatus?.startsWith("on_")) gdmtCount++
  if (glp1Status === "on") gdmtCount++

  // Extract comorbidities
  const comorbidities: string[] = []
  const diabeticStatus = getField<string>(data, "diabetes", "diabetic_status")
  if (diabeticStatus && diabeticStatus !== "not_diabetic") {
    comorbidities.push("diabetes")
  }
  const hfType = getField<string>(data, "heart_failure", "hf_type")
  if (hfType && hfType !== "None") {
    comorbidities.push("heart_failure")
  }
  const goutHistory = getField<string>(data, "gout", "gout_history")
  if (goutHistory) {
    comorbidities.push("gout")
  }

  // Age from header
  const age = getField<number>(data, "header", "age")

  return {
    ckdStage,
    albuminuriaStage,
    gdmtCompliance: gdmtCount,
    comorbidities,
    age,
    isDiabetic: diabeticStatus !== undefined && diabeticStatus !== "not_diabetic",
    currentEgfr: egfr,
    currentUacr: uacr,
    kfre2yr,
  }
}

/**
 * Run all agents in parallel for the given sections
 */
export async function runAllAgents(
  currentData: EncounterData,
  previousData: EncounterData,
  sections: Section[]
): Promise<Map<string, AgentOutput>> {
  const patientContext = buildPatientContext(currentData)
  const results = new Map<string, AgentOutput>()

  // Run all agents in parallel
  await Promise.all(
    sections.map(async (section) => {
      const agent = agentMap[section.section_id]
      if (agent) {
        try {
          const output = await agent({
            sectionId: section.section_id,
            currentData,
            previousData,
            patientContext,
            sectionMeta: section,
          })
          results.set(section.section_id, output)
        } catch (error) {
          // Log error but don't fail the entire run
          console.error(`Agent error for section ${section.section_id}:`, error)
          results.set(section.section_id, {
            interpretation: `Error processing section: ${error instanceof Error ? error.message : "Unknown error"}`,
            actionItems: [],
            confidence: 0,
            reviewNeeded: true,
            alerts: [],
          })
        }
      }
    })
  )

  return results
}

/**
 * Run a single agent for a specific section
 */
export async function runAgent(
  sectionId: string,
  currentData: EncounterData,
  previousData: EncounterData,
  sectionMeta?: Section
): Promise<AgentOutput | null> {
  const agent = agentMap[sectionId]
  if (!agent) {
    return null
  }

  const patientContext = buildPatientContext(currentData)

  return agent({
    sectionId,
    currentData,
    previousData,
    patientContext,
    sectionMeta,
  })
}

/**
 * Generate a dashboard summary from agent results
 * Returns a 5-8 line summary for the header section
 */
export function generateDashboardSummary(
  currentData: EncounterData,
  agentResults: Map<string, AgentOutput>
): string {
  const lines: string[] = []

  // Line 1: CKD Stage and eGFR
  const egfr = getField<number>(currentData, "kidney_function", "egfr_current")
  const egfrPrev = getField<number>(currentData, "kidney_function", "egfr_previous")
  const ckdStage = getCkdStageFromEgfr(egfr)

  let line1 = `CKD Stage ${ckdStage}`
  if (egfr !== undefined) {
    line1 += ` (eGFR ${egfr}`
    if (egfrPrev !== undefined) {
      const change = egfr - egfrPrev
      if (change > 0) {
        line1 += ` ↑${change.toFixed(0)}`
      } else if (change < 0) {
        line1 += ` ↓${Math.abs(change).toFixed(0)}`
      } else {
        line1 += " →"
      }
    }
    line1 += ")"
  }
  lines.push(line1)

  // Line 2: Albuminuria
  const uacr = getField<number>(currentData, "kidney_function", "uacr_current")
  const uacrPrev = getField<number>(currentData, "kidney_function", "uacr_previous")
  if (uacr !== undefined) {
    let line2 = `Albuminuria ${getAlbuminuriaStage(uacr)} (UACR ${uacr}`
    if (uacrPrev !== undefined) {
      const change = uacr - uacrPrev
      if (change > 0) {
        line2 += ` ↑${change.toFixed(0)}`
      } else if (change < 0) {
        line2 += ` ↓${Math.abs(change).toFixed(0)}`
      } else {
        line2 += " →"
      }
    }
    line2 += " mg/g)"
    lines.push(line2)
  }

  // Line 3: GDMT Compliance
  const raasStatus = getField<string>(currentData, "raas", "raas_status")
  const sglt2iStatus = getField<string>(currentData, "sglt2i", "sglt2i_status")
  const mraStatus = getField<string>(currentData, "mra", "mra_status")
  const glp1Status = getField<string>(currentData, "glp1", "glp1_status")

  const gdmtPillars: string[] = []
  if (raasStatus?.startsWith("on_")) gdmtPillars.push("RAAS")
  if (sglt2iStatus === "on") gdmtPillars.push("SGLT2i")
  if (mraStatus?.startsWith("on_")) gdmtPillars.push("MRA")
  if (glp1Status === "on") gdmtPillars.push("GLP-1")

  lines.push(`GDMT ${gdmtPillars.length}/4 (${gdmtPillars.join(", ") || "none"})`)

  // Line 4: KFRE if significant
  const kfre2yr = getField<number>(currentData, "kidney_function", "kfre_2yr")
  if (kfre2yr !== undefined && kfre2yr > 5) {
    lines.push(`KFRE 2-year risk: ${kfre2yr.toFixed(1)}%`)
  }

  // Lines 5-7: Top alerts (up to 3)
  const allAlerts: { message: string; severity: string }[] = []
  agentResults.forEach((result) => {
    result.alerts.forEach((alert) => {
      allAlerts.push({ message: alert.message, severity: alert.severity })
    })
  })

  // Sort by severity (critical > high > medium > low)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  allAlerts.sort((a, b) => {
    const aOrder = severityOrder[a.severity as keyof typeof severityOrder] ?? 4
    const bOrder = severityOrder[b.severity as keyof typeof severityOrder] ?? 4
    return aOrder - bOrder
  })

  const topAlerts = allAlerts.slice(0, 3)
  if (topAlerts.length > 0) {
    lines.push("") // Blank line before alerts
    lines.push("⚠️ Key Alerts:")
    topAlerts.forEach((alert) => {
      const icon = alert.severity === "critical" ? "🔴" : alert.severity === "high" ? "🟠" : "🟡"
      lines.push(`  ${icon} ${alert.message}`)
    })
  }

  // Line 8: Key changes summary
  const keyChanges: string[] = []
  
  // Check for significant eGFR change
  if (egfr !== undefined && egfrPrev !== undefined) {
    const change = egfr - egfrPrev
    if (Math.abs(change) >= 5) {
      keyChanges.push(change > 0 ? "eGFR improved" : "eGFR declined")
    }
  }

  // Check for BP control
  const systolic = getField<number>(currentData, "bp_fluid", "systolic_bp")
  if (systolic !== undefined) {
    if (systolic >= 140) {
      keyChanges.push("BP uncontrolled")
    } else if (systolic < 120) {
      keyChanges.push("BP at SPRINT target")
    }
  }

  // Check for new medications
  if (sglt2iStatus === "on" && !getField<string>(currentData, "sglt2i", "sglt2i_drug_dose")) {
    keyChanges.push("SGLT2i initiated")
  }

  if (keyChanges.length > 0) {
    lines.push("")
    lines.push(`Key changes: ${keyChanges.join(", ")}`)
  }

  return lines.join("\n")
}

/**
 * Get the agent responsible for a section
 */
export function getAgentForSection(sectionId: string): AgentFunction | undefined {
  return agentMap[sectionId]
}

/**
 * Check if a section has an assigned agent
 */
export function hasAgent(sectionId: string): boolean {
  return sectionId in agentMap
}

/**
 * Get all section IDs handled by a specific agent
 */
export function getSectionsForAgent(agentId: string): string[] {
  const agentFunctions: Record<string, AgentFunction> = {
    kidney_function_agent: kidneyFunctionAgent,
    bp_fluid_agent: bpFluidAgent,
    heart_failure_agent: heartFailureAgent,
    pharmacotherapy_agent: pharmacotherapyAgent,
    complications_agent: complicationsAgent,
    medication_safety_agent: medicationSafetyAgent,
    planning_screening_agent: planningScreeningAgent,
  }

  const targetAgent = agentFunctions[agentId]
  if (!targetAgent) return []

  return Object.entries(agentMap)
    .filter(([_, agent]) => agent === targetAgent)
    .map(([sectionId]) => sectionId)
}

/**
 * Aggregate action items from all agent results
 */
export function aggregateActionItems(
  agentResults: Map<string, AgentOutput>
): { urgent: string[]; routine: string[]; optional: string[] } {
  const urgent: string[] = []
  const routine: string[] = []
  const optional: string[] = []

  agentResults.forEach((result) => {
    result.actionItems.forEach((item) => {
      const actionText = item.assignee
        ? `[${item.assignee}] ${item.action}`
        : item.action

      switch (item.priority) {
        case "urgent":
          urgent.push(actionText)
          break
        case "routine":
          routine.push(actionText)
          break
        case "optional":
          optional.push(actionText)
          break
      }
    })
  })

  return { urgent, routine, optional }
}

/**
 * Get sections that need provider review
 */
export function getSectionsNeedingReview(
  agentResults: Map<string, AgentOutput>
): string[] {
  const needsReview: string[] = []

  agentResults.forEach((result, sectionId) => {
    if (result.reviewNeeded) {
      needsReview.push(sectionId)
    }
  })

  return needsReview
}
