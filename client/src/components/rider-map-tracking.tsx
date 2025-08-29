import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Navigation, Clock, DollarSign, Route, 
  AlertCircle, CheckCircle, Phone, MessageCircle,
  TrendingUp, Zap, Shield, Target, Truck, Package,
  User, Store, Home, ChevronUp, ChevronDown, Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface Delivery {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    location: Location;
  };
  restaurant: {
    name: string;
    address: string;
    location: Location;
  };
  items: number;
  amount: number;
  distance: number;
  estimatedTime: number;
  status: "assigned" | "picked_up" | "in_transit" | "delivered";
  priority: "normal" | "high" | "urgent";
  tip?: number;
}

interface RiderMapTrackingProps {
  riderId: string;
}

export default function RiderMapTracking({ riderId }: RiderMapTrackingProps) {
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [deliveryQueue, setDeliveryQueue] = useState<Delivery[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 0,
    trips: 0,
    tips: 0,
    bonus: 0
  });
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [routeOptimization, setRouteOptimization] = useState({
    originalDistance: 0,
    optimizedDistance: 0,
    timeSaved: 0
  });

  // Simulate real-time location tracking
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        console.error("Location error:", error);
        // Use default Batangas location for demo
        setCurrentLocation({
          lat: 13.7565,
          lng: 121.0583
        });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Simulate WebSocket for real-time updates
  useEffect(() => {
    // In production, this would be a real WebSocket connection
    const interval = setInterval(() => {
      // Simulate new delivery assignments
      if (Math.random() > 0.8 && deliveryQueue.length < 5) {
        const newDelivery: Delivery = {
          id: `DEL-${Date.now()}`,
          orderNumber: `ORD-${Math.floor(Math.random() * 10000)}`,
          customer: {
            name: ["Juan Dela Cruz", "Maria Santos", "Pedro Garcia"][Math.floor(Math.random() * 3)],
            phone: "09171234567",
            address: "123 Main St, Batangas City",
            location: { 
              lat: 13.7565 + (Math.random() - 0.5) * 0.05, 
              lng: 121.0583 + (Math.random() - 0.5) * 0.05 
            }
          },
          restaurant: {
            name: ["Lomi King", "Bulalo Express", "Tapa Queen"][Math.floor(Math.random() * 3)],
            address: "456 Restaurant Row, Batangas",
            location: { 
              lat: 13.7565 + (Math.random() - 0.5) * 0.05, 
              lng: 121.0583 + (Math.random() - 0.5) * 0.05 
            }
          },
          items: Math.floor(Math.random() * 5) + 1,
          amount: Math.floor(Math.random() * 1000) + 200,
          distance: Math.floor(Math.random() * 10) + 2,
          estimatedTime: Math.floor(Math.random() * 30) + 15,
          status: "assigned",
          priority: ["normal", "high", "urgent"][Math.floor(Math.random() * 3)] as any,
          tip: Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 20 : undefined
        };
        
        setDeliveryQueue(prev => [...prev, newDelivery]);
        
        toast({
          title: "New Delivery Assignment!",
          description: `Order ${newDelivery.orderNumber} from ${newDelivery.restaurant.name}`,
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [deliveryQueue.length, toast]);

  // AI-powered route optimization
  useEffect(() => {
    if (deliveryQueue.length > 1) {
      // Simulate AI optimization
      const originalDist = deliveryQueue.reduce((sum, d) => sum + d.distance, 0);
      const optimizedDist = originalDist * 0.85; // 15% optimization
      const saved = ((originalDist - optimizedDist) / 60) * 30; // Time saved in minutes
      
      setRouteOptimization({
        originalDistance: originalDist,
        optimizedDistance: optimizedDist,
        timeSaved: saved
      });
      
      setAiSuggestions([
        "🚀 Optimized route saves " + saved.toFixed(0) + " minutes",
        "⚡ High-tip order nearby - prioritize for better earnings",
        "🔥 Lunch rush starting - expect 30% more orders",
        "💡 Take Route 2 to avoid traffic on Main Street"
      ]);
    }
  }, [deliveryQueue]);

  const acceptDelivery = (delivery: Delivery) => {
    setActiveDelivery(delivery);
    setDeliveryQueue(prev => prev.filter(d => d.id !== delivery.id));
    setIsNavigating(true);
    
    toast({
      title: "Delivery Accepted",
      description: `Navigate to ${delivery.restaurant.name}`,
    });
  };

  const updateDeliveryStatus = (status: Delivery["status"]) => {
    if (activeDelivery) {
      setActiveDelivery({ ...activeDelivery, status });
      
      if (status === "delivered") {
        setEarnings(prev => ({
          today: prev.today + activeDelivery.amount * 0.2,
          trips: prev.trips + 1,
          tips: prev.tips + (activeDelivery.tip || 0),
          bonus: prev.bonus + (activeDelivery.priority === "urgent" ? 50 : 0)
        }));
        
        toast({
          title: "Delivery Completed!",
          description: `Earned ₱${(activeDelivery.amount * 0.2 + (activeDelivery.tip || 0)).toFixed(2)}`,
        });
        
        setActiveDelivery(null);
        setIsNavigating(false);
      }
    }
  };

  // Google Maps Integration
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [directionsService, setDirectionsService] = useState<any>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null);
  const [riderMarker, setRiderMarker] = useState<any>(null);
  const [restaurantMarker, setRestaurantMarker] = useState<any>(null);
  const [customerMarker, setCustomerMarker] = useState<any>(null);

  // Initialize Google Maps
  useEffect(() => {
    const initializeMap = () => {
      if (!mapRef.current || !window.google) return;

      // Create map centered on current location or default to Batangas
      const center = currentLocation || { lat: 13.7565, lng: 121.0583 };
      
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      const dirService = new window.google.maps.DirectionsService();
      const dirRenderer = new window.google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#FF6B35',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      });
      
      dirRenderer.setMap(map);

      setMapInstance(map);
      setDirectionsService(dirService);
      setDirectionsRenderer(dirRenderer);

      // Create rider marker
      const riderIcon = {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="15" fill="#3B82F6" stroke="white" stroke-width="3"/>
            <path d="M16 16l8 4-8 4v-8z" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      };

      const riderMkr = new window.google.maps.Marker({
        position: center,
        map,
        title: 'Your Location',
        icon: riderIcon
      });

      setRiderMarker(riderMkr);
    };

    // Load Google Maps API if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    } else {
      initializeMap();
    }
  }, []);

  // Update rider location on map
  useEffect(() => {
    if (riderMarker && currentLocation && mapInstance) {
      const position = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
      riderMarker.setPosition(position);
      mapInstance.panTo(position);
    }
  }, [currentLocation, riderMarker, mapInstance]);

  // Update markers and route for active delivery
  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Clear existing markers
    if (restaurantMarker) {
      restaurantMarker.setMap(null);
      setRestaurantMarker(null);
    }
    if (customerMarker) {
      customerMarker.setMap(null);
      setCustomerMarker(null);
    }

    if (activeDelivery) {
      // Restaurant marker
      const restaurantIcon = {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="15" fill="#FF6B35" stroke="white" stroke-width="3"/>
            <path d="M12 14h16v2H12v-2zm2 4h12v2H14v-2zm2 4h8v2h-8v-2z" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      };

      const restMkr = new window.google.maps.Marker({
        position: activeDelivery.restaurant.location,
        map: mapInstance,
        title: activeDelivery.restaurant.name,
        icon: restaurantIcon
      });

      // Customer marker
      const customerIcon = {
        url: 'data:image/svg+xml,' + encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="15" fill="#004225" stroke="white" stroke-width="3"/>
            <path d="M20 10c-3.3 0-6 2.7-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6zm0 9c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" fill="white"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(40, 40),
        anchor: new window.google.maps.Point(20, 20)
      };

      const custMkr = new window.google.maps.Marker({
        position: activeDelivery.customer.location,
        map: mapInstance,
        title: activeDelivery.customer.name,
        icon: customerIcon
      });

      setRestaurantMarker(restMkr);
      setCustomerMarker(custMkr);

      // Calculate and display route
      if (directionsService && directionsRenderer && currentLocation) {
        const waypoints = [];
        let origin = currentLocation;
        let destination = activeDelivery.customer.location;

        // If not picked up yet, route to restaurant first
        if (activeDelivery.status === "assigned") {
          destination = activeDelivery.restaurant.location;
        } else if (activeDelivery.status === "picked_up") {
          // Route from restaurant to customer
          origin = activeDelivery.restaurant.location;
        }

        directionsService.route({
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true,
          travelMode: window.google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: false
        }, (result: any, status: any) => {
          if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            // Update estimated time and distance
            const route = result.routes[0];
            const leg = route.legs[0];
            setActiveDelivery(prev => prev ? {
              ...prev,
              distance: Math.round(leg.distance.value / 1000),
              estimatedTime: Math.round(leg.duration.value / 60)
            } : null);
          }
        });

        // Fit bounds to show all markers
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend(currentLocation);
        bounds.extend(activeDelivery.restaurant.location);
        bounds.extend(activeDelivery.customer.location);
        mapInstance.fitBounds(bounds);
      }
    } else {
      // Clear route if no active delivery
      if (directionsRenderer) {
        directionsRenderer.setDirections({ routes: [] });
      }
    }
  }, [activeDelivery, mapInstance, directionsService, directionsRenderer, currentLocation]);

  const renderMap = () => (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        data-testid="google-maps-container"
      />
      
      {/* Loading indicator */}
      {!mapInstance && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B35] mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Navigation Bar */}
      {isNavigating && activeDelivery && (
        <div className="absolute top-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-orange-500" />
              <span className="font-medium">
                {activeDelivery.status === "assigned" ? "To Restaurant" : "To Customer"}
              </span>
            </div>
            <Badge className="bg-green-500 text-white">
              {activeDelivery.distance} km • {activeDelivery.estimatedTime} min
            </Badge>
          </div>
          <div className="text-sm text-gray-600">
            {activeDelivery.status === "assigned" 
              ? activeDelivery.restaurant.address 
              : activeDelivery.customer.address}
          </div>
          <Progress 
            value={activeDelivery.status === "delivered" ? 100 : activeDelivery.status === "in_transit" ? 66 : 33} 
            className="mt-2"
          />
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 space-y-2 z-10">
        <Button 
          size="icon" 
          variant="secondary" 
          className="shadow-lg"
          onClick={() => mapInstance?.setZoom(mapInstance.getZoom() + 1)}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          variant="secondary" 
          className="shadow-lg"
          onClick={() => mapInstance?.setZoom(mapInstance.getZoom() - 1)}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        {currentLocation && (
          <Button 
            size="icon" 
            variant="secondary" 
            className="shadow-lg"
            onClick={() => {
              const position = new window.google.maps.LatLng(currentLocation.lat, currentLocation.lng);
              mapInstance?.panTo(position);
              mapInstance?.setZoom(16);
            }}
            title="Center on my location"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* AI Suggestions Banner */}
      {aiSuggestions.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Zap className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm">
            <span className="font-medium text-orange-800">AI Assistant: </span>
            {aiSuggestions[0]}
          </AlertDescription>
        </Alert>
      )}

      {/* Earnings Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today's Earnings</p>
                <p className="text-xl font-bold text-green-600">₱{earnings.today.toFixed(2)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Trips</p>
                <p className="text-xl font-bold">{earnings.trips}</p>
              </div>
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tips</p>
                <p className="text-xl font-bold">₱{earnings.tips}</p>
              </div>
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bonus</p>
                <p className="text-xl font-bold">₱{earnings.bonus}</p>
              </div>
              <Target className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map">Live Map</TabsTrigger>
          <TabsTrigger value="active">Active Delivery</TabsTrigger>
          <TabsTrigger value="queue">Queue ({deliveryQueue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="h-[500px]">
                {renderMap()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeDelivery ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Order #{activeDelivery.orderNumber}</CardTitle>
                  <Badge variant={activeDelivery.priority === "urgent" ? "destructive" : "default"}>
                    {activeDelivery.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Restaurant Info */}
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                  <Store className="h-5 w-5 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{activeDelivery.restaurant.name}</p>
                    <p className="text-sm text-gray-600">{activeDelivery.restaurant.address}</p>
                  </div>
                  {activeDelivery.status === "assigned" && (
                    <Button 
                      size="sm"
                      onClick={() => updateDeliveryStatus("picked_up")}
                    >
                      Mark Picked Up
                    </Button>
                  )}
                </div>

                {/* Customer Info */}
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <User className="h-5 w-5 text-green-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-medium">{activeDelivery.customer.name}</p>
                    <p className="text-sm text-gray-600">{activeDelivery.customer.address}</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </div>
                  {activeDelivery.status === "picked_up" && (
                    <Button 
                      size="sm"
                      onClick={() => updateDeliveryStatus("in_transit")}
                    >
                      Start Delivery
                    </Button>
                  )}
                </div>

                {/* Order Details */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{activeDelivery.items} items</p>
                    <p className="font-bold text-lg">₱{activeDelivery.amount}</p>
                  </div>
                  {activeDelivery.tip && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      Tip: ₱{activeDelivery.tip}
                    </Badge>
                  )}
                </div>

                {/* Delivery Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Delivery Progress</span>
                    <span className="font-medium">
                      {activeDelivery.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <Progress 
                    value={
                      activeDelivery.status === "delivered" ? 100 : 
                      activeDelivery.status === "in_transit" ? 66 : 
                      activeDelivery.status === "picked_up" ? 33 : 10
                    } 
                  />
                </div>

                {activeDelivery.status === "in_transit" && (
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => updateDeliveryStatus("delivered")}
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Complete Delivery
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active delivery</p>
                <p className="text-sm text-gray-500 mt-2">Accept a delivery from the queue to start</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queue" className="space-y-4">
          {routeOptimization.optimizedDistance > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <span className="font-medium">Route Optimized!</span> Save {routeOptimization.timeSaved.toFixed(0)} minutes 
                by following the suggested route order.
              </AlertDescription>
            </Alert>
          )}

          {deliveryQueue.length > 0 ? (
            <div className="space-y-3">
              {deliveryQueue.map((delivery) => (
                <Card key={delivery.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">#{delivery.orderNumber}</span>
                          <Badge variant={delivery.priority === "urgent" ? "destructive" : "default"}>
                            {delivery.priority}
                          </Badge>
                          {delivery.tip && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Tip: ₱{delivery.tip}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {delivery.restaurant.name} → {delivery.customer.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₱{delivery.amount}</p>
                        <p className="text-xs text-gray-500">
                          {delivery.distance} km • {delivery.estimatedTime} min
                        </p>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      size="sm"
                      onClick={() => acceptDelivery(delivery)}
                      disabled={!!activeDelivery}
                    >
                      Accept Delivery
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No pending deliveries</p>
                <p className="text-sm text-gray-500 mt-2">New orders will appear here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}