import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import LeafletRiderMapTracking from "@/components/rider/leaflet-rider-map-tracking";
import DeliveryWorkflowManager from "@/components/rider/delivery-workflow-manager";
import LeafletLiveTrackingMap from "@/components/shared/leaflet-live-tracking-map";
import { RiderPageWrapper } from "@/components/rider/rider-page-wrapper";
import { RiderDashboardSkeleton, RiderDeliveryCardSkeleton } from "@/components/rider/rider-skeletons";
import { NoActiveDeliveriesEmptyState } from "@/components/rider/rider-empty-states";
import {
  MapPin, Package, Clock, DollarSign, Star, TrendingUp,
  Navigation, Phone, CheckCircle, XCircle, AlertCircle,
  Activity, Zap, Shield, Brain, BarChart3, User, Bell,
  Settings, Wallet, ChevronRight, Menu, Home, Map,
  Truck, Target, Award, RotateCcw, Eye, LogOut,
  Wifi, WifiOff, CircleDot, Plus, Minus, MessageCircle
} from "lucide-react";
import { useRiderToast } from "@/hooks/use-rider-toast";
import { useRiderWebSocket } from "@/hooks/use-websocket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import btsLogo from "@assets/bts-logo-transparent.png";
import OrderChat, { ChatButton } from "@/components/order-chat";

export default function RiderDashboard() {
  const { user, logout } = useAuth();
  const riderToast = useRiderToast();
  const localQueryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Fetch rider data
  const { data: riderData = {}, isLoading: riderLoading } = useQuery<{
    id?: string;
    todayEarnings?: number;
    rating?: number;
    [key: string]: any;
  }>({
    queryKey: ["/api/rider/profile"],
    enabled: true
  });

  // WebSocket connection for real-time order alerts and updates
  const {
    status: wsStatus,
    isAuthenticated: wsAuthenticated,
    latestAlert,
    newOrderAlerts,
    acknowledgeAlert,
    sendRiderLocation,
  } = useRiderWebSocket(riderData?.id, {
    onConnect: () => setWsConnected(true),
    onDisconnect: () => setWsConnected(false),
    onVendorAlert: (alert) => {
      // Handle new order assignments in real-time
      if (alert.type === 'new_order' || alert.type === 'rider_assigned') {
        // Invalidate pending assignments to refresh
        localQueryClient.invalidateQueries({ queryKey: [`/api/riders/${riderData?.id}/pending-assignments`] });
        
        // Show toast notification
        riderToast.newOrderAvailable(alert.orderNumber || alert.orderId);
      }
    },
    onOrderStatusUpdate: (update) => {
      // Invalidate active deliveries when order status changes
      localQueryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries/active"] });
    },
    onMessage: (message) => {
      // Handle rider-specific messages
      if (message.type === 'new_assignment' || message.type === 'order_assigned') {
        localQueryClient.invalidateQueries({ queryKey: [`/api/riders/${riderData?.id}/pending-assignments`] });
        riderToast.newOrderAvailable(message.orderNumber || message.orderId);
      }
    },
  });

  // Update wsConnected state when WebSocket status changes
  useEffect(() => {
    setWsConnected(wsStatus === 'connected' || wsStatus === 'authenticated');
  }, [wsStatus]);

  // Sync isOnline state from rider profile data
  useEffect(() => {
    if (riderData?.isOnline !== undefined) {
      setIsOnline(riderData.isOnline);
    }
  }, [riderData?.isOnline]);

  // Fetch active deliveries - reduced polling when WebSocket is connected
  const { data: activeDeliveries = [], isLoading: deliveriesLoading } = useQuery<any[]>({
    queryKey: ["/api/rider/deliveries/active"],
    refetchInterval: wsConnected ? 60000 : 10000
  });

  // Fetch delivery history
  const { data: deliveryHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/rider/deliveries/history"]
  });

  // Fetch pending assignments - reduced polling when WebSocket is connected
  const { data: pendingAssignments = [] } = useQuery<any[]>({
    queryKey: [`/api/riders/${riderData?.id}/pending-assignments`],
    enabled: !!riderData?.id,
    refetchInterval: wsConnected ? 30000 : 5000
  });

  // Send location updates via WebSocket when online
  const sendLocationUpdate = useCallback(() => {
    if (wsConnected && wsAuthenticated && currentLocation && isOnline) {
      sendRiderLocation({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      });
    }
  }, [wsConnected, wsAuthenticated, currentLocation, isOnline, sendRiderLocation]);

  // Send location updates periodically when online
  useEffect(() => {
    if (!isOnline || !currentLocation) return;

    // Send initial location
    sendLocationUpdate();

    // Send location every 10 seconds
    const interval = setInterval(sendLocationUpdate, 10000);

    return () => clearInterval(interval);
  }, [isOnline, currentLocation, sendLocationUpdate]);

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
      if (isOnline) {
        riderToast.wentOnline();
      } else {
        riderToast.wentOffline();
      }
    }
  });

  // Accept delivery
  const acceptDeliveryMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/rider/deliveries/${orderId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
      riderToast.deliveryAccepted();
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
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Handle online status toggle
  const handleStatusToggle = (online: boolean) => {
    setIsOnline(online);
    updateStatusMutation.mutate(online);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    riderToast.success("Successfully logged out from your account");
  };

  // Mobile-first Header Component
  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img src={btsLogo} alt="BTS Delivery" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold text-[#004225]">BTS Rider</h1>
            <p className="text-xs text-gray-600">Batangas Province</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* WebSocket Status Indicator */}
          <div className="flex items-center" title={wsConnected ? 'Real-time updates active' : 'Connecting...'}>
            {wsConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-gray-400" />
            )}
          </div>

          {/* Online Status Toggle */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <Switch
              checked={isOnline}
              onCheckedChange={handleStatusToggle}
              disabled={updateStatusMutation.isPending}
            />
          </div>

          {/* Menu Trigger */}
          <Sheet open={showMenu} onOpenChange={setShowMenu}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] text-white">
                      {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-left">{user?.firstName} {user?.lastName}</SheetTitle>
                    <SheetDescription className="text-left">Rider ID: {riderData?.id?.slice(0, 8)}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setShowMenu(false); }}>
                    <User className="w-4 h-4 mr-3" />
                    Profile
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/rider-dashboard/pending-orders"); setShowMenu(false); }}>
                    <Package className="w-4 h-4 mr-3" />
                    Available Orders
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/rider-dashboard/earnings"); setShowMenu(false); }}>
                    <Wallet className="w-4 h-4 mr-3" />
                    Earnings
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate("/rider-dashboard/performance"); setShowMenu(false); }}>
                    <Award className="w-4 h-4 mr-3" />
                    Performance
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setShowMenu(false); }}>
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </Button>
                </div>

                <Separator />

                <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-3" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );

  // Quick Stats Component
  const QuickStats = () => (
    <div className="px-4 py-3 bg-gradient-to-r from-[#004225] to-green-700">
      <div className="grid grid-cols-3 gap-4 text-white">
        <div className="text-center">
          <div className="text-lg font-bold">₱{riderData?.todayEarnings || "0"}</div>
          <div className="text-xs opacity-90">Today</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{Array.isArray(activeDeliveries) ? activeDeliveries.length : 0}</div>
          <div className="text-xs opacity-90">Active</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{riderData?.rating || "0"}</div>
          <div className="text-xs opacity-90">Rating</div>
        </div>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 text-center">
        {[
          { id: "home", icon: Home, label: "Home" },
          { id: "map", icon: Map, label: "Map" },
          { id: "deliveries", icon: Package, label: "Orders" },
          { id: "history", icon: Clock, label: "History" }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-2 transition-colors ${
                isActive 
                  ? 'text-[#FF6B35] bg-orange-50' 
                  : 'text-gray-600 hover:text-[#FF6B35]'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${isActive ? 'text-[#FF6B35]' : ''}`} />
              <div className="text-xs font-medium">{tab.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Pending Assignments Component
  const PendingAssignments = () => (
    <div className="px-4 py-3">
      {Array.isArray(pendingAssignments) && pendingAssignments.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-[#004225] flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
            New Delivery Requests
          </h3>
          {Array.isArray(pendingAssignments) && pendingAssignments.map((assignment: any) => (
            <Card key={assignment.id} className="border-l-4 border-l-orange-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                  <div className="text-sm font-medium text-green-600">₱{assignment.estimatedValue}</div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {assignment.restaurantLocation.address}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Navigation className="w-4 h-4 mr-2" />
                    {assignment.deliveryLocation.address}
                  </div>
                </div>
                <div className="flex space-x-2 mt-3">
                  <Button
                    onClick={() => acceptDeliveryMutation.mutate(assignment.orderId)}
                    disabled={acceptDeliveryMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button variant="outline" size="sm" className="px-4">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Handle delivery status updates from workflow manager
  const handleDeliveryStatusUpdate = (orderId: string, status: string, data?: any) => {
    updateDeliveryStatusMutation.mutate({ orderId, status });
    // Refresh active deliveries
    localQueryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries/active"] });
  };

  // Active Deliveries Component - now using DeliveryWorkflowManager with Live Map
  const ActiveDeliveries = () => (
    <div className="px-4 py-3 space-y-4">
      {Array.isArray(activeDeliveries) && activeDeliveries.length > 0 ? (
        <>
          {/* Live Tracking Map for rider's active deliveries */}
          <LeafletLiveTrackingMap
            userRole="rider"
            apiEndpoint="/api/rider/deliveries/active"
            title="Your Deliveries"
            showList={false}
            height="250px"
          />
          {/* Delivery Workflow Manager for status updates */}
          <DeliveryWorkflowManager
            riderId={riderData?.id || ''}
            activeOrders={activeDeliveries}
            onStatusUpdate={handleDeliveryStatusUpdate}
          />
        </>
      ) : (
        <NoActiveDeliveriesEmptyState
          onGoOnline={!isOnline ? () => handleStatusToggle(true) : undefined}
        />
      )}
    </div>
  );

  // Helper functions
  const getDeliveryProgress = (status: string) => {
    switch (status) {
      case "confirmed": return 25;
      case "preparing": return 50;
      case "picked_up": return 75;
      case "delivered": return 100;
      default: return 0;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "confirmed": return "picked_up";
      case "picked_up": return "delivered";
      default: return currentStatus;
    }
  };

  // Quick Access Navigation Cards
  const QuickAccessCards = () => (
    <div className="px-4 py-3">
      <h3 className="font-semibold text-[#004225] mb-3 flex items-center">
        <Zap className="w-4 h-4 mr-2 text-[#FF6B35]" />
        Quick Access
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <Card
          className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/rider-dashboard/pending-orders")}
        >
          <CardContent className="p-3 text-center">
            <div className="bg-orange-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Package className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-orange-800">Find Orders</p>
          </CardContent>
        </Card>
        <Card
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/rider-dashboard/earnings")}
        >
          <CardContent className="p-3 text-center">
            <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-green-800">Earnings</p>
          </CardContent>
        </Card>
        <Card
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/rider-dashboard/performance")}
        >
          <CardContent className="p-3 text-center">
            <div className="bg-purple-500 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Award className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs font-medium text-purple-800">Performance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Main Content Renderer
  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="pb-20">
            <QuickStats />
            <QuickAccessCards />
            <PendingAssignments />
            <ActiveDeliveries />
          </div>
        );
      case "map":
        return (
          <div className="pb-20 h-screen">
            <LeafletRiderMapTracking riderId={riderData?.id || ''} />
          </div>
        );
      case "deliveries":
        return (
          <div className="pb-20 px-4 py-3">
            <h2 className="text-lg font-bold text-[#004225] mb-4">All Orders</h2>
            <ActiveDeliveries />
          </div>
        );
      case "history":
        return (
          <div className="pb-20 px-4 py-3">
            <h2 className="text-lg font-bold text-[#004225] mb-4">Delivery History</h2>
            <div className="space-y-3">
              {Array.isArray(deliveryHistory) && deliveryHistory.map((delivery: any) => (
                <Card key={delivery.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Order #{delivery.orderNumber}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(delivery.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">₱{delivery.totalAmount}</div>
                        <Badge variant="outline">{delivery.status}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (riderLoading || deliveriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RiderDashboardSkeleton />
      </div>
    );
  }

  return (
    <RiderPageWrapper
      pageTitle="Rider Dashboard"
      pageDescription="Manage your deliveries, earnings, and performance"
    >
      <div className="min-h-screen bg-gray-50" data-testid="rider-dashboard">
        <MobileHeader />
        {renderContent()}
        <BottomNav />

        {/* Chat with Customer */}
        {chatOrderId && (
          <OrderChat
            orderId={chatOrderId}
            open={!!chatOrderId}
            onOpenChange={(open) => !open && setChatOrderId(null)}
          />
        )}
      </div>
    </RiderPageWrapper>
  );
}