import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Store,
  Package,
  Truck,
  DollarSign,
  BarChart3,
  MapPin,
  FileText,
  ShieldAlert,
  HeadphonesIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Tag,
  Percent,
  Bell,
  Settings,
  Radio,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Icon to display */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Call-to-action button text */
  actionLabel?: string;
  /** Call-to-action button onClick handler */
  onAction?: () => void;
  /** Additional class names */
  className?: string;
  /** Variant for different visual styles */
  variant?: "default" | "info" | "success" | "warning";
}

export function AdminEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) {
  const variantStyles = {
    default: "bg-gray-50 dark:bg-slate-800 text-gray-500",
    info: "bg-blue-50 dark:bg-blue-950/20 text-blue-500",
    success: "bg-green-50 dark:bg-green-950/20 text-green-500",
    warning: "bg-amber-50 dark:bg-amber-950/20 text-amber-500",
  };

  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div className="text-center space-y-4 max-w-md">
        {icon && (
          <div className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center", variantStyles[variant])}>
            {icon}
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-4 bg-blue-600 hover:bg-blue-700">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-built empty states for common admin scenarios

// Orders
export function NoOrdersEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Package className="h-8 w-8" />}
      title="No Orders Found"
      description="There are no orders matching your criteria. Try adjusting your filters or check back later."
      actionLabel={onRefresh ? "Refresh Orders" : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoPendingOrdersEmptyState() {
  return (
    <AdminEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="All Orders Processed"
      description="Great work! There are no pending orders that need attention at the moment."
      variant="success"
    />
  );
}

// Users
export function NoUsersEmptyState({ onSearch }: { onSearch?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Users className="h-8 w-8" />}
      title="No Users Found"
      description="No users match your search criteria. Try adjusting your search terms."
      actionLabel={onSearch ? "Clear Search" : undefined}
      onAction={onSearch}
    />
  );
}

export function NoNewUsersEmptyState() {
  return (
    <AdminEmptyState
      icon={<Users className="h-8 w-8" />}
      title="No New Users"
      description="There are no new user registrations in the selected time period."
      variant="info"
    />
  );
}

// Restaurants
export function NoRestaurantsEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Store className="h-8 w-8" />}
      title="No Restaurants Found"
      description="There are no restaurants matching your criteria. Try adjusting your filters."
      actionLabel={onRefresh ? "Refresh List" : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoPendingApprovalEmptyState() {
  return (
    <AdminEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="No Pending Approvals"
      description="All restaurant applications have been reviewed. New applications will appear here."
      variant="success"
    />
  );
}

// Riders
export function NoRidersEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Truck className="h-8 w-8" />}
      title="No Riders Found"
      description="There are no riders matching your criteria. Try adjusting your filters."
      actionLabel={onRefresh ? "Refresh List" : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoPendingVerificationEmptyState() {
  return (
    <AdminEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="No Pending Verifications"
      description="All rider applications have been verified. New applications will appear here."
      variant="success"
    />
  );
}

export function NoOnlineRidersEmptyState() {
  return (
    <AdminEmptyState
      icon={<Truck className="h-8 w-8" />}
      title="No Riders Online"
      description="There are currently no riders online. This may affect order fulfillment."
      variant="warning"
    />
  );
}

// Support
export function NoSupportTicketsEmptyState() {
  return (
    <AdminEmptyState
      icon={<HeadphonesIcon className="h-8 w-8" />}
      title="No Support Tickets"
      description="Great news! There are no open support tickets at the moment."
      variant="success"
    />
  );
}

export function NoPendingTicketsEmptyState() {
  return (
    <AdminEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="All Tickets Resolved"
      description="All support tickets have been handled. New tickets will appear here."
      variant="success"
    />
  );
}

// Financial
export function NoTransactionsEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <AdminEmptyState
      icon={<DollarSign className="h-8 w-8" />}
      title="No Transactions Found"
      description="There are no transactions for the selected period. Try adjusting your date range."
      actionLabel={onRefresh ? "Refresh" : undefined}
      onAction={onRefresh}
      variant="info"
    />
  );
}

export function NoRevenueDataEmptyState() {
  return (
    <AdminEmptyState
      icon={<TrendingUp className="h-8 w-8" />}
      title="No Revenue Data"
      description="Revenue data will appear here once orders are completed."
      variant="info"
    />
  );
}

// Analytics
export function NoAnalyticsDataEmptyState() {
  return (
    <AdminEmptyState
      icon={<BarChart3 className="h-8 w-8" />}
      title="No Analytics Data"
      description="Analytics data will be available once there's enough platform activity."
      variant="info"
    />
  );
}

export function NoReportsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <AdminEmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No Reports Generated"
      description="Generate your first report to track business performance."
      actionLabel={onCreate ? "Generate Report" : undefined}
      onAction={onCreate}
      variant="info"
    />
  );
}

// Fraud
export function NoFraudAlertsEmptyState() {
  return (
    <AdminEmptyState
      icon={<ShieldAlert className="h-8 w-8" />}
      title="No Fraud Alerts"
      description="No suspicious activity detected. The system is continuously monitoring for fraud."
      variant="success"
    />
  );
}

export function NoFlaggedAccountsEmptyState() {
  return (
    <AdminEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="No Flagged Accounts"
      description="All accounts are in good standing. Flagged accounts will appear here."
      variant="success"
    />
  );
}

// Delivery Zones
export function NoDeliveryZonesEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <AdminEmptyState
      icon={<MapPin className="h-8 w-8" />}
      title="No Delivery Zones Configured"
      description="Set up delivery zones to define your service areas and delivery fees."
      actionLabel={onCreate ? "Create Zone" : undefined}
      onAction={onCreate}
      variant="warning"
    />
  );
}

// Promos
export function NoPromosEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Tag className="h-8 w-8" />}
      title="No Promo Codes"
      description="Create promotional codes to boost sales and attract new customers."
      actionLabel={onCreate ? "Create Promo" : undefined}
      onAction={onCreate}
      variant="info"
    />
  );
}

export function NoActivePromosEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Tag className="h-8 w-8" />}
      title="No Active Promotions"
      description="There are no active promotions running. Create one to increase orders."
      actionLabel={onCreate ? "Create Promotion" : undefined}
      onAction={onCreate}
      variant="info"
    />
  );
}

// Commission
export function NoCommissionRulesEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Percent className="h-8 w-8" />}
      title="No Commission Rules"
      description="Set up commission rules to define platform fees for vendors."
      actionLabel={onCreate ? "Create Rule" : undefined}
      onAction={onCreate}
      variant="warning"
    />
  );
}

// Dispatch
export function NoActiveDispatchEmptyState() {
  return (
    <AdminEmptyState
      icon={<Radio className="h-8 w-8" />}
      title="No Active Dispatches"
      description="There are no orders currently being dispatched. New orders will appear here."
      variant="info"
    />
  );
}

export function NoUnassignedOrdersEmptyState() {
  return (
    <AdminEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="All Orders Assigned"
      description="All orders have been assigned to riders. Great job!"
      variant="success"
    />
  );
}

// Notifications
export function NoNotificationsEmptyState() {
  return (
    <AdminEmptyState
      icon={<Bell className="h-8 w-8" />}
      title="No Notifications"
      description="You're all caught up! System alerts and notifications will appear here."
      variant="success"
    />
  );
}

// Search results
export function NoSearchResultsEmptyState({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <AdminEmptyState
      icon={<Search className="h-8 w-8" />}
      title="No Results Found"
      description={query ? `No results found for "${query}". Try different search terms.` : "No results match your search criteria."}
      actionLabel={onClear ? "Clear Search" : undefined}
      onAction={onClear}
    />
  );
}

// Time period
export function NoDataForPeriodEmptyState({ period }: { period?: string }) {
  return (
    <AdminEmptyState
      icon={<Calendar className="h-8 w-8" />}
      title={`No Data for ${period || "This Period"}`}
      description="There is no data available for the selected time period. Try selecting a different range."
      variant="info"
    />
  );
}

// Generic error state
export function AdminErrorState({
  title = "Something Went Wrong",
  description = "We encountered an error while loading this content. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <AdminEmptyState
      icon={<AlertCircle className="h-8 w-8" />}
      title={title}
      description={description}
      actionLabel={onRetry ? "Try Again" : undefined}
      onAction={onRetry}
      variant="warning"
    />
  );
}

// Under development
export function UnderDevelopmentEmptyState({ feature }: { feature?: string }) {
  return (
    <AdminEmptyState
      icon={<Settings className="h-8 w-8" />}
      title={feature ? `${feature} Coming Soon` : "Feature Coming Soon"}
      description="This feature is currently under development and will be available soon."
      variant="info"
    />
  );
}
