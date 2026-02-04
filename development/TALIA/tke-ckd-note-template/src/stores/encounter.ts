import { create } from "zustand"
import type { EncounterData, ViewMode, Alert, Section } from "@/types/schema"
import { getCKDStage, getAlbuminuriaStage, calculateGDMTCompliance } from "@/lib/utils"

interface EncounterState {
  // Patient & Visit
  patientId: string | null
  patientName: string
  visitDate: Date
  visitType: "New" | "Follow-up" | "Urgent" | "Telehealth"

  // View Mode
  viewMode: ViewMode
  
  // Data
  currentData: EncounterData
  previousData: EncounterData
  
  // UI State
  activeDomainIndex: number
  expandedSections: Set<string>
  
  // Alerts
  alerts: Alert[]
  
  // Calculated values (derived from currentData)
  ckdStage: string
  albuminuriaStage: string
  gdmtCompliance: { count: number; total: 4; display: string }
  egfrTrend: "↑" | "↓" | "→"
  uacrTrend: "↑" | "↓" | "→"

  // Actions
  setPatient: (id: string, name: string) => void
  setVisitType: (type: EncounterState["visitType"]) => void
  setViewMode: (mode: ViewMode) => void
  updateField: (sectionId: string, fieldId: string, value: EncounterData[string]) => void
  toggleSection: (sectionId: string) => void
  expandSection: (sectionId: string) => void
  collapseSection: (sectionId: string) => void
  expandAllSections: (sections: Section[]) => void
  collapseStableSections: (sections: Section[]) => void
  loadPreviousData: (data: EncounterData) => void
  loadCurrentData: (data: EncounterData) => void
  recalculateDerived: () => void
  checkAlerts: (sections: Section[], criticalValues: Record<string, { panic_low: number | null; panic_high: number | null }>) => void
  clearEncounter: () => void
}

const initialState = {
  patientId: null,
  patientName: "",
  visitDate: new Date(),
  visitType: "Follow-up" as const,
  viewMode: "delta" as ViewMode,
  currentData: {} as EncounterData,
  previousData: {} as EncounterData,
  activeDomainIndex: 0,
  expandedSections: new Set<string>(),
  alerts: [] as Alert[],
  ckdStage: "G3a",
  albuminuriaStage: "A1",
  gdmtCompliance: { count: 0, total: 4 as const, display: "0/4" },
  egfrTrend: "→" as const,
  uacrTrend: "→" as const,
}

export const useEncounterStore = create<EncounterState>((set, get) => ({
  ...initialState,

  setPatient: (id, name) => set({ patientId: id, patientName: name }),

  setVisitType: (type) => {
    set({ visitType: type })
    // Auto-switch view mode based on visit type
    if (type === "New") {
      set({ viewMode: "initial" })
    } else {
      set({ viewMode: "delta" })
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  updateField: (sectionId, fieldId, value) => {
    const key = `${sectionId}.${fieldId}`
    set((state) => ({
      currentData: { ...state.currentData, [key]: value },
    }))
    // Recalculate derived values after field update
    get().recalculateDerived()
  },

  toggleSection: (sectionId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedSections)
      if (newExpanded.has(sectionId)) {
        newExpanded.delete(sectionId)
      } else {
        newExpanded.add(sectionId)
      }
      return { expandedSections: newExpanded }
    }),

  expandSection: (sectionId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedSections)
      newExpanded.add(sectionId)
      return { expandedSections: newExpanded }
    }),

  collapseSection: (sectionId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedSections)
      newExpanded.delete(sectionId)
      return { expandedSections: newExpanded }
    }),

  expandAllSections: (sections) =>
    set({
      expandedSections: new Set(sections.map((s) => s.section_id)),
    }),

  collapseStableSections: (sections) =>
    set((state) => {
      const newExpanded = new Set<string>()
      for (const section of sections) {
        // Check if any field in this section has changed
        let hasChanges = false
        for (const field of section.fields) {
          const key = `${section.section_id}.${field.field_id}`
          const current = state.currentData[key]
          const previous = state.previousData[key]
          if (current !== previous) {
            hasChanges = true
            break
          }
        }
        // Keep changed sections expanded
        if (hasChanges || section.visit_mode === "always") {
          // For "always" sections with data, check if they have required empty fields
          const hasData = section.fields.some((f) => {
            const key = `${section.section_id}.${f.field_id}`
            return state.currentData[key] !== null && state.currentData[key] !== undefined
          })
          if (hasChanges || !hasData) {
            newExpanded.add(section.section_id)
          }
        }
      }
      return { expandedSections: newExpanded }
    }),

  loadPreviousData: (data) => set({ previousData: data }),

  loadCurrentData: (data) => {
    set({ currentData: data })
    get().recalculateDerived()
  },

  recalculateDerived: () => {
    const { currentData, previousData } = get()

    // CKD Stage from eGFR
    const egfr = currentData["kidney_function.egfr_current"]
    const ckdStage = typeof egfr === "number" ? getCKDStage(egfr) : "Unknown"

    // Albuminuria stage from UACR
    const uacr = currentData["kidney_function.uacr_current"]
    const albuminuriaStage = typeof uacr === "number" ? getAlbuminuriaStage(uacr) : "Unknown"

    // GDMT Compliance
    const gdmtCompliance = calculateGDMTCompliance(currentData)

    // eGFR trend
    const egfrPrev = previousData["kidney_function.egfr_current"]
    let egfrTrend: "↑" | "↓" | "→" = "→"
    if (typeof egfr === "number" && typeof egfrPrev === "number") {
      if (egfr > egfrPrev + 2) egfrTrend = "↑"
      else if (egfr < egfrPrev - 2) egfrTrend = "↓"
    }

    // UACR trend
    const uacrPrev = previousData["kidney_function.uacr_current"]
    let uacrTrend: "↑" | "↓" | "→" = "→"
    if (typeof uacr === "number" && typeof uacrPrev === "number") {
      if (uacr > uacrPrev * 1.1) uacrTrend = "↑"
      else if (uacr < uacrPrev * 0.9) uacrTrend = "↓"
    }

    set({ ckdStage, albuminuriaStage, gdmtCompliance, egfrTrend, uacrTrend })
  },

  checkAlerts: (sections, criticalValues) => {
    const { currentData } = get()
    const newAlerts: Alert[] = []

    // Check for critical lab values
    for (const section of sections) {
      for (const field of section.fields) {
        if (field.type === "number") {
          const key = `${section.section_id}.${field.field_id}`
          const value = currentData[key]
          
          if (typeof value === "number") {
            // Check critical values based on field_id patterns
            const criticalKey = field.field_id.replace(/_current$/, "").replace(/_previous$/, "")
            const critical = criticalValues[criticalKey]
            
            if (critical) {
              if (critical.panic_low !== null && value < critical.panic_low) {
                newAlerts.push({
                  id: `${key}-critical-low`,
                  section_id: section.section_id,
                  field_id: field.field_id,
                  message: `${field.display_name} critically low: ${value}`,
                  severity: "critical",
                })
              }
              if (critical.panic_high !== null && value > critical.panic_high) {
                newAlerts.push({
                  id: `${key}-critical-high`,
                  section_id: section.section_id,
                  field_id: field.field_id,
                  message: `${field.display_name} critically high: ${value}`,
                  severity: "critical",
                })
              }
            }
          }
        }
      }
    }

    // Check for Triple Whammy (RAAS + NSAID + Diuretic risk)
    const raasStatus = currentData["raas.raas_status"]
    const nsaidStatus = currentData["nsaid.nsaid_status"]
    const isOnRaas = ["on_acei", "on_arb", "on_arni"].includes(raasStatus as string)
    // Only flag if NSAID status is explicitly set to a risky value (not undefined/null/not_using)
    const isOnNsaid = typeof nsaidStatus === "string" && nsaidStatus !== "not_using" && nsaidStatus !== ""
    // Would need to check med_list for diuretics - simplified for now
    if (isOnRaas && isOnNsaid) {
      newAlerts.push({
        id: "triple-whammy-partial",
        section_id: "medication_adherence",
        field_id: "",
        message: "ALERT: Patient on RAAS inhibitor + NSAID - check for diuretic use (Triple Whammy risk)",
        severity: "high",
      })
    }

    set({ alerts: newAlerts })
  },

  clearEncounter: () => set(initialState),
}))
