import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
        // Domain colors
        kidney_core: "border-transparent bg-blue-500 text-white",
        cardiovascular: "border-transparent bg-red-500 text-white",
        pharmacotherapy: "border-transparent bg-purple-500 text-white",
        metabolic: "border-transparent bg-orange-500 text-white",
        ckd_complications: "border-transparent bg-blue-800 text-white",
        risk_mitigation: "border-transparent bg-green-500 text-white",
        planning: "border-transparent bg-gray-500 text-white",
        screening: "border-transparent bg-teal-500 text-white",
        care_coordination: "border-transparent bg-pink-500 text-white",
        // Alert colors
        critical: "border-transparent bg-red-600 text-white animate-pulse",
        warning: "border-transparent bg-amber-500 text-white",
        success: "border-transparent bg-emerald-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
