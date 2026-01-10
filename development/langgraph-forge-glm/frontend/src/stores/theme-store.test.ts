import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useThemeStore } from "./theme-store"

describe("useThemeStore", () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ""
  })

  afterEach(() => {
    localStorage.clear()
    document.documentElement.className = ""
  })

  describe("test_default_theme", () => {
    it("should default to light theme", () => {
      const { result } = renderHook(() => useThemeStore())
      expect(result.current.theme).toBe("light")
    })
  })

  describe("test_change_theme", () => {
    it("should change theme when setTheme is called", () => {
      const { result } = renderHook(() => useThemeStore())

      act(() => {
        result.current.setTheme("dark")
      })

      expect(result.current.theme).toBe("dark")
    })

    it("should apply correct CSS class for each theme", () => {
      const { result } = renderHook(() => useThemeStore())

      const themes: Array<"light" | "dark" | "midnight" | "forest" | "ocean" | "sunset" | "high-contrast"> = [
        "light", "dark", "midnight", "forest", "ocean", "sunset", "high-contrast"
      ]
      const classNames = ["", "dark", "theme-midnight", "theme-forest", "theme-ocean", "theme-sunset", "theme-high-contrast"]

      themes.forEach((theme, index) => {
        act(() => {
          result.current.setTheme(theme)
        })

        if (index === 0) {
          expect(document.documentElement.className).not.toContain("theme-")
          expect(document.documentElement.className).not.toContain("dark")
        } else {
          expect(document.documentElement.className).toContain(classNames[index])
        }
      })
    })
  })

  describe("test_persist_theme", () => {
    it("should save theme choice to localStorage", () => {
      const { result } = renderHook(() => useThemeStore())

      act(() => {
        result.current.setTheme("ocean")
      })

      expect(localStorage.getItem("theme")).toBe("ocean")
    })

    it("should remove other theme classes when switching", () => {
      const { result } = renderHook(() => useThemeStore())

      act(() => {
        result.current.setTheme("dark")
      })
      expect(document.documentElement.className).toContain("dark")

      act(() => {
        result.current.setTheme("ocean")
      })
      expect(document.documentElement.className).toContain("theme-ocean")
      expect(document.documentElement.className).not.toContain("dark")
    })
  })
})