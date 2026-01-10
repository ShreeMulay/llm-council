import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import ProviderSelector from "./provider-selector"

const mockModels = [
  { id: "gpt-4", name: "GPT-4", contextLength: 128000, inputPricePerMillion: 30, outputPricePerMillion: 60 },
]

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe("ProviderSelector", () => {
  it("should render provider label", () => {
    const Wrapper = createWrapper()
    render(<ProviderSelector />, { wrapper: Wrapper })

    expect(screen.getByText("Provider")).toBeInTheDocument()
  })

  it("should render provider buttons", () => {
    const Wrapper = createWrapper()
    render(<ProviderSelector />, { wrapper: Wrapper })

    expect(screen.getByText("OpenRouter")).toBeInTheDocument()
    expect(screen.getByText("Cerebras")).toBeInTheDocument()
    expect(screen.getByText("Fireworks")).toBeInTheDocument()
  })

  it("should render model selector", () => {
    const Wrapper = createWrapper()
    render(<ProviderSelector />, { wrapper: Wrapper })

    expect(screen.getByText("Model")).toBeInTheDocument()
  })
})