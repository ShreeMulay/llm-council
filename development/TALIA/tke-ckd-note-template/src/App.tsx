import { useEffect, useState } from "react"
import { useEncounterStore } from "@/stores/encounter"
import { SectionCard } from "@/components/SectionCard"
import { ClinicalRibbon } from "@/components/ClinicalRibbon"
import { NeedsAttention } from "@/components/NeedsAttention"
import { DashboardDrawer } from "@/components/DashboardDrawer"
import { CommandPalette } from "@/components/CommandPalette"
import { Button } from "@/components/ui/button"
import { cn, DOMAIN_DISPLAY_NAMES } from "@/lib/utils"
import type { SectionRegistry, FieldTypes, DomainGroup } from "@/types/schema"
import { RefreshCw, X } from "lucide-react"

// Import schemas statically for now (in production, these would be fetched)
import sectionRegistryJson from "@schemas/section-registry.json"
import fieldTypesJson from "@schemas/field-types.json"

const sectionRegistry = sectionRegistryJson as unknown as SectionRegistry
const fieldTypes = fieldTypesJson as unknown as FieldTypes

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden">
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
        <main className="flex-1 overflow-auto">
          {/* Needs Attention queue */}
          <NeedsAttention />

          {/* Sections */}
          <div className="p-4 md:p-6 space-y-4 pb-20">
            {domainOrder.map((domain) => {
              const sections = sectionsByDomain[domain] ?? []
              if (sections.length === 0) return null

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

        {/* Finalize Note button (placeholder for Phase 13 Pre-Flight) */}
        <Button
          size="sm"
          className="h-8"
          disabled={store.progress.critical > 0}
          title={
            store.progress.critical > 0
              ? "Resolve critical items before finalizing"
              : "Open Pre-Flight Check"
          }
        >
          Finalize Note
        </Button>
      </footer>

      {/* Dashboard Drawer */}
      <DashboardDrawer
        sectionRegistry={sectionRegistry}
        fieldTypes={fieldTypes}
      />

      {/* Command Palette */}
      <CommandPalette sectionRegistry={sectionRegistry} />
    </div>
  )
}
