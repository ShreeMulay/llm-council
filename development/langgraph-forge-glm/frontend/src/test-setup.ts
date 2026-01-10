import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import { BrowserRouter } from "react-router-dom"

afterEach(() => {
  cleanup()
})

global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
}
