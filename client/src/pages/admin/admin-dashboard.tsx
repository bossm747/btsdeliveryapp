import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search, Filter, Download, Settings, CheckCircle, XCircle, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AdminAnalytics from "@/components/admin/admin-analytics";
import DispatchConsole from "@/components/admin/dispatch-console";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

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

  const handleApproveRestaurant = async (restaurantId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/restaurants/${restaurantId}/approve`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
      toast({
        title: "Restaurant approved",
        description: "The restaurant is now active on the platform",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve restaurant",
        variant: "destructive",
      });
    }
  };

  const handleVerifyRider = async (riderId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/riders/${riderId}/verify`);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/riders"] });
      toast({
        title: "Rider verified",
        description: "The rider can now accept deliveries",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify rider",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="page-admin">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-title">Admin Dashboard</h1>
        <p className="text-gray-600">Manage the BTS Delivery platform</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-users">{(stats as any)?.totalUsers || 0}</div>
            <p className="text-xs text-green-600">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Restaurants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-restaurants">{(stats as any)?.activeRestaurants || 0}</div>
            <p className="text-xs text-green-600">+5 new this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-orders">{(stats as any)?.totalOrders || 0}</div>
            <p className="text-xs text-green-600">+18% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-riders">{(stats as any)?.activeRiders || 0}</div>
            <p className="text-xs text-gray-600">{(stats as any)?.onlineRiders || 0} online now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Revenue Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-revenue">
              ₱{(stats as any)?.revenueToday?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-green-600">+25% from yesterday</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dispatch" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="dispatch">Live Dispatch</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
          <TabsTrigger value="riders">Riders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="dispatch" className="space-y-4">
          <DispatchConsole />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <AdminAnalytics stats={stats} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
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
                      <TableCell>{order.orderNumber}</TableCell>
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
        </TabsContent>

        <TabsContent value="restaurants" className="space-y-4">
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
                      <TableCell>{restaurant.ownerName}</TableCell>
                      <TableCell>{restaurant.city}</TableCell>
                      <TableCell>
                        <Badge variant={restaurant.isActive ? "default" : "secondary"}>
                          {restaurant.isActive ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>{restaurant.rating || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!restaurant.isActive && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleApproveRestaurant(restaurant.id)}
                              data-testid={`button-approve-${restaurant.id}`}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">Edit</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="riders" className="space-y-4">
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
                      <TableCell className="font-medium">{rider.name}</TableCell>
                      <TableCell>{rider.vehicleType}</TableCell>
                      <TableCell>
                        <Badge variant={rider.isOnline ? "default" : "secondary"}>
                          {rider.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell>{rider.rating || "N/A"}</TableCell>
                      <TableCell>{rider.totalDeliveries}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!rider.isVerified && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleVerifyRider(rider.id)}
                              data-testid={`button-verify-${rider.id}`}
                            >
                              Verify
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">View</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Management</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users..."
                      className="pl-8 w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                      <TableCell>{user.firstName} {user.lastName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>
                        <Badge>{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Sales Report</CardTitle>
                <CardDescription>Download sales and revenue reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Report Period</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Platform performance and analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Average Delivery Time:</span>
                  <span className="font-medium">28 mins</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Satisfaction:</span>
                  <span className="font-medium">4.7/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Order Completion Rate:</span>
                  <span className="font-medium">96%</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Users (30 days):</span>
                  <span className="font-medium">12,456</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}