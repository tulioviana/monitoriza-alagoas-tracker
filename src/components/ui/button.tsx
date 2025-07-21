
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-modern-md hover:shadow-modern-lg hover:-translate-y-0.5 focus:ring-primary/30",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-modern-md hover:shadow-modern-lg",
        outline:
          "border-2 border-primary text-primary bg-background hover:bg-primary hover:text-primary-foreground shadow-modern-sm hover:shadow-modern-md",
        secondary:
          "bg-secondary hover:bg-secondary-hover text-secondary-foreground border-2 border-border shadow-modern-sm hover:shadow-modern-md",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        premium: "bg-primary text-primary-foreground font-bold shadow-modern-lg hover:shadow-modern-xl hover:-translate-y-1 focus:ring-primary/40 border-2 border-primary/20",
        minimal: "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-modern-md hover:shadow-modern-lg",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-modern-md hover:shadow-modern-lg",
        accent: "bg-accent text-accent-foreground hover:bg-accent-bright shadow-modern-md hover:shadow-modern-lg",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base font-bold",
        xl: "h-14 rounded-xl px-10 text-lg font-bold",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
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
