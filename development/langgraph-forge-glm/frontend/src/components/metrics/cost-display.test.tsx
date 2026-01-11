import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CostDisplay } from './cost-display'

describe('CostDisplay', () => {
  it('should render cost in USD', () => {
    render(<CostDisplay costUsd={0.005} />)

    expect(screen.getByText('$0.0050')).toBeInTheDocument()
  })

  it('should handle very small costs', () => {
    render(<CostDisplay costUsd={0.0001} />)

    expect(screen.getByText('$0.0001')).toBeInTheDocument()
  })

  it('should handle zero cost', () => {
    render(<CostDisplay costUsd={0} />)

    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('should format larger costs with commas', () => {
    render(<CostDisplay costUsd={1.2345} />)

    expect(screen.getByText('$1.23')).toBeInTheDocument()
  })

  it('should show cost per token breakdown when requested', () => {
    render(<CostDisplay costUsd={0.01} totalTokens={1000} showBreakdown />)

    expect(screen.getByText('$0.0100 / 1K tokens')).toBeInTheDocument()
  })
})