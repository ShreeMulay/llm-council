import { create } from "zustand"
import type {
  EncounterData,
  ViewMode,
  Alert,
  Section,
  SectionState,
  AttentionItem,
  EncounterProgress,
  UserRole,
  AIInterpretationData,
  SparklinePoint,
} from "@/types/schema"
import { getCKDStage, getAlbuminuriaStage, calculateGDMTCompliance } from "@/lib/utils"
import { type ThemeId, applyTheme, getSavedTheme } from "@/lib/themes"

interface EncounterState {
  // Patient & Visit
  patientId: string | null
  patientName: string
  patientAge: number | null
  patientSex: "M" | "F" | null
  visitDate: Date
  visitType: "New" | "Follow-up" | "Urgent" | "Telehealth"

  // View Mode (Baseline = initial, Progression = follow-up/delta)
  viewMode: ViewMode

  // User Role
  userRole: UserRole

  // Data
  currentData: EncounterData
  previousData: EncounterData

  // Section States (AI-first workflow)
  sectionStates: Record<string, SectionState>

  // AI Interpretations per section
  aiInterpretations: Record<string, AIInterpretationData>

  // Sparkline trend data per metric key
  sparklineData: Record<string, SparklinePoint[]>

  // UI State
  activeDomainIndex: number
  expandedSections: Set<string>
  dashboardOpen: boolean
  commandPaletteOpen: boolean
  changedOnlyFilter: boolean

  // Alerts & Attention Items
  alerts: Alert[]
  attentionItems: AttentionItem[]

  // Progress
  progress: EncounterProgress

  // Calculated values (derived from currentData)
  ckdStage: string
  albuminuriaStage: string
  gdmtCompliance: { count: number; total: 4; display: string }
  egfrTrend: "↑" | "↓" | "→"
  uacrTrend: "↑" | "↓" | "→"

  // Actions
  setPatient: (id: string, name: string, age?: number, sex?: "M" | "F") => void
  setVisitType: (type: EncounterState["visitType"]) => void
  setViewMode: (mode: ViewMode) => void
  setUserRole: (role: UserRole) => void
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

  // Phase 10 actions
  setSectionState: (sectionId: string, state: SectionState) => void
  setDashboardOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setChangedOnlyFilter: (on: boolean) => void
  buildAttentionItems: (sections: Section[]) => void
  recalculateProgress: (sections: Section[]) => void

  // Phase 11 actions - AI-first workflow
  acceptSection: (sectionId: string) => void
  editSection: (sectionId: string) => void
  flagSection: (sectionId: string) => void
  setAIInterpretation: (sectionId: string, interp: AIInterpretationData) => void
  loadSparklineData: (key: string, data: SparklinePoint[]) => void

  // Phase 13 actions - Pre-Flight Check
  preFlightOpen: boolean
  setPreFlightOpen: (open: boolean) => void
  encounterAttested: boolean
  attestEncounter: () => void
  canAttest: () => boolean
  getNoteSummary: (sections: Section[]) => string

  // Phase 15 actions - Patient View
  patientViewOpen: boolean
  setPatientViewOpen: (open: boolean) => void

  // Phase 16 actions - Live Filter (Ambient Voice)
  liveFilterConsented: boolean
  liveFilterActive: boolean
  liveFilterMuted: boolean
  voiceTranscript: string[]
  setLiveFilterConsented: (consented: boolean) => void
  setLiveFilterActive: (active: boolean) => void
  setLiveFilterMuted: (muted: boolean) => void
  appendVoiceTranscript: (text: string) => void
  clearVoiceTranscript: () => void

  // Phase 18 - Theme System
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

const emptyProgress: EncounterProgress = {
  totalSections: 0,
  aiReady: 0,
  accepted: 0,
  edited: 0,
  needsReview: 0,
  critical: 0,
  conflict: 0,
  percentComplete: 0,
}

const initialState = {
  patientId: null,
  patientName: "",
  patientAge: null,
  patientSex: null,
  visitDate: new Date(),
  visitType: "Follow-up" as const,
  viewMode: "progression" as ViewMode,
  userRole: "provider" as UserRole,
  currentData: {} as EncounterData,
  previousData: {} as EncounterData,
  sectionStates: {} as Record<string, SectionState>,
  aiInterpretations: {} as Record<string, AIInterpretationData>,
  sparklineData: {} as Record<string, SparklinePoint[]>,
  activeDomainIndex: 0,
  expandedSections: new Set<string>(),
  dashboardOpen: false,
  commandPaletteOpen: false,
  changedOnlyFilter: false,
  alerts: [] as Alert[],
  attentionItems: [] as AttentionItem[],
  progress: emptyProgress,
  ckdStage: "G3a",
  albuminuriaStage: "A1",
  gdmtCompliance: { count: 0, total: 4 as const, display: "0/4" },
  egfrTrend: "→" as const,
  uacrTrend: "→" as const,
  preFlightOpen: false,
  encounterAttested: false,
  patientViewOpen: false,
  liveFilterConsented: false,
  liveFilterActive: false,
  liveFilterMuted: false,
  voiceTranscript: [] as string[],
  theme: getSavedTheme(),
}

export const useEncounterStore = create<EncounterState>((set, get) => ({
  ...initialState,

  setPatient: (id, name, age, sex) => set({
    patientId: id,
    patientName: name,
    patientAge: age ?? null,
    patientSex: sex ?? null,
  }),

  setVisitType: (type) => {
    set({ visitType: type })
    // Auto-switch view mode based on visit type
    if (type === "New") {
      set({ viewMode: "baseline" })
    } else {
      set({ viewMode: "progression" })
    }
  },

  setUserRole: (role) => set({ userRole: role }),

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

  // Phase 10: New actions
  setSectionState: (sectionId, state) =>
    set((prev) => ({
      sectionStates: { ...prev.sectionStates, [sectionId]: state },
    })),

  setDashboardOpen: (open) => set({ dashboardOpen: open }),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  setChangedOnlyFilter: (on) => set({ changedOnlyFilter: on }),

  buildAttentionItems: (sections) => {
    const { currentData, previousData, alerts } = get()
    const items: AttentionItem[] = []

    // Add critical alerts as attention items
    for (const alert of alerts) {
      items.push({
        id: `alert-${alert.id}`,
        section_id: alert.section_id,
        field_id: alert.field_id,
        type: "critical",
        message: alert.message,
      })
    }

    // Check for GDMT gaps
    const raasStatus = currentData["raas.raas_status"]
    if (!raasStatus || raasStatus === "not_started") {
      items.push({
        id: "gdmt-gap-raas",
        section_id: "raas",
        type: "gap",
        message: "GDMT gap: RAAS inhibitor not started",
      })
    }

    const sglt2iStatus = currentData["sglt2i.sglt2i_status"]
    if (!sglt2iStatus || sglt2iStatus === "not_started") {
      items.push({
        id: "gdmt-gap-sglt2i",
        section_id: "sglt2i",
        type: "gap",
        message: "GDMT gap: SGLT2i not started",
      })
    }

    const mraStatus = currentData["mra.mra_status"]
    if (!mraStatus || mraStatus === "not_started" || mraStatus === "consider") {
      items.push({
        id: "gdmt-gap-mra",
        section_id: "mra",
        type: "gap",
        message: "GDMT gap: MRA not started",
      })
    }

    // Check for significant changes
    for (const section of sections) {
      for (const field of section.fields) {
        const key = `${section.section_id}.${field.field_id}`
        const current = currentData[key]
        const previous = previousData[key]
        if (
          current !== undefined &&
          previous !== undefined &&
          current !== previous &&
          field.type === "number" &&
          typeof current === "number" &&
          typeof previous === "number"
        ) {
          const pctChange = Math.abs((current - previous) / previous) * 100
          if (pctChange > 20) {
            items.push({
              id: `change-${key}`,
              section_id: section.section_id,
              field_id: field.field_id,
              type: "changed",
              message: `${field.display_name}: ${previous} → ${current} (${pctChange > 0 ? "+" : ""}${pctChange.toFixed(0)}%)`,
            })
          }
        }
      }
    }

    set({ attentionItems: items })
  },

  recalculateProgress: (sections) => {
    const { sectionStates } = get()
    // Only count non-header sections
    const countable = sections.filter((s) => s.domain_group !== "header")
    const total = countable.length
    let aiReady = 0
    let accepted = 0
    let edited = 0
    let needsReview = 0
    let critical = 0
    let conflict = 0

    for (const section of countable) {
      const state = sectionStates[section.section_id] ?? "ai_ready"
      switch (state) {
        case "ai_ready": aiReady++; break
        case "accepted": accepted++; break
        case "edited": edited++; break
        case "needs_review": needsReview++; break
        case "critical": critical++; break
        case "conflict": conflict++; break
      }
    }

    const finalized = accepted + edited
    const percentComplete = total > 0 ? Math.round((finalized / total) * 100) : 0

    set({
      progress: {
        totalSections: total,
        aiReady,
        accepted,
        edited,
        needsReview,
        critical,
        conflict,
        percentComplete,
      },
    })
  },

  // Phase 11: AI-first workflow actions
  acceptSection: (sectionId) =>
    set((prev) => ({
      sectionStates: { ...prev.sectionStates, [sectionId]: "accepted" },
    })),

  editSection: (sectionId) =>
    set((prev) => ({
      sectionStates: { ...prev.sectionStates, [sectionId]: "edited" },
    })),

  flagSection: (sectionId) =>
    set((prev) => ({
      sectionStates: { ...prev.sectionStates, [sectionId]: "needs_review" },
    })),

  setAIInterpretation: (sectionId, interp) =>
    set((prev) => ({
      aiInterpretations: { ...prev.aiInterpretations, [sectionId]: interp },
    })),

  loadSparklineData: (key, data) =>
    set((prev) => ({
      sparklineData: { ...prev.sparklineData, [key]: data },
    })),

  // Phase 13: Pre-Flight Check
  setPreFlightOpen: (open) => set({ preFlightOpen: open }),

  attestEncounter: () => set({ encounterAttested: true }),

  canAttest: () => {
    const { sectionStates } = get()
    // Cannot attest if any section is critical or conflict
    return !Object.values(sectionStates).some(
      (s) => s === "critical" || s === "conflict"
    )
  },

  getNoteSummary: (sections) => {
    const { currentData, previousData, aiInterpretations, sectionStates, viewMode } = get()
    const lines: string[] = []

    lines.push("=== PRE-FLIGHT NOTE SUMMARY ===")
    lines.push(`View: ${viewMode === "baseline" ? "Baseline (Initial)" : "Progression (Follow-up)"}`)
    lines.push("")

    // Key findings from AI
    const aiSections = sections.filter((s) => aiInterpretations[s.section_id])
    if (aiSections.length > 0) {
      lines.push("--- KEY FINDINGS ---")
      for (const section of aiSections) {
        const interp = aiInterpretations[section.section_id]
        const state = sectionStates[section.section_id] ?? "ai_ready"
        lines.push(`[${state.toUpperCase()}] ${section.display_name}:`)
        lines.push(`  ${interp.text.split("\n")[0]}`)
        if (interp.actionItems.length > 0) {
          lines.push(`  Actions: ${interp.actionItems.join("; ")}`)
        }
        lines.push("")
      }
    }

    // Changed values summary
    const changes: string[] = []
    for (const section of sections) {
      for (const field of section.fields) {
        const key = `${section.section_id}.${field.field_id}`
        const cur = currentData[key]
        const prev = previousData[key]
        if (cur !== undefined && prev !== undefined && cur !== prev) {
          changes.push(`${field.display_name}: ${prev} → ${cur}`)
        }
      }
    }
    if (changes.length > 0) {
      lines.push("--- CHANGES FROM PRIOR ---")
      for (const c of changes) lines.push(`  ${c}`)
      lines.push("")
    }

    return lines.join("\n")
  },

  // Phase 15: Patient View
  setPatientViewOpen: (open) => set({ patientViewOpen: open }),

  // Phase 16: Live Filter (Ambient Voice)
  setLiveFilterConsented: (consented) => set({ liveFilterConsented: consented }),
  setLiveFilterActive: (active) => set({ liveFilterActive: active }),
  setLiveFilterMuted: (muted) => set({ liveFilterMuted: muted }),
  appendVoiceTranscript: (text) =>
    set((prev) => ({ voiceTranscript: [...prev.voiceTranscript, text] })),
  clearVoiceTranscript: () => set({ voiceTranscript: [] }),

  // Phase 18: Theme System
  setTheme: (theme) => {
    applyTheme(theme)
    set({ theme })
  },

  clearEncounter: () => set(initialState),
}))
