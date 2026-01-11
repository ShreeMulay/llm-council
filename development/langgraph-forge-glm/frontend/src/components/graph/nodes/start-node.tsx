import { Handle, Position, type NodeProps } from '@xyflow/react'

export function StartNode({ data }: NodeProps) {
  return (
    <div className="w-48 rounded-lg border-2 border-primary bg-primary/10 px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-primary/20">
          <span className="text-sm font-bold text-primary">S</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">{data.label}</div>
          <div className="text-xs text-muted-foreground">Start</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 border-2 border-primary bg-primary" />
    </div>
  )
}