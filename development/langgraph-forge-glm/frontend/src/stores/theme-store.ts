import { create } from "zustand"

export type Theme = "light" | "dark" | "midnight" | "forest" | "ocean" | "sunset" | "high-contrast"

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "theme"

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "light"
  }

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && saved !== "light" && saved !== "dark" && saved !== "midnight" && saved !== "forest" && saved !== "ocean" && saved !== "sunset" && saved !== "high-contrast") {
    return "light"
  }
  return (saved as Theme) || "light"
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, theme)
    }

    if (typeof document !== "undefined") {
      const root = document.documentElement
      root.classList.remove("dark", "theme-midnight", "theme-forest", "theme-ocean", "theme-sunset", "theme-high-contrast")

      if (theme !== "light") {
        root.classList.add(theme === "dark" ? "dark" : `theme-${theme}`)
      }
    }

    set({ theme })
  },
}))