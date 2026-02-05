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
      ? "bg-green-500"
      : confidence >= 0.5
        ? "bg-yellow-500"
        : "bg-red-500"
  const label =
    confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low"

  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
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
        isDraft && "border-dashed border-blue-300 bg-blue-50/50",
        // Accepted: solid green
        isAccepted && "border-solid border-green-400 bg-green-50/30",
        // Edited: solid purple
        isEdited && "border-solid border-purple-400 bg-purple-50/30",
        // Critical: red
        sectionState === "critical" && "border-solid border-red-400 bg-red-50/30",
        // Conflict: orange
        sectionState === "conflict" && "border-solid border-orange-400 bg-orange-50/30"
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs font-medium text-gray-700">
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
            isDraft && "bg-blue-100 text-blue-700",
            isAccepted && "bg-green-100 text-green-700",
            isEdited && "bg-purple-100 text-purple-700",
            sectionState === "critical" && "bg-red-100 text-red-700",
            sectionState === "conflict" && "bg-orange-100 text-orange-700",
            sectionState === "needs_review" && "bg-yellow-100 text-yellow-700"
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
          className="w-full text-sm text-gray-800 bg-white border border-gray-200 rounded p-2 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          rows={3}
        />
      ) : (
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
      )}

      {/* Action items from AI */}
      {interpretation.actionItems.length > 0 && editingText === null && (
        <div className="mt-2 pt-2 border-t border-gray-200/50">
          <div className="text-[10px] font-medium text-gray-500 uppercase mb-1">
            Suggested Actions
          </div>
          <ul className="space-y-0.5">
            {interpretation.actionItems.map((item, i) => (
              <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                <span className="text-blue-400 mt-0.5">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200/50">
        {/* Accept button */}
        {!isAccepted && !isEdited && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
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
            className="h-7 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50"
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
            className="h-7 text-xs gap-1 text-amber-600 hover:bg-amber-50"
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
          className="h-7 text-xs ml-auto text-gray-400"
          onClick={onToggleFields}
        >
          {showFields ? "Hide Fields" : "Show Fields"}
        </Button>
      </div>
    </div>
  )
}
