import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/use-haptic";

interface SuccessCheckmarkProps {
  /** Whether to show the checkmark */
  show?: boolean;
  /** Size of the checkmark */
  size?: "sm" | "md" | "lg" | "xl";
  /** Color variant */
  variant?: "success" | "primary" | "brand";
  /** Title text to display below checkmark */
  title?: string;
  /** Description text to display below title */
  description?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Auto-hide after animation (ms) */
  autoHide?: number;
}

const sizeClasses = {
  sm: {
    container: "w-12 h-12",
    stroke: 2,
    radius: 20,
    checkPath: "M6 12l4 4 8-8",
    viewBox: "0 0 24 24",
  },
  md: {
    container: "w-16 h-16",
    stroke: 2.5,
    radius: 28,
    checkPath: "M8 16l4 4 10-10",
    viewBox: "0 0 28 28",
  },
  lg: {
    container: "w-24 h-24",
    stroke: 3,
    radius: 44,
    checkPath: "M12 24l6 6 16-16",
    viewBox: "0 0 44 44",
  },
  xl: {
    container: "w-32 h-32",
    stroke: 4,
    radius: 60,
    checkPath: "M16 32l8 8 22-22",
    viewBox: "0 0 60 60",
  },
};

const colorClasses = {
  success: {
    circle: "stroke-green-500",
    check: "stroke-green-500",
    bg: "bg-green-50",
    text: "text-green-800",
    subtext: "text-green-600",
  },
  primary: {
    circle: "stroke-blue-500",
    check: "stroke-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-800",
    subtext: "text-blue-600",
  },
  brand: {
    circle: "stroke-[#FF6B35]",
    check: "stroke-[#FF6B35]",
    bg: "bg-orange-50",
    text: "text-[#004225]",
    subtext: "text-gray-600",
  },
};

/**
 * SuccessCheckmark - Animated checkmark for form submissions and confirmations.
 * Features a circle that draws in, followed by a checkmark that appears.
 * Perfect for order confirmation, payment success, etc.
 *
 * Respects user's reduced motion preference:
 * - When reduced motion is preferred, shows static checkmark immediately
 * - Skips circle drawing animation and particle burst
 * - Uses simple opacity fade for enter/exit
 */
export function SuccessCheckmark({
  show = true,
  size = "lg",
  variant = "success",
  title,
  description,
  onComplete,
  className,
  autoHide,
}: SuccessCheckmarkProps) {
  const [isVisible, setIsVisible] = useState(show);
  const sizeConfig = sizeClasses[size];
  const colors = colorClasses[variant];
  const hapticTriggeredRef = useRef(false);

  // framer-motion's built-in hook for detecting reduced motion preference
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setIsVisible(show);
    // Trigger success haptic feedback when checkmark appears
    if (show && !hapticTriggeredRef.current) {
      hapticTriggeredRef.current = true;
      haptic.success();
    } else if (!show) {
      hapticTriggeredRef.current = false;
    }
  }, [show]);

  useEffect(() => {
    if (autoHide && show) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide, show]);

  // Calculate circle circumference for dash animation
  const circleRadius = sizeConfig.radius / 2 - sizeConfig.stroke;
  const circumference = 2 * Math.PI * circleRadius;

  // Transition configs based on motion preference
  const instantTransition = { duration: 0 };
  const fadeTransition = { duration: 0.3 };

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          className={cn(
            "flex flex-col items-center justify-center",
            className
          )}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
          transition={prefersReducedMotion ? instantTransition : fadeTransition}
          data-testid="success-checkmark"
        >
          {/* Checkmark Container */}
          <div
            className={cn(
              "relative flex items-center justify-center rounded-full",
              colors.bg,
              sizeConfig.container
            )}
          >
            <svg
              viewBox={`0 0 ${sizeConfig.radius} ${sizeConfig.radius}`}
              className={cn("absolute inset-0", sizeConfig.container)}
            >
              {/* Background circle (static) */}
              <circle
                cx={sizeConfig.radius / 2}
                cy={sizeConfig.radius / 2}
                r={circleRadius}
                fill="none"
                strokeWidth={sizeConfig.stroke}
                className="stroke-gray-200"
              />

              {/* Animated circle - static for reduced motion */}
              {prefersReducedMotion ? (
                <circle
                  cx={sizeConfig.radius / 2}
                  cy={sizeConfig.radius / 2}
                  r={circleRadius}
                  fill="none"
                  strokeWidth={sizeConfig.stroke}
                  className={colors.circle}
                  strokeLinecap="round"
                  style={{
                    transformOrigin: "center",
                    transform: "rotate(-90deg)",
                  }}
                />
              ) : (
                <motion.circle
                  cx={sizeConfig.radius / 2}
                  cy={sizeConfig.radius / 2}
                  r={circleRadius}
                  fill="none"
                  strokeWidth={sizeConfig.stroke}
                  className={colors.circle}
                  strokeLinecap="round"
                  initial={{
                    strokeDasharray: circumference,
                    strokeDashoffset: circumference,
                    rotate: -90,
                  }}
                  animate={{
                    strokeDashoffset: 0,
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                  }}
                  style={{
                    transformOrigin: "center",
                    transform: "rotate(-90deg)",
                  }}
                />
              )}
            </svg>

            {/* Checkmark SVG - static for reduced motion */}
            <svg
              viewBox="0 0 24 24"
              className={cn(
                "relative z-10",
                size === "sm" ? "w-6 h-6" : size === "md" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-16 h-16"
              )}
            >
              {prefersReducedMotion ? (
                <path
                  d="M4 12l6 6L20 6"
                  fill="none"
                  strokeWidth={sizeConfig.stroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={colors.check}
                />
              ) : (
                <motion.path
                  d="M4 12l6 6L20 6"
                  fill="none"
                  strokeWidth={sizeConfig.stroke}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={colors.check}
                  initial={{
                    pathLength: 0,
                    opacity: 0,
                  }}
                  animate={{
                    pathLength: 1,
                    opacity: 1,
                  }}
                  transition={{
                    pathLength: {
                      duration: 0.4,
                      delay: 0.4,
                      ease: "easeOut",
                    },
                    opacity: {
                      duration: 0.1,
                      delay: 0.4,
                    },
                  }}
                />
              )}
            </svg>

            {/* Particle burst effect - skip entirely for reduced motion */}
            {!prefersReducedMotion && [...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  variant === "success"
                    ? "bg-green-400"
                    : variant === "primary"
                    ? "bg-blue-400"
                    : "bg-[#FFD23F]"
                )}
                initial={{
                  scale: 0,
                  x: 0,
                  y: 0,
                  opacity: 1,
                }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * 45 * Math.PI) / 180) * 40,
                  y: Math.sin((i * 45 * Math.PI) / 180) * 40,
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 0.6,
                  delay: 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          {/* Title */}
          {title && (
            <motion.h3
              className={cn(
                "mt-4 text-lg font-semibold",
                colors.text
              )}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? instantTransition : { delay: 0.6, duration: 0.3 }}
            >
              {title}
            </motion.h3>
          )}

          {/* Description */}
          {description && (
            <motion.p
              className={cn(
                "mt-2 text-sm text-center max-w-xs",
                colors.subtext
              )}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? instantTransition : { delay: 0.7, duration: 0.3 }}
            >
              {description}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * OrderSuccessCheckmark - Pre-configured success checkmark for order confirmations.
 */
export function OrderSuccessCheckmark({
  orderNumber,
  onComplete,
  className,
}: {
  orderNumber?: string;
  onComplete?: () => void;
  className?: string;
}) {
  return (
    <SuccessCheckmark
      size="xl"
      variant="brand"
      title="Order Placed Successfully!"
      description={
        orderNumber
          ? `Your order #${orderNumber} has been confirmed. You'll receive updates on your order status.`
          : "Your order has been confirmed. You'll receive updates on your order status."
      }
      onComplete={onComplete}
      className={className}
    />
  );
}

/**
 * PaymentSuccessCheckmark - Pre-configured success checkmark for payment confirmations.
 */
export function PaymentSuccessCheckmark({
  amount,
  onComplete,
  className,
}: {
  amount?: number;
  onComplete?: () => void;
  className?: string;
}) {
  return (
    <SuccessCheckmark
      size="lg"
      variant="success"
      title="Payment Successful!"
      description={
        amount
          ? `Your payment of ${amount.toFixed(2)} has been processed successfully.`
          : "Your payment has been processed successfully."
      }
      onComplete={onComplete}
      className={className}
    />
  );
}

export default SuccessCheckmark;
