import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Clock, DollarSign, Package, User, Store, 
  CheckCircle, XCircle, Navigation, Phone, MessageCircle,
  AlertTriangle, Timer, Route, Camera, Shield, Star,
  Zap, TrendingUp, Target, Volume2, VolumeX, Bell,
  ChevronRight, Info, AlertCircle, ThumbsUp, ThumbsDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";

interface OrderAssignment {
  id: string;
  orderId: string;
  orderNumber: string;
  priority: number;
  estimatedValue: number;
  deliveryFee: number;
  tips: number;
  distance: number;
  estimatedTime: number;
  assignedAt: string;
  timeoutAt: string;
  assignmentStatus: 'pending' | 'assigned' | 'accepted' | 'rejected' | 'timeout';
  
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    deliveryInstructions?: string;
    location: { lat: number; lng: number };
    profileImageUrl?: string;
    rating?: number;
  };
  
  restaurant: {
    id: string;
    name: string;
    phone: string;
    address: string;
    location: { lat: number; lng: number };
    imageUrl?: string;
    rating?: number;
    averagePickupTime?: number;
  };
  
  orderDetails: {
    items: Array<{
      name: string;
      quantity: number;
      specialInstructions?: string;
      price: number;
    }>;
    totalAmount: number;
    paymentMethod: 'cash' | 'gcash' | 'card';
    isPaid: boolean;
    specialInstructions?: string;
    dietaryRequirements?: string[];
  };
  
  metadata: {
    orderType: 'food' | 'pabili' | 'pabayad' | 'parcel';
    isUrgent: boolean;
    weatherCondition?: string;
    trafficLevel?: 'low' | 'medium' | 'high';
    bonusAmount?: number;
    peakHours?: boolean;
  };
}

interface OrderAcceptanceSystemProps {
  riderId: string;
  isOnline: boolean;
  onAcceptOrder: (orderId: string) => void;
  onRejectOrder: (orderId: string, reason?: string) => void;
}

export default function OrderAcceptanceSystem({
  riderId,
  isOnline,
  onAcceptOrder,
  onRejectOrder
}: OrderAcceptanceSystemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [pendingAssignments, setPendingAssignments] = useState<OrderAssignment[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderAssignment | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAcceptEnabled, setAutoAcceptEnabled] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ [key: string]: number }>({});
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Fetch pending assignments with real-time updates
  const { data: assignments = [], refetch } = useQuery({
    queryKey: [`/api/riders/${riderId}/pending-assignments`],
    enabled: !!riderId && isOnline,
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!riderId || !isOnline) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Subscribe to rider-specific order assignments
      ws.send(JSON.stringify({
        type: "subscribe_rider_assignments",
        riderId,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      ws.close();
    };
  }, [riderId, isOnline]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case "new_assignment":
        const newAssignment = data.assignment as OrderAssignment;
        setPendingAssignments(prev => {
          // Avoid duplicates
          if (prev.find(a => a.id === newAssignment.id)) return prev;
          return [...prev, newAssignment];
        });
        
        // Play notification sound
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Show immediate notification
        toast({
          title: "🚀 New Delivery Request!",
          description: `₱${newAssignment.estimatedValue} • ${newAssignment.distance}km • ${newAssignment.restaurant.name}`,
          duration: 8000,
        });
        
        // Show assignment dialog if it's high priority
        if (newAssignment.priority >= 4 || newAssignment.metadata.isUrgent) {
          setSelectedOrder(newAssignment);
          setIsDialogOpen(true);
        }
        break;
        
      case "assignment_timeout":
        setPendingAssignments(prev => 
          prev.filter(a => a.id !== data.assignmentId)
        );
        
        toast({
          title: "Assignment Timeout",
          description: "Order assignment expired",
          variant: "destructive",
        });
        break;
        
      case "assignment_cancelled":
        setPendingAssignments(prev => 
          prev.filter(a => a.id !== data.assignmentId)
        );
        break;
    }
  }, [soundEnabled, toast]);

  // Update pending assignments from query data
  useEffect(() => {
    if (Array.isArray(assignments) && assignments.length > 0) {
      setPendingAssignments(assignments as OrderAssignment[]);
    }
  }, [assignments]);

  // Countdown timers for assignments
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const newTimeRemaining: { [key: string]: number } = {};
      
      pendingAssignments.forEach(assignment => {
        const timeoutTime = new Date(assignment.timeoutAt).getTime();
        const remaining = Math.max(0, timeoutTime - now);
        newTimeRemaining[assignment.id] = Math.floor(remaining / 1000);
        
        // Auto-timeout assignment
        if (remaining <= 0) {
          setPendingAssignments(prev => 
            prev.filter(a => a.id !== assignment.id)
          );
        }
      });
      
      setTimeRemaining(newTimeRemaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [pendingAssignments]);

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await apiRequest("POST", `/api/rider-assignments/${assignmentId}/accept`, {
        riderId,
        acceptedAt: new Date().toISOString(),
      });
    },
    onSuccess: (_, assignmentId) => {
      setPendingAssignments(prev => 
        prev.filter(a => a.id !== assignmentId)
      );
      setIsDialogOpen(false);
      setSelectedOrder(null);
      
      const assignment = pendingAssignments.find(a => a.id === assignmentId);
      if (assignment) {
        onAcceptOrder(assignment.orderId);
        toast({
          title: "✅ Order Accepted!",
          description: `Navigate to ${assignment.restaurant.name} to pick up the order`,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept order",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Reject order mutation
  const rejectOrderMutation = useMutation({
    mutationFn: async ({ assignmentId, reason }: { assignmentId: string; reason?: string }) => {
      return await apiRequest("POST", `/api/rider-assignments/${assignmentId}/reject`, {
        riderId,
        rejectionReason: reason,
        rejectedAt: new Date().toISOString(),
      });
    },
    onSuccess: (_, { assignmentId }) => {
      setPendingAssignments(prev => 
        prev.filter(a => a.id !== assignmentId)
      );
      setIsDialogOpen(false);
      setSelectedOrder(null);
      setRejectionReason('');
      
      const assignment = pendingAssignments.find(a => a.id === assignmentId);
      if (assignment) {
        onRejectOrder(assignment.orderId, rejectionReason);
      }
      
      toast({
        title: "Order Declined",
        description: "Looking for another delivery for you...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to reject order",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  };

  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get priority color
  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return "bg-red-500";
    if (priority >= 3) return "bg-orange-500";
    if (priority >= 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  // Get priority text
  const getPriorityText = (priority: number) => {
    if (priority >= 4) return "URGENT";
    if (priority >= 3) return "HIGH";
    if (priority >= 2) return "MEDIUM";
    return "NORMAL";
  };

  // Handle accept order
  const handleAcceptOrder = (assignmentId: string) => {
    acceptOrderMutation.mutate(assignmentId);
  };

  // Handle reject order  
  const handleRejectOrder = (assignmentId: string, reason?: string) => {
    rejectOrderMutation.mutate({ assignmentId, reason });
  };

  // Order Details Component
  const OrderDetailsDialog = ({ order }: { order: OrderAssignment }) => (
    <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto" data-testid="order-details-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>Order #{order.orderNumber}</span>
          <div className="flex items-center gap-2">
            <Badge className={`${getPriorityColor(order.priority)} text-white`}>
              {getPriorityText(order.priority)}
            </Badge>
            {order.metadata.isUrgent && (
              <Badge variant="destructive">⚡ URGENT</Badge>
            )}
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Timeout Timer */}
        <Alert className="border-orange-200 bg-orange-50">
          <Timer className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-orange-800 font-medium">
              Time to accept: {formatTimeRemaining(timeRemaining[order.id] || 0)}
            </span>
            <Progress 
              value={(timeRemaining[order.id] || 0) / 300 * 100} 
              className="w-20 h-2"
            />
          </AlertDescription>
        </Alert>

        {/* Earnings Info */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Total Earnings</p>
                <p className="text-2xl font-bold text-green-800">
                  ₱{(order.estimatedValue + order.tips + (order.metadata.bonusAmount || 0)).toFixed(2)}
                </p>
              </div>
              <div className="text-right text-sm text-green-700">
                <div>Base: ₱{order.estimatedValue}</div>
                <div>Delivery: ₱{order.deliveryFee}</div>
                {order.tips > 0 && <div>Tip: ₱{order.tips}</div>}
                {order.metadata.bonusAmount && <div>Bonus: ₱{order.metadata.bonusAmount}</div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Distance & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Distance</p>
              <p className="font-medium">{order.distance} km</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-600">Est. Time</p>
              <p className="font-medium">{order.estimatedTime} min</p>
            </div>
          </div>
        </div>

        {/* Restaurant Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Store className="w-4 h-4" />
              Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={order.restaurant.imageUrl} />
                <AvatarFallback className="bg-orange-100 text-orange-700">
                  {order.restaurant.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{order.restaurant.name}</p>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  <span>{order.restaurant.rating?.toFixed(1) || "N/A"}</span>
                  {order.restaurant.averagePickupTime && (
                    <span className="ml-2">• Avg pickup: {order.restaurant.averagePickupTime}min</span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" data-testid="call-restaurant">
                <Phone className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
              <p className="text-sm text-gray-700">{order.restaurant.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4" />
              Delivery Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={order.customer.profileImageUrl} />
                <AvatarFallback className="bg-blue-100 text-blue-700">
                  {order.customer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{order.customer.name}</p>
                {order.customer.rating && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{order.customer.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" data-testid="call-customer">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" data-testid="message-customer">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
              <p className="text-sm text-gray-700">{order.customer.address}</p>
            </div>
            {order.customer.deliveryInstructions && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-700 font-medium mb-1">Delivery Instructions:</p>
                <p className="text-sm text-blue-800">{order.customer.deliveryInstructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Order Items ({order.orderDetails.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {order.orderDetails.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{item.quantity}x {item.name}</p>
                  {item.specialInstructions && (
                    <p className="text-xs text-gray-600 italic">{item.specialInstructions}</p>
                  )}
                </div>
                <p className="text-sm font-medium">₱{item.price.toFixed(2)}</p>
              </div>
            ))}
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <p className="font-medium">Total Amount</p>
              <p className="text-lg font-bold text-green-600">₱{order.orderDetails.totalAmount.toFixed(2)}</p>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Payment:</span>
              <Badge variant={order.orderDetails.isPaid ? "secondary" : "outline"}>
                {order.orderDetails.paymentMethod.toUpperCase()}
                {order.orderDetails.isPaid ? " (PAID)" : " (COD)"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Special Conditions */}
        {(order.orderDetails.specialInstructions || order.orderDetails.dietaryRequirements?.length || 
          order.metadata.weatherCondition || order.metadata.trafficLevel === 'high') && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4 space-y-2">
              <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Special Instructions
              </h4>
              {order.orderDetails.specialInstructions && (
                <p className="text-sm text-yellow-700">📝 {order.orderDetails.specialInstructions}</p>
              )}
              {order.orderDetails.dietaryRequirements?.length && (
                <p className="text-sm text-yellow-700">
                  🍽️ Dietary: {order.orderDetails.dietaryRequirements.join(", ")}
                </p>
              )}
              {order.metadata.weatherCondition && (
                <p className="text-sm text-yellow-700">🌧️ Weather: {order.metadata.weatherCondition}</p>
              )}
              {order.metadata.trafficLevel === 'high' && (
                <p className="text-sm text-yellow-700">🚦 Heavy traffic expected</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => handleRejectOrder(order.id, rejectionReason)}
            disabled={rejectOrderMutation.isPending}
            className="flex-1"
            data-testid="reject-order-button"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Decline
          </Button>
          <Button
            onClick={() => handleAcceptOrder(order.id)}
            disabled={acceptOrderMutation.isPending}
            className="flex-2 bg-green-600 hover:bg-green-700 text-white"
            data-testid="accept-order-button"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {acceptOrderMutation.isPending ? "Accepting..." : "Accept Order"}
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <div className="space-y-4" data-testid="order-acceptance-system">
      {/* Audio element for notifications */}
      <audio 
        ref={audioRef} 
        preload="auto"
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmYeBu2Gzf..."
      />

      {/* Settings Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          <h3 className="font-semibold text-gray-800">
            {isOnline ? 'Ready for Orders' : 'Offline'}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            data-testid="toggle-sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-green-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-400" />
            )}
          </Button>
        </div>
      </div>

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-800">
              Pending Orders ({pendingAssignments.length})
            </h3>
          </div>
          
          {pendingAssignments.map((assignment) => (
            <Card 
              key={assignment.id} 
              className="border-l-4 border-l-orange-500 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedOrder(assignment);
                setIsDialogOpen(true);
              }}
              data-testid={`assignment-card-${assignment.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPriorityColor(assignment.priority)} text-white text-xs`}>
                      {getPriorityText(assignment.priority)}
                    </Badge>
                    {assignment.metadata.isUrgent && (
                      <Badge variant="destructive" className="text-xs">⚡</Badge>
                    )}
                    {assignment.metadata.peakHours && (
                      <Badge variant="secondary" className="text-xs">🔥 Peak</Badge>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-green-600 text-lg">
                      ₱{(assignment.estimatedValue + assignment.tips + (assignment.metadata.bonusAmount || 0)).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeRemaining(timeRemaining[assignment.id] || 0)} left
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{assignment.restaurant.name}</span>
                    <span className="text-gray-500">→</span>
                    <User className="w-4 h-4 text-blue-500" />
                    <span>{assignment.customer.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      <span>{assignment.distance} km</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{assignment.estimatedTime} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      <span>{assignment.orderDetails.items.length} items</span>
                    </div>
                  </div>
                  
                  {assignment.orderDetails.paymentMethod === 'cash' && !assignment.orderDetails.isPaid && (
                    <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      <DollarSign className="w-3 h-3" />
                      <span>Cash on Delivery: ₱{assignment.orderDetails.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRejectOrder(assignment.id);
                    }}
                    disabled={rejectOrderMutation.isPending}
                    className="flex-1"
                    data-testid={`quick-reject-${assignment.id}`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptOrder(assignment.id);
                    }}
                    disabled={acceptOrderMutation.isPending}
                    size="sm"
                    className="flex-2 bg-green-600 hover:bg-green-700 text-white"
                    data-testid={`quick-accept-${assignment.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                </div>
                
                {/* Progress bar for timeout */}
                <Progress 
                  value={(timeRemaining[assignment.id] || 0) / 300 * 100} 
                  className="mt-2 h-1"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No assignments message */}
      {pendingAssignments.length === 0 && isOnline && (
        <Card className="text-center py-8">
          <CardContent>
            <div className="flex flex-col items-center text-gray-500">
              <Zap className="w-12 h-12 mb-3 opacity-50" />
              <h3 className="font-medium mb-1">Ready for Orders</h3>
              <p className="text-sm">Waiting for new delivery requests...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline message */}
      {!isOnline && (
        <Card className="text-center py-8 border-gray-200">
          <CardContent>
            <div className="flex flex-col items-center text-gray-400">
              <Shield className="w-12 h-12 mb-3 opacity-50" />
              <h3 className="font-medium mb-1">You're Offline</h3>
              <p className="text-sm">Go online to start receiving orders</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedOrder && <OrderDetailsDialog order={selectedOrder} />}
      </Dialog>
    </div>
  );
}