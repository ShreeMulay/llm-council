import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TokenDisplay } from './token-display'

describe('TokenDisplay', () => {
  it('should render token counts', () => {
    render(
      <TokenDisplay
        inputTokens={100}
        outputTokens={200}
        totalTokens={300}
      />
    )

    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('300')).toBeInTheDocument()
  })

  it('should handle zero values', () => {
    render(
      <TokenDisplay
        inputTokens={0}
        outputTokens={0}
        totalTokens={0}
      />
    )

    const values = screen.getAllByText('0')
    expect(values.length).toBeGreaterThanOrEqual(3)
  })

  it('should display labels', () => {
    render(
      <TokenDisplay
        inputTokens={100}
        outputTokens={200}
        totalTokens={300}
      />
    )

    expect(screen.getByText(/input/i)).toBeInTheDocument()
    expect(screen.getByText(/output/i)).toBeInTheDocument()
    expect(screen.getByText(/total/i)).toBeInTheDocument()
  })

  it('should format large token numbers', () => {
    render(
      <TokenDisplay
        inputTokens={15000}
        outputTokens={30000}
        totalTokens={45000}
      />
    )

    expect(screen.getByText('15K')).toBeInTheDocument()
    expect(screen.getByText('30K')).toBeInTheDocument()
    expect(screen.getByText('45K')).toBeInTheDocument()
  })
})