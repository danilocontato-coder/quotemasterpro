import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "modern" | "ghost";
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    const baseStyles = "flex w-full rounded-md border bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200";
    
    const variants = {
      default: "h-11 border-input-border hover:border-border-hover focus-visible:border-border-focus shadow-sm focus:shadow-focus",
      modern: "h-12 border-input-border hover:border-border-hover focus-visible:border-border-focus shadow-base focus:shadow-focus rounded-lg bg-gradient-to-r from-background to-card",
      ghost: "h-11 border-0 bg-muted/50 hover:bg-muted focus-visible:bg-background focus-visible:ring-1"
    };

    return (
      <input
        type={type}
        className={cn(
          baseStyles,
          variants[variant],
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
