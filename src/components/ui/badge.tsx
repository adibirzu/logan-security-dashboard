import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Oracle-specific variants
        oracle: "border-transparent bg-oracle-red-500 text-white hover:bg-oracle-red-600",
        "oracle-outline": "border-oracle-red-500 text-oracle-red-500 bg-transparent hover:bg-oracle-red-50",
        "oracle-secondary": "border-transparent bg-oracle-blue-500 text-white hover:bg-oracle-blue-600",
        // Status variants
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        error: "border-transparent bg-error text-error-foreground hover:bg-error/80",
        critical: "border-transparent bg-critical text-critical-foreground hover:bg-critical/80 shadow-sm",
        // Severity variants for security dashboard
        high: "border-transparent bg-critical text-critical-foreground hover:bg-critical/80",
        medium: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        low: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        info: "border-transparent bg-oracle-blue-500 text-white hover:bg-oracle-blue-600",
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
