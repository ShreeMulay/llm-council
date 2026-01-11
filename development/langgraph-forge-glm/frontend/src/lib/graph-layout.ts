import dagre from 'dagre'
import type { Edge, Node } from '@xyflow/react'

export interface GraphNode {
  id: string
  type: string
}

export interface GraphEdge {
  source: string
  target: string
  condition?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function applyLayout(graphData: GraphData): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  dagreGraph.setGraph({
    rankdir: 'TB',
    nodesep: 50,
    ranksep: 50,
    edgesep: 10,
  })

  graphData.nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 80 })
  })

  graphData.edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const nodes: Node[] = graphData.nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id)

    return {
      id: node.id,
      type: node.type,
      position: { x, y },
      data: { label: node.id },
    }
  })

  const edges: Edge[] = graphData.edges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.condition,
    animated: edge.condition !== undefined,
  }))

  return { nodes, edges }
}

export function formatNodes(graphNodes: GraphNode[]): Node[] {
  return graphNodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: { x: 0, y: 0 },
    data: { label: node.id },
  }))
}

export function formatEdges(graphEdges: GraphEdge[]): Edge[] {
  return graphEdges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.condition,
    animated: edge.condition !== undefined,
  }))
}