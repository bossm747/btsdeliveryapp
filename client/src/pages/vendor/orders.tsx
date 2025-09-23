import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  VolumeX
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, Restaurant } from "@shared/schema";

export default function VendorOrders() {
  const { toast } = useToast();
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
            toast({
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
  }, [restaurant?.id, soundEnabled, toast, queryClient]);

  // Clear notifications when user views orders
  useEffect(() => {
    if (unreadNotifications > 0) {
      const timer = setTimeout(() => {
        setUnreadNotifications(0);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [unreadNotifications]);

  // Fetch vendor's orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: !!restaurant,
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({
        title: "Order status updated",
        description: "The order status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
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
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-pending-orders">
              {orders?.filter(order => order.status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Needs immediate attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-active-orders">
              {orders?.filter(order => ['confirmed', 'preparing'].includes(order.status)).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Being prepared</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-ready-orders">
              {orders?.filter(order => order.status === 'ready').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="count-today-orders">
              {orders?.filter(order => 
                new Date(order.createdAt!).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total today</p>
          </CardContent>
        </Card>
      </div>

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
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Orders Found</h3>
            <p className="text-gray-500 dark:text-gray-400">When you receive orders, they'll appear here.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Card 
              key={order.id} 
              className={`border-l-4 ${
                recentOrderIds.has(order.id) 
                  ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20 animate-pulse' 
                  : 'border-l-primary/50'
              }`} 
              data-testid={`card-order-${order.id.slice(-8)}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Order #{order.orderNumber || order.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customer Order • ₱{parseFloat(order.totalAmount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt!).toLocaleDateString()} at {new Date(order.createdAt!).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={
                      order.status === 'pending' ? 'destructive' :
                      order.status === 'confirmed' || order.status === 'preparing' ? 'default' :
                      order.status === 'ready' ? 'secondary' : 'outline'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Order Items:</h4>
                  {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {order.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateOrderStatusMutation.mutate({
                            orderId: order.id,
                            status: 'confirmed',
                            notes: 'Order accepted by restaurant'
                          });
                        }}
                        disabled={updateOrderStatusMutation.isPending}
                        data-testid={`button-accept-${order.id.slice(-8)}`}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept Order
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
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
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: order.id,
                          status: 'preparing',
                          notes: 'Order is being prepared'
                        });
                      }}
                      disabled={updateOrderStatusMutation.isPending}
                      data-testid={`button-preparing-${order.id.slice(-8)}`}
                    >
                      Start Preparing
                    </Button>
                  )}

                  {order.status === 'preparing' && (
                    <Button
                      size="sm"
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
                      Mark Ready
                    </Button>
                  )}

                  {order.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: order.id,
                          status: 'completed',
                          notes: 'Order has been completed'
                        });
                      }}
                      disabled={updateOrderStatusMutation.isPending}
                      data-testid={`button-complete-${order.id.slice(-8)}`}
                    >
                      Complete Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}