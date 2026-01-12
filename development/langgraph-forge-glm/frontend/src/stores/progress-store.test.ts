import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { progressStore, type ProgressState } from "./progress-store"

const STORAGE_KEY = "langgraph-forge-progress"

describe("progress-store", () => {
  beforeEach(() => {
    localStorage.clear()
    progressStore.reset()
  })

  afterEach(() => {
    localStorage.clear()
    progressStore.reset()
  })

  describe("initial state", () => {
    it("starts with empty completed set", () => {
      const state = progressStore.getState()
      expect(state.completed).toEqual(new Set())
      expect(state.getCompletedCount()).toBe(0)
    })

    it("loads from localStorage if data exists", () => {
      const savedData = ["01-hello-state", "02-two-nodes"]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedData))

      const newStore = progressStore.getState()
      expect(newStore.completed).toEqual(new Set(savedData))
      expect(newStore.getCompletedCount()).toBe(2)
    })
  })

  describe("markComplete", () => {
    it("marks an example as completed", () => {
      const { markComplete, completed } = progressStore.getState()

      markComplete("01-hello-state")

      expect(completed.has("01-hello-state")).toBe(true)
    })

    it("persists to localStorage", () => {
      const { markComplete } = progressStore.getState()

      markComplete("01-hello-state")

      const saved = localStorage.getItem(STORAGE_KEY)
      expect(saved).toContain("01-hello-state")
    })

    it("increases completed count", () => {
      const { markComplete, getCompletedCount } = progressStore.getState()

      expect(getCompletedCount()).toBe(0)
      markComplete("01-hello-state")
      expect(getCompletedCount()).toBe(1)
      markComplete("02-two-nodes")
      expect(getCompletedCount()).toBe(2)
    })

    it("does not duplicate when marking same example twice", () => {
      const { markComplete, getCompletedCount } = progressStore.getState()

      markComplete("01-hello-state")
      markComplete("01-hello-state")

      expect(getCompletedCount()).toBe(1)
    })

    it("triggers re-render when marking complete", () => {
      const { markComplete, completed } = progressStore.getState()
      let renderCount = 0

      progressStore.subscribe(() => {
        renderCount += 1
      })

      markComplete("01-hello-state")

      expect(renderCount).toBeGreaterThan(0)
      expect(completed.has("01-hello-state")).toBe(true)
    })
  })

  describe("markIncomplete", () => {
    beforeEach(() => {
      const { markComplete } = progressStore.getState()
      markComplete("01-hello-state")
      markComplete("02-two-nodes")
    })

    it("removes example from completed set", () => {
      const { markIncomplete, completed } = progressStore.getState()

      markIncomplete("01-hello-state")

      expect(completed.has("01-hello-state")).toBe(false)
      expect(completed.has("02-two-nodes")).toBe(true)
    })

    it("persists to localStorage", () => {
      const { markIncomplete } = progressStore.getState()

      markIncomplete("01-hello-state")

      const saved = localStorage.getItem(STORAGE_KEY)
      expect(saved).not.toContain("01-hello-state")
      expect(saved).toContain("02-two-nodes")
    })

    it("decreases completed count", () => {
      const { markIncomplete, getCompletedCount } = progressStore.getState()

      expect(getCompletedCount()).toBe(2)
      markIncomplete("01-hello-state")
      expect(getCompletedCount()).toBe(1)
    })

    it("does nothing if example not completed", () => {
      const { markIncomplete, getCompletedCount, markComplete } = progressStore.getState()

      markIncomplete("03-llm-node")

      expect(getCompletedCount()).toBe(2)
      markComplete("03-llm-node")
      expect(getCompletedCount()).toBe(3)
    })
  })

  describe("toggleComplete", () => {
    it("marks complete if not completed", () => {
      const { toggleComplete, completed, isCompleted } = progressStore.getState()

      expect(isCompleted("01-hello-state")).toBe(false)
      toggleComplete("01-hello-state")
      expect(isCompleted("01-hello-state")).toBe(true)
      expect(completed.has("01-hello-state")).toBe(true)
    })

    it("marks incomplete if already completed", () => {
      const { toggleComplete, completed } = progressStore.getState()

      completed.add("01-hello-state")
      toggleComplete("01-hello-state")

      expect(completed.has("01-hello-state")).toBe(false)
    })
  })

  describe("isCompleted", () => {
    it("returns false for uncompleted examples", () => {
      const { isCompleted } = progressStore.getState()

      expect(isCompleted("01-hello-state")).toBe(false)
    })

    it("returns true for completed examples", () => {
      const { markComplete, isCompleted } = progressStore.getState()

      markComplete("01-hello-state")

      expect(isCompleted("01-hello-state")).toBe(true)
    })
  })

  describe("getCompletedCount", () => {
    it("returns 0 initially", () => {
      const { getCompletedCount } = progressStore.getState()

      expect(getCompletedCount()).toBe(0)
    })

    it("returns correct count after multiple completions", () => {
      const { markComplete, getCompletedCount } = progressStore.getState()

      markComplete("01-hello-state")
      markComplete("02-two-nodes")
      markComplete("03-llm-node")

      expect(getCompletedCount()).toBe(3)
    })

    it("reflects removals correctly", () => {
      const { markComplete, markIncomplete, getCompletedCount } = progressStore.getState()

      markComplete("01-hello-state")
      markComplete("02-two-nodes")
      markComplete("03-llm-node")

      expect(getCompletedCount()).toBe(3)

      markIncomplete("02-two-nodes")

      expect(getCompletedCount()).toBe(2)
    })
  })

  describe("reset", () => {
    beforeEach(() => {
      const { markComplete } = progressStore.getState()
      markComplete("01-hello-state")
      markComplete("02-two-nodes")
    })

    it("clears all completed examples", () => {
      const { reset, completed, getCompletedCount } = progressStore.getState()

      expect(getCompletedCount()).toBe(2)

      reset()

      expect(completed.size).toBe(0)
      expect(getCompletedCount()).toBe(0)
    })

    it("clears localStorage", () => {
      const { reset } = progressStore.getState()

      reset()

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe("persistence edge cases", () => {
    it("handles corrupted localStorage data gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "not valid json")

      const { getCompletedCount } = progressStore.getState()

      expect(getCompletedCount()).toBe(0)
    })

    it("handles null localStorage data", () => {
      localStorage.removeItem(STORAGE_KEY)

      const { getCompletedCount } = progressStore.getState()

      expect(getCompletedCount()).toBe(0)
    })
  })
})