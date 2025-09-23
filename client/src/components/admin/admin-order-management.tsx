import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Package, Search, Filter, Download, RefreshCw, Eye, MessageSquare,
  AlertTriangle, CheckCircle, Clock, Ban, MoreHorizontal, Phone,
  MapPin, Star, TrendingUp, FileText, Calendar, Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  restaurantName: string;
  riderName?: string;
  orderType: 'food' | 'pabili' | 'pabayad' | 'parcel';
  status: string;
  totalAmount: number;
  createdAt: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  customerPhone?: string;
  deliveryAddress?: any;
  items?: any[];
  rating?: number;
  notes?: string;
}

interface OrderDispute {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  restaurantName: string;
  reason: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

interface OrdersData {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

interface DisputesData {
  disputes: OrderDispute[];
  total: number;
  page: number;
  limit: number;
}

interface SLAMetrics {
  avg_delivery_time: number;
  on_time_deliveries: number;
  on_time_percentage: number;
  total_orders: number;
}

interface OrderAnalytics {
  total_orders: number;
  completed_orders: number;
  active_orders: number;
  cancelled_orders: number;
  pending_orders: number;
  success_rate: number;
  total_revenue: number;
  avg_order_value: number;
  delivery_revenue: number;
  service_revenue: number;
}

export default function AdminOrderManagement() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  // Fetch orders with comprehensive filtering
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } = useQuery<OrdersData>({
    queryKey: ["/api/admin/orders/overview", {
      status: statusFilter,
      orderType: orderTypeFilter,
      timeRange: timeRangeFilter,
      page,
      limit,
      search: searchTerm,
      sortBy: "createdAt",
      sortOrder: "desc"
    }],
  });

  // Fetch order disputes
  const { data: disputesData, isLoading: disputesLoading } = useQuery<DisputesData>({
    queryKey: ["/api/admin/orders/disputes", { page: 1, limit: 50 }],
  });

  // Fetch SLA metrics
  const { data: slaMetrics } = useQuery<SLAMetrics>({
    queryKey: ["/api/admin/orders/sla-metrics", timeRangeFilter],
  });

  // Fetch order analytics
  const { data: orderAnalytics } = useQuery<OrderAnalytics>({
    queryKey: ["/api/admin/orders/analytics", timeRangeFilter],
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, reason }: { orderId: string; status: string; reason?: string }) => {
      return apiRequest("PATCH", `/api/admin/orders/${orderId}/status`, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({
        title: "Order Updated",
        description: "Order status has been successfully updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  });

  // Create dispute mutation
  const createDisputeMutation = useMutation({
    mutationFn: async (disputeData: any) => {
      return apiRequest("POST", "/api/admin/orders/disputes", disputeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/disputes"] });
      setDisputeDialogOpen(false);
      setDisputeReason("");
      setDisputeDescription("");
      toast({
        title: "Dispute Created",
        description: "Order dispute has been created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create dispute",
        variant: "destructive",
      });
    }
  });

  // Process refund mutation
  const processRefundMutation = useMutation({
    mutationFn: async ({ orderId, amount, reason }: { orderId: string; amount: number; reason: string }) => {
      return apiRequest("POST", `/api/admin/orders/${orderId}/refund`, { amount, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      setRefundDialogOpen(false);
      setRefundAmount("");
      setRefundReason("");
      toast({
        title: "Refund Processed",
        description: "Refund has been processed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process refund",
        variant: "destructive",
      });
    }
  });

  // Export orders mutation
  const exportOrdersMutation = useMutation({
    mutationFn: async (format: string) => {
      const response = await apiRequest("POST", "/api/admin/orders/export", {
        filters: {
          status: statusFilter,
          orderType: orderTypeFilter,
          timeRange: timeRangeFilter,
          search: searchTerm
        },
        format
      });
      return response;
    },
    onSuccess: (data) => {
      // Create download link
      const csvContent = typeof data === 'string' ? data : JSON.stringify(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: "Orders have been exported successfully",
      });
    },
  });

  const handleUpdateOrderStatus = (orderId: string, status: string, reason?: string) => {
    updateOrderMutation.mutate({ orderId, status, reason });
  };

  const handleCreateDispute = () => {
    if (!selectedOrder || !disputeReason.trim() || !disputeDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createDisputeMutation.mutate({
      orderId: selectedOrder.id,
      reason: disputeReason,
      description: disputeDescription,
      priority: "medium",
      reportedBy: "admin"
    });
  };

  const handleProcessRefund = () => {
    if (!selectedOrder || !refundAmount || !refundReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    processRefundMutation.mutate({
      orderId: selectedOrder.id,
      amount: parseFloat(refundAmount),
      reason: refundReason
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'cancelled': return 'destructive';
      case 'pending': return 'secondary';
      case 'confirmed': return 'outline';
      case 'preparing': return 'outline';
      case 'ready': return 'secondary';
      case 'picked_up': return 'secondary';
      case 'in_transit': return 'secondary';
      default: return 'outline';
    }
  };

  const getOrderTypeColor = (type: string) => {
    switch (type) {
      case 'food': return 'bg-orange-100 text-orange-800';
      case 'pabili': return 'bg-blue-100 text-blue-800';
      case 'pabayad': return 'bg-green-100 text-green-800';
      case 'parcel': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-order-management">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Management</h2>
          <p className="text-muted-foreground">Comprehensive order monitoring and management</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => refetchOrders()} data-testid="button-refresh-orders">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportOrdersMutation.mutate('csv')} data-testid="button-export-orders">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-bold" data-testid="text-total-orders">
                  {orderAnalytics?.total_orders || 0}
                </p>
                <p className="text-blue-100 text-xs">All time</p>
              </div>
              <Package className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold" data-testid="text-completed-orders">
                  {orderAnalytics?.completed_orders || 0}
                </p>
                <p className="text-green-100 text-xs">Success rate: {orderAnalytics?.success_rate || 0}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Active Orders</p>
                <p className="text-2xl font-bold" data-testid="text-active-orders">
                  {orderAnalytics?.active_orders || 0}
                </p>
                <p className="text-orange-100 text-xs">In progress</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Avg Delivery</p>
                <p className="text-2xl font-bold" data-testid="text-avg-delivery-time">
                  {slaMetrics?.avg_delivery_time || 0}m
                </p>
                <p className="text-purple-100 text-xs">On-time: {slaMetrics?.on_time_percentage || 0}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Management Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-orders-overview">Orders Overview</TabsTrigger>
          <TabsTrigger value="disputes" data-testid="tab-order-disputes">Disputes ({disputesData?.total || 0})</TabsTrigger>
          <TabsTrigger value="sla" data-testid="tab-sla-monitoring">SLA Monitoring</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-order-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    data-testid="input-search-orders"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="preparing">Preparing</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                  <SelectTrigger data-testid="select-order-type-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="food">Food Delivery</SelectItem>
                    <SelectItem value="pabili">Pabili</SelectItem>
                    <SelectItem value="pabayad">Pabayad</SelectItem>
                    <SelectItem value="parcel">Parcel</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                  <SelectTrigger data-testid="select-time-range-filter">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="gap-2" data-testid="button-clear-filters">
                  <Filter className="h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Orders List</CardTitle>
              <CardDescription>
                {ordersData?.total || 0} orders found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Rider</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : (ordersData?.orders || []).map((order: Order) => (
                    <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <Badge className={getOrderTypeColor(order.orderType)}>
                          {order.orderType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{order.restaurantName || 'N/A'}</TableCell>
                      <TableCell>{order.riderName || 'Unassigned'}</TableCell>
                      <TableCell>₱{order.totalAmount?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(order.status)}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedOrder(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDisputeDialogOpen(true);
                            }}
                            data-testid={`button-dispute-order-${order.id}`}
                          >
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setRefundDialogOpen(true);
                            }}
                            data-testid={`button-refund-order-${order.id}`}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Disputes</CardTitle>
              <CardDescription>
                Manage and resolve order disputes and customer issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disputesLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading disputes...
                      </TableCell>
                    </TableRow>
                  ) : (disputesData?.disputes || []).map((dispute: OrderDispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-medium">{dispute.orderNumber}</TableCell>
                      <TableCell>{dispute.customerName}</TableCell>
                      <TableCell>{dispute.reason}</TableCell>
                      <TableCell>
                        <Badge variant={dispute.priority === 'urgent' ? 'destructive' : 'outline'}>
                          {dispute.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={dispute.status === 'resolved' ? 'default' : 'secondary'}>
                          {dispute.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(dispute.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Delivery Time</span>
                    <span className="font-bold">{slaMetrics?.avg_delivery_time || 0} minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>On-time Deliveries</span>
                    <span className="font-bold text-green-600">{slaMetrics?.on_time_deliveries || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>On-time Percentage</span>
                    <span className="font-bold text-green-600">{slaMetrics?.on_time_percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Total Orders</span>
                    <span className="font-bold">{slaMetrics?.total_orders || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Target Delivery Time</span>
                    <span className="font-bold">30 minutes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Target Success Rate</span>
                    <span className="font-bold">95%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Customer Satisfaction</span>
                    <span className="font-bold">4.5/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Response Time</span>
                    <span className="font-bold">2 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">Delivery Time Alert</p>
                    <p className="text-xs text-yellow-600">Average delivery time above target</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800">SLA Breach</p>
                    <p className="text-xs text-red-600">Multiple orders exceed delivery window</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Performance Good</p>
                    <p className="text-xs text-green-600">On-time delivery rate maintained</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Trends</CardTitle>
                <CardDescription>Order volume and completion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Total Orders</span>
                    <span className="text-lg font-bold text-blue-600">{orderAnalytics?.total_orders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Completed Orders</span>
                    <span className="text-lg font-bold text-green-600">{orderAnalytics?.completed_orders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="font-medium">Cancelled Orders</span>
                    <span className="text-lg font-bold text-red-600">{orderAnalytics?.cancelled_orders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium">Pending Orders</span>
                    <span className="text-lg font-bold text-orange-600">{orderAnalytics?.pending_orders || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Analysis</CardTitle>
                <CardDescription>Revenue metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Total Revenue</span>
                    <span className="text-lg font-bold text-green-600">
                      ₱{orderAnalytics?.total_revenue?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Average Order Value</span>
                    <span className="text-lg font-bold text-blue-600">
                      ₱{orderAnalytics?.avg_order_value?.toFixed(2) || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Delivery Revenue</span>
                    <span className="text-lg font-bold text-purple-600">
                      ₱{orderAnalytics?.delivery_revenue?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="font-medium">Service Revenue</span>
                    <span className="text-lg font-bold text-orange-600">
                      ₱{orderAnalytics?.service_revenue?.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Order Dispute</DialogTitle>
            <DialogDescription>
              Report an issue with order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Dispute Reason</label>
              <Input
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Enter dispute reason"
                data-testid="input-dispute-reason"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Provide detailed description"
                rows={4}
                data-testid="textarea-dispute-description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDisputeDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDispute}
                disabled={createDisputeMutation.isPending}
                data-testid="button-create-dispute"
              >
                {createDisputeMutation.isPending ? "Creating..." : "Create Dispute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process refund for order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Refund Amount</label>
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
                max={selectedOrder?.totalAmount}
                data-testid="input-refund-amount"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: ₱{selectedOrder?.totalAmount?.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Refund Reason</label>
              <Textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Provide reason for refund"
                rows={3}
                data-testid="textarea-refund-reason"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleProcessRefund}
                disabled={processRefundMutation.isPending}
                variant="destructive"
                data-testid="button-process-refund"
              >
                {processRefundMutation.isPending ? "Processing..." : "Process Refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}