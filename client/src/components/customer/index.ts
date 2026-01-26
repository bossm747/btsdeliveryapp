/**
 * Customer Module Components
 * 
 * Centralized exports for all customer-facing components including:
 * - Page wrappers with ErrorBoundary and pull-to-refresh
 * - Empty state components
 * - Loading skeletons
 * - UI components
 */

// Page wrapper with ErrorBoundary and pull-to-refresh
export { CustomerPageWrapper } from "./customer-page-wrapper";

// Empty state components
export { EmptyState, EmptyStateInline } from "./empty-state";

// Loading skeletons
export {
  FavoritesPageSkeleton,
  FavoritesCardSkeleton,
  ProfileSettingsSkeleton,
  WalletPageSkeleton,
  LoyaltyPageSkeleton,
  CustomerOrdersSkeleton,
  OrderCardItemSkeleton,
} from "./customer-skeletons";

// Header component
export { default as CustomerHeader } from "./customer-header";

// UI Components (default exports re-exported as named)
export { default as CategoryPills } from "./category-pills";
export { default as PromoBannerCarousel } from "./promo-banner-carousel";
export { default as FlashDealsSection } from "./flash-deals-section";
export { default as TrendingSection } from "./trending-section";
export { default as FeaturedCarousel } from "./featured-carousel";
export { default as OrderStatusTimeline } from "./order-status-timeline";
export { default as RiderTrackingNotification } from "./rider-tracking-notification";
// Also export named functions from rider-tracking-notification
export {
  RiderTrackingBanner,
  RiderTrackingCard,
  RiderTrackingToast,
  RiderLocationBadge,
  RiderTrackingStatus,
  useRiderTrackingNotifications,
} from "./rider-tracking-notification";
