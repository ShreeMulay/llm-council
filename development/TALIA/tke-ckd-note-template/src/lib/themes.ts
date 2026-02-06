/**
 * TKE Clinical Theme System
 *
 * 4 theme presets designed for clinical environments:
 * - Clinical Light: Warm, professional, low-fatigue for daytime shifts
 * - Clinical Dark: Deep ink surfaces for reading rooms and night shifts
 * - High Contrast: WCAG AAA compliant, maximum readability
 * - Compact: Dense information display for power users
 */

export type ThemeId = "clinical-light" | "clinical-dark" | "high-contrast" | "compact"

export interface ThemePreset {
  id: ThemeId
  name: string
  description: string
  /** CSS class applied to <html> for dark mode detection */
  isDark: boolean
  variables: Record<string, string>
  /** Domain colors adjusted for this theme's background */
  domainColors: Record<string, string>
}

/** All 4 theme presets */
export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  "clinical-light": {
    id: "clinical-light",
    name: "Clinical Light",
    description: "Warm, professional, low-fatigue for daytime shifts",
    isDark: false,
    variables: {
      // Surfaces
      "--bg-app": "#FBFBFA",
      "--bg-surface": "#FFFFFF",
      "--bg-surface-raised": "#FFFFFF",
      "--bg-surface-sunken": "#F3F4F6",
      // Text
      "--text-primary": "#111827",
      "--text-secondary": "#4B5563",
      "--text-muted": "#9CA3AF",
      // Borders
      "--border-default": "#E5E7EB",
      "--border-subtle": "#F3F4F6",
      "--border-strong": "#D1D5DB",
      // Accent
      "--accent-primary": "#3B82F6",
      "--accent-primary-hover": "#2563EB",
      "--accent-primary-text": "#FFFFFF",
      // Shadows
      "--shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      "--shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)",
      "--shadow-lg": "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)",
      // Focus
      "--ring-focus": "rgba(59, 130, 246, 0.5)",
      // Radii
      "--radius-sm": "0.375rem",
      "--radius-md": "0.5rem",
      "--radius-lg": "0.75rem",
      // Transitions
      "--transition-fast": "100ms ease",
      "--transition-normal": "200ms ease-in-out",
      // Typography
      "--font-sans": "'Inter', system-ui, -apple-system, sans-serif",
      "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",
      // Semantic status colors
      "--color-success": "#10B981",
      "--color-success-light": "#ECFDF5",
      "--color-success-text": "#065F46",
      "--color-warning": "#F59E0B",
      "--color-warning-light": "#FFFBEB",
      "--color-warning-text": "#92400E",
      "--color-error": "#EF4444",
      "--color-error-light": "#FEF2F2",
      "--color-error-text": "#991B1B",
      "--color-info": "#3B82F6",
      "--color-info-light": "#EFF6FF",
      "--color-info-text": "#1E40AF",
      // Overlay
      "--overlay-bg": "rgba(0, 0, 0, 0.5)",
      // Spacing scale (base)
      "--space-unit": "0.25rem",
      "--font-size-base": "0.875rem",
      "--font-size-xs": "0.75rem",
      "--font-size-sm": "0.8125rem",
    },
    domainColors: {
      kidney_core: "#3B82F6",
      cardiovascular: "#EF4444",
      pharmacotherapy: "#8B5CF6",
      metabolic: "#F97316",
      ckd_complications: "#1E40AF",
      risk_mitigation: "#22C55E",
      planning: "#6B7280",
      screening: "#14B8A6",
      care_coordination: "#EC4899",
    },
  },

  "clinical-dark": {
    id: "clinical-dark",
    name: "Clinical Dark",
    description: "Deep ink surfaces for reading rooms and night shifts",
    isDark: true,
    variables: {
      // Surfaces
      "--bg-app": "#0B0F1A",
      "--bg-surface": "#161B2B",
      "--bg-surface-raised": "#1E2538",
      "--bg-surface-sunken": "#090D16",
      // Text
      "--text-primary": "#F1F5F9",
      "--text-secondary": "#94A3B8",
      "--text-muted": "#64748B",
      // Borders
      "--border-default": "#2D3748",
      "--border-subtle": "#1E293B",
      "--border-strong": "#475569",
      // Accent
      "--accent-primary": "#60A5FA",
      "--accent-primary-hover": "#93C5FD",
      "--accent-primary-text": "#0B0F1A",
      // Shadows
      "--shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.4)",
      "--shadow-md": "0 4px 6px -1px rgb(0 0 0 / 0.35)",
      "--shadow-lg": "0 10px 15px -3px rgb(0 0 0 / 0.4)",
      // Focus
      "--ring-focus": "rgba(96, 165, 250, 0.4)",
      // Radii
      "--radius-sm": "0.375rem",
      "--radius-md": "0.5rem",
      "--radius-lg": "0.75rem",
      // Transitions
      "--transition-fast": "100ms ease",
      "--transition-normal": "200ms ease-in-out",
      // Typography
      "--font-sans": "'Inter', system-ui, -apple-system, sans-serif",
      "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",
      // Semantic status colors (brighter for dark bg)
      "--color-success": "#4ADE80",
      "--color-success-light": "rgba(74, 222, 128, 0.12)",
      "--color-success-text": "#86EFAC",
      "--color-warning": "#FBBF24",
      "--color-warning-light": "rgba(251, 191, 36, 0.12)",
      "--color-warning-text": "#FDE68A",
      "--color-error": "#F87171",
      "--color-error-light": "rgba(248, 113, 113, 0.12)",
      "--color-error-text": "#FCA5A5",
      "--color-info": "#60A5FA",
      "--color-info-light": "rgba(96, 165, 250, 0.12)",
      "--color-info-text": "#93C5FD",
      // Overlay
      "--overlay-bg": "rgba(0, 0, 0, 0.7)",
      // Spacing scale (base)
      "--space-unit": "0.25rem",
      "--font-size-base": "0.875rem",
      "--font-size-xs": "0.75rem",
      "--font-size-sm": "0.8125rem",
    },
    domainColors: {
      kidney_core: "#60A5FA",
      cardiovascular: "#F87171",
      pharmacotherapy: "#A78BFA",
      metabolic: "#FB923C",
      ckd_complications: "#3B82F6",
      risk_mitigation: "#4ADE80",
      planning: "#94A3B8",
      screening: "#2DD4BF",
      care_coordination: "#F472B6",
    },
  },

  "high-contrast": {
    id: "high-contrast",
    name: "High Contrast",
    description: "WCAG AAA compliant, maximum readability",
    isDark: false,
    variables: {
      // Surfaces
      "--bg-app": "#FFFFFF",
      "--bg-surface": "#FFFFFF",
      "--bg-surface-raised": "#FFFFFF",
      "--bg-surface-sunken": "#F5F5F5",
      // Text
      "--text-primary": "#000000",
      "--text-secondary": "#1A1A1A",
      "--text-muted": "#4A4A4A",
      // Borders
      "--border-default": "#000000",
      "--border-subtle": "#666666",
      "--border-strong": "#000000",
      // Accent
      "--accent-primary": "#0052CC",
      "--accent-primary-hover": "#003D99",
      "--accent-primary-text": "#FFFFFF",
      // Shadows (none for high contrast)
      "--shadow-sm": "none",
      "--shadow-md": "none",
      "--shadow-lg": "none",
      // Focus
      "--ring-focus": "#000000",
      // Radii (sharp for clarity)
      "--radius-sm": "0.125rem",
      "--radius-md": "0.25rem",
      "--radius-lg": "0.375rem",
      // Transitions (reduced motion)
      "--transition-fast": "0ms",
      "--transition-normal": "0ms",
      // Typography
      "--font-sans": "'Inter', system-ui, -apple-system, sans-serif",
      "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",
      // Semantic status colors (high contrast)
      "--color-success": "#006B3F",
      "--color-success-light": "#E6F5ED",
      "--color-success-text": "#004D2C",
      "--color-warning": "#B45309",
      "--color-warning-light": "#FFF8E1",
      "--color-warning-text": "#7C3A00",
      "--color-error": "#CC0000",
      "--color-error-light": "#FFE6E6",
      "--color-error-text": "#990000",
      "--color-info": "#0052CC",
      "--color-info-light": "#E6F0FF",
      "--color-info-text": "#003D99",
      // Overlay
      "--overlay-bg": "rgba(0, 0, 0, 0.75)",
      // Spacing scale (base)
      "--space-unit": "0.25rem",
      "--font-size-base": "1rem",
      "--font-size-xs": "0.875rem",
      "--font-size-sm": "0.9375rem",
    },
    domainColors: {
      kidney_core: "#0052CC",
      cardiovascular: "#CC0000",
      pharmacotherapy: "#6B21A8",
      metabolic: "#C2410C",
      ckd_complications: "#1E3A8A",
      risk_mitigation: "#166534",
      planning: "#374151",
      screening: "#0D9488",
      care_coordination: "#BE185D",
    },
  },

  compact: {
    id: "compact",
    name: "Compact",
    description: "Dense information display for power users",
    isDark: false,
    variables: {
      // Same surfaces as Clinical Light
      "--bg-app": "#F3F4F6",
      "--bg-surface": "#FFFFFF",
      "--bg-surface-raised": "#FFFFFF",
      "--bg-surface-sunken": "#E5E7EB",
      // Text
      "--text-primary": "#111827",
      "--text-secondary": "#4B5563",
      "--text-muted": "#9CA3AF",
      // Borders
      "--border-default": "#E5E7EB",
      "--border-subtle": "#F3F4F6",
      "--border-strong": "#D1D5DB",
      // Accent
      "--accent-primary": "#3B82F6",
      "--accent-primary-hover": "#2563EB",
      "--accent-primary-text": "#FFFFFF",
      // Shadows (minimal)
      "--shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.04)",
      "--shadow-md": "0 2px 4px -1px rgb(0 0 0 / 0.06)",
      "--shadow-lg": "0 4px 8px -2px rgb(0 0 0 / 0.06)",
      // Focus
      "--ring-focus": "rgba(59, 130, 246, 0.5)",
      // Radii (tighter)
      "--radius-sm": "0.25rem",
      "--radius-md": "0.375rem",
      "--radius-lg": "0.5rem",
      // Transitions
      "--transition-fast": "80ms ease",
      "--transition-normal": "150ms ease-in-out",
      // Typography
      "--font-sans": "'Inter', system-ui, -apple-system, sans-serif",
      "--font-mono": "'JetBrains Mono', 'Fira Code', monospace",
      // Semantic status colors (same as light)
      "--color-success": "#10B981",
      "--color-success-light": "#ECFDF5",
      "--color-success-text": "#065F46",
      "--color-warning": "#F59E0B",
      "--color-warning-light": "#FFFBEB",
      "--color-warning-text": "#92400E",
      "--color-error": "#EF4444",
      "--color-error-light": "#FEF2F2",
      "--color-error-text": "#991B1B",
      "--color-info": "#3B82F6",
      "--color-info-light": "#EFF6FF",
      "--color-info-text": "#1E40AF",
      // Overlay
      "--overlay-bg": "rgba(0, 0, 0, 0.5)",
      // Spacing scale (COMPACT - tighter)
      "--space-unit": "0.125rem",
      "--font-size-base": "0.8125rem",
      "--font-size-xs": "0.6875rem",
      "--font-size-sm": "0.75rem",
    },
    domainColors: {
      kidney_core: "#3B82F6",
      cardiovascular: "#EF4444",
      pharmacotherapy: "#8B5CF6",
      metabolic: "#F97316",
      ckd_complications: "#1E40AF",
      risk_mitigation: "#22C55E",
      planning: "#6B7280",
      screening: "#14B8A6",
      care_coordination: "#EC4899",
    },
  },
}

/** Default theme */
export const DEFAULT_THEME: ThemeId = "clinical-light"

/** Apply a theme to the document root */
export function applyTheme(themeId: ThemeId): void {
  const theme = THEME_PRESETS[themeId]
  if (!theme) return

  const root = document.documentElement

  // Set all CSS variables
  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value)
  }

  // Set domain colors
  for (const [domain, color] of Object.entries(theme.domainColors)) {
    root.style.setProperty(`--color-domain-${domain.replace(/_/g, "-")}`, color)
  }

  // Toggle dark class for Tailwind dark mode
  if (theme.isDark) {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }

  // Set data attribute for CSS selectors
  root.setAttribute("data-theme", themeId)

  // Persist to localStorage
  try {
    localStorage.setItem("tke-theme", themeId)
  } catch {
    // localStorage not available
  }
}

/** Get the saved theme from localStorage, or default */
export function getSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem("tke-theme") as ThemeId | null
    if (saved && THEME_PRESETS[saved]) return saved
  } catch {
    // localStorage not available
  }
  return DEFAULT_THEME
}

/** Get the current theme's domain color for a given domain */
export function getDomainColor(themeId: ThemeId, domain: string): string {
  const theme = THEME_PRESETS[themeId]
  return theme?.domainColors[domain] ?? "#6B7280"
}
