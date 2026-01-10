import { create } from 'zustand'
import { apiClient } from '../lib/api-client'

export interface Metrics {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  tokensPerSecond: number
  costUsd: number
}

export interface GraphStructure {
  nodes: Array<{ id: string; type: string }>
  edges: Array<{ source: string; target: string; condition?: string }>
}

export interface ExecutionState {
  output: string
  error: string | null
  isLoading: boolean
  metrics: Metrics | null
  graphStructure: GraphStructure | null
}

interface ExecutionStore extends ExecutionState {
  execute: (provider: string, model: string, code: string, timeout?: number) => Promise<void>
  setOutput: (output: string) => void
  setError: (error: string | null) => void
  setMetrics: (metrics: Metrics | null) => void
  setGraphStructure: (structure: GraphStructure | null) => void
  reset: () => void
}

const initialState: ExecutionState = {
  output: '',
  error: null,
  isLoading: false,
  metrics: null,
  graphStructure: null,
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  ...initialState,

  execute: async (provider: string, model: string, code: string, timeout?: number) => {
    set({ isLoading: true, error: null })

    try {
      const response = await apiClient.execute(provider, model, code, timeout)

      if (response.success) {
        set({
          output: response.output,
          error: null,
          metrics: response.metrics,
          graphStructure: response.graphStructure,
          isLoading: false,
        })
      } else {
        set({
          output: '',
          error: response.error || 'Execution failed',
          metrics: null,
          graphStructure: null,
          isLoading: false,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      set({
        output: '',
        error: errorMessage,
        metrics: null,
        graphStructure: null,
        isLoading: false,
      })
    }
  },

  setOutput: (output: string) => set({ output }),
  setError: (error: string | null) => set({ error }),
  setMetrics: (metrics: Metrics | null) => set({ metrics }),
  setGraphStructure: (structure: GraphStructure | null) => set({ graphStructure: structure }),
  reset: () => set(initialState),
}))