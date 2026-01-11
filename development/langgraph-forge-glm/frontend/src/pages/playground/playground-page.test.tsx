import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlaygroundPage } from './playground-page'

vi.mock('@/stores/provider-store', () => ({
  useProviderStore: vi.fn((selector) => {
    const state = useProviderStoreMock.getState()
    return selector ? selector(state) : state
  }),
}))

vi.mock('@/stores/theme-store', () => ({
  useThemeStore: vi.fn((selector) => {
    const state = useThemeStoreMock.getState()
    return selector ? selector(state) : state
  }),
}))

vi.mock('@/lib/api-client', () => ({
  execute: vi.fn(),
  fetchModels: vi.fn(),
}))

vi.mock('@monaco-editor/react', () => ({
  default: ({ onChange, value }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
  Editor: ({ onChange, value }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

vi.mock('@xyflow/react', () => ({
  ReactFlow: () => <div data-testid="react-flow-canvas" />,
  Background: () => <div />,
  Controls: () => <div />,
  MiniMap: () => <div />,
}))

import { useProviderStore } from '@/stores/provider-store'
import { useThemeStore } from '@/stores/theme-store'
import { execute, fetchModels } from '@/lib/api-client'

type ProviderState = {
  provider: string
  modelId: string | null
  setProvider: (provider: string) => void
  setModelId: (id: string | null) => void
}

type ThemeState = {
  theme: string
  setTheme: (theme: string) => void
}

const createProviderStoreMock = (): ProviderState => {
  const state: ProviderState = {
    provider: 'openrouter',
    modelId: null,
    setProvider: vi.fn((provider) => {
      state.provider = provider
    }),
    setModelId: vi.fn((id) => {
      state.modelId = id
    }),
  }
  Object.defineProperty(state, 'getState', {
    value: () => state,
    enumerable: false,
  })
  return state
}

const createThemeStoreMock = (): ThemeState => {
  const state: ThemeState = {
    theme: 'light',
    setTheme: vi.fn((theme) => {
      state.theme = theme
    }),
  }
  Object.defineProperty(state, 'getState', {
    value: () => state,
    enumerable: false,
  })
  return state
}

const useProviderStoreMock = createProviderStoreMock()
const useThemeStoreMock = createThemeStoreMock()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
)

describe('PlaygroundPage', () => {
  const mockSetTheme = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    useProviderStoreMock.provider = 'openrouter'
    useProviderStoreMock.modelId = null
    vi.mocked(useThemeStoreMock.setTheme).mockImplementation((t) => {
      useThemeStoreMock.theme = t
    })

    vi.mocked(fetchModels).mockResolvedValue([
      {
        id: 'model-1',
        name: 'Test Model 1',
        contextLength: 128000,
        inputPricePerMillion: 0.5,
        outputPricePerMillion: 1.5,
      },
      {
        id: 'model-2',
        name: 'Test Model 2',
        contextLength: 64000,
        inputPricePerMillion: 0.3,
        outputPricePerMillion: 0.9,
      },
    ])
  })

  it('renders all components', () => {
    render(<PlaygroundPage />, { wrapper })

    expect(screen.getAllByText('Playground')).toHaveLength(2)
    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByText('Model')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument()
    expect(screen.getAllByTestId('react-flow-canvas')).toHaveLength(2)
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument()
  })

  it('displays provider selection buttons', () => {
    render(<PlaygroundPage />, { wrapper })

    expect(screen.getByText('OpenRouter')).toBeInTheDocument()
    expect(screen.getByText('Cerebras')).toBeInTheDocument()
    expect(screen.getByText('Fireworks')).toBeInTheDocument()
  })

  it('changes provider when provider button is clicked', async () => {
    render(<PlaygroundPage />, { wrapper })

    const fireworksButton = screen.getByRole('button', { name: 'Fireworks' })
    fireEvent.click(fireworksButton)

    await waitFor(() => {
      expect(useProviderStoreMock.setProvider).toHaveBeenCalledWith('fireworks')
    })
  })

  it('changes model when model selector is changed', async () => {
    render(<PlaygroundPage />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument()
    })

    const modelSelect = screen.getByRole('combobox')
    fireEvent.change(modelSelect, { target: { value: 'model-2' } })

    await waitFor(() => {
      expect(useProviderStoreMock.setModelId).toHaveBeenCalledWith('model-2')
    })
  })

  it('executes code when execute button is clicked', async () => {
    const mockResponse = {
      success: true,
      output: 'Test output',
      metrics: {
        provider: 'openrouter',
        model: 'model-1',
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        durationMs: 1000,
        tokensPerSecond: 150,
        costUsd: 0.000125,
      },
      graphStructure: {
        nodes: [{ id: 'node1', type: 'llm' }],
        edges: [],
      },
    }

    vi.mocked(execute).mockResolvedValue(mockResponse)
    useProviderStoreMock.modelId = 'model-1'

    const { rerender } = render(<PlaygroundPage />, { wrapper })

    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'print("Hello, World!")' } })
    rerender(<PlaygroundPage />)

    const executeButton = screen.getByRole('button', { name: /execute/i })
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(execute).toHaveBeenCalledWith('openrouter', 'model-1', 'print("Hello, World!")')
    })

    await waitFor(() => {
      expect(screen.getByText('Test output')).toBeInTheDocument()
    })
  })

  it('displays error message when execution fails', async () => {
    const mockResponse = {
      success: false,
      error: 'Syntax error',
      metrics: null,
      graphStructure: null,
    }

    vi.mocked(execute).mockResolvedValue(mockResponse)
    useProviderStoreMock.modelId = 'model-1'

    const { rerender } = render(<PlaygroundPage />, { wrapper })

    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'invalid code' } })
    rerender(<PlaygroundPage />)

    const executeButton = screen.getByRole('button', { name: /execute/i })
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getByText(/Syntax error/i)).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(execute).mockRejectedValue(new Error('Network error'))
    useProviderStoreMock.modelId = 'model-1'

    const { rerender } = render(<PlaygroundPage />, { wrapper })

    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'test code' } })
    rerender(<PlaygroundPage />)

    const executeButton = screen.getByRole('button', { name: /execute/i })
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getByText(/execution failed/i)).toBeInTheDocument()
    })
  })

  it('shows empty state before any execution', () => {
    render(<PlaygroundPage />, { wrapper })

    expect(screen.getByText(/no output yet/i)).toBeInTheDocument()
  })

  it('disables execute button when no model is selected', async () => {
    render(<PlaygroundPage />, { wrapper })

    const executeButton = screen.getByRole('button', { name: /execute/i })

    await waitFor(() => {
      expect(executeButton).toBeDisabled()
    })
  })

  it('enables execute button when model and code are selected', async () => {
    const { rerender } = render(<PlaygroundPage />, { wrapper })

    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'test code' } })

    const executeButton = screen.getByRole('button', { name: /execute/i })
    await waitFor(() => {
      expect(executeButton).toBeDisabled()
    })

    useProviderStoreMock.modelId = 'model-1'
    rerender(<PlaygroundPage />)

    await waitFor(() => {
      expect(executeButton).not.toBeDisabled()
    })
  })

  it('displays metrics after successful execution', async () => {
    const mockResponse = {
      success: true,
      output: 'Test',
      metrics: {
        provider: 'openrouter',
        model: 'model-1',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        durationMs: 2000,
        tokensPerSecond: 750,
        costUsd: 0.00125,
      },
      graphStructure: {
        nodes: [{ id: 'n1', type: 'llm' }],
        edges: [],
      },
    }

    vi.mocked(execute).mockResolvedValue(mockResponse)
    useProviderStoreMock.modelId = 'model-1'

    const { rerender } = render(<PlaygroundPage />, { wrapper })

    const editor = screen.getByTestId('monaco-editor')
    fireEvent.change(editor, { target: { value: 'test' } })
    rerender(<PlaygroundPage />)

    const executeButton = screen.getByRole('button', { name: /execute/i })
    fireEvent.click(executeButton)

    await waitFor(() => {
      expect(screen.getByText('1.5K')).toBeInTheDocument()
    })
  })
})