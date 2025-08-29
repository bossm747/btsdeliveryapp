import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Package, Clock, DollarSign, Star, TrendingUp, 
  Navigation, Phone, CheckCircle, XCircle, AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RiderDashboard() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  // Fetch rider data
  const { data: riderData } = useQuery({
    queryKey: ["/api/rider/profile"],
    enabled: true
  });

  // Fetch active deliveries
  const { data: activeDeliveries = [] } = useQuery({
    queryKey: ["/api/rider/deliveries/active"],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch delivery history
  const { data: deliveryHistory = [] } = useQuery({
    queryKey: ["/api/rider/deliveries/history"]
  });

  // Update online status
  const updateStatusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      return await apiRequest("PATCH", "/api/rider/status", { 
        isOnline: online,
        currentLocation 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
      toast({
        title: online ? "Online na kayo!" : "Offline na kayo",
        description: online ? "Makakatanggap na kayo ng deliveries" : "Hindi na kayo makakatanggap ng bagong delivery",
      });
    }
  });

  // Accept delivery
  const acceptDeliveryMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/rider/deliveries/${orderId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
      toast({
        title: "Delivery accepted!",
        description: "Puntahan ang restaurant para kunin ang order",
      });
    }
  });

  // Update delivery status
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string, status: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
    }
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "picked_up": return "bg-blue-500";
      case "in_transit": return "bg-purple-500";
      case "delivered": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const earnings = riderData?.earningsBalance || 0;
  const rating = riderData?.rating || 0;
  const totalDeliveries = riderData?.totalDeliveries || 0;

  return (
    <div className="container mx-auto px-4 py-8" data-testid="page-rider-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-title">Rider Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="online-status"
              checked={isOnline}
              onCheckedChange={(checked) => {
                setIsOnline(checked);
                updateStatusMutation.mutate(checked);
              }}
              data-testid="switch-online"
            />
            <Label htmlFor="online-status" className="font-medium">
              {isOnline ? "Online" : "Offline"}
            </Label>
          </div>
          {currentLocation && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Navigation className="h-3 w-3" />
              Location tracked
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-earnings">
              ₱{earnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Deliveries Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-deliveries">
              {activeDeliveries.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-yellow-500 fill-current" />
              <span className="text-2xl font-bold" data-testid="text-rating">{rating}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total">{totalDeliveries}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Deliveries</TabsTrigger>
          <TabsTrigger value="available">Available Orders</TabsTrigger>
          <TabsTrigger value="history">Delivery History</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Walang active deliveries</p>
              </CardContent>
            </Card>
          ) : (
            activeDeliveries.map((delivery: any) => (
              <Card key={delivery.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Order #{delivery.orderNumber}</CardTitle>
                      <CardDescription>{delivery.restaurantName}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(delivery.status)}>
                      {delivery.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Pickup Location:</p>
                      <p className="text-sm text-gray-600">{delivery.pickupAddress}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Delivery Location:</p>
                      <p className="text-sm text-gray-600">{delivery.deliveryAddress}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">{delivery.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">₱{delivery.totalAmount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {delivery.status === "ready" && (
                      <Button 
                        className="flex-1"
                        onClick={() => updateDeliveryStatusMutation.mutate({ 
                          orderId: delivery.id, 
                          status: "picked_up" 
                        })}
                        data-testid={`button-pickup-${delivery.id}`}
                      >
                        Mark as Picked Up
                      </Button>
                    )}
                    {delivery.status === "picked_up" && (
                      <Button 
                        className="flex-1"
                        onClick={() => updateDeliveryStatusMutation.mutate({ 
                          orderId: delivery.id, 
                          status: "in_transit" 
                        })}
                        data-testid={`button-transit-${delivery.id}`}
                      >
                        Start Delivery
                      </Button>
                    )}
                    {delivery.status === "in_transit" && (
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => updateDeliveryStatusMutation.mutate({ 
                          orderId: delivery.id, 
                          status: "delivered" 
                        })}
                        data-testid={`button-complete-${delivery.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Complete Delivery
                      </Button>
                    )}
                    <Button variant="outline" className="flex-1">
                      <Navigation className="h-4 w-4 mr-2" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Order Available!</CardTitle>
              <CardDescription>Jollibee - Batangas City</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Distance</p>
                  <p className="font-medium">3.5 km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimated Earnings</p>
                  <p className="font-medium text-green-600">₱85</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => acceptDeliveryMutation.mutate("order-id")}
                  data-testid="button-accept"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept
                </Button>
                <Button variant="outline" className="flex-1">
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {deliveryHistory.map((delivery: any) => (
            <Card key={delivery.id}>
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <CardTitle className="text-base">Order #{delivery.orderNumber}</CardTitle>
                    <CardDescription>{new Date(delivery.completedAt).toLocaleDateString()}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₱{delivery.earnings}</p>
                    <Badge variant={delivery.status === "delivered" ? "default" : "destructive"}>
                      {delivery.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}