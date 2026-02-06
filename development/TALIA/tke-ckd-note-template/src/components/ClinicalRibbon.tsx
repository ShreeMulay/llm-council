import { useEncounterStore } from "@/stores/encounter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { ViewMode } from "@/types/schema"
import { RoleSwitcher } from "./RoleSwitcher"
import { ThemeSwitcher } from "./ThemeSwitcher"
import { useLiveFilterTrigger } from "./LiveFilter"
import { VoiceConsentDialog } from "./VoiceConsentDialog"
import {
  Menu,
  AlertTriangle,
  Search,
  Mic,
  MicOff,
  LayoutDashboard,
  Heart,
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

  const liveFilter = useLiveFilterTrigger()

  const alertCount = store.attentionItems.filter(
    (i) => i.type === "critical"
  ).length
  const totalAttention = store.attentionItems.length

  return (
    <header className="clinical-ribbon sticky top-0 z-20 select-none">
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
        <span className="hidden md:inline text-sm font-bold text-[var(--text-primary)] mr-1">
          TKE
        </span>

        {/* Divider */}
        <span className="hidden md:inline text-[var(--border-default)]">|</span>

        {/* Patient info */}
        <span className="text-sm font-medium text-[var(--text-secondary)] truncate max-w-[120px] md:max-w-none">
          {store.patientName}
          {store.patientAge && store.patientSex
            ? `, ${store.patientAge}${store.patientSex}`
            : ""}
        </span>

        {/* Divider */}
        <span className="hidden sm:inline text-[var(--border-default)]">|</span>

        {/* CKD Stage */}
        <span className="hidden sm:inline text-sm font-bold text-[var(--accent-primary)]">
          {store.ckdStage}/{store.albuminuriaStage}
        </span>

        {/* Divider */}
        <span className="hidden sm:inline text-[var(--border-default)]">|</span>

        {/* GDMT compliance */}
        <span className="hidden sm:inline text-sm font-semibold text-[color:var(--color-domain-pharmacotherapy)]">
          GDMT {store.gdmtCompliance.display}
        </span>

        {/* Alert count */}
        {totalAttention > 0 && (
          <>
            <span className="hidden sm:inline text-[var(--border-default)]">|</span>
            <button
              className="flex items-center gap-1"
              onClick={onDashboardToggle}
              aria-label={`${totalAttention} items need attention`}
            >
              <AlertTriangle
                className={cn(
                  "h-3.5 w-3.5",
                  alertCount > 0 ? "text-[var(--color-error)]" : "text-[var(--color-warning)]"
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
        <div className="flex gap-0.5 bg-[var(--bg-surface-sunken)] rounded-md p-0.5">
          <button
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded transition-colors",
              store.viewMode === "baseline"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
            onClick={() => store.setViewMode("baseline" as ViewMode)}
          >
            Baseline
          </button>
          <button
            className={cn(
              "px-2 py-0.5 text-xs font-medium rounded transition-colors",
              store.viewMode === "progression"
                ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
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
                ? "bg-[var(--color-warning-light)] text-[var(--color-warning-text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-default)]"
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
          className="hidden sm:flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-default)] rounded px-1.5 py-0.5 transition-colors"
          onClick={() => store.setCommandPaletteOpen(true)}
          aria-label="Open command palette"
        >
          <Search className="h-3 w-3" />
          <kbd className="font-mono text-[10px]">K</kbd>
        </button>

        {/* Role switcher */}
        <RoleSwitcher />

        {/* Theme switcher */}
        <ThemeSwitcher />

        {/* Live Filter toggle */}
        <button
          className={cn(
            "h-7 w-7 flex items-center justify-center rounded transition-colors",
            store.liveFilterActive
              ? store.liveFilterMuted
                ? "bg-[var(--color-error-light)] text-[var(--color-error)]"
                : "bg-[var(--color-success-light)] text-[var(--color-success)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          )}
          onClick={liveFilter.trigger}
          title={
            store.liveFilterActive
              ? "Live Filter active (click to stop)"
              : "Start Live Filter"
          }
          aria-label={store.liveFilterActive ? "Stop Live Filter" : "Start Live Filter"}
        >
          {store.liveFilterActive && store.liveFilterMuted ? (
            <MicOff className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {store.liveFilterActive && !store.liveFilterMuted && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[var(--color-error)] rounded-full animate-pulse" />
          )}
        </button>

        {/* Voice consent dialog */}
        <VoiceConsentDialog
          open={liveFilter.consentOpen}
          onOpenChange={liveFilter.setConsentOpen}
        />

        {/* Patient View toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => store.setPatientViewOpen(true)}
          aria-label="Open patient view"
          title="Patient View"
        >
          <Heart className="h-4 w-4 text-red-400" />
        </Button>

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
