import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorPageWrapper, NoOrdersEmptyState, VendorOrderSkeleton, VendorStatsSkeleton } from "@/components/vendor";
import {
  ShoppingBag,
  Search,
  CheckCircle,
  XCircle,
  Bell,
  Clock,
  Users,
  Activity,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  MapPin,
  Phone,
  User,
  Bike,
  ChefHat,
  Package,
  Timer
} from "lucide-react";
import { useVendorToast } from "@/hooks/use-vendor-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, Restaurant } from "@shared/schema";
import LeafletLiveTrackingMap from "@/components/shared/leaflet-live-tracking-map";

// Extended order type with enriched data
interface EnrichedOrder extends Order {
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  rider?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    currentLocation?: any;
  } | null;
  formattedDeliveryAddress?: string;
  minutesAgo?: number;
}

export default function VendorOrders() {
  const vendorToast = useVendorToast();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Real-time features state
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentOrderIds, setRecentOrderIds] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize notification sound
  useEffect(() => {
    try {
      if (audioRef.current === null) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+Dm1XIkBTGH0fPVfzEGHmnA7OF6LwUuhM/z2YU2CRZjuOnUnkwODVKm5fKxZSAJPJPY8sz5MQUZ');
      }
    } catch (error) {
      console.warn('Failed to initialize notification audio:', error);
    }
  }, []);

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // WebSocket connection for real-time order updates
  useEffect(() => {
    if (!restaurant?.id) return;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/vendor/${restaurant.id}`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'NEW_ORDER') {
            // Play notification sound
            if (soundEnabled && audioRef.current) {
              audioRef.current.play().catch(() => {});
            }

            // Show toast notification
            vendorToast.toast({
              title: "New Order Received!",
              description: `Order #${data.order.orderNumber || data.order.id.slice(-8)} for ₱${parseFloat(data.order.totalAmount).toFixed(2)}`,
              duration: 5000,
            });
            
            // Track recent orders for highlighting
            setRecentOrderIds(prev => new Set([...Array.from(prev), data.order.id]));
            setUnreadNotifications(prev => prev + 1);
            
            // Refresh orders data
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
            
            // Clear highlight after 30 seconds
            setTimeout(() => {
              setRecentOrderIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(data.order.id);
                return newSet;
              });
            }, 30000);
          }
          
          if (data.type === 'ORDER_UPDATE') {
            // Refresh orders data for any status updates
            queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [restaurant?.id, soundEnabled, vendorToast.toast, queryClient]);

  // Clear notifications when user views orders
  useEffect(() => {
    if (unreadNotifications > 0) {
      const timer = setTimeout(() => {
        setUnreadNotifications(0);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [unreadNotifications]);

  // Fetch vendor's orders (enriched with customer/rider data)
  const { data: orders, isLoading: ordersLoading } = useQuery<EnrichedOrder[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: !!restaurant,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status, notes });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      // Use specific vendor toast based on status
      switch (variables.status) {
        case 'confirmed':
          vendorToast.orderAccepted();
          break;
        case 'cancelled':
          vendorToast.orderRejected();
          break;
        case 'ready':
          vendorToast.orderReady();
          break;
        case 'completed':
          vendorToast.orderCompleted();
          break;
        default:
          vendorToast.success("Order status updated successfully.");
      }
    },
    onError: (error: any) => {
      vendorToast.error(error.message || "Failed to update order status.");
    },
  });

  // Filter orders based on search and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = searchFilter === "" || 
      order.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (ordersLoading) {
    return (
      <VendorPageWrapper 
        refreshQueryKeys={["/api/vendor/orders", "/api/vendor/restaurant"]}
        pageTitle="Orders Management"
        pageDescription="Manage your restaurant orders"
      >
        <div className="space-y-6" data-testid="vendor-orders-loading">
          {/* Header skeleton */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <div className="flex items-center gap-4 mt-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          </div>

          {/* Stats grid skeleton */}
          <VendorStatsSkeleton count={4} />

          {/* Search and filters skeleton */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>

          {/* Order cards skeleton */}
          <VendorOrderSkeleton count={5} />
        </div>
      </VendorPageWrapper>
    );
  }

  return (
    <VendorPageWrapper 
      refreshQueryKeys={["/api/vendor/orders", "/api/vendor/restaurant"]}
      pageTitle="Orders Management"
      pageDescription="Manage your restaurant orders"
    >
    <div className="space-y-6" data-testid="vendor-orders-page">
      {/* Header with Real-time Status */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-600" data-testid="icon-connected" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" data-testid="icon-disconnected" />
              )}
              <span className={`text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected ? 'Live Updates Active' : 'Reconnecting...'}
              </span>
            </div>
            
            <Button
              size="sm" 
              variant="outline"
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-testid="button-toggle-sound"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              Sound {soundEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {unreadNotifications > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Bell className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                {unreadNotifications} new order{unreadNotifications > 1 ? 's' : ''}
              </span>
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            {filteredOrders.length} of {orders?.length || 0} orders
          </div>
        </div>
      </div>

      {/* Real-time Stats Dashboard */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Orders</CardTitle>
            <Bell className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="count-pending-orders">
              {orders?.filter(order => order.status === 'confirmed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Ready to start preparing</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preparing</CardTitle>
            <ChefHat className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="count-active-orders">
              {orders?.filter(order => order.status === 'preparing').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Being prepared now</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready for Pickup</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="count-ready-orders">
              {orders?.filter(order => order.status === 'ready').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Waiting for rider</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Total</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="count-today-orders">
              {orders?.filter(order =>
                new Date(order.createdAt!).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              ₱{orders?.filter(order =>
                new Date(order.createdAt!).toDateString() === new Date().toDateString()
              ).reduce((sum, o) => sum + parseFloat(o.totalAmount), 0).toFixed(0) || 0} revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Tracking Map - Shows active orders with rider locations */}
      {filteredOrders.filter(o => !['delivered', 'cancelled', 'completed'].includes(o.status)).length > 0 && (
        <LeafletLiveTrackingMap
          userRole="vendor"
          apiEndpoint="/api/vendor/orders"
          title="Live Delivery Tracking"
          showList={true}
          height="350px"
        />
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders by ID or order number..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
            data-testid="input-search-orders"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          data-testid="select-order-status"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <NoOrdersEmptyState
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] })}
          />
        ) : (
          filteredOrders.map((order) => {
            // Determine border color based on status
            const borderColor = order.status === 'confirmed' ? 'border-l-orange-500' :
                               order.status === 'preparing' ? 'border-l-blue-500' :
                               order.status === 'ready' ? 'border-l-green-500' :
                               order.status === 'picked_up' || order.status === 'in_transit' ? 'border-l-purple-500' :
                               'border-l-gray-300';

            const statusBadgeClass = order.status === 'confirmed' ? 'bg-orange-100 text-orange-800' :
                                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                                    order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                    order.status === 'picked_up' || order.status === 'in_transit' ? 'bg-purple-100 text-purple-800' :
                                    order.status === 'delivered' || order.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800';

            const statusLabel = order.status === 'confirmed' ? 'New Order' :
                               order.status === 'preparing' ? 'Preparing' :
                               order.status === 'ready' ? 'Ready for Pickup' :
                               order.status === 'picked_up' ? 'Picked Up' :
                               order.status === 'in_transit' ? 'On the Way' :
                               order.status === 'delivered' ? 'Delivered' :
                               order.status === 'completed' ? 'Completed' :
                               order.status;

            return (
              <Card
                key={order.id}
                className={`border-l-4 ${borderColor} ${
                  recentOrderIds.has(order.id)
                    ? 'bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-300'
                    : ''
                } hover:shadow-md transition-shadow`}
                data-testid={`card-order-${order.id.slice(-8)}`}
              >
                <CardContent className="p-4 md:p-6">
                  {/* Header Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 dark:bg-slate-700 p-2 rounded-lg">
                        <ShoppingBag className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg text-gray-900 dark:text-white">
                            #{order.orderNumber || order.id.slice(-8)}
                          </p>
                          <Badge className={statusBadgeClass}>
                            {statusLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Timer className="h-3 w-3" />
                          {order.minutesAgo !== undefined ? (
                            order.minutesAgo < 60 ? `${order.minutesAgo} min ago` : `${Math.floor(order.minutesAgo / 60)}h ago`
                          ) : (
                            new Date(order.createdAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">₱{parseFloat(order.totalAmount).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{order.paymentMethod === 'cash' ? 'Cash on Delivery' : order.paymentMethod}</p>
                    </div>
                  </div>

                  {/* Customer & Delivery Info */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {/* Customer Info */}
                    <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">{order.customer?.name || 'Customer'}</p>
                      {order.customer?.phone && (
                        <a href={`tel:${order.customer.phone}`} className="text-sm text-blue-600 flex items-center gap-1 mt-1 hover:underline">
                          <Phone className="h-3 w-3" />
                          {order.customer.phone}
                        </a>
                      )}
                    </div>

                    {/* Delivery Address */}
                    <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Delivery To</span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {order.formattedDeliveryAddress || 'Delivery Address'}
                      </p>
                    </div>
                  </div>

                  {/* Rider Info (if assigned) */}
                  {order.rider && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bike className="h-4 w-4 text-purple-600" />
                          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Rider Assigned</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-purple-900 dark:text-purple-100">{order.rider.name}</span>
                          {order.rider.phone && (
                            <a href={`tel:${order.rider.phone}`} className="text-purple-600 hover:text-purple-800">
                              <Phone className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="mb-4 p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Order Items ({Array.isArray(order.items) ? order.items.length : 0})
                    </h4>
                    <div className="space-y-1">
                      {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-slate-700 last:border-0">
                          <span className="text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                            {item.notes && <span className="text-xs text-gray-500 ml-1">({item.notes})</span>}
                          </span>
                          <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {order.specialInstructions && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                        <p className="text-xs text-gray-500">Special Instructions:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{order.specialInstructions}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* New orders - show Accept and Reject buttons */}
                    {order.status === 'confirmed' && (
                      <>
                        <Button
                          size="lg"
                          className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            updateOrderStatusMutation.mutate({
                              orderId: order.id,
                              status: 'preparing',
                              notes: 'Order accepted and being prepared'
                            });
                          }}
                          disabled={updateOrderStatusMutation.isPending}
                          data-testid={`button-accept-${order.id.slice(-8)}`}
                        >
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Accept Order
                        </Button>
                        <Button
                          size="lg"
                          variant="destructive"
                          className="flex-1 md:flex-none"
                          onClick={() => {
                            updateOrderStatusMutation.mutate({
                              orderId: order.id,
                              status: 'cancelled',
                              notes: 'Order rejected by restaurant'
                            });
                          }}
                          disabled={updateOrderStatusMutation.isPending}
                          data-testid={`button-reject-${order.id.slice(-8)}`}
                        >
                          <XCircle className="mr-2 h-5 w-5" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Preparing status - show Ready for Pickup button */}
                    {order.status === 'preparing' && (
                      <div className="w-full">
                        <div className="flex items-center gap-2 mb-3 text-blue-600">
                          <ChefHat className="h-5 w-5 animate-pulse" />
                          <span className="font-medium">Currently preparing...</span>
                        </div>
                        <Button
                          size="lg"
                          className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            updateOrderStatusMutation.mutate({
                              orderId: order.id,
                              status: 'ready',
                              notes: 'Order is ready for pickup'
                            });
                          }}
                          disabled={updateOrderStatusMutation.isPending}
                          data-testid={`button-ready-${order.id.slice(-8)}`}
                        >
                          <Package className="mr-2 h-5 w-5" />
                          Ready for Pickup
                        </Button>
                      </div>
                    )}

                    {/* Ready status - waiting for rider */}
                    {order.status === 'ready' && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-300">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Ready! Waiting for rider to pick up</span>
                      </div>
                    )}

                    {/* Picked up or in transit */}
                    {(order.status === 'picked_up' || order.status === 'in_transit') && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-700 dark:text-purple-300">
                        <Bike className="h-5 w-5" />
                        <span className="font-medium">Rider picked up - delivering to customer</span>
                      </div>
                    )}

                    {/* Delivered or completed */}
                    {(order.status === 'delivered' || order.status === 'completed') && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Order completed successfully</span>
                      </div>
                    )}

                    {/* Cancelled */}
                    {order.status === 'cancelled' && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-700 dark:text-red-300">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">Order was cancelled</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
    </VendorPageWrapper>
  );
}