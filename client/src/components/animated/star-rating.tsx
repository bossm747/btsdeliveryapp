import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Current rating value (0-5) */
  value?: number;
  /** Maximum number of stars */
  max?: number;
  /** Callback when rating changes */
  onChange?: (rating: number) => void;
  /** Whether the rating is read-only */
  readOnly?: boolean;
  /** Size of the stars */
  size?: "sm" | "md" | "lg";
  /** Show rating label */
  showLabel?: boolean;
  /** Custom rating labels */
  labels?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Allow half-star ratings */
  allowHalf?: boolean;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

const defaultLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const labelColors = [
  "",
  "text-red-500",
  "text-orange-500",
  "text-amber-500",
  "text-lime-500",
  "text-green-500",
];

/**
 * StarRating - Animated star rating component with stagger animations.
 * Features pulse/glow effects on selection and smooth color fill transitions.
 */
export function StarRating({
  value = 0,
  max = 5,
  onChange,
  readOnly = false,
  size = "md",
  showLabel = true,
  labels = defaultLabels,
  className,
  allowHalf = false,
}: StarRatingProps) {
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(value);

  const displayRating = hoveredRating || selectedRating;

  const handleStarClick = (rating: number) => {
    if (readOnly) return;

    setSelectedRating(rating);
    onChange?.(rating);
  };

  const handleMouseEnter = (rating: number) => {
    if (readOnly) return;
    setHoveredRating(rating);
  };

  const handleMouseLeave = () => {
    if (readOnly) return;
    setHoveredRating(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, currentStar: number) => {
    if (readOnly) return;

    let newRating = selectedRating;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        e.preventDefault();
        newRating = Math.min(max, currentStar + 1);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        e.preventDefault();
        newRating = Math.max(1, currentStar - 1);
        break;
      case "Home":
        e.preventDefault();
        newRating = 1;
        break;
      case "End":
        e.preventDefault();
        newRating = max;
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        newRating = currentStar;
        break;
      default:
        return;
    }

    setSelectedRating(newRating);
    onChange?.(newRating);
  };

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      <div
        className="flex items-center gap-1"
        onMouseLeave={handleMouseLeave}
        role={readOnly ? "img" : "radiogroup"}
        aria-label={readOnly ? `Rating: ${selectedRating} out of ${max}` : "Rating selection"}
        data-testid="star-rating"
      >
        {[...Array(max)].map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= displayRating;
          const isActive = starValue <= selectedRating;

          return (
            <motion.button
              key={index}
              type="button"
              className={cn(
                "relative p-0.5 rounded-sm",
                "focus:outline-none focus:ring-2 focus:ring-[#FFD23F] focus:ring-offset-2",
                !readOnly && "cursor-pointer",
                readOnly && "cursor-default"
              )}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onClick={() => handleStarClick(starValue)}
              onKeyDown={(e) => handleKeyDown(e, starValue)}
              disabled={readOnly}
              initial={false}
              animate={
                isActive && !readOnly
                  ? {
                      scale: [1, 1.2, 1],
                    }
                  : {}
              }
              transition={{
                duration: 0.3,
                delay: index * 0.05, // Stagger effect
              }}
              whileHover={!readOnly ? { scale: 1.1 } : undefined}
              whileTap={!readOnly ? { scale: 0.95 } : undefined}
              role={readOnly ? undefined : "radio"}
              aria-checked={readOnly ? undefined : selectedRating === starValue}
              aria-label={readOnly ? undefined : `${starValue} star${starValue > 1 ? "s" : ""}`}
              tabIndex={
                readOnly
                  ? -1
                  : selectedRating === starValue || (selectedRating === 0 && starValue === 1)
                  ? 0
                  : -1
              }
              data-testid={`star-${starValue}`}
            >
              {/* Glow effect */}
              {isFilled && !readOnly && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#FFD23F]/30 blur-md"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}

              {/* Star icon */}
              <motion.div
                className="relative"
                initial={false}
                animate={{
                  rotate: isActive && !readOnly ? [0, -10, 10, 0] : 0,
                }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05,
                }}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    "transition-colors duration-200",
                    isFilled
                      ? "fill-[#FFD23F] text-[#FFD23F]"
                      : "fill-transparent text-gray-300"
                  )}
                  aria-hidden="true"
                />
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Rating label with animation */}
      {showLabel && displayRating > 0 && (
        <motion.p
          className={cn(
            "text-sm font-medium transition-colors",
            labelColors[Math.round(displayRating)] || "text-gray-600"
          )}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          key={Math.round(displayRating)}
          transition={{ duration: 0.2 }}
          data-testid="rating-label"
        >
          {labels[Math.round(displayRating)] || ""}
        </motion.p>
      )}
    </div>
  );
}

/**
 * StarRatingDisplay - Read-only star rating for display purposes.
 * Compact version for use in cards and lists.
 */
export function StarRatingDisplay({
  value,
  max = 5,
  size = "sm",
  showValue = true,
  className,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <StarRating
        value={value}
        max={max}
        size={size}
        readOnly
        showLabel={false}
      />
      {showValue && (
        <span className="text-sm font-medium text-gray-600 ml-1">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

export default StarRating;
