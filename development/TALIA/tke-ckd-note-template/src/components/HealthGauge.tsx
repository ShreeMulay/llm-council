import { cn } from "@/lib/utils"

interface HealthGaugeProps {
  /** Current value */
  value: number
  /** Descriptive label */
  label: string
  /** Simple explanation (6th grade reading level) */
  description: string
  /** Gauge zones: green if within good range */
  zones: {
    greenLow: number
    greenHigh: number
    yellowLow: number
    yellowHigh: number
    min: number
    max: number
  }
  /** Unit for display */
  unit?: string
  /** Higher is better (eGFR) vs lower is better (UACR) */
  higherIsBetter?: boolean
}

function getZoneColor(
  value: number,
  zones: HealthGaugeProps["zones"]
): "green" | "yellow" | "red" {
  if (value >= zones.greenLow && value <= zones.greenHigh) return "green"
  if (value >= zones.yellowLow && value <= zones.yellowHigh) return "yellow"
  return "red"
}

function getZoneLabel(color: "green" | "yellow" | "red"): string {
  switch (color) {
    case "green": return "Good"
    case "yellow": return "Watch"
    case "red": return "Needs Attention"
  }
}

const ZONE_STYLES: Record<"green" | "yellow" | "red", { bg: string; text: string; ring: string; emoji: string }> = {
  green: { bg: "bg-green-100", text: "text-green-700", ring: "ring-green-300", emoji: "" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-yellow-300", emoji: "" },
  red: { bg: "bg-red-100", text: "text-red-700", ring: "ring-red-300", emoji: "" },
}

export function HealthGauge({
  value,
  label,
  description,
  zones,
  unit,
  higherIsBetter: _higherIsBetter = true,
}: HealthGaugeProps) {
  const zone = getZoneColor(value, zones)
  const zoneLabel = getZoneLabel(zone)
  const styles = ZONE_STYLES[zone]

  // Calculate progress position (0-100%)
  const range = zones.max - zones.min
  const position = Math.max(0, Math.min(100, ((value - zones.min) / range) * 100))

  return (
    <div className={cn("rounded-xl p-4 ring-1", styles.bg, styles.ring)}>
      {/* Label + Zone indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", styles.bg, styles.text)}>
          {styles.emoji} {zoneLabel}
        </span>
      </div>

      {/* Visual gauge bar */}
      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        {/* Green zone */}
        <div
          className="absolute h-full bg-green-300 opacity-50"
          style={{
            left: `${((zones.greenLow - zones.min) / range) * 100}%`,
            width: `${((zones.greenHigh - zones.greenLow) / range) * 100}%`,
          }}
        />
        {/* Current value marker */}
        <div
          className={cn(
            "absolute top-0 h-full w-1 rounded-full",
            zone === "green" ? "bg-green-600" : zone === "yellow" ? "bg-yellow-600" : "bg-red-600"
          )}
          style={{ left: `${position}%` }}
        />
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className={cn("text-2xl font-bold", styles.text)}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-gray-500">{unit}</span>
        )}
      </div>

      {/* Simple description */}
      <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
