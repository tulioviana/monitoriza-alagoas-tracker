
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-soft hover:bg-primary-hover",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        success: "border-transparent bg-success text-success-foreground shadow-soft",
        warning: "border-transparent bg-warning text-warning-foreground shadow-soft",
        error: "border-transparent bg-error text-error-foreground shadow-soft",
        info: "border-transparent bg-info text-info-foreground shadow-soft",
        outline: "border-input text-foreground hover:bg-accent hover:text-accent-foreground",
        muted: "border-transparent bg-muted text-muted-foreground hover:bg-muted-hover",
        ghost: "border-transparent hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

function Badge({ className, variant, size, dot = false, pulse = false, children, ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant, size }),
        pulse && "animate-pulse-glow",
        className
      )} 
      {...props}
    >
      {dot && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full bg-current",
          pulse && "animate-pulse"
        )} />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
