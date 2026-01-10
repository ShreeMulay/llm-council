import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import Header from "./header"

const renderWithRouter = <T,>(ui: T) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe("Header", () => {
  it("should render logo text", () => {
    renderWithRouter(<Header />)
    expect(screen.getByText("LangGraph Forge")).toBeInTheDocument()
  })

  it("should have correct styling classes", () => {
    const { container } = renderWithRouter(<Header />)
    const header = container.querySelector("header")
    expect(header).toHaveClass("border-b", "border-border", "p-4")
  })
})