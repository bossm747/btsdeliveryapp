import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, Store, Package, DollarSign, TrendingUp, AlertCircle,
  Search, CheckCircle, BarChart3
} from "lucide-react";
import { useAdminToast } from "@/hooks";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminAnalytics from "@/components/admin/admin-analytics";
import DispatchConsole from "@/components/admin/dispatch-console";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import {
  AdminPageWrapper,
  AdminDashboardSkeleton,
  AdminOrdersSkeleton,
  AdminRestaurantsSkeleton,
  AdminRidersSkeleton,
  AdminUsersSkeleton,
  NoOrdersEmptyState,
  NoRestaurantsEmptyState,
  NoRidersEmptyState,
  NoUsersEmptyState,
  UnderDevelopmentEmptyState,
} from "@/components/admin";

export default function AdminDashboard() {
  const adminToast = useAdminToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("dispatch");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch dashboard stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users", searchTerm],
  });

  // Fetch restaurants
  const { data: restaurants = [] } = useQuery({
    queryKey: ["/api/admin/restaurants"],
  });

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/admin/orders", filterStatus],
  });

  // Fetch riders
  const { data: riders = [] } = useQuery({
    queryKey: ["/api/admin/riders"],
  });

  const handleApproveRestaurant = async (restaurantId: string, restaurantName?: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/restaurants/${restaurantId}/approve`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      adminToast.restaurantApproved(restaurantName);
    } catch (error) {
      adminToast.error("Failed to approve restaurant");
    }
  };

  const handleVerifyRider = async (riderId: string, riderName?: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/riders/${riderId}/verify`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders"] });
      adminToast.riderVerified(riderName);
    } catch (error) {
      adminToast.error("Failed to verify rider");
    }
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.querySelector('[data-testid="admin-sidebar"]');
      const target = event.target as Node;
      
      if (sidebarOpen && sidebar && !sidebar.contains(target)) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sidebarOpen]);

  const getTabTitle = () => {
    switch (activeTab) {
      case "dispatch": return "Live Dispatch Console";
      case "analytics": return "Platform Analytics";
      case "orders": return "Order Management";
      case "restaurants": return "Restaurant Partners";
      case "riders": return "Rider Management";
      case "users": return "User Management";
      case "financial": return "Financial Reports";
      case "zones": return "Delivery Zones";
      case "support": return "Support Center";
      case "monitoring": return "System Health";
      case "alerts": return "Alert Center";
      case "reports": return "Business Reports";
      case "config": return "Platform Configuration";
      default: return "Admin Dashboard";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dispatch":
        return <DispatchConsole />;
      case "analytics":
        return <AdminAnalytics stats={stats} />;
      case "orders":
        return renderOrderManagement();
      case "restaurants":
        return renderRestaurantManagement();
      case "riders":
        return renderRiderManagement();
      case "users":
        return renderUserManagement();
      case "reports":
        return renderReports();
      default:
        return <UnderDevelopmentEmptyState feature={getTabTitle()} />;
    }
  };

  const renderOrderManagement = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold">{(stats as any)?.totalOrders || 0}</p>
                <p className="text-blue-100 text-sm">+18% from last week</p>
              </div>
              <Package className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completed Today</p>
                <p className="text-3xl font-bold">127</p>
                <p className="text-green-100 text-sm">+8% from yesterday</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Pending Orders</p>
                <p className="text-3xl font-bold">23</p>
                <p className="text-orange-100 text-sm">Needs attention</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Average Time</p>
                <p className="text-3xl font-bold">24m</p>
                <p className="text-purple-100 text-sm">-2m from average</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Orders</CardTitle>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Restaurant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orders as any[]).map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.restaurantName}</TableCell>
                  <TableCell>₱{order.totalAmount}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === "delivered" ? "default" : "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderRestaurantManagement = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Restaurants</p>
                <p className="text-2xl font-bold">{(stats as any)?.activeRestaurants || 0}</p>
              </div>
              <Store className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Applications</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₱2.4M</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">4.7</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurant Management</CardTitle>
          <CardDescription>Approve and manage restaurant partners</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurant Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(restaurants as any[]).map((restaurant: any) => (
                <TableRow key={restaurant.id}>
                  <TableCell className="font-medium">{restaurant.name}</TableCell>
                  <TableCell>{restaurant.ownerName || "Restaurant Owner"}</TableCell>
                  <TableCell>{restaurant.city || "Batangas City"}</TableCell>
                  <TableCell>
                    <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                      {restaurant.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{restaurant.rating || "N/A"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApproveRestaurant(restaurant.id, restaurant.name)}
                      >
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderRiderManagement = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Riders</p>
                <p className="text-2xl font-bold">{(stats as any)?.activeRiders || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online Now</p>
                <p className="text-2xl font-bold">{(stats as any)?.onlineRiders || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Verification</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold">4.8</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rider Management</CardTitle>
          <CardDescription>Verify and manage delivery riders</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rider Name</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Deliveries</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(riders as any[]).map((rider: any) => (
                <TableRow key={rider.id}>
                  <TableCell className="font-medium">{rider.name || `Rider ${rider.id}`}</TableCell>
                  <TableCell>{rider.vehicleType}</TableCell>
                  <TableCell>
                    <Badge variant={rider.isVerified ? "default" : "secondary"}>
                      {rider.isVerified ? "Verified" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{rider.rating || "N/A"}</TableCell>
                  <TableCell>{rider.completedDeliveries || 0}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyRider(rider.id, rider.name)}
                      >
                        Verify
                      </Button>
                      <Button size="sm" variant="ghost">View</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{(stats as any)?.totalUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold">{(stats as any)?.activeUsers || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-2xl font-bold">245</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                <p className="text-2xl font-bold">87%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage platform users and their accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users as any[]).map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderReports = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Reports</CardTitle>
          <CardDescription>Create comprehensive business reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button className="w-full justify-start">
              Sales Report (Monthly)
            </Button>
            <Button className="w-full justify-start" variant="outline">
              Rider Performance Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              Restaurant Analytics
            </Button>
            <Button className="w-full justify-start" variant="outline">
              Financial Summary
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>Download previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">December Sales Report</p>
                <p className="text-sm text-gray-600">Generated 2 days ago</p>
              </div>
              <Button size="sm" variant="outline">
                Download
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">Rider Performance Q4</p>
                <p className="text-sm text-gray-600">Generated 1 week ago</p>
              </div>
              <Button size="sm" variant="outline">
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-admin">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isOpen={sidebarOpen} 
      />
      
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <AdminHeader
          title={getTabTitle()}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <AdminPageWrapper
          pageTitle={getTabTitle()}
          pageDescription="Admin dashboard for managing the BTS Delivery platform"
          refreshQueryKeys={[
            "/api/admin/stats",
            "/api/admin/users",
            "/api/admin/restaurants",
            "/api/admin/orders",
            "/api/admin/riders",
          ]}
        >
          <main className="p-6">
            {/* Quick Stats - Only show on dashboard/analytics */}
            {(activeTab === "dispatch" || activeTab === "analytics") && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm font-medium">Total Users</p>
                        <p className="text-3xl font-bold" data-testid="stat-users">
                          {(stats as any)?.totalUsers || 0}
                        </p>
                        <p className="text-blue-100 text-sm">+12% from last month</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm font-medium">Active Restaurants</p>
                        <p className="text-3xl font-bold" data-testid="stat-restaurants">
                          {(stats as any)?.activeRestaurants || 0}
                        </p>
                        <p className="text-green-100 text-sm">+5 new this week</p>
                      </div>
                      <Store className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm font-medium">Total Orders</p>
                        <p className="text-3xl font-bold" data-testid="stat-orders">
                          {(stats as any)?.totalOrders || 0}
                        </p>
                        <p className="text-purple-100 text-sm">+18% from last week</p>
                      </div>
                      <Package className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm font-medium">Active Riders</p>
                        <p className="text-3xl font-bold" data-testid="stat-riders">
                          {(stats as any)?.activeRiders || 0}
                        </p>
                        <p className="text-orange-100 text-sm">
                          {(stats as any)?.onlineRiders || 0} online now
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-teal-100 text-sm font-medium">Revenue Today</p>
                        <p className="text-3xl font-bold" data-testid="stat-revenue">
                          ₱{(stats as any)?.revenueToday?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-teal-100 text-sm">+25% from yesterday</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-teal-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab Content */}
            <div className="space-y-6">
              {renderTabContent()}
            </div>
          </main>
        </AdminPageWrapper>
      </div>
    </div>
  );
}