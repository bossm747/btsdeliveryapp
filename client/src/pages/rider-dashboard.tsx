import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import RiderSidebar from "@/components/rider-sidebar";
import RiderPayout from "@/components/rider-payout";
import RiderMapTracking from "@/components/rider-map-tracking";
import { 
  MapPin, Package, Clock, DollarSign, Star, TrendingUp, 
  Navigation, Phone, CheckCircle, XCircle, AlertCircle,
  Activity, Zap, Shield, Brain, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RiderDashboard() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("map");
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
        title: isOnline ? "Online na kayo!" : "Offline na kayo",
        description: isOnline ? "Makakatanggap na kayo ng deliveries" : "Hindi na kayo makakatanggap ng bagong delivery",
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

  const renderMainContent = () => {
    switch (activeTab) {
      case "map":
        return (
          <div data-testid="live-tracking-content">
            <RiderMapTracking riderId={riderData?.id || "rider-1"} />
          </div>
        );

      case "active":
        return (
          <div data-testid="active-deliveries-content">
            {activeDeliveries.length > 0 ? (
              <div className="space-y-4">
                {activeDeliveries.map((delivery: any) => (
                  <Card key={delivery.id} className="border-0 shadow-lg bg-white dark:bg-gray-800 rounded-3xl overflow-hidden active:scale-[0.98] transition-transform duration-150 touch-manipulation">
                    <CardHeader className="bg-gradient-to-r from-[#FF6B35]/5 to-[#FFD23F]/5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg text-[#004225]">Order #{delivery.orderNumber}</CardTitle>
                        <Badge className={`${getStatusColor(delivery.status)} text-white rounded-full px-3 py-1`}>{delivery.status}</Badge>
                      </div>
                      <CardDescription className="text-gray-600 dark:text-gray-300">
                        {delivery.restaurant?.name} → {delivery.customer?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div className="text-center">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <MapPin className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{delivery.distance || "N/A"} km</p>
                          <p className="text-xs text-gray-500">Distance</p>
                        </div>
                        <div className="text-center">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Clock className="h-4 w-4 text-purple-600" />
                          </div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{delivery.estimatedTime || "N/A"} min</p>
                          <p className="text-xs text-gray-500">Est. Time</p>
                        </div>
                        <div className="text-center">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <p className="font-medium text-green-600">₱{delivery.earnings?.toFixed(2) || "0.00"}</p>
                          <p className="text-xs text-gray-500">Earnings</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button className="flex-1 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] hover:from-[#FF6B35]/80 hover:to-[#FFD23F]/80 text-white rounded-2xl active:scale-95 transition-all duration-150">
                          <Navigation className="w-4 h-4 mr-2" />
                          Navigate
                        </Button>
                        <Button variant="outline" className="flex-1 rounded-2xl border-2 border-gray-200 dark:border-gray-600 active:scale-95 transition-all duration-150">
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl">
                <CardContent className="py-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B35]/10 to-[#FFD23F]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-[#FF6B35]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[#004225]">No Active Deliveries</h3>
                  <p className="text-muted-foreground">
                    {isOnline 
                      ? "You're online and ready to receive delivery requests!" 
                      : "Go online to start receiving delivery requests"
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "available":
        return (
          <div>
            <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl">
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-[#004225]">No Available Orders</h3>
                <p className="text-muted-foreground">
                  New delivery opportunities will appear here
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case "history":
        return (
          <div data-testid="delivery-history-content">
            {deliveryHistory.length > 0 ? (
              <div className="space-y-4">
                {deliveryHistory.map((delivery: any) => (
                  <Card key={delivery.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Order #{delivery.orderNumber}</CardTitle>
                        <Badge variant="secondary">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                      <CardDescription>
                        Completed on {new Date(delivery.completedAt || Date.now()).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium">Restaurant</p>
                          <p className="text-muted-foreground">{delivery.restaurant?.name || "N/A"}</p>
                        </div>
                        <div>
                          <p className="font-medium">Distance</p>
                          <p className="text-muted-foreground">{delivery.distance || "N/A"} km</p>
                        </div>
                        <div>
                          <p className="font-medium">Duration</p>
                          <p className="text-muted-foreground">{delivery.duration || "N/A"} min</p>
                        </div>
                        <div>
                          <p className="font-medium">Earned</p>
                          <p className="text-green-600 font-semibold">₱{delivery.earnings?.toFixed(2) || "0.00"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl">
                <CardContent className="py-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-10 h-10 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-[#004225]">No Delivery History</h3>
                  <p className="text-muted-foreground">
                    Your completed deliveries will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "earnings":
        return (
          <div data-testid="earnings-payout-content">
            <RiderPayout />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex" data-testid="page-rider-dashboard">
      {/* Sidebar */}
      <RiderSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        riderData={{
          name: riderData?.name,
          rating: rating,
          totalDeliveries: totalDeliveries,
          earningsBalance: earnings
        }}
        isOnline={isOnline}
        activeDeliveries={activeDeliveries.length}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header - Native Mobile Style */}
        <div className="bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900/50 border-b border-gray-100 dark:border-gray-700 px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {/* Mobile Title - Always visible on mobile */}
              <h1 className="text-xl lg:text-2xl font-bold text-[#004225] lg:block truncate" data-testid="text-title">
                {activeTab === "map" ? "Live Tracking" :
                 activeTab === "active" ? "Active Deliveries" :
                 activeTab === "available" ? "Available Orders" :
                 activeTab === "history" ? "Delivery History" :
                 activeTab === "earnings" ? "Earnings & Payout" : "Dashboard"}
              </h1>
              <p className="text-muted-foreground text-sm hidden lg:block">
                {activeTab === "map" ? "Real-time GPS tracking and navigation" :
                 activeTab === "active" ? "Your current delivery assignments" :
                 activeTab === "available" ? "New delivery opportunities" :
                 activeTab === "history" ? "Your completed deliveries" :
                 activeTab === "earnings" ? "Financial overview and payouts" : "Real-time delivery management powered by AI"}
              </p>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4 ml-4">
              {/* Mobile-optimized status toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="online-status"
                  checked={isOnline}
                  onCheckedChange={(checked) => {
                    setIsOnline(checked);
                    updateStatusMutation.mutate(checked);
                  }}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-[#FF6B35] data-[state=checked]:to-[#FFD23F] scale-110"
                  data-testid="online-status-toggle"
                />
                <Label htmlFor="online-status" className="text-xs lg:text-sm font-medium">
                  {isOnline ? "Online" : "Offline"}
                </Label>
              </div>
              
              {/* Live Indicators - More compact on mobile */}
              <div className="flex items-center gap-1 lg:gap-2">
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-1.5 py-0.5 text-[10px] lg:px-2 lg:py-1 lg:text-xs rounded-full">
                  <Brain className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1" />
                  <span className="hidden lg:inline">AI</span>
                </Badge>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-1.5 py-0.5 text-[10px] lg:px-2 lg:py-1 lg:text-xs rounded-full">
                  <Activity className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1" />
                  <span className="hidden lg:inline">GPS</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area - Native Mobile Style */}
        <div className="p-4 lg:p-6 pb-20 lg:pb-6 overflow-y-auto">
          {renderMainContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation - Native App Style */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="grid grid-cols-5 py-2">
          {[
            { id: 'map', icon: MapPin, label: 'Live', color: 'text-blue-500' },
            { id: 'active', icon: Package, label: 'Active', color: 'text-orange-500', badge: activeDeliveries.length },
            { id: 'available', icon: Clock, label: 'Orders', color: 'text-green-500' },
            { id: 'history', icon: BarChart3, label: 'History', color: 'text-purple-500' },
            { id: 'earnings', icon: DollarSign, label: 'Earnings', color: 'text-yellow-500' }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-2 px-1 transition-all duration-200 active:scale-95 touch-manipulation ${
                  isActive ? 'transform -translate-y-1' : ''
                }`}
                data-testid={`bottom-nav-${item.id}`}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F] rounded-full" />
                )}
                
                {/* Icon container */}
                <div className={`relative p-2 rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-br from-[#FF6B35]/10 to-[#FFD23F]/10 shadow-lg' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                  <Icon className={`h-5 w-5 transition-colors duration-200 ${
                    isActive 
                      ? 'text-[#FF6B35]' 
                      : `${item.color} opacity-60`
                  }`} />
                  
                  {/* Badge for active deliveries */}
                  {item.badge && item.badge > 0 && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-[#FF6B35] to-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {item.badge}
                    </div>
                  )}
                </div>
                
                {/* Label */}
                <span className={`text-xs mt-1 font-medium transition-colors duration-200 ${
                  isActive 
                    ? 'text-[#FF6B35]' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Safe area for devices with home indicator */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}