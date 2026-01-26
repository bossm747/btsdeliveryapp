import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Clock, Phone, MessageCircle, Navigation,
  Package, Bike, ChefHat, CheckCircle, AlertCircle,
  Truck, ArrowRight, Activity, RefreshCw, Eye
} from "lucide-react";
import { Link } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";

interface LiveOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  estimatedDelivery?: string;
  restaurant?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  rider?: {
    id: string;
    name: string;
    phone?: string;
    vehicleType?: string;
    rating?: number;
    location?: {
      lat: number;
      lng: number;
    };
  };
  deliveryAddress?: string | {
    street?: string;
    barangay?: string;
    city?: string;
  };
}

interface LiveOrderTrackerProps {
  /** User role to determine view perspective */
  userRole: "customer" | "vendor" | "rider" | "admin";
  /** API endpoint to fetch orders */
  apiEndpoint: string;
  /** Title for the section */
  title?: string;
  /** Maximum number of orders to show */
  maxOrders?: number;
  /** Show map toggle */
  showMapToggle?: boolean;
  /** Callback when order is clicked */
  onOrderClick?: (orderId: string) => void;
  /** Show compact view */
  compact?: boolean;
  /** Additional class names */
  className?: string;
}

// Status configurations
const statusConfig: Record<string, { label: string; color: string; icon: any; progress: number }> = {
  payment_pending: { label: "Payment Pending", color: "bg-yellow-500", icon: Clock, progress: 5 },
  pending: { label: "Order Placed", color: "bg-gray-500", icon: Clock, progress: 10 },
  awaiting_rider: { label: "Finding Rider", color: "bg-orange-500", icon: Bike, progress: 15 },
  confirmed: { label: "Confirmed", color: "bg-blue-500", icon: CheckCircle, progress: 25 },
  preparing: { label: "Preparing", color: "bg-yellow-500", icon: ChefHat, progress: 40 },
  ready: { label: "Ready", color: "bg-orange-500", icon: Package, progress: 60 },
  picked_up: { label: "Picked Up", color: "bg-purple-500", icon: Bike, progress: 75 },
  in_transit: { label: "On the Way", color: "bg-indigo-500", icon: Truck, progress: 85 },
  en_route_delivery: { label: "En Route", color: "bg-indigo-500", icon: Truck, progress: 85 },
  at_customer: { label: "Arriving", color: "bg-green-500", icon: MapPin, progress: 95 },
  delivered: { label: "Delivered", color: "bg-green-500", icon: CheckCircle, progress: 100 },
  completed: { label: "Completed", color: "bg-green-500", icon: CheckCircle, progress: 100 },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: AlertCircle, progress: 0 },
};

export default function LiveOrderTracker({
  userRole,
  apiEndpoint,
  title = "Live Orders",
  maxOrders = 5,
  showMapToggle = false,
  onOrderClick,
  compact = false,
  className = "",
}: LiveOrderTrackerProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch orders
  const { data: orders = [], isLoading, refetch } = useQuery<LiveOrder[]>({
    queryKey: [apiEndpoint],
    refetchInterval: 10000, // Fallback polling every 10 seconds
  });

  // Filter active orders (not delivered/cancelled/completed)
  const activeOrders = orders.filter(
    (order) => !["delivered", "cancelled", "completed"].includes(order.status.toLowerCase())
  );

  // WebSocket for real-time updates
  const { status: wsStatus, subscribeToOrder } = useWebSocket({
    autoConnect: true,
    autoAuth: true,
    onOrderStatusUpdate: (update) => {
      setLastUpdate(new Date());
      refetch();
    },
    onRiderLocationUpdate: (update) => {
      setLastUpdate(new Date());
    },
    onConnect: () => setIsConnected(true),
    onDisconnect: () => setIsConnected(false),
  });

  // Subscribe to active orders
  useEffect(() => {
    activeOrders.forEach((order) => {
      subscribeToOrder(order.id);
    });
  }, [activeOrders.length]);

  // Get time elapsed since order creation
  const getTimeElapsed = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m ago`;
  };

  // Get ETA display
  const getETA = (order: LiveOrder) => {
    if (order.estimatedDelivery) {
      const eta = new Date(order.estimatedDelivery);
      const now = new Date();
      const diffMinutes = Math.ceil((eta.getTime() - now.getTime()) / 60000);
      if (diffMinutes <= 0) return "Any moment";
      if (diffMinutes < 60) return `${diffMinutes} min`;
      return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return null;
  };

  // Format delivery address
  const formatAddress = (address: LiveOrder['deliveryAddress']) => {
    if (!address) return "No address";
    if (typeof address === 'string') return address;
    return `${address.street || ''}, ${address.barangay || ''}, ${address.city || ''}`.replace(/^,\s*|,\s*$/g, '');
  };

  // Get link based on user role
  const getOrderLink = (orderId: string) => {
    switch (userRole) {
      case "customer": return `/order/${orderId}`;
      case "vendor": return `/vendor-dashboard/orders`;
      case "rider": return `/rider-dashboard`;
      case "admin": return `/admin/orders/${orderId}`;
      default: return `/order/${orderId}`;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activeOrders.length === 0) {
    return null; // Don't show section if no active orders
  }

  return (
    <Card className={`border-l-4 border-l-primary ${className}`} data-testid="live-order-tracker">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-yellow-500'}`} />
            {title}
            <Badge variant="secondary" className="ml-2">
              {activeOrders.length} active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeOrders.slice(0, maxOrders).map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const eta = getETA(order);

            return (
              <div
                key={order.id}
                className="relative bg-gradient-to-r from-gray-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow"
              >
                {/* Status indicator line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${status.color}`} />

                <div className="flex items-start justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-full ${status.color} text-white`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-semibold text-sm">
                        #{order.orderNumber || order.id.slice(-8)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {status.label}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <Progress value={status.progress} className="h-1.5" />
                    </div>

                    {/* Details based on role */}
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {userRole === "customer" && order.restaurant && (
                        <div className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          <span>{order.restaurant.name}</span>
                        </div>
                      )}
                      {userRole === "vendor" && order.customer && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{formatAddress(order.deliveryAddress)}</span>
                        </div>
                      )}
                      {userRole === "admin" && (
                        <>
                          <div className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            <span>{order.restaurant?.name || "Unknown"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{formatAddress(order.deliveryAddress)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{getTimeElapsed(order.createdAt)}</span>
                      </div>
                    </div>

                    {/* Rider info if assigned */}
                    {order.rider && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10">
                            {order.rider.name?.split(' ').map(n => n[0]).join('') || 'R'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{order.rider.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Bike className="h-3 w-3" />
                            {order.rider.vehicleType || 'Motorcycle'}
                            {order.rider.rating && <span className="ml-1">⭐ {order.rider.rating}</span>}
                          </div>
                        </div>
                        {order.rider.phone && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Phone className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right side - ETA and actions */}
                  <div className="flex flex-col items-end gap-2">
                    {eta && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">{eta}</div>
                        <div className="text-xs text-muted-foreground">ETA</div>
                      </div>
                    )}
                    <div className="font-semibold text-green-600">
                      ₱{parseFloat(order.totalAmount).toFixed(0)}
                    </div>
                    <Link href={getOrderLink(order.id)}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => onOrderClick?.(order.id)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Track
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show more link if there are more orders */}
          {activeOrders.length > maxOrders && (
            <Link href={userRole === "customer" ? "/customer-orders" : `/${userRole}-dashboard/orders`}>
              <Button variant="ghost" className="w-full" size="sm">
                View all {activeOrders.length} active orders
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
