import { describe, it, expect, vi, beforeAll } from 'vitest'
import { apiClient } from '../lib/api-client'
import { useExecutionStore, type Metrics, type GraphStructure } from './execution-store'

// Mock the API client module
vi.mock('../lib/api-client', () => ({
  apiClient: {
    execute: vi.fn(),
  },
}))

describe('ExecutionStore', () => {
  beforeAll(() => {
    // Reset store before all tests
    useExecutionStore.getState().reset()
  })

  it('should initialize with default state', () => {
    useExecutionStore.getState().reset()
    const state = useExecutionStore.getState()

    expect(state.output).toBe('')
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state.metrics).toBeNull()
    expect(state.graphStructure).toBeNull()
  })

  it('should set loading state when starting execution', async () => {
    useExecutionStore.getState().reset()

    const mockExecute = apiClient.execute as ReturnType<typeof vi.fn>
    mockExecute.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ success: true, output: 'test' } as any), 10),
        ),
    )

    const state = useExecutionStore.getState()

    const executionPromise = state.execute('openrouter', 'model', 'code')
    const loadingState = useExecutionStore.getState()
    expect(loadingState.isLoading).toBe(true)

    // Wait for promise complete
    await executionPromise
    const finalState = useExecutionStore.getState()
    expect(finalState.isLoading).toBe(false)

    mockExecute.mockRestore()
  })

  it('should update output on successful execution', async () => {
    useExecutionStore.getState().reset()

    const mockExecute = apiClient.execute as ReturnType<typeof vi.fn>
    const mockResponse = {
      success: true,
      output: 'Execution completed',
      error: null,
      metrics: {
        provider: 'openrouter',
        model: 'model',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        durationMs: 500,
        tokensPerSecond: 300,
        costUsd: 0.0001,
      } as Metrics,
      graphStructure: {
        nodes: [{ id: 'agent', type: 'llm' }],
        edges: [{ source: 'agent', target: 'tools' }],
      } as GraphStructure,
    }
    mockExecute.mockResolvedValue(mockResponse)

    const state = useExecutionStore.getState()

    await state.execute('openrouter', 'model', 'code')

    const newState = useExecutionStore.getState()
    expect(newState.output).toBe('Execution completed')
    expect(newState.error).toBeNull()
    expect(newState.metrics).toEqual(mockResponse.metrics)
    expect(newState.graphStructure).toEqual(mockResponse.graphStructure)

    mockExecute.mockRestore()
  })

  it('should handle errors gracefully', async () => {
    useExecutionStore.getState().reset()

    const mockExecute = apiClient.execute as ReturnType<typeof vi.fn>
    mockExecute.mockResolvedValue({
      success: false,
      output: '',
      error: 'Syntax error in code',
      metrics: null,
      graphStructure: null,
    })

    const state = useExecutionStore.getState()

    await state.execute('openrouter', 'model', 'invalid code')

    const newState = useExecutionStore.getState()
    expect(newState.output).toBe('')
    expect(newState.error).toBe('Syntax error in code')
    expect(newState.metrics).toBeNull()

    mockExecute.mockRestore()
  })

  it('should handle network errors', async () => {
    useExecutionStore.getState().reset()

    const mockExecute = apiClient.execute as ReturnType<typeof vi.fn>
    mockExecute.mockRejectedValue(new Error('Network error'))

    const state = useExecutionStore.getState()

    await state.execute('openrouter', 'model', 'code')

    const newState = useExecutionStore.getState()
    expect(newState.output).toBe('')
    expect(newState.error).toBe('Network error')
    expect(newState.metrics).toBeNull()

    mockExecute.mockRestore()
  })

  it('should reset state when calling reset', () => {
    useExecutionStore.getState().reset()

    const state = useExecutionStore.getState()

    state.setOutput('test output')
    state.setError('test error')
    state.setMetrics({
      provider: 'openrouter',
      model: 'model',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      durationMs: 500,
      tokensPerSecond: 300,
      costUsd: 0.0001,
    })

    const modifiedState = useExecutionStore.getState()
    expect(modifiedState.output).toBe('test output')
    expect(modifiedState.error).toBe('test error')
    expect(modifiedState.metrics).not.toBeNull()

    state.reset()

    const resetState = useExecutionStore.getState()
    expect(resetState.output).toBe('')
    expect(resetState.error).toBeNull()
    expect(resetState.isLoading).toBe(false)
    expect(resetState.metrics).toBeNull()
    expect(resetState.graphStructure).toBeNull()
  })

  it('should allow setting individual state values', () => {
    useExecutionStore.getState().reset()

    const state = useExecutionStore.getState()

    state.setOutput('custom output')
    const afterOutput = useExecutionStore.getState()
    expect(afterOutput.output).toBe('custom output')

    state.setError('custom error')
    const afterError = useExecutionStore.getState()
    expect(afterError.error).toBe('custom error')

    const mockMetrics: Metrics = {
      provider: 'cerebras',
      model: 'llama',
      inputTokens: 200,
      outputTokens: 100,
      totalTokens: 300,
      durationMs: 1000,
      tokensPerSecond: 300,
      costUsd: 0.0002,
    }
    state.setMetrics(mockMetrics)
    const afterMetrics = useExecutionStore.getState()
    expect(afterMetrics.metrics).toEqual(mockMetrics)

    const mockGraph: GraphStructure = {
      nodes: [{ id: 'start', type: 'start' }],
      edges: [],
    }
    state.setGraphStructure(mockGraph)
    const afterGraph = useExecutionStore.getState()
    expect(afterGraph.graphStructure).toEqual(mockGraph)
  })
})