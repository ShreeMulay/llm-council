import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import MainLayout from "./main-layout"

const renderWithRouter = <T,>(ui: T) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe("MainLayout", () => {
  it("should render header and sidebar", () => {
    renderWithRouter(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>,
    )
    expect(screen.getByText("LangGraph Forge")).toBeInTheDocument()
    expect(screen.getByText("Playground")).toBeInTheDocument()
  })

  it("should render children content", () => {
    renderWithRouter(
      <MainLayout>
        <div>Test Content</div>
      </MainLayout>,
    )
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })
})