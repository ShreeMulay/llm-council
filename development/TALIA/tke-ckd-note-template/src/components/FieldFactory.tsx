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

/**
 * Delta indicator - gutter marker + "was X" subtext
 * Replaces the old yellow highlight / strikethrough pattern
 */
function DeltaMarker({
  field,
  previousValue,
  isCriticalChange,
}: {
  field: Field
  previousValue: FieldValue
  isCriticalChange: boolean
}) {
  const prevDisplay = formatValue(
    previousValue as string | number,
    field.unit ?? undefined
  )

  return (
    <div className="flex items-center gap-1 mt-0.5">
      {/* Gutter dot */}
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isCriticalChange ? "bg-[var(--color-error)]" : "bg-[var(--color-warning)]"
        )}
      />
      {/* "was X" subtext */}
      <span className="text-[10px] text-[var(--text-muted)]">
        was {prevDisplay}
      </span>
    </div>
  )
}

/** Check if a numeric change is >20% (critical threshold) */
function isCriticalNumericChange(
  current: FieldValue,
  previous: FieldValue
): boolean {
  if (typeof current !== "number" || typeof previous !== "number") return false
  if (previous === 0) return current !== 0
  return Math.abs((current - previous) / previous) > 0.2
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
  const hasChanged =
    isDeltaMode && value !== previousValue && previousValue !== undefined
  const criticalChange = hasChanged && isCriticalNumericChange(value, previousValue)

  // Gutter marker style: left border indicator
  const wrapperClass = cn(
    "space-y-1",
    hasChanged && "pl-2 border-l-2",
    hasChanged && (criticalChange ? "border-l-[var(--color-error)]" : "border-l-[var(--color-warning)]")
  )

  switch (field.type) {
    case "number":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {field.display_name}
          </label>
          <Input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            unit={field.unit ?? undefined}
            disabled={disabled}
            placeholder={field.target_range ?? undefined}
            className="max-w-[200px]"
          />
          {hasChanged && (
            <DeltaMarker
              field={field}
              previousValue={previousValue!}
              isCriticalChange={criticalChange}
            />
          )}
          {field.target_range && (
            <span className="text-xs text-[var(--text-muted)]">
              Target: {field.target_range}
            </span>
          )}
        </div>
      )

    case "enum": {
      const enumDef = field.enum_ref ? enumDefinitions[field.enum_ref] : null
      const options = enumDef?.values ?? []
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {field.display_name}
          </label>
          <select
            value={(value as string) ?? ""}
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
          {hasChanged && (
            <DeltaMarker
              field={field}
              previousValue={previousValue!}
              isCriticalChange={false}
            />
          )}
        </div>
      )
    }

    case "text":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {field.display_name}
          </label>
          <Input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="max-w-[400px]"
          />
          {hasChanged && (
            <DeltaMarker
              field={field}
              previousValue={previousValue!}
              isCriticalChange={false}
            />
          )}
        </div>
      )

    case "date":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {field.display_name}
          </label>
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            disabled={disabled}
            className="max-w-[180px]"
          />
          {hasChanged && (
            <DeltaMarker
              field={field}
              previousValue={previousValue!}
              isCriticalChange={false}
            />
          )}
        </div>
      )

    case "boolean":
      return (
        <div className={cn(wrapperClass, "flex items-center gap-2")}>
          <input
            type="checkbox"
            checked={(value as boolean) ?? false}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-[var(--border-strong)]"
          />
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {field.display_name}
          </label>
          {hasChanged && (
            <Badge variant="warning" className="text-xs">
              Changed
            </Badge>
          )}
        </div>
      )

    case "calculated":
      return (
        <div className={wrapperClass}>
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {field.display_name}
          </label>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {formatValue(value as string | number, field.unit ?? undefined)}
            </Badge>
            {field.target_range && (
              <span className="text-xs text-[var(--text-muted)]">
                Target: {field.target_range}
              </span>
            )}
          </div>
          {hasChanged && (
            <DeltaMarker
              field={field}
              previousValue={previousValue!}
              isCriticalChange={criticalChange}
            />
          )}
        </div>
      )

    default:
      return (
        <div className="text-sm text-[var(--color-error)]">
          Unknown field type: {field.type}
        </div>
      )
  }
}
