import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";

interface FavoriteButtonProps {
  /** Initial favorite state */
  isFavorite?: boolean;
  /** Callback when favorite state changes */
  onToggle?: (isFavorite: boolean) => void;
  /** Size of the button */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Disable the button */
  disabled?: boolean;
  /** aria-label for accessibility */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

/**
 * FavoriteButton - Animated heart button with bounce and fill animations.
 * Uses framer-motion for spring physics and smooth color transitions.
 *
 * Respects user's reduced motion preference:
 * - When reduced motion is preferred, skips bounce and particle animations
 * - State changes are instant but still visually clear
 */
export function FavoriteButton({
  isFavorite: initialFavorite = false,
  onToggle,
  size = "md",
  className,
  disabled = false,
  ariaLabel = "Toggle favorite",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isAnimating, setIsAnimating] = useState(false);

  // framer-motion's built-in hook for detecting reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    if (disabled) return;

    // Trigger haptic feedback
    haptic.light();

    if (!prefersReducedMotion) {
      setIsAnimating(true);
    }
    const newState = !isFavorite;
    setIsFavorite(newState);
    onToggle?.(newState);
  };

  return (
    <motion.button
      type="button"
      className={cn(
        "relative flex items-center justify-center rounded-full",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[#FF6B35] focus:ring-offset-2",
        isFavorite
          ? "bg-red-50 hover:bg-red-100"
          : "bg-gray-100 hover:bg-gray-200",
        disabled && "opacity-50 cursor-not-allowed",
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
      aria-label={ariaLabel}
      aria-pressed={isFavorite}
      data-testid="favorite-button"
    >
      {/* Background pulse effect on click - skip for reduced motion */}
      {!prefersReducedMotion && (
        <AnimatePresence>
          {isAnimating && isFavorite && (
            <motion.div
              className="absolute inset-0 rounded-full bg-red-200"
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              onAnimationComplete={() => setIsAnimating(false)}
            />
          )}
        </AnimatePresence>
      )}

      {/* Heart icon with bounce animation - simplified for reduced motion */}
      <motion.div
        animate={
          !prefersReducedMotion && isAnimating && isFavorite
            ? {
                scale: [1, 1.3, 0.9, 1.1, 1],
              }
            : { scale: 1 }
        }
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : {
                duration: 0.4,
                ease: "easeOut",
                times: [0, 0.2, 0.4, 0.6, 1],
              }
        }
      >
        <Heart
          className={cn(
            iconSizes[size],
            "transition-colors duration-200",
            isFavorite
              ? "fill-red-500 text-red-500"
              : "fill-transparent text-gray-400"
          )}
        />
      </motion.div>

      {/* Particle effects on favorite - skip entirely for reduced motion */}
      {!prefersReducedMotion && (
        <AnimatePresence>
          {isAnimating && isFavorite && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-red-400"
                  initial={{
                    scale: 0,
                    x: 0,
                    y: 0,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                    y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                  }}
                  transition={{
                    duration: 0.4,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      )}
    </motion.button>
  );
}

export default FavoriteButton;
