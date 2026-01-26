import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, RefreshCw, Clock, Edit2, Plus, Minus, Lock, AlertTriangle, Camera, MessageCircle, CreditCard, Loader2, Star, CheckCircle, MessageSquarePlus, Wifi, WifiOff } from "lucide-react";
import ReviewForm from "@/components/review-form";
import { Link } from "wouter";
import RealTimeTracking from "@/components/shared/real-time-tracking";
import { canModifyOrder, formatTime, MODIFIABLE_ORDER_STATUSES } from "@/lib/utils";
import { DeliveryTypeDisplay, DeliveryTypeBadge } from "@/components/delivery-options";
import type { Order, DeliveryType } from "@shared/schema";
import { DELIVERY_TYPES } from "@shared/schema";
import btsLogo from "@assets/bts-logo-transparent.png";
import OrderChat, { ChatButton } from "@/components/order-chat";
import CustomerHeader from "@/components/customer/customer-header";
import { CustomerPageWrapper } from "@/components/customer/customer-page-wrapper";
import { useToast } from "@/hooks/use-toast";
import { useOrderWebSocket } from "@/hooks/use-websocket";
import { WebSocketStatusIndicator, ConnectionBanner } from "@/components/shared/websocket-status";

// Countdown Timer Component
function ModificationCountdown({
  order,
  onExpire
}: {
  order: Order;
  onExpire: () => void;
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const { remainingSeconds } = canModifyOrder(order);
    return remainingSeconds;
  });

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          onExpire();
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, onExpire]);

  if (remainingSeconds <= 0) {
    return null;
  }

  const isUrgent = remainingSeconds <= 30;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
      isUrgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
    }`}>
      <Clock className="h-4 w-4" />
      <span className="text-sm font-medium">
        Modify within: {formatTime(remainingSeconds)}
      </span>
    </div>
  );
}

// Order Modification Modal
interface OrderItem {
  itemId?: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

interface ModificationModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onSave: (modifications: {
    items?: OrderItem[];
    specialInstructions?: string;
    deliveryAddress?: any;
  }) => void;
  isSaving: boolean;
}

function OrderModificationModal({ open, onClose, order, onSave, isSaving }: ModificationModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const { remainingSeconds } = canModifyOrder(order);

  // Initialize state from order
  useEffect(() => {
    if (open && order) {
      const orderItems = (order.items as any[]) || [];
      setItems(orderItems.map(item => ({
        itemId: item.itemId,
        name: item.name,
        price: parseFloat(item.price) || 0,
        quantity: item.quantity || 1,
        specialInstructions: item.specialInstructions
      })));
      setSpecialInstructions(order.specialInstructions || '');
      setDeliveryAddress(order.deliveryAddress);
    }
  }, [open, order]);

  const handleQuantityChange = (index: number, delta: number) => {
    setItems(prev => {
      const newItems = [...prev];
      const newQuantity = Math.max(0, newItems[index].quantity + delta);

      if (newQuantity === 0) {
        // Remove item if quantity becomes 0
        return newItems.filter((_, i) => i !== index);
      }

      newItems[index] = { ...newItems[index], quantity: newQuantity };
      return newItems;
    });
  };

  const handleSave = () => {
    if (items.length === 0) {
      return; // Don't allow empty orders
    }

    onSave({
      items,
      specialInstructions,
      deliveryAddress
    });
  };

  const calculateNewTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = parseFloat(order.deliveryFee) || 0;
    const serviceFee = parseFloat(order.serviceFee || '0') || 0;
    const tax = parseFloat(order.tax || '0') || 0;
    const tip = parseFloat(order.tip || '0') || 0;
    const discount = parseFloat(order.discount || '0') || 0;
    return subtotal + deliveryFee + serviceFee + tax + tip - discount;
  };

  const newSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const newTotal = calculateNewTotal();
  const originalTotal = parseFloat(order.totalAmount);
  const difference = newTotal - originalTotal;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="h-5 w-5" />
            Modify Order
          </DialogTitle>
          <DialogDescription>
            Make changes to your order within the modification window.
            {remainingSeconds > 0 && (
              <span className={`ml-2 font-medium ${remainingSeconds <= 30 ? 'text-destructive' : 'text-primary'}`}>
                ({formatTime(remainingSeconds)} remaining)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Items */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Order Items</Label>
            {items.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Order must have at least one item</span>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        P{item.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(index, -1)}
                        data-testid={`decrease-quantity-${index}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium" data-testid={`item-quantity-edit-${index}`}>
                        {item.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(index, 1)}
                        data-testid={`increase-quantity-${index}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="w-20 text-right font-semibold text-sm">
                        P{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add any special instructions for your order..."
              className="min-h-[80px]"
              data-testid="special-instructions-input"
            />
          </div>

          {/* Delivery Address (editable only if not picked up) */}
          {!['picked_up', 'in_transit', 'delivered', 'completed'].includes(order.status) && deliveryAddress && (
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <div className="space-y-2">
                <Input
                  value={deliveryAddress.street || ''}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                  placeholder="Street address"
                  data-testid="address-street-input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={deliveryAddress.barangay || ''}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, barangay: e.target.value })}
                    placeholder="Barangay"
                    data-testid="address-barangay-input"
                  />
                  <Input
                    value={deliveryAddress.city || ''}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                    placeholder="City"
                    data-testid="address-city-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Price Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">New Subtotal:</span>
              <span>P{newSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee:</span>
              <span>P{parseFloat(order.deliveryFee).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>New Total:</span>
              <span className="text-primary">P{newTotal.toFixed(2)}</span>
            </div>
            {difference !== 0 && (
              <div className={`flex justify-between text-sm ${difference > 0 ? 'text-destructive' : 'text-green-600'}`}>
                <span>Difference:</span>
                <span>{difference > 0 ? '+' : ''}P{difference.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
            data-testid="save-modifications-button"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrderTracking() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [canModify, setCanModify] = useState(false);
  const [windowExpired, setWindowExpired] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // WebSocket connection for real-time order updates
  const { 
    status: wsStatus, 
    isAuthenticated: wsAuthenticated,
    reconnectAttempt: wsReconnectAttempt,
    orderStatus: wsOrderStatus,
    riderLocation: wsRiderLocation,
    eta: wsEta,
  } = useOrderWebSocket(id, {
    onOrderStatusUpdate: (update) => {
      if (update.orderId === id) {
        // Invalidate query to refetch latest order data
        queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });

        // Show toast for significant status changes
        if (update.status && update.previousStatus !== update.status) {
          const statusMessages: Record<string, string> = {
            confirmed: "Your order has been confirmed!",
            preparing: "Restaurant is preparing your food",
            ready: "Your order is ready for pickup!",
            picked_up: "Rider has picked up your order",
            in_transit: "Your order is on the way!",
            delivered: "Your order has been delivered!",
            cancelled: "Your order has been cancelled"
          };

          const message = statusMessages[update.status];
          if (message) {
            toast({
              title: "Order Update",
              description: message,
              duration: 5000,
            });
          }
        }
      }
    },
    onETAUpdate: (update) => {
      if (update.orderId === id) {
        toast({
          title: "ETA Updated",
          description: `Estimated arrival: ${update.estimatedMinutes} minutes`,
          duration: 3000,
        });
      }
    },
  });

  const wsConnected = wsStatus === 'connected' || wsStatus === 'authenticated';

  const { data: order, isLoading, refetch } = useQuery<Order>({
    queryKey: ["/api/orders", id],
    enabled: !!id,
    // Poll more frequently when payment is pending (every 3 seconds)
    // Use less frequent polling when WebSocket is connected
    refetchInterval: (query) => {
      const orderData = query.state.data;
      if (wsConnected && wsAuthenticated) {
        // Fallback polling only - WebSocket handles real-time updates
        return orderData?.status === 'payment_pending' ? 5000 : 60000;
      }
      return orderData?.status === 'payment_pending' ? 3000 : 10000;
    },
  });

  // Check if order has been reviewed
  const { data: orderReview } = useQuery({
    queryKey: ["/api/orders", id, "review"],
    enabled: !!id && (order?.status === "delivered" || order?.status === "completed"),
  });

  // Check modification status when order changes
  useEffect(() => {
    if (order) {
      const status = canModifyOrder(order);
      setCanModify(status.canModify);
      setWindowExpired(!status.canModify && status.remainingSeconds <= 0);
    }
  }, [order]);

  const handleWindowExpire = useCallback(() => {
    setCanModify(false);
    setWindowExpired(true);
    setIsModifyModalOpen(false);
  }, []);

  // Mutation for modifying order
  const modifyOrderMutation = useMutation({
    mutationFn: async (modifications: { items?: any[]; specialInstructions?: string; deliveryAddress?: any }) => {
      const response = await fetch(`/api/orders/${id}/modify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(modifications),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to modify order');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders", id] });
      setIsModifyModalOpen(false);
    },
  });

  if (isLoading) {
    return (
      <CustomerPageWrapper
        refreshQueryKeys={[`/api/orders/${id}`]}
        pageTitle="Order Tracking"
        pageDescription="Loading order tracking information"
      >
        <div className="min-h-screen bg-background py-8" data-testid="order-tracking-loading">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-8 w-32 mb-6" />
            <div className="space-y-6">
              <Skeleton className="h-96 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </CustomerPageWrapper>
    );
  }

  if (!order) {
    return (
      <CustomerPageWrapper
        refreshQueryKeys={[`/api/orders/${id}`]}
        pageTitle="Order Not Found"
      >
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
      </CustomerPageWrapper>
    );
  }

  const deliveryAddress = order.deliveryAddress as any;
  const orderItems = order.items as any[];

  return (
    <CustomerPageWrapper
      refreshQueryKeys={[`/api/orders/${id}`]}
      pageTitle="Order Tracking"
      pageDescription={`Track order ${order.orderNumber} in real-time`}
    >
      <div className="min-h-screen bg-background pb-20" data-testid="order-tracking-page">
        <CustomerHeader
        title="Order Tracking"
        showBack
        backPath="/customer-orders"
        rightContent={
          <div className="flex items-center gap-2">
            <WebSocketStatusIndicator 
              status={wsStatus} 
              isAuthenticated={wsAuthenticated}
              reconnectAttempt={wsReconnectAttempt}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              data-testid="refresh-order-button"
              className="text-gray-700"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Connection status banner - shows when reconnecting or disconnected */}
        <ConnectionBanner 
          status={wsStatus}
          isAuthenticated={wsAuthenticated}
          reconnectAttempt={wsReconnectAttempt}
          className="mb-4"
        />
        
        {/* Subtitle */}
        <p className="text-muted-foreground mb-6">Track your order in real-time</p>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Real-Time Delivery Tracking */}
          <div className="lg:col-span-2">
            <RealTimeTracking orderId={order.id} />
          </div>

          {/* Order Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Payment Pending Banner - Shows when order awaiting payment confirmation */}
            {order.status === 'payment_pending' && (
              <Card className="border-yellow-500 bg-yellow-50" data-testid="payment-pending-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-yellow-800">Payment Pending</h3>
                      <p className="text-sm text-yellow-600">Your payment is being processed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-700 text-sm mb-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for payment confirmation...</span>
                  </div>
                  <p className="text-xs text-yellow-600">
                    Your order will be sent to the restaurant once payment is confirmed.
                    This usually takes a few seconds after completing payment.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                    onClick={() => refetch()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Payment Status
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Order Modification Window Banner */}
            {canModify && order.status !== 'payment_pending' && (
              <Card className="border-primary" data-testid="modification-window-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <ModificationCountdown order={order} onExpire={handleWindowExpire} />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setIsModifyModalOpen(true)}
                    data-testid="modify-order-button"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Modify Order
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    You can still modify your order
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Order Locked Banner */}
            {windowExpired && MODIFIABLE_ORDER_STATUSES.includes(order.status as any) && (
              <Card className="border-muted bg-muted/30" data-testid="order-locked-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm font-medium">Order Locked</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    The modification window has expired. Your order is being processed.
                  </p>
                </CardContent>
              </Card>
            )}

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
                      P{parseFloat(order.totalAmount).toFixed(2)}
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

            {/* Chat with Rider Button - Only when rider is assigned */}
            {order.riderId && !['delivered', 'completed', 'cancelled'].includes(order.status) && (
              <Card className="border-primary/50 bg-primary/5" data-testid="chat-with-rider-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Chat with Rider</p>
                        <p className="text-xs text-muted-foreground">Send delivery instructions</p>
                      </div>
                    </div>
                    <ChatButton
                      orderId={order.id}
                      onClick={() => setIsChatOpen(true)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

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

            {/* Delivery Type - Contactless Option */}
            {(order as any).deliveryType && (
              <Card data-testid="delivery-type-tracking">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-foreground">Delivery Method</h3>
                    <DeliveryTypeBadge
                      deliveryType={(order as any).deliveryType as DeliveryType}
                    />
                  </div>
                  <DeliveryTypeDisplay
                    deliveryType={(order as any).deliveryType as DeliveryType}
                    contactlessInstructions={(order as any).contactlessInstructions}
                    deliveryProofPhoto={(order as any).deliveryProofPhoto}
                  />
                </CardContent>
              </Card>
            )}

            {/* Delivery Proof Photo - Show after delivery is completed */}
            {(order.status === 'delivered' || order.status === 'completed') &&
             (order as any).deliveryProofPhoto &&
             !(order as any).deliveryType && (
              <Card data-testid="delivery-proof-tracking">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Delivery Proof
                  </h3>
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={(order as any).deliveryProofPhoto}
                      alt="Delivery proof"
                      className="w-full h-48 object-cover"
                      data-testid="delivery-proof-image"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Photo taken at delivery location
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Review Card - Show when delivered but not yet reviewed */}
            {(order.status === 'delivered' || order.status === 'completed') && !orderReview && (
              <Card className="border-[#FF6B35]/30 bg-gradient-to-r from-orange-50 to-yellow-50" data-testid="review-prompt-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                      <Star className="h-6 w-6 text-[#FF6B35]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">Rate Your Order</h3>
                      <p className="text-sm text-muted-foreground">
                        Kamusta ang iyong experience? Share your feedback!
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsReviewDialogOpen(true)}
                      className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
                      data-testid="write-review-btn"
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviewed Badge - Show when already reviewed */}
            {(order.status === 'delivered' || order.status === 'completed') && orderReview && (
              <Card className="border-green-200 bg-green-50" data-testid="review-completed-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">Review Submitted</p>
                      <p className="text-sm text-green-600">Salamat sa iyong feedback!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                        P{(item.price * item.quantity).toFixed(2)}
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

        {/* Order Modification Modal */}
        <OrderModificationModal
          open={isModifyModalOpen}
          onClose={() => setIsModifyModalOpen(false)}
          order={order}
          onSave={(modifications) => modifyOrderMutation.mutate(modifications)}
          isSaving={modifyOrderMutation.isPending}
        />

        {/* Chat with Rider - Only shown when rider is assigned */}
        {order.riderId && (
          <OrderChat
            orderId={order.id}
            open={isChatOpen}
            onOpenChange={setIsChatOpen}
          />
        )}

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
            <ReviewForm
              orderId={order.id}
              restaurantName={(order as any).restaurantName || "Restaurant"}
              isDialog={true}
              onSuccess={() => {
                setIsReviewDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/orders", id, "review"] });
                toast({
                  title: "Review Submitted",
                  description: "Salamat sa iyong feedback!",
                });
              }}
              onCancel={() => setIsReviewDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </CustomerPageWrapper>
  );
}
