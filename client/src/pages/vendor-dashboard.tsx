import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  ShoppingBag, 
  DollarSign, 
  Star, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Eye,
  Plus,
  Edit
} from "lucide-react";
import btsLogo from "@assets/btslogo.png";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, Restaurant, MenuItem } from "@shared/schema";

// Mock restaurant ID - in real app this would come from auth context
const MOCK_RESTAURANT_ID = "restaurant-1";

export default function VendorDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", MOCK_RESTAURANT_ID],
  });

  // Fetch restaurant orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", { restaurantId: MOCK_RESTAURANT_ID }],
    queryFn: async () => {
      const response = await fetch(`/api/orders?restaurantId=${MOCK_RESTAURANT_ID}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  // Fetch menu items
  const { data: menuItems, isLoading: menuLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", MOCK_RESTAURANT_ID, "menu"],
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order status updated",
        description: "The order status has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update menu item availability mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<MenuItem> }) => {
      return await apiRequest("PATCH", `/api/menu-items/${itemId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", MOCK_RESTAURANT_ID, "menu"] });
      toast({
        title: "Menu item updated",
        description: "The menu item has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update menu item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAcceptOrder = (orderId: string) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: "confirmed",
      notes: "Order accepted by restaurant"
    });
  };

  const handleRejectOrder = (orderId: string) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: "cancelled",
      notes: "Order rejected by restaurant"
    });
  };

  const handleOrderReady = (orderId: string) => {
    updateOrderStatusMutation.mutate({
      orderId,
      status: "ready",
      notes: "Order is ready for pickup"
    });
  };

  const toggleMenuItemAvailability = (itemId: string, isAvailable: boolean) => {
    updateMenuItemMutation.mutate({
      itemId,
      updates: { isAvailable }
    });
  };

  if (restaurantLoading || ordersLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="vendor-dashboard-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-96 w-full mt-8" />
        </div>
      </div>
    );
  }

  // Calculate stats
  const todayOrders = orders?.filter(order => {
    const today = new Date().toDateString();
    return new Date(order.createdAt!).toDateString() === today;
  }) || [];

  const todayRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0);
  const pendingOrders = orders?.filter(order => order.status === "pending") || [];
  const preparingOrders = orders?.filter(order => order.status === "preparing") || [];

  return (
    <div className="min-h-screen bg-background py-8" data-testid="vendor-dashboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="dashboard-title">
              Vendor Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {restaurant?.name || "Restaurant Owner"}
            </p>
          </div>
          <img 
            src={btsLogo} 
            alt="BTS Delivery Logo" 
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="today-orders-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Orders</p>
                  <p className="text-2xl font-bold text-primary">{todayOrders.length}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="today-revenue-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Revenue</p>
                  <p className="text-2xl font-bold text-success">₱{todayRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="restaurant-rating-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold text-accent">
                    {restaurant?.rating || "4.8"} ⭐
                  </p>
                </div>
                <Star className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="total-orders-stat">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold text-foreground">
                    {restaurant?.totalOrders || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="dashboard-tabs">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">Orders</TabsTrigger>
            <TabsTrigger value="menu" data-testid="menu-tab">Menu Management</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Recent Orders */}
              <Card data-testid="recent-orders-overview">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {orders?.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold" data-testid={`recent-order-number-${order.id}`}>
                          #{order.orderNumber}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ₱{parseFloat(order.totalAmount).toFixed(2)}
                        </p>
                      </div>
                      <Badge 
                        variant={order.status === "delivered" ? "default" : "secondary"}
                        data-testid={`recent-order-status-${order.id}`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Restaurant Info */}
              <Card data-testid="restaurant-info-overview">
                <CardHeader>
                  <CardTitle>Restaurant Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-foreground">{restaurant?.name}</p>
                    <p className="text-sm text-muted-foreground">{restaurant?.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Fee: ₱{restaurant?.deliveryFee || 0}</p>
                    <p className="text-sm text-muted-foreground">
                      Estimated Delivery: {restaurant?.estimatedDeliveryTime || 30} minutes
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Restaurant Status:</span>
                    <Badge variant={restaurant?.isActive ? "default" : "secondary"}>
                      {restaurant?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* New Orders */}
              <Card data-testid="new-orders-section">
                <CardHeader>
                  <CardTitle>New Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No new orders</p>
                  ) : (
                    pendingOrders.map((order) => {
                      const orderItems = order.items as any[];
                      return (
                        <div key={order.id} className="p-4 border border-border rounded-lg" data-testid={`new-order-${order.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-foreground" data-testid={`new-order-number-${order.id}`}>
                              Order #{order.orderNumber}
                            </h4>
                            <Badge variant="secondary">New</Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {orderItems?.map((item, index) => (
                              <p key={index} className="text-sm text-muted-foreground">
                                {item.quantity}x {item.name}
                              </p>
                            ))}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-primary" data-testid={`new-order-total-${order.id}`}>
                              ₱{parseFloat(order.totalAmount).toFixed(2)}
                            </span>
                            <div className="space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectOrder(order.id)}
                                disabled={updateOrderStatusMutation.isPending}
                                data-testid={`reject-order-${order.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Decline
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptOrder(order.id)}
                                disabled={updateOrderStatusMutation.isPending}
                                data-testid={`accept-order-${order.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Orders in Preparation */}
              <Card data-testid="preparing-orders-section">
                <CardHeader>
                  <CardTitle>Orders in Preparation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {preparingOrders.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No orders in preparation</p>
                  ) : (
                    preparingOrders.map((order) => {
                      const orderItems = order.items as any[];
                      return (
                        <div key={order.id} className="p-4 border border-border rounded-lg" data-testid={`preparing-order-${order.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-foreground" data-testid={`preparing-order-number-${order.id}`}>
                              Order #{order.orderNumber}
                            </h4>
                            <Badge className="bg-primary/20 text-primary">Preparing</Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            {orderItems?.map((item, index) => (
                              <p key={index} className="text-sm text-muted-foreground">
                                {item.quantity}x {item.name}
                              </p>
                            ))}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-primary" data-testid={`preparing-order-total-${order.id}`}>
                              ₱{parseFloat(order.totalAmount).toFixed(2)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleOrderReady(order.id)}
                              disabled={updateOrderStatusMutation.isPending}
                              data-testid={`ready-order-${order.id}`}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Mark Ready
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu" className="space-y-6">
            <Card data-testid="menu-management-section">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Menu Items</CardTitle>
                  <Button data-testid="add-menu-item-button">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {menuItems?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border border-border rounded-lg" data-testid={`menu-item-${item.id}`}>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground" data-testid={`menu-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid={`menu-item-price-${item.id}`}>
                        ₱{item.price}
                      </p>
                      {!item.isAvailable && (
                        <Badge variant="destructive" className="mt-1">Out of stock</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={item.isAvailable ?? false}
                          onCheckedChange={(checked) => toggleMenuItemAvailability(item.id, checked)}
                          disabled={updateMenuItemMutation.isPending}
                          data-testid={`menu-item-toggle-${item.id}`}
                        />
                        <span className="text-sm text-muted-foreground">Available</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        data-testid={`edit-menu-item-${item.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!menuItems || menuItems.length === 0) && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No menu items found. Add your first menu item to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
