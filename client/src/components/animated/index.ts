/**
 * Animated Components - Micro-interaction animations for BTS Delivery app.
 *
 * These components use framer-motion for smooth, spring-based animations
 * that enhance the user experience without being distracting.
 *
 * Animation principles:
 * - Keep animations subtle and fast (200-400ms)
 * - Use spring physics for natural feel
 * - Support reduced motion preferences
 * - Provide immediate feedback for user actions
 */

// Favorite Button - Heart with bounce and fill animation
export {
  FavoriteButton,
  default as FavoriteButtonDefault
} from "./favorite-button";

// Add to Cart Button - Scale pulse with success state
export {
  AddToCartButton,
  default as AddToCartButtonDefault
} from "./add-to-cart-button";

// Star Rating - Pulse/glow with stagger animation
export {
  StarRating,
  StarRatingDisplay,
  default as StarRatingDefault
} from "./star-rating";

// Success Checkmark - Circle and checkmark draw animation
export {
  SuccessCheckmark,
  OrderSuccessCheckmark,
  PaymentSuccessCheckmark,
  default as SuccessCheckmarkDefault
} from "./success-checkmark";

// Animated Numbers - Count up/down animations
export {
  AnimatedNumber,
  AnimatedPrice,
  AnimatedQuantity,
  AnimatedPoints,
  CountUpNumber,
  FlipNumber,
  default as AnimatedNumberDefault
} from "./animated-number";
