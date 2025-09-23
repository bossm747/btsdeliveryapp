import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Store, Package, Clock, DollarSign, Star, TrendingUp, 
  ShoppingBag, Plus, Edit, Eye, Settings, Menu, LogOut,
  CheckCircle, XCircle, AlertCircle, BarChart3, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import btsLogo from "@assets/bts-logo-transparent.png";

export default function VendorDashboardMobile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("home");
  const [showMenu, setShowMenu] = useState(false);

  // Mock restaurant ID - using actual seeded restaurant UUID
  const MOCK_RESTAURANT_ID = "5e07adaf-324d-429e-9727-9a91da7774ce";

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ["/api/restaurants", MOCK_RESTAURANT_ID],
  });

  // Fetch restaurant orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders", { restaurantId: MOCK_RESTAURANT_ID }],
    queryFn: async () => {
      const response = await fetch(`/api/orders?restaurantId=${MOCK_RESTAURANT_ID}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    }
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/restaurants", MOCK_RESTAURANT_ID, "menu"],
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "Successfully logged out from your account",
    });
  };

  // Update order status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string, status: string }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Updated",
        description: "Order status has been updated successfully",
      });
    }
  });

  // Mobile-first Header Component
  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img src={btsLogo} alt="BTS Delivery" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold text-[#004225]">BTS Vendor</h1>
            <p className="text-xs text-gray-600">{restaurant?.name || "Restaurant"}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Restaurant Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${restaurant?.isOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-xs text-gray-600">{restaurant?.isOpen ? 'Open' : 'Closed'}</span>
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
                    <AvatarImage src={restaurant?.image} />
                    <AvatarFallback className="bg-gradient-to-br from-[#FF6B35] to-[#FFD23F] text-white">
                      {restaurant?.name?.charAt(0) || "R"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-left">{restaurant?.name}</SheetTitle>
                    <SheetDescription className="text-left">Restaurant ID: {restaurant?.id?.slice(0, 8)}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("profile"); setShowMenu(false); }}>
                    <Store className="w-4 h-4 mr-3" />
                    Restaurant Profile
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("menu"); setShowMenu(false); }}>
                    <ShoppingBag className="w-4 h-4 mr-3" />
                    Menu Management
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("analytics"); setShowMenu(false); }}>
                    <BarChart3 className="w-4 h-4 mr-3" />
                    Analytics
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("settings"); setShowMenu(false); }}>
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
  const QuickStats = () => {
    const todayOrders = orders.filter((order: any) => 
      new Date(order.createdAt).toDateString() === new Date().toDateString()
    );
    const pendingOrders = orders.filter((order: any) => 
      ["pending", "confirmed"].includes(order.status)
    );
    const todayRevenue = todayOrders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);

    return (
      <div className="px-4 py-3 bg-gradient-to-r from-[#004225] to-green-700">
        <div className="grid grid-cols-3 gap-4 text-white">
          <div className="text-center">
            <div className="text-lg font-bold">₱{todayRevenue}</div>
            <div className="text-xs opacity-90">Today</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{pendingOrders.length}</div>
            <div className="text-xs opacity-90">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{restaurant?.rating || "0"}</div>
            <div className="text-xs opacity-90">Rating</div>
          </div>
        </div>
      </div>
    );
  };

  // Pending Orders Component
  const PendingOrders = () => {
    const pendingOrders = orders.filter((order: any) => 
      ["pending", "confirmed"].includes(order.status)
    );

    return (
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#004225] flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
            Pending Orders
          </h3>
          <Badge className="bg-orange-100 text-orange-800">{pendingOrders.length}</Badge>
        </div>
        
        {pendingOrders.length > 0 ? (
          <div className="space-y-3">
            {pendingOrders.slice(0, 5).map((order: any) => (
              <Card key={order.id} className="border-l-4 border-l-orange-500 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">Order #{order.orderNumber}</div>
                    <div className="text-sm font-medium text-green-600">₱{order.totalAmount}</div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-3">
                    <div>Customer: {order.customer?.name || "Anonymous"}</div>
                    <div>Items: {order.items?.length || 0} items</div>
                    <div>Time: {new Date(order.createdAt).toLocaleTimeString()}</div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      onClick={() => updateOrderStatusMutation.mutate({
                        orderId: order.id,
                        status: "confirmed"
                      })}
                      disabled={updateOrderStatusMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => updateOrderStatusMutation.mutate({
                        orderId: order.id,
                        status: "cancelled"
                      })}
                      disabled={updateOrderStatusMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="px-4"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending orders</p>
            <p className="text-sm">New orders will appear here</p>
          </div>
        )}
      </div>
    );
  };

  // Quick Actions Component
  const QuickActions = () => (
    <div className="px-4 py-3">
      <h3 className="font-semibold text-[#004225] mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("menu")}>
          <Plus className="w-6 h-6 mb-1 text-[#FF6B35]" />
          <span className="text-sm">Add Menu Item</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("orders")}>
          <Eye className="w-6 h-6 mb-1 text-blue-600" />
          <span className="text-sm">View All Orders</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("analytics")}>
          <BarChart3 className="w-6 h-6 mb-1 text-green-600" />
          <span className="text-sm">Analytics</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("profile")}>
          <Settings className="w-6 h-6 mb-1 text-purple-600" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 text-center">
        {[
          { id: "home", icon: Store, label: "Home" },
          { id: "orders", icon: Package, label: "Orders" },
          { id: "menu", icon: ShoppingBag, label: "Menu" },
          { id: "analytics", icon: BarChart3, label: "Analytics" }
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

  // Main Content Renderer
  const renderContent = () => {
    switch (activeTab) {
      case "home":
      default:
        return (
          <div className="pb-20">
            <QuickStats />
            <PendingOrders />
            <QuickActions />
          </div>
        );
      case "orders":
        return (
          <div className="pb-20 px-4 py-3">
            <h2 className="text-lg font-bold text-[#004225] mb-4">All Orders</h2>
            <div className="space-y-3">
              {orders.map((order: any) => (
                <Card key={order.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">Order #{order.orderNumber}</div>
                      <Badge variant={
                        order.status === "delivered" ? "default" :
                        order.status === "cancelled" ? "destructive" : "secondary"
                      }>
                        {order.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {order.customer?.name || "Anonymous"} • {order.items?.length || 0} items
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-green-600">₱{order.totalAmount}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
    }
  };

  if (restaurantLoading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendor dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="vendor-dashboard">
      <MobileHeader />
      {renderContent()}
      <BottomNav />
    </div>
  );
}