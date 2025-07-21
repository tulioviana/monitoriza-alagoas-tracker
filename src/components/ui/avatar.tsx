
import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: "sm" | "md" | "lg" | "xl" | "2xl"
    variant?: "default" | "rounded" | "square"
    status?: "online" | "offline" | "away" | "busy"
  }
>(({ className, size = "md", variant = "default", status, ...props }, ref) => {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12", 
    xl: "h-16 w-16",
    "2xl": "h-20 w-20"
  }
  
  const variants = {
    default: "rounded-full",
    rounded: "rounded-lg",
    square: "rounded-md"
  }
  
  const statusColors = {
    online: "bg-success",
    offline: "bg-muted-foreground",
    away: "bg-warning",
    busy: "bg-error"
  }
  
  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden border-2 border-background shadow-medium transition-all duration-normal hover:shadow-strong",
          sizes[size],
          variants[variant],
          className
        )}
        {...props}
      />
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-background",
            statusColors[status],
            size === "sm" && "h-2 w-2",
            size === "lg" && "h-3 w-3",
            size === "xl" && "h-4 w-4",
            size === "2xl" && "h-5 w-5"
          )}
        />
      )}
    </div>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-gradient-primary text-primary-foreground font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
