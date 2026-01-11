import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { ConditionalEdge } from './conditional-edge'

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ReactFlowProvider>
      <div style={{ width: '500px', height: '500px' }}>
        {children}
      </div>
    </ReactFlowProvider>
  )
}

describe('ConditionalEdge', () => {
  const defaultProps = {
    id: 'edge-1',
    sourceX: 100,
    sourceY: 100,
    targetX: 200,
    targetY: 200,
    markerEnd: 'marker-end',
  }

  it('should render edge without label', () => {
    const { container } = render(
      <TestWrapper>
        <ConditionalEdge {...defaultProps} />
      </TestWrapper>
    )

    const edgePath = container.querySelector('path')
    expect(edgePath).toBeInTheDocument()

    const edgeStyle = edgePath?.getAttribute('style')
    expect(edgeStyle).toContain('hsl(var(--border))')
    expect(edgeStyle).toContain('stroke-width: 1')

    const label = container.querySelector('[style*="position: absolute"]')
    expect(label).not.toBeInTheDocument()
  })

  it('should render edge with label', () => {
    const { container, getByText } = render(
      <TestWrapper>
        <ConditionalEdge {...defaultProps} label="success" />
      </TestWrapper>
    )

    const edgePath = container.querySelector('path')
    expect(edgePath).toBeInTheDocument()

    const edgeStyle = edgePath?.getAttribute('style')
    expect(edgeStyle).toContain('hsl(var(--primary))')
    expect(edgeStyle).toContain('stroke-width: 2')

    const label = getByText('success')
    expect(label).toBeInTheDocument()
  })

  it('should position label centered on edge', () => {
    const renderResult = render(
      <TestWrapper>
        <ConditionalEdge {...defaultProps} label="test" />
      </TestWrapper>
    )

    const label = renderResult.getByText('test')
    const labelDiv = label.closest('div[style*="position: absolute"]')

    const sourceX = 100
    const targetX = 200
    const midpointX = (sourceX + targetX) / 2

    const labelStyle = labelDiv?.getAttribute('style')
    expect(labelStyle).toContain(`left: ${midpointX}px`)
    expect(labelStyle).toContain('translateX(-50%)')
  })

  it('should not render label when label is empty string', () => {
    const { container } = render(
      <TestWrapper>
        <ConditionalEdge {...defaultProps} label="" />
      </TestWrapper>
    )

    const edgePath = container.querySelector('path')
    expect(edgePath).toBeInTheDocument()

    const edgeStyle = edgePath?.getAttribute('style')
    expect(edgeStyle).toContain('hsl(var(--border))')

    const label = container.querySelector('[style*="position: absolute"]')
    expect(label).not.toBeInTheDocument()
  })

  it('should apply custom styles when provided', () => {
    const { container } = render(
      <TestWrapper>
        <ConditionalEdge
          {...defaultProps}
          style={{ opacity: 0.5, strokeDasharray: '5,5' }}
        />
      </TestWrapper>
    )

    const edgePath = container.querySelector('path')
    expect(edgePath).toHaveStyle({
      opacity: '0.5',
      strokeDasharray: '5,5',
      stroke: 'hsl(var(--border))',
    })
  })
})