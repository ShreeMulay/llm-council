import { Handle, Position, type NodeProps } from '@xyflow/react'

export function EndNode({ data }: NodeProps) {
  return (
    <div className="w-48 rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-destructive bg-destructive/20">
          <span className="text-sm font-bold text-destructive">E</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">{data.label}</div>
          <div className="text-xs text-muted-foreground">End</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="h-2 w-2 border-2 border-destructive bg-destructive" />
    </div>
  )
}