import { useEncounterStore } from "@/stores/encounter"
import { cn } from "@/lib/utils"
import { AlertCircle, TrendingUp, CircleDot, AlertTriangle } from "lucide-react"
import type { AttentionItem } from "@/types/schema"

const TYPE_CONFIG: Record<
  AttentionItem["type"],
  { icon: typeof AlertCircle; color: string; bg: string; label: string }
> = {
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200 hover:bg-red-100",
    label: "Critical",
  },
  changed: {
    icon: TrendingUp,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    label: "Changed",
  },
  gap: {
    icon: CircleDot,
    color: "text-yellow-600",
    bg: "bg-yellow-50 border-yellow-200 hover:bg-yellow-100",
    label: "Gap",
  },
  conflict: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    label: "Conflict",
  },
}

// Sort order: critical first, then changed, then conflict, then gap
const TYPE_PRIORITY: Record<AttentionItem["type"], number> = {
  critical: 0,
  changed: 1,
  conflict: 2,
  gap: 3,
}

export function NeedsAttention() {
  const items = useEncounterStore((s) => s.attentionItems)
  const expandSection = useEncounterStore((s) => s.expandSection)

  if (items.length === 0) return null

  const sorted = [...items].sort(
    (a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]
  )

  function handleClick(item: AttentionItem) {
    // Expand the section
    expandSection(item.section_id)
    // Scroll to it
    const el = document.getElementById(`section-${item.section_id}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="needs-attention mx-4 md:mx-6 mt-3 mb-1">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        Needs Attention ({items.length})
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((item) => {
          const config = TYPE_CONFIG[item.type]
          const Icon = config.icon
          return (
            <button
              key={item.id}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                config.bg
              )}
              onClick={() => handleClick(item)}
              title={`Click to jump to ${item.section_id}`}
            >
              <Icon className={cn("h-3 w-3 flex-shrink-0", config.color)} />
              <span className="truncate max-w-[200px]">{item.message}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
