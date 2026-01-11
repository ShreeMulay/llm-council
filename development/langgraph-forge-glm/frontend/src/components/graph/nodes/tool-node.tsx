import { Wrench } from 'lucide-react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export function ToolNode({ data }: NodeProps) {
  return (
    <div className="w-48 rounded-lg border-2 border-orange-500 bg-orange-500/10 px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-500 bg-orange-500/20">
          <Wrench className="h-4 w-4 text-orange-500" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">{data.label}</div>
          <div className="text-xs text-muted-foreground">Tool</div>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="h-2 w-2 border-2 border-orange-500 bg-orange-500" />
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 border-2 border-orange-500 bg-orange-500" />
    </div>
  )
}