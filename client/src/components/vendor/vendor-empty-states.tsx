import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PackageOpen,
  ShoppingBag,
  Users,
  TrendingUp,
  Receipt,
  Tag,
  ChefHat,
  BarChart3,
  FileText,
  AlertCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Settings,
  Calendar,
  Megaphone,
  Image as ImageIcon,
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

export function VendorEmptyState({
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
          <Button onClick={onAction} className="mt-4">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-built empty states for common vendor scenarios

export function NoOrdersEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <VendorEmptyState
      icon={<PackageOpen className="h-8 w-8" />}
      title="No Orders Yet"
      description="New orders will appear here. Make sure your restaurant is accepting orders and your menu is visible."
      actionLabel={onRefresh ? "Refresh Orders" : undefined}
      onAction={onRefresh}
    />
  );
}

export function NoPendingOrdersEmptyState() {
  return (
    <VendorEmptyState
      icon={<CheckCircle2 className="h-8 w-8" />}
      title="All Caught Up!"
      description="You have no pending orders at the moment. Great job staying on top of things!"
      variant="success"
    />
  );
}

export function NoMenuItemsEmptyState({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <VendorEmptyState
      icon={<ChefHat className="h-8 w-8" />}
      title="No Menu Items"
      description="Start building your menu by adding your first dish. Showcase your delicious offerings to customers!"
      actionLabel="Add First Item"
      onAction={onAddItem}
      variant="info"
    />
  );
}

export function NoMenuCategoriesEmptyState({ onAddCategory }: { onAddCategory?: () => void }) {
  return (
    <VendorEmptyState
      icon={<ShoppingBag className="h-8 w-8" />}
      title="No Categories"
      description="Organize your menu by creating categories like Appetizers, Main Courses, Desserts, etc."
      actionLabel="Create Category"
      onAction={onAddCategory}
      variant="info"
    />
  );
}

export function NoPromotionsEmptyState({ onCreatePromo }: { onCreatePromo?: () => void }) {
  return (
    <VendorEmptyState
      icon={<Tag className="h-8 w-8" />}
      title="No Active Promotions"
      description="Boost your sales by creating special offers and discounts for your customers."
      actionLabel="Create Promotion"
      onAction={onCreatePromo}
      variant="info"
    />
  );
}

export function NoStaffEmptyState({ onAddStaff }: { onAddStaff?: () => void }) {
  return (
    <VendorEmptyState
      icon={<Users className="h-8 w-8" />}
      title="No Staff Members"
      description="Add staff members to help manage your restaurant and orders efficiently."
      actionLabel="Add Staff Member"
      onAction={onAddStaff}
    />
  );
}

export function NoAnalyticsDataEmptyState() {
  return (
    <VendorEmptyState
      icon={<BarChart3 className="h-8 w-8" />}
      title="No Data Available"
      description="Analytics data will appear here once you start receiving orders. Keep up the great work!"
      variant="info"
    />
  );
}

export function NoEarningsEmptyState() {
  return (
    <VendorEmptyState
      icon={<TrendingUp className="h-8 w-8" />}
      title="No Earnings Yet"
      description="Complete orders to start earning. Your earnings history will be tracked here."
      variant="info"
    />
  );
}

export function NoInventoryEmptyState({ onAddItem }: { onAddItem?: () => void }) {
  return (
    <VendorEmptyState
      icon={<PackageOpen className="h-8 w-8" />}
      title="No Inventory Items"
      description="Track your ingredients and supplies by adding them to your inventory."
      actionLabel="Add Item"
      onAction={onAddItem}
    />
  );
}

export function NoReportsEmptyState() {
  return (
    <VendorEmptyState
      icon={<FileText className="h-8 w-8" />}
      title="No Reports Available"
      description="Reports will be generated based on your business activity. Check back later."
      variant="info"
    />
  );
}

export function NoSettlementsEmptyState() {
  return (
    <VendorEmptyState
      icon={<Receipt className="h-8 w-8" />}
      title="No Settlements Yet"
      description="Your settlement history will appear here once payouts are processed."
      variant="info"
    />
  );
}

export function RestaurantClosedEmptyState({ onReopen }: { onReopen?: () => void }) {
  return (
    <VendorEmptyState
      icon={<AlertCircle className="h-8 w-8" />}
      title="Restaurant Temporarily Closed"
      description="Your restaurant is currently closed and not accepting orders. Reopen to start receiving orders again."
      actionLabel="Reopen Restaurant"
      onAction={onReopen}
      variant="warning"
    />
  );
}

export function OutsideBusinessHoursEmptyState() {
  return (
    <VendorEmptyState
      icon={<Clock className="h-8 w-8" />}
      title="Outside Business Hours"
      description="You're currently outside your scheduled business hours. Orders will resume during your operating hours."
      variant="info"
    />
  );
}

export function NoScheduleSetEmptyState({ onSetSchedule }: { onSetSchedule?: () => void }) {
  return (
    <VendorEmptyState
      icon={<Calendar className="h-8 w-8" />}
      title="Business Hours Not Set"
      description="Set your operating hours so customers know when you're open for business."
      actionLabel="Set Business Hours"
      onAction={onSetSchedule}
      variant="warning"
    />
  );
}

export function NoAIContentEmptyState() {
  return (
    <VendorEmptyState
      icon={<Sparkles className="h-8 w-8" />}
      title="AI-Powered Content Creation"
      description="Use AI to create compelling menu descriptions, generate professional images, and craft engaging social media posts."
      variant="info"
    />
  );
}

export function NoMarketingContentEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <VendorEmptyState
      icon={<Megaphone className="h-8 w-8" />}
      title="No Marketing Content"
      description="Create engaging content to promote your restaurant on social media and attract more customers."
      actionLabel="Create Content"
      onAction={onCreate}
      variant="info"
    />
  );
}

export function NoImagesEmptyState({ onUpload }: { onUpload?: () => void }) {
  return (
    <VendorEmptyState
      icon={<ImageIcon className="h-8 w-8" />}
      title="No Images"
      description="Add appetizing photos of your dishes to attract more customers and increase orders."
      actionLabel="Upload Images"
      onAction={onUpload}
      variant="info"
    />
  );
}

// Generic error state
export function VendorErrorState({
  title = "Something Went Wrong",
  description = "We encountered an error while loading this content. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <VendorEmptyState
      icon={<AlertCircle className="h-8 w-8" />}
      title={title}
      description={description}
      actionLabel={onRetry ? "Try Again" : undefined}
      onAction={onRetry}
      variant="warning"
    />
  );
}

// Loading skeleton for consistent loading states
export function VendorContentSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-5/6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
