import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RiderLocation {
  riderId: string;
  riderName: string;
  location: {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp?: string;
  };
  isOnline: boolean;
  activeOrdersCount: number;
  status: "idle" | "traveling_to_pickup" | "at_restaurant" | "traveling_to_delivery" | "at_customer";
  performanceScore: number;
  rating: number;
}

interface PendingAssignment {
  id: string;
  orderId: string;
  priority: number;
  estimatedValue: string;
  restaurantLocation: {lat: number, lng: number};
  deliveryLocation: {lat: number, lng: number};
  assignedAt: string;
  timeoutAt: string;
  assignedRiderId?: string;
  riderName?: string;
}

export function RealTimeRiderTracking() {
  const [riders, setRiders] = useState<RiderLocation[]>([]);
  const [assignments, setAssignments] = useState<PendingAssignment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0); // For forcing map re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        // Subscribe to rider tracking updates
        wsRef.current?.send(JSON.stringify({
          type: "subscribe",
          channel: "rider_tracking"
        }));
        
        // Subscribe to assignment updates
        wsRef.current?.send(JSON.stringify({
          type: "subscribe", 
          channel: "rider_assignments"
        }));
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case "rider_location_update":
        setRiders(prev => prev.map(rider => 
          rider.riderId === data.riderId 
            ? { ...rider, location: data.location, status: data.status }
            : rider
        ));
        break;
        
      case "rider_status_change":
        setRiders(prev => prev.map(rider =>
          rider.riderId === data.riderId
            ? { ...rider, isOnline: data.isOnline, activeOrdersCount: data.activeOrdersCount }
            : rider
        ));
        break;
        
      case "new_assignment":
        setAssignments(prev => [...prev, data.assignment]);
        toast({
          title: "New Assignment Created",
          description: `Order ${data.assignment.orderId} needs a rider`,
        });
        break;
        
      case "assignment_accepted":
        setAssignments(prev => prev.filter(a => a.id !== data.assignmentId));
        toast({
          title: "Assignment Accepted",
          description: `Rider ${data.riderName} accepted the order`,
        });
        break;
        
      case "assignment_timeout":
        setAssignments(prev => prev.filter(a => a.id !== data.assignmentId));
        toast({
          title: "Assignment Timeout",
          description: `Order ${data.orderId} assignment timed out`,
          variant: "destructive"
        });
        break;
    }
  };

  // Load initial data
  useEffect(() => {
    loadRiders();
    loadPendingAssignments();
  }, []);

  const loadRiders = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/riders");
      const ridersData = await response.json();
      
      const ridersWithLocation = ridersData
        .filter((rider: any) => rider.currentLocation)
        .map((rider: any) => ({
          riderId: rider.id,
          riderName: rider.userId, // You might want to join with users table for actual name
          location: rider.currentLocation,
          isOnline: rider.isOnline,
          activeOrdersCount: rider.activeOrdersCount || 0,
          status: "idle", // Default status
          performanceScore: rider.performanceScore || 0,
          rating: rider.rating || 0
        }));
      
      setRiders(ridersWithLocation);
    } catch (error) {
      console.error("Error loading riders:", error);
      toast({
        title: "Error",
        description: "Failed to load riders data",
        variant: "destructive"
      });
    }
  };

  const loadPendingAssignments = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/pending-assignments");
      const assignmentsData = await response.json();
      setAssignments(assignmentsData);
    } catch (error) {
      console.error("Error loading assignments:", error);
    }
  };

  const manuallyAssignOrder = async (assignmentId: string, riderId: string) => {
    try {
      await apiRequest("POST", `/api/rider-assignments/${assignmentId}/manual-assign`, {
        riderId
      });
      
      toast({
        title: "Assignment Successful",
        description: "Order manually assigned to rider",
      });
      
      loadPendingAssignments();
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Failed to manually assign order",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle": return "bg-gray-500";
      case "traveling_to_pickup": return "bg-blue-500";
      case "at_restaurant": return "bg-orange-500";
      case "traveling_to_delivery": return "bg-purple-500";
      case "at_customer": return "bg-green-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "idle": return "Idle";
      case "traveling_to_pickup": return "To Pickup";
      case "at_restaurant": return "At Restaurant";
      case "traveling_to_delivery": return "To Delivery";
      case "at_customer": return "At Customer";
      default: return "Unknown";
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="real-time-rider-tracking">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#004225]">Real-Time Rider Tracking</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="map" className="w-full" onValueChange={(value) => {
        // Refresh map when switching to map tab
        if (value === "map") {
          setTimeout(() => {
            setMapKey(prev => prev + 1);
          }, 100);
        }
      }}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map" data-testid="tab-map">Live Map</TabsTrigger>
          <TabsTrigger value="riders" data-testid="tab-riders">Rider List</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Pending Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle>Live Rider Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={mapRef} 
                className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center"
                data-testid="rider-map"
                key={mapKey} // Force re-render on tab changes
              >
                <div className="text-center">
                  <p className="text-lg font-medium">Google Maps Integration</p>
                  <p className="text-gray-600">Live rider tracking map will be displayed here</p>
                  <p className="text-sm mt-2">
                    {riders.length} riders online • {assignments.length} pending assignments
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="riders">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {riders.map((rider) => (
              <Card 
                key={rider.riderId} 
                className={`cursor-pointer transition-all ${
                  selectedRider === rider.riderId ? 'ring-2 ring-[#FF6B35]' : ''
                }`}
                onClick={() => setSelectedRider(rider.riderId)}
                data-testid={`rider-card-${rider.riderId}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rider.riderName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${getStatusColor(rider.status)} text-white`}
                        data-testid={`rider-status-${rider.riderId}`}
                      >
                        {getStatusText(rider.status)}
                      </Badge>
                      {rider.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Performance</p>
                      <p className="font-medium">{rider.performanceScore.toFixed(1)}/100</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rating</p>
                      <p className="font-medium">⭐ {rider.rating.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Active Orders</p>
                      <p className="font-medium">{rider.activeOrdersCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Update</p>
                      <p className="font-medium text-xs">
                        {rider.location.timestamp ? 
                          new Date(rider.location.timestamp).toLocaleTimeString() : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Location: {rider.location.lat.toFixed(4)}, {rider.location.lng.toFixed(4)}
                    {rider.location.accuracy && ` (±${rider.location.accuracy}m)`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {riders.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No riders currently online</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="assignments">
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id} data-testid={`assignment-card-${assignment.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Order #{assignment.orderId}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`${
                          assignment.priority > 3 ? 'border-red-500 text-red-700' : 
                          assignment.priority > 1 ? 'border-yellow-500 text-yellow-700' : 
                          'border-green-500 text-green-700'
                        }`}
                      >
                        Priority {assignment.priority}
                      </Badge>
                      <Badge variant="secondary">
                        ₱{parseFloat(assignment.estimatedValue).toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Assigned At</p>
                      <p className="font-medium">
                        {new Date(assignment.assignedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Timeout</p>
                      <p className="font-medium">
                        {new Date(assignment.timeoutAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {assignment.assignedRiderId && (
                    <div className="text-sm">
                      <p className="text-gray-600">Assigned Rider</p>
                      <p className="font-medium">{assignment.riderName || assignment.assignedRiderId}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => loadPendingAssignments()}
                      data-testid={`refresh-assignment-${assignment.id}`}
                    >
                      Refresh
                    </Button>
                    
                    {riders.length > 0 && (
                      <select 
                        className="px-3 py-1 border rounded text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            manuallyAssignOrder(assignment.id, e.target.value);
                          }
                        }}
                        data-testid={`manual-assign-${assignment.id}`}
                      >
                        <option value="">Manual Assign...</option>
                        {riders
                          .filter(r => r.isOnline && r.activeOrdersCount < 3)
                          .map(rider => (
                            <option key={rider.riderId} value={rider.riderId}>
                              {rider.riderName} (Score: {rider.performanceScore.toFixed(1)})
                            </option>
                          ))
                        }
                      </select>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {assignments.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-gray-500">No pending assignments</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}