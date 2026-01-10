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

export async function fetchModels(provider: Provider): Promise<Model[]> {
  const response = await fetch(`/api/models?provider=${provider}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`)
  }

  const data: ModelsResponse = await response.json()
  return data.models
}