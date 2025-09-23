import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Navigation, MapPin, Phone, MessageCircle, Clock, 
  Package, Store, Home, AlertCircle, RefreshCw,
  ZoomIn, ZoomOut, Layers, Maximize2, User
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons for different markers
const createCustomIcon = (color: string, icon: string) => {
  return L.divIcon({
    html: `
      <div class="relative">
        <div class="absolute -inset-2 bg-${color}-500/30 rounded-full animate-ping"></div>
        <div class="relative bg-${color}-500 rounded-full p-2 shadow-lg border-2 border-white">
          ${icon}
        </div>
      </div>
    `,
    className: "custom-div-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

// Rider icon with direction indicator
const createRiderIcon = (rotation: number = 0) => {
  return L.divIcon({
    html: `
      <div class="relative" style="transform: rotate(${rotation}deg);">
        <div class="absolute -inset-4 bg-blue-500/20 rounded-full animate-pulse"></div>
        <div class="relative bg-blue-600 rounded-full p-3 shadow-xl border-3 border-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4 7v10c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 
                    border-l-[8px] border-l-transparent
                    border-r-[8px] border-r-transparent
                    border-t-[12px] border-t-blue-600"></div>
      </div>
    `,
    className: "rider-marker",
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });
};

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

interface RealtimeMapTrackingProps {
  orderId: string;
  userRole: "customer" | "rider" | "merchant" | "admin";
  onLocationUpdate?: (location: Location) => void;
}

// Map control component for zoom and view controls
function MapControls({ map }: { map: L.Map | null }) {
  if (!map) return null;

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        className="bg-white shadow-lg"
        onClick={() => map.zoomIn()}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="bg-white shadow-lg"
        onClick={() => map.zoomOut()}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="bg-white shadow-lg"
        onClick={() => {
          map.setView([13.7565, 121.0583], 13); // Center on Batangas
        }}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Component to handle map animations and updates
function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5,
      easeLinearity: 0.5
    });
  }, [center, zoom, map]);
  
  return null;
}

export default function RealtimeMapTracking({ 
  orderId, 
  userRole,
  onLocationUpdate 
}: RealtimeMapTrackingProps) {
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [riderLocation, setRiderLocation] = useState<Location | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([13.7565, 121.0583]); // Batangas
  const [mapZoom, setMapZoom] = useState(13);
  const [route, setRoute] = useState<Location[]>([]);
  const [eta, setEta] = useState<string>("Calculating...");
  
  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousLocationRef = useRef<Location | null>(null);

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
        name: "Jollibee Batangas",
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
    
    // Generate route points
    const routePoints = generateRoute(
      mockData.restaurant.location,
      mockData.customer.location
    );
    setRoute(routePoints);
  }, [orderId]);

  // Generate smooth route between two points
  const generateRoute = (start: Location, end: Location): Location[] => {
    const points: Location[] = [];
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // Add some curve to make it look more realistic
      const curve = Math.sin(t * Math.PI) * 0.002;
      points.push({
        lat: start.lat + (end.lat - start.lat) * t + curve,
        lng: start.lng + (end.lng - start.lng) * t - curve
      });
    }
    
    return points;
  };

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
          setRoute(data.route);
        } else if (data.type === "eta_update" && data.orderId === orderId) {
          setEta(data.eta);
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
  }, [orderId, userRole]);

  // Smooth animation for rider movement
  const handleLocationUpdate = useCallback((newLocation: Location) => {
    if (!previousLocationRef.current) {
      previousLocationRef.current = newLocation;
      setRiderLocation(newLocation);
      return;
    }

    const startLocation = previousLocationRef.current;
    const endLocation = newLocation;
    const duration = 1000; // 1 second animation
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-in-out animation
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      const interpolatedLocation = {
        lat: startLocation.lat + (endLocation.lat - startLocation.lat) * easeProgress,
        lng: startLocation.lng + (endLocation.lng - startLocation.lng) * easeProgress
      };
      
      setRiderLocation(interpolatedLocation);
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        previousLocationRef.current = endLocation;
      }
    };
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animate();
    
    if (onLocationUpdate) {
      onLocationUpdate(newLocation);
    }
  }, [onLocationUpdate]);

  // Simulate rider movement for demo
  useEffect(() => {
    if (!trackingData || !route.length) return;
    
    let routeIndex = 0;
    const interval = setInterval(() => {
      if (routeIndex < route.length - 1) {
        routeIndex++;
        const newLocation = route[routeIndex];
        handleLocationUpdate(newLocation);
        
        // Update progress
        const progress = (routeIndex / (route.length - 1)) * 100;
        setTrackingData(prev => prev ? { ...prev, progress } : null);
        
        // Update ETA
        const remainingTime = Math.max(1, Math.floor(15 - (15 * progress / 100)));
        setEta(`${remainingTime} mins`);
        
        // Center map on rider periodically
        if (routeIndex % 5 === 0 && mapRef.current) {
          mapRef.current.flyTo([newLocation.lat, newLocation.lng], 15, {
            duration: 1,
            easeLinearity: 0.5
          });
        }
      } else {
        clearInterval(interval);
      }
    }, 2000); // Move every 2 seconds
    
    return () => clearInterval(interval);
  }, [route, trackingData, handleLocationUpdate]);

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
            {isConnected ? "Live Tracking" : "Reconnecting..."}
          </span>
        </div>
        <Badge variant={trackingData.status === "in_transit" ? "default" : "secondary"}>
          {trackingData.status.replace("_", " ").toUpperCase()}
        </Badge>
      </div>

      {/* Map Container */}
      <Card className="overflow-hidden">
        <div className="relative h-[500px]">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            ref={mapRef}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            {/* Restaurant Marker */}
            <Marker 
              position={[trackingData.restaurant.location.lat, trackingData.restaurant.location.lng]}
              icon={L.divIcon({
                html: `
                  <div class="bg-orange-500 rounded-full p-2 shadow-lg border-2 border-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                  </div>
                `,
                className: "restaurant-marker",
                iconSize: [36, 36],
                iconAnchor: [18, 36]
              })}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{trackingData.restaurant.name}</h3>
                  <p className="text-sm text-muted-foreground">{trackingData.restaurant.address}</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Customer Marker */}
            <Marker 
              position={[trackingData.customer.location.lat, trackingData.customer.location.lng]}
              icon={L.divIcon({
                html: `
                  <div class="bg-green-500 rounded-full p-2 shadow-lg border-2 border-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                  </div>
                `,
                className: "customer-marker",
                iconSize: [36, 36],
                iconAnchor: [18, 36]
              })}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">Delivery Address</h3>
                  <p className="text-sm text-muted-foreground">{trackingData.customer.address}</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Rider Marker with Animation */}
            {riderLocation && (
              <>
                <Marker 
                  position={[riderLocation.lat, riderLocation.lng]}
                  icon={createRiderIcon(trackingData.heading)}
                  ref={riderMarkerRef}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{trackingData.rider.name}</h3>
                          <p className="text-xs text-muted-foreground">{trackingData.rider.vehicle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-yellow-500">⭐</span>
                        <span>{trackingData.rider.rating}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                
                {/* Rider location accuracy circle */}
                <Circle
                  center={[riderLocation.lat, riderLocation.lng]}
                  radius={50}
                  pathOptions={{
                    color: "blue",
                    fillColor: "blue",
                    fillOpacity: 0.1,
                    weight: 1
                  }}
                />
              </>
            )}
            
            {/* Route Polyline */}
            {route.length > 0 && (
              <Polyline
                positions={route.map(p => [p.lat, p.lng])}
                pathOptions={{
                  color: "#FF6B35",
                  weight: 4,
                  opacity: 0.7,
                  dashArray: "10, 10",
                  dashOffset: "0"
                }}
              />
            )}
            
            <MapControls map={mapRef.current} />
          </MapContainer>
          
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
                      <p className="text-sm text-muted-foreground">{trackingData.rider.vehicle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">{eta}</p>
                    <p className="text-xs text-muted-foreground">ETA</p>
                  </div>
                </div>
                
                <Progress value={trackingData.progress} className="h-2 mb-3" />
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="font-semibold">{trackingData.route.distance} km</p>
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
    </div>
  );
}