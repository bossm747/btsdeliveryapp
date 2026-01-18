import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderCardSkeletonProps {
  /** Number of skeleton cards to render */
  count?: number;
  /** Whether to show the progress bar (for active orders) */
  showProgress?: boolean;
}

/**
 * Skeleton loader that matches the OrderCard component layout.
 * Displays placeholder UI with pulse animation while order data loads.
 */
export function OrderCardSkeleton({ count = 1, showProgress = true }: OrderCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="hover:shadow-lg transition-all duration-300"
          data-testid="order-card-skeleton"
        >
          <CardContent className="p-6">
            {/* Order Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                {/* Order number and status badges */}
                <div className="flex items-center gap-3 mb-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>

                {/* Restaurant name */}
                <div className="flex items-center mb-2">
                  <Skeleton className="h-4 w-4 mr-2 rounded" />
                  <Skeleton className="h-5 w-36" />
                </div>

                {/* Order date */}
                <div className="flex items-center text-sm">
                  <Skeleton className="h-4 w-4 mr-2 rounded" />
                  <Skeleton className="h-4 w-44" />
                </div>
              </div>

              {/* Price and item count */}
              <div className="text-right">
                <Skeleton className="h-7 w-24 mb-2" />
                <Skeleton className="h-4 w-16 mb-2" />
                <div className="flex items-center justify-end">
                  <Skeleton className="h-3 w-3 mr-1 rounded" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </div>

            {/* Progress Bar (for active orders) */}
            {showProgress && (
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            )}

            {/* Order Items Preview */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <Skeleton className="h-4 w-4 mr-2 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/**
 * Compact order card skeleton for vendor order lists.
 * Matches the simpler vendor order card layout.
 */
export function VendorOrderCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="border-l-4 border-l-primary/50"
          data-testid="vendor-order-card-skeleton"
        >
          <CardContent className="p-6">
            {/* Header: Order ID and Status */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div>
                  <Skeleton className="h-5 w-28 mb-1" />
                  <Skeleton className="h-4 w-36 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default OrderCardSkeleton;
