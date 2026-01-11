import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { OutputPanel } from './output-panel'
import '@testing-library/jest-dom/vitest'

describe('OutputPanel', () => {
  beforeEach(() => {
    cleanup()
  })

  it('should show output when available', () => {
    render(<OutputPanel output="Execution completed successfully" />)

    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('Execution completed successfully')).toBeInTheDocument()
  })

  it('should show error when available', () => {
    render(<OutputPanel error="Syntax error in code" />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText(/Syntax error in code/)).toBeInTheDocument()
  })

  it('should show suggestions when error includes suggestions', () => {
    const suggestions = 'Check your code syntax for typos'
    render(<OutputPanel error="Syntax error" suggestions={suggestions} />)

    expect(screen.getByText('Suggestions')).toBeInTheDocument()
    expect(screen.getByText(suggestions)).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<OutputPanel isLoading />)

    expect(screen.getByText(/Executing/i)).toBeInTheDocument()
  })

  it('should show empty state when no output, error, or loading', () => {
    const { container } = render(<OutputPanel />)

    expect(container.querySelector('.empty-state')).toBeInTheDocument()
    expect(screen.getByText(/No output yet/i)).toBeInTheDocument()
  })

  it('should show metrics when available', () => {
    const metrics = {
      totalTokens: 150,
      costUsd: 0.0001,
      durationMs: 500,
    }
    render(<OutputPanel output="test" metrics={metrics} />)

    expect(screen.getByText(/150/)).toBeInTheDocument()
    expect(screen.getByText(/0.0001/i)).toBeInTheDocument()
    expect(screen.getByText(/500ms/i)).toBeInTheDocument()
  })
})