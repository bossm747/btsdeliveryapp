import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Package, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminToast } from "@/hooks";
import {
  AdminPageWrapper,
  AdminStatsSkeleton,
  AdminTableSkeleton,
  NoOrdersEmptyState,
} from "@/components/admin";
import LeafletLiveTrackingMap from "@/components/shared/leaflet-live-tracking-map";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  restaurantName: string;
  totalAmount: string;
  status: string;
  createdAt: string;
}

export default function AdminOrders() {
  const adminToast = useAdminToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch orders with proper typing
  const { data: orders = [], isLoading: ordersLoading, isError: ordersError } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders", { status: filterStatus }],
  });

  // Fetch stats with proper typing
  const { data: stats = {}, isLoading: statsLoading } = useQuery<Record<string, any>>({
    queryKey: ["/api/admin/stats"],
  });

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" data-testid="page-admin-orders">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab="orders" 
        onTabChange={() => {}} 
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
          title="Order Management"
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />

        {/* Page Content */}
        <AdminPageWrapper
          pageTitle="Order Management"
          pageDescription="Monitor and manage all platform orders"
          refreshQueryKeys={[
            "/api/admin/orders",
            "/api/admin/stats",
          ]}
        >
          <main className="p-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              {statsLoading ? (
                <AdminStatsSkeleton count={4} />
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                      <p className="text-3xl font-bold">{(stats as any)?.totalOrders || 0}</p>
                      <p className="text-blue-100 text-sm">Live data</p>
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
                      <p className="text-3xl font-bold">{(stats as any)?.completedToday || 0}</p>
                      <p className="text-green-100 text-sm">Live data</p>
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
                      <p className="text-3xl font-bold">{(stats as any)?.pendingOrders || 0}</p>
                      <p className="text-orange-100 text-sm">Live data</p>
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
                      <p className="text-3xl font-bold">{(stats as any)?.avgDeliveryTime || 0}m</p>
                      <p className="text-purple-100 text-sm">Live data</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
              </div>
              )}

              {/* Live Tracking Map */}
              <LeafletLiveTrackingMap
                userRole="admin"
                apiEndpoint="/api/admin/orders"
                title="Live Order Tracking"
                showList={true}
                height="400px"
              />

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
                    {ordersLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-28" /></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-32" /></TableCell>
                          <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse w-16" /></TableCell>
                          <TableCell><div className="h-6 bg-gray-200 rounded animate-pulse w-20" /></TableCell>
                          <TableCell><div className="h-8 bg-gray-200 rounded animate-pulse w-16" /></TableCell>
                        </TableRow>
                      ))
                    ) : ordersError ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center text-red-600">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <p>Error loading orders</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                              Try Again
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <NoOrdersEmptyState />
                        </TableCell>
                      </TableRow>
                    ) : (
                      (orders as any[]).map((order: any) => (
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          </main>
        </AdminPageWrapper>
      </div>
    </div>
  );
}