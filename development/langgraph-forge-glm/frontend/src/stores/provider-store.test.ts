import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useProviderStore } from "./provider-store"

describe("useProviderStore", () => {
  beforeEach(() => {
    useProviderStore.setState({ provider: "openrouter", modelId: null })
    localStorage.clear()
  })

  describe("test_initial_state", () => {
    it("should have default provider as openrouter", () => {
      const { result } = renderHook(() => useProviderStore())
      expect(result.current.provider).toBe("openrouter")
    })

    it("should have null modelId by default", () => {
      const { result } = renderHook(() => useProviderStore())
      expect(result.current.modelId).toBeNull()
    })
  })

  describe("test_set_provider", () => {
    it("should change provider when setProvider is called", () => {
      const { result } = renderHook(() => useProviderStore())

      act(() => {
        result.current.setProvider("cerebras")
      })

      expect(result.current.provider).toBe("cerebras")
    })

    it("should reset modelId when provider changes", () => {
      const { result } = renderHook(() => useProviderStore())

      act(() => {
        result.current.setModelId("llama-3.1-70b")
      })

      expect(result.current.modelId).toBe("llama-3.1-70b")

      act(() => {
        result.current.setProvider("fireworks")
      })

      expect(result.current.provider).toBe("fireworks")
      expect(result.current.modelId).toBeNull()
    })

    it("should cycle through valid providers", () => {
      const { result } = renderHook(() => useProviderStore())

      act(() => {
        result.current.setProvider("cerebras")
      })
      expect(result.current.provider).toBe("cerebras")

      act(() => {
        result.current.setProvider("fireworks")
      })
      expect(result.current.provider).toBe("fireworks")

      act(() => {
        result.current.setProvider("openrouter")
      })
      expect(result.current.provider).toBe("openrouter")
    })
  })

  describe("test_set_model", () => {
    it("should set modelId when setModelId is called", () => {
      const { result } = renderHook(() => useProviderStore())

      act(() => {
        result.current.setModelId("llama-3.1-70b")
      })

      expect(result.current.modelId).toBe("llama-3.1-70b")
    })

    it("should clear modelId when set to null", () => {
      const { result } = renderHook(() => useProviderStore())

      act(() => {
        result.current.setModelId("llama-3.1-70b")
      })

      expect(result.current.modelId).toBe("llama-3.1-70b")

      act(() => {
        result.current.setModelId(null)
      })

      expect(result.current.modelId).toBeNull()
    })
  })
})