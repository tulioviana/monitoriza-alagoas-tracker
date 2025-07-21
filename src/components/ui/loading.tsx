
import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "primary" | "muted"
  className?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = "md", 
  variant = "default",
  className 
}) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  }
  
  const variants = {
    default: "text-foreground",
    primary: "text-primary",
    muted: "text-muted-foreground"
  }
  
  return (
    <svg
      className={cn(
        "animate-spin",
        sizes[size],
        variants[variant],
        className
      )}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

interface LoadingDotsProps {
  className?: string
}

const LoadingDots: React.FC<LoadingDotsProps> = ({ className }) => (
  <div className={cn("flex space-x-1", className)}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 bg-current rounded-full animate-pulse"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
)

interface LoadingPulseProps {
  className?: string
  children?: React.ReactNode
}

const LoadingPulse: React.FC<LoadingPulseProps> = ({ className, children }) => (
  <div className={cn("animate-pulse", className)}>
    {children}
  </div>
)

interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = "rectangular",
  width,
  height 
}) => {
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg"
  }
  
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height
  }
  
  return (
    <div
      className={cn(
        "skeleton bg-muted",
        variants[variant],
        className
      )}
      style={style}
    />
  )
}

export { LoadingSpinner, LoadingDots, LoadingPulse, Skeleton }
