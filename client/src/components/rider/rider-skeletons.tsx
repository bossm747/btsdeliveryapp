import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for rider dashboard stats
 */
export function RiderStatsSkeleton() {
  return (
    <div className="px-4 py-3 bg-gradient-to-r from-[#004225] to-green-700">
      <div className="grid grid-cols-3 gap-4 text-white">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-16 mx-auto mb-1 bg-white/20" />
            <Skeleton className="h-3 w-12 mx-auto bg-white/20" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for active delivery cards
 */
export function RiderDeliveryCardSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-2 mb-3">
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-2 w-full mb-3" />
            <div className="flex space-x-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-10" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for available order cards
 */
export function RiderOrderCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-[#FF6B35]">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="text-right">
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
            {/* Restaurant info */}
            <div className="mb-3">
              <div className="flex items-center mb-1">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="ml-6">
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            {/* Delivery info */}
            <div className="mb-3">
              <div className="flex items-center mb-1">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="ml-6">
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            {/* Details row */}
            <div className="flex items-center justify-between mb-3 py-2 px-3 bg-gray-50 rounded-lg">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Timer */}
            <div className="mb-4">
              <Skeleton className="h-1 w-full" />
            </div>
            {/* Buttons */}
            <div className="flex space-x-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for pending assignment cards
 */
export function RiderAssignmentSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center">
                <Skeleton className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
            <div className="flex space-x-2 mt-3">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for quick access cards
 */
export function RiderQuickAccessSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-3 text-center">
            <Skeleton className="w-10 h-10 rounded-full mx-auto mb-2" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for earnings summary
 */
export function RiderEarningsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart placeholder */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Earnings list */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton loader for performance metrics
 */
export function RiderPerformanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 text-center">
              <Skeleton className="h-10 w-10 rounded-full mx-auto mb-2" />
              <Skeleton className="h-6 w-16 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center p-3">
                <Skeleton className="h-12 w-12 rounded-full mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton loader for delivery history
 */
export function RiderHistorySkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton loader for map/tracking view
 */
export function RiderMapSkeleton() {
  return (
    <div className="relative h-full min-h-[400px]">
      <Skeleton className="absolute inset-0 rounded-lg" />
      {/* Map controls skeleton */}
      <div className="absolute top-4 right-4 space-y-2">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      {/* Bottom info card skeleton */}
      <div className="absolute bottom-4 left-4 right-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton for full rider dashboard
 */
export function RiderDashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8 rounded" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-5 rounded-full" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <RiderStatsSkeleton />

      {/* Quick access */}
      <div className="px-4 py-3">
        <Skeleton className="h-5 w-28 mb-3" />
        <RiderQuickAccessSkeleton />
      </div>

      {/* Active deliveries */}
      <div className="px-4 py-3">
        <Skeleton className="h-5 w-32 mb-3" />
        <RiderDeliveryCardSkeleton count={2} />
      </div>
    </div>
  );
}

/**
 * Skeleton for batch offer cards
 */
export function RiderBatchOfferSkeleton({ count = 1 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="text-right">
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            {/* Orders list */}
            <div className="mb-3 space-y-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center">
                  <Skeleton className="h-3 w-3 mr-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
            {/* Route details */}
            <div className="flex items-center justify-between mb-3 py-2 px-3 bg-blue-50 rounded-lg">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-14" />
            </div>
            {/* Timer */}
            <Skeleton className="h-1 w-full mb-4" />
            {/* Buttons */}
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-10 w-full" />
              <div className="flex space-x-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
