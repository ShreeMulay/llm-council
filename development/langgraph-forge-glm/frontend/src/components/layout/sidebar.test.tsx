import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import Sidebar from "./sidebar"

const renderWithRouter = <T,>(ui: T) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe("Sidebar", () => {
  it("should render navigation links", () => {
    renderWithRouter(<Sidebar />)
    expect(screen.getByText("Playground")).toBeInTheDocument()
    expect(screen.getByText("Tutorial")).toBeInTheDocument()
  })

  it("should have correct styling classes", () => {
    const { container } = renderWithRouter(<Sidebar />)
    const sidebar = container.querySelector("aside")
    expect(sidebar).toHaveClass("border-r", "border-border", "w-64")
  })
})