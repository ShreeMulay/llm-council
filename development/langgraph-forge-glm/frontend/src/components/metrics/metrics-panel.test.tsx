import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MetricsPanel } from './metrics-panel'

describe('MetricsPanel', () => {
  const mockMetrics = {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    inputTokens: 1500,
    outputTokens: 3000,
    totalTokens: 4500,
    durationMs: 2500,
    tokensPerSecond: 1800,
    costUsd: 0.027,
  }

  it('should render metrics when provided', () => {
    render(<MetricsPanel metrics={mockMetrics} />)

    expect(screen.getByText('1K')).toBeInTheDocument()
    expect(screen.getByText('3K')).toBeInTheDocument()
    expect(screen.getByText('4K')).toBeInTheDocument()
    expect(screen.getByText('1800 tokens/s')).toBeInTheDocument()
    expect(screen.getByText('$0.03')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<MetricsPanel metrics={null} isLoading />)

    expect(screen.getByText('Loading metrics...')).toBeInTheDocument()
  })

  it('should show zero values when no metrics', () => {
    render(<MetricsPanel metrics={null} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('0 tokens/s')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('should display provider and model info', () => {
    render(<MetricsPanel metrics={mockMetrics} />)

    expect(screen.getByText('openrouter')).toBeInTheDocument()
    expect(screen.getByText('claude-3.5-sonnet')).toBeInTheDocument()
  })
})