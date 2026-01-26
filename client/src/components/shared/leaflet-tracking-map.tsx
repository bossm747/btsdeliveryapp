/**
 * Leaflet Tracking Map Component
 *
 * Replaces GoogleMapsTracking component with Leaflet + OpenRouteService.
 * Features:
 * - Real-time rider location with animated markers
 * - Restaurant, customer, rider location markers
 * - Route polyline display via /api/routing/directions
 * - WebSocket integration for live updates
 * - Floating info card with ETA, distance, rider info
 */

import { useEffect, useState, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Navigation,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  Package,
  Store,
  Home,
  AlertCircle,
  RefreshCw,
  Route,
  Gauge,
  Navigation2,
  User,
} from "lucide-react";
import {
  markerIcons,
  decodePolyline,
  animateMarkerMovement,
  fetchDirections,
  formatDistance,
  formatDuration,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/leaflet-utils";
import { useWebSocket } from "@/hooks/use-websocket";

interface Location {
  lat: number;
  lng: number;
  timestamp?: string;
}

interface DeliveryRoute {
  origin: Location;
  destination: Location;
  waypoints: Location[];
  estimatedTime: number;
  distance: number;
  trafficTime?: number;
}

interface TrackingData {
  orderId: string;
  status: string;
  rider: {
    id: string;
    name: string;
    phone: string;
    photo?: string;
    rating: number;
    vehicle: string;
  };
  restaurant: {
    name: string;
    location: Location;
    address: string;
  };
  customer: {
    name: string;
    location: Location;
    address: string;
  };
  route: DeliveryRoute;
  currentLocation: Location;
  speed: number;
  heading: number;
  progress: number;
}

interface LeafletTrackingMapProps {
  orderId: string;
  userRole: "customer" | "rider" | "merchant" | "admin";
  onLocationUpdate?: (location: Location) => void;
}

export default function LeafletTrackingMap({
  orderId,
  userRole,
  onLocationUpdate,
}: LeafletTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const restaurantMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // WebSocket for real-time updates
  const { status: wsStatus, subscribeToOrder } = useWebSocket({
    autoConnect: true,
    autoAuth: true,
    onRiderLocationUpdate: (update) => {
      if (update.orderId === orderId || !update.orderId) {
        handleLocationUpdate({
          lat: update.lat,
          lng: update.lng,
          timestamp: update.timestamp,
        });
      }
    },
    onOrderStatusUpdate: (update) => {
      if (update.orderId === orderId) {
        setTrackingData((prev) =>
          prev ? { ...prev, status: update.status } : null
        );
      }
    },
  });

  // Subscribe to order updates
  useEffect(() => {
    if (orderId) {
      subscribeToOrder(orderId);
    }
  }, [orderId, subscribeToOrder]);

  // Update connection status
  useEffect(() => {
    setIsConnected(wsStatus === "authenticated");
  }, [wsStatus]);

  // Fetch initial tracking data
  useEffect(() => {
    const fetchTrackingData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/orders/${orderId}/tracking`);
        const data = await response.json();

        if (data.order) {
          const order = data.order;
          const rider = data.rider;
          const restaurant = order.restaurant;

          // Build tracking data from API response
          const trackingInfo: TrackingData = {
            orderId: order.id,
            status: order.status,
            rider: rider
              ? {
                  id: rider.id,
                  name: `${rider.firstName || ""} ${rider.lastName || ""}`.trim() || "Rider",
                  phone: rider.phone || "",
                  rating: parseFloat(rider.rating || "4.5"),
                  vehicle: rider.vehicleType || "Motorcycle",
                }
              : {
                  id: "",
                  name: "Waiting for rider",
                  phone: "",
                  rating: 0,
                  vehicle: "",
                },
            restaurant: {
              name: restaurant?.name || "Restaurant",
              location: {
                lat: parseFloat(restaurant?.lat || "13.7565"),
                lng: parseFloat(restaurant?.lng || "121.0583"),
              },
              address: restaurant?.address || "",
            },
            customer: {
              name: order.customerName || "Customer",
              location: {
                lat: parseFloat(order.deliveryLat || "13.7465"),
                lng: parseFloat(order.deliveryLng || "121.0683"),
              },
              address: order.deliveryAddress || "",
            },
            route: {
              origin: {
                lat: parseFloat(restaurant?.lat || "13.7565"),
                lng: parseFloat(restaurant?.lng || "121.0583"),
              },
              destination: {
                lat: parseFloat(order.deliveryLat || "13.7465"),
                lng: parseFloat(order.deliveryLng || "121.0683"),
              },
              waypoints: [],
              estimatedTime: 15,
              distance: 3.2,
            },
            currentLocation: rider?.currentLocation
              ? {
                  lat: rider.currentLocation.lat,
                  lng: rider.currentLocation.lng,
                }
              : {
                  lat: parseFloat(restaurant?.lat || "13.7565"),
                  lng: parseFloat(restaurant?.lng || "121.0583"),
                },
            speed: 0,
            heading: 0,
            progress: calculateProgress(order.status),
          };

          setTrackingData(trackingInfo);
          setRiderLocation(trackingInfo.currentLocation);
        }
      } catch (err) {
        console.error("Error fetching tracking data:", err);
        // Use mock data for demo if API fails
        setTrackingData(createMockTrackingData(orderId));
        setRiderLocation({ lat: 13.7565, lng: 121.0583 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrackingData();
  }, [orderId]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !trackingData) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // Create map
      const map = L.map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: false,
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers
      addMarkers(map);

      // Calculate and display route
      calculateRoute();

      setError(null);
    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Failed to load map");
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [trackingData]);

  // Add markers to map
  const addMarkers = useCallback(
    (map: L.Map) => {
      if (!trackingData) return;

      // Restaurant marker
      if (trackingData.restaurant.location) {
        const marker = L.marker(
          [
            trackingData.restaurant.location.lat,
            trackingData.restaurant.location.lng,
          ],
          { icon: markerIcons.restaurant }
        )
          .addTo(map)
          .bindPopup(
            `<strong>${trackingData.restaurant.name}</strong><br/>${trackingData.restaurant.address}`
          );
        restaurantMarkerRef.current = marker;
      }

      // Customer marker
      if (trackingData.customer.location) {
        const marker = L.marker(
          [trackingData.customer.location.lat, trackingData.customer.location.lng],
          { icon: markerIcons.customer }
        )
          .addTo(map)
          .bindPopup(
            `<strong>Delivery Address</strong><br/>${trackingData.customer.address}`
          );
        customerMarkerRef.current = marker;
      }

      // Rider marker
      if (riderLocation && trackingData.rider.id) {
        const marker = L.marker([riderLocation.lat, riderLocation.lng], {
          icon: markerIcons.rider,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${trackingData.rider.name}</strong><br/>${trackingData.rider.vehicle}`
          );
        riderMarkerRef.current = marker;
      }

      // Fit bounds to show all markers
      const locations = [
        trackingData.restaurant.location,
        trackingData.customer.location,
        riderLocation,
      ].filter(
        (loc): loc is Location =>
          !!loc && !isNaN(loc.lat) && !isNaN(loc.lng)
      );

      if (locations.length > 1) {
        const bounds = L.latLngBounds(
          locations.map((loc) => [loc.lat, loc.lng] as [number, number])
        );
        map.fitBounds(bounds.pad(0.2));
      }
    },
    [trackingData, riderLocation]
  );

  // Calculate route and display polyline
  const calculateRoute = useCallback(async () => {
    if (!trackingData || !mapInstanceRef.current) return;

    try {
      const routeData = await fetchDirections(
        trackingData.restaurant.location,
        trackingData.customer.location
      );

      if (routeData) {
        setDistance(routeData.distanceKm + " km");
        setDuration(routeData.durationMinutes + " min");

        // Draw route polyline if available
        if (routeData.polyline && mapInstanceRef.current) {
          // Clear existing polyline
          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }

          const decodedPath = decodePolyline(routeData.polyline);
          if (decodedPath.length > 0) {
            const polyline = L.polyline(decodedPath, {
              color: "#6366f1",
              weight: 4,
              opacity: 0.8,
            }).addTo(mapInstanceRef.current);
            routePolylineRef.current = polyline;
          }
        } else if (mapInstanceRef.current) {
          // Draw simple line if no encoded polyline
          if (routePolylineRef.current) {
            routePolylineRef.current.remove();
          }

          const points: [number, number][] = [
            [
              trackingData.restaurant.location.lat,
              trackingData.restaurant.location.lng,
            ],
          ];

          if (riderLocation) {
            points.push([riderLocation.lat, riderLocation.lng]);
          }

          points.push([
            trackingData.customer.location.lat,
            trackingData.customer.location.lng,
          ]);

          const polyline = L.polyline(points, {
            color: "#6366f1",
            weight: 4,
            opacity: 0.8,
            dashArray: "10, 10",
          }).addTo(mapInstanceRef.current);
          routePolylineRef.current = polyline;
        }
      }
    } catch (err) {
      console.error("Route calculation error:", err);
    }
  }, [trackingData, riderLocation]);

  // Handle rider location updates
  const handleLocationUpdate = useCallback(
    (newLocation: Location) => {
      setRiderLocation((prevLocation) => {
        // Animate marker movement
        if (
          riderMarkerRef.current &&
          prevLocation &&
          mapInstanceRef.current
        ) {
          animateMarkerMovement(
            riderMarkerRef.current,
            L.latLng(newLocation.lat, newLocation.lng),
            1000
          );
        } else if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([newLocation.lat, newLocation.lng]);
        }

        return newLocation;
      });

      // Notify parent component
      if (onLocationUpdate) {
        onLocationUpdate(newLocation);
      }

      // Recalculate route with new rider position
      calculateRoute();
    },
    [calculateRoute, onLocationUpdate]
  );

  // Share location for riders
  useEffect(() => {
    if (userRole !== "rider") return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
        };

        // Send location update to server
        fetch("/api/gps/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            latitude: location.lat,
            longitude: location.lng,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
          }),
        }).catch(console.error);

        handleLocationUpdate(location);
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [userRole, orderId, handleLocationUpdate]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !trackingData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-96">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-muted-foreground">{error || "Unable to load tracking data"}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            } animate-pulse`}
          />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Live Tracking Active" : "Reconnecting..."}
          </span>
        </div>
        <Badge
          variant={trackingData.status === "in_transit" ? "default" : "secondary"}
        >
          {trackingData.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-[500px]"
            style={{ minHeight: "500px" }}
          />

          {/* Floating Info Card */}
          <div className="absolute bottom-4 left-4 right-4 z-[1000]">
            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{trackingData.rider.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {trackingData.rider.vehicle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      {duration || "Calculating..."}
                    </p>
                    <p className="text-xs text-muted-foreground">ETA</p>
                  </div>
                </div>

                <Progress value={trackingData.progress} className="h-2 mb-3" />

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="font-semibold">{distance || "..."}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="font-semibold">{trackingData.speed} km/h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-semibold text-green-600">
                      {getStatusLabel(trackingData.status)}
                    </p>
                  </div>
                </div>

                {/* Turn-by-turn navigation for riders */}
                {userRole === "rider" && currentStep && (
                  <>
                    <Separator className="my-3" />
                    <Alert className="bg-blue-50 border-blue-200">
                      <Navigation2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm">
                        {currentStep}
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                <Separator className="my-3" />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      (window.location.href = `tel:${trackingData.rider.phone}`)
                    }
                    disabled={!trackingData.rider.phone}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call Rider
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>

      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Route className="h-4 w-4" />
            Route Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Distance</p>
              <p className="font-semibold">{distance || "Calculating..."}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated Time</p>
              <p className="font-semibold">{duration || "Calculating..."}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="font-semibold truncate">
                {trackingData.restaurant.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">To</p>
              <p className="font-semibold truncate">
                {trackingData.customer.address || "Delivery Address"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function calculateProgress(status: string): number {
  const progressMap: Record<string, number> = {
    pending: 0,
    confirmed: 10,
    preparing: 25,
    ready: 40,
    awaiting_rider: 45,
    picked_up: 60,
    in_transit: 75,
    at_customer: 90,
    delivered: 100,
    completed: 100,
  };
  return progressMap[status] || 0;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    awaiting_rider: "Finding Rider",
    picked_up: "Picked Up",
    in_transit: "On the Way",
    at_customer: "Arriving",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}

function createMockTrackingData(orderId: string): TrackingData {
  return {
    orderId,
    status: "in_transit",
    rider: {
      id: "rider-001",
      name: "Juan Dela Cruz",
      phone: "+63 917 123 4567",
      rating: 4.8,
      vehicle: "Honda Click 150i",
    },
    restaurant: {
      name: "Jollibee SM Batangas",
      location: { lat: 13.7565, lng: 121.0583 },
      address: "SM City Batangas, Pastor Village, Batangas City",
    },
    customer: {
      name: "Maria Santos",
      location: { lat: 13.7465, lng: 121.0683 },
      address: "123 Rizal St., Poblacion, Batangas City",
    },
    route: {
      origin: { lat: 13.7565, lng: 121.0583 },
      destination: { lat: 13.7465, lng: 121.0683 },
      waypoints: [],
      estimatedTime: 15,
      distance: 3.2,
    },
    currentLocation: { lat: 13.7515, lng: 121.0633 },
    speed: 25,
    heading: 45,
    progress: 50,
  };
}
