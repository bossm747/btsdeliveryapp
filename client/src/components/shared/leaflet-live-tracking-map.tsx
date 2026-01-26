/**
 * Leaflet Live Tracking Map Component (Admin View)
 *
 * Replaces LiveTrackingMap component with Leaflet + OpenRouteService.
 * Features:
 * - Multiple order tracking on single map
 * - Order list sidebar with selection
 * - Real-time WebSocket updates for all riders
 * - Color-coded markers by status
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  Bike,
  Package,
  ChefHat,
  CheckCircle,
  AlertCircle,
  Truck,
  RefreshCw,
  Activity,
  Maximize2,
  Minimize2,
  Store,
  Home,
  User,
} from "lucide-react";
import {
  markerIcons,
  decodePolyline,
  animateMarkerMovement,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  createTileLayer,
} from "@/lib/leaflet-utils";
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
  deliveryAddress?:
    | string
    | {
        street?: string;
        barangay?: string;
        city?: string;
        coordinates?: Location;
      };
}

interface LeafletLiveTrackingMapProps {
  userRole: "customer" | "vendor" | "rider" | "admin";
  apiEndpoint: string;
  title?: string;
  showList?: boolean;
  height?: string;
  selectedOrderId?: string;
  onOrderSelect?: (orderId: string) => void;
}

// Status configurations
const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: any }
> = {
  pending: { label: "Pending", color: "#6B7280", bgColor: "#F3F4F6", icon: Clock },
  awaiting_rider: {
    label: "Finding Rider",
    color: "#F97316",
    bgColor: "#FFF7ED",
    icon: Bike,
  },
  confirmed: {
    label: "Confirmed",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    icon: CheckCircle,
  },
  preparing: {
    label: "Preparing",
    color: "#EAB308",
    bgColor: "#FEFCE8",
    icon: ChefHat,
  },
  ready: { label: "Ready", color: "#F97316", bgColor: "#FFF7ED", icon: Package },
  picked_up: {
    label: "Picked Up",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    icon: Bike,
  },
  in_transit: {
    label: "On the Way",
    color: "#6366F1",
    bgColor: "#EEF2FF",
    icon: Truck,
  },
  en_route_delivery: {
    label: "En Route",
    color: "#6366F1",
    bgColor: "#EEF2FF",
    icon: Truck,
  },
  at_customer: {
    label: "Arriving",
    color: "#22C55E",
    bgColor: "#F0FDF4",
    icon: MapPin,
  },
  delivered: {
    label: "Delivered",
    color: "#22C55E",
    bgColor: "#F0FDF4",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    color: "#22C55E",
    bgColor: "#F0FDF4",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "#EF4444",
    bgColor: "#FEF2F2",
    icon: AlertCircle,
  },
};

export default function LeafletLiveTrackingMap({
  userRole,
  apiEndpoint,
  title = "Live Tracking Map",
  showList = true,
  height = "500px",
  selectedOrderId,
  onOrderSelect,
}: LeafletLiveTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const polylineRef = useRef<L.Polyline | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [riderLocations, setRiderLocations] = useState<Map<string, Location>>(
    new Map()
  );
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mapError, setMapError] = useState<string | null>(null);

  // Fetch orders
  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery<LiveOrder[]>({
    queryKey: [apiEndpoint],
    refetchInterval: 10000,
  });

  // Filter active orders
  const activeOrders = orders.filter(
    (order) =>
      !["delivered", "cancelled", "completed"].includes(order.status.toLowerCase())
  );

  // WebSocket for real-time rider location updates
  const { status: wsStatus, subscribeToOrder } = useWebSocket({
    autoConnect: true,
    autoAuth: true,
    onRiderLocationUpdate: (update) => {
      setRiderLocations((prev) => {
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
  }, [activeOrders.length, subscribeToOrder]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    try {
      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create map
      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: false,
      });

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapError(null);
    } catch (error) {
      console.error("Failed to initialize map:", error);
      setMapError("Failed to load map. Please refresh the page.");
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when orders change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const bounds = L.latLngBounds([]);
    let hasValidLocation = false;

    activeOrders.forEach((order) => {
      // Restaurant marker
      const restaurantLocation = order.restaurant?.location;
      if (restaurantLocation?.lat && restaurantLocation?.lng) {
        const marker = createMarker(
          restaurantLocation,
          "restaurant",
          order.restaurant?.name || "Restaurant",
          order.id,
          map
        );
        markersRef.current.set(`restaurant-${order.id}`, marker);
        bounds.extend([restaurantLocation.lat, restaurantLocation.lng]);
        hasValidLocation = true;
      }

      // Customer marker
      const customerLocation = getCustomerLocation(order);
      if (customerLocation?.lat && customerLocation?.lng) {
        const marker = createMarker(
          customerLocation,
          "customer",
          order.customer?.name || "Customer",
          order.id,
          map
        );
        markersRef.current.set(`customer-${order.id}`, marker);
        bounds.extend([customerLocation.lat, customerLocation.lng]);
        hasValidLocation = true;
      }

      // Rider marker (use real-time location if available)
      const riderLocation =
        riderLocations.get(order.rider?.id || "") || order.rider?.location;
      if (riderLocation?.lat && riderLocation?.lng && order.rider) {
        const marker = createMarker(
          riderLocation,
          "rider",
          order.rider.name || "Rider",
          order.id,
          map,
          true
        );
        markersRef.current.set(`rider-${order.rider.id}`, marker);
        bounds.extend([riderLocation.lat, riderLocation.lng]);
        hasValidLocation = true;
      }
    });

    // Draw route for selected order
    if (selectedOrderId) {
      const selectedOrder = activeOrders.find((o) => o.id === selectedOrderId);
      if (selectedOrder) {
        drawRoute(selectedOrder, map);
      }
    }

    // Fit bounds if we have locations
    if (hasValidLocation && activeOrders.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [activeOrders, riderLocations, selectedOrderId]);

  // Helper to get customer location from various formats
  const getCustomerLocation = (order: LiveOrder): Location | null => {
    if (order.customer?.location) return order.customer.location;
    if (
      typeof order.deliveryAddress === "object" &&
      order.deliveryAddress?.coordinates
    ) {
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
    map: L.Map,
    animated = false
  ): L.Marker => {
    const icon =
      type === "restaurant"
        ? markerIcons.restaurant
        : type === "rider"
        ? markerIcons.rider
        : markerIcons.customer;

    const marker = L.marker([location.lat, location.lng], {
      icon,
      title,
    }).addTo(map);

    // Add popup
    const iconEmoji =
      type === "restaurant" ? "🏪" : type === "rider" ? "🏍️" : "📍";
    marker.bindPopup(
      `<div style="padding: 4px; min-width: 100px;">
        <div style="font-weight: bold; margin-bottom: 4px;">${iconEmoji} ${title}</div>
        <div style="font-size: 12px; color: #666;">${
          type.charAt(0).toUpperCase() + type.slice(1)
        }</div>
      </div>`
    );

    marker.on("click", () => {
      onOrderSelect?.(orderId);
    });

    return marker;
  };

  // Update rider marker position (for smooth animation)
  const updateRiderMarker = useCallback((riderId: string, location: Location) => {
    const marker = markersRef.current.get(`rider-${riderId}`);
    if (marker && mapInstanceRef.current) {
      animateMarkerMovement(marker, L.latLng(location.lat, location.lng), 1000);
    }
  }, []);

  // Draw route between restaurant, rider, and customer
  const drawRoute = useCallback(
    (order: LiveOrder, map: L.Map) => {
      // Clear existing polyline
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      const restaurantLocation = order.restaurant?.location;
      const riderLocation =
        riderLocations.get(order.rider?.id || "") || order.rider?.location;
      const customerLocation = getCustomerLocation(order);

      const path: [number, number][] = [];
      if (restaurantLocation) {
        path.push([restaurantLocation.lat, restaurantLocation.lng]);
      }
      if (riderLocation) {
        path.push([riderLocation.lat, riderLocation.lng]);
      }
      if (customerLocation) {
        path.push([customerLocation.lat, customerLocation.lng]);
      }

      if (path.length >= 2) {
        polylineRef.current = L.polyline(path, {
          color: "#6366f1",
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 10",
        }).addTo(map);
      }
    },
    [riderLocations]
  );

  // Get time elapsed
  const getTimeElapsed = (createdAt: string) => {
    const minutes = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / 60000
    );
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

  if (mapError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center" style={{ height }}>
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-muted-foreground mb-4">{mapError}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`${isFullscreen ? "fixed inset-4 z-50" : ""}`}
      data-testid="live-tracking-map"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity
              className={`h-5 w-5 ${
                wsStatus === "authenticated" ? "text-green-500" : "text-yellow-500"
              }`}
            />
            {title}
            <Badge variant="secondary" className="ml-2">
              {activeOrders.length} active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {lastUpdate.toLocaleTimeString()}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className={`flex ${showList ? "flex-col lg:flex-row" : ""}`}>
          {/* Map */}
          <div
            ref={mapRef}
            className={`${showList ? "lg:flex-1" : "w-full"} bg-gray-100`}
            style={{
              height: isFullscreen ? "calc(100vh - 200px)" : height,
              minHeight: "400px",
            }}
          />

          {/* Order List */}
          {showList && (
            <div
              className={`${
                isFullscreen ? "lg:w-96" : "lg:w-80"
              } border-t lg:border-t-0 lg:border-l overflow-y-auto`}
              style={{ maxHeight: isFullscreen ? "calc(100vh - 200px)" : height }}
            >
              <div className="p-3 border-b bg-gray-50 dark:bg-slate-800">
                <h3 className="font-semibold text-sm">
                  Active Orders ({activeOrders.length})
                </h3>
              </div>
              <div className="divide-y">
                {activeOrders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  const isSelected = selectedOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500"
                          : ""
                      }`}
                      onClick={() => {
                        onOrderSelect?.(order.id);
                        // Center map on this order
                        const riderLocation =
                          riderLocations.get(order.rider?.id || "") ||
                          order.rider?.location;
                        if (riderLocation && mapInstanceRef.current) {
                          mapInstanceRef.current.panTo([
                            riderLocation.lat,
                            riderLocation.lng,
                          ]);
                          mapInstanceRef.current.setZoom(15);
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
                              style={{
                                color: status.color,
                                borderColor: status.color,
                              }}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>

                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Store className="h-3 w-3 text-orange-500" />
                              <span className="truncate">
                                {order.restaurant?.name || "Restaurant"}
                              </span>
                            </div>
                            {order.rider && (
                              <div className="flex items-center gap-1">
                                <Bike className="h-3 w-3 text-blue-500" />
                                <span>{order.rider.name}</span>
                                {riderLocations.has(order.rider.id) && (
                                  <span className="text-green-500 text-[10px]">
                                    ● LIVE
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Home className="h-3 w-3 text-green-500" />
                              <span className="truncate">
                                {order.customer?.name || "Customer"}
                              </span>
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
            <div className="w-3 h-3 rounded-full bg-purple-500" />
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
