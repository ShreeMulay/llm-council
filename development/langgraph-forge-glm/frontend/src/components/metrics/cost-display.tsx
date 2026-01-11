interface CostDisplayProps {
  costUsd: number
  totalTokens?: number
  showBreakdown?: boolean
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}

function calculateCostPerToken(cost: number, tokens: number): string {
  if (tokens === 0) return 'N/A'
  const per1000 = (cost / tokens) * 1000
  return `$${per1000.toFixed(4)} / 1K tokens`
}

export function CostDisplay({ costUsd, totalTokens, showBreakdown = false }: CostDisplayProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-1">
        <div className="text-2xl font-semibold">{formatCost(costUsd)}</div>
        <div className="text-xs text-muted-foreground">USD</div>
      </div>
      {showBreakdown && totalTokens && (
        <div className="text-xs text-muted-foreground">
          {calculateCostPerToken(costUsd, totalTokens)}
        </div>
      )}
    </div>
  )
}