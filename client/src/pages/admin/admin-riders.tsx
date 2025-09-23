import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Truck, TrendingUp, Activity } from "lucide-react";

interface OnlineRider {
  id: string;
  userId: string;
  vehicleType: string;
  plateNumber: string;
  rating: number;
  isOnline: boolean;
  status: string;
  currentLocation?: {
    latitude: string;
    longitude: string;
    timestamp: string;
  };
  performanceToday?: {
    totalOrders: number;
    completedOrders: number;
    totalEarnings: number;
    onlineHours: number;
  };
}

interface RiderLocationUpdate {
  type: string;
  data: {
    riderId: string;
    location: {
      lat: number;
      lng: number;
      timestamp: string;
      speed?: number;
      heading?: number;
    };
  };
}

export default function AdminRiders() {
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [liveUpdates, setLiveUpdates] = useState<Record<string, RiderLocationUpdate>>({});

  // Fetch online riders
  const { data: onlineRiders = [], isLoading } = useQuery<OnlineRider[]>({
    queryKey: ["/api/admin/riders/online"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("Admin WebSocket connected");
      // Subscribe to rider location updates
      socket.send(JSON.stringify({
        type: "subscribe",
        event: "rider_location"
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "rider_location") {
          setLiveUpdates(prev => ({
            ...prev,
            [message.data.riderId]: message
          }));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      socket.close();
    };
  }, []);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'busy': return 'secondary';
      case 'delivering': return 'destructive';
      case 'offline': return 'outline';
      default: return 'default';
    }
  };

  const formatLastUpdate = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes === 0) return "Ngayon lang";
    if (minutes === 1) return "1 minuto na ang nakalipas";
    if (minutes < 60) return `${minutes} minuto na ang nakalipas`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 oras na ang nakalipas";
    return `${hours} oras na ang nakalipas`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4" data-testid="admin-riders-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2" data-testid="page-title">
            Live Rider Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400" data-testid="page-description">
            Real-time monitoring ng lahat ng active riders sa platform
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card data-testid="stat-total-riders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Online</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{onlineRiders.length}</div>
              <p className="text-xs text-muted-foreground">riders currently online</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-available-riders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {onlineRiders.filter(r => r.status === 'available').length}
              </div>
              <p className="text-xs text-muted-foreground">ready for assignments</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-busy-riders">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Busy</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {onlineRiders.filter(r => r.status === 'busy' || r.status === 'delivering').length}
              </div>
              <p className="text-xs text-muted-foreground">currently delivering</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-avg-rating">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {onlineRiders.length > 0 
                  ? (onlineRiders.reduce((acc, r) => acc + r.rating, 0) / onlineRiders.length).toFixed(1)
                  : "0.0"
                }
              </div>
              <p className="text-xs text-muted-foreground">platform average</p>
            </CardContent>
          </Card>
        </div>

        {/* Riders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {onlineRiders.map((rider) => {
            const liveUpdate = liveUpdates[rider.id];
            const hasLiveLocation = liveUpdate && liveUpdate.data.location;
            
            return (
              <Card 
                key={rider.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedRider === rider.id ? 'ring-2 ring-orange-500' : ''
                }`}
                onClick={() => setSelectedRider(selectedRider === rider.id ? null : rider.id)}
                data-testid={`rider-card-${rider.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Rider #{rider.id.slice(0, 8)}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getStatusBadgeVariant(rider.status)}
                        data-testid={`status-${rider.id}`}
                      >
                        {rider.status}
                      </Badge>
                      {rider.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" data-testid={`online-indicator-${rider.id}`} />
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {rider.vehicleType} • {rider.plateNumber}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  {/* Rating */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Rating:</span>
                    <span className="font-medium" data-testid={`rating-${rider.id}`}>
                      {rider.rating.toFixed(1)} ⭐
                    </span>
                  </div>

                  {/* Location Status */}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {hasLiveLocation ? (
                      <span className="text-green-600 font-medium" data-testid={`location-status-${rider.id}`}>
                        Live location • {formatLastUpdate(liveUpdate.data.location.timestamp)}
                      </span>
                    ) : rider.currentLocation ? (
                      <span className="text-yellow-600" data-testid={`location-status-${rider.id}`}>
                        Last seen: {formatLastUpdate(rider.currentLocation.timestamp)}
                      </span>
                    ) : (
                      <span className="text-gray-500" data-testid={`location-status-${rider.id}`}>
                        No location data
                      </span>
                    )}
                  </div>

                  {/* Live Movement Info */}
                  {hasLiveLocation && liveUpdate.data.location.speed && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Speed: {liveUpdate.data.location.speed} km/h
                      {liveUpdate.data.location.heading && (
                        <span className="ml-2">
                          Heading: {liveUpdate.data.location.heading}°
                        </span>
                      )}
                    </div>
                  )}

                  {/* Performance Today */}
                  {rider.performanceToday && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Today's Performance
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Orders:</span>
                          <span className="font-medium ml-1" data-testid={`orders-${rider.id}`}>
                            {rider.performanceToday.completedOrders}/{rider.performanceToday.totalOrders}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Earnings:</span>
                          <span className="font-medium ml-1" data-testid={`earnings-${rider.id}`}>
                            ₱{rider.performanceToday.totalEarnings.toFixed(0)}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 dark:text-gray-400">Online:</span>
                          <span className="font-medium ml-1" data-testid={`hours-${rider.id}`}>
                            {rider.performanceToday.onlineHours.toFixed(1)}h
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      data-testid={`view-history-${rider.id}`}
                    >
                      View History
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      data-testid={`contact-rider-${rider.id}`}
                    >
                      Contact
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No Riders Message */}
        {onlineRiders.length === 0 && (
          <Card className="text-center py-12" data-testid="no-riders-message">
            <CardContent>
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Walang online na riders
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Mag-antay muna tayo para may available na riders para sa deliveries
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}