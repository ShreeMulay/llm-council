import { create } from "zustand"

export type Provider = "openrouter" | "cerebras" | "fireworks"

interface ProviderState {
  provider: Provider
  modelId: string | null
  setProvider: (provider: Provider) => void
  setModelId: (modelId: string | null) => void
}

export const useProviderStore = create<ProviderState>((set) => ({
  provider: "openrouter",
  modelId: null,
  setProvider: (provider: Provider) =>
    set(() => ({
      provider,
      modelId: null,
    })),
  setModelId: (modelId: string | null) =>
    set(() => ({
      modelId,
    })),
}))