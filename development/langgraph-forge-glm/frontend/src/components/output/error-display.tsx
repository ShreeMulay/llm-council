import { AlertCircle } from 'lucide-react'

export interface ErrorDisplayProps {
  error: string
  suggestions?: string
}

export function ErrorDisplay({ error, suggestions }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-error" />
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-error">Error</h3>
          <p className="text-sm text-foreground/80">{error}</p>
        </div>
      </div>

      {suggestions && (
        <div className="flex flex-col gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <h3 className="font-semibold text-foreground">Suggestions</h3>
          <p className="text-sm text-foreground/80">{suggestions}</p>
        </div>
      )}
    </div>
  )
}