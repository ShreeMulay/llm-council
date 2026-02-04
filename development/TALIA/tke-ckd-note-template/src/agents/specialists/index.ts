/**
 * Specialist Agents Barrel Export
 * All 15 specialist agents for detailed clinical domain expertise
 */

// Pharmacotherapy Specialists (from pharmacotherapy.ts)
export { raasSpecialistAgent, raasSpecialistAgentMeta } from "./raas-agent"
export { sglt2iSpecialistAgent, sglt2iSpecialistAgentMeta } from "./sglt2i-agent"
export { mraSpecialistAgent, mraSpecialistAgentMeta } from "./mra-agent"
export { glp1SpecialistAgent, glp1SpecialistAgentMeta } from "./glp1-agent"
export { lipidSpecialistAgent, lipidSpecialistAgentMeta } from "./lipid-agent"

// Complications Specialists (from complications.ts)
export { anemiaSpecialistAgent, anemiaSpecialistAgentMeta } from "./anemia-agent"
export { mbdSpecialistAgent, mbdSpecialistAgentMeta } from "./mbd-agent"
export { electrolytesSpecialistAgent, electrolytesSpecialistAgentMeta } from "./electrolytes-agent"
export { diabetesSpecialistAgent, diabetesSpecialistAgentMeta } from "./diabetes-agent"
export { goutSpecialistAgent, goutSpecialistAgentMeta } from "./gout-agent"
export { obesitySpecialistAgent, obesitySpecialistAgentMeta } from "./obesity-agent"

// New Dedicated Specialists
export { nutritionSpecialistAgent, nutritionSpecialistAgentMeta } from "./nutrition-agent"
export { physicalPerformanceSpecialistAgent, physicalPerformanceSpecialistAgentMeta } from "./physical-performance-agent"
export { transplantSpecialistAgent, transplantSpecialistAgentMeta } from "./transplant-agent"
export { dialysisSpecialistAgent, dialysisSpecialistAgentMeta } from "./dialysis-agent"

// Import all agents for the map
import { raasSpecialistAgent } from "./raas-agent"
import { sglt2iSpecialistAgent } from "./sglt2i-agent"
import { mraSpecialistAgent } from "./mra-agent"
import { glp1SpecialistAgent } from "./glp1-agent"
import { lipidSpecialistAgent } from "./lipid-agent"
import { anemiaSpecialistAgent } from "./anemia-agent"
import { mbdSpecialistAgent } from "./mbd-agent"
import { electrolytesSpecialistAgent } from "./electrolytes-agent"
import { diabetesSpecialistAgent } from "./diabetes-agent"
import { goutSpecialistAgent } from "./gout-agent"
import { obesitySpecialistAgent } from "./obesity-agent"
import { nutritionSpecialistAgent } from "./nutrition-agent"
import { physicalPerformanceSpecialistAgent } from "./physical-performance-agent"
import { transplantSpecialistAgent } from "./transplant-agent"
import { dialysisSpecialistAgent } from "./dialysis-agent"

import type { AgentFunction } from "../types"

/**
 * All specialist agent metadata for registration
 */
export const allSpecialistAgentMeta = [
  // Pharmacotherapy
  { id: "raas_specialist_agent", sections: ["raas"] },
  { id: "sglt2i_specialist_agent", sections: ["sglt2i"] },
  { id: "mra_specialist_agent", sections: ["mra"] },
  { id: "glp1_specialist_agent", sections: ["glp1"] },
  { id: "lipid_specialist_agent", sections: ["lipid_therapy"] },
  
  // Complications
  { id: "anemia_specialist_agent", sections: ["anemia"] },
  { id: "mbd_specialist_agent", sections: ["mbd"] },
  { id: "electrolytes_specialist_agent", sections: ["electrolytes"] },
  { id: "diabetes_specialist_agent", sections: ["diabetes"] },
  { id: "gout_specialist_agent", sections: ["gout"] },
  { id: "obesity_specialist_agent", sections: ["obesity"] },
  
  // Dedicated
  { id: "nutrition_specialist_agent", sections: ["sodium", "nutrition"] },
  { id: "physical_performance_specialist_agent", sections: ["physical_performance", "fall_risk"] },
  { id: "transplant_specialist_agent", sections: ["transplant"] },
  { id: "dialysis_specialist_agent", sections: ["dialysis"] },
]

/**
 * Map of section IDs to specialist agents
 */
export const specialistAgentMap: Record<string, AgentFunction> = {
  // Pharmacotherapy
  raas: raasSpecialistAgent,
  sglt2i: sglt2iSpecialistAgent,
  mra: mraSpecialistAgent,
  glp1: glp1SpecialistAgent,
  lipid_therapy: lipidSpecialistAgent,
  
  // Complications
  anemia: anemiaSpecialistAgent,
  mbd: mbdSpecialistAgent,
  electrolytes: electrolytesSpecialistAgent,
  diabetes: diabetesSpecialistAgent,
  gout: goutSpecialistAgent,
  obesity: obesitySpecialistAgent,
  
  // Dedicated
  sodium: nutritionSpecialistAgent,
  nutrition: nutritionSpecialistAgent,
  physical_performance: physicalPerformanceSpecialistAgent,
  fall_risk: physicalPerformanceSpecialistAgent,
  transplant: transplantSpecialistAgent,
  dialysis: dialysisSpecialistAgent,
}

/**
 * Get specialist agent for a section
 */
export function getSpecialistAgent(sectionId: string): AgentFunction | undefined {
  return specialistAgentMap[sectionId]
}

/**
 * Check if a section has a specialist agent
 */
export function hasSpecialistAgent(sectionId: string): boolean {
  return sectionId in specialistAgentMap
}
