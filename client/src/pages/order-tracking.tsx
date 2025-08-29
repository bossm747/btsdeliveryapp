import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import OrderStatusTimeline from "@/components/order-status-timeline";
import type { Order } from "@shared/schema";
import type { OrderStatusStep } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import btsLogo from "@assets/btslogo.png";

export default function OrderTracking() {
  const { id } = useParams();

  const { data: order, isLoading, refetch } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="order-tracking-loading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="order-not-found">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <img 
                src={btsLogo} 
                alt="BTS Delivery Logo" 
                className="w-20 h-20 object-contain mx-auto mb-6 opacity-50"
              />
              <h1 className="text-2xl font-bold text-foreground mb-4">Order not found</h1>
              <p className="text-muted-foreground mb-6">
                The order you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Link href="/">
                <Button>Go to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Create status steps based on order status
  const createStatusSteps = (currentStatus: string): OrderStatusStep[] => {
    const allStatuses = [
      { status: ORDER_STATUSES.PENDING, title: "Order Placed", description: "Your order has been received" },
      { status: ORDER_STATUSES.CONFIRMED, title: "Order Confirmed", description: "Restaurant confirmed your order" },
      { status: ORDER_STATUSES.PREPARING, title: "Preparing", description: "Restaurant is preparing your order" },
      { status: ORDER_STATUSES.READY, title: "Ready for Pickup", description: "Order is ready and waiting for rider" },
      { status: ORDER_STATUSES.PICKED_UP, title: "Picked Up", description: "Rider has picked up your order" },
      { status: ORDER_STATUSES.IN_TRANSIT, title: "Out for Delivery", description: "Your order is on the way" },
      { status: ORDER_STATUSES.DELIVERED, title: "Delivered", description: "Order delivered successfully" },
    ];

    const statusOrder = [
      ORDER_STATUSES.PENDING,
      ORDER_STATUSES.CONFIRMED,
      ORDER_STATUSES.PREPARING,
      ORDER_STATUSES.READY,
      ORDER_STATUSES.PICKED_UP,
      ORDER_STATUSES.IN_TRANSIT,
      ORDER_STATUSES.DELIVERED,
    ];

    const currentIndex = statusOrder.indexOf(currentStatus as any);
    
    return allStatuses.map((statusInfo, index) => ({
      ...statusInfo,
      isCompleted: index < currentIndex || (currentStatus === ORDER_STATUSES.DELIVERED && index === currentIndex),
      isActive: index === currentIndex && currentStatus !== ORDER_STATUSES.DELIVERED,
      timestamp: index <= currentIndex ? "2:15 PM" : undefined, // Mock timestamp
    }));
  };

  const statusSteps = createStatusSteps(order.status);
  const deliveryAddress = order.deliveryAddress as any;
  const orderItems = order.items as any[];

  // Mock rider data - in real app this would come from the order or separate API
  const mockRider = order.status === ORDER_STATUSES.IN_TRANSIT ? {
    name: "Kuya Mario",
    phone: "+63 917 123 4567",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  } : undefined;

  return (
    <div className="min-h-screen bg-background py-8" data-testid="order-tracking-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-foreground" data-testid="order-tracking-title">
                Order Tracking
              </h1>
              <p className="text-muted-foreground">Track your order in real-time</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            data-testid="refresh-order-button"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Status Timeline */}
          <div className="lg:col-span-2">
            <OrderStatusTimeline
              orderNumber={order.orderNumber}
              currentStatus={order.status}
              steps={statusSteps}
              rider={mockRider}
              estimatedArrival={order.status === ORDER_STATUSES.IN_TRANSIT ? "15 minutes" : undefined}
              distance={order.status === ORDER_STATUSES.IN_TRANSIT ? "2.3 km away" : undefined}
            />
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <Card data-testid="order-summary-tracking">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Order Details</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order #:</span>
                    <span className="font-semibold" data-testid="order-number-display">
                      {order.orderNumber}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold text-primary" data-testid="order-total-display">
                      ₱{parseFloat(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-semibold capitalize" data-testid="payment-method-display">
                      {order.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <span className={`font-semibold capitalize ${
                      order.paymentStatus === 'paid' ? 'text-success' : 
                      order.paymentStatus === 'failed' ? 'text-destructive' : 'text-accent'
                    }`} data-testid="payment-status-display">
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card data-testid="delivery-address-tracking">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Delivery Address</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p data-testid="delivery-street">{deliveryAddress?.street}</p>
                  <p data-testid="delivery-location">
                    {deliveryAddress?.barangay}, {deliveryAddress?.city}
                  </p>
                  <p data-testid="delivery-province-zip">
                    {deliveryAddress?.province} {deliveryAddress?.zipCode}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card data-testid="order-items-tracking">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Order Items</h3>
                <div className="space-y-3">
                  {orderItems?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm" data-testid={`order-item-${index}`}>
                      <div>
                        <span className="font-semibold" data-testid={`item-name-${index}`}>
                          {item.name}
                        </span>
                        <span className="text-muted-foreground ml-2" data-testid={`item-quantity-${index}`}>
                          x{item.quantity}
                        </span>
                      </div>
                      <span className="font-semibold" data-testid={`item-price-${index}`}>
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <Card data-testid="special-instructions-tracking">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4">Special Instructions</h3>
                  <p className="text-sm text-muted-foreground" data-testid="special-instructions-text">
                    {order.specialInstructions}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
