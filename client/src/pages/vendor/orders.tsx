import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  Search,
  CheckCircle, 
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Order, Restaurant } from "@shared/schema";

export default function VendorOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch vendor's restaurant data
  const { data: restaurant } = useQuery<Restaurant | null>({
    queryKey: ["/api/vendor/restaurant"],
  });

  // Fetch vendor's orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/vendor/orders"],
    enabled: !!restaurant,
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/orders"] });
      toast({
        title: "Order status updated",
        description: "The order status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter orders based on search and status
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = searchFilter === "" || 
      order.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  if (ordersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="vendor-orders-page">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders Management</h1>
        <div className="text-sm text-gray-500">
          {filteredOrders.length} of {orders?.length || 0} orders
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders by ID or order number..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10"
            data-testid="input-search-orders"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          data-testid="select-order-status"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="preparing">Preparing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Orders Found</h3>
            <p className="text-gray-500 dark:text-gray-400">When you receive orders, they'll appear here.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="border-l-4 border-l-primary/50" data-testid={`card-order-${order.id.slice(-8)}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Order #{order.orderNumber || order.id.slice(-8)}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customer Order • ₱{parseFloat(order.totalAmount).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.createdAt!).toLocaleDateString()} at {new Date(order.createdAt!).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={
                      order.status === 'pending' ? 'destructive' :
                      order.status === 'confirmed' || order.status === 'preparing' ? 'default' :
                      order.status === 'ready' ? 'secondary' : 'outline'
                    }>
                      {order.status}
                    </Badge>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Order Items:</h4>
                  {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {order.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateOrderStatusMutation.mutate({
                            orderId: order.id,
                            status: 'confirmed',
                            notes: 'Order accepted by restaurant'
                          });
                        }}
                        disabled={updateOrderStatusMutation.isPending}
                        data-testid={`button-accept-${order.id.slice(-8)}`}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept Order
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          updateOrderStatusMutation.mutate({
                            orderId: order.id,
                            status: 'cancelled',
                            notes: 'Order rejected by restaurant'
                          });
                        }}
                        disabled={updateOrderStatusMutation.isPending}
                        data-testid={`button-reject-${order.id.slice(-8)}`}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {order.status === 'confirmed' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: order.id,
                          status: 'preparing',
                          notes: 'Order is being prepared'
                        });
                      }}
                      disabled={updateOrderStatusMutation.isPending}
                      data-testid={`button-preparing-${order.id.slice(-8)}`}
                    >
                      Start Preparing
                    </Button>
                  )}

                  {order.status === 'preparing' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: order.id,
                          status: 'ready',
                          notes: 'Order is ready for pickup'
                        });
                      }}
                      disabled={updateOrderStatusMutation.isPending}
                      data-testid={`button-ready-${order.id.slice(-8)}`}
                    >
                      Mark Ready
                    </Button>
                  )}

                  {order.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: order.id,
                          status: 'completed',
                          notes: 'Order has been completed'
                        });
                      }}
                      disabled={updateOrderStatusMutation.isPending}
                      data-testid={`button-complete-${order.id.slice(-8)}`}
                    >
                      Complete Order
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}