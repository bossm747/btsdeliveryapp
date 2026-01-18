import { useEffect, useState, useRef } from "react";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  /** The target number to animate to */
  value: number;
  /** Format the number (e.g., add currency symbol, decimals) */
  format?: (value: number) => string;
  /** Duration of the animation in milliseconds */
  duration?: number;
  /** Whether to show direction indicator (up/down arrow) */
  showDirection?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Spring stiffness for the animation */
  stiffness?: number;
  /** Spring damping for the animation */
  damping?: number;
}

/**
 * AnimatedNumber - Smoothly animates between number values.
 * Uses spring physics for natural-feeling transitions.
 * Great for cart totals, quantities, rewards points, etc.
 */
export function AnimatedNumber({
  value,
  format = (v) => v.toFixed(0),
  duration = 400,
  showDirection = false,
  className,
  stiffness = 100,
  damping = 30,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<string>(format(value));
  const [direction, setDirection] = useState<"up" | "down" | null>(null);
  const prevValue = useRef(value);

  const spring = useSpring(value, {
    stiffness,
    damping,
    duration: duration / 1000,
  });

  const display = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    if (value !== prevValue.current) {
      setDirection(value > prevValue.current ? "up" : "down");
      prevValue.current = value;

      // Clear direction indicator after animation
      const timer = setTimeout(() => setDirection(null), duration);
      return () => clearTimeout(timer);
    }
  }, [value, duration]);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (latest: string) => {
      setDisplayValue(latest);
    });
    return () => unsubscribe();
  }, [display]);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <motion.span
        key={value}
        initial={{ opacity: 0.8, y: direction === "up" ? 10 : -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {displayValue}
      </motion.span>

      {showDirection && (
        <AnimatePresence>
          {direction && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={cn(
                "text-xs",
                direction === "up" ? "text-green-500" : "text-red-500"
              )}
            >
              {direction === "up" ? "↑" : "↓"}
            </motion.span>
          )}
        </AnimatePresence>
      )}
    </span>
  );
}

/**
 * AnimatedPrice - Animated number specifically formatted for Philippine Peso.
 */
export function AnimatedPrice({
  value,
  className,
  showDirection = false,
}: {
  value: number;
  className?: string;
  showDirection?: boolean;
}) {
  return (
    <AnimatedNumber
      value={value}
      format={(v) => `₱${v.toFixed(2)}`}
      className={className}
      showDirection={showDirection}
    />
  );
}

/**
 * AnimatedQuantity - Animated quantity counter with pop effect.
 */
export function AnimatedQuantity({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 1.2, opacity: 0.8 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 25,
      }}
      className={className}
    >
      {value}
    </motion.span>
  );
}

/**
 * AnimatedPoints - Animated points/rewards counter with count-up effect.
 */
export function AnimatedPoints({
  value,
  label = "pts",
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const startValue = prevValue.current;
    const endValue = value;
    const diff = endValue - startValue;
    const duration = 600;
    const steps = 30;
    const stepDuration = duration / steps;

    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Easing function for smooth animation
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + diff * eased));

      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayValue(endValue);
        prevValue.current = endValue;
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <motion.span
        className="font-bold tabular-nums"
        animate={{
          scale: displayValue === value ? 1 : [1, 1.05, 1],
        }}
        transition={{ duration: 0.2 }}
      >
        {displayValue.toLocaleString()}
      </motion.span>
      <span className="text-sm text-gray-500">{label}</span>
    </span>
  );
}

/**
 * CountUpNumber - Simple count-up animation from 0 to target.
 * Useful for statistics and achievements.
 */
export function CountUpNumber({
  value,
  duration = 1000,
  format = (v) => v.toLocaleString(),
  className,
  delay = 0,
}: {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
  delay?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setHasStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(endValue * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration, hasStarted]);

  return (
    <motion.span
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
    >
      {format(displayValue)}
    </motion.span>
  );
}

/**
 * FlipNumber - Flip animation for single digit changes.
 * Great for countdowns or single-digit displays.
 */
export function FlipNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block overflow-hidden", className)}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default AnimatedNumber;
