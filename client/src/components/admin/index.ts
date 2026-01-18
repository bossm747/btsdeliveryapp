// Admin module components index

// Page wrapper with error boundary and pull-to-refresh
export { AdminPageWrapper } from "./admin-page-wrapper";

// Empty state components for various admin scenarios
export {
  AdminEmptyState,
  // Orders
  NoOrdersEmptyState,
  NoPendingOrdersEmptyState,
  // Users
  NoUsersEmptyState,
  NoNewUsersEmptyState,
  // Restaurants
  NoRestaurantsEmptyState,
  NoPendingApprovalEmptyState,
  // Riders
  NoRidersEmptyState,
  NoPendingVerificationEmptyState,
  NoOnlineRidersEmptyState,
  // Support
  NoSupportTicketsEmptyState,
  NoPendingTicketsEmptyState,
  // Financial
  NoTransactionsEmptyState,
  NoRevenueDataEmptyState,
  // Analytics
  NoAnalyticsDataEmptyState,
  NoReportsEmptyState,
  // Fraud
  NoFraudAlertsEmptyState,
  NoFlaggedAccountsEmptyState,
  // Delivery Zones
  NoDeliveryZonesEmptyState,
  // Promos
  NoPromosEmptyState,
  NoActivePromosEmptyState,
  // Commission
  NoCommissionRulesEmptyState,
  // Dispatch
  NoActiveDispatchEmptyState,
  NoUnassignedOrdersEmptyState,
  // Notifications
  NoNotificationsEmptyState,
  // Search
  NoSearchResultsEmptyState,
  // Time period
  NoDataForPeriodEmptyState,
  // Error and development
  AdminErrorState,
  UnderDevelopmentEmptyState,
} from "./admin-empty-states";

// Skeleton loaders for loading states
export {
  AdminStatsSkeleton,
  AdminTableSkeleton,
  AdminOrdersSkeleton,
  AdminUsersSkeleton,
  AdminRestaurantsSkeleton,
  AdminRidersSkeleton,
  AdminDispatchSkeleton,
  AdminAnalyticsSkeleton,
  AdminFinancialSkeleton,
  AdminSupportSkeleton,
  AdminFraudSkeleton,
  AdminZonesSkeleton,
  AdminDashboardSkeleton,
  AdminPromosSkeleton,
  AdminCommissionSkeleton,
} from "./admin-skeletons";
