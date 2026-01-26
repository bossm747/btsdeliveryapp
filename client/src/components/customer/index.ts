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

// UI Components
export { CategoryPills } from "./category-pills";
export { PromoBannerCarousel } from "./promo-banner-carousel";
export { FlashDealsSection } from "./flash-deals-section";
export { TrendingSection } from "./trending-section";
export { FeaturedCarousel } from "./featured-carousel";
export { OrderStatusTimeline } from "./order-status-timeline";
export { RiderTrackingNotification } from "./rider-tracking-notification";
