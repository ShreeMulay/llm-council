import { useEncounterStore } from "@/stores/encounter"
import { THEME_PRESETS, type ThemeId } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { Sun, Moon, Eye, Minimize2 } from "lucide-react"

const THEME_ICONS: Record<ThemeId, typeof Sun> = {
  "clinical-light": Sun,
  "clinical-dark": Moon,
  "high-contrast": Eye,
  compact: Minimize2,
}

const THEME_ORDER: ThemeId[] = [
  "clinical-light",
  "clinical-dark",
  "high-contrast",
  "compact",
]

export function ThemeSwitcher() {
  const currentTheme = useEncounterStore((s) => s.theme)
  const setTheme = useEncounterStore((s) => s.setTheme)

  // Cycle through themes on click
  const cycleTheme = () => {
    const currentIndex = THEME_ORDER.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length
    setTheme(THEME_ORDER[nextIndex])
  }

  const Icon = THEME_ICONS[currentTheme]
  const preset = THEME_PRESETS[currentTheme]

  return (
    <button
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded",
        "transition-colors",
        "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
        "hover:bg-[var(--bg-surface-sunken)]"
      )}
      onClick={cycleTheme}
      title={`Theme: ${preset.name} (click to cycle)`}
      aria-label={`Current theme: ${preset.name}. Click to switch theme.`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

/** Expanded theme picker for settings/command palette */
export function ThemePicker() {
  const currentTheme = useEncounterStore((s) => s.theme)
  const setTheme = useEncounterStore((s) => s.setTheme)

  return (
    <div className="grid grid-cols-2 gap-2">
      {THEME_ORDER.map((themeId) => {
        const preset = THEME_PRESETS[themeId]
        const Icon = THEME_ICONS[themeId]
        const isActive = currentTheme === themeId

        return (
          <button
            key={themeId}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-left text-sm transition-all",
              isActive
                ? "border-[var(--accent-primary)] bg-[var(--color-info-light)] text-[var(--accent-primary)]"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-sunken)]"
            )}
            onClick={() => setTheme(themeId)}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium text-xs">{preset.name}</div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {preset.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
