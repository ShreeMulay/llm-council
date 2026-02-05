import { useEncounterStore } from "@/stores/encounter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/types/schema"
import {
  Menu,
  AlertTriangle,
  Search,
  Mic,
  LayoutDashboard,
} from "lucide-react"

interface ClinicalRibbonProps {
  onMenuToggle: () => void
  onDashboardToggle: () => void
}

export function ClinicalRibbon({
  onMenuToggle,
  onDashboardToggle,
}: ClinicalRibbonProps) {
  const store = useEncounterStore()

  const alertCount = store.attentionItems.filter(
    (i) => i.type === "critical"
  ).length
  const totalAttention = store.attentionItems.length

  return (
    <header className="clinical-ribbon sticky top-0 z-20 bg-white border-b border-gray-200 select-none">
      <div className="flex items-center h-10 px-2 gap-1 md:px-4 md:gap-2">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:hidden"
          onClick={onMenuToggle}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* App name (desktop) */}
        <span className="hidden md:inline text-sm font-bold text-gray-900 mr-1">
          TKE
        </span>

        {/* Divider */}
        <span className="hidden md:inline text-gray-300">|</span>

        {/* Patient info */}
        <span className="text-sm font-medium text-gray-700 truncate max-w-[120px] md:max-w-none">
          {store.patientName}
          {store.patientAge && store.patientSex
            ? `, ${store.patientAge}${store.patientSex}`
            : ""}
        </span>

        {/* Divider */}
        <span className="hidden sm:inline text-gray-300">|</span>

        {/* CKD Stage */}
        <span className="hidden sm:inline text-sm font-bold text-blue-600">
          {store.ckdStage}/{store.albuminuriaStage}
        </span>

        {/* Divider */}
        <span className="hidden sm:inline text-gray-300">|</span>

        {/* GDMT compliance */}
        <span className="hidden sm:inline text-sm font-semibold text-purple-600">
          GDMT {store.gdmtCompliance.display}
        </span>

        {/* Alert count */}
        {totalAttention > 0 && (
          <>
            <span className="hidden sm:inline text-gray-300">|</span>
            <button
              className="flex items-center gap-1"
              onClick={onDashboardToggle}
              aria-label={`${totalAttention} items need attention`}
            >
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5",
                  alertCount > 0 ? "text-red-500" : "text-amber-500"
                )}
              />
              <Badge
                variant={alertCount > 0 ? "critical" : "warning"}
                className="h-5 px-1.5 min-w-[1.25rem] justify-center text-xs"
              >
                {totalAttention}
              </Badge>
            </button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
          <button
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded transition-colors",
              store.viewMode === "baseline"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => store.setViewMode("baseline" as ViewMode)}
          >
            Baseline
          </button>
          <button
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded transition-colors",
              store.viewMode === "progression"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
            onClick={() => store.setViewMode("progression" as ViewMode)}
          >
            Progression
          </button>
        </div>

        {/* Changed only filter (only in Progression mode) */}
        {store.viewMode === "progression" && (
          <button
            className={cn(
              "hidden sm:flex items-center gap-1 text-xs px-1.5 py-0.5 rounded transition-colors",
              store.changedOnlyFilter
                ? "bg-orange-100 text-orange-700"
                : "text-gray-400 hover:text-gray-600 border border-gray-200"
            )}
            onClick={() =>
              store.setChangedOnlyFilter(!store.changedOnlyFilter)
            }
            title="Show only sections with changes"
          >
            {store.changedOnlyFilter ? "Changed" : "All"}
          </button>
        )}

        {/* Command palette trigger */}
        <button
          className="hidden sm:flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 transition-colors"
          onClick={() => store.setCommandPaletteOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="h-3 w-3" />
          <kbd className="font-mono text-[10px]">K</kbd>
        </button>

        {/* Live Filter placeholder (Phase 16) */}
        <button
          className="h-7 w-7 flex items-center justify-center rounded text-gray-300 cursor-not-allowed"
          disabled
          title="Live Filter (coming soon)"
          aria-label="Live Filter not yet available"
        >
          <Mic className="h-3.5 w-3.5" />
        </button>

        {/* Dashboard toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDashboardToggle}
          aria-label="Toggle dashboard"
        >
          <LayoutDashboard className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
