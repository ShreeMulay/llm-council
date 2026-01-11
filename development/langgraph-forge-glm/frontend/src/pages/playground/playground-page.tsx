import { useState } from 'react'
import { Play } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { MainLayout } from '@/components/layout/main-layout'
import { ProviderSelector } from '@/components/providers/provider-selector'
import { CodeEditor } from '@/components/editor/code-editor'
import { MetricsPanel, type MetricsPanelMetrics } from '@/components/metrics/metrics-panel'
import { OutputPanel, type OutputPanelMetrics } from '@/components/output/output-panel'
import { GraphCanvas } from '@/components/graph/graph-canvas'
import { Button } from '@/components/ui/button'
import { type GraphData } from '@/lib/graph-layout'
import { useProviderStore } from '@/stores/provider-store'
import { execute } from '@/lib/api-client'

export function PlaygroundPage() {
  const { provider, modelId } = useProviderStore()
  const [code, setCode] = useState(`# Welcome to LangGraph Forge Playground!

# Import the types you need
from typing import TypedDict, Annotated
from typing_extensions import Sequence

# Define the state structure
class GraphState(TypedDict):
    messages: Annotated[Sequence[str], "The messages in the conversation"]
    current_step: Annotated[str, "The current step in execution"]

# Create a simple graph
from langgraph.graph import StateGraph, END

def process_message(state: GraphState) -> GraphState:
    """Process the user's message"""
    return {
        "messages": state["messages"] + ["Processing your message..."],
        "current_step": "processing"
    }

def generate_response(state: GraphState) -> GraphState:
    """Generate a response"""
    return {
        "messages": state["messages"] + ["Hello! This is a sample response."],
        "current_step": "complete"
    }

# Build the graph
workflow = StateGraph(GraphState)

workflow.add_node("process", process_message)
workflow.add_node("generate", generate_response)
workflow.add_edge("process", "generate")
workflow.add_edge("generate", END)

workflow.set_entry_point("process")

# Compile and run
graph = workflow.compile()
result = graph.invoke({
    "messages": ["Hello from LangGraph Forge!"],
    "current_step": "start"
})

print("Result:", result)
`)
  const [isExecuting, setIsExecuting] = useState(false)
  const [output, setOutput] = useState<string>()
  const [error, setError] = useState<string>()
  const [metrics, setMetrics] = useState<MetricsPanelMetrics>()
  const [graphData, setGraphData] = useState<GraphData>()
  const [outputMetrics, setOutputMetrics] = useState<OutputPanelMetrics>()

  const canExecute = !!modelId

  const handleExecute = async () => {
    if (!modelId || isExecuting) return

    setIsExecuting(true)
    setError(undefined)
    setOutput(undefined)

    try {
      const response = await execute(provider, modelId, code)

      if (response.success) {
        setOutput(response.output)

        if (response.metrics) {
          const panelMetrics: MetricsPanelMetrics = {
            inputTokens: response.metrics.inputTokens,
            outputTokens: response.metrics.outputTokens,
            totalTokens: response.metrics.totalTokens,
            durationMs: response.metrics.durationMs,
            tokensPerSecond: response.metrics.tokensPerSecond,
            costUsd: response.metrics.costUsd,
            provider: response.metrics.provider,
            model: response.metrics.model,
          }

          setMetrics(panelMetrics)

          const outMetrics: OutputPanelMetrics = {
            totalTokens: response.metrics.totalTokens,
            costUsd: response.metrics.costUsd,
            durationMs: response.metrics.durationMs,
          }

          setOutputMetrics(outMetrics)
        }

        if (response.graphStructure) {
          setGraphData({
            nodes: response.graphStructure.nodes.map((n) => ({
              id: n.id,
              type: n.type as any,
            })),
            edges: response.graphStructure.edges.map((e) => ({
              source: e.source,
              target: e.target,
              condition: e.condition,
            })),
          })
        }
      } else {
        setError(response.error || 'Execution failed')
      }
    } catch (err) {
      setError(`Execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <MainLayout>
      <Header />

      <div className="flex h-full flex-col gap-4 p-4 pt-20">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Playground</h1>
            <Button
              onClick={handleExecute}
              disabled={!canExecute || isExecuting || !code.trim()}
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute
                </>
              )}
            </Button>
          </div>

          <ProviderSelector />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-lg border border-border">
              <CodeEditor
                code={code}
                onChange={setCode}
                language="python"
                height="100%"
                readOnly={isExecuting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex-1 rounded-lg border border-border bg-background">
              <OutputPanel
                output={output}
                error={error}
                isLoading={isExecuting}
                metrics={outputMetrics}
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-64 rounded-lg border border-border">
            <GraphCanvas graphData={graphData || { nodes: [], edges: [] }} />
          </div>

          <div className="h-64 rounded-lg border border-border">
            <MetricsPanel metrics={metrics} isLoading={isExecuting} />
          </div>

          <div className="h-64 rounded-lg border border-border bg-muted/30 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Tutorial Examples</p>
          </div>
        </section>
      </div>
    </MainLayout>
  )
}

export default PlaygroundPage