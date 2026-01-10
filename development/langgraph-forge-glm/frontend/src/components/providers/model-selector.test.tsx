import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router-dom"
import ModelSelector from "./model-selector"
import { Model } from "../../lib/api-client"

const mockModels: Model[] = [
  { id: "gpt-4", name: "GPT-4", contextLength: 128000, inputPricePerMillion: 30, outputPricePerMillion: 60 },
  { id: "claude-3", name: "Claude 3", contextLength: 200000, inputPricePerMillion: 15, outputPricePerMillion: 75 },
]

const createWrapper = (initialModels?: Model[]) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, enabled: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe("ModelSelector", () => {
  it("should render model label", () => {
    const Wrapper = createWrapper()
    render(<ModelSelector models={mockModels} />, { wrapper: Wrapper })

    expect(screen.getByText("Model")).toBeInTheDocument()
  })

  it("should render model selection dropdown", () => {
    const Wrapper = createWrapper()
    render(<ModelSelector models={mockModels} />, { wrapper: Wrapper })

    const select = screen.getByRole("combobox")
    expect(select).toBeInTheDocument()
  })

  it("should render model options", () => {
    const Wrapper = createWrapper()
    render(<ModelSelector models={mockModels} />, { wrapper: Wrapper })

    expect(screen.getByText("Select a model")).toBeInTheDocument()
    expect(screen.getByText("GPT-4")).toBeInTheDocument()
    expect(screen.getByText("Claude 3")).toBeInTheDocument()
  })

  it("should show no models available message", () => {
    const Wrapper = createWrapper()
    render(<ModelSelector models={[]} />, { wrapper: Wrapper })

    expect(screen.getByText("No models available")).toBeInTheDocument()
  })
})