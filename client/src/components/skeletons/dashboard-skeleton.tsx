import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function PromoBannerSkeleton() {
  return (
    <div className="px-4 pt-4">
      <Skeleton className="h-[180px] w-full rounded-2xl" />
      <div className="flex justify-center gap-2 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-2 h-2 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function QuickStatsSkeleton() {
  return (
    <div className="px-4 py-3 bg-gradient-to-r from-[#004225] to-green-700">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-7 w-12 mx-auto mb-1 bg-white/20" />
            <Skeleton className="h-4 w-16 mx-auto bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CategoryPillsSkeleton() {
  return (
    <div className="px-4 py-3">
      <div className="flex gap-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}

export function FlashDealsSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-28 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="min-w-[260px] border-0 shadow-md">
            <Skeleton className="h-32 w-full rounded-t-lg rounded-b-none" />
            <CardContent className="p-3">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ServiceCardsSkeleton() {
  return (
    <div className="px-4 py-4">
      <Skeleton className="h-6 w-28 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-l-4 border-l-gray-200">
            <CardContent className="p-4 text-center">
              <Skeleton className="w-8 h-8 mx-auto mb-2 rounded" />
              <Skeleton className="h-5 w-24 mx-auto mb-1" />
              <Skeleton className="h-4 w-28 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TrendingSectionSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-32 mb-1" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="min-w-[260px] border-0 shadow-md">
            <Skeleton className="h-36 w-full rounded-t-lg rounded-b-none" />
            <CardContent className="p-3">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FeaturedCarouselSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-6 w-40 mb-1" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="flex justify-center gap-2 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-2 h-2 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function RecentOrdersSkeleton() {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32 mb-2" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8 rounded" />
            <div>
              <Skeleton className="h-5 w-28 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8 rounded" />
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="pb-20 animate-pulse">
        <PromoBannerSkeleton />
        <QuickStatsSkeleton />
        <CategoryPillsSkeleton />
        <FlashDealsSkeleton />
        <ServiceCardsSkeleton />
        <TrendingSectionSkeleton />
        <FeaturedCarouselSkeleton />
        <RecentOrdersSkeleton />
      </div>
    </div>
  );
}

export default DashboardSkeleton;
