import { useEffect, useState, useRef, useCallback } from "react";
import { GoogleMap, LoadScript, Marker, Polyline, DirectionsRenderer, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Navigation, MapPin, Phone, MessageCircle, Clock, 
  Package, Store, Home, AlertCircle, RefreshCw,
  ZoomIn, ZoomOut, Layers, Maximize2, User,
  Route, Gauge, TrendingUp, Navigation2
} from "lucide-react";

// Google Maps libraries to load
const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places", "geometry"];

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
  steps?: google.maps.DirectionsStep[];
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

interface GoogleMapsTrackingProps {
  orderId: string;
  userRole: "customer" | "rider" | "merchant" | "admin";
  onLocationUpdate?: (location: Location) => void;
}

// Map container style
const containerStyle = {
  width: "100%",
  height: "500px"
};

// Default center (Batangas City)
const defaultCenter = {
  lat: 13.7565,
  lng: 121.0583
};

// Map options
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: true,
  rotateControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }]
    }
  ]
};

export default function GoogleMapsTracking({ 
  orderId, 
  userRole,
  onLocationUpdate 
}: GoogleMapsTrackingProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [trafficDuration, setTrafficDuration] = useState<string>("");
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<google.maps.DirectionsStep | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const distanceMatrixServiceRef = useRef<google.maps.DistanceMatrixService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize mock tracking data
  useEffect(() => {
    const mockData: TrackingData = {
      orderId,
      status: "in_transit",
      rider: {
        id: "rider-001",
        name: "Juan Dela Cruz",
        phone: "+63 917 123 4567",
        rating: 4.8,
        vehicle: "Honda Click 150i"
      },
      restaurant: {
        name: "Jollibee SM Batangas",
        location: { lat: 13.7565, lng: 121.0583 },
        address: "SM City Batangas, Pastor Village, Batangas City"
      },
      customer: {
        name: "Maria Santos",
        location: { lat: 13.7465, lng: 121.0683 },
        address: "123 Rizal St., Poblacion, Batangas City"
      },
      route: {
        origin: { lat: 13.7565, lng: 121.0583 },
        destination: { lat: 13.7465, lng: 121.0683 },
        waypoints: [],
        estimatedTime: 15,
        distance: 3.2
      },
      currentLocation: { lat: 13.7565, lng: 121.0583 },
      speed: 25,
      heading: 45,
      progress: 0
    };
    
    setTrackingData(mockData);
    setRiderLocation(mockData.currentLocation);
  }, [orderId]);

  // Initialize Google Maps services
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    directionsServiceRef.current = new google.maps.DirectionsService();
    distanceMatrixServiceRef.current = new google.maps.DistanceMatrixService();
    geocoderRef.current = new google.maps.Geocoder();
    
    // Calculate initial route
    if (trackingData) {
      calculateRoute();
    }
  }, [trackingData]);

  // Calculate route using Directions API
  const calculateRoute = useCallback(() => {
    if (!directionsServiceRef.current || !trackingData) return;

    const request: google.maps.DirectionsRequest = {
      origin: trackingData.restaurant.location,
      destination: trackingData.customer.location,
      travelMode: google.maps.TravelMode.DRIVING,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      waypoints: trackingData.route.waypoints.map(wp => ({ 
        location: new google.maps.LatLng(wp.lat, wp.lng),
        stopover: true 
      })),
      optimizeWaypoints: true,
      unitSystem: google.maps.UnitSystem.METRIC
    };

    directionsServiceRef.current.route(request, (result, status) => {
      if (status === "OK" && result) {
        setDirections(result);
        
        // Extract route information
        const route = result.routes[0];
        if (route.legs[0]) {
          setDistance(route.legs[0].distance?.text || "");
          setDuration(route.legs[0].duration?.text || "");
          
          // Traffic duration if available
          if (route.legs[0].duration_in_traffic) {
            setTrafficDuration(route.legs[0].duration_in_traffic.text);
          }
          
          // Store steps for turn-by-turn navigation
          if (route.legs[0].steps) {
            setTrackingData(prev => prev ? {
              ...prev,
              route: {
                ...prev.route,
                steps: route.legs[0].steps
              }
            } : null);
          }
        }
      }
    });
  }, [trackingData]);

  // Calculate distance matrix for multiple points
  const calculateDistanceMatrix = useCallback((origins: Location[], destinations: Location[]) => {
    if (!distanceMatrixServiceRef.current) return;

    const request: google.maps.DistanceMatrixRequest = {
      origins: origins.map(loc => new google.maps.LatLng(loc.lat, loc.lng)),
      destinations: destinations.map(loc => new google.maps.LatLng(loc.lat, loc.lng)),
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
      drivingOptions: {
        departureTime: new Date(),
        trafficModel: google.maps.TrafficModel.BEST_GUESS
      },
      avoidHighways: false,
      avoidTolls: false
    };

    distanceMatrixServiceRef.current.getDistanceMatrix(request, (response, status) => {
      if (status === "OK" && response) {
        // Process distance matrix results
        response.rows.forEach((row, i) => {
          row.elements.forEach((element, j) => {
            if (element.status === "OK") {
              // Distance and duration calculations completed
            }
          });
        });
      }
    });
  }, []);

  // Geocode address to coordinates
  const geocodeAddress = useCallback((address: string): Promise<Location | null> => {
    return new Promise((resolve) => {
      if (!geocoderRef.current) {
        resolve(null);
        return;
      }

      geocoderRef.current.geocode({ address }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        wsRef.current?.send(JSON.stringify({
          type: "subscribe_tracking",
          orderId,
          role: userRole
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === "location_update" && data.orderId === orderId) {
          handleLocationUpdate(data.location);
        } else if (data.type === "route_update" && data.orderId === orderId) {
          calculateRoute();
        }
      };
      
      wsRef.current.onerror = () => {
        setIsConnected(false);
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
      };
    } catch (error) {
      console.error("WebSocket connection failed:", error);
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [orderId, userRole, calculateRoute]);

  // Handle rider location updates with smooth animation
  const handleLocationUpdate = useCallback((newLocation: Location) => {
    setRiderLocation(newLocation);
    
    // Animate marker movement
    if (riderMarkerRef.current && map) {
      const startPosition = riderMarkerRef.current.getPosition();
      const endPosition = new google.maps.LatLng(newLocation.lat, newLocation.lng);
      
      if (startPosition) {
        animateMarker(startPosition, endPosition, 1000);
      }
    }
    
    // Update turn-by-turn navigation
    if (trackingData?.route.steps && userRole === "rider") {
      updateCurrentStep(newLocation);
    }
    
    if (onLocationUpdate) {
      onLocationUpdate(newLocation);
    }
  }, [map, trackingData, userRole, onLocationUpdate]);

  // Animate marker movement
  const animateMarker = (start: google.maps.LatLng, end: google.maps.LatLng, duration: number) => {
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Calculate interpolated position
      const lat = start.lat() + (end.lat() - start.lat()) * progress;
      const lng = start.lng() + (end.lng() - start.lng()) * progress;
      
      if (riderMarkerRef.current) {
        riderMarkerRef.current.setPosition(new google.maps.LatLng(lat, lng));
      }
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animate();
  };

  // Update current navigation step
  const updateCurrentStep = (location: Location) => {
    if (!trackingData?.route.steps) return;
    
    const point = new google.maps.LatLng(location.lat, location.lng);
    let closestStep: google.maps.DirectionsStep | null = null;
    let minDistance = Infinity;
    
    trackingData.route.steps.forEach(step => {
      if (step.start_location) {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
          point,
          step.start_location
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestStep = step;
        }
      }
    });
    
    if (closestStep && closestStep !== currentStep) {
      setCurrentStep(closestStep);
      
      // Announce turn-by-turn instruction for rider
      if (userRole === "rider" && 'speechSynthesis' in window && 'instructions' in closestStep) {
        const instructions = (closestStep as any).instructions;
        if (instructions) {
          const utterance = new SpeechSynthesisUtterance(
            instructions.replace(/<[^>]*>/g, '') // Remove HTML tags
          );
          utterance.lang = 'en-US';
          speechSynthesis.speak(utterance);
        }
      }
    }
  };

  // Share location for riders
  useEffect(() => {
    if (userRole !== "rider") return;
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString()
        };
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "rider_location",
            orderId,
            location
          }));
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      { 
        enableHighAccuracy: true, 
        timeout: 5000, 
        maximumAge: 0 
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [userRole, orderId]);

  // Custom marker icons
  const getMarkerIcon = (type: "rider" | "restaurant" | "customer") => {
    const icons = {
      rider: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#3B82F6" stroke="white" stroke-width="2"/>
            <path d="M20 10 L12 18 L20 26 L28 18 Z" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      },
      restaurant: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#FF6B35" stroke="white" stroke-width="2"/>
            <rect x="12" y="12" width="16" height="16" fill="white" rx="2"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      },
      customer: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="#10B981" stroke="white" stroke-width="2"/>
            <path d="M20 10 L12 22 L20 18 L28 22 Z" fill="white"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      }
    };
    
    return icons[type];
  };

  if (!trackingData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Live Tracking with Google Maps" : "Reconnecting..."}
          </span>
        </div>
        <Badge variant={trackingData.status === "in_transit" ? "default" : "secondary"}>
          {trackingData.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div className="relative">
          <LoadScript
            googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
            libraries={libraries}
            loadingElement={
              <div className="flex items-center justify-center h-[500px] bg-gray-100">
                <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            }
            onError={(error) => {
              console.error("Google Maps loading error:", error);
            }}
          >
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={riderLocation || defaultCenter}
              zoom={14}
              onLoad={onLoad}
              options={mapOptions}
            >
              {/* Directions Renderer */}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#FF6B35",
                      strokeWeight: 4,
                      strokeOpacity: 0.8
                    }
                  }}
                />
              )}
              
              {/* Restaurant Marker */}
              <Marker
                position={trackingData.restaurant.location}
                icon={getMarkerIcon("restaurant")}
                onClick={() => setSelectedMarker("restaurant")}
              />
              
              {/* Customer Marker */}
              <Marker
                position={trackingData.customer.location}
                icon={getMarkerIcon("customer")}
                onClick={() => setSelectedMarker("customer")}
              />
              
              {/* Rider Marker */}
              {riderLocation && (
                <Marker
                  position={riderLocation}
                  icon={getMarkerIcon("rider")}
                  onClick={() => setSelectedMarker("rider")}
                  onLoad={(marker) => {
                    riderMarkerRef.current = marker;
                  }}
                />
              )}
              
              {/* Info Windows */}
              {selectedMarker === "restaurant" && (
                <InfoWindow
                  position={trackingData.restaurant.location}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    <h3 className="font-semibold">{trackingData.restaurant.name}</h3>
                    <p className="text-sm text-gray-600">{trackingData.restaurant.address}</p>
                  </div>
                </InfoWindow>
              )}
              
              {selectedMarker === "customer" && (
                <InfoWindow
                  position={trackingData.customer.location}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    <h3 className="font-semibold">Delivery Address</h3>
                    <p className="text-sm text-gray-600">{trackingData.customer.address}</p>
                  </div>
                </InfoWindow>
              )}
              
              {selectedMarker === "rider" && riderLocation && (
                <InfoWindow
                  position={riderLocation}
                  onCloseClick={() => setSelectedMarker(null)}
                >
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{trackingData.rider.name}</h3>
                        <p className="text-xs text-gray-600">{trackingData.rider.vehicle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-500">⭐</span>
                      <span>{trackingData.rider.rating}</span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
          
          {/* Floating Info Card */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <Card className="bg-white/95 backdrop-blur">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{trackingData.rider.name}</h3>
                      <p className="text-sm text-muted-foreground">{trackingData.rider.vehicle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      {trafficDuration || duration || "Calculating..."}
                    </p>
                    <p className="text-xs text-muted-foreground">ETA with traffic</p>
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
                    <p className="font-semibold text-green-600">On the way</p>
                  </div>
                </div>
                
                {/* Turn-by-turn navigation for riders */}
                {userRole === "rider" && currentStep && (
                  <>
                    <Separator className="my-3" />
                    <Alert className="bg-blue-50 border-blue-200">
                      <Navigation2 className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-sm">
                        <div dangerouslySetInnerHTML={{ __html: currentStep.instructions }} />
                        <p className="text-xs text-gray-600 mt-1">
                          {currentStep.distance?.text} - {currentStep.duration?.text}
                        </p>
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
                    onClick={() => window.location.href = `tel:${trackingData.rider.phone}`}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Call Rider
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
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
              <p className="text-xs text-muted-foreground">Normal Time</p>
              <p className="font-semibold">{duration || "Calculating..."}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">With Traffic</p>
              <p className="font-semibold text-orange-600">
                {trafficDuration || duration || "Calculating..."}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Optimization</p>
              <p className="font-semibold text-green-600">Route Optimized</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}