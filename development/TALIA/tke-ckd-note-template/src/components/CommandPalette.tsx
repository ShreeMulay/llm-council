import { useEffect, useMemo } from "react"
import { useEncounterStore } from "@/stores/encounter"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { DOMAIN_DISPLAY_NAMES } from "@/lib/utils"
import type { SectionRegistry, DomainGroup } from "@/types/schema"
import { LayoutDashboard, Eye, EyeOff } from "lucide-react"

interface CommandPaletteProps {
  sectionRegistry: SectionRegistry
}

const DOMAIN_COLORS: Record<string, string> = {
  header: "bg-gray-400",
  kidney_core: "bg-blue-500",
  cardiovascular: "bg-red-500",
  pharmacotherapy: "bg-purple-500",
  metabolic: "bg-orange-500",
  ckd_complications: "bg-blue-800",
  risk_mitigation: "bg-green-500",
  planning: "bg-gray-500",
  screening: "bg-teal-500",
  care_coordination: "bg-pink-500",
}

const DOMAIN_ORDER: DomainGroup[] = [
  "header",
  "kidney_core",
  "cardiovascular",
  "pharmacotherapy",
  "metabolic",
  "ckd_complications",
  "risk_mitigation",
  "planning",
  "screening",
  "care_coordination",
]

export function CommandPalette({ sectionRegistry }: CommandPaletteProps) {
  const open = useEncounterStore((s) => s.commandPaletteOpen)
  const setOpen = useEncounterStore((s) => s.setCommandPaletteOpen)
  const expandSection = useEncounterStore((s) => s.expandSection)
  const setDashboardOpen = useEncounterStore((s) => s.setDashboardOpen)
  const setViewMode = useEncounterStore((s) => s.setViewMode)
  const viewMode = useEncounterStore((s) => s.viewMode)

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(!open)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, setOpen])

  // Group sections by domain
  const sectionsByDomain = useMemo(() => {
    const map: Record<string, typeof sectionRegistry.sections> = {}
    for (const section of sectionRegistry.sections) {
      const d = section.domain_group
      if (!map[d]) map[d] = []
      map[d].push(section)
    }
    return map
  }, [sectionRegistry])

  function jumpToSection(sectionId: string) {
    expandSection(sectionId)
    setOpen(false)
    // Small delay so the section expands before scrolling
    requestAnimationFrame(() => {
      const el = document.getElementById(`section-${sectionId}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    })
  }

  function toggleViewMode() {
    setViewMode(viewMode === "baseline" ? "progression" : "baseline")
    setOpen(false)
  }

  function openDashboard() {
    setDashboardOpen(true)
    setOpen(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search sections, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={toggleViewMode}>
            {viewMode === "baseline" ? (
              <Eye className="h-4 w-4 mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )}
            Switch to{" "}
            {viewMode === "baseline" ? "Progression" : "Baseline"} view
          </CommandItem>
          <CommandItem onSelect={openDashboard}>
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Open Dashboard
          </CommandItem>
        </CommandGroup>

        {/* Sections grouped by domain */}
        {DOMAIN_ORDER.map((domain) => {
          const sections = sectionsByDomain[domain]
          if (!sections || sections.length === 0) return null
          const domainColor =
            DOMAIN_COLORS[domain] ?? "bg-gray-400"

          return (
            <CommandGroup
              key={domain}
              heading={DOMAIN_DISPLAY_NAMES[domain]}
            >
              {sections.map((section) => (
                <CommandItem
                  key={section.section_id}
                  value={`${section.section_number} ${section.display_name} ${DOMAIN_DISPLAY_NAMES[domain]}`}
                  onSelect={() => jumpToSection(section.section_id)}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${domainColor} mr-2 flex-shrink-0`}
                  />
                  <span className="text-xs text-gray-400 w-5 mr-1">
                    {section.section_number}.
                  </span>
                  {section.display_name}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}
