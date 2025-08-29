import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MapPin, Navigation, Clock, Phone, MessageCircle,
  Store, Home, Package, Bike, User, CheckCircle,
  AlertCircle, Activity, Route, Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Location {
  lat: number;
  lng: number;
  address?: string;
  timestamp?: string;
}

interface DeliveryTrackingData {
  orderId: string;
  orderNumber: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "in_transit" | "delivered";
  estimatedTime: number;
  distance: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    location: Location;
  };
  restaurant: {
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
  timeline: Array<{
    status: string;
    timestamp: string;
    message: string;
  }>;
}

interface DeliveryLiveTrackingProps {
  orderId: string;
  userRole: "customer" | "merchant" | "rider" | "admin";
  onLocationUpdate?: (location: Location) => void;
}

export default function DeliveryLiveTracking({ 
  orderId, 
  userRole,
  onLocationUpdate 
}: DeliveryLiveTrackingProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [trackingData, setTrackingData] = useState<DeliveryTrackingData | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mapView, setMapView] = useState<"2d" | "3d">("2d");
  const watchIdRef = useRef<number | null>(null);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        // Subscribe to order tracking
        wsRef.current?.send(JSON.stringify({
          type: "subscribe_tracking",
          orderId,
          role: userRole
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "location_update" && data.orderId === orderId) {
          setRiderLocation(data.location);
          if (onLocationUpdate) {
            onLocationUpdate(data.location);
          }
        } else if (data.type === "order_update" && data.orderId === orderId) {
          setTrackingData(data.trackingData);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [orderId, userRole, onLocationUpdate]);

  // Share rider location if user is a rider
  useEffect(() => {
    if (userRole === "rider" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
          };
          
          // Send location to server
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: "rider_location",
              orderId,
              location
            }));
          }
        },
        (error) => {
          console.error("Location error:", error);
        },
        { 
          enableHighAccuracy: true, 
          timeout: 5000, 
          maximumAge: 0 
        }
      );
    }
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [userRole, orderId]);

  // Simulate tracking data for demo
  useEffect(() => {
    if (!trackingData) {
      setTrackingData({
        orderId,
        orderNumber: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
        status: "in_transit",
        estimatedTime: 25,
        distance: 5.2,
        customer: {
          name: "Juan Dela Cruz",
          phone: "09171234567",
          address: "123 Main St, Batangas City",
          location: { lat: 13.7565, lng: 121.0583 }
        },
        restaurant: {
          name: "Lomi King",
          phone: "09181234567",
          address: "456 Restaurant Row, Batangas",
          location: { lat: 13.7600, lng: 121.0600 }
        },
        rider: {
          id: "rider-1",
          name: "Pedro Garcia",
          phone: "09191234567",
          vehicleType: "Motorcycle",
          rating: 4.8,
          location: { lat: 13.7580, lng: 121.0590 }
        },
        timeline: [
          { status: "confirmed", timestamp: "12:00 PM", message: "Order confirmed by restaurant" },
          { status: "preparing", timestamp: "12:05 PM", message: "Restaurant is preparing your order" },
          { status: "picked_up", timestamp: "12:20 PM", message: "Rider picked up your order" },
          { status: "in_transit", timestamp: "12:25 PM", message: "Order is on the way" }
        ]
      });
    }
  }, [orderId, trackingData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-500";
      case "confirmed": return "bg-blue-500";
      case "preparing": return "bg-yellow-500";
      case "ready": return "bg-orange-500";
      case "picked_up": return "bg-purple-500";
      case "in_transit": return "bg-indigo-500";
      case "delivered": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getProgressValue = () => {
    if (!trackingData) return 0;
    const statusValues: Record<string, number> = {
      pending: 10,
      confirmed: 20,
      preparing: 35,
      ready: 50,
      picked_up: 65,
      in_transit: 85,
      delivered: 100
    };
    return statusValues[trackingData.status] || 0;
  };

  const renderMap = () => {
    const riderLoc = riderLocation || trackingData?.rider?.location;
    
    return (
      <div ref={mapRef} className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
        {/* Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50">
          {/* Grid Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          
          {/* Restaurant Marker */}
          {trackingData && (
            <div 
              className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "30%", top: "40%" }}
            >
              <div className="relative">
                <div className="bg-orange-500 rounded-full p-3 shadow-lg">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium bg-white px-2 py-1 rounded shadow">
                    {trackingData.restaurant.name}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Customer Marker */}
          {trackingData && (
            <div 
              className="absolute z-10 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: "70%", top: "60%" }}
            >
              <div className="relative">
                <div className="bg-green-500 rounded-full p-3 shadow-lg">
                  <Home className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-medium bg-white px-2 py-1 rounded shadow">
                    Customer
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Rider Marker */}
          {riderLoc && (
            <div 
              className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
              style={{ 
                left: `${45 + (riderLoc.lng - 121.0583) * 1000}%`, 
                top: `${50 + (riderLoc.lat - 13.7565) * 1000}%`,
                transition: "all 1s ease-out"
              }}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-blue-600 rounded-full p-3 shadow-lg">
                  <Bike className="h-6 w-6 text-white" />
                </div>
                {trackingData?.rider && (
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-medium bg-white px-2 py-1 rounded shadow">
                      {trackingData.rider.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Route Path */}
          {trackingData && riderLoc && (
            <svg className="absolute inset-0 z-0">
              <path
                d="M 30% 40% Q 45% 45% 50% 50% T 70% 60%"
                stroke="#FF6B35"
                strokeWidth="3"
                strokeDasharray="5,5"
                fill="none"
                className="animate-pulse"
              />
            </svg>
          )}
        </div>
        
        {/* Connection Status */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center gap-1">
            <Activity className={`h-3 w-3 ${isConnected ? "animate-pulse" : ""}`} />
            {isConnected ? "Live" : "Connecting..."}
          </Badge>
          {userRole === "rider" && (
            <Badge className="bg-blue-500 text-white">
              <Navigation className="h-3 w-3 mr-1" />
              GPS Active
            </Badge>
          )}
        </div>
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button 
            size="sm" 
            variant={mapView === "2d" ? "default" : "outline"}
            onClick={() => setMapView("2d")}
          >
            2D
          </Button>
          <Button 
            size="sm" 
            variant={mapView === "3d" ? "default" : "outline"}
            onClick={() => setMapView("3d")}
          >
            3D
          </Button>
        </div>
      </div>
    );
  };

  if (!trackingData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading tracking information...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <span className="font-medium">Real-time tracking active</span> - 
          All parties can see live delivery updates
        </AlertDescription>
      </Alert>

      {/* Main Tracking Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Order #{trackingData.orderNumber}
                <Badge className={getStatusColor(trackingData.status)}>
                  {trackingData.status.replace("_", " ").toUpperCase()}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                ETA: {trackingData.estimatedTime} minutes • {trackingData.distance} km
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Secured Tracking</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Delivery Progress</span>
              <span className="font-medium">{getProgressValue()}%</span>
            </div>
            <Progress value={getProgressValue()} className="h-2" />
          </div>

          {/* Map View */}
          <div className="h-[400px] rounded-lg overflow-hidden border">
            {renderMap()}
          </div>

          {/* Delivery Details Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Restaurant Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-orange-100 rounded-full p-2">
                    <Store className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{trackingData.restaurant.name}</p>
                    <p className="text-sm text-gray-600">{trackingData.restaurant.address}</p>
                    {userRole !== "merchant" && (
                      <Button size="sm" variant="outline" className="mt-2">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rider Info */}
            {trackingData.rider && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={trackingData.rider.photo} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        <Bike className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{trackingData.rider.name}</p>
                      <p className="text-sm text-gray-600">
                        {trackingData.rider.vehicleType} • ⭐ {trackingData.rider.rating}
                      </p>
                      {userRole !== "rider" && (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Customer Info */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 rounded-full p-2">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{trackingData.customer.name}</p>
                    <p className="text-sm text-gray-600">{trackingData.customer.address}</p>
                    {(userRole === "rider" || userRole === "admin") && (
                      <Button size="sm" variant="outline" className="mt-2">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Delivery Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trackingData.timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="text-xs text-gray-500">{event.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}