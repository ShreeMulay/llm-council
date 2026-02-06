import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { FieldFactory } from "./FieldFactory"
import { AIInterpretation } from "./AIInterpretation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type {
  Section,
  EncounterData,
  EnumDefinition,
  SectionState,
  AIInterpretationData,
} from "@/types/schema"

/** Border color classes for section states */
const SECTION_STATE_BORDERS: Record<SectionState, string> = {
  needs_review: "border-l-[var(--color-warning)]",
  ai_ready: "border-l-[var(--accent-primary)]",
  accepted: "border-l-[var(--color-success)]",
  edited: "border-l-[color:var(--color-domain-pharmacotherapy)]",
  critical: "border-l-[var(--color-error)] animate-pulse",
  conflict: "border-l-[var(--color-warning)]",
}

/** State label for collapsed view */
const SECTION_STATE_LABELS: Record<SectionState, { text: string; class: string }> = {
  needs_review: { text: "Review", class: "bg-[var(--color-warning-light)] text-[var(--color-warning-text)]" },
  ai_ready: { text: "AI Ready", class: "bg-[var(--color-info-light)] text-[var(--color-info-text)]" },
  accepted: { text: "Accepted", class: "bg-[var(--color-success-light)] text-[var(--color-success-text)]" },
  edited: { text: "Edited", class: "bg-[color:var(--color-domain-pharmacotherapy)]/15 text-[color:var(--color-domain-pharmacotherapy)]" },
  critical: { text: "Critical", class: "bg-[var(--color-error-light)] text-[var(--color-error-text)]" },
  conflict: { text: "Conflict", class: "bg-[var(--color-warning-light)] text-[var(--color-warning-text)]" },
}

interface SectionCardProps {
  section: Section
  currentData: EncounterData
  previousData: EncounterData
  isExpanded: boolean
  onToggle: () => void
  onFieldChange: (fieldId: string, value: EncounterData[string]) => void
  isProgressionMode: boolean
  sectionState?: SectionState
  enumDefinitions: Record<string, EnumDefinition>
  /** AI interpretation data (if available) */
  aiInterpretation?: AIInterpretationData
  onAcceptSection?: () => void
  onEditSection?: () => void
  onFlagSection?: () => void
}

export function SectionCard({
  section,
  currentData,
  previousData,
  isExpanded,
  onToggle,
  onFieldChange,
  isProgressionMode,
  sectionState = "ai_ready",
  enumDefinitions,
  aiInterpretation,
  onAcceptSection,
  onEditSection,
  onFlagSection,
}: SectionCardProps) {
  // Whether to show raw fields (collapsed by default in AI-first mode)
  const [showFields, setShowFields] = useState(!aiInterpretation)

  // Count changed fields
  const changedFields = section.fields.filter((f) => {
    const key = `${section.section_id}.${f.field_id}`
    return currentData[key] !== previousData[key] && previousData[key] !== undefined
  })

  // Generate 1-line summary for collapsed view
  const getSummary = () => {
    // If AI interpretation available, show first line of AI text
    if (aiInterpretation) {
      const firstLine = aiInterpretation.text.split("\n")[0]
      return firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine
    }
    const keyFields = section.fields.slice(0, 3)
    const parts = keyFields
      .map((f) => {
        const key = `${section.section_id}.${f.field_id}`
        const val = currentData[key]
        if (val === null || val === undefined) return null
        return `${f.display_name}: ${val}${f.unit ? ` ${f.unit}` : ""}`
      })
      .filter(Boolean)
    return parts.join(" | ") || "No data"
  }

  const borderClass = SECTION_STATE_BORDERS[sectionState]
  const stateLabel = SECTION_STATE_LABELS[sectionState]

  return (
    <div
      className={cn(
        "border rounded-lg bg-[var(--bg-surface)] shadow-sm overflow-hidden",
        "border-l-4",
        borderClass
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-surface-sunken)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          )}
          <span className="font-medium text-[var(--text-primary)]">
            {section.section_number}. {section.display_name}
          </span>
          {/* Section state badge */}
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded font-medium",
              stateLabel.class
            )}
          >
            {stateLabel.text}
          </span>
          {section.visit_mode === "conditional" && (
            <Badge variant="outline" className="text-xs">
              Conditional
            </Badge>
          )}
          {changedFields.length > 0 && (
            <Badge variant="warning" className="text-xs">
              {changedFields.length} changed
            </Badge>
          )}
        </div>
        {section.card_codes.length > 0 && (
          <div className="flex gap-1">
            {section.card_codes.map((code) => (
              <Badge key={code} variant="secondary" className="text-xs">
                {code}
              </Badge>
            ))}
          </div>
        )}
      </button>

      {/* Collapsed summary */}
      {!isExpanded && (
        <div className="px-4 pb-3 text-sm text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
          {isProgressionMode && changedFields.length === 0 ? (
            <span className="italic">Unchanged from previous visit</span>
          ) : (
            getSummary()
          )}
        </div>
      )}

      {/* Expanded content - AI-first layout */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-subtle)]">
          {/* AI Interpretation (primary content) */}
          {aiInterpretation ? (
            <AIInterpretation
              interpretation={aiInterpretation}
              sectionState={sectionState}
              onAccept={onAcceptSection ?? (() => {})}
              onEdit={onEditSection ?? (() => {})}
              onFlag={onFlagSection ?? (() => {})}
              showFields={showFields}
              onToggleFields={() => setShowFields(!showFields)}
            />
          ) : (
            /* Fallback: old-style AI placeholder when no interpretation data */
            <div className="mt-3 p-3 bg-[var(--color-info-light)] rounded-md border border-dashed border-[var(--accent-primary)]/40">
              <div className="text-xs font-medium text-[var(--color-info-text)] mb-1">
                AI Interpretation
              </div>
              <div className="text-sm text-[var(--color-info-text)] italic">
                {section.interpretation_prompt.slice(0, 100)}...
              </div>
            </div>
          )}

          {/* Raw fields (secondary, togglable when AI is present) */}
          {(showFields || !aiInterpretation) && (
            <div
              className={cn(
                "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
                aiInterpretation ? "mt-3 pt-3 border-t border-[var(--border-subtle)]" : "pt-4"
              )}
            >
              {section.fields.map((field) => {
                const key = `${section.section_id}.${field.field_id}`
                return (
                  <FieldFactory
                    key={field.field_id}
                    field={field}
                    value={currentData[key]}
                    previousValue={previousData[key]}
                    onChange={(val) => onFieldChange(field.field_id, val)}
                    isDeltaMode={isProgressionMode}
                    enumDefinitions={enumDefinitions}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
