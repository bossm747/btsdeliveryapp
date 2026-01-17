import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MapPin,
  Navigation,
  Clock,
  DollarSign,
  Store,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Bike,
  Timer,
  ArrowLeft,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

// Types
interface AvailableOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  restaurantAddress: string;
  deliveryAddress: string;
  estimatedEarnings: number;
  basePay: number;
  tip: number;
  distance: number;
  estimatedTime: number;
  expiresAt: string;
  items: number;
  customerName: string;
  serviceType: 'food' | 'pabili' | 'parcel';
  priority: 'normal' | 'high' | 'urgent';
}

interface OrderCardProps {
  order: AvailableOrder;
  onAccept: (orderId: string) => void;
  onReject: (orderId: string) => void;
  isAccepting: boolean;
}

// Helper to format distance
const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
};

// Helper to format time
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Countdown Timer Component
const CountdownTimer = ({ expiresAt }: { expiresAt: string }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);

  useEffect(() => {
    const expiryTime = new Date(expiresAt).getTime();
    const totalDuration = 120000; // Assume 2 minutes total

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiryTime - now);
      setTimeLeft(Math.ceil(remaining / 1000));
      setProgress((remaining / totalDuration) * 100);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const isUrgent = timeLeft <= 30;
  const isCritical = timeLeft <= 10;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${isCritical ? 'text-red-600' : isUrgent ? 'text-orange-600' : 'text-gray-600'}`}>
          <Timer className="w-3 h-3 inline mr-1" />
          {timeLeft > 0 ? `${timeLeft}s left` : 'Expired'}
        </span>
      </div>
      <Progress
        value={progress}
        className={`h-1 ${isCritical ? '[&>div]:bg-red-500' : isUrgent ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
      />
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, onAccept, onReject, isAccepting }: OrderCardProps) => {
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const priorityColors = {
    normal: 'bg-gray-100 text-gray-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700'
  };

  const serviceTypeColors = {
    food: 'bg-green-100 text-green-700',
    pabili: 'bg-blue-100 text-blue-700',
    parcel: 'bg-purple-100 text-purple-700'
  };

  const serviceTypeLabels = {
    food: 'Food Delivery',
    pabili: 'Pabili',
    parcel: 'Parcel'
  };

  return (
    <>
      <Card className="border-l-4 border-l-[#FF6B35] shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Header with badges and earnings */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge className={serviceTypeColors[order.serviceType]}>
                {serviceTypeLabels[order.serviceType]}
              </Badge>
              {order.priority !== 'normal' && (
                <Badge className={priorityColors[order.priority]}>
                  {order.priority === 'urgent' ? 'URGENT' : 'High Priority'}
                </Badge>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">
                +{order.estimatedEarnings.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                Base: {order.basePay.toFixed(2)} + Tip: {order.tip.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Restaurant info */}
          <div className="mb-3">
            <div className="flex items-center text-gray-900 font-medium mb-1">
              <Store className="w-4 h-4 mr-2 text-[#FF6B35]" />
              {order.restaurantName}
            </div>
            <div className="flex items-start text-sm text-gray-600 ml-6">
              <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{order.restaurantAddress}</span>
            </div>
          </div>

          {/* Delivery destination */}
          <div className="mb-3">
            <div className="flex items-center text-gray-700 text-sm mb-1">
              <Navigation className="w-4 h-4 mr-2 text-blue-500" />
              <span className="font-medium">Deliver to: {order.customerName}</span>
            </div>
            <div className="flex items-start text-sm text-gray-600 ml-6">
              <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-1">{order.deliveryAddress}</span>
            </div>
          </div>

          {/* Order details row */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3 py-2 px-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Bike className="w-4 h-4 mr-1" />
              <span>{formatDistance(order.distance)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatTime(order.estimatedTime)}</span>
            </div>
            <div className="flex items-center">
              <Package className="w-4 h-4 mr-1" />
              <span>{order.items} item{order.items > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Timer */}
          <div className="mb-4">
            <CountdownTimer expiresAt={order.expiresAt} />
          </div>

          {/* Action buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={() => setShowAcceptDialog(true)}
              disabled={isAccepting}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button
              onClick={() => setShowRejectDialog(true)}
              variant="outline"
              className="px-4 border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Accept Confirmation Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Order #{order.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will pick up from <strong>{order.restaurantName}</strong> and deliver to <strong>{order.customerName}</strong>.
              <br /><br />
              Estimated earnings: <strong className="text-green-600">{order.estimatedEarnings.toFixed(2)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onAccept(order.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              Accept Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This order will be removed from your queue. Skipping too many orders may affect your acceptance rate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onReject(order.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Skip Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Loading Skeleton
const OrderCardSkeleton = () => (
  <Card className="shadow-sm">
    <CardContent className="p-4">
      <div className="flex justify-between mb-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-4 w-48 mb-2" />
      <Skeleton className="h-3 w-full mb-3" />
      <Skeleton className="h-4 w-40 mb-2" />
      <Skeleton className="h-3 w-full mb-3" />
      <Skeleton className="h-8 w-full mb-3" />
      <div className="flex space-x-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-12" />
      </div>
    </CardContent>
  </Card>
);

export default function PendingOrders() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  // Fetch available orders with polling
  const { data: availableOrders = [], isLoading, error, refetch, isFetching } = useQuery<AvailableOrder[]>({
    queryKey: ["/api/rider/available-orders"],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      setAcceptingOrderId(orderId);
      return await apiRequest("POST", `/api/rider/orders/${orderId}/accept`);
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/available-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries/active"] });
      toast({
        title: "Order Accepted!",
        description: "Navigate to the restaurant to pick up the order.",
      });
      setAcceptingOrderId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept order",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setAcceptingOrderId(null);
    }
  });

  // Reject order mutation
  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return await apiRequest("POST", `/api/rider/orders/${orderId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rider/available-orders"] });
      toast({
        title: "Order Skipped",
        description: "The order has been removed from your queue.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to skip order",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAccept = useCallback((orderId: string) => {
    acceptOrderMutation.mutate(orderId);
  }, [acceptOrderMutation]);

  const handleReject = useCallback((orderId: string) => {
    rejectOrderMutation.mutate(orderId);
  }, [rejectOrderMutation]);

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing orders...",
      description: "Checking for new available orders.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="pending-orders-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/rider-dashboard")}
              className="p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-[#004225]">Available Orders</h1>
              <p className="text-xs text-gray-600">
                {availableOrders.length} order{availableOrders.length !== 1 ? 's' : ''} nearby
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="px-3"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-20 space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-green-700">
                {availableOrders.length}
              </div>
              <div className="text-xs text-green-600">Available</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-orange-700">
                {availableOrders.filter(o => o.priority === 'high' || o.priority === 'urgent').length}
              </div>
              <div className="text-xs text-orange-600">High Priority</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-blue-700">
                {availableOrders.length > 0
                  ? `${availableOrders.reduce((sum, o) => sum + o.estimatedEarnings, 0).toFixed(0)}`
                  : '0'
                }
              </div>
              <div className="text-xs text-blue-600">Potential</div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <h3 className="font-semibold text-red-700 mb-2">Failed to Load Orders</h3>
              <p className="text-sm text-red-600 mb-4">
                {(error as Error).message || "Please check your connection and try again."}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="border-red-300 text-red-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && availableOrders.length === 0 && (
          <Card className="border-gray-200">
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-700 mb-2">No Available Orders</h3>
              <p className="text-sm text-gray-500 mb-4">
                New orders will appear here when customers place them.
                Stay online to receive notifications.
              </p>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check for Orders
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        {!isLoading && !error && availableOrders.length > 0 && (
          <div className="space-y-4">
            {availableOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={handleAccept}
                onReject={handleReject}
                isAccepting={acceptingOrderId === order.id}
              />
            ))}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="text-center text-xs text-gray-400 pt-4">
          <RefreshCw className="w-3 h-3 inline mr-1" />
          Auto-refreshes every 10 seconds
        </div>
      </div>
    </div>
  );
}
