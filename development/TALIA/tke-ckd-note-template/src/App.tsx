import { useEffect, useState } from "react"
import { useEncounterStore } from "@/stores/encounter"
import { SectionCard } from "@/components/SectionCard"
import { ClinicalRibbon } from "@/components/ClinicalRibbon"
import { NeedsAttention } from "@/components/NeedsAttention"
import { DashboardDrawer } from "@/components/DashboardDrawer"
import { CommandPalette } from "@/components/CommandPalette"
import { PreFlightCheck } from "@/components/PreFlightCheck"
import { PatientView } from "@/components/PatientView"
import { LiveFilter } from "@/components/LiveFilter"
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts"
import { Button } from "@/components/ui/button"
import { cn, DOMAIN_DISPLAY_NAMES } from "@/lib/utils"
import type { SectionRegistry, FieldTypes, DomainGroup, AIInterpretationData } from "@/types/schema"
import { getPermissions, ROLE_CONFIGS } from "@/lib/role-permissions"
import { RefreshCw, X } from "lucide-react"

// Import schemas statically for now (in production, these would be fetched)
import sectionRegistryJson from "@schemas/section-registry.json"
import fieldTypesJson from "@schemas/field-types.json"

const sectionRegistry = sectionRegistryJson as unknown as SectionRegistry
const fieldTypes = fieldTypesJson as unknown as FieldTypes

/** Sample AI interpretations for demo sections */
const SAMPLE_AI_INTERPRETATIONS: Record<string, AIInterpretationData> = {
  kidney_function: {
    text: "eGFR declined from 32 to 28 mL/min (12.5% decline), now CKD Stage 3b. UACR increased from 380 to 420 mg/g (A3 category). This trajectory suggests progressive CKD with worsening albuminuria.\nKFRE 5-year risk should be calculated to assess dialysis timeline.",
    confidence: 0.92,
    citations: [
      { source: "labs_api", label: "CMP", detail: "CMP 2026-01-28", timestamp: "2026-01-28", confidence: "high" },
      { source: "labs_api", label: "UACR", detail: "UA 2026-01-28", timestamp: "2026-01-28", confidence: "high" },
      { source: "previous_note", label: "Prior eGFR", detail: "Visit 2025-10-15", timestamp: "2025-10-15", confidence: "high" },
    ],
    actionItems: [
      "Calculate KFRE 5-year kidney failure risk",
      "Consider AV fistula referral if KFRE >20%",
    ],
    generatedAt: new Date().toISOString(),
    agentId: "kidney-function-agent",
  },
  bp_fluid: {
    text: "Blood pressure 142/88 mmHg - remains uncontrolled (target <130/80 per KDIGO). Systolic up from 138 mmHg (+4). Currently on Losartan 100mg (max dose).\nConsider adding amlodipine 5mg or chlorthalidone 12.5mg as second agent.",
    confidence: 0.88,
    citations: [
      { source: "vitals", label: "Today BP", detail: "Vitals 2026-01-28", timestamp: "2026-01-28", confidence: "high" },
      { source: "previous_note", label: "Prior BP", detail: "Visit 2025-10-15", timestamp: "2025-10-15", confidence: "high" },
      { source: "med_list", label: "Current meds", detail: "Losartan 100mg daily", timestamp: "2026-01-28", confidence: "high" },
    ],
    actionItems: [
      "Add second antihypertensive agent",
      "Home BP monitoring log review at next visit",
      "Dietary sodium counseling",
    ],
    generatedAt: new Date().toISOString(),
    agentId: "bp-fluid-agent",
  },
  raas: {
    text: "Patient on Losartan 100mg daily (ARB, max dose). RAAS inhibition adequately maintained. eGFR decline 12.5% but no hyperkalemia-related dose reduction needed.\nK+ currently 6.2 mEq/L - CRITICAL. Must address hyperkalemia before continuing full-dose RAAS.",
    confidence: 0.85,
    citations: [
      { source: "med_list", label: "Losartan", detail: "Losartan 100mg daily", timestamp: "2026-01-28", confidence: "high" },
      { source: "labs_api", label: "K+", detail: "Potassium 6.2 mEq/L", timestamp: "2026-01-28", confidence: "high" },
      { source: "labs_api", label: "eGFR", detail: "eGFR 28 mL/min", timestamp: "2026-01-28", confidence: "high" },
    ],
    actionItems: [
      "Address hyperkalemia before RAAS dose adjustment",
      "Consider potassium binder (patiromer/SZC) to maintain RAAS",
    ],
    generatedAt: new Date().toISOString(),
    agentId: "raas-agent",
  },
  electrolytes: {
    text: "CRITICAL: Potassium 6.2 mEq/L (was 4.6 - rose 34.8%). Bicarbonate 21 mEq/L (was 22, borderline low). Hyperkalemia likely multifactorial: CKD progression + full-dose ARB.\nImmediate action required for K+ >6.0.",
    confidence: 0.95,
    citations: [
      { source: "labs_api", label: "BMP", detail: "BMP 2026-01-28: K+ 6.2, HCO3 21", timestamp: "2026-01-28", confidence: "high" },
      { source: "labs_api", label: "Prior BMP", detail: "BMP 2025-10-15: K+ 4.6, HCO3 22", timestamp: "2025-10-15", confidence: "high" },
    ],
    actionItems: [
      "STAT ECG to assess cardiac effects",
      "Start sodium zirconium cyclosilicate (Lokelma) 10g TID x48h",
      "Recheck K+ in 24-48 hours",
      "Low-potassium diet education",
    ],
    generatedAt: new Date().toISOString(),
    agentId: "electrolyte-agent",
  },
  anemia: {
    text: "Hemoglobin 7.8 g/dL - CRITICAL (was 10.5, dropped 25.7%). Significant decline below action threshold of 10 g/dL. Iron studies and reticulocyte count needed to differentiate iron deficiency vs EPO deficiency vs GI loss.\nTransfusion threshold typically <7 g/dL but symptoms should guide decision.",
    confidence: 0.90,
    citations: [
      { source: "labs_api", label: "CBC", detail: "CBC 2026-01-28: Hgb 7.8", timestamp: "2026-01-28", confidence: "high" },
      { source: "labs_api", label: "Prior CBC", detail: "CBC 2025-10-15: Hgb 10.5", timestamp: "2025-10-15", confidence: "high" },
    ],
    actionItems: [
      "Order iron studies (ferritin, TSAT, TIBC)",
      "Order reticulocyte count",
      "Consider GI bleed workup (stool guaiac)",
      "Assess symptoms: fatigue, dyspnea, chest pain",
      "Consider ESA if iron-replete with EPO deficiency",
    ],
    generatedAt: new Date().toISOString(),
    agentId: "anemia-agent",
  },
}

export default function App() {
  const store = useEncounterStore()
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Initialize with sample data for demo
    store.loadCurrentData({
      "kidney_function.egfr_current": 28,
      "kidney_function.egfr_previous": 32,
      "kidney_function.creatinine": 2.1,
      "kidney_function.uacr_current": 420,
      "kidney_function.uacr_previous": 380,
      "bp_fluid.systolic_bp": 142,
      "bp_fluid.diastolic_bp": 88,
      "bp_fluid.bp_control_status": "uncontrolled",
      "raas.raas_status": "on_arb",
      "raas.raas_drug_dose": "Losartan 100mg",
      "sglt2i.sglt2i_status": "on",
      "mra.mra_status": "consider",
      "glp1.glp1_status": "not_indicated",
      "electrolytes.potassium": 6.2, // Critical high (>6.0 triggers alert)
      "electrolytes.bicarbonate": 21,
      "anemia.hemoglobin": 7.8, // Critical low (<8.0 action threshold)
    })
    store.loadPreviousData({
      "kidney_function.egfr_current": 32,
      "kidney_function.creatinine": 1.9,
      "kidney_function.uacr_current": 380,
      "bp_fluid.systolic_bp": 138,
      "bp_fluid.diastolic_bp": 84,
      "bp_fluid.bp_control_status": "uncontrolled",
      "raas.raas_status": "on_arb",
      "sglt2i.sglt2i_status": "on",
      "electrolytes.potassium": 4.6,
      "electrolytes.bicarbonate": 22,
      "anemia.hemoglobin": 10.5,
    })
    store.setPatient("PT-12345", "John Smith", 68, "M")
    store.setVisitType("Follow-up")

    // Load sample AI interpretations
    for (const [sectionId, interp] of Object.entries(SAMPLE_AI_INTERPRETATIONS)) {
      store.setAIInterpretation(sectionId, interp)
    }
    // Set section states for sections with AI data
    for (const sectionId of Object.keys(SAMPLE_AI_INTERPRETATIONS)) {
      // Electrolytes and anemia are critical
      if (sectionId === "electrolytes" || sectionId === "anemia") {
        store.setSectionState(sectionId, "critical")
      } else {
        store.setSectionState(sectionId, "ai_ready")
      }
    }

    // Load sample sparkline trend data
    store.loadSparklineData("egfr", [
      { date: "2025-01-15", value: 42 },
      { date: "2025-04-15", value: 38 },
      { date: "2025-07-15", value: 35 },
      { date: "2025-10-15", value: 32 },
      { date: "2026-01-28", value: 28 },
    ])
    store.loadSparklineData("uacr", [
      { date: "2025-01-15", value: 280 },
      { date: "2025-04-15", value: 320 },
      { date: "2025-07-15", value: 350 },
      { date: "2025-10-15", value: 380 },
      { date: "2026-01-28", value: 420 },
    ])
    store.loadSparklineData("potassium", [
      { date: "2025-01-15", value: 4.2 },
      { date: "2025-04-15", value: 4.4 },
      { date: "2025-07-15", value: 4.5 },
      { date: "2025-10-15", value: 4.6 },
      { date: "2026-01-28", value: 6.2 },
    ])
    store.loadSparklineData("hemoglobin", [
      { date: "2025-01-15", value: 11.8 },
      { date: "2025-04-15", value: 11.2 },
      { date: "2025-07-15", value: 10.9 },
      { date: "2025-10-15", value: 10.5 },
      { date: "2026-01-28", value: 7.8 },
    ])
    store.loadSparklineData("systolic_bp", [
      { date: "2025-01-15", value: 148 },
      { date: "2025-04-15", value: 144 },
      { date: "2025-07-15", value: 140 },
      { date: "2025-10-15", value: 138 },
      { date: "2026-01-28", value: 142 },
    ])
    store.loadSparklineData("bicarbonate", [
      { date: "2025-01-15", value: 24 },
      { date: "2025-04-15", value: 23 },
      { date: "2025-07-15", value: 23 },
      { date: "2025-10-15", value: 22 },
      { date: "2026-01-28", value: 21 },
    ])

    // Expand some sections by default
    store.expandSection("header")
    store.expandSection("kidney_function")
    store.expandSection("bp_fluid")
    store.expandSection("raas")

    // Check for critical value alerts
    store.checkAlerts(sectionRegistry.sections, fieldTypes.critical_values)

    // Build attention items and calculate progress
    store.buildAttentionItems(sectionRegistry.sections)
    store.recalculateProgress(sectionRegistry.sections)

    setLoading(false)
  }, [])

  // Group sections by domain
  const sectionsByDomain = sectionRegistry.sections.reduce(
    (acc, section) => {
      const domain = section.domain_group
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(section)
      return acc
    },
    {} as Record<string, typeof sectionRegistry.sections>
  )

  const domainOrder: DomainGroup[] = [
    "header",
    "kidney_core",
    "cardiovascular",
    "pharmacotherapy",
    "metabolic",
    "ckd_complications",
    "risk_mitigation",
    "planning",
    "screening",
    "care_coordination",
  ]

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const isProgressionMode = store.viewMode === "progression"
  const permissions = getPermissions(store.userRole)
  const roleConfig = ROLE_CONFIGS[store.userRole]

  /** Helper: does a section have any changed fields? */
  const sectionHasChanges = (section: typeof sectionRegistry.sections[0]) =>
    section.fields.some((f) => {
      const key = `${section.section_id}.${f.field_id}`
      return store.currentData[key] !== store.previousData[key] && store.previousData[key] !== undefined
    })

  /** Handle section accept → recalculate progress */
  const handleAcceptSection = (sectionId: string) => {
    store.acceptSection(sectionId)
    store.recalculateProgress(sectionRegistry.sections)
  }

  /** Handle section edit → recalculate progress */
  const handleEditSection = (sectionId: string) => {
    store.editSection(sectionId)
    store.recalculateProgress(sectionRegistry.sections)
  }

  /** Handle section flag → recalculate progress */
  const handleFlagSection = (sectionId: string) => {
    store.flagSection(sectionId)
    store.recalculateProgress(sectionRegistry.sections)
  }

  return (
    <div className={cn("min-h-screen bg-gray-50 flex flex-col overflow-hidden", roleConfig.borderClass)}>
      {/* Skip to content - accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-blue-600 focus:underline"
      >
        Skip to main content
      </a>

      {/* Clinical Ribbon - slim sticky header */}
      <ClinicalRibbon
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        onDashboardToggle={() => store.setDashboardOpen(!store.dashboardOpen)}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Domain Navigation (slim) */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-48 bg-white border-r border-gray-200 flex-shrink-0 transform transition-transform duration-200 md:relative md:translate-x-0 pt-10 md:pt-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 md:hidden">
            <span className="text-sm font-semibold">Sections</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="p-1.5 overflow-y-auto h-[calc(100vh-40px)] md:h-[calc(100vh-80px)]">
            {domainOrder.map((domain) => {
              const meta = fieldTypes.domain_groups[domain]
              const sections = sectionsByDomain[domain] ?? []
              if (sections.length === 0) return null

              return (
                <button
                  key={domain}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 hover:bg-gray-100 transition-colors",
                    store.activeDomainIndex === meta?.index && "bg-gray-100"
                  )}
                  onClick={() => {
                    const firstSection = sections[0]
                    if (firstSection) {
                      const el = document.getElementById(
                        `section-${firstSection.section_id}`
                      )
                      el?.scrollIntoView({ behavior: "smooth" })
                    }
                    setSidebarOpen(false)
                  }}
                >
                  {meta?.hex && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: meta.hex }}
                    />
                  )}
                  <span className="truncate">
                    {DOMAIN_DISPLAY_NAMES[domain]}
                  </span>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {sections.length}
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-auto" role="main">
          {/* Needs Attention queue */}
          <NeedsAttention />

          {/* Sections */}
          <div className="p-4 md:p-6 space-y-4 pb-20">
            {domainOrder.map((domain) => {
              let sections = sectionsByDomain[domain] ?? []
              if (sections.length === 0) return null

              // Apply "Changed only" filter in Progression mode
              if (isProgressionMode && store.changedOnlyFilter) {
                sections = sections.filter(sectionHasChanges)
                if (sections.length === 0) return null
              }

              return (
                <div key={domain} className="space-y-2">
                  <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                    {DOMAIN_DISPLAY_NAMES[domain]}
                  </h2>
                  {sections.map((section) => (
                    <div
                      key={section.section_id}
                      id={`section-${section.section_id}`}
                    >
                      <SectionCard
                        section={section}
                        currentData={store.currentData}
                        previousData={store.previousData}
                        isExpanded={store.expandedSections.has(
                          section.section_id
                        )}
                        onToggle={() =>
                          store.toggleSection(section.section_id)
                        }
                        onFieldChange={(fieldId, value) =>
                          store.updateField(
                            section.section_id,
                            fieldId,
                            value
                          )
                        }
                        isProgressionMode={isProgressionMode}
                        sectionState={
                          store.sectionStates[section.section_id] ?? "ai_ready"
                        }
                        enumDefinitions={fieldTypes.enums}
                        aiInterpretation={store.aiInterpretations[section.section_id]}
                        onAcceptSection={permissions.canAcceptSections ? () => handleAcceptSection(section.section_id) : undefined}
                        onEditSection={permissions.canEditSections ? () => handleEditSection(section.section_id) : undefined}
                        onFlagSection={permissions.canFlagSections ? () => handleFlagSection(section.section_id) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </main>
      </div>

      {/* Sticky Footer - Progress Bar + Finalize */}
      <footer className="sticky-footer sticky bottom-0 z-10 bg-white border-t border-gray-200 px-4 md:px-6 py-2 flex items-center gap-3">
        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden flex">
            {/* Green = accepted */}
            {store.progress.accepted > 0 && (
              <div
                className="h-full bg-green-500 transition-all"
                style={{
                  width: `${(store.progress.accepted / store.progress.totalSections) * 100}%`,
                }}
              />
            )}
            {/* Purple = edited */}
            {store.progress.edited > 0 && (
              <div
                className="h-full bg-purple-500 transition-all"
                style={{
                  width: `${(store.progress.edited / store.progress.totalSections) * 100}%`,
                }}
              />
            )}
            {/* Blue = ai_ready */}
            {store.progress.aiReady > 0 && (
              <div
                className="h-full bg-blue-400 transition-all"
                style={{
                  width: `${(store.progress.aiReady / store.progress.totalSections) * 100}%`,
                }}
              />
            )}
            {/* Yellow = needs_review */}
            {store.progress.needsReview > 0 && (
              <div
                className="h-full bg-yellow-400 transition-all"
                style={{
                  width: `${(store.progress.needsReview / store.progress.totalSections) * 100}%`,
                }}
              />
            )}
            {/* Red = critical */}
            {store.progress.critical > 0 && (
              <div
                className="h-full bg-red-500 transition-all"
                style={{
                  width: `${(store.progress.critical / store.progress.totalSections) * 100}%`,
                }}
              />
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {store.progress.accepted + store.progress.edited}/
            {store.progress.totalSections} sections
          </span>
        </div>

        {/* Finalize Note button → opens Pre-Flight Check */}
        <Button
          size="sm"
          className="h-8"
          onClick={() => store.setPreFlightOpen(true)}
          disabled={store.encounterAttested || !permissions.canOpenPreFlight}
          title={
            store.encounterAttested
              ? "Note already attested"
              : !permissions.canOpenPreFlight
                ? `${roleConfig.label} role cannot finalize notes`
                : "Open Pre-Flight Check"
          }
        >
          {store.encounterAttested ? "Note Attested" : "Finalize Note"}
        </Button>
      </footer>

      {/* Dashboard Drawer */}
      <DashboardDrawer
        sectionRegistry={sectionRegistry}
        fieldTypes={fieldTypes}
      />

      {/* Command Palette */}
      <CommandPalette sectionRegistry={sectionRegistry} />

      {/* Pre-Flight Check */}
      <PreFlightCheck sectionRegistry={sectionRegistry} />

      {/* Patient View */}
      <PatientView />

      {/* Live Filter (Ambient Voice) */}
      <LiveFilter />

      {/* Keyboard Shortcuts (Shift+?) */}
      <KeyboardShortcuts />
    </div>
  )
}
