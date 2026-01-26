import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Navigation, Clock, Phone, Bike, Package,
  ChefHat, CheckCircle, AlertCircle, Truck, RefreshCw,
  Activity, Maximize2, Minimize2, Store, Home, User
} from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

interface Location {
  lat: number;
  lng: number;
}

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
    location?: Location;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    location?: Location;
  };
  rider?: {
    id: string;
    name: string;
    phone?: string;
    vehicleType?: string;
    rating?: number;
    location?: Location;
  };
  deliveryAddress?: string | {
    street?: string;
    barangay?: string;
    city?: string;
    coordinates?: Location;
  };
}

interface LiveTrackingMapProps {
  userRole: "customer" | "vendor" | "rider" | "admin";
  apiEndpoint: string;
  title?: string;
  showList?: boolean;
  height?: string;
  selectedOrderId?: string;
  onOrderSelect?: (orderId: string) => void;
}

// Status configurations
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: "Pending", color: "#6B7280", bgColor: "#F3F4F6", icon: Clock },
  awaiting_rider: { label: "Finding Rider", color: "#F97316", bgColor: "#FFF7ED", icon: Bike },
  confirmed: { label: "Confirmed", color: "#3B82F6", bgColor: "#EFF6FF", icon: CheckCircle },
  preparing: { label: "Preparing", color: "#EAB308", bgColor: "#FEFCE8", icon: ChefHat },
  ready: { label: "Ready", color: "#F97316", bgColor: "#FFF7ED", icon: Package },
  picked_up: { label: "Picked Up", color: "#8B5CF6", bgColor: "#F5F3FF", icon: Bike },
  in_transit: { label: "On the Way", color: "#6366F1", bgColor: "#EEF2FF", icon: Truck },
  en_route_delivery: { label: "En Route", color: "#6366F1", bgColor: "#EEF2FF", icon: Truck },
  at_customer: { label: "Arriving", color: "#22C55E", bgColor: "#F0FDF4", icon: MapPin },
  delivered: { label: "Delivered", color: "#22C55E", bgColor: "#F0FDF4", icon: CheckCircle },
  completed: { label: "Completed", color: "#22C55E", bgColor: "#F0FDF4", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "#EF4444", bgColor: "#FEF2F2", icon: AlertCircle },
};

// Default center (Batangas City)
const DEFAULT_CENTER = { lat: 13.7565, lng: 121.0583 };

export default function LiveTrackingMap({
  userRole,
  apiEndpoint,
  title = "Live Tracking Map",
  showList = true,
  height = "500px",
  selectedOrderId,
  onOrderSelect,
}: LiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [riderLocations, setRiderLocations] = useState<Map<string, Location>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch orders
  const { data: orders = [], isLoading, refetch } = useQuery<LiveOrder[]>({
    queryKey: [apiEndpoint],
    refetchInterval: 10000,
  });

  // Filter active orders
  const activeOrders = orders.filter(
    (order) => !["delivered", "cancelled", "completed"].includes(order.status.toLowerCase())
  );

  // WebSocket for real-time rider location updates
  const { status: wsStatus, subscribeToOrder } = useWebSocket({
    autoConnect: true,
    autoAuth: true,
    onRiderLocationUpdate: (update) => {
      setRiderLocations(prev => {
        const newMap = new Map(prev);
        newMap.set(update.riderId, { lat: update.lat, lng: update.lng });
        return newMap;
      });
      setLastUpdate(new Date());
      updateRiderMarker(update.riderId, { lat: update.lat, lng: update.lng });
    },
    onOrderStatusUpdate: () => {
      setLastUpdate(new Date());
      refetch();
    },
  });

  // Subscribe to active orders
  useEffect(() => {
    activeOrders.forEach((order) => {
      subscribeToOrder(order.id);
    });
  }, [activeOrders.length]);

  // Load Google Maps
  useEffect(() => {
    if (typeof window !== "undefined" && !window.google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setIsMapLoaded(true);
      document.head.appendChild(script);
    } else if (window.google) {
      setIsMapLoaded(true);
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || googleMapRef.current) return;

    googleMapRef.current = new google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
  }, [isMapLoaded]);

  // Update markers when orders change
  useEffect(() => {
    if (!googleMapRef.current || !isMapLoaded) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const bounds = new google.maps.LatLngBounds();
    let hasValidLocation = false;

    activeOrders.forEach((order) => {
      // Restaurant marker
      const restaurantLocation = order.restaurant?.location;
      if (restaurantLocation?.lat && restaurantLocation?.lng) {
        const restaurantMarker = createMarker(
          restaurantLocation,
          "restaurant",
          order.restaurant?.name || "Restaurant",
          order.id
        );
        markersRef.current.set(`restaurant-${order.id}`, restaurantMarker);
        bounds.extend(new google.maps.LatLng(restaurantLocation.lat, restaurantLocation.lng));
        hasValidLocation = true;
      }

      // Customer marker
      const customerLocation = getCustomerLocation(order);
      if (customerLocation?.lat && customerLocation?.lng) {
        const customerMarker = createMarker(
          customerLocation,
          "customer",
          order.customer?.name || "Customer",
          order.id
        );
        markersRef.current.set(`customer-${order.id}`, customerMarker);
        bounds.extend(new google.maps.LatLng(customerLocation.lat, customerLocation.lng));
        hasValidLocation = true;
      }

      // Rider marker (use real-time location if available)
      const riderLocation = riderLocations.get(order.rider?.id || "") || order.rider?.location;
      if (riderLocation?.lat && riderLocation?.lng && order.rider) {
        const riderMarker = createMarker(
          riderLocation,
          "rider",
          order.rider.name || "Rider",
          order.id,
          true // animated
        );
        markersRef.current.set(`rider-${order.rider.id}`, riderMarker);
        bounds.extend(new google.maps.LatLng(riderLocation.lat, riderLocation.lng));
        hasValidLocation = true;
      }
    });

    // Draw route for selected order
    if (selectedOrderId) {
      const selectedOrder = activeOrders.find(o => o.id === selectedOrderId);
      if (selectedOrder) {
        drawRoute(selectedOrder);
      }
    }

    // Fit bounds if we have locations
    if (hasValidLocation && activeOrders.length > 0) {
      googleMapRef.current?.fitBounds(bounds, 50);
    }
  }, [activeOrders, isMapLoaded, riderLocations, selectedOrderId]);

  // Helper to get customer location from various formats
  const getCustomerLocation = (order: LiveOrder): Location | null => {
    if (order.customer?.location) return order.customer.location;
    if (typeof order.deliveryAddress === 'object' && order.deliveryAddress?.coordinates) {
      return order.deliveryAddress.coordinates;
    }
    return null;
  };

  // Create custom marker
  const createMarker = (
    location: Location,
    type: "restaurant" | "customer" | "rider",
    title: string,
    orderId: string,
    animated = false
  ): google.maps.Marker => {
    const iconConfig = {
      restaurant: { color: "#F97316", icon: "🏪" },
      customer: { color: "#22C55E", icon: "📍" },
      rider: { color: "#3B82F6", icon: "🏍️" },
    };

    const config = iconConfig[type];

    const marker = new google.maps.Marker({
      position: location,
      map: googleMapRef.current!,
      title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: config.color,
        fillOpacity: 1,
        strokeColor: "#FFFFFF",
        strokeWeight: 3,
        scale: type === "rider" ? 12 : 10,
      },
      animation: animated ? google.maps.Animation.DROP : undefined,
      zIndex: type === "rider" ? 100 : 50,
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="padding: 8px; min-width: 120px;">
          <div style="font-weight: bold; margin-bottom: 4px;">${config.icon} ${title}</div>
          <div style="font-size: 12px; color: #666;">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
        </div>
      `,
    });

    marker.addListener("click", () => {
      infoWindow.open(googleMapRef.current!, marker);
      onOrderSelect?.(orderId);
    });

    return marker;
  };

  // Update rider marker position (for smooth animation)
  const updateRiderMarker = useCallback((riderId: string, location: Location) => {
    const marker = markersRef.current.get(`rider-${riderId}`);
    if (marker && googleMapRef.current) {
      // Smooth animation to new position
      const startPos = marker.getPosition();
      if (startPos) {
        const startLat = startPos.lat();
        const startLng = startPos.lng();
        const frames = 30;
        let frame = 0;

        const animate = () => {
          frame++;
          const progress = frame / frames;
          const lat = startLat + (location.lat - startLat) * progress;
          const lng = startLng + (location.lng - startLng) * progress;
          marker.setPosition({ lat, lng });

          if (frame < frames) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      } else {
        marker.setPosition(location);
      }
    }
  }, []);

  // Draw route between restaurant, rider, and customer
  const drawRoute = useCallback((order: LiveOrder) => {
    if (!googleMapRef.current) return;

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const restaurantLocation = order.restaurant?.location;
    const riderLocation = riderLocations.get(order.rider?.id || "") || order.rider?.location;
    const customerLocation = getCustomerLocation(order);

    const path: Location[] = [];
    if (restaurantLocation) path.push(restaurantLocation);
    if (riderLocation) path.push(riderLocation);
    if (customerLocation) path.push(customerLocation);

    if (path.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#3B82F6",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        icons: [{
          icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3 },
          offset: "50%",
        }],
      });
      polylineRef.current.setMap(googleMapRef.current);
    }
  }, [riderLocations]);

  // Get time elapsed
  const getTimeElapsed = (createdAt: string) => {
    const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : ''}`} data-testid="live-tracking-map">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${wsStatus === 'authenticated' ? 'text-green-500' : 'text-yellow-500'}`} />
            {title}
            <Badge variant="secondary" className="ml-2">
              {activeOrders.length} active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-8 w-8 p-0">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`flex ${showList ? 'flex-col lg:flex-row' : ''}`}>
          {/* Map */}
          <div
            ref={mapRef}
            className={`${showList ? 'lg:flex-1' : 'w-full'} bg-gray-100`}
            style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}
          >
            {!isMapLoaded && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Navigation className="h-8 w-8 animate-pulse mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          {/* Order List */}
          {showList && (
            <div className={`${isFullscreen ? 'lg:w-96' : 'lg:w-80'} border-t lg:border-t-0 lg:border-l max-h-[${height}] overflow-y-auto`}>
              <div className="p-3 border-b bg-gray-50 dark:bg-slate-800">
                <h3 className="font-semibold text-sm">Active Orders ({activeOrders.length})</h3>
              </div>
              <div className="divide-y">
                {activeOrders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const isSelected = selectedOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500' : ''}`}
                      onClick={() => {
                        onOrderSelect?.(order.id);
                        // Center map on this order
                        const riderLocation = riderLocations.get(order.rider?.id || "") || order.rider?.location;
                        if (riderLocation && googleMapRef.current) {
                          googleMapRef.current.panTo(riderLocation);
                          googleMapRef.current.setZoom(15);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              #{order.orderNumber || order.id.slice(-6)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs px-1.5 py-0"
                              style={{ color: status.color, borderColor: status.color }}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Store className="h-3 w-3 text-orange-500" />
                              <span className="truncate">{order.restaurant?.name || "Restaurant"}</span>
                            </div>
                            {order.rider && (
                              <div className="flex items-center gap-1">
                                <Bike className="h-3 w-3 text-blue-500" />
                                <span>{order.rider.name}</span>
                                {riderLocations.has(order.rider.id) && (
                                  <span className="text-green-500 text-[10px]">● LIVE</span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Home className="h-3 w-3 text-green-500" />
                              <span className="truncate">{order.customer?.name || "Customer"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-sm text-green-600">
                            ₱{parseFloat(order.totalAmount).toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getTimeElapsed(order.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {activeOrders.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No active orders</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3 border-t bg-gray-50 dark:bg-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Restaurant</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Rider</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Customer</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-green-500">●</span>
            <span>Live GPS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
