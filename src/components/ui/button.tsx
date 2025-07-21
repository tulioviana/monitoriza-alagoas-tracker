
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-label-md font-medium ring-offset-background transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-medium hover:shadow-strong hover:scale-[1.02] active:scale-[0.98]",
        destructive: "bg-error text-error-foreground shadow-medium hover:bg-error/90 hover:shadow-strong hover:scale-[1.02] active:scale-[0.98]",
        outline: "border border-input bg-background shadow-soft hover:bg-accent hover:text-accent-foreground hover:border-border-hover hover:shadow-medium hover:scale-[1.02] active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary-hover hover:shadow-medium hover:scale-[1.02] active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:scale-[1.02] active:scale-[0.98] rounded-md",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        success: "bg-success text-success-foreground shadow-medium hover:bg-success/90 hover:shadow-strong hover:scale-[1.02] active:scale-[0.98]",
        warning: "bg-warning text-warning-foreground shadow-medium hover:bg-warning/90 hover:shadow-strong hover:scale-[1.02] active:scale-[0.98]",
        info: "bg-info text-info-foreground shadow-medium hover:bg-info/90 hover:shadow-strong hover:scale-[1.02] active:scale-[0.98]"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        xl: "h-14 rounded-xl px-8 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12"
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
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
