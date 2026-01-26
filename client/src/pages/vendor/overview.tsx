import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VendorOverviewSkeleton } from "@/components/vendor/vendor-skeletons";
import { Link } from "wouter";
import {
  ShoppingBag,
  DollarSign,
  Star,
  Clock,
  TrendingUp,
  Activity,
  BarChart3,
  Bell,
  ChefHat,
  Package,
  Utensils,
  Settings,
  ArrowRight
} from "lucide-react";
import type { Order, Restaurant, InventoryItem } from "@shared/schema";
import LiveOrderTracker from "@/components/shared/live-order-tracker";
import LeafletLiveTrackingMap from "@/components/shared/leaflet-live-tracking-map";

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
  const newOrders = orders?.filter(order => order.status === "confirmed") || [];
  const preparingOrders = orders?.filter(order => order.status === "preparing") || [];
  const readyOrders = orders?.filter(order => order.status === "ready") || [];
  const completedToday = todayOrders.filter(order => order.status === "delivered" || order.status === "completed") || [];

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
        {/* New Orders - needs immediate attention */}
        <Link href="/vendor-dashboard/orders">
          <Card className={`relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all cursor-pointer ${newOrders.length > 0 ? 'ring-2 ring-orange-400 animate-pulse' : ''}`} data-testid="new-orders-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-orange-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">New Orders</p>
                  <p className="text-3xl font-bold text-orange-600">{newOrders.length}</p>
                  <div className="flex items-center mt-2">
                    {newOrders.length > 0 ? (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">Action Required</Badge>
                    ) : (
                      <span className="text-sm text-gray-500">No new orders</span>
                    )}
                  </div>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-xl">
                  <Bell className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Preparing */}
        <Link href="/vendor-dashboard/orders">
          <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all cursor-pointer" data-testid="preparing-orders-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Preparing</p>
                  <p className="text-3xl font-bold text-blue-600">{preparingOrders.length}</p>
                  <div className="flex items-center mt-2">
                    {preparingOrders.length > 0 ? (
                      <span className="text-sm text-blue-600">In kitchen</span>
                    ) : (
                      <span className="text-sm text-gray-500">None cooking</span>
                    )}
                  </div>
                </div>
                <div className="bg-blue-500/10 p-3 rounded-xl">
                  <ChefHat className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Ready for Pickup */}
        <Link href="/vendor-dashboard/orders">
          <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-all cursor-pointer" data-testid="ready-orders-stat">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-600/5"></div>
            <CardContent className="p-6 relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Ready for Pickup</p>
                  <p className="text-3xl font-bold text-green-600">{readyOrders.length}</p>
                  <div className="flex items-center mt-2">
                    {readyOrders.length > 0 ? (
                      <span className="text-sm text-green-600">Awaiting rider</span>
                    ) : (
                      <span className="text-sm text-gray-500">None waiting</span>
                    )}
                  </div>
                </div>
                <div className="bg-green-500/10 p-3 rounded-xl">
                  <Package className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Today's Revenue */}
        <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow" data-testid="today-revenue-stat">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-purple-600/5"></div>
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Today's Revenue</p>
                <p className="text-3xl font-bold text-purple-600">₱{todayRevenue.toFixed(0)}</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">{completedToday.length} completed orders</span>
                </div>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-xl">
                <DollarSign className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Order Tracking Map - Real-time order status with map */}
      <LeafletLiveTrackingMap
        userRole="vendor"
        apiEndpoint="/api/vendor/orders"
        title="Live Delivery Tracking"
        showList={true}
        height="400px"
      />

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
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/vendor-dashboard/orders">
              <Button className="h-20 w-full flex-col space-y-2 hover:bg-orange-50 hover:border-orange-300" variant="outline" data-testid="button-view-orders">
                <ShoppingBag className="h-6 w-6 text-orange-500" />
                <span>View Orders</span>
                {newOrders.length > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs">{newOrders.length} new</Badge>
                )}
              </Button>
            </Link>
            <Link href="/vendor-dashboard/menu">
              <Button className="h-20 w-full flex-col space-y-2 hover:bg-blue-50 hover:border-blue-300" variant="outline" data-testid="button-manage-menu">
                <Utensils className="h-6 w-6 text-blue-500" />
                <span>Manage Menu</span>
              </Button>
            </Link>
            <Link href="/vendor-dashboard/analytics">
              <Button className="h-20 w-full flex-col space-y-2 hover:bg-purple-50 hover:border-purple-300" variant="outline" data-testid="button-view-analytics">
                <BarChart3 className="h-6 w-6 text-purple-500" />
                <span>View Analytics</span>
              </Button>
            </Link>
            <Link href="/vendor-dashboard/profile">
              <Button className="h-20 w-full flex-col space-y-2 hover:bg-green-50 hover:border-green-300" variant="outline" data-testid="button-restaurant-settings">
                <Settings className="h-6 w-6 text-green-500" />
                <span>Restaurant Settings</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders Preview */}
      {orders && orders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">Recent Orders</CardTitle>
            <Link href="/vendor-dashboard/orders">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => {
                const statusColor = order.status === 'confirmed' ? 'bg-orange-100 text-orange-700' :
                                   order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                                   order.status === 'ready' ? 'bg-green-100 text-green-700' :
                                   'bg-gray-100 text-gray-700';
                return (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-white dark:bg-slate-700 p-2 rounded-lg">
                        <ShoppingBag className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">#{order.orderNumber || order.id.slice(-8)}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={statusColor}>{order.status}</Badge>
                      <span className="font-medium text-green-600">₱{parseFloat(order.totalAmount).toFixed(0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}