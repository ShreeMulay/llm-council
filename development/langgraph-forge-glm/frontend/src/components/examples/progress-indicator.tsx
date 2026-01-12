interface ProgressIndicatorProps {
  completed: number
  total: number
}

export function ProgressIndicator({ completed, total }: ProgressIndicatorProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden" aria-label={`Progress: ${completed} of ${total} examples`}>
      <div
        className="h-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={total}
      />
    </div>
  )
}