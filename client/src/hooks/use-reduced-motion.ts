import { useState, useEffect } from "react";

/**
 * Custom hook that detects if the user prefers reduced motion.
 * Uses the `prefers-reduced-motion` media query to respect user's accessibility settings.
 *
 * @returns {boolean} - true if the user prefers reduced motion, false otherwise
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 *
 * // In component:
 * const animationDuration = prefersReducedMotion ? 0 : 0.3;
 */
export function useReducedMotion(): boolean {
  // Default to false (allow animations) for SSR
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is supported (it should be in modern browsers)
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    // Create the media query
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Handler for when the preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers use addEventListener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers (Safari < 14)
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Returns animation configuration based on reduced motion preference.
 * Useful for framer-motion configurations.
 *
 * @returns Animation config object with duration and spring settings
 *
 * @example
 * const { duration, spring } = useAnimationConfig();
 *
 * <motion.div
 *   animate={{ opacity: 1 }}
 *   transition={{ duration }}
 * />
 */
export function useAnimationConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    // Duration for simple transitions
    duration: prefersReducedMotion ? 0 : 0.3,
    // Spring configuration for bouncy animations
    spring: prefersReducedMotion
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 500, damping: 30 },
    // Whether to skip animations entirely
    skipAnimations: prefersReducedMotion,
    // Instant transition for reduced motion
    instant: { duration: 0 },
    // Standard transition (respects reduced motion)
    standard: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.3, ease: "easeOut" as const },
  };
}

export default useReducedMotion;
