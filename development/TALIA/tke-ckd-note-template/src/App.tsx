import { useEffect, useState, useCallback } from "react"
import { useEncounterStore } from "@/stores/encounter"
import { SectionCard } from "@/components/SectionCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn, DOMAIN_DISPLAY_NAMES, formatDisplayValue } from "@/lib/utils"
import { generateEpicNote, generatePatientSummary, generateCareTeamTasks } from "@/lib/exports"
import type { SectionRegistry, FieldTypes, DomainGroup } from "@/types/schema"
import { FileText, User, CheckSquare, RefreshCw, Check, Menu, X, ChevronUp } from "lucide-react"

// Import schemas statically for now (in production, these would be fetched)
import sectionRegistryJson from "@schemas/section-registry.json"
import fieldTypesJson from "@schemas/field-types.json"

const sectionRegistry = sectionRegistryJson as unknown as SectionRegistry
const fieldTypes = fieldTypesJson as unknown as FieldTypes

export default function App() {
  const store = useEncounterStore()
  const [loading, setLoading] = useState(true)
  const [copiedButton, setCopiedButton] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dashboardExpanded, setDashboardExpanded] = useState(false)

  // Export handlers - copy to clipboard with feedback
  const handleExportEpicNote = useCallback(async () => {
    // Map "delta" to "followup" for the export function
    const exportViewMode = store.viewMode === "delta" ? "followup" : "initial"
    const note = generateEpicNote(
      store.currentData,
      store.previousData,
      sectionRegistry,
      exportViewMode
    )
    await navigator.clipboard.writeText(note)
    setCopiedButton("epic")
    setTimeout(() => setCopiedButton(null), 2000)
  }, [store.currentData, store.previousData, store.viewMode])

  const handleExportPatientSummary = useCallback(async () => {
    const summary = generatePatientSummary(store.currentData, sectionRegistry)
    await navigator.clipboard.writeText(summary)
    setCopiedButton("patient")
    setTimeout(() => setCopiedButton(null), 2000)
  }, [store.currentData])

  const handleExportCareTeamTasks = useCallback(async () => {
    const { formatted } = generateCareTeamTasks(store.currentData, sectionRegistry)
    await navigator.clipboard.writeText(formatted)
    setCopiedButton("tasks")
    setTimeout(() => setCopiedButton(null), 2000)
  }, [store.currentData])

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
      "electrolytes.potassium": 6.2,  // Critical high (>6.0 triggers alert)
      "electrolytes.bicarbonate": 21,
      "anemia.hemoglobin": 7.8,  // Critical low (<8.0 action threshold)
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
    store.setPatient("PT-12345", "John Smith")
    store.setVisitType("Follow-up")
    
    // Expand some sections by default
    store.expandSection("header")
    store.expandSection("kidney_function")
    store.expandSection("bp_fluid")
    store.expandSection("raas")
    
    // Check for critical value alerts
    store.checkAlerts(sectionRegistry.sections, fieldTypes.critical_values)
    
    setLoading(false)
  }, [])

  // Group sections by domain
  const sectionsByDomain = sectionRegistry.sections.reduce((acc, section) => {
    const domain = section.domain_group
    if (!acc[domain]) acc[domain] = []
    acc[domain].push(section)
    return acc
  }, {} as Record<string, typeof sectionRegistry.sections>)

  const domainOrder: DomainGroup[] = [
    "header", "kidney_core", "cardiovascular", "pharmacotherapy",
    "metabolic", "ckd_complications", "risk_mitigation", "planning",
    "screening", "care_coordination"
  ]

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - Domain Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-60 bg-white border-r border-gray-200 flex-shrink-0 transform transition-transform duration-200 md:relative md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">TKE CKD Note</h1>
            <p className="text-sm text-gray-500">{store.patientName}</p>
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-2 overflow-y-auto h-[calc(100vh-73px)]">
          {domainOrder.map((domain) => {
            const meta = fieldTypes.domain_groups[domain]
            const sections = sectionsByDomain[domain] ?? []
            const sectionCount = sections.length
            
            return (
              <button
                key={domain}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 hover:bg-gray-100 transition-colors",
                  store.activeDomainIndex === meta?.index && "bg-gray-100"
                )}
                onClick={() => {
                  const firstSection = sections[0]
                  if (firstSection) {
                    const el = document.getElementById(`section-${firstSection.section_id}`)
                    el?.scrollIntoView({ behavior: "smooth" })
                  }
                }}
              >
                {meta?.hex && (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: meta.hex }}
                  />
                )}
                <span className="truncate">{DOMAIN_DISPLAY_NAMES[domain]}</span>
                <span className="ml-auto text-xs text-gray-400">{sectionCount}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Badge variant={store.viewMode === "delta" ? "default" : "outline"} className="hidden sm:inline-flex">
              {store.visitType} Visit
            </Badge>
            <div className="flex gap-1 md:gap-2">
              <Button
                variant={store.viewMode === "initial" ? "default" : "outline"}
                size="sm"
                className="h-8 px-2 text-xs sm:text-sm sm:h-9 sm:px-4"
                onClick={() => store.setViewMode("initial")}
              >
                Initial
              </Button>
              <Button
                variant={store.viewMode === "delta" ? "default" : "outline"}
                size="sm"
                className="h-8 px-2 text-xs sm:text-sm sm:h-9 sm:px-4"
                onClick={() => store.setViewMode("delta")}
              >
                Delta
              </Button>
            </div>
          </div>
          <div className="flex gap-1 md:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs sm:text-sm sm:h-9 sm:px-4 hidden sm:inline-flex"
              onClick={() => store.expandAllSections(sectionRegistry.sections)}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs sm:text-sm sm:h-9 sm:px-4 hidden sm:inline-flex"
              onClick={() => store.collapseStableSections(sectionRegistry.sections)}
            >
              Collapse Stable
            </Button>
          </div>
        </header>

        {/* Sections */}
        <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
          {domainOrder.map((domain) => {
            const sections = sectionsByDomain[domain] ?? []
            if (sections.length === 0) return null

            return (
              <div key={domain} className="space-y-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">
                  {DOMAIN_DISPLAY_NAMES[domain]}
                </h2>
                {sections.map((section) => (
                  <div key={section.section_id} id={`section-${section.section_id}`}>
                    <SectionCard
                      section={section}
                      currentData={store.currentData}
                      previousData={store.previousData}
                      isExpanded={store.expandedSections.has(section.section_id)}
                      onToggle={() => store.toggleSection(section.section_id)}
                      onFieldChange={(fieldId, value) =>
                        store.updateField(section.section_id, fieldId, value)
                      }
                      isDeltaMode={store.viewMode === "delta"}
                      enumDefinitions={fieldTypes.enums}
                    />
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </main>

      {/* Dashboard Overlay */}
      {dashboardExpanded && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden" 
          onClick={() => setDashboardExpanded(false)}
        />
      )}

      {/* Right Panel - Dashboard */}
      <aside className={cn(
        "fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex flex-col transition-all duration-300 md:relative md:w-80 md:border-t-0 md:border-l md:h-screen",
        dashboardExpanded ? "h-[70vh]" : "h-16 md:h-screen"
      )}>
        {/* Mobile Condensed Bar */}
        <div 
          className="md:hidden flex items-center justify-between px-4 h-16 cursor-pointer border-b border-gray-100 flex-shrink-0"
          onClick={() => setDashboardExpanded(!dashboardExpanded)}
        >
          <div className="flex items-center gap-4 text-sm font-medium">
            <span className="text-blue-600 font-bold">{store.ckdStage}</span>
            <span className="flex items-center gap-1">
              eGFR {formatDisplayValue(store.currentData["kidney_function.egfr_current"])}
              <span className={cn(store.egfrTrend === "↓" ? "text-red-500" : "text-green-500")}>{store.egfrTrend}</span>
            </span>
            <span className="text-purple-600">GDMT {store.gdmtCompliance.display}</span>
          </div>
          <div className="flex items-center gap-2">
            {store.alerts.length > 0 && (
              <Badge variant="critical" className="h-5 px-1.5 min-w-[1.25rem] justify-center">
                {store.alerts.length}
              </Badge>
            )}
            <ChevronUp className={cn("h-5 w-5 text-gray-400 transition-transform", dashboardExpanded && "rotate-180")} />
          </div>
        </div>

        {/* Dashboard Content */}
        <div className={cn(
          "flex-1 flex flex-col overflow-y-auto",
          !dashboardExpanded && "hidden md:flex"
        )}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Clinical Dashboard</h2>
          </div>
          
          {/* CKD Stage */}
          <div className="p-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-1">CKD Stage</div>
            <div className="text-2xl font-bold text-blue-600">{store.ckdStage}</div>
            <div className="text-sm text-gray-600">
              Albuminuria: {store.albuminuriaStage}
            </div>
          </div>

          {/* Trends */}
          <div className="p-4 border-b border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">eGFR Trend</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                {formatDisplayValue(store.currentData["kidney_function.egfr_current"])}
                <span className={cn(
                  "text-xl",
                  store.egfrTrend === "↓" && "text-red-500",
                  store.egfrTrend === "↑" && "text-green-500"
                )}>
                  {store.egfrTrend}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">UACR Trend</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                {formatDisplayValue(store.currentData["kidney_function.uacr_current"])}
                <span className={cn(
                  "text-xl",
                  store.uacrTrend === "↑" && "text-red-500",
                  store.uacrTrend === "↓" && "text-green-500"
                )}>
                  {store.uacrTrend}
                </span>
              </div>
            </div>
          </div>

          {/* GDMT Compliance */}
          <div className="p-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-2">GDMT Compliance</div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={store.currentData["raas.raas_status"]?.toString().startsWith("on") ? "pharmacotherapy" : "outline"}>
                RAAS
              </Badge>
              <Badge variant={store.currentData["sglt2i.sglt2i_status"] === "on" ? "pharmacotherapy" : "outline"}>
                SGLT2i
              </Badge>
              <Badge variant={store.currentData["mra.mra_status"] === "on" ? "pharmacotherapy" : "outline"}>
                MRA
              </Badge>
              <Badge variant={store.currentData["glp1.glp1_status"] === "on" ? "pharmacotherapy" : "outline"}>
                GLP-1
              </Badge>
            </div>
            <div className="mt-2 text-lg font-semibold text-purple-600">
              {store.gdmtCompliance.display} Pillars
            </div>
          </div>

          {/* Alerts */}
          {store.alerts.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <div className="text-xs text-gray-500 mb-2">Alerts</div>
              <div className="space-y-2">
                {store.alerts.map((alert) => (
                  <Badge
                    key={alert.id}
                    variant={alert.severity === "critical" ? "critical" : "warning"}
                    className="block w-full text-left"
                  >
                    {alert.message}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Export Actions */}
          <div className="mt-auto p-4 border-t border-gray-200 space-y-2">
            <Button 
              className="w-full justify-start gap-2" 
              variant="default"
              onClick={handleExportEpicNote}
            >
              {copiedButton === "epic" ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {copiedButton === "epic" ? "Copied!" : "Generate Epic Note"}
            </Button>
            <Button 
              className="w-full justify-start gap-2" 
              variant="outline"
              onClick={handleExportPatientSummary}
            >
              {copiedButton === "patient" ? <Check className="h-4 w-4" /> : <User className="h-4 w-4" />}
              {copiedButton === "patient" ? "Copied!" : "Patient Summary"}
            </Button>
            <Button 
              className="w-full justify-start gap-2" 
              variant="outline"
              onClick={handleExportCareTeamTasks}
            >
              {copiedButton === "tasks" ? <Check className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              {copiedButton === "tasks" ? "Copied!" : "Care Team Tasks"}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  )
}
