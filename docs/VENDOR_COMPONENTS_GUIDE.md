# Vendor Components Quick Reference Guide

## Overview

This guide provides quick examples for using the new vendor-specific components created to enhance the vendor portal experience.

---

## 🎯 VendorPageWrapper

Wraps vendor pages with error handling and pull-to-refresh functionality.

### Basic Usage

```tsx
import { VendorPageWrapper } from "@/components/vendor/vendor-page-wrapper";

export default function MyVendorPage() {
  return (
    <VendorPageWrapper
      pageTitle="Page Title"
      pageDescription="Description for screen readers"
      refreshQueryKeys={["/api/vendor/data"]}
    >
      {/* Your page content */}
    </VendorPageWrapper>
  );
}
```

### With Custom Refresh

```tsx
<VendorPageWrapper
  onRefresh={async () => {
    await customRefreshLogic();
  }}
>
  {/* Content */}
</VendorPageWrapper>
```

### Disable Pull-to-Refresh

```tsx
<VendorPageWrapper disablePullToRefresh>
  {/* Content */}
</VendorPageWrapper>
```

---

## 🎨 Empty States

Pre-built empty state components for common scenarios.

### Orders

```tsx
import {
  NoOrdersEmptyState,
  NoPendingOrdersEmptyState
} from "@/components/vendor/vendor-empty-states";

// No orders at all
{orders.length === 0 && <NoOrdersEmptyState onRefresh={refetch} />}

// All orders completed
{pendingOrders.length === 0 && <NoPendingOrdersEmptyState />}
```

### Menu

```tsx
import {
  NoMenuItemsEmptyState,
  NoMenuCategoriesEmptyState
} from "@/components/vendor/vendor-empty-states";

{menuItems.length === 0 && (
  <NoMenuItemsEmptyState onAddItem={() => setIsAddDialogOpen(true)} />
)}

{categories.length === 0 && (
  <NoMenuCategoriesEmptyState onAddCategory={() => setIsCategoryDialogOpen(true)} />
)}
```

### Promotions

```tsx
import { NoPromotionsEmptyState } from "@/components/vendor/vendor-empty-states";

{promotions.length === 0 && (
  <NoPromotionsEmptyState onCreatePromo={() => navigate("/vendor/promotions/create")} />
)}
```

### Analytics & Reports

```tsx
import {
  NoAnalyticsDataEmptyState,
  NoReportsEmptyState,
  NoEarningsEmptyState
} from "@/components/vendor/vendor-empty-states";

{!analyticsData && <NoAnalyticsDataEmptyState />}
{reports.length === 0 && <NoReportsEmptyState />}
{earnings.length === 0 && <NoEarningsEmptyState />}
```

### Business States

```tsx
import {
  RestaurantClosedEmptyState,
  OutsideBusinessHoursEmptyState,
  NoScheduleSetEmptyState
} from "@/components/vendor/vendor-empty-states";

{restaurant.isTemporarilyClosed && (
  <RestaurantClosedEmptyState onReopen={handleReopen} />
)}

{!isWithinBusinessHours && <OutsideBusinessHoursEmptyState />}

{!restaurant.operatingHours && (
  <NoScheduleSetEmptyState onSetSchedule={() => navigate("/vendor/business-settings")} />
)}
```

### Custom Empty State

```tsx
import { VendorEmptyState } from "@/components/vendor/vendor-empty-states";

<VendorEmptyState
  icon={<CustomIcon className="h-8 w-8" />}
  title="Custom Title"
  description="Custom description text"
  actionLabel="Custom Action"
  onAction={handleAction}
  variant="info" // default | info | success | warning
/>
```

### Error State

```tsx
import { VendorErrorState } from "@/components/vendor/vendor-empty-states";

{error && (
  <VendorErrorState
    title="Failed to Load Data"
    description={error.message}
    onRetry={refetch}
  />
)}
```

---

## 💬 Toast Notifications

Pre-defined toast messages for common vendor actions.

### Setup

```tsx
import { useVendorToast } from "@/hooks/use-vendor-toast";

export default function MyComponent() {
  const {
    orderAccepted,
    menuItemAdded,
    error
  } = useVendorToast();

  // Use in handlers...
}
```

### Order Toasts

```tsx
const {
  orderAccepted,
  orderRejected,
  orderReady,
  orderCompleted,
  orderCancelled
} = useVendorToast();

// Accept order
orderAccepted("ORD-12345");

// Reject order
orderRejected("ORD-12345");

// Mark ready
orderReady("ORD-12345");

// Complete order
orderCompleted("ORD-12345");

// Cancel order
orderCancelled("ORD-12345");
```

### Menu Toasts

```tsx
const {
  menuItemAdded,
  menuItemUpdated,
  menuItemDeleted,
  menuItemOutOfStock,
  menuItemBackInStock,
  categoryAdded,
  categoryUpdated,
  categoryDeleted
} = useVendorToast();

// Add item
menuItemAdded("Adobo");

// Update item
menuItemUpdated("Adobo");

// Delete item
menuItemDeleted("Adobo");

// Out of stock
menuItemOutOfStock("Adobo");

// Back in stock
menuItemBackInStock("Adobo");

// Categories
categoryAdded("Main Courses");
categoryUpdated("Main Courses");
categoryDeleted("Main Courses");
```

### Promotion Toasts

```tsx
const {
  promotionCreated,
  promotionUpdated,
  promotionDeleted,
  promotionActivated,
  promotionDeactivated
} = useVendorToast();

promotionCreated("50% Off Weekend Special");
promotionActivated("50% Off Weekend Special");
promotionDeactivated("50% Off Weekend Special");
```

### Settings Toasts

```tsx
const {
  settingsSaved,
  hoursUpdated,
  restaurantOpened,
  restaurantClosed,
  profileUpdated
} = useVendorToast();

// Save settings
settingsSaved();

// Update hours
hoursUpdated();

// Open/close restaurant
restaurantOpened();
restaurantClosed();

// Profile
profileUpdated();
```

### Staff Toasts

```tsx
const {
  staffAdded,
  staffUpdated,
  staffRemoved
} = useVendorToast();

staffAdded("John Doe");
staffUpdated("John Doe");
staffRemoved("John Doe");
```

### AI Toasts

```tsx
const {
  aiContentGenerated,
  aiImageGenerated,
  aiError
} = useVendorToast();

aiContentGenerated();
aiImageGenerated();
aiError();
```

### Generic Toasts

```tsx
const {
  error,
  networkError,
  unauthorized,
  success,
  info,
  copied
} = useVendorToast();

// Error
error("Something went wrong");
networkError();
unauthorized();

// Success
success("Operation completed successfully");

// Info
info("Your request is being processed");

// Copied
copied(); // "Copied to clipboard"
```

### Direct Toast Access

```tsx
const { toast } = useVendorToast();

toast({
  title: "Custom Title",
  description: "Custom message",
  variant: "default" // or "destructive"
});
```

---

## ⏳ Skeleton Loaders

Loading indicators that match final component structure.

### Stats Cards

```tsx
import { VendorStatsSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorStatsSkeleton count={4} />
) : (
  <StatsCards data={stats} />
)}
```

### Orders

```tsx
import { VendorOrderSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorOrderSkeleton count={5} />
) : (
  <OrderList orders={orders} />
)}
```

### Menu Items

```tsx
import { VendorMenuItemSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorMenuItemSkeleton count={6} />
) : (
  <MenuGrid items={menuItems} />
)}
```

### Menu Categories

```tsx
import { VendorCategorySkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorCategorySkeleton count={3} />
) : (
  <CategoryList categories={categories} />
)}
```

### Charts

```tsx
import { VendorChartSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorChartSkeleton height={400} />
) : (
  <AnalyticsChart data={chartData} />
)}
```

### Promotions

```tsx
import { VendorPromotionSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorPromotionSkeleton count={3} />
) : (
  <PromotionList promotions={promotions} />
)}
```

### Earnings

```tsx
import { VendorEarningsSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorEarningsSkeleton />
) : (
  <EarningsPage data={earnings} />
)}
```

### Staff

```tsx
import { VendorStaffSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorStaffSkeleton count={4} />
) : (
  <StaffGrid staff={staffMembers} />
)}
```

### Inventory

```tsx
import { VendorInventorySkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorInventorySkeleton count={6} />
) : (
  <InventoryList items={inventory} />
)}
```

### Tables

```tsx
import { VendorTableSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorTableSkeleton rows={5} columns={4} />
) : (
  <DataTable data={tableData} />
)}
```

### Overview/Dashboard

```tsx
import { VendorOverviewSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorOverviewSkeleton />
) : (
  <DashboardContent />
)}
```

### Generic Content

```tsx
import { VendorContentSkeleton } from "@/components/vendor/vendor-skeletons";

{isLoading ? (
  <VendorContentSkeleton rows={3} />
) : (
  <PageContent />
)}
```

---

## 🎯 Complete Page Example

Here's a complete example integrating all components:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VendorPageWrapper } from "@/components/vendor/vendor-page-wrapper";
import { useVendorToast } from "@/hooks/use-vendor-toast";
import {
  NoOrdersEmptyState,
  VendorErrorState
} from "@/components/vendor/vendor-empty-states";
import { VendorOrderSkeleton } from "@/components/vendor/vendor-skeletons";

export default function OrdersPage() {
  const { orderAccepted, orderRejected, error: showError } = useVendorToast();

  const {
    data: orders,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ["/api/vendor/orders"],
  });

  const handleAcceptOrder = (orderId: string, orderNumber: string) => {
    // ... mutation logic
    orderAccepted(orderNumber);
  };

  const handleRejectOrder = (orderId: string, orderNumber: string) => {
    // ... mutation logic
    orderRejected(orderNumber);
  };

  return (
    <VendorPageWrapper
      pageTitle="Order Management"
      pageDescription="Manage all restaurant orders"
      refreshQueryKeys={["/api/vendor/orders"]}
    >
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Orders</h1>

        {/* Loading State */}
        {isLoading && <VendorOrderSkeleton count={5} />}

        {/* Error State */}
        {error && (
          <VendorErrorState
            title="Failed to Load Orders"
            description={error.message}
            onRetry={refetch}
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && orders?.length === 0 && (
          <NoOrdersEmptyState onRefresh={refetch} />
        )}

        {/* Data State */}
        {!isLoading && !error && orders && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={() => handleAcceptOrder(order.id, order.orderNumber)}
                onReject={() => handleRejectOrder(order.id, order.orderNumber)}
              />
            ))}
          </div>
        )}
      </div>
    </VendorPageWrapper>
  );
}
```

---

## 📋 Best Practices

1. **Always use VendorPageWrapper** for all vendor pages
2. **Replace generic loading indicators** with appropriate skeleton loaders
3. **Use pre-defined toast messages** instead of custom ones
4. **Implement empty states** for all list/table views
5. **Include action buttons** in empty states when appropriate
6. **Handle errors gracefully** with VendorErrorState
7. **Provide refresh options** for data-heavy pages
8. **Test with screen readers** to ensure accessibility

---

## 🔍 Testing Checklist

- [ ] Page loads without errors
- [ ] Pull-to-refresh works correctly
- [ ] Skeleton loaders appear during initial load
- [ ] Empty states show when no data
- [ ] Error states display on failures
- [ ] Toast notifications are clear and helpful
- [ ] Screen reader announces changes
- [ ] Keyboard navigation works
- [ ] Actions provide immediate feedback

---

*Last updated: 2026-01-18*
