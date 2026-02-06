import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ProvenancePopover } from "./ProvenancePopover"
import { cn } from "@/lib/utils"
import type { AIInterpretationData, SectionState } from "@/types/schema"
import { Check, Pencil, AlertTriangle, Bot } from "lucide-react"

interface AIInterpretationProps {
  interpretation: AIInterpretationData
  sectionState: SectionState
  onAccept: () => void
  onEdit: () => void
  onFlag: () => void
  /** Show the raw fields editing view */
  showFields: boolean
  onToggleFields: () => void
}

/** Confidence to visual indicator */
function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8
      ? "bg-[var(--color-success)]"
      : confidence >= 0.5
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-error)]"
  const label =
    confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low"

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
      <span className={cn("w-1.5 h-1.5 rounded-full", color)} />
      {label} confidence
    </span>
  )
}

export function AIInterpretation({
  interpretation,
  sectionState,
  onAccept,
  onEdit,
  onFlag,
  showFields,
  onToggleFields,
}: AIInterpretationProps) {
  const [editingText, setEditingText] = useState<string | null>(null)

  const isAccepted = sectionState === "accepted"
  const isEdited = sectionState === "edited"
  const isDraft = sectionState === "ai_ready" || sectionState === "needs_review"

  const displayText = editingText ?? interpretation.text

  return (
    <div
      className={cn(
        "mt-3 rounded-md border p-3 transition-all",
        // Draft aesthetic: dashed border for unverified AI
        isDraft && "border-dashed border-[var(--accent-primary)]/40 bg-[var(--color-info-light)]",
        // Accepted: solid green
        isAccepted && "border-solid border-[var(--color-success)]/60 bg-[var(--color-success-light)]",
        // Edited: solid purple
        isEdited && "border-solid border-[color:var(--color-domain-pharmacotherapy)]/50 bg-[color:var(--color-domain-pharmacotherapy)]/10",
        // Critical: red
        sectionState === "critical" && "border-solid border-[var(--color-error)]/60 bg-[var(--color-error-light)]",
        // Conflict: orange
        sectionState === "conflict" && "border-solid border-[var(--color-warning)]/60 bg-[var(--color-warning-light)]"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            AI Interpretation
          </span>
          <ConfidenceDot confidence={interpretation.confidence} />
          <ProvenancePopover
            citations={interpretation.citations}
            compact={true}
          />
        </div>

        {/* State badge */}
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded font-medium",
            isDraft && "bg-[var(--color-info-light)] text-[var(--color-info-text)]",
            isAccepted && "bg-[var(--color-success-light)] text-[var(--color-success-text)]",
            isEdited && "bg-[color:var(--color-domain-pharmacotherapy)]/15 text-[color:var(--color-domain-pharmacotherapy)]",
            sectionState === "critical" && "bg-[var(--color-error-light)] text-[var(--color-error-text)]",
            sectionState === "conflict" && "bg-[var(--color-warning-light)] text-[var(--color-warning-text)]",
            sectionState === "needs_review" && "bg-[var(--color-warning-light)] text-[var(--color-warning-text)]"
          )}
        >
          {sectionState === "ai_ready" && "AI Draft"}
          {sectionState === "needs_review" && "Needs Review"}
          {sectionState === "accepted" && "Accepted"}
          {sectionState === "edited" && "Edited"}
          {sectionState === "critical" && "Critical"}
          {sectionState === "conflict" && "Conflict"}
        </span>
      </div>

      {/* AI text content */}
      {editingText !== null ? (
        <textarea
          className="w-full text-sm text-[var(--text-primary)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded p-2 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-y"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          rows={3}
        />
      ) : (
        <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
      )}

      {/* Action items from AI */}
      {interpretation.actionItems.length > 0 && editingText === null && (
        <div className="mt-2 pt-2 border-t border-[var(--border-default)]/50">
          <div className="text-[10px] font-medium text-[var(--text-muted)] uppercase mb-1">
            Suggested Actions
          </div>
          <ul className="space-y-0.5">
            {interpretation.actionItems.map((item, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1">
                <span className="text-[var(--accent-primary)] mt-0.5">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--border-default)]/50">
        {/* Accept button */}
        {!isAccepted && !isEdited && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-[var(--color-success)]/40 text-[var(--color-success-text)] hover:bg-[var(--color-success-light)]"
            onClick={() => {
              if (editingText !== null) {
                // If edited text, mark as edited
                setEditingText(null)
                onEdit()
              } else {
                onAccept()
              }
            }}
          >
            <Check className="h-3 w-3" />
            {editingText !== null ? "Save" : "Accept"}
          </Button>
        )}

        {/* Edit button */}
        {editingText === null && !isEdited && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-[color:var(--color-domain-pharmacotherapy)]/40 text-[color:var(--color-domain-pharmacotherapy)] hover:bg-[color:var(--color-domain-pharmacotherapy)]/10"
            onClick={() => setEditingText(interpretation.text)}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
        )}

        {/* Cancel edit */}
        {editingText !== null && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setEditingText(null)}
          >
            Cancel
          </Button>
        )}

        {/* Flag button */}
        {!isAccepted && !isEdited && sectionState !== "needs_review" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-[var(--color-warning)] hover:bg-[var(--color-warning-light)]"
            onClick={onFlag}
          >
            <AlertTriangle className="h-3 w-3" />
            Flag
          </Button>
        )}

        {/* Toggle raw fields */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs ml-auto text-[var(--text-muted)]"
          onClick={onToggleFields}
        >
          {showFields ? "Hide Fields" : "Show Fields"}
        </Button>
      </div>
    </div>
  )
}
