import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function AddressCardSkeleton() {
  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <Skeleton className="p-3 rounded-full w-11 h-11" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AddressListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" data-testid="addresses-skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <AddressCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AddressPageSkeleton() {
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-20" />
        </div>
        {/* Description */}
        <Skeleton className="h-5 w-64 mb-6" />
        {/* Address cards */}
        <AddressListSkeleton count={3} />
      </div>
    </div>
  );
}
