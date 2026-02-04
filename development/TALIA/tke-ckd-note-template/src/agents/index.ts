/**
 * AI Agents Module
 * Barrel export for all CKD note template AI agents
 */

// Types
export * from "./types"

// Orchestrator
export {
  runAllAgents,
  runAgent,
  buildPatientContext,
  generateDashboardSummary,
  getAgentForSection,
  hasAgent,
  getSectionsForAgent,
  aggregateActionItems,
  getSectionsNeedingReview,
} from "./orchestrator"

// Individual Agents
export { kidneyFunctionAgent, kidneyFunctionAgentMeta } from "./kidney-function"
export { bpFluidAgent, bpFluidAgentMeta } from "./bp-fluid"
export { heartFailureAgent, heartFailureAgentMeta } from "./heart-failure"
export { pharmacotherapyAgent, pharmacotherapyAgentMeta } from "./pharmacotherapy"
export { complicationsAgent, complicationsAgentMeta } from "./complications"
export { medicationSafetyAgent, medicationSafetyAgentMeta } from "./medication-safety"
export { planningScreeningAgent, planningScreeningAgentMeta } from "./planning-screening"

// Agent metadata collection for registration
export const allAgentMeta = {
  kidney_function_agent: () => import("./kidney-function").then(m => m.kidneyFunctionAgentMeta),
  bp_fluid_agent: () => import("./bp-fluid").then(m => m.bpFluidAgentMeta),
  heart_failure_agent: () => import("./heart-failure").then(m => m.heartFailureAgentMeta),
  pharmacotherapy_agent: () => import("./pharmacotherapy").then(m => m.pharmacotherapyAgentMeta),
  complications_agent: () => import("./complications").then(m => m.complicationsAgentMeta),
  medication_safety_agent: () => import("./medication-safety").then(m => m.medicationSafetyAgentMeta),
  planning_screening_agent: () => import("./planning-screening").then(m => m.planningScreeningAgentMeta),
}
