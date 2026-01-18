/**
 * Batch Route Preview Component
 *
 * Displays a route preview for batch deliveries, showing:
 * - Map with rider location, pickup points, and delivery points
 * - Optimized route line connecting all stops
 * - Numbered sequence markers
 * - List of stops with estimated times
 * - Total earnings summary
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  Store,
  Package,
  Route,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  User,
  Bike,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface BatchOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLocation: Location;
  customerName: string;
  deliveryAddress: string;
  deliveryLocation: Location;
  items: number;
  earnings: number;
  tip: number;
  priority: 'normal' | 'high' | 'urgent';
}

interface RouteStop {
  type: 'pickup' | 'delivery';
  orderId: string;
  orderNumber: string;
  sequence: number;
  name: string;
  address: string;
  location: Location;
  estimatedArrival: number; // minutes from start
  distanceFromPrevious: number; // km
}

interface BatchPreviewData {
  batchId: string;
  batchNumber: string;
  orders: BatchOrder[];
  route: {
    stops: RouteStop[];
    totalDistance: number;
    totalDuration: number;
  };
  earnings: {
    basePay: number;
    tips: number;
    batchBonus: number;
    total: number;
  };
  expiresAt: string;
}

interface BatchRoutePreviewProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (batchId: string) => void;
  onDecline: (batchId: string) => void;
  isAccepting?: boolean;
  riderLocation?: Location | null;
}

// Helper functions
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

// Custom marker SVG generators
const createMarkerSvg = (
  type: 'rider' | 'pickup' | 'delivery',
  sequence?: number
): string => {
  const colors = {
    rider: { bg: '#22c55e', text: '#ffffff' }, // Green for rider
    pickup: { bg: '#f97316', text: '#ffffff' }, // Orange for pickup
    delivery: { bg: '#ef4444', text: '#ffffff' }, // Red for delivery
  };

  const { bg, text } = colors[type];
  const label = sequence !== undefined ? sequence.toString() : (type === 'rider' ? 'R' : '');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 12 18 26 18 26s18-14 18-26c0-9.94-8.06-18-18-18z" fill="${bg}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="18" r="10" fill="white"/>
      <text x="18" y="23" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${bg}" text-anchor="middle">${label}</text>
    </svg>
  `;
};

export default function BatchRoutePreview({
  batchId,
  isOpen,
  onClose,
  onAccept,
  onDecline,
  isAccepting = false,
  riderLocation,
}: BatchRoutePreviewProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [batchData, setBatchData] = useState<BatchPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRiderLocation, setCurrentRiderLocation] = useState<Location | null>(riderLocation || null);

  // Fetch batch preview data
  useEffect(() => {
    if (isOpen && batchId) {
      fetchBatchPreview();
    }
  }, [isOpen, batchId]);

  // Get rider's current location
  useEffect(() => {
    if (isOpen && !currentRiderLocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentRiderLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location error:", error);
          // Default to Batangas City center
          setCurrentRiderLocation({
            lat: 13.7565,
            lng: 121.0583,
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen, currentRiderLocation]);

  const fetchBatchPreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rider/batch-preview/${batchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch preview');
      }
      const data = await response.json();
      setBatchData(data);
    } catch (err) {
      console.error('Error fetching batch preview:', err);
      setError('Failed to load route preview. Please try again.');

      // Mock data for development/demo
      setBatchData(generateMockBatchData(batchId));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock data for demo purposes
  const generateMockBatchData = (id: string): BatchPreviewData => {
    const baseLocation = currentRiderLocation || { lat: 13.7565, lng: 121.0583 };

    const orders: BatchOrder[] = [
      {
        id: 'order-1',
        orderNumber: 'ORD-1001',
        restaurantName: 'Lomi King',
        restaurantAddress: '123 Main St, Batangas City',
        restaurantLocation: { lat: baseLocation.lat + 0.01, lng: baseLocation.lng + 0.005, address: '123 Main St, Batangas City' },
        customerName: 'Juan Dela Cruz',
        deliveryAddress: '456 Rizal Ave, Batangas City',
        deliveryLocation: { lat: baseLocation.lat + 0.02, lng: baseLocation.lng + 0.01, address: '456 Rizal Ave, Batangas City' },
        items: 3,
        earnings: 65,
        tip: 20,
        priority: 'normal',
      },
      {
        id: 'order-2',
        orderNumber: 'ORD-1002',
        restaurantName: 'Bulalo Express',
        restaurantAddress: '789 Mabini St, Batangas City',
        restaurantLocation: { lat: baseLocation.lat + 0.015, lng: baseLocation.lng + 0.008, address: '789 Mabini St, Batangas City' },
        customerName: 'Maria Santos',
        deliveryAddress: '101 Bonifacio St, Batangas City',
        deliveryLocation: { lat: baseLocation.lat + 0.025, lng: baseLocation.lng + 0.015, address: '101 Bonifacio St, Batangas City' },
        items: 2,
        earnings: 55,
        tip: 15,
        priority: 'high',
      },
    ];

    const stops: RouteStop[] = [
      {
        type: 'pickup',
        orderId: 'order-1',
        orderNumber: 'ORD-1001',
        sequence: 1,
        name: 'Lomi King',
        address: '123 Main St, Batangas City',
        location: orders[0].restaurantLocation,
        estimatedArrival: 5,
        distanceFromPrevious: 1.2,
      },
      {
        type: 'pickup',
        orderId: 'order-2',
        orderNumber: 'ORD-1002',
        sequence: 2,
        name: 'Bulalo Express',
        address: '789 Mabini St, Batangas City',
        location: orders[1].restaurantLocation,
        estimatedArrival: 10,
        distanceFromPrevious: 0.8,
      },
      {
        type: 'delivery',
        orderId: 'order-1',
        orderNumber: 'ORD-1001',
        sequence: 3,
        name: 'Juan Dela Cruz',
        address: '456 Rizal Ave, Batangas City',
        location: orders[0].deliveryLocation,
        estimatedArrival: 18,
        distanceFromPrevious: 1.5,
      },
      {
        type: 'delivery',
        orderId: 'order-2',
        orderNumber: 'ORD-1002',
        sequence: 4,
        name: 'Maria Santos',
        address: '101 Bonifacio St, Batangas City',
        location: orders[1].deliveryLocation,
        estimatedArrival: 25,
        distanceFromPrevious: 1.0,
      },
    ];

    return {
      batchId: id,
      batchNumber: `BATCH-${Date.now().toString(36).toUpperCase()}`,
      orders,
      route: {
        stops,
        totalDistance: 4.5,
        totalDuration: 25,
      },
      earnings: {
        basePay: 120,
        tips: 35,
        batchBonus: 25,
        total: 180,
      },
      expiresAt: new Date(Date.now() + 120000).toISOString(), // 2 minutes
    };
  };

  // Initialize map
  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !batchData || !currentRiderLocation) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    // Create map if not exists
    let map = mapInstance;
    if (!map) {
      map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        center: currentRiderLocation,
        mapTypeId: 'roadmap',
        gestureHandling: 'greedy',
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });
      setMapInstance(map);
    }

    // Create directions renderer
    let renderer = directionsRenderer;
    if (!renderer) {
      renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
      });
      renderer.setMap(map);
      setDirectionsRenderer(renderer);
    }

    const newMarkers: google.maps.Marker[] = [];

    // Add rider marker
    const riderMarker = new google.maps.Marker({
      position: currentRiderLocation,
      map,
      title: 'Your Location',
      icon: {
        url: 'data:image/svg+xml,' + encodeURIComponent(createMarkerSvg('rider')),
        scaledSize: new google.maps.Size(36, 44),
        anchor: new google.maps.Point(18, 44),
      },
      zIndex: 100,
    });
    newMarkers.push(riderMarker);

    // Add stop markers
    batchData.route.stops.forEach((stop) => {
      const marker = new google.maps.Marker({
        position: stop.location,
        map,
        title: `${stop.sequence}. ${stop.name}`,
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(
            createMarkerSvg(stop.type, stop.sequence)
          ),
          scaledSize: new google.maps.Size(36, 44),
          anchor: new google.maps.Point(18, 44),
        },
        zIndex: stop.sequence,
      });
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Calculate and display route
    const directionsService = new google.maps.DirectionsService();
    const waypoints = batchData.route.stops.slice(0, -1).map(stop => ({
      location: new google.maps.LatLng(stop.location.lat, stop.location.lng),
      stopover: true,
    }));

    const lastStop = batchData.route.stops[batchData.route.stops.length - 1];

    directionsService.route(
      {
        origin: currentRiderLocation,
        destination: new google.maps.LatLng(lastStop.location.lat, lastStop.location.lng),
        waypoints,
        optimizeWaypoints: false,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result && renderer) {
          renderer.setDirections(result);
        }
      }
    );

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(currentRiderLocation);
    batchData.route.stops.forEach(stop => {
      bounds.extend(stop.location);
    });
    map.fitBounds(bounds, 50);
  }, [batchData, currentRiderLocation, mapInstance, directionsRenderer, markers]);

  // Initialize map when data and location are ready
  useEffect(() => {
    if (batchData && currentRiderLocation && isOpen) {
      // Load Google Maps if not loaded
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          setTimeout(initializeMap, 100);
        };
        document.head.appendChild(script);
      } else {
        setTimeout(initializeMap, 100);
      }
    }
  }, [batchData, currentRiderLocation, isOpen, initializeMap]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      markers.forEach(marker => marker.setMap(null));
      setMarkers([]);
      if (directionsRenderer) {
        directionsRenderer.setMap(null);
        setDirectionsRenderer(null);
      }
      setMapInstance(null);
    }
  }, [isOpen]);

  const handleAccept = () => {
    if (batchData) {
      onAccept(batchData.batchId);
    }
  };

  const handleDecline = () => {
    if (batchData) {
      onDecline(batchData.batchId);
    }
  };

  const getStopIcon = (type: 'pickup' | 'delivery') => {
    if (type === 'pickup') {
      return <Store className="w-4 h-4 text-orange-500" />;
    }
    return <MapPin className="w-4 h-4 text-red-500" />;
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      normal: 'bg-gray-100 text-gray-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    if (priority === 'normal') return null;
    return (
      <Badge className={styles[priority as keyof typeof styles] || styles.normal}>
        {priority === 'urgent' ? 'URGENT' : 'High Priority'}
      </Badge>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[90vh] sm:h-[85vh] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-2 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Route className="w-5 h-5 text-[#FF6B35]" />
                Batch Route Preview
              </SheetTitle>
              <SheetDescription>
                {batchData ? `${batchData.orders.length} orders - ${batchData.batchNumber}` : 'Loading...'}
              </SheetDescription>
            </div>
            {batchData && (
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">
                  +{batchData.earnings.total.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">Total Earnings</div>
              </div>
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B35] mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading route preview...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-gray-700 font-medium">{error}</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={fetchBatchPreview}
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : batchData ? (
          <>
            {/* Map Section */}
            <div className="h-[200px] sm:h-[250px] w-full bg-gray-100 relative flex-shrink-0">
              <div
                ref={mapRef}
                className="w-full h-full"
                style={{ minHeight: '200px' }}
              />
              {!mapInstance && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#FF6B35] mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Loading map...</p>
                  </div>
                </div>
              )}

              {/* Map Legend */}
              <div className="absolute top-2 right-2 bg-white/90 rounded-lg p-2 shadow-sm text-xs space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Your Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Pickup</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Delivery</span>
                </div>
              </div>
            </div>

            {/* Route Summary */}
            <div className="px-4 py-3 bg-gray-50 border-b flex-shrink-0">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatDistance(batchData.route.totalDistance)}
                  </div>
                  <div className="text-xs text-gray-500">Total Distance</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatTime(batchData.route.totalDuration)}
                  </div>
                  <div className="text-xs text-gray-500">Est. Time</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">
                    {batchData.route.stops.length}
                  </div>
                  <div className="text-xs text-gray-500">Stops</div>
                </div>
              </div>
            </div>

            {/* Stops List */}
            <ScrollArea className="flex-1">
              <div className="px-4 py-3 space-y-3">
                <h4 className="font-medium text-gray-700 text-sm">Route Sequence</h4>

                {batchData.route.stops.map((stop, index) => (
                  <div
                    key={`${stop.orderId}-${stop.type}`}
                    className="flex items-start gap-3 relative"
                  >
                    {/* Connector line */}
                    {index < batchData.route.stops.length - 1 && (
                      <div className="absolute left-[15px] top-8 w-0.5 h-[calc(100%)] bg-gray-200" />
                    )}

                    {/* Sequence number */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 z-10 ${
                        stop.type === 'pickup' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                    >
                      {stop.sequence}
                    </div>

                    {/* Stop details */}
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant="outline"
                          className={stop.type === 'pickup' ? 'border-orange-300 text-orange-700' : 'border-red-300 text-red-700'}
                        >
                          {stop.type === 'pickup' ? 'Pickup' : 'Deliver'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {stop.orderNumber}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900">{stop.name}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{stop.address}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(stop.estimatedArrival)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Bike className="w-3 h-3" />
                          {formatDistance(stop.distanceFromPrevious)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Earnings Breakdown */}
              <div className="px-4 py-3">
                <h4 className="font-medium text-gray-700 text-sm mb-3">Earnings Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Pay ({batchData.orders.length} orders)</span>
                    <span className="font-medium">{batchData.earnings.basePay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tips</span>
                    <span className="font-medium text-green-600">+{batchData.earnings.tips.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Batch Bonus</span>
                    <span className="font-medium text-blue-600">+{batchData.earnings.batchBonus.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold">Total Earnings</span>
                    <span className="font-bold text-green-600">{batchData.earnings.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Orders Overview */}
              <div className="px-4 py-3 pb-4">
                <h4 className="font-medium text-gray-700 text-sm mb-3">Orders in Batch</h4>
                <div className="space-y-2">
                  {batchData.orders.map((order) => (
                    <Card key={order.id} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.orderNumber}</span>
                          {getPriorityBadge(order.priority)}
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-green-600">
                            +{(order.earnings + order.tip).toFixed(2)}
                          </span>
                          {order.tip > 0 && (
                            <span className="text-xs text-gray-500 ml-1">(+{order.tip} tip)</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Store className="w-3 h-3 text-orange-500" />
                          <span className="line-clamp-1">{order.restaurantName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-3 h-3 text-blue-500" />
                          <span className="line-clamp-1">{order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Package className="w-3 h-3" />
                          <span>{order.items} item{order.items > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <SheetFooter className="px-4 py-3 border-t bg-white flex-shrink-0">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isAccepting}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept Batch
                    </>
                  )}
                </Button>
              </div>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
