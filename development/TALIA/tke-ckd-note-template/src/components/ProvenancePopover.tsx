import { useState } from "react"
import { cn } from "@/lib/utils"
import type { ProvenanceCitation } from "@/types/schema"
import { Info, ChevronDown, Database, FileText, Mic, Scan, Stethoscope, User } from "lucide-react"

/** Map source types to icons */
const SOURCE_ICONS: Record<string, typeof Info> = {
  labs_api: Database,
  med_list: FileText,
  vitals: Stethoscope,
  provider: User,
  patient: User,
  transcription: Mic,
  ocr_scan: Scan,
  previous_note: FileText,
  fax_manager: FileText,
}

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-[var(--color-success-light)] text-[var(--color-success-text)]",
  medium: "bg-[var(--color-warning-light)] text-[var(--color-warning-text)]",
  low: "bg-[var(--color-error-light)] text-[var(--color-error-text)]",
}

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High",
  medium: "Med",
  low: "Low",
}

interface ProvenancePopoverProps {
  citations: ProvenanceCitation[]
  /** Compact mode shows just the icon, full mode shows inline */
  compact?: boolean
  className?: string
}

export function ProvenancePopover({
  citations,
  compact = true,
  className,
}: ProvenancePopoverProps) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  if (citations.length === 0) return null

  // Hover preview - show top 2 sources
  const previewCitations = citations.slice(0, 2)

  // Check if any citations have conflicts (multiple sources with different confidence)
  const hasConflict =
    citations.length > 1 &&
    new Set(citations.map((c) => c.confidence)).size > 1

  return (
    <div className={cn("relative inline-flex", className)}>
      {/* Trigger */}
      <button
        className={cn(
          "inline-flex items-center gap-0.5 text-xs transition-colors rounded px-1 py-0.5",
          hasConflict
            ? "text-[var(--color-warning)] hover:text-[var(--color-warning-text)] hover:bg-[var(--color-warning-light)]"
            : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-sunken)]"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setExpanded(!expanded)}
        aria-label={`${citations.length} source${citations.length > 1 ? "s" : ""}`}
      >
        <Info className="h-3 w-3" />
        {!compact && (
          <>
            <span>{citations.length} source{citations.length > 1 ? "s" : ""}</span>
            <ChevronDown
              className={cn(
                "h-2.5 w-2.5 transition-transform",
                expanded && "rotate-180"
              )}
            />
          </>
        )}
      </button>

      {/* Hover popover - quick preview */}
      {hovered && !expanded && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md shadow-lg p-2 pointer-events-none">
          <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase mb-1">
            Sources
          </div>
          {previewCitations.map((c, i) => {
            const Icon = SOURCE_ICONS[c.source] ?? Info
            return (
              <div key={i} className="flex items-center gap-1.5 py-0.5 text-xs text-[var(--text-secondary)]">
                <Icon className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0" />
                <span className="truncate">{c.label}</span>
                <span
                  className={cn(
                    "ml-auto text-[10px] px-1 rounded",
                    CONFIDENCE_STYLES[c.confidence]
                  )}
                >
                  {CONFIDENCE_LABELS[c.confidence]}
                </span>
              </div>
            )
          })}
          {citations.length > 2 && (
            <div className="text-[10px] text-[var(--text-muted)] mt-1">
              +{citations.length - 2} more (click to expand)
            </div>
          )}
        </div>
      )}

      {/* Click dropdown - full details */}
      {expanded && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setExpanded(false)}
          />
          <div className="absolute left-0 top-full mt-1 z-50 w-72 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-md shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Data Sources ({citations.length})
              </span>
              {hasConflict && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-warning-light)] text-[var(--color-warning-text)] font-medium">
                  Conflict
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {citations.map((c, i) => {
                const Icon = SOURCE_ICONS[c.source] ?? Info
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-[var(--bg-surface-sunken)]"
                  >
                    <Icon className="h-3.5 w-3.5 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {c.label}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1 rounded flex-shrink-0",
                            CONFIDENCE_STYLES[c.confidence]
                          )}
                        >
                          {CONFIDENCE_LABELS[c.confidence]}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {c.detail}
                      </div>
                      {c.timestamp && (
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {new Date(c.timestamp).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
