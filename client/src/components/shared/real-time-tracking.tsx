import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MapPin, Navigation, Clock, Phone, MessageCircle,
  Store, Home, Package, Bike, User, CheckCircle,
  AlertCircle, Activity, Route, Shield, RefreshCw,
  Truck, ChefHat, Timer, ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Lazy load the Google Maps tracking component
const GoogleMapsTracking = lazy(() => import("./google-maps-tracking"));

interface Location {
  lat: number;
  lng: number;
  address?: string;
  timestamp?: string;
}

interface TrackingEvent {
  id: string;
  eventType: string;
  timestamp: string;
  location?: Location;
  notes?: string;
}

interface OrderTracking {
  orderId: string;
  orderNumber: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  estimatedTime: number;
  actualDeliveryTime?: string;
  distance: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    location: Location;
  };
  restaurant: {
    id: string;
    name: string;
    phone: string;
    address: string;
    location: Location;
  };
  rider?: {
    id: string;
    name: string;
    phone: string;
    vehicleType: string;
    rating: number;
    location?: Location;
    photo?: string;
  };
  timeline: TrackingEvent[];
  currentLocation?: Location;
  estimatedArrival?: string;
}

interface RealTimeTrackingProps {
  orderId: string;
  userRole?: "customer" | "vendor" | "rider" | "admin";
  onStatusUpdate?: (status: string) => void;
  showMap?: boolean;
  compact?: boolean;
}

// Status configurations with colors and icons
const statusConfig = {
  pending: { 
    label: "Order Placed", 
    color: "bg-gray-500", 
    icon: Clock, 
    progress: 10,
    description: "Your order has been placed and is waiting for confirmation."
  },
  confirmed: { 
    label: "Order Confirmed", 
    color: "bg-blue-500", 
    icon: CheckCircle, 
    progress: 25,
    description: "Restaurant has confirmed your order and started preparation."
  },
  preparing: { 
    label: "Preparing Food", 
    color: "bg-yellow-500", 
    icon: ChefHat, 
    progress: 40,
    description: "Your delicious meal is being prepared by the kitchen."
  },
  ready: { 
    label: "Ready for Pickup", 
    color: "bg-orange-500", 
    icon: Package, 
    progress: 60,
    description: "Your order is ready and waiting for rider pickup."
  },
  picked_up: { 
    label: "Picked Up", 
    color: "bg-purple-500", 
    icon: Bike, 
    progress: 75,
    description: "Rider has picked up your order and is on the way."
  },
  in_transit: { 
    label: "On the Way", 
    color: "bg-indigo-500", 
    icon: Truck, 
    progress: 90,
    description: "Your order is on the way to your location."
  },
  delivered: { 
    label: "Delivered", 
    color: "bg-green-500", 
    icon: CheckCircle, 
    progress: 100,
    description: "Your order has been successfully delivered. Enjoy!"
  },
  cancelled: { 
    label: "Cancelled", 
    color: "bg-red-500", 
    icon: AlertCircle, 
    progress: 0,
    description: "This order has been cancelled."
  }
};

export default function RealTimeTracking({ 
  orderId, 
  userRole = "customer",
  onStatusUpdate,
  showMap = true,
  compact = false 
}: RealTimeTrackingProps) {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [notifications, setNotifications] = useState<string[]>([]);
  
  // Fetch initial tracking data
  const { data: initialData, isLoading, refetch } = useQuery<OrderTracking>({
    queryKey: [`/api/orders/${orderId}/tracking`],
    enabled: !!orderId,
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!orderId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        // Send JWT token for authentication first  
        const token = localStorage.getItem('token') || '';
        if (token) {
          wsRef.current?.send(JSON.stringify({
            type: "auth",
            token: token
          }));
        }

        // Subscribe to order tracking updates
        wsRef.current?.send(JSON.stringify({
          type: "subscribe_order_tracking",
          orderId,
          userRole
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "order_status_update" && data.orderId === orderId) {
          setTrackingData(data.trackingData);
          setLastUpdate(new Date());
          
          if (onStatusUpdate) {
            onStatusUpdate(data.trackingData.status);
          }
          
          // Show notification for status changes
          if (data.trackingData.status && data.previousStatus !== data.trackingData.status) {
            const statusInfo = statusConfig[data.trackingData.status as keyof typeof statusConfig];
            toast({
              title: "Order Update",
              description: statusInfo?.description || "Your order status has been updated.",
              duration: 5000,
            });
          }
        } else if (data.type === "rider_location_update" && data.orderId === orderId) {
          setRiderLocation(data.location);
          setLastUpdate(new Date());
        } else if (data.type === "tracking_event" && data.orderId === orderId) {
          // Add new tracking event to timeline
          if (trackingData) {
            setTrackingData(prev => prev ? {
              ...prev,
              timeline: [data.event, ...prev.timeline]
            } : null);
          }
        } else if (data.type === "eta_update" && data.orderId === orderId) {
          setTrackingData(prev => prev ? {
            ...prev,
            estimatedArrival: data.estimatedArrival,
            estimatedTime: data.estimatedTime
          } : null);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            // Recursive call to reconnect
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            try {
              wsRef.current = new WebSocket(wsUrl);
              wsRef.current.onopen = () => {
                setIsConnected(true);
                
                // Re-authenticate with JWT token
                const token = localStorage.getItem('token') || '';
                if (token) {
                  wsRef.current?.send(JSON.stringify({
                    type: "auth", 
                    token: token
                  }));
                }
                
                wsRef.current?.send(JSON.stringify({
                  type: "subscribe_order_tracking",
                  orderId,
                  userRole
                }));
              };
              // Re-attach all event handlers
              wsRef.current.onmessage = wsRef.current.onmessage;
              wsRef.current.onerror = wsRef.current.onerror;
              wsRef.current.onclose = wsRef.current.onclose;
            } catch (error) {
              console.error("WebSocket reconnection failed:", error);
            }
          }
        }, 3000);
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      setIsConnected(false);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [orderId, userRole, onStatusUpdate, trackingData]);

  // Initialize with fetched data
  useEffect(() => {
    if (initialData) {
      setTrackingData(initialData);
      if (initialData.rider?.location) {
        setRiderLocation(initialData.rider.location);
      }
    }
  }, [initialData]);

  // Mutation to refresh tracking data
  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("GET", `/api/orders/${orderId}/tracking`),
    onSuccess: (data) => {
      setTrackingData(data);
      setLastUpdate(new Date());
      toast({
        title: "Tracking Refreshed",
        description: "Latest tracking information has been loaded.",
      });
    },
    onError: () => {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh tracking information. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <Card className="w-full" data-testid="realtime-tracking-loading">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!trackingData) {
    return (
      <Card className="w-full" data-testid="realtime-tracking-error">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Unable to Load Tracking
          </h3>
          <p className="text-muted-foreground mb-4">
            We couldn't load the tracking information for this order.
          </p>
          <Button 
            onClick={() => refetch()} 
            variant="outline"
            data-testid="retry-tracking-button"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = statusConfig[trackingData.status];
  const timeRemaining = trackingData.estimatedArrival ? 
    Math.max(0, Math.ceil((new Date(trackingData.estimatedArrival).getTime() - Date.now()) / (1000 * 60))) : null;

  return (
    <div className="space-y-6" data-testid="realtime-tracking-container">
      {/* Connection Status */}
      <Alert className={`border-l-4 ${isConnected ? 'border-l-green-500 bg-green-50 dark:bg-green-950' : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'}`}>
        <Activity className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-yellow-600'}`} />
        <AlertDescription className="flex items-center justify-between">
          <span className={isConnected ? 'text-green-800 dark:text-green-200' : 'text-yellow-800 dark:text-yellow-200'}>
            {isConnected ? 'Live tracking active' : 'Connecting to live tracking...'}
          </span>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refreshMutation.mutate()}
              disabled={refreshMutation.isPending}
              data-testid="manual-refresh-button"
            >
              <RefreshCw className={`h-3 w-3 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </AlertDescription>
      </Alert>

      {/* Order Status Header */}
      <Card data-testid="order-status-header">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${currentStatus.color} text-white`}>
                  <currentStatus.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {currentStatus.label}
                  </div>
                  <div className="text-sm text-muted-foreground font-normal">
                    Order #{trackingData.orderNumber}
                  </div>
                </div>
              </CardTitle>
            </div>
            <div className="text-right">
              {timeRemaining !== null && trackingData.status !== 'delivered' && (
                <div className="text-lg font-bold text-primary" data-testid="estimated-time">
                  {timeRemaining} min
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {timeRemaining !== null && trackingData.status !== 'delivered' ? 'Estimated time' : 'Status'}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Order Progress</span>
                <span>{currentStatus.progress}%</span>
              </div>
              <Progress value={currentStatus.progress} className="h-2" data-testid="order-progress" />
            </div>
            <p className="text-muted-foreground text-sm">
              {currentStatus.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Maps Integration */}
      {showMap && (trackingData.status === 'picked_up' || trackingData.status === 'in_transit') && (
        <Card data-testid="delivery-map">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Live Delivery Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-96 w-full rounded-lg" />}>
              <GoogleMapsTracking
                orderId={orderId}
                userRole={userRole}
                onLocationUpdate={(location) => setRiderLocation(location)}
              />
            </Suspense>
          </CardContent>
        </Card>
      )}

      {/* Rider Information */}
      {trackingData.rider && (trackingData.status === 'picked_up' || trackingData.status === 'in_transit') && (
        <Card data-testid="rider-information">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bike className="h-5 w-5" />
              <span>Your Rider</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={trackingData.rider.photo} alt={trackingData.rider.name} />
                  <AvatarFallback>
                    {trackingData.rider.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{trackingData.rider.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {trackingData.rider.vehicleType} • ⭐ {trackingData.rider.rating.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" data-testid="call-rider-button">
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
                <Button variant="outline" size="sm" data-testid="message-rider-button">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Timeline */}
      <Card data-testid="delivery-timeline">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Route className="h-5 w-5" />
            <span>Delivery Timeline</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trackingData.timeline.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Timeline will appear here as your order progresses</p>
              </div>
            ) : (
              trackingData.timeline.map((event, index) => {
                const isFirst = index === 0;
                const eventStatus = statusConfig[event.eventType as keyof typeof statusConfig];
                
                return (
                  <div key={event.id} className="flex items-start space-x-4" data-testid={`timeline-event-${index}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${eventStatus?.color || 'bg-gray-400'} ${isFirst ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                      {eventStatus?.icon && <eventStatus.icon className="h-4 w-4 text-white" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {eventStatus?.label || event.eventType}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      {event.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {event.notes}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.location.address || `${event.location.lat.toFixed(4)}, ${event.location.lng.toFixed(4)}`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Restaurant and Customer Details */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Restaurant Info */}
        <Card data-testid="restaurant-info">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Store className="h-5 w-5" />
              <span>Restaurant</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="font-semibold">{trackingData.restaurant.name}</div>
                <div className="text-sm text-muted-foreground">
                  {trackingData.restaurant.address}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" data-testid="call-restaurant-button">
                <Phone className="h-4 w-4 mr-2" />
                Call Restaurant
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address */}
        <Card data-testid="delivery-info">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span>Delivery Address</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="font-semibold">{trackingData.customer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {trackingData.customer.address}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Distance: {trackingData.distance.toFixed(1)} km</span>
                {trackingData.estimatedTime && (
                  <span>Est: {trackingData.estimatedTime} min</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}