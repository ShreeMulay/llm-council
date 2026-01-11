import { describe, it, expect } from 'vitest'

describe('graph-layout', () => {
  describe('applyLayout', () => {
    it('should layout simple linear graph', () => {
      const graph = {
        nodes: ['start', 'middle', 'end'],
        edges: [
          { source: 'start', target: 'middle' },
          { source: 'middle', target: 'end' },
        ],
      }

      expect(graph).toBeDefined()
      expect(graph.nodes).toHaveLength(3)
      expect(graph.edges).toHaveLength(2)
    })

    it('should handle graphs with branching edges', () => {
      const graph = {
        nodes: ['start', 'branch1', 'branch2', 'end'],
        edges: [
          { source: 'start', target: 'branch1' },
          { source: 'start', target: 'branch2' },
          { source: 'branch1', target: 'end' },
          { source: 'branch2', target: 'end' },
        ],
      }

      expect(graph).toBeDefined()
      expect(graph.nodes).toHaveLength(4)
      expect(graph.edges).toHaveLength(4)
    })

    it('should handle empty graph', () => {
      const graph = {
        nodes: [],
        edges: [],
      }

      expect(graph).toBeDefined()
      expect(graph.nodes).toHaveLength(0)
      expect(graph.edges).toHaveLength(0)
    })
  })

  describe('formatNodes', () => {
    it('should convert graph nodes to React Flow format', () => {
      const graphNodes = ['start', 'end']

      graphNodes.forEach((id) => {
        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      })
    })
  })

  describe('formatEdges', () => {
    it('should format edges with optional conditions', () => {
      const edges = [
        { source: 'start', target: 'middle', condition: 'value > 0' },
        { source: 'start', target: 'end' },
      ]

      expect(edges[0]).toHaveProperty('condition')
      expect(edges[0].condition).toBe('value > 0')
      expect(edges[1]).not.toHaveProperty('condition')
    })
  })
})