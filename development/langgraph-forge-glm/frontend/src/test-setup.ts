import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

// JSDOM globals are automatically set by vitest environment: "jsdom"
// Do not manually set them here

afterEach(() => {
  cleanup()
})

global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any