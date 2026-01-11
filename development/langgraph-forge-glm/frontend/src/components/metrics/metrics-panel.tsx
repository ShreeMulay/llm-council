import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TokenDisplay } from './token-display'
import { CostDisplay } from './cost-display'

export interface ExecutionMetrics {
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  tokensPerSecond: number
  costUsd: number
}

interface MetricsPanelProps {
  metrics: ExecutionMetrics | null
  isLoading?: boolean
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`
  }
  return tokens.toString()
}

export function MetricsPanel({ metrics, isLoading = false }: MetricsPanelProps) {
  const modelParts = metrics?.model.split('/') || []
  const shortModelName = modelParts.length > 1 ? modelParts.slice(1).join('/') : modelParts[0] || ''

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading metrics...
          </div>
        </CardContent>
      </Card>
    )
  }

  const defaultMetrics: ExecutionMetrics = {
    provider: '-',
    model: '-',
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    durationMs: 0,
    tokensPerSecond: 0,
    costUsd: 0,
  }

  const displayMetrics = metrics || defaultMetrics

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Execution Metrics</CardTitle>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <div>{displayMetrics.provider}</div>
          <div>•</div>
          <div title={displayMetrics.model}>{shortModelName}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TokenDisplay
          inputTokens={displayMetrics.inputTokens}
          outputTokens={displayMetrics.outputTokens}
          totalTokens={displayMetrics.totalTokens}
        />

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Speed</div>
            <div className="text-lg font-semibold">
              {displayMetrics.tokensPerSecond > 0
                ? `${displayMetrics.tokensPerSecond} tokens/s`
                : '0 tokens/s'}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <CostDisplay
            costUsd={displayMetrics.costUsd}
            totalTokens={displayMetrics.totalTokens}
            showBreakdown
          />
        </div>
      </CardContent>
    </Card>
  )
}