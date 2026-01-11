import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GraphData } from '@/lib/graph-layout'
import { applyLayout } from '@/lib/graph-layout'
import { StartNode, EndNode, LLMNode, ToolNode } from './nodes'
import { ConditionalEdge } from './edges'

interface GraphCanvasProps {
  graphData: GraphData
  fitView?: boolean
}

export function GraphCanvas({ graphData, fitView = true }: GraphCanvasProps) {
  const { nodes, edges } = applyLayout(graphData)

  const nodeTypes = {
    start: StartNode,
    end: EndNode,
    llm: LLMNode,
    tool: ToolNode,
  }

  const edgeTypes = {
    conditional: ConditionalEdge,
  }

  return (
    <div className="h-full w-full" data-testid="react-flow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView={fitView}
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-right"
      >
        <Background size={1} variant="dots" />
        <Controls />
      </ReactFlow>
    </div>
  )
}