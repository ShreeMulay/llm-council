// API Contract Types - Shared between frontend and backend
// These types define the contract between frontend and backend
// Both sides MUST adhere to these interfaces

// ============================================================
// Providers
// ============================================================

export type Provider = "openrouter" | "cerebras" | "fireworks"

export interface ProviderInfo {
  id: Provider
  name: string
  description: string
  configured: boolean
  healthy: boolean
}

// ============================================================
// Models
// ============================================================

export interface Model {
  id: string
  name: string
  contextLength: number
  inputPricePerMillion: number
  outputPricePerMillion: number
}

export interface ModelsResponse {
  provider: Provider
  models: Model[]
  cachedAt: string // ISO timestamp
  cacheExpiresAt: string // ISO timestamp
}

// ============================================================
// Execution
// ============================================================

export interface ExecuteRequest {
  provider: Provider
  model: string
  code: string
}

export interface ExecutionMetrics {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  tokensPerSecond: number
  costUsd: number
}

export interface GraphNode {
  id: string
  type: "start" | "end" | "llm" | "tool" | "conditional" | "default"
  label: string
}

export interface GraphEdge {
  source: string
  target: string
  condition?: string
}

export interface GraphStructure {
  nodes: GraphNode[]
  edges: GraphEdge[]
  entryPoint: string
}

export interface ExecutionError {
  message: string
  errorType: string
  traceback: string
  lineNumber?: number
  suggestions: string[]
}

export interface ExecuteResponse {
  success: boolean
  output: string
  error?: ExecutionError
  metrics: ExecutionMetrics
  graphStructure?: GraphStructure
}

// ============================================================
// Health
// ============================================================

export interface ProviderHealth {
  configured: boolean
  healthy: boolean
  lastChecked?: string
  error?: string
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy"
  providers: Record<Provider, ProviderHealth>
  timestamp: string
}
