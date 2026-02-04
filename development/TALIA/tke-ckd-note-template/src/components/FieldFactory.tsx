import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn, formatValue } from "@/lib/utils"
import type { Field, FieldValue, EnumDefinition } from "@/types/schema"

interface FieldFactoryProps {
  field: Field
  value: FieldValue
  previousValue?: FieldValue
  onChange: (value: FieldValue) => void
  isDeltaMode: boolean
  enumDefinitions: Record<string, EnumDefinition>
  disabled?: boolean
}

export function FieldFactory({
  field,
  value,
  previousValue,
  onChange,
  isDeltaMode,
  enumDefinitions,
  disabled = false,
}: FieldFactoryProps) {
  const hasChanged = isDeltaMode && value !== previousValue && previousValue !== undefined

  const wrapperClass = cn(
    "space-y-1",
    hasChanged && "delta-changed p-2 rounded-md"
  )

  const renderDelta = () => {
    if (!hasChanged) return null
    return (
      <div className="text-xs">
        <span className="delta-value-old">{formatValue(previousValue as string | number, field.unit ?? undefined)}</span>
        <span className="mx-1">→</span>
        <span className="delta-value-new">{formatValue(value as string | number, field.unit ?? undefined)}</span>
      </div>
    )
  }

  switch (field.type) {
    case "number":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-gray-700">{field.display_name}</label>
          <Input
            type="number"
            value={value as number ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
            unit={field.unit ?? undefined}
            disabled={disabled}
            placeholder={field.target_range ?? undefined}
            className="max-w-[200px]"
          />
          {renderDelta()}
          {field.target_range && (
            <span className="text-xs text-gray-500">Target: {field.target_range}</span>
          )}
        </div>
      )

    case "enum":
      const enumDef = field.enum_ref ? enumDefinitions[field.enum_ref] : null
      const options = enumDef?.values ?? []
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-gray-700">{field.display_name}</label>
          <select
            value={value as string ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="flex h-9 w-full max-w-[250px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">-- Select --</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {renderDelta()}
        </div>
      )

    case "text":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-gray-700">{field.display_name}</label>
          <Input
            type="text"
            value={value as string ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="max-w-[400px]"
          />
          {renderDelta()}
        </div>
      )

    case "date":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-gray-700">{field.display_name}</label>
          <Input
            type="date"
            value={value as string ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="max-w-[180px]"
          />
          {renderDelta()}
        </div>
      )

    case "boolean":
      return (
        <div className={cn(wrapperClass, "flex items-center gap-2")}>
          <input
            type="checkbox"
            checked={value as boolean ?? false}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label className="text-sm font-medium text-gray-700">{field.display_name}</label>
          {hasChanged && (
            <Badge variant="warning" className="text-xs">Changed</Badge>
          )}
        </div>
      )

    case "calculated":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-gray-700">{field.display_name}</label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {formatValue(value as string | number, field.unit ?? undefined)}
            </Badge>
            {field.target_range && (
              <span className="text-xs text-gray-500">Target: {field.target_range}</span>
            )}
          </div>
          {renderDelta()}
        </div>
      )

    default:
      return (
        <div className="text-sm text-red-500">
          Unknown field type: {field.type}
        </div>
      )
  }
}
