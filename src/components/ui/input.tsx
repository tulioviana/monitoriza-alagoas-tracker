
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "filled" | "ghost"
  inputSize?: "sm" | "md" | "lg"
  error?: boolean
  success?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", inputSize = "md", error = false, success = false, ...props }, ref) => {
    const variants = {
      default: "border border-input bg-background",
      filled: "border border-input bg-muted",
      ghost: "border-0 bg-transparent border-b border-input rounded-none"
    }
    
    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-3 text-base", 
      lg: "h-12 px-4 text-lg"
    }
    
    const states = {
      error: "border-error focus:border-error focus:ring-error",
      success: "border-success focus:border-success focus:ring-success",
      default: "focus:border-input-focus focus:ring-ring"
    }
    
    const state = error ? "error" : success ? "success" : "default"
    
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-normal",
          variants[variant],
          sizes[inputSize],
          states[state],
          "hover:border-border-hover",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
