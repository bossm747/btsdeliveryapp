import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShoppingCart, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";

interface AddToCartButtonProps {
  /** Callback when button is clicked */
  onClick?: () => void;
  /** Show loading state */
  isLoading?: boolean;
  /** Text to display on the button */
  text?: string;
  /** Price to display (optional) */
  price?: number;
  /** Current quantity in cart (shows badge if > 0) */
  quantity?: number;
  /** Button variant */
  variant?: "default" | "compact" | "icon-only";
  /** Additional CSS classes */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
}

/**
 * AddToCartButton - Animated add to cart button with success state and quantity badge.
 * Features scale pulse on click, cart icon bounce, and checkmark success animation.
 *
 * Respects user's reduced motion preference:
 * - When reduced motion is preferred, skips scale and rotation animations
 * - Uses instant opacity changes for state transitions
 * - Badge appears instantly without spring animation
 */
export function AddToCartButton({
  onClick,
  isLoading = false,
  text = "Add to Cart",
  price,
  quantity = 0,
  variant = "default",
  className,
  disabled = false,
}: AddToCartButtonProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  // framer-motion's built-in hook for detecting reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    if (disabled || isLoading) return;

    // Trigger haptic feedback for add to cart action
    haptic.light();

    if (!prefersReducedMotion) {
      setIsPressed(true);
    }
    onClick?.();

    // Show success state briefly
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 1500);
  };

  useEffect(() => {
    if (isPressed) {
      const timer = setTimeout(() => setIsPressed(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isPressed]);

  // Transition config based on motion preference
  const instantTransition = { duration: 0 };
  const springTransition = { type: "spring" as const, stiffness: 500, damping: 30 };
  const fadeTransition = { duration: 0.2 };

  const buttonContent = () => {
    if (variant === "icon-only") {
      return (
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: -180 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, rotate: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: 180 }}
              transition={prefersReducedMotion ? instantTransition : springTransition}
            >
              <Check className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div
              key="cart"
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
              transition={prefersReducedMotion ? instantTransition : fadeTransition}
            >
              <Plus className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: -180 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, rotate: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, rotate: 180 }}
              transition={prefersReducedMotion ? instantTransition : springTransition}
            >
              <Check className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              key="cart"
              initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0 }}
              transition={prefersReducedMotion ? instantTransition : fadeTransition}
              className="relative"
            >
              <ShoppingCart className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.span
              key="added"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={prefersReducedMotion ? instantTransition : fadeTransition}
            >
              Added!
            </motion.span>
          ) : (
            <motion.span
              key="text"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={prefersReducedMotion ? instantTransition : fadeTransition}
            >
              {text}
              {price !== undefined && ` - ${price.toFixed(2)}`}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.button
      type="button"
      className={cn(
        "relative overflow-hidden font-semibold rounded-lg",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2",
        variant === "icon-only"
          ? "w-10 h-10 flex items-center justify-center"
          : variant === "compact"
          ? "px-3 py-2 text-sm"
          : "px-4 py-2.5",
        showSuccess
          ? "bg-green-500 text-white hover:bg-green-600"
          : "bg-[#FF6B35] text-white hover:bg-[#FF6B35]/90",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      animate={!prefersReducedMotion && isPressed ? { scale: [1, 1.05, 1] } : {}}
      transition={prefersReducedMotion ? instantTransition : fadeTransition}
      aria-label={text}
      data-testid="add-to-cart-button"
    >
      {/* Background flash effect - skip for reduced motion */}
      {!prefersReducedMotion && (
        <AnimatePresence>
          {isPressed && (
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      )}

      {buttonContent()}

      {/* Quantity badge */}
      <AnimatePresence>
        {quantity > 0 && !showSuccess && (
          <motion.div
            className={cn(
              "absolute flex items-center justify-center",
              "bg-white text-[#FF6B35] font-bold rounded-full",
              "border-2 border-[#FF6B35]",
              variant === "icon-only"
                ? "-top-1.5 -right-1.5 w-5 h-5 text-xs"
                : "-top-2 -right-2 min-w-[1.25rem] h-5 px-1 text-xs"
            )}
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0, y: 10 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0, y: -10 }}
            transition={prefersReducedMotion ? instantTransition : springTransition}
            data-testid="cart-quantity-badge"
          >
            {quantity > 99 ? "99+" : quantity}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default AddToCartButton;
