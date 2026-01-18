import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition component wraps page content with subtle fade and slide animations.
 * Uses framer-motion for smooth enter/exit transitions between routes.
 * Animation is fast (250ms) and professional - not too dramatic for a delivery app.
 *
 * Respects user's reduced motion preference:
 * - When reduced motion is preferred, uses instant opacity changes only
 * - No movement animations for users who prefer reduced motion
 */
export function PageTransition({ children, className = "" }: PageTransitionProps) {
  // framer-motion's built-in hook for detecting reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  // When user prefers reduced motion, use simple opacity fade (no movement)
  if (prefersReducedMotion) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.01 }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  // Standard animation with movement
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1], // Subtle easing curve
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
