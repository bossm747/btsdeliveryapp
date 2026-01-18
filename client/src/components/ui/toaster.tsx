import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { haptic } from "@/hooks/use-haptic"

export function Toaster() {
  const { toasts } = useToast()
  // Track which toasts have already triggered haptic feedback
  const hapticTriggeredRef = useRef<Set<string>>(new Set())

  // Trigger haptic feedback when new toasts appear
  useEffect(() => {
    toasts.forEach((toast) => {
      // Only trigger haptic if we haven't already for this toast
      if (!hapticTriggeredRef.current.has(toast.id)) {
        hapticTriggeredRef.current.add(toast.id)

        // Trigger different haptic patterns based on toast variant
        if (toast.variant === "destructive") {
          haptic.error()
        }
      }
    })

    // Clean up old toast IDs to prevent memory leak
    const currentIds = new Set(toasts.map((t) => t.id))
    hapticTriggeredRef.current.forEach((id) => {
      if (!currentIds.has(id)) {
        hapticTriggeredRef.current.delete(id)
      }
    })
  }, [toasts])

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
