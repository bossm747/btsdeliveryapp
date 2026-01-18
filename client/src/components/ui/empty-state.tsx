import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "py-8 px-4",
        md: "py-12 px-6",
        lg: "py-16 px-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const iconContainerVariants = cva(
  "flex items-center justify-center rounded-full bg-muted mb-4",
  {
    variants: {
      size: {
        sm: "h-12 w-12",
        md: "h-16 w-16",
        lg: "h-20 w-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const iconVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-10 w-10",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

const titleVariants = cva("font-semibold text-foreground", {
  variants: {
    size: {
      sm: "text-base mb-1",
      md: "text-lg mb-2",
      lg: "text-xl mb-2",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

const descriptionVariants = cva("text-muted-foreground max-w-md", {
  variants: {
    size: {
      sm: "text-sm mb-3",
      md: "text-sm mb-4",
      lg: "text-base mb-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export interface EmptyStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  children?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      className,
      size,
      icon: Icon,
      title,
      description,
      action,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(emptyStateVariants({ size, className }))}
        role="status"
        aria-label={title}
        {...props}
      >
        {Icon && (
          <div className={cn(iconContainerVariants({ size }))}>
            <Icon className={cn(iconVariants({ size }))} aria-hidden="true" />
          </div>
        )}
        <h3 className={cn(titleVariants({ size }))}>{title}</h3>
        {description && (
          <p className={cn(descriptionVariants({ size }))}>{description}</p>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || "default"}
            size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
          >
            {action.label}
          </Button>
        )}
        {children}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState, emptyStateVariants }
