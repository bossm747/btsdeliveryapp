import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, Users, Store, Package, DollarSign, BarChart3,
  Settings, Menu, LogOut, AlertCircle, CheckCircle, XCircle,
  TrendingUp, Activity, Bell, Eye, UserCheck, Truck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import btsLogo from "@assets/bts-logo-transparent.png";

export default function AdminDashboardMobile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("home");
  const [showMenu, setShowMenu] = useState(false);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch pending approvals
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ["/api/admin/pending-approvals"]
  });

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ["/api/admin/activities/recent"]
  });

  // Handle logout
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "Successfully logged out from admin account",
    });
  };

  // Mobile-first Header Component
  const MobileHeader = () => (
    <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <img src={btsLogo} alt="BTS Delivery" className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold text-[#004225]">BTS Admin</h1>
            <p className="text-xs text-gray-600">Batangas Province</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* System Status */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-600">System Online</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="p-2 relative">
            <Bell className="w-5 h-5" />
            {pendingApprovals.length > 0 && (
              <Badge className="absolute -top-1 -right-1 w-4 h-4 p-0 text-xs bg-red-500">
                {pendingApprovals.length}
              </Badge>
            )}
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
                      <Shield className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-left">{user?.firstName} {user?.lastName}</SheetTitle>
                    <SheetDescription className="text-left">System Administrator</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="space-y-3">
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("users"); setShowMenu(false); }}>
                    <Users className="w-4 h-4 mr-3" />
                    User Management
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("restaurants"); setShowMenu(false); }}>
                    <Store className="w-4 h-4 mr-3" />
                    Restaurant Management
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("riders"); setShowMenu(false); }}>
                    <Truck className="w-4 h-4 mr-3" />
                    Rider Management
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("analytics"); setShowMenu(false); }}>
                    <BarChart3 className="w-4 h-4 mr-3" />
                    System Analytics
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => { setActiveTab("settings"); setShowMenu(false); }}>
                    <Settings className="w-4 h-4 mr-3" />
                    System Settings
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
      <div className="grid grid-cols-4 gap-3 text-white">
        <div className="text-center">
          <div className="text-lg font-bold">{stats?.totalUsers || "0"}</div>
          <div className="text-xs opacity-90">Users</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{stats?.totalRestaurants || "0"}</div>
          <div className="text-xs opacity-90">Restaurants</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{stats?.totalRiders || "0"}</div>
          <div className="text-xs opacity-90">Riders</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold">{stats?.todayOrders || "0"}</div>
          <div className="text-xs opacity-90">Today Orders</div>
        </div>
      </div>
    </div>
  );

  // Pending Approvals Component
  const PendingApprovals = () => (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[#004225] flex items-center">
          <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
          Pending Approvals
        </h3>
        <Badge className="bg-orange-100 text-orange-800">{pendingApprovals.length}</Badge>
      </div>
      
      {pendingApprovals.length > 0 ? (
        <div className="space-y-3">
          {pendingApprovals.slice(0, 5).map((item: any) => (
            <Card key={item.id} className="border-l-4 border-l-orange-500 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-600">{item.type} • {item.email}</div>
                  </div>
                  <Badge variant="secondary">{item.status}</Badge>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-4"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-4"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No pending approvals</p>
          <p className="text-sm">All applications are up to date</p>
        </div>
      )}
    </div>
  );

  // System Overview Component
  const SystemOverview = () => (
    <div className="px-4 py-3">
      <h3 className="font-semibold text-[#004225] mb-3">System Overview</h3>
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-lg font-bold">{stats?.activeOrders || "0"}</div>
            <div className="text-sm text-gray-600">Active Orders</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <div className="text-lg font-bold">₱{stats?.todayRevenue || "0"}</div>
            <div className="text-sm text-gray-600">Today Revenue</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <div className="text-lg font-bold">{stats?.growthRate || "0"}%</div>
            <div className="text-sm text-gray-600">Growth Rate</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
            <div className="text-lg font-bold">{stats?.issuesReported || "0"}</div>
            <div className="text-sm text-gray-600">Issues Reported</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Quick Actions Component
  const QuickActions = () => (
    <div className="px-4 py-3">
      <h3 className="font-semibold text-[#004225] mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("users")}>
          <Users className="w-6 h-6 mb-1 text-blue-600" />
          <span className="text-sm">Manage Users</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("restaurants")}>
          <Store className="w-6 h-6 mb-1 text-green-600" />
          <span className="text-sm">Restaurants</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("analytics")}>
          <BarChart3 className="w-6 h-6 mb-1 text-purple-600" />
          <span className="text-sm">Analytics</span>
        </Button>
        
        <Button variant="outline" className="h-16 flex-col" onClick={() => setActiveTab("settings")}>
          <Settings className="w-6 h-6 mb-1 text-gray-600" />
          <span className="text-sm">Settings</span>
        </Button>
      </div>
    </div>
  );

  // Mobile Bottom Navigation
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 text-center">
        {[
          { id: "home", icon: Shield, label: "Home" },
          { id: "users", icon: Users, label: "Users" },
          { id: "restaurants", icon: Store, label: "Stores" },
          { id: "orders", icon: Package, label: "Orders" },
          { id: "analytics", icon: BarChart3, label: "Reports" }
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
            <PendingApprovals />
            <SystemOverview />
            <QuickActions />
          </div>
        );
    }
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#FF6B35] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <MobileHeader />
      {renderContent()}
      <BottomNav />
    </div>
  );
}