import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Package, Clock, MapPin, Star, Filter, Search, 
  ArrowLeft, Eye, Phone, MessageCircle, CheckCircle,
  Truck, Store, Navigation, Calendar, Receipt
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Order {
  id: string;
  orderNumber: string;
  restaurantName: string;
  restaurantId: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  totalAmount: number;
  deliveryFee: number;
  paymentMethod: string;
  paymentStatus: "pending" | "paid" | "failed";
  deliveryAddress: {
    street: string;
    barangay: string;
    city: string;
    province: string;
  };
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  createdAt: string;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
}

export default function CustomerOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["/api/customer/orders", { status: statusFilter, dateRange }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateRange !== "all") params.set("dateRange", dateRange);
      
      const response = await fetch(`/api/customer/orders?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    }
  });

  const filteredOrders = orders?.filter(order => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(query) ||
        order.restaurantName.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }
    return true;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-orange-100 text-orange-800";
      case "ready": return "bg-purple-100 text-purple-800";
      case "picked_up": return "bg-indigo-100 text-indigo-800";
      case "in_transit": return "bg-green-100 text-green-800";
      case "delivered": return "bg-green-500 text-white";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "confirmed": return "Confirmed";
      case "preparing": return "Preparing";
      case "ready": return "Ready for Pickup";
      case "picked_up": return "Picked Up";
      case "in_transit": return "On the Way";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  const activeOrders = filteredOrders.filter(order => 
    !["delivered", "cancelled"].includes(order.status)
  );

  const pastOrders = filteredOrders.filter(order => 
    ["delivered", "cancelled"].includes(order.status)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="customer-orders-loading">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="customer-orders-error">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl font-semibold mb-2">Unable to load orders</h2>
              <p className="text-gray-600 mb-4">
                There was an error loading your order history. Please try again.
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8" data-testid="customer-orders-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" data-testid="back-to-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-[#004225]" data-testid="page-title">
                My Orders
              </h1>
              <p className="text-gray-600">Track and manage your orders</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by order number, restaurant, or items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-orders"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]" data-testid="status-filter">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]" data-testid="date-filter">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active" data-testid="active-orders-tab">
              Active Orders ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="past-orders-tab">
              Order History ({pastOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No active orders</h3>
                  <p className="text-gray-600 mb-4">
                    You don't have any active orders right now
                  </p>
                  <Link href="/restaurants">
                    <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                      Browse Restaurants
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map((order) => (
                <OrderCard key={order.id} order={order} isActive={true} />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No order history</h3>
                  <p className="text-gray-600">
                    Your completed orders will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              pastOrders.map((order) => (
                <OrderCard key={order.id} order={order} isActive={false} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OrderCard({ order, isActive }: { order: Order; isActive: boolean }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-orange-100 text-orange-800";
      case "ready": return "bg-purple-100 text-purple-800";
      case "picked_up": return "bg-indigo-100 text-indigo-800";
      case "in_transit": return "bg-green-100 text-green-800";
      case "delivered": return "bg-green-500 text-white";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Pending";
      case "confirmed": return "Confirmed";
      case "preparing": return "Preparing";
      case "ready": return "Ready for Pickup";
      case "picked_up": return "Picked Up";
      case "in_transit": return "On the Way";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`order-card-${order.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg" data-testid="order-number">
                Order #{order.orderNumber}
              </h3>
              <Badge className={getStatusColor(order.status)} data-testid="order-status">
                {getStatusText(order.status)}
              </Badge>
            </div>
            <div className="flex items-center text-gray-600 mb-2">
              <Store className="w-4 h-4 mr-2" />
              <span data-testid="restaurant-name">{order.restaurantName}</span>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              <span data-testid="order-date">
                {new Date(order.createdAt).toLocaleDateString('en-PH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-[#004225]" data-testid="order-total">
              ₱{order.totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            {order.items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span>{item.quantity}x {item.name}</span>
                <span>₱{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            {order.items.length > 3 && (
              <div className="text-xs text-gray-600 mt-1">
                +{order.items.length - 3} more item{order.items.length - 3 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="flex items-start gap-2 mb-4 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5" />
          <span data-testid="delivery-address">
            {order.deliveryAddress.street}, {order.deliveryAddress.barangay}, {order.deliveryAddress.city}
          </span>
        </div>

        {/* Rider Info for Active Orders */}
        {isActive && order.riderId && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Rider: {order.riderName}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" data-testid="call-rider">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" data-testid="message-rider">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link href={`/order/${order.id}`}>
            <Button variant="outline" size="sm" data-testid="track-order">
              <Eye className="w-4 h-4 mr-2" />
              {isActive ? "Track Order" : "View Details"}
            </Button>
          </Link>
          
          {order.status === "delivered" && (
            <Link href={`/restaurant/${order.restaurantId}`}>
              <Button variant="outline" size="sm" data-testid="reorder">
                <Package className="w-4 h-4 mr-2" />
                Reorder
              </Button>
            </Link>
          )}
          
          {isActive && ["in_transit", "delivered"].includes(order.status) && (
            <Button variant="outline" size="sm" data-testid="rate-order">
              <Star className="w-4 h-4 mr-2" />
              Rate
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}