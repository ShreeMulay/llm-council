import { useCallback } from "react"
import { useEncounterStore } from "@/stores/encounter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn, formatDisplayValue } from "@/lib/utils"
import { FileText, User, CheckSquare, Check } from "lucide-react"
import { useState } from "react"
import { generateEpicNote, generatePatientSummary, generateCareTeamTasks } from "@/lib/exports"
import type { SectionRegistry, FieldTypes } from "@/types/schema"

interface DashboardDrawerProps {
  sectionRegistry: SectionRegistry
  fieldTypes: FieldTypes
}

export function DashboardDrawer({
  sectionRegistry,
}: DashboardDrawerProps) {
  const store = useEncounterStore()
  const [copiedButton, setCopiedButton] = useState<string | null>(null)

  const handleExportEpicNote = useCallback(async () => {
    const exportViewMode = store.viewMode === "progression" ? "followup" : "initial"
    const note = generateEpicNote(
      store.currentData,
      store.previousData,
      sectionRegistry,
      exportViewMode
    )
    await navigator.clipboard.writeText(note)
    setCopiedButton("epic")
    setTimeout(() => setCopiedButton(null), 2000)
  }, [store.currentData, store.previousData, store.viewMode, sectionRegistry])

  const handleExportPatientSummary = useCallback(async () => {
    const summary = generatePatientSummary(store.currentData, sectionRegistry)
    await navigator.clipboard.writeText(summary)
    setCopiedButton("patient")
    setTimeout(() => setCopiedButton(null), 2000)
  }, [store.currentData, sectionRegistry])

  const handleExportCareTeamTasks = useCallback(async () => {
    const { formatted } = generateCareTeamTasks(store.currentData, sectionRegistry)
    await navigator.clipboard.writeText(formatted)
    setCopiedButton("tasks")
    setTimeout(() => setCopiedButton(null), 2000)
  }, [store.currentData, sectionRegistry])

  return (
    <Sheet open={store.dashboardOpen} onOpenChange={store.setDashboardOpen}>
      <SheetContent side="right" className="w-80 sm:max-w-sm p-0">
        <SheetHeader className="border-b border-gray-200 p-4">
          <SheetTitle>Clinical Dashboard</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* CKD Stage */}
          <div className="p-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-1">CKD Stage</div>
            <div className="text-2xl font-bold text-blue-600">
              {store.ckdStage}
            </div>
            <div className="text-sm text-gray-600">
              Albuminuria: {store.albuminuriaStage}
            </div>
          </div>

          {/* Trends */}
          <div className="p-4 border-b border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">eGFR Trend</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                {formatDisplayValue(
                  store.currentData["kidney_function.egfr_current"]
                )}
                <span
                  className={cn(
                    "text-xl",
                    store.egfrTrend === "↓" && "text-red-500",
                    store.egfrTrend === "↑" && "text-green-500"
                  )}
                >
                  {store.egfrTrend}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">UACR Trend</div>
              <div className="text-lg font-semibold flex items-center gap-1">
                {formatDisplayValue(
                  store.currentData["kidney_function.uacr_current"]
                )}
                <span
                  className={cn(
                    "text-xl",
                    store.uacrTrend === "↑" && "text-red-500",
                    store.uacrTrend === "↓" && "text-green-500"
                  )}
                >
                  {store.uacrTrend}
                </span>
              </div>
            </div>
          </div>

          {/* GDMT Compliance */}
          <div className="p-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-2">GDMT Compliance</div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  store.currentData["raas.raas_status"]
                    ?.toString()
                    .startsWith("on")
                    ? "pharmacotherapy"
                    : "outline"
                }
              >
                RAAS
              </Badge>
              <Badge
                variant={
                  store.currentData["sglt2i.sglt2i_status"] === "on"
                    ? "pharmacotherapy"
                    : "outline"
                }
              >
                SGLT2i
              </Badge>
              <Badge
                variant={
                  store.currentData["mra.mra_status"] === "on"
                    ? "pharmacotherapy"
                    : "outline"
                }
              >
                MRA
              </Badge>
              <Badge
                variant={
                  store.currentData["glp1.glp1_status"] === "on"
                    ? "pharmacotherapy"
                    : "outline"
                }
              >
                GLP-1
              </Badge>
            </div>
            <div className="mt-2 text-lg font-semibold text-purple-600">
              {store.gdmtCompliance.display} Pillars
            </div>
          </div>

          {/* Progress */}
          <div className="p-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-2">
              Encounter Progress
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${store.progress.percentComplete}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {store.progress.percentComplete}%
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {store.progress.accepted + store.progress.edited}/
              {store.progress.totalSections} sections finalized
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
                    variant={
                      alert.severity === "critical" ? "critical" : "warning"
                    }
                    className="block w-full text-left"
                  >
                    {alert.message}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Export Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2 mt-auto">
          <Button
            className="w-full justify-start gap-2"
            variant="default"
            onClick={handleExportEpicNote}
          >
            {copiedButton === "epic" ? (
              <Check className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {copiedButton === "epic" ? "Copied!" : "Generate Epic Note"}
          </Button>
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={handleExportPatientSummary}
          >
            {copiedButton === "patient" ? (
              <Check className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {copiedButton === "patient" ? "Copied!" : "Patient Summary"}
          </Button>
          <Button
            className="w-full justify-start gap-2"
            variant="outline"
            onClick={handleExportCareTeamTasks}
          >
            {copiedButton === "tasks" ? (
              <Check className="h-4 w-4" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            {copiedButton === "tasks" ? "Copied!" : "Care Team Tasks"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
