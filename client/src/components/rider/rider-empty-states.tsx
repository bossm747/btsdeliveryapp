import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  MapPin,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  Bike,
  Navigation,
  Star,
  Calendar,
  DollarSign,
  History,
  Bell,
  Route,
  Target,
  Award,
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

export function RiderEmptyState({
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
          <Button onClick={onAction} className="mt-4 bg-[#FF6B35] hover:bg-orange-600">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-built empty states for common rider scenarios

export function NoActiveDeliveriesEmptyState({ onGoOnline }: { onGoOnline?: () => void }) {
  return (
    <RiderEmptyState
      icon={<Package className="h-8 w-8" />}
      title="No Active Deliveries"
      description="You don't have any active deliveries right now. Turn on your status to start receiving orders."
      actionLabel={onGoOnline ? "Go Online" : undefined}
      onAction={onGoOnline}
      variant="info"
    />
  );
}

export function NoAvailableOrdersEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <RiderEmptyState
      icon={<Package className="h-8 w-8" />}
      title="No Available Orders"
      description="New orders will appear here when customers place them. Stay online to receive notifications."
      actionLabel={onRefresh ? "Check for Orders" : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoPendingAssignmentsEmptyState() {
  return (
    <RiderEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="All Caught Up!"
      description="You have no pending delivery requests at the moment. New assignments will appear here."
      variant="success"
    />
  );
}

export function NoDeliveryHistoryEmptyState() {
  return (
    <RiderEmptyState
      icon={<History className="h-8 w-8" />}
      title="No Delivery History"
      description="Your completed deliveries will appear here. Start accepting orders to build your history."
      variant="info"
    />
  );
}

export function NoEarningsEmptyState() {
  return (
    <RiderEmptyState
      icon={<Wallet className="h-8 w-8" />}
      title="No Earnings Yet"
      description="Complete deliveries to start earning. Your earnings history will be tracked here."
      variant="info"
    />
  );
}

export function NoEarningsForPeriodEmptyState({ period }: { period: string }) {
  return (
    <RiderEmptyState
      icon={<DollarSign className="h-8 w-8" />}
      title={`No Earnings for ${period}`}
      description="You didn't complete any deliveries during this period. Try selecting a different date range."
      variant="info"
    />
  );
}

export function NoPerformanceDataEmptyState() {
  return (
    <RiderEmptyState
      icon={<TrendingUp className="h-8 w-8" />}
      title="No Performance Data"
      description="Performance metrics will appear here once you start completing deliveries."
      variant="info"
    />
  );
}

export function OfflineEmptyState({ onGoOnline }: { onGoOnline?: () => void }) {
  return (
    <RiderEmptyState
      icon={<WifiOff className="h-8 w-8" />}
      title="You're Currently Offline"
      description="Go online to start receiving delivery requests and earning money."
      actionLabel="Go Online"
      onAction={onGoOnline}
      variant="warning"
    />
  );
}

export function LocationDisabledEmptyState({ onEnableLocation }: { onEnableLocation?: () => void }) {
  return (
    <RiderEmptyState
      icon={<MapPin className="h-8 w-8" />}
      title="Location Access Required"
      description="We need your location to show nearby orders and provide navigation. Please enable location services."
      actionLabel={onEnableLocation ? "Enable Location" : undefined}
      onAction={onEnableLocation}
      variant="warning"
    />
  );
}

export function NoRouteEmptyState() {
  return (
    <RiderEmptyState
      icon={<Route className="h-8 w-8" />}
      title="No Active Route"
      description="Accept a delivery to see the route to the pickup and delivery locations."
      variant="info"
    />
  );
}

export function NoNotificationsEmptyState() {
  return (
    <RiderEmptyState
      icon={<Bell className="h-8 w-8" />}
      title="No Notifications"
      description="You're all caught up! Notifications about new orders and updates will appear here."
      variant="success"
    />
  );
}

export function NoRewardsEmptyState() {
  return (
    <RiderEmptyState
      icon={<Award className="h-8 w-8" />}
      title="No Rewards Yet"
      description="Complete more deliveries to unlock rewards and bonuses. Keep up the great work!"
      variant="info"
    />
  );
}

export function NoBonusAvailableEmptyState() {
  return (
    <RiderEmptyState
      icon={<Target className="h-8 w-8" />}
      title="No Active Bonuses"
      description="Check back later for special bonus opportunities. Complete deliveries to qualify for bonuses."
      variant="info"
    />
  );
}

export function NoScheduleSetEmptyState({ onSetSchedule }: { onSetSchedule?: () => void }) {
  return (
    <RiderEmptyState
      icon={<Calendar className="h-8 w-8" />}
      title="No Schedule Set"
      description="Set your availability schedule to get prioritized for deliveries during your preferred hours."
      actionLabel={onSetSchedule ? "Set Schedule" : undefined}
      onAction={onSetSchedule}
      variant="info"
    />
  );
}

export function OutsideDeliveryZoneEmptyState() {
  return (
    <RiderEmptyState
      icon={<MapPin className="h-8 w-8" />}
      title="Outside Delivery Zone"
      description="You're currently outside the active delivery zone. Move closer to see available orders."
      variant="warning"
    />
  );
}

export function ConnectionLostEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <RiderEmptyState
      icon={<Wifi className="h-8 w-8" />}
      title="Connection Lost"
      description="Unable to connect to the server. Please check your internet connection and try again."
      actionLabel={onRetry ? "Retry Connection" : undefined}
      onAction={onRetry}
      variant="warning"
    />
  );
}

export function RiderVerificationPendingEmptyState() {
  return (
    <RiderEmptyState
      icon={<Clock className="h-8 w-8" />}
      title="Verification Pending"
      description="Your account is being verified. You'll be able to accept deliveries once the verification is complete."
      variant="info"
    />
  );
}

export function RiderSuspendedEmptyState() {
  return (
    <RiderEmptyState
      icon={<AlertCircle className="h-8 w-8" />}
      title="Account Suspended"
      description="Your rider account has been temporarily suspended. Please contact support for more information."
      variant="warning"
    />
  );
}

// Generic error state for rider pages
export function RiderErrorState({
  title = "Something Went Wrong",
  description = "We encountered an error while loading this content. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <RiderEmptyState
      icon={<AlertCircle className="h-8 w-8" />}
      title={title}
      description={description}
      actionLabel={onRetry ? "Try Again" : undefined}
      onAction={onRetry}
      variant="warning"
    />
  );
}
