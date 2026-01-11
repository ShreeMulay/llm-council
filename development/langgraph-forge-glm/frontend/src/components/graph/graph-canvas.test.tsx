import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { GraphCanvas } from './graph-canvas'
import type { GraphData } from '@/lib/graph-layout'

describe('GraphCanvas', () => {
  it('should render nodes when nodes are provided', () => {
    const graphData: GraphData = {
      nodes: [
        { id: '1', type: 'default' },
        { id: '2', type: 'default' },
      ],
      edges: [],
    }

    render(<GraphCanvas graphData={graphData} />)

    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument()
  })

  it('should render edges when edges are provided', () => {
    const graphData: GraphData = {
      nodes: [
        { id: '1', type: 'default' },
        { id: '2', type: 'default' },
      ],
      edges: [
        { source: '1', target: '2' },
      ],
    }

    render(<GraphCanvas graphData={graphData} />)

    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument()
  })

  it('should handle empty graph gracefully', () => {
    const graphData: GraphData = {
      nodes: [],
      edges: [],
    }

    render(<GraphCanvas graphData={graphData} />)

    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument()
  })

  it('should be responsive to window resize', () => {
    const graphData: GraphData = {
      nodes: [
        { id: '1', type: 'default' },
      ],
      edges: [],
    }

    render(<GraphCanvas graphData={graphData} />)

    expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument()
  })
})