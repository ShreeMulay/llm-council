interface TokenDisplayProps {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    const value = tokens / 1000
    if (Number.isInteger(value)) {
      return `${value}K`
    }
    return `${value.toFixed(1)}K`
  }
  return tokens.toString()
}

export function TokenDisplay({ inputTokens, outputTokens, totalTokens }: TokenDisplayProps) {
  const total = formatTokens(totalTokens)
  const input = formatTokens(inputTokens)
  const output = formatTokens(outputTokens)

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Input</div>
        <div className="text-2xl font-semibold">{input}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Output</div>
        <div className="text-2xl font-semibold">{output}</div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Total</div>
        <div className="text-2xl font-semibold">{total}</div>
      </div>
    </div>
  )
}