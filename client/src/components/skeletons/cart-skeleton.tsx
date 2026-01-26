import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function CartItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 border border-border rounded-lg">
      <Skeleton className="w-16 h-16 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-5 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

export function CartItemsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Card data-testid="cart-items-skeleton">
      <CardHeader>
        <Skeleton className="h-6 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <CartItemSkeleton key={i} />
        ))}
      </CardContent>
    </Card>
  );
}

export function CartSummarySkeleton() {
  return (
    <Card data-testid="cart-summary-skeleton">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line items */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
        </div>
        {/* Separator */}
        <Skeleton className="h-px w-full" />
        {/* Total */}
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function DeliveryAddressSkeleton() {
  return (
    <Card data-testid="delivery-address-skeleton">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Address list */}
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
              <Skeleton className="h-4 w-4 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentMethodSkeleton() {
  return (
    <Card data-testid="payment-method-skeleton">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CartPageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20" data-testid="cart-page-skeleton">
      {/* Header placeholder */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-8 h-8" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary header */}
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items column */}
          <div className="lg:col-span-2 space-y-6">
            <CartItemsSkeleton count={3} />
            <DeliveryAddressSkeleton />
          </div>

          {/* Summary column */}
          <div className="lg:col-span-1 space-y-6">
            <CartSummarySkeleton />
            <PaymentMethodSkeleton />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
