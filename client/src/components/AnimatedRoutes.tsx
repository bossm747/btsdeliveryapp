import { AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { ReactNode } from "react";

interface AnimatedRoutesProps {
  children: ReactNode;
}

/**
 * AnimatedRoutes provides the AnimatePresence context for page transitions.
 * It tracks route changes via wouter's useLocation hook and enables
 * exit animations when routes change.
 */
export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={location}>
        {children}
      </div>
    </AnimatePresence>
  );
}

export default AnimatedRoutes;
