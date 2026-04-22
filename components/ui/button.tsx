import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "primary" | "secondary" | "tertiary"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const variants = {
      primary: "bg-primary text-on-primary hover:opacity-90 shadow-sm",
      secondary: "border border-outline-variant/20 text-secondary hover:bg-surface-container-high",
      tertiary: "text-primary hover:opacity-80"
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md py-4 px-8 font-label uppercase tracking-widest text-sm transition-all duration-300 ease-in-out disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
