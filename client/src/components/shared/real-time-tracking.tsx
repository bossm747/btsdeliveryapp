import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Truck, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrackingInfo {
  orderId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  vehicleType: string;
  plateNumber: string;
  currentStatus: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  estimatedArrival: string;
  restaurantLocation: {
    lat: number;
    lng: number;
    name: string;
    address: string;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  distanceToCustomer: number; // in km
}

interface DeliveryUpdate {
  type: string;
  data: {
    orderId: string;
    currentLocation: {
      lat: number;
      lng: number;
    };
    currentStatus: string;
    estimatedArrival: string;
  };
}

interface RealTimeTrackingProps {
  orderId: string;
}

export default function RealTimeTracking({ orderId }: RealTimeTrackingProps) {
  const [liveUpdates, setLiveUpdates] = useState<DeliveryUpdate | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch initial tracking data
  const { data: tracking, isLoading, error } = useQuery<TrackingInfo>({
    queryKey: [`/api/deliveries/${orderId}/tracking`],
    refetchInterval: 10000, // Fallback refresh every 10 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Tracking WebSocket connected");
      setWsConnected(true);
      
      // Subscribe to delivery updates for this order
      socket.send(JSON.stringify({
        type: "subscribe",
        event: "delivery_update",
        orderId: orderId
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "delivery_update" && message.data.orderId === orderId) {
          setLiveUpdates(message);
        }
      } catch (error) {
        console.error("Error parsing tracking WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("Tracking WebSocket error:", error);
      setWsConnected(false);
    };

    socket.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [orderId]);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Rider assigned';
      case 'heading_to_restaurant': return 'Papunta sa restaurant';
      case 'at_restaurant': return 'Nasa restaurant na';
      case 'order_picked_up': return 'Nakuha na ang order';
      case 'heading_to_customer': return 'Papunta na sa iyo';
      case 'nearby': return 'Malapit na!';
      case 'delivered': return 'Delivered na!';
      default: return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'assigned': return 'secondary';
      case 'heading_to_restaurant': return 'default';
      case 'at_restaurant': return 'outline';
      case 'order_picked_up': return 'default';
      case 'heading_to_customer': return 'destructive';
      case 'nearby': return 'destructive';
      case 'delivered': return 'default';
      default: return 'secondary';
    }
  };

  const formatETA = (estimatedArrival: string) => {
    const eta = new Date(estimatedArrival);
    const now = new Date();
    const diff = eta.getTime() - now.getTime();
    const minutes = Math.round(diff / 60000);
    
    if (minutes <= 0) return "Anytime now!";
    if (minutes === 1) return "1 minute na lang";
    if (minutes < 60) return `${minutes} minutes na lang`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m na lang`;
  };

  const currentData = liveUpdates?.data || tracking;

  if (isLoading) {
    return (
      <Card data-testid="tracking-loading">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !currentData) {
    return (
      <Card data-testid="tracking-error">
        <CardContent className="text-center py-8">
          <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Hindi makita ang tracking info
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Subukan mo ulit mamaya o contact mo ang customer service
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="real-time-tracking">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {wsConnected ? 'Live tracking active' : 'Reconnecting...'}
          </span>
        </div>
        {liveUpdates && (
          <Badge variant="outline" className="text-xs" data-testid="live-update-badge">
            Live updated
          </Badge>
        )}
      </div>

      {/* Main Tracking Card */}
      <Card data-testid="tracking-main-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg" data-testid="tracking-title">
              Order #{orderId.slice(0, 8)}
            </CardTitle>
            <Badge 
              variant={getStatusBadgeVariant(currentData.currentStatus)} 
              data-testid="tracking-status-badge"
            >
              {getStatusText(currentData.currentStatus)}
            </Badge>
          </div>
          <CardDescription data-testid="tracking-description">
            Real-time tracking ng inyong order
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ETA Info */}
          <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100" data-testid="eta-time">
                  {currentData.estimatedArrival ? formatETA(currentData.estimatedArrival) : 'Calculating...'}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Estimated delivery time
                </p>
              </div>
            </div>
          </div>

          {/* Rider Info */}
          {tracking && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium" data-testid="rider-info-title">Your Rider</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" data-testid="call-rider-btn">
                    <Phone className="h-4 w-4 mr-1" />
                    Tawagan
                  </Button>
                  <Button size="sm" variant="outline" data-testid="message-rider-btn">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium" data-testid="rider-name">
                    {tracking.riderName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Vehicle:</span>
                  <span className="text-sm" data-testid="rider-vehicle">
                    {tracking.vehicleType} • {tracking.plateNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Distance:</span>
                  <span className="text-sm font-medium" data-testid="rider-distance">
                    {tracking.distanceToCustomer?.toFixed(1)} km away
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Location Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-green-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-sm text-green-700 dark:text-green-300" data-testid="pickup-location">
                  Pickup: {tracking?.restaurantLocation.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {tracking?.restaurantLocation.address}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-red-600 mt-1" />
              <div className="flex-1">
                <p className="font-medium text-sm text-red-700 dark:text-red-300" data-testid="delivery-location">
                  Delivery Address
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {tracking?.deliveryLocation.address}
                </p>
              </div>
            </div>
          </div>

          {/* Live Location Updates */}
          {liveUpdates && (
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Live Location Update
                </span>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300" data-testid="live-location-info">
                Lat: {liveUpdates.data.currentLocation.lat.toFixed(6)}, 
                Lng: {liveUpdates.data.currentLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map Placeholder */}
      <Card data-testid="map-placeholder">
        <CardContent className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Interactive map coming soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}