import React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useModels } from "./use-models"
import * as apiClient from "../lib/api-client"

const createQueryClientWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("useModels", () => {
  it("should fetch models for a provider", async () => {
    const mockModels = [
      { id: "gpt-4", name: "GPT-4", contextLength: 128000, inputPricePerMillion: 30, outputPricePerMillion: 60 },
    ]
    vi.spyOn(apiClient, "fetchModels").mockResolvedValue(mockModels)

    const { result } = renderHook(() => useModels("openrouter"), {
      wrapper: createQueryClientWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockModels)
    expect(apiClient.fetchModels).toHaveBeenCalledWith("openrouter")
  })

  it("should handle errors when fetching models", async () => {
    vi.spyOn(apiClient, "fetchModels").mockRejectedValue(new Error("Failed to fetch"))

    const { result } = renderHook(() => useModels("cerebras"), {
      wrapper: createQueryClientWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })
})