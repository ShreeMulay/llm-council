import { Loader2, Terminal, Zap, DollarSign, Clock } from 'lucide-react'
import { ErrorDisplay } from './error-display'

export interface OutputPanelMetrics {
  totalTokens: number
  costUsd: number
  durationMs: number
}

export interface OutputPanelProps {
  output?: string
  error?: string
  suggestions?: string
  isLoading?: boolean
  metrics?: OutputPanelMetrics
}

export function OutputPanel({
  output,
  error,
  suggestions,
  isLoading,
  metrics,
}: OutputPanelProps) {
  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Executing code...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <ErrorDisplay error={error} suggestions={suggestions} />
      </div>
    )
  }

  if (output) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-success" />
          <h3 className="font-semibold text-foreground">Output</h3>
        </div>

        <pre className="flex-1 overflow-auto rounded-lg border border-border bg-muted/50 p-4 font-mono text-sm text-foreground">
          {output}
        </pre>

        {metrics && (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{metrics.totalTokens}</span> tokens
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">${metrics.costUsd.toFixed(6)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{metrics.durationMs}ms</span>
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="empty-state flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <Terminal className="h-12 w-12 text-muted-foreground/50" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-muted-foreground">No output yet</p>
        <p className="text-xs text-muted-foreground/70">
          Write some code and click Execute to see results
        </p>
      </div>
    </div>
  )
}