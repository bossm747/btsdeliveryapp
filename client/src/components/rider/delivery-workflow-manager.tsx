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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, Clock, DollarSign, Package, User, Store, 
  CheckCircle, XCircle, Navigation, Phone, MessageCircle,
  Camera, Upload, Star, Route, Timer, AlertTriangle,
  FileText, CreditCard, Banknote, Shield, QrCode,
  ChevronRight, Info, AlertCircle, ThumbsUp, ThumbsDown,
  CarTaxiFront, MapIcon, Signature, Receipt, HandHeart,
  CheckCircle2, PlayCircle, PauseCircle, StopCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useGPSTracking } from "@/hooks/use-gps-tracking";
import { DeliveryTypeBadge } from "@/components/delivery-options";
import DeliveryProofCapture from "@/components/rider/delivery-proof-capture";
import { DELIVERY_TYPES, type DeliveryType } from "@shared/schema";

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  status: 'assigned' | 'en_route_pickup' | 'at_restaurant' | 'picked_up' | 'en_route_delivery' | 'at_customer' | 'delivered' | 'completed';

  // Contactless delivery options
  deliveryType?: DeliveryType;
  contactlessInstructions?: string;
  deliveryProofPhoto?: string;

  customer: {
    id: string;
    name: string;
    phone: string;
    address: string;
    deliveryInstructions?: string;
    location: { lat: number; lng: number };
    profileImageUrl?: string;
  };
  
  restaurant: {
    id: string;
    name: string;
    phone: string;
    address: string;
    location: { lat: number; lng: number };
    imageUrl?: string;
    pickupInstructions?: string;
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
  };
  
  delivery: {
    estimatedPickupTime?: string;
    actualPickupTime?: string;
    estimatedDeliveryTime?: string;
    actualDeliveryTime?: string;
    distance: number;
    estimatedDuration: number;
    deliveryFee: number;
    tips?: number;
  };
  
  verification: {
    pickupPhotos?: string[];
    deliveryPhotos?: string[];
    customerSignature?: string;
    codReceived?: number;
    codPhotoUrl?: string;
    customerRating?: number;
    deliveryNotes?: string;
  };
}

interface DeliveryWorkflowManagerProps {
  riderId: string;
  activeOrders: DeliveryOrder[];
  onStatusUpdate: (orderId: string, status: string, data?: any) => void;
}

export default function DeliveryWorkflowManager({
  riderId,
  activeOrders = [],
  onStatusUpdate
}: DeliveryWorkflowManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [codAmount, setCodAmount] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [customerRating, setCustomerRating] = useState<number>(5);
  const [isSignatureMode, setIsSignatureMode] = useState(false);

  // GPS tracking for location verification
  const { currentLocation, startTracking, stopTracking } = useGPSTracking({
    riderId,
    enableHighAccuracy: true,
    trackingInterval: 10000 // 10 seconds
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, data }: { orderId: string; status: string; data?: any }) => {
      return await apiRequest("PATCH", `/api/orders/${orderId}/status`, {
        status,
        riderId,
        location: currentLocation,
        timestamp: new Date().toISOString(),
        ...data
      });
    },
    onSuccess: (_, { orderId, status }) => {
      onStatusUpdate(orderId, status);
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
      
      toast({
        title: "Status Updated",
        description: `Order ${selectedOrder?.orderNumber} status updated to ${status}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, orderId, photoType }: { file: File; orderId: string; photoType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("orderId", orderId);
      formData.append("riderId", riderId);
      formData.append("photoType", photoType);
      formData.append("location", JSON.stringify(currentLocation));
      
      return await apiRequest("POST", "/api/delivery-photos/upload", formData);
    },
    onSuccess: (response, { photoType }) => {
      toast({
        title: "Photo Uploaded",
        description: `${photoType} photo uploaded successfully`,
      });
      
      // Update local order data
      if (selectedOrder) {
        const updatedOrder = { ...selectedOrder };
        const uploadResponse = response as unknown as { imageUrl: string; [key: string]: any };
        if (photoType === 'pickup_confirmation') {
          updatedOrder.verification.pickupPhotos = [...(updatedOrder.verification.pickupPhotos || []), uploadResponse.imageUrl];
        } else if (photoType === 'delivery_proof') {
          updatedOrder.verification.deliveryPhotos = [...(updatedOrder.verification.deliveryPhotos || []), uploadResponse.imageUrl];
        } else if (photoType === 'cod_receipt') {
          updatedOrder.verification.codPhotoUrl = uploadResponse.imageUrl;
        }
        setSelectedOrder(updatedOrder);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Photo upload failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Complete delivery mutation
  const completeDeliveryMutation = useMutation({
    mutationFn: async (orderData: {
      orderId: string;
      codReceived?: number;
      customerRating: number;
      deliveryNotes?: string;
      customerSignature?: string;
    }) => {
      return await apiRequest("POST", `/api/orders/${orderData.orderId}/complete`, {
        ...orderData,
        riderId,
        completedAt: new Date().toISOString(),
        location: currentLocation,
      });
    },
    onSuccess: () => {
      setIsDialogOpen(false);
      setSelectedOrder(null);
      setCodAmount('');
      setDeliveryNotes('');
      setCustomerRating(5);
      
      toast({
        title: "🎉 Delivery Completed!",
        description: "Great job! Your earnings have been updated.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rider/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to complete delivery",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Handle photo capture/upload
  const handlePhotoUpload = (photoType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file && selectedOrder) {
          setUploadingPhoto(true);
          uploadPhotoMutation.mutate(
            { file, orderId: selectedOrder.id, photoType },
            {
              onSettled: () => setUploadingPhoto(false)
            }
          );
        }
      };
      fileInputRef.current.click();
    }
  };

  // Handle status updates
  const handleStatusUpdate = (orderId: string, newStatus: string, additionalData?: any) => {
    updateStatusMutation.mutate({
      orderId,
      status: newStatus,
      data: additionalData
    });
  };

  // Get delivery progress percentage
  const getDeliveryProgress = (status: string): number => {
    switch (status) {
      case 'assigned': return 10;
      case 'en_route_pickup': return 20;
      case 'at_restaurant': return 35;
      case 'picked_up': return 50;
      case 'en_route_delivery': return 70;
      case 'at_customer': return 85;
      case 'delivered': return 95;
      case 'completed': return 100;
      default: return 0;
    }
  };

  // Get status display text
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'assigned': return 'Order Assigned';
      case 'en_route_pickup': return 'Going to Restaurant';
      case 'at_restaurant': return 'At Restaurant';
      case 'picked_up': return 'Order Picked Up';
      case 'en_route_delivery': return 'Going to Customer';
      case 'at_customer': return 'At Customer Location';
      case 'delivered': return 'Order Delivered';
      case 'completed': return 'Delivery Completed';
      default: return status;
    }
  };

  // Get next action for current status
  const getNextAction = (order: DeliveryOrder) => {
    switch (order.status) {
      case 'assigned':
        return {
          action: 'Start Navigation',
          nextStatus: 'en_route_pickup',
          icon: Navigation,
          color: 'bg-blue-600'
        };
      case 'en_route_pickup':
        return {
          action: 'Arrived at Restaurant',
          nextStatus: 'at_restaurant',
          icon: Store,
          color: 'bg-orange-600'
        };
      case 'at_restaurant':
        return {
          action: 'Confirm Pickup',
          nextStatus: 'picked_up',
          icon: CheckCircle,
          color: 'bg-green-600',
          requiresPhoto: true
        };
      case 'picked_up':
        return {
          action: 'Start Delivery',
          nextStatus: 'en_route_delivery',
          icon: CarTaxiFront,
          color: 'bg-purple-600'
        };
      case 'en_route_delivery':
        return {
          action: 'Arrived at Customer',
          nextStatus: 'at_customer',
          icon: MapPin,
          color: 'bg-indigo-600'
        };
      case 'at_customer':
        return {
          action: 'Complete Delivery',
          nextStatus: 'delivered',
          icon: HandHeart,
          color: 'bg-green-700',
          requiresVerification: true
        };
      default:
        return null;
    }
  };

  // Signature canvas handling
  const initializeSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawing = false;

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      drawing = true;
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    // Clear button
    const clearSignature = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return clearSignature;
  };

  // Complete delivery with verification
  const handleCompleteDelivery = () => {
    if (!selectedOrder) return;

    const orderData = {
      orderId: selectedOrder.id,
      customerRating,
      deliveryNotes: deliveryNotes || undefined,
      codReceived: selectedOrder.orderDetails.paymentMethod === 'cash' && !selectedOrder.orderDetails.isPaid 
        ? parseFloat(codAmount) || selectedOrder.orderDetails.totalAmount 
        : undefined,
      customerSignature: isSignatureMode && signatureCanvasRef.current 
        ? signatureCanvasRef.current.toDataURL() 
        : undefined,
    };

    completeDeliveryMutation.mutate(orderData);
  };

  // Order Workflow Dialog Component
  const OrderWorkflowDialog = ({ order }: { order: DeliveryOrder }) => {
    const nextAction = getNextAction(order);
    
    return (
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto" data-testid="delivery-workflow-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order #{order.orderNumber}</span>
            <Badge variant="outline" className="text-xs">
              {getStatusText(order.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Delivery Progress</span>
              <span>{getDeliveryProgress(order.status)}%</span>
            </div>
            <Progress value={getDeliveryProgress(order.status)} className="h-2" />
          </div>

          {/* Location Info Based on Status */}
          {(order.status === 'assigned' || order.status === 'en_route_pickup' || order.status === 'at_restaurant') && (
            <Card className="border-orange-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-600" />
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
                    <p className="text-sm text-gray-600">{order.restaurant.address}</p>
                  </div>
                  <Button variant="ghost" size="sm" data-testid="call-restaurant">
                    <Phone className="w-4 h-4" />
                  </Button>
                </div>
                
                {order.restaurant.pickupInstructions && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs text-orange-700 font-medium mb-1">Pickup Instructions:</p>
                    <p className="text-sm text-orange-800">{order.restaurant.pickupInstructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(order.status === 'picked_up' || order.status === 'en_route_delivery' || order.status === 'at_customer') && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Delivery Location
                  </div>
                  {/* Show delivery type badge */}
                  {order.deliveryType && (
                    <DeliveryTypeBadge deliveryType={order.deliveryType} size="sm" />
                  )}
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
                    <p className="text-sm text-gray-600">{order.customer.address}</p>
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

                {/* Prominent delivery type alert for contactless */}
                {order.deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && (
                  <Alert className="border-blue-300 bg-blue-100">
                    <AlertTriangle className="h-4 w-4 text-blue-700" />
                    <AlertDescription className="text-blue-800">
                      <strong>Contactless Delivery - Leave at Door</strong>
                      {order.contactlessInstructions && (
                        <p className="mt-1 text-sm">{order.contactlessInstructions}</p>
                      )}
                      <p className="mt-1 text-xs">Photo proof required before completing.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {order.deliveryType === DELIVERY_TYPES.MEET_OUTSIDE && (
                  <Alert className="border-green-300 bg-green-100">
                    <Info className="h-4 w-4 text-green-700" />
                    <AlertDescription className="text-green-800">
                      <strong>Meet Outside</strong>
                      <p className="mt-1 text-sm">Customer will meet you outside their location.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {order.customer.deliveryInstructions && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Delivery Instructions:</p>
                    <p className="text-sm text-blue-800">{order.customer.deliveryInstructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Items Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Items ({order.orderDetails.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {order.orderDetails.items.slice(0, 3).map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₱{item.price.toFixed(2)}</span>
                </div>
              ))}
              {order.orderDetails.items.length > 3 && (
                <p className="text-xs text-gray-500">+{order.orderDetails.items.length - 3} more items</p>
              )}
              
              <Separator />
              
              <div className="flex justify-between items-center font-medium">
                <span>Total Amount</span>
                <span className="text-green-600">₱{order.orderDetails.totalAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Photo Verification for Pickup */}
          {order.status === 'at_restaurant' && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Camera className="w-4 h-4 text-green-600" />
                  Pickup Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Take a photo of the order to confirm pickup
                </p>
                
                {order.verification.pickupPhotos?.length ? (
                  <div className="flex gap-2">
                    {order.verification.pickupPhotos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Pickup photo ${index + 1}`}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    ))}
                  </div>
                ) : (
                  <Button
                    onClick={() => handlePhotoUpload('pickup_confirmation')}
                    disabled={uploadingPhoto}
                    className="w-full"
                    data-testid="take-pickup-photo"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? "Uploading..." : "Take Pickup Photo"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* COD Collection */}
          {order.status === 'at_customer' && order.orderDetails.paymentMethod === 'cash' && !order.orderDetails.isPaid && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-yellow-600" />
                  Cash on Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Amount to Collect:</span>
                  <span className="text-lg font-bold text-green-600">
                    ₱{order.orderDetails.totalAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cod-amount">Amount Received</Label>
                  <Input
                    id="cod-amount"
                    type="number"
                    placeholder={order.orderDetails.totalAmount.toString()}
                    value={codAmount}
                    onChange={(e) => setCodAmount(e.target.value)}
                    data-testid="cod-amount-input"
                  />
                </div>
                
                <Button
                  onClick={() => handlePhotoUpload('cod_receipt')}
                  disabled={uploadingPhoto}
                  variant="outline"
                  className="w-full"
                  data-testid="take-cod-photo"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? "Uploading..." : "Photo Receipt (Optional)"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Contactless Delivery Photo Proof - Required for "Leave at Door" */}
          {order.status === 'at_customer' && order.deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && !order.deliveryProofPhoto && (
            <DeliveryProofCapture
              orderId={order.id}
              deliveryType={order.deliveryType}
              contactlessInstructions={order.contactlessInstructions}
              onPhotoUploaded={(photoUrl) => {
                // Update the order with the proof photo
                if (selectedOrder) {
                  setSelectedOrder({
                    ...selectedOrder,
                    deliveryProofPhoto: photoUrl
                  });
                }
              }}
              isRequired={true}
            />
          )}

          {/* Delivery Completion */}
          {order.status === 'at_customer' && (
            <Card className="border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Complete Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show uploaded delivery proof for contactless */}
                {order.deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && order.deliveryProofPhoto && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Delivery Proof Photo Captured
                    </Label>
                    <div className="relative rounded-lg overflow-hidden border border-green-200">
                      <img
                        src={order.deliveryProofPhoto}
                        alt="Delivery proof"
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Standard Delivery Photo for non-contactless */}
                {order.deliveryType !== DELIVERY_TYPES.LEAVE_AT_DOOR && (
                  <div className="space-y-2">
                    <Label>Delivery Proof</Label>
                    {order.verification.deliveryPhotos?.length ? (
                      <div className="flex gap-2">
                        {order.verification.deliveryPhotos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Delivery photo ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ))}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handlePhotoUpload('delivery_proof')}
                        disabled={uploadingPhoto}
                        variant="outline"
                        className="w-full"
                        data-testid="take-delivery-photo"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {uploadingPhoto ? "Uploading..." : "Take Delivery Photo"}
                      </Button>
                    )}
                  </div>
                )}

                {/* Customer Rating */}
                <div className="space-y-2">
                  <Label>Rate Customer Experience</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={customerRating >= rating ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCustomerRating(rating)}
                        data-testid={`customer-rating-${rating}`}
                      >
                        <Star 
                          className={`w-4 h-4 ${
                            customerRating >= rating 
                              ? "fill-yellow-400 text-yellow-400" 
                              : "text-gray-400"
                          }`}
                        />
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Delivery Notes */}
                <div className="space-y-2">
                  <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="delivery-notes"
                    placeholder="Any additional notes about the delivery..."
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    rows={3}
                    data-testid="delivery-notes"
                  />
                </div>

                {/* Customer Signature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Customer Signature</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSignatureMode(!isSignatureMode)}
                      data-testid="toggle-signature"
                    >
                      <Signature className="w-4 h-4 mr-1" />
                      {isSignatureMode ? "Hide" : "Get Signature"}
                    </Button>
                  </div>
                  
                  {isSignatureMode && (
                    <div className="border rounded-lg p-4 bg-white">
                      <canvas
                        ref={signatureCanvasRef}
                        width={300}
                        height={150}
                        className="border border-gray-200 rounded w-full cursor-crosshair"
                        style={{ touchAction: 'none' }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const canvas = signatureCanvasRef.current;
                          if (canvas) {
                            const ctx = canvas.getContext('2d');
                            ctx?.clearRect(0, 0, canvas.width, canvas.height);
                          }
                        }}
                        className="mt-2"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {nextAction && order.status !== 'at_customer' && (
              <Button
                onClick={() => {
                  // Verify photo requirement
                  if (nextAction.requiresPhoto && !order.verification.pickupPhotos?.length) {
                    toast({
                      title: "Photo Required",
                      description: "Please take a pickup confirmation photo first",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  handleStatusUpdate(order.id, nextAction.nextStatus);
                  setIsDialogOpen(false);
                }}
                disabled={updateStatusMutation.isPending}
                className={`w-full ${nextAction.color} text-white`}
                data-testid="next-action-button"
              >
                <nextAction.icon className="w-4 h-4 mr-2" />
                {updateStatusMutation.isPending ? "Updating..." : nextAction.action}
              </Button>
            )}

            {order.status === 'at_customer' && (
              <Button
                onClick={() => {
                  // Require photo for contactless deliveries
                  if (order.deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && !order.deliveryProofPhoto) {
                    toast({
                      title: "Photo Required",
                      description: "Please take a delivery proof photo for contactless deliveries before completing.",
                      variant: "destructive",
                    });
                    return;
                  }
                  handleCompleteDelivery();
                }}
                disabled={completeDeliveryMutation.isPending || (order.deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && !order.deliveryProofPhoto)}
                className="w-full bg-green-700 hover:bg-green-800 text-white disabled:opacity-50"
                data-testid="complete-delivery-button"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {completeDeliveryMutation.isPending
                  ? "Completing..."
                  : order.deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR && !order.deliveryProofPhoto
                    ? "Photo Required to Complete"
                    : "Complete Delivery"}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  };

  // Initialize signature canvas when dialog opens
  useEffect(() => {
    if (isSignatureMode && signatureCanvasRef.current) {
      const cleanup = initializeSignatureCanvas();
      return cleanup;
    }
  }, [isSignatureMode]);

  // Start GPS tracking when component mounts
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, [startTracking, stopTracking]);

  return (
    <div className="space-y-4" data-testid="delivery-workflow-manager">
      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
      />

      {/* Active Orders List */}
      {activeOrders.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Active Deliveries ({activeOrders.length})
          </h3>
          
          {activeOrders.map((order) => {
            const nextAction = getNextAction(order);
            
            return (
              <Card 
                key={order.id} 
                className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order);
                  setIsDialogOpen(true);
                }}
                data-testid={`delivery-card-${order.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getStatusText(order.status)}
                      </Badge>
                      {order.orderDetails.paymentMethod === 'cash' && !order.orderDetails.isPaid && (
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">COD</Badge>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ₱{(order.delivery.deliveryFee + (order.delivery.tips || 0)).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Order #{order.orderNumber}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {order.status === 'assigned' || order.status === 'en_route_pickup' || order.status === 'at_restaurant' ? (
                        <>
                          <Store className="w-4 h-4 text-orange-500" />
                          <span className="font-medium">{order.restaurant.name}</span>
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{order.customer.name}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Route className="w-3 h-3" />
                        <span>{order.delivery.distance} km</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{order.delivery.estimatedDuration} min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        <span>{order.orderDetails.items.length} items</span>
                      </div>
                    </div>
                  </div>

                  <Progress value={getDeliveryProgress(order.status)} className="mt-3 h-2" />
                  
                  {nextAction && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(order);
                        setIsDialogOpen(true);
                      }}
                      className={`w-full mt-3 ${nextAction.color} text-white`}
                      size="sm"
                      data-testid={`next-action-${order.id}`}
                    >
                      <nextAction.icon className="w-4 h-4 mr-2" />
                      {nextAction.action}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardContent>
            <div className="flex flex-col items-center text-gray-500">
              <Package className="w-12 h-12 mb-3 opacity-50" />
              <h3 className="font-medium mb-1">No Active Deliveries</h3>
              <p className="text-sm">Your accepted orders will appear here</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Workflow Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedOrder && <OrderWorkflowDialog order={selectedOrder} />}
      </Dialog>
    </div>
  );
}