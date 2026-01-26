import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton loader for favorites page restaurant cards
 */
export function FavoritesCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="w-full h-48" />
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between pt-3 border-t">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-full rounded-md mt-4" />
      </CardContent>
    </Card>
  );
}

export function FavoritesPageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="min-h-screen bg-background py-8" data-testid="favorites-skeleton">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full md:w-80" />
        </div>
        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: count }).map((_, i) => (
            <FavoritesCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for profile settings page
 */
export function ProfileSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8" data-testid="profile-settings-skeleton">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-64 mb-6" />
        
        {/* Tabs */}
        <Skeleton className="h-10 w-full max-w-md mb-6" />
        
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar section */}
            <div className="flex items-center gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-px w-full" />
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for wallet page
 */
export function WalletPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="wallet-skeleton">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#004225] to-green-700 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-4 w-32 bg-green-600/30 mb-4" />
          {/* Balance Card */}
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28 bg-green-600/30" />
                  <Skeleton className="h-10 w-40 bg-green-600/30" />
                  <Skeleton className="h-3 w-36 bg-green-600/30" />
                </div>
                <Skeleton className="h-10 w-24 bg-white/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8 -mt-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center space-y-2">
                <Skeleton className="h-6 w-6 mx-auto" />
                <Skeleton className="h-6 w-20 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Summary */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-5 w-16 ml-auto" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for loyalty page
 */
export function LoyaltyPageSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8" data-testid="loyalty-skeleton">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Points Overview Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10" />
                <div className="space-y-1">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            {/* Progress to Next Tier */}
            <div className="mt-4 p-4 bg-gray-100 rounded-lg space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center p-3 bg-gray-100 rounded-lg space-y-1">
                  <Skeleton className="h-5 w-16 mx-auto" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="p-3 h-11 w-11 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Skeleton className="h-10 w-full max-w-md mb-4" />

        {/* Content Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for customer orders page
 */
export function CustomerOrdersSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8" data-testid="customer-orders-skeleton">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-5 w-48 mb-6" />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[180px]" />
              <Skeleton className="h-10 w-[160px]" />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Skeleton className="h-10 w-80 mb-6" />

        {/* Order cards */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <OrderCardItemSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrderCardItemSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>

        {/* Order Items */}
        <div className="mb-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
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
        <div className="flex gap-2 pt-4 border-t">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

// Export all skeletons
export {
  FavoritesCardSkeleton as CustomerFavoritesSkeleton,
};
