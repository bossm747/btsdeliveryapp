import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Home, Package, Clock, Star, TrendingUp, 
  ShoppingBag, CreditCard, Navigation, Phone, 
  User, Bell, Settings, Menu, LogOut, Award,
  MapPin, Truck, Heart, Gift, Wallet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import btsLogo from "@assets/bts-logo-transparent.png";

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [showMenu, setShowMenu] = useState(false);

  // Fetch customer data
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["/api/customer/profile"],
    enabled: true
  });

  // Fetch recent orders
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/customer/orders/recent"],
    refetchInterval: 30000
  });

  // Fetch favorite restaurants
  const { data: favoriteRestaurants = [] } = useQuery({
    queryKey: ["/api/customer/favorites"]
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "Successfully logged out from your account",
    });
  };

  // Mobile-first Header Component
  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img src={btsLogo} alt="BTS Delivery" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold text-[#004225]">BTS Customer</h1>
            <p className="text-xs text-gray-600">Batangas Province</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="p-2 relative">
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs bg-red-500">3</Badge>
          </Button>

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
                    <SheetDescription className="text-left">Customer ID: {user?.id?.slice(0, 8)}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("profile"); setShowMenu(false); }}>
                    <User className="w-4 h-4 mr-3" />
                    My Profile
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("wallet"); setShowMenu(false); }}>
                    <Wallet className="w-4 h-4 mr-3" />
                    Wallet & Payments
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("rewards"); setShowMenu(false); }}>
                    <Gift className="w-4 h-4 mr-3" />
                    Rewards & Points
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("favorites"); setShowMenu(false); }}>
                    <Heart className="w-4 h-4 mr-3" />
                    Favorites
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
  const QuickStats = () => (
    <div className="px-4 py-3 bg-gradient-to-r from-[#004225] to-green-700">
      <div className="grid grid-cols-3 gap-4 text-white">
        <div className="text-center">
          <div className="text-lg font-bold">{customerData?.totalOrders || "0"}</div>
          <div className="text-xs opacity-90">Orders</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{customerData?.loyaltyPoints || "0"}</div>
          <div className="text-xs opacity-90">Points</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">₱{customerData?.totalSaved || "0"}</div>
          <div className="text-xs opacity-90">Saved</div>
        </div>
      </div>
    </div>
  );

  // Service Cards Component
  const ServiceCards = () => (
    <div className="px-4 py-4">
      <h3 className="font-semibold text-[#004225] mb-3">Our Services</h3>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/restaurants">
          <Card className="border-l-4 border-l-[#FF6B35] cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-[#FF6B35]" />
              <h4 className="font-medium text-sm">Food Delivery</h4>
              <p className="text-xs text-gray-600">Order from restaurants</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/pabili">
          <Card className="border-l-4 border-l-green-600 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <h4 className="font-medium text-sm">Pabili Service</h4>
              <p className="text-xs text-gray-600">Shopping assistance</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/pabayad">
          <Card className="border-l-4 border-l-blue-600 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h4 className="font-medium text-sm">Pabayad Service</h4>
              <p className="text-xs text-gray-600">Bills payment</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/parcel">
          <Card className="border-l-4 border-l-purple-600 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Truck className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <h4 className="font-medium text-sm">Parcel Delivery</h4>
              <p className="text-xs text-gray-600">Package delivery</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );

  // Recent Orders Component
  const RecentOrders = () => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#004225]">Recent Orders</h3>
        <Link href="/customer-orders">
          <Button variant="ghost" size="sm" className="text-[#FF6B35]">View All</Button>
        </Link>
      </div>
      
      {recentOrders.length > 0 ? (
        <div className="space-y-3">
          {recentOrders.slice(0, 3).map((order: any) => (
            <Card key={order.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Order #{order.orderNumber}</div>
                  <Badge variant={order.status === "delivered" ? "default" : "secondary"}>
                    {order.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {order.restaurant?.name || "Unknown Restaurant"}
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
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No recent orders</p>
          <p className="text-sm">Start ordering to see your history here</p>
        </div>
      )}
    </div>
  );

  // Mobile Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 text-center">
        {[
          { id: "home", icon: Home, label: "Home", path: "/customer-dashboard" },
          { id: "restaurants", icon: ShoppingBag, label: "Food", path: "/restaurants" },
          { id: "orders", icon: Package, label: "Orders", path: "/customer-orders" },
          { id: "tracking", icon: MapPin, label: "Track", path: "/order-tracking" },
          { id: "profile", icon: User, label: "Profile", path: "#" }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === "home" && activeTab === "home");
          
          return tab.path === "#" ? (
            <button
              key={tab.id}
              onClick={() => { setActiveTab("profile"); setShowMenu(true); }}
              className={`py-3 px-2 transition-colors ${
                isActive 
                  ? 'text-[#FF6B35] bg-orange-50' 
                  : 'text-gray-600 hover:text-[#FF6B35]'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${isActive ? 'text-[#FF6B35]' : ''}`} />
              <div className="text-xs font-medium">{tab.label}</div>
            </button>
          ) : (
            <Link key={tab.id} href={tab.path}>
              <div className={`py-3 px-2 transition-colors ${
                isActive 
                  ? 'text-[#FF6B35] bg-orange-50' 
                  : 'text-gray-600 hover:text-[#FF6B35]'
              }`}>
                <Icon className={`w-5 h-5 mx-auto mb-1 ${isActive ? 'text-[#FF6B35]' : ''}`} />
                <div className="text-xs font-medium">{tab.label}</div>
              </div>
            </Link>
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
            <ServiceCards />
            <RecentOrders />
          </div>
        );
    }
  };

  if (customerLoading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="customer-dashboard">
      <MobileHeader />
      {renderContent()}
      <BottomNav />
    </div>
  );
}