import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VendorOverviewSkeleton } from "@/components/vendor/vendor-skeletons";
import {
  ShoppingBag,
  DollarSign,
  Star,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  Bell
} from "lucide-react";
import type { Order, Restaurant, InventoryItem } from "@shared/schema";

export default function VendorOverview() {
  // Fetch vendor's restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch vendor's orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: !!restaurant,
  });

  // Fetch low stock items
  const { data: lowStockItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/vendor/inventory/low-stock"],
    enabled: !!restaurant,
  });

  if (restaurantLoading || ordersLoading) {
    return <VendorOverviewSkeleton />;
  }

  // Calculate stats
  const todayOrders = orders?.filter(order => {
    const today = new Date().toDateString();
    return new Date(order.createdAt!).toDateString() === today;
  }) || [];

  const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
  const pendingOrders = orders?.filter(order => order.status === "pending") || [];

  return (
    <div className="space-y-8" data-testid="vendor-overview-page">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 rounded-2xl p-6 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}! 👋
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Here's what's happening with {restaurant?.name || "your restaurant"} today.
            </p>
          </div>
          <div className="hidden md:block">
            <Button className="bg-primary hover:bg-primary/90">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="today-orders-stat">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Today's Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{todayOrders.length}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+12% vs yesterday</span>
                </div>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-xl">
                <ShoppingBag className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="today-revenue-stat">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Today's Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">₱{todayRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 dark:text-green-400">+8% vs yesterday</span>
                </div>
              </div>
              <div className="bg-green-500/10 p-3 rounded-xl">
                <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="restaurant-rating-stat">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Restaurant Rating</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {restaurant?.rating || "4.8"}
                </p>
                <div className="flex items-center mt-2">
                  <Star className="h-4 w-4 text-yellow-500 mr-1 fill-current" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Based on {restaurant?.totalOrders || 156} reviews</span>
                </div>
              </div>
              <div className="bg-yellow-500/10 p-3 rounded-xl">
                <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400 fill-current" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="pending-orders-stat">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Pending Orders</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingOrders.length}</p>
                <div className="flex items-center mt-2">
                  <Clock className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600 dark:text-orange-400">Needs attention</span>
                </div>
              </div>
              <div className="bg-orange-500/10 p-3 rounded-xl">
                <Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {lowStockItems.length > 0 && (
        <Card className="border-l-4 border-l-orange-500" data-testid="card-low-stock-alert">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-500/10 p-2 rounded-lg">
                <Bell className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">Low Stock Alert</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {lowStockItems.length} items are running low on stock. Check your inventory.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button className="h-16 flex-col space-y-2" variant="outline" data-testid="button-view-orders">
              <ShoppingBag className="h-6 w-6" />
              <span>View Orders</span>
            </Button>
            <Button className="h-16 flex-col space-y-2" variant="outline" data-testid="button-manage-menu">
              <BarChart3 className="h-6 w-6" />
              <span>Manage Menu</span>
            </Button>
            <Button className="h-16 flex-col space-y-2" variant="outline" data-testid="button-view-analytics">
              <Activity className="h-6 w-6" />
              <span>View Analytics</span>
            </Button>
            <Button className="h-16 flex-col space-y-2" variant="outline" data-testid="button-restaurant-settings">
              <Star className="h-6 w-6" />
              <span>Restaurant Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}