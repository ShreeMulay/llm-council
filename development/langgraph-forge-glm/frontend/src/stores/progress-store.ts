import { create } from "zustand"
import { persist } from "zustand/middleware"

const STORAGE_KEY = "langgraph-forge-progress"

interface ProgressState {
  completed: Set<string>
  markComplete: (exampleId: string) => void
  markIncomplete: (exampleId: string) => void
  toggleComplete: (exampleId: string) => void
  isCompleted: (exampleId: string) => boolean
  getCompletedCount: () => number
  reset: () => void
}

const loadFromStorage = (): Set<string> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return new Set(parsed)
    }
  } catch {
    return new Set()
  }
  return new Set()
}

const initialCompleted = loadFromStorage()

export const progressStore = create<ProgressState>((set) => ({
  completed: initialCompleted,

  markComplete: (exampleId) => {
    set((state) => {
      const newCompleted = new Set(state.completed)
      if (!newCompleted.has(exampleId)) {
        newCompleted.add(exampleId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...newCompleted]))
      }
      return { completed: newCompleted }
    })
  },

  markIncomplete: (exampleId) => {
    set((state) => {
      const newCompleted = new Set(state.completed)
      if (newCompleted.has(exampleId)) {
        newCompleted.delete(exampleId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...newCompleted]))
      }
      return { completed: newCompleted }
    })
  },

  toggleComplete: (exampleId) => {
    set((state) => {
      const newCompleted = new Set(state.completed)
      if (newCompleted.has(exampleId)) {
        newCompleted.delete(exampleId)
      } else {
        newCompleted.add(exampleId)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newCompleted]))
      return { completed: newCompleted }
    })
  },

  isCompleted: (exampleId) => {
    return progressStore.getState().completed.has(exampleId)
  },

  getCompletedCount: () => {
    return progressStore.getState().completed.size
  },

  reset: () => {
    set({ completed: new Set() })
    localStorage.removeItem(STORAGE_KEY)
  },
}))