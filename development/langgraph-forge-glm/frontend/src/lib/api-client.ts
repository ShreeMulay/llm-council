import { Provider } from "../stores/provider-store"

export interface Model {
  id: string
  name: string
  contextLength: number
  inputPricePerMillion: number
  outputPricePerMillion: number
}

export interface ModelsResponse {
  provider: string
  models: Model[]
}

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

export interface ExecuteResponse {
  success: boolean
  output: string
  error?: string
  metrics: Metrics | null
  graphStructure: GraphStructure | null
}

export async function fetchModels(provider: Provider): Promise<Model[]> {
  const response = await fetch(`/api/models?provider=${provider}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  const data: ModelsResponse = await response.json()
  return data.models
}

export async function execute(
  provider: string,
  model: string,
  code: string,
  timeout = 30,
): Promise<ExecuteResponse> {
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider, model, code, timeout }),
  })

  if (!response.ok) {
    throw new Error(`Execution failed: ${response.statusText}`)
  }

  return response.json()
}

export const apiClient = {
  fetchModels,
  execute,
}