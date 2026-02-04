import { ChevronDown, ChevronRight } from "lucide-react"
import { FieldFactory } from "./FieldFactory"
import { Badge } from "@/components/ui/badge"
import { cn, DOMAIN_CSS_CLASSES } from "@/lib/utils"
import type { Section, EncounterData, EnumDefinition, DomainGroup } from "@/types/schema"

interface SectionCardProps {
  section: Section
  currentData: EncounterData
  previousData: EncounterData
  isExpanded: boolean
  onToggle: () => void
  onFieldChange: (fieldId: string, value: EncounterData[string]) => void
  isDeltaMode: boolean
  enumDefinitions: Record<string, EnumDefinition>
}

export function SectionCard({
  section,
  currentData,
  previousData,
  isExpanded,
  onToggle,
  onFieldChange,
  isDeltaMode,
  enumDefinitions,
}: SectionCardProps) {
  // Count changed fields
  const changedFields = section.fields.filter((f) => {
    const key = `${section.section_id}.${f.field_id}`
    return currentData[key] !== previousData[key] && previousData[key] !== undefined
  })

  // Generate 1-line summary for collapsed view
  const getSummary = () => {
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

  const domainClass = DOMAIN_CSS_CLASSES[section.domain_group as DomainGroup] ?? ""

  return (
    <div className={cn(
      "border rounded-lg bg-white shadow-sm overflow-hidden",
      "border-l-4",
      domainClass
    )}>
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
          <span className="font-medium text-gray-900">
            {section.section_number}. {section.display_name}
          </span>
          {section.visit_mode === "conditional" && (
            <Badge variant="outline" className="text-xs">Conditional</Badge>
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
        <div className="px-4 pb-3 text-sm text-gray-600 border-t border-gray-100">
          {isDeltaMode && changedFields.length === 0 ? (
            <span className="italic">Unchanged from previous visit</span>
          ) : (
            getSummary()
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {section.fields.map((field) => {
              const key = `${section.section_id}.${field.field_id}`
              return (
                <FieldFactory
                  key={field.field_id}
                  field={field}
                  value={currentData[key]}
                  previousValue={previousData[key]}
                  onChange={(val) => onFieldChange(field.field_id, val)}
                  isDeltaMode={isDeltaMode}
                  enumDefinitions={enumDefinitions}
                />
              )
            })}
          </div>

          {/* AI Interpretation placeholder */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <div className="text-xs font-medium text-blue-700 mb-1">AI Interpretation</div>
            <div className="text-sm text-blue-900 italic">
              {section.interpretation_prompt.slice(0, 100)}...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
