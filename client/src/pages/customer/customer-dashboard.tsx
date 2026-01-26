import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Package, ShoppingBag, CreditCard,
  User, Bell, Menu, LogOut,
  MapPin, Truck, Heart, Gift, Wallet,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "wouter";
import btsLogo from "@assets/bts-logo-transparent.png";

// Import new components
import PromoBannerCarousel from "@/components/customer/promo-banner-carousel";
import CategoryPills from "@/components/customer/category-pills";
import FlashDealsSection from "@/components/customer/flash-deals-section";
import TrendingSection from "@/components/customer/trending-section";
import FeaturedCarousel from "@/components/customer/featured-carousel";
import CustomerPageWrapper from "@/components/customer/customer-page-wrapper";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { DashboardSkeleton } from "@/components/skeletons";
import LiveOrderTracker from "@/components/shared/live-order-tracker";

interface CustomerProfile {
  totalOrders?: number;
  totalSaved?: number;
  [key: string]: any;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  restaurantName: string;
  restaurant?: { name: string };
}

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);

  // Fetch customer data with proper typing
  const { data: customerData = {} as CustomerProfile, isLoading: customerLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/customer/profile"],
    enabled: true
  });

  // Fetch recent orders with proper typing
  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery<RecentOrder[]>({
    queryKey: ["/api/customer/orders/recent"],
    refetchInterval: 30000
  });

  // Fetch loyalty points
  const { data: loyaltyData } = useQuery<{
    points: number;
    tier: string;
    lifetimePoints: number;
  }>({
    queryKey: ["/api/loyalty/points"]
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "Successfully logged out from your account",
    });
  };

  // Calculate active orders count (orders that are pending, preparing, or on the way)
  const activeOrdersCount = recentOrders.filter(
    (order) => !["delivered", "cancelled", "completed"].includes(order.status.toLowerCase())
  ).length;

  // Mobile-first Header Component
  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img src={btsLogo} alt="BTS Delivery" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold text-[#004225]">BTS Delivery</h1>
            <p className="text-xs text-gray-600 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              Batangas Province
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Notifications - shows active orders count */}
          <Link href="/customer-orders">
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="w-5 h-5" />
              {activeOrdersCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs bg-red-500">
                  {activeOrdersCount > 9 ? "9+" : activeOrdersCount}
                </Badge>
              )}
            </Button>
          </Link>

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
                <div className="space-y-1">
                  <Link href="/profile-settings" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <User className="w-4 h-4 mr-3" />
                      My Profile
                    </Button>
                  </Link>
                  <Link href="/wallet" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Wallet className="w-4 h-4 mr-3" />
                      Wallet & Payments
                    </Button>
                  </Link>
                  <Link href="/loyalty" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Gift className="w-4 h-4 mr-3" />
                      Rewards & Points
                    </Button>
                  </Link>
                  <Link href="/favorites" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Heart className="w-4 h-4 mr-3" />
                      Favorites
                    </Button>
                  </Link>
                  <Link href="/addresses" onClick={() => setShowMenu(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <MapPin className="w-4 h-4 mr-3" />
                      My Addresses
                    </Button>
                  </Link>
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

  // Quick Stats Component - Enhanced
  const QuickStats = () => (
    <div className="px-4 py-4 bg-gradient-to-r from-[#004225] to-green-700">
      <div className="grid grid-cols-3 gap-4 text-white">
        <Link href="/customer-orders" className="text-center cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-bold">{customerData?.totalOrders || "0"}</div>
          <div className="text-xs opacity-90">Orders</div>
        </Link>
        <Link href="/loyalty" className="text-center cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-bold">{loyaltyData?.points?.toLocaleString() || "0"}</div>
          <div className="text-xs opacity-90">Points</div>
        </Link>
        <Link href="/wallet" className="text-center cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-2xl font-bold">PHP {customerData?.totalSaved || "0"}</div>
          <div className="text-xs opacity-90">Saved</div>
        </Link>
      </div>
    </div>
  );

  // Service Cards Component - Enhanced with modern styling
  const ServiceCards = () => (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#004225] text-lg">Our Services</h3>
        <Link href="/services">
          <Button variant="ghost" size="sm" className="text-[#FF6B35] font-medium text-sm">
            View All
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/restaurants">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group border-0 shadow-md">
            <div className="h-2 bg-gradient-to-r from-[#FF6B35] to-[#FFD23F]" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#FF6B35]/10 to-[#FFD23F]/10 group-hover:from-[#FF6B35]/20 group-hover:to-[#FFD23F]/20 transition-colors">
                  <ShoppingBag className="w-6 h-6 text-[#FF6B35]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">Food Delivery</h4>
                  <p className="text-xs text-gray-500">Order from restaurants</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pabili">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group border-0 shadow-md">
            <div className="h-2 bg-gradient-to-r from-green-500 to-green-400" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors">
                  <Package className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">Pabili Service</h4>
                  <p className="text-xs text-gray-500">Shopping assistance</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pabayad">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group border-0 shadow-md">
            <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-400" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">Pabayad Service</h4>
                  <p className="text-xs text-gray-500">Bills payment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/parcel">
          <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden group border-0 shadow-md">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-400" />
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-purple-100 transition-colors">
                  <Truck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900">Parcel Delivery</h4>
                  <p className="text-xs text-gray-500">Package delivery</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );

  // Recent Orders Component - Enhanced
  const RecentOrders = () => (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#004225] text-lg">Recent Orders</h3>
        <Link href="/customer-orders">
          <Button variant="ghost" size="sm" className="text-[#FF6B35] font-medium text-sm">
            View All
          </Button>
        </Link>
      </div>

      {recentOrders.length > 0 ? (
        <div className="space-y-3">
          {recentOrders.slice(0, 3).map((order: RecentOrder) => (
            <Link key={order.id} href={`/order/${order.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-gray-900">Order #{order.orderNumber}</div>
                    <Badge
                      variant={order.status === "delivered" ? "default" : "secondary"}
                      className={order.status === "delivered"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : order.status === "preparing"
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-100"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {order.restaurant?.name || "Unknown Restaurant"}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#004225]">PHP {order.totalAmount}</div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
          <CardContent className="text-center py-8">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">No recent orders</p>
            <p className="text-sm text-gray-400 mb-4">Start ordering to see your history here</p>
            <Link href="/restaurants">
              <Button size="sm" className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                Order Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Main Content - displays the dashboard home with new layout
  const MainContent = () => (
    <div className="pb-20">
      {/* Hero Promo Banner */}
      <div className="pt-4">
        <PromoBannerCarousel />
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Live Order Tracking - Shows active orders with real-time updates */}
      <div className="px-4 py-3">
        <LiveOrderTracker
          userRole="customer"
          apiEndpoint="/api/customer/orders/recent"
          title="Your Active Orders"
          maxOrders={3}
          compact={false}
        />
      </div>

      {/* Category Pills */}
      <CategoryPills />

      {/* Flash Deals - Time Limited */}
      <FlashDealsSection />

      {/* Service Cards */}
      <ServiceCards />

      {/* Trending Restaurants */}
      <TrendingSection />

      {/* Featured Restaurants Carousel */}
      <FeaturedCarousel />

      {/* Recent Orders */}
      <RecentOrders />
    </div>
  );

  if (customerLoading || ordersLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <CustomerPageWrapper
        pageTitle="BTS Delivery Dashboard"
        pageDescription="Your personal dashboard for ordering food, tracking deliveries, and managing your account"
        refreshQueryKeys={[
          "/api/customer/profile",
          "/api/customer/orders/recent",
          "/api/restaurants",
          "/api/loyalty/points"
        ]}
      >
        <div className="min-h-screen bg-gray-50 pb-20" data-testid="customer-dashboard">
          <MobileHeader />
          <MainContent />
        </div>
      </CustomerPageWrapper>
      <MobileBottomNav />
    </>
  );
}
