import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-white font-medium shadow-modern-md hover:shadow-modern-lg hover:-translate-y-0.5 focus:ring-primary-accent/30",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-modern-sm hover:shadow-modern-md",
        outline:
          "border-2 border-accent-bright text-accent-bright bg-background hover:bg-accent hover:text-accent-foreground shadow-modern-sm hover:shadow-modern-md",
        secondary:
          "bg-secondary hover:bg-secondary-hover text-secondary-foreground border border-border shadow-modern-sm hover:shadow-modern-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-accent-bright underline-offset-4 hover:underline hover:text-accent-bright/80",
        premium: "bg-gradient-primary text-white font-semibold shadow-modern-lg hover:shadow-modern-xl hover:-translate-y-1 focus:ring-primary-accent/40 ring-2 ring-primary-accent/20",
        minimal: "text-muted-foreground hover:text-card-foreground hover:bg-muted/50 rounded-lg",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-modern-sm hover:shadow-modern-md",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-modern-sm hover:shadow-modern-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base font-semibold",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
