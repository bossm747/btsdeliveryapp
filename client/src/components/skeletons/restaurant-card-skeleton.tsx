import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RestaurantCardSkeletonProps {
  /** Number of skeleton cards to render */
  count?: number;
}

/**
 * Skeleton loader that matches the RestaurantCard component layout.
 * Displays placeholder UI with pulse animation while restaurant data loads.
 */
export function RestaurantCardSkeleton({ count = 1 }: RestaurantCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="bg-white border-2 border-gray-100 shadow-lg"
          data-testid="restaurant-card-skeleton"
        >
          {/* Image placeholder */}
          <div className="relative">
            <Skeleton className="w-full h-48 rounded-t-lg rounded-b-none" />
            {/* Featured badge placeholder */}
            <Skeleton className="absolute top-3 left-3 h-6 w-20 rounded-full" />
            {/* Status dot placeholder */}
            <Skeleton className="absolute top-3 right-3 w-3 h-3 rounded-full" />
          </div>

          <CardContent className="p-5 bg-gradient-to-b from-white to-gray-50/30">
            {/* Header: Name and Rating */}
            <div className="flex justify-between items-start mb-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>

            {/* Category, Location, Price Range */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-2 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-2 rounded-full" />
              <Skeleton className="h-4 w-8" />
            </div>

            {/* Delivery Time and Fee */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <Skeleton className="h-8 w-28 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/**
 * Grid layout wrapper for multiple restaurant card skeletons.
 * Matches the typical restaurant listing grid layout.
 */
export function RestaurantCardSkeletonGrid({ count = 6 }: RestaurantCardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="restaurant-skeleton-grid">
      <RestaurantCardSkeleton count={count} />
    </div>
  );
}

export default RestaurantCardSkeleton;
