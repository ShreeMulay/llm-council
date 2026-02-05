import { cn } from "@/lib/utils"
import type { SparklinePoint } from "@/types/schema"

interface SparklineProps {
  data: SparklinePoint[]
  color?: string
  /** Height in pixels */
  height?: number
  /** Width in pixels */
  width?: number
  /** Target range - renders as a light band */
  targetLow?: number
  targetHigh?: number
  /** Show value label at the end */
  showEndLabel?: boolean
  unit?: string
  className?: string
}

export function Sparkline({
  data,
  color = "#3B82F6",
  height = 24,
  width = 80,
  targetLow,
  targetHigh,
  showEndLabel = false,
  unit,
  className,
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <span className={cn("text-[10px] text-gray-400", className)}>
        --
      </span>
    )
  }

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Add 10% padding
  const padMin = min - range * 0.1
  const padMax = max + range * 0.1
  const padRange = padMax - padMin

  // Calculate points for the polyline
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width
      const y = height - ((v - padMin) / padRange) * height
      return `${x},${y}`
    })
    .join(" ")

  // Last value for end label
  const lastValue = values[values.length - 1]

  // Target band coordinates
  let targetBandY1 = 0
  let targetBandH = 0
  if (targetLow !== undefined && targetHigh !== undefined) {
    targetBandY1 = height - ((targetHigh - padMin) / padRange) * height
    const targetBandY2 = height - ((targetLow - padMin) / padRange) * height
    targetBandH = targetBandY2 - targetBandY1
  }

  // Determine if last point is out of target range
  const outOfRange =
    targetLow !== undefined && targetHigh !== undefined
      ? lastValue < targetLow || lastValue > targetHigh
      : false

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Target range band */}
        {targetLow !== undefined && targetHigh !== undefined && (
          <rect
            x={0}
            y={targetBandY1}
            width={width}
            height={targetBandH}
            fill="#10B981"
            opacity={0.1}
            rx={1}
          />
        )}

        {/* Trend line */}
        <polyline
          points={points}
          fill="none"
          stroke={outOfRange ? "#EF4444" : color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* End dot */}
        {(() => {
          const lastX = width
          const lastY =
            height - ((lastValue - padMin) / padRange) * height
          return (
            <circle
              cx={lastX}
              cy={lastY}
              r={2}
              fill={outOfRange ? "#EF4444" : color}
            />
          )
        })()}
      </svg>

      {showEndLabel && (
        <span
          className={cn(
            "text-[10px] font-medium tabular-nums",
            outOfRange ? "text-red-600" : "text-gray-600"
          )}
        >
          {lastValue}
          {unit ? ` ${unit}` : ""}
        </span>
      )}
    </span>
  )
}

/** Pre-configured sparklines for common CKD metrics */
export const METRIC_SPARKLINE_CONFIGS = {
  egfr: {
    color: "#3B82F6",
    targetLow: 15,
    targetHigh: 90,
    unit: "mL/min",
  },
  potassium: {
    color: "#F59E0B",
    targetLow: 3.5,
    targetHigh: 5.0,
    unit: "mEq/L",
  },
  uacr: {
    color: "#8B5CF6",
    targetLow: 0,
    targetHigh: 30,
    unit: "mg/g",
  },
  systolic_bp: {
    color: "#EF4444",
    targetLow: 110,
    targetHigh: 130,
    unit: "mmHg",
  },
  hemoglobin: {
    color: "#EC4899",
    targetLow: 10,
    targetHigh: 12,
    unit: "g/dL",
  },
  bicarbonate: {
    color: "#14B8A6",
    targetLow: 22,
    targetHigh: 29,
    unit: "mEq/L",
  },
} as const
