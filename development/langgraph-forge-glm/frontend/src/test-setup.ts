import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"
import { JSDOM } from "jsdom"

const jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost:3000",
})

global.window = jsdom.window
global.document = jsdom.window.document
global.navigator = jsdom.window.navigator
global.HTMLElement = jsdom.window.HTMLElement
global.HTMLCanvasElement = jsdom.window.HTMLCanvasElement
global.localStorage = jsdom.window.localStorage
global.sessionStorage = jsdom.window.sessionStorage

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