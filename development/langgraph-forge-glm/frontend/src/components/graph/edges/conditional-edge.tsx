import type { EdgeProps } from '@xyflow/react'
import { BaseEdge } from '@xyflow/react'

export function ConditionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  label,
}: EdgeProps) {
  return (
    <>
      <BaseEdge
        id={id}
        path={`M${sourceX},${sourceY} L${targetX},${targetY}`}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: label ? 'hsl(var(--primary))' : 'hsl(var(--border))',
          strokeWidth: label ? 2 : 1,
        }}
      />
      {label && (
        <div
          style={{
            position: 'absolute',
            left: (sourceX + targetX) / 2,
            top: (sourceY + targetY) / 2 - 20,
            transform: 'translateX(-50%)',
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '12px',
            color: 'hsl(var(--foreground))',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      )}
    </>
  )
}