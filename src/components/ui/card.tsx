
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "elevated" | "outline" | "glass"
    interactive?: boolean
  }
>(({ className, variant = "default", interactive = false, ...props }, ref) => {
  const variants = {
    default: "bg-card border border-card-border shadow-soft",
    elevated: "bg-card border border-card-border shadow-medium hover:shadow-strong",
    outline: "bg-card border-2 border-card-border shadow-soft",
    glass: "glass border border-white/20 shadow-medium"
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl text-card-foreground transition-all duration-normal",
        variants[variant],
        interactive && "hover:shadow-strong hover:-translate-y-1 cursor-pointer hover:border-border-hover",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    gradient?: boolean
  }
>(({ className, gradient = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-6",
      gradient && "bg-gradient-surface rounded-t-xl",
      className
    )}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    size?: "sm" | "md" | "lg" | "xl"
  }
>(({ className, size = "lg", ...props }, ref) => {
  const sizes = {
    sm: "text-display-sm",
    md: "text-display-md", 
    lg: "text-display-lg",
    xl: "text-display-xl"
  }
  
  return (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight text-foreground",
        sizes[size],
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-6 pt-0", className)} 
    {...props} 
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "bordered"
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-6 pt-0",
      variant === "bordered" && "border-t border-card-border pt-4 mt-4",
      className
    )}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
