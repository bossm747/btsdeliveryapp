import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Package, Clock, MapPin, Star, Filter, Search,
  ArrowLeft, Eye, Phone, MessageCircle, CheckCircle,
  Truck, Store, Navigation, Calendar, Receipt,
  AlertTriangle, RefreshCw, Bell, X, Heart,
  ChevronRight, CreditCard, MapPin as LocationPin,
  Timer, User, Utensils, DollarSign
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCardSkeleton } from "@/components/skeletons";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { OfflineIndicator, useOnlineStatus } from "@/components/OfflineIndicator";
import { getOrders as getCachedOrders, saveOrders } from "@/lib/offline-storage";

interface Order {
  id: string;
  orderNumber: string;
  restaurantName: string;
  restaurantId: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  deliveryAddress: {
    street: string;
    barangay: string;
    city: string;
    province: string;
  };
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  scheduledFor?: string; // Pre-order scheduling
  createdAt: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
}

export default function CustomerOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState<{[orderId: string]: any}>({});
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(null);
  const [cachedOrders, setCachedOrders] = useState<Order[] | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const isOnline = useOnlineStatus();

  // Load cached orders when offline
  useEffect(() => {
    const loadCachedOrders = async () => {
      if (!isOnline) {
        try {
          const cached = await getCachedOrders();
          if (cached) {
            setCachedOrders(cached.orders as Order[]);
            setIsFromCache(true);
            // Get cache timestamp from the cache metadata
            const { getCacheTimestamp } = await import("@/lib/offline-storage");
            const timestamp = await getCacheTimestamp();
            setCacheTimestamp(timestamp);
          }
        } catch (error) {
          console.error("Failed to load cached orders:", error);
        }
      } else {
        setIsFromCache(false);
        setCachedOrders(null);
      }
    };

    loadCachedOrders();
  }, [isOnline]);

  // Real-time WebSocket connection for order updates
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/customer`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('Customer WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'order_status_update') {
            setRealTimeUpdates(prev => ({
              ...prev,
              [data.orderId]: {
                status: data.status,
                message: data.message,
                timestamp: data.timestamp,
                location: data.location,
                estimatedArrival: data.estimatedArrival
              }
            }));
            
            // Show notification
            toast({
              title: "Order Update",
              description: data.message,
              duration: 5000,
            });
            
            // Refresh orders data
            queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
          }
          
          if (data.type === 'delivery_update' && data.location) {
            setRealTimeUpdates(prev => ({
              ...prev,
              [data.orderId]: {
                ...prev[data.orderId],
                currentLocation: data.location,
                estimatedArrival: data.estimatedArrival
              }
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('Customer WebSocket disconnected');
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast, queryClient]);

  const { data: orders, isLoading, error, refetch, isFetching } = useQuery<Order[]>({
    queryKey: ["/api/customer/orders", { status: statusFilter, dateRange }],
    queryFn: async () => {
      // If offline, return cached data
      if (!navigator.onLine) {
        const cached = await getCachedOrders();
        if (cached) {
          setIsFromCache(true);
          const { getCacheTimestamp } = await import("@/lib/offline-storage");
          const timestamp = await getCacheTimestamp();
          setCacheTimestamp(timestamp);
          return cached.orders as Order[];
        }
        throw new Error('No cached data available while offline');
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateRange !== "all") params.set("dateRange", dateRange);

      const response = await fetch(`/api/customer/orders?${params}`);

      // Check if response is from cache (service worker header)
      const fromCache = response.headers.get('X-From-Cache') === 'true';
      const cacheStale = response.headers.get('X-Cache-Stale') === 'true';
      const cacheTime = response.headers.get('X-Cache-Timestamp');

      if (fromCache) {
        setIsFromCache(true);
        setCacheTimestamp(cacheTime ? parseInt(cacheTime, 10) : null);
      } else {
        setIsFromCache(false);
        setCacheTimestamp(null);
      }

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Persist to IndexedDB cache for offline access
      if (Array.isArray(data) && !fromCache) {
        try {
          await saveOrders(data);
          console.log('[CustomerOrders] Orders saved to IndexedDB cache');
        } catch (cacheError) {
          console.error('[CustomerOrders] Failed to cache orders:', cacheError);
        }
      }

      return data;
    },
    // Use cached data as initial data when available
    initialData: cachedOrders || undefined,
    // Don't refetch on window focus when offline
    refetchOnWindowFocus: isOnline,
    // Don't retry when offline
    retry: isOnline ? 1 : false,
  });

  // Handle refresh when back online
  const handleRefresh = useCallback(() => {
    if (isOnline) {
      refetch();
      toast({
        title: "Refreshing",
        description: "Fetching latest order data...",
      });
    }
  }, [isOnline, refetch, toast]);

  // Order cancellation mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/orders/${orderId}/cancel-with-refund`, { reason, requestRefund: true });
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Order Cancelled",
        description: data?.refund ?
          `Order cancelled. Refund of ₱${data.refund.amount?.toFixed(2)} is being processed.` :
          "Order cancelled successfully.",
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  const filteredOrders = orders?.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.restaurantName.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }
    return true;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-orange-100 text-orange-800";
      case "ready": return "bg-purple-100 text-purple-800";
      case "picked_up": return "bg-indigo-100 text-indigo-800";
      case "in_transit": return "bg-green-100 text-green-800";
      case "delivered": return "bg-green-500 text-white";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "confirmed": return "Confirmed";
      case "preparing": return "Preparing";
      case "ready": return "Ready for Pickup";
      case "picked_up": return "Picked Up";
      case "in_transit": return "On the Way";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const activeOrders = filteredOrders.filter(order => 
    !["delivered", "cancelled"].includes(order.status)
  );

  const pastOrders = filteredOrders.filter(order => 
    ["delivered", "cancelled"].includes(order.status)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="customer-orders-loading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-32 rounded-md" />
              <div>
                <Skeleton className="h-9 w-32 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </div>

          {/* Filters skeleton */}
          <div className="mb-6 rounded-xl border bg-card p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="h-10 flex-1 rounded-md" />
              <Skeleton className="h-10 w-[180px] rounded-md" />
              <Skeleton className="h-10 w-[160px] rounded-md" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-80 mb-6 rounded-md" />

          {/* Order cards skeleton */}
          <div className="space-y-4">
            <OrderCardSkeleton count={3} showProgress={true} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="customer-orders-error">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Unable to load orders</h2>
              <p className="text-gray-600 mb-4">
                There was an error loading your order history. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8" data-testid="customer-orders-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Offline Indicator */}
        <OfflineIndicator
          isFromCache={isFromCache}
          cacheTimestamp={cacheTimestamp}
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" data-testid="back-to-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#004225]" data-testid="page-title">
                My Orders
              </h1>
              <p className="text-gray-600">
                Track and manage your orders
                {!isOnline && " (Offline mode)"}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order number, restaurant, or items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-orders"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="status-filter">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]" data-testid="date-filter">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active" data-testid="active-orders-tab">
              Active Orders ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="past-orders-tab">
              Order History ({pastOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    icon={Package}
                    title="No active orders"
                    description="You don't have any active orders right now. Browse restaurants to place your first order."
                    size="lg"
                  >
                    <Link href="/restaurants">
                      <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90 mt-4">
                        Browse Restaurants
                      </Button>
                    </Link>
                  </EmptyState>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isActive={true}
                  realTimeUpdates={realTimeUpdates}
                  cancelOrderMutation={cancelOrderMutation}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastOrders.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    icon={Receipt}
                    title="No order history"
                    description="Your completed orders will appear here once you've made some purchases."
                    size="lg"
                  />
                </CardContent>
              </Card>
            ) : (
              pastOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isActive={false}
                  realTimeUpdates={realTimeUpdates}
                  cancelOrderMutation={cancelOrderMutation}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Enhanced OrderCard component with real-time tracking
function OrderCard({ order, isActive, realTimeUpdates, cancelOrderMutation }: { 
  order: Order; 
  isActive: boolean;
  realTimeUpdates: {[orderId: string]: any};
  cancelOrderMutation: any;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get real-time updates for this order
  const realtimeData = realTimeUpdates[order.id];
  const currentStatus = realtimeData?.status || order.status;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed": return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing": return "bg-orange-100 text-orange-800 border-orange-200";
      case "ready": return "bg-purple-100 text-purple-800 border-purple-200";
      case "picked_up": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "in_transit": return "bg-green-100 text-green-800 border-green-200 animate-pulse";
      case "delivered": return "bg-green-500 text-white border-green-600";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Order Received";
      case "confirmed": return "Confirmed by Restaurant";
      case "preparing": return "Being Prepared";
      case "ready": return "Ready for Pickup";
      case "picked_up": return "Out for Delivery";
      case "in_transit": return "On the Way";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "pending": return 10;
      case "confirmed": return 25;
      case "preparing": return 50;
      case "ready": return 75;
      case "picked_up": return 85;
      case "in_transit": return 95;
      case "delivered": return 100;
      case "cancelled": return 0;
      default: return 0;
    }
  };

  const canCancelOrder = (status: string) => {
    return ["pending", "confirmed", "preparing"].includes(status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "confirmed": return <CheckCircle className="w-4 h-4" />;
      case "preparing": return <Utensils className="w-4 h-4" />;
      case "ready": return <Bell className="w-4 h-4" />;
      case "picked_up": return <Truck className="w-4 h-4" />;
      case "in_transit": return <Navigation className="w-4 h-4" />;
      case "delivered": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <X className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const handleCancelOrder = () => {
    if (!cancelReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for cancellation",
        variant: "destructive",
      });
      return;
    }
    
    cancelOrderMutation.mutate({ orderId: order.id, reason: cancelReason });
    setShowCancelDialog(false);
    setCancelReason("");
  };

  return (
    <>
      <Card className={`hover:shadow-lg transition-all duration-300 ${
        realtimeData?.status ? 'border-green-200 shadow-md' : ''
      }`} data-testid={`order-card-${order.id}`}>
        <CardContent className="p-6">
          {/* Order Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-semibold text-lg" data-testid="order-number">
                  Order #{order.orderNumber}
                </h3>
                <Badge className={`${getStatusColor(currentStatus)} border flex items-center gap-1`} 
                       data-testid="order-status">
                  {getStatusIcon(currentStatus)}
                  {getStatusText(currentStatus)}
                </Badge>
                {realtimeData?.status && (
                  <Badge variant="outline" className="text-green-600 border-green-200 animate-pulse">
                    Live
                  </Badge>
                )}
              </div>
              <div className="flex items-center text-gray-600 mb-2">
                <Store className="w-4 h-4 mr-2" />
                <span data-testid="restaurant-name" className="font-medium">{order.restaurantName}</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm mb-2">
                <Calendar className="w-4 h-4 mr-2" />
                <span data-testid="order-date">
                  {new Date(order.createdAt).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {order.scheduledFor && (
                <div className="flex items-center text-blue-600 text-sm mb-2 font-medium" data-testid="scheduled-for">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>
                    Scheduled for: {new Date(order.scheduledFor).toLocaleDateString('en-PH', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
              {realtimeData?.estimatedArrival && currentStatus === 'in_transit' && (
                <div className="flex items-center text-green-600 text-sm font-medium">
                  <Timer className="w-4 h-4 mr-2" />
                  <span>ETA: {new Date(realtimeData.estimatedArrival).toLocaleTimeString('en-PH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-[#004225]" data-testid="order-total">
                ₱{order.totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                {order.items.length} item{order.items.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center justify-end text-xs text-gray-500">
                <CreditCard className="w-3 h-3 mr-1" />
                {order.paymentMethod}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {isActive && currentStatus !== 'cancelled' && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Order Progress</span>
                <span>{getProgressPercentage(currentStatus)}%</span>
              </div>
              <Progress value={getProgressPercentage(currentStatus)} className="h-2" />
            </div>
          )}

          {/* Real-time Message */}
          {realtimeData?.message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-green-700">
                <Bell className="w-4 h-4" />
                <span className="font-medium">Live Update</span>
              </div>
              <p className="text-green-600 text-sm mt-1">{realtimeData.message}</p>
            </div>
          )}

          {/* Order Items Preview */}
          <div className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2 flex items-center">
              <Utensils className="w-4 h-4 mr-2" />
              Order Items
            </h4>
            <div className="bg-gray-50 rounded-lg p-3">
              {order.items.slice(0, 2).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{item.quantity}x {item.name}</span>
                  <span className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {order.items.length > 2 && (
                <div className="text-xs text-gray-500 mt-1">
                  +{order.items.length - 2} more items
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="flex-1"
              data-testid="view-details-btn"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            
            {isActive && canCancelOrder(currentStatus) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                className="text-red-600 border-red-200 hover:bg-red-50"
                data-testid="cancel-order-btn"
                disabled={cancelOrderMutation.isPending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}

            {currentStatus === 'in_transit' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="text-green-600 border-green-200 hover:bg-green-50"
                data-testid="track-order-btn"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Track Live
              </Button>
            )}

            {order.riderId && (
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                data-testid="contact-rider-btn"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Rider
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Details - #{order.orderNumber}
              <Badge className={`${getStatusColor(currentStatus)} border`}>
                {getStatusText(currentStatus)}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Order Progress */}
            {isActive && currentStatus !== 'cancelled' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Order Progress
                </h3>
                <Progress value={getProgressPercentage(currentStatus)} className="mb-3" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit', 'delivered'].map((status) => (
                    <div 
                      key={status} 
                      className={`text-center p-2 rounded ${
                        getProgressPercentage(currentStatus) >= getProgressPercentage(status) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-white text-gray-400'
                      }`}
                    >
                      {getStatusText(status)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time Updates */}
            {realtimeData?.message && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Bell className="w-4 h-4 mr-2" />
                  Live Update
                </h3>
                <p className="text-blue-700">{realtimeData.message}</p>
                {realtimeData.timestamp && (
                  <p className="text-blue-600 text-sm mt-1">
                    {new Date(realtimeData.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Scheduled Delivery Notice */}
            {order.scheduledFor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Scheduled Pre-Order
                </h3>
                <p className="text-blue-700">
                  This order is scheduled for delivery on{' '}
                  <strong>
                    {new Date(order.scheduledFor).toLocaleDateString('en-PH', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                </p>
              </div>
            )}

            {/* Restaurant Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Store className="w-4 h-4 mr-2" />
                Restaurant Details
              </h3>
              <div className="space-y-2">
                <p><strong>Name:</strong> {order.restaurantName}</p>
                <p><strong>Order Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                {order.scheduledFor && (
                  <p><strong>Scheduled For:</strong> {new Date(order.scheduledFor).toLocaleString()}</p>
                )}
                {order.estimatedDeliveryTime && (
                  <p><strong>Estimated Delivery:</strong> {new Date(order.estimatedDeliveryTime).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Utensils className="w-4 h-4 mr-2" />
                Order Items
              </h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.notes && (
                        <p className="text-sm text-gray-500">Note: {item.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₱{(item.price * item.quantity).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">₱{item.price.toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Order Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₱{(order.totalAmount - order.deliveryFee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span>₱{order.deliveryFee.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>₱{order.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <LocationPin className="w-4 h-4 mr-2" />
                Delivery Information
              </h3>
              <div className="space-y-2">
                <p><strong>Address:</strong></p>
                <p className="text-gray-600 ml-4">
                  {order.deliveryAddress.street}<br/>
                  {order.deliveryAddress.barangay}, {order.deliveryAddress.city}<br/>
                  {order.deliveryAddress.province}
                </p>
                <p><strong>Payment Method:</strong> {order.paymentMethod}</p>
                <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
              </div>
            </div>

            {/* Rider Info */}
            {order.riderId && (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Rider Information
                </h3>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {order.riderName || 'Loading...'}</p>
                  {order.riderPhone && (
                    <p><strong>Phone:</strong> {order.riderPhone}</p>
                  )}
                  {realtimeData?.estimatedArrival && (
                    <p><strong>Estimated Arrival:</strong> {new Date(realtimeData.estimatedArrival).toLocaleTimeString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Cancellation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Cancel Order #{order.orderNumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            
            <div className="space-y-2">
              <label htmlFor="cancel-reason" className="text-sm font-medium">
                Reason for cancellation *
              </label>
              <select
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select a reason</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="wrong_order">Ordered wrong items</option>
                <option value="too_long_wait">Taking too long</option>
                <option value="emergency">Emergency situation</option>
                <option value="other">Other reason</option>
              </select>
            </div>

            {order.paymentStatus === 'paid' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">
                  <strong>Refund Information:</strong> Your refund will be processed based on the order status.
                  Orders cancelled before preparation: 100% refund.
                  Orders cancelled during preparation: 50% refund.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
                className="flex-1"
                disabled={cancelOrderMutation.isPending}
              >
                Keep Order
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelOrder}
                className="flex-1"
                disabled={cancelOrderMutation.isPending || !cancelReason}
              >
                {cancelOrderMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel Order
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}