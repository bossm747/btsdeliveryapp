import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuItemSkeletonProps {
  /** Number of skeleton items to render */
  count?: number;
}

/**
 * Skeleton loader that matches the menu item card layout in MenuBrowser.
 * Displays placeholder UI with pulse animation while menu items load.
 */
export function MenuItemSkeleton({ count = 1 }: MenuItemSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card
          key={index}
          className="hover:shadow-md transition-shadow"
          data-testid="menu-item-skeleton"
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {/* Item Image */}
              <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Item Name */}
                    <Skeleton className="h-5 w-32 mb-2" />

                    {/* Description */}
                    <Skeleton className="h-4 w-full max-w-[280px] mb-2" />

                    {/* Price and badges */}
                    <div className="flex items-center space-x-2 mt-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  </div>

                  {/* Add to cart button */}
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

/**
 * Skeleton for the menu categories sidebar.
 */
export function MenuCategoriesSkeleton() {
  return (
    <Card className="h-fit" data-testid="menu-categories-skeleton">
      <CardContent className="p-6">
        {/* Title */}
        <Skeleton className="h-6 w-24 mb-4" />

        {/* Search Input */}
        <Skeleton className="h-10 w-full mb-4 rounded-md" />

        {/* Separator */}
        <Skeleton className="h-px w-full my-4" />

        {/* Category buttons */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Complete menu browser skeleton including sidebar and items grid.
 */
export function MenuBrowserSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <div className="grid lg:grid-cols-4 gap-8" data-testid="menu-browser-skeleton">
      {/* Categories Sidebar */}
      <div className="lg:col-span-1">
        <MenuCategoriesSkeleton />
      </div>

      {/* Menu Items */}
      <div className="lg:col-span-3">
        {/* Section Title */}
        <Skeleton className="h-6 w-24 mb-4" />

        {/* Items List */}
        <div className="space-y-4">
          <MenuItemSkeleton count={itemCount} />
        </div>
      </div>
    </div>
  );
}

export default MenuItemSkeleton;
