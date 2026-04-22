import * as React from "react"
import { cn } from "@/lib/utils"

export function Display({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-headline text-5xl md:text-6xl text-on-surface leading-tight",
        className
      )}
      {...props}
    />
  )
}

export function Narrative({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-lg text-on-surface-variant leading-relaxed font-light",
        className
      )}
      {...props}
    />
  )
}

export function Label({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "font-label text-sm uppercase tracking-widest text-secondary",
        className
      )}
      {...props}
    />
  )
}
