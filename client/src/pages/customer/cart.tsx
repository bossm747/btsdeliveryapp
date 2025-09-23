import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Trash2, MapPin, CreditCard, ArrowLeft, Clock, Shield, Percent, Gift, AlertCircle, CheckCircle2, Smartphone, Building2, Store, Banknote } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { DeliveryAddress } from "@/lib/types";
import btsLogo from "@assets/bts-logo-transparent.png";

// Enhanced validation schemas for comprehensive payment system
const deliveryAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  barangay: z.string().min(1, "Barangay is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().default("Batangas"),
  zipCode: z.string().min(4, "Valid zip code required"),
});

const orderSchema = z.object({
  deliveryAddress: deliveryAddressSchema,
  paymentProvider: z.enum(['stripe', 'nexuspay', 'cod']).default('nexuspay'),
  paymentMethodType: z.string().optional(),
  specialInstructions: z.string().optional(),
  tip: z.number().min(0).optional(),
  loyaltyPoints: z.number().min(0).optional(),
  promoCode: z.string().optional(),
  isInsured: z.boolean().default(false),
  savePaymentMethod: z.boolean().default(false),
});

type OrderFormData = z.infer<typeof orderSchema>;

// Interface for payment methods
interface PaymentMethod {
  provider: string;
  type: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
}

// Interface for pricing calculation
interface PricingBreakdown {
  itemsSubtotal: number;
  deliveryFee: number;
  serviceFee: number;
  processingFee: number;
  insuranceFee?: number;
  tip?: number;
  subtotalBeforeTax: number;
  tax: number;
  totalBeforeDiscounts: number;
  totalDiscounts: number;
  finalTotal: number;
}

// Interface for discounts
interface DiscountInfo {
  promotionalDiscount: number;
  loyaltyPointsDiscount: number;
  couponDiscount: number;
  totalDiscounts: number;
}

// Interface for dynamic pricing
interface DynamicPricing {
  baseDeliveryFee: number;
  currentMultiplier: number;
  isHighDemand: boolean;
  estimatedWaitTime: string;
}

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice, getCurrentRestaurantId } = useCartStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Enhanced state management for comprehensive payment system
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'stripe' | 'nexuspay' | 'cod'>('nexuspay');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [pricingCalculation, setPricingCalculation] = useState<any>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [isInsured, setIsInsured] = useState(false);
  const [distance, setDistance] = useState(5); // Default 5km
  const [currentCity, setCurrentCity] = useState('Manila'); // Default city

  // API hooks for comprehensive payment system
  const { data: availablePaymentMethods, isLoading: isLoadingPaymentMethods } = useQuery({
    queryKey: ["/api/payment/methods/available"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payment/methods/available");
      return response.json();
    }
  });

  const { data: dynamicPricing, isLoading: isLoadingDynamicPricing } = useQuery({
    queryKey: ["/api/pricing/dynamic", currentCity, "food"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pricing/dynamic/${currentCity}/food`);
      return response.json();
    },
    enabled: !!currentCity
  });

  const { data: userLoyaltyPoints } = useQuery({
    queryKey: ["/api/loyalty/points", user?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/loyalty/points/${user?.id}`);
      return response.json();
    },
    enabled: !!user?.id
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      deliveryAddress: {
        street: "",
        barangay: "",
        city: currentCity,
        province: "Batangas",
        zipCode: "",
      },
      paymentProvider: "nexuspay",
      paymentMethodType: "",
      specialInstructions: "",
      tip: 0,
      loyaltyPoints: 0,
      promoCode: "",
      isInsured: false,
      savePaymentMethod: false,
    },
  });

  // Enhanced pricing calculation hook
  const calculatePricingMutation = useMutation({
    mutationFn: async (params: any) => {
      const response = await apiRequest("POST", "/api/pricing/calculate", params);
      return response.json();
    },
    onSuccess: (data) => {
      setPricingCalculation(data.pricing);
      setIsCalculatingPricing(false);
    },
    onError: (error) => {
      console.error("Pricing calculation failed:", error);
      setIsCalculatingPricing(false);
    }
  });

  // Calculate pricing whenever relevant parameters change
  useEffect(() => {
    const subtotal = getTotalPrice();
    if (subtotal > 0) {
      setIsCalculatingPricing(true);
      calculatePricingMutation.mutate({
        orderType: "food", // Can be dynamic based on items
        baseAmount: subtotal,
        city: currentCity,
        distance: distance,
        isInsured: isInsured,
        tip: tipAmount,
        loyaltyPoints: loyaltyPointsToUse,
        promoCode: appliedPromoCode
      });
    }
  }, [getTotalPrice(), currentCity, distance, isInsured, tipAmount, loyaltyPointsToUse, appliedPromoCode]);

  // Enhanced order creation mutation with comprehensive payment system
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // First create the order
      const orderResponse = await apiRequest("POST", "/api/orders", orderData);
      const order = await orderResponse.json();
      
      // Handle different payment providers
      if (orderData.paymentProvider === "cod") {
        // Cash on delivery - no payment processing needed
        return { order, paymentType: "cod" };
        
      } else if (orderData.paymentProvider === "stripe" || orderData.paymentProvider === "nexuspay") {
        // Create payment with comprehensive pricing
        const paymentResponse = await apiRequest("POST", "/api/payment/create-with-pricing", {
          orderId: order.id,
          orderType: "food",
          baseAmount: orderData.itemsTotal,
          city: orderData.deliveryAddress.city,
          distance: distance,
          paymentProvider: orderData.paymentProvider,
          paymentMethodType: orderData.paymentMethodType,
          isInsured: orderData.isInsured,
          tip: orderData.tip || 0,
          loyaltyPoints: orderData.loyaltyPoints || 0,
          promoCode: orderData.promoCode,
          metadata: {
            customerName: `${user?.firstName} ${user?.lastName}`,
            customerEmail: user?.email,
            orderNumber: order.orderNumber
          }
        });
        
        const paymentData = await paymentResponse.json();
        
        if (paymentData.success) {
          if (orderData.paymentProvider === "stripe") {
            // Return Stripe payment intent for client-side confirmation
            return { 
              order, 
              paymentType: "stripe", 
              clientSecret: paymentData.clientSecret,
              paymentIntentId: paymentData.paymentIntentId,
              pricing: paymentData.pricing
            };
          } else {
            // Redirect to NexusPay payment page
            return { 
              order, 
              paymentType: "nexuspay", 
              paymentLink: paymentData.paymentLink,
              transactionId: paymentData.transactionId,
              pricing: paymentData.pricing
            };
          }
        } else {
          throw new Error(paymentData.message || "Payment creation failed");
        }
      }
      
      return { order, paymentType: "unknown" };
    },
    onSuccess: async (result) => {
      const { order, paymentType } = result;
      
      if (paymentType === "cod") {
        toast({
          title: "Order placed successfully!",
          description: `Your order #${order.orderNumber} will be paid on delivery.`,
        });
        clearCart();
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        setLocation(`/order/${order.id}`);
        
      } else if (paymentType === "stripe") {
        // Handle Stripe payment confirmation (would need Stripe Elements integration)
        toast({
          title: "Redirecting to payment...",
          description: "Please complete your payment to confirm the order.",
        });
        // TODO: Integrate with Stripe Elements for client-side confirmation
        // For now, redirect to order page
        clearCart();
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        setLocation(`/order/${order.id}`);
        
      } else if (paymentType === "nexuspay") {
        // Redirect to NexusPay payment page
        if (result.paymentLink) {
          toast({
            title: "Redirecting to payment...",
            description: "You'll be redirected to complete your payment.",
          });
          window.location.href = result.paymentLink;
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to place order",
        description: error.message || "An error occurred while placing your order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OrderFormData) => {
    if (items.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to your cart before placing an order.",
        variant: "destructive",
      });
      return;
    }

    const restaurantId = getCurrentRestaurantId();
    if (!restaurantId) {
      toast({
        title: "No restaurant selected",
        description: "Please select a restaurant first.",
        variant: "destructive",
      });
      return;
    }

    const subtotal = getTotalPrice();
    const total = subtotal + deliveryFee + serviceFee;

    const orderData = {
      customerId: user?.id || "", // Get from authenticated user
      restaurantId,
      items: items.map(item => ({
        itemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
      })),
      subtotal,
      deliveryFee,
      serviceFee,
      totalAmount: total,
      paymentMethod: data.paymentMethod,
      deliveryAddress: data.deliveryAddress,
      specialInstructions: data.specialInstructions,
      paymentStatus: "pending",
    };

    createOrderMutation.mutate(orderData);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background py-8" data-testid="empty-cart-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="p-12 text-center">
              <img 
                src={btsLogo} 
                alt="BTS Delivery Logo" 
                className="w-20 h-20 object-contain mx-auto mb-4 opacity-50"
              />
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🛒</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-4">Your cart is empty</h1>
              <p className="text-muted-foreground mb-6">
                Looks like you haven't added any items to your cart yet.
              </p>
              <Link href="/restaurants">
                <Button className="bg-primary text-white hover:bg-primary/90" data-testid="browse-restaurants-button">
                  Browse Restaurants
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee + serviceFee;

  return (
    <div className="min-h-screen bg-background py-8" data-testid="cart-page">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/restaurants">
              <Button variant="ghost" data-testid="back-to-restaurants">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Restaurants
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="cart-title">Your Cart</h1>
              <p className="text-muted-foreground">Review your order and complete checkout</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1" data-testid="cart-item-count">
            {items.reduce((total, item) => total + item.quantity, 0)} items
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card data-testid="cart-items-section">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg" data-testid={`cart-item-${item.id}`}>
                    <img 
                      src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                      data-testid={`cart-item-image-${item.id}`}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground" data-testid={`cart-item-name-${item.id}`}>
                        {item.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">₱{item.price.toFixed(2)} each</p>
                      {item.specialInstructions && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          data-testid={`decrease-quantity-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-semibold" data-testid={`item-quantity-${item.id}`}>
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          data-testid={`increase-quantity-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <span className="font-bold text-primary w-20 text-right" data-testid={`item-total-${item.id}`}>
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </span>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                        data-testid={`remove-item-${item.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Delivery Address Form */}
            <Card data-testid="delivery-address-section">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>Delivery Address</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryAddress.street"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your street address" {...field} data-testid="street-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryAddress.barangay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barangay</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter barangay" {...field} data-testid="barangay-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryAddress.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} data-testid="city-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryAddress.province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province</FormLabel>
                          <FormControl>
                            <Input {...field} disabled data-testid="province-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryAddress.zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter zip code" {...field} data-testid="zipcode-input" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & Payment */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Order Summary */}
              <Card data-testid="order-summary">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span data-testid="summary-subtotal">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee:</span>
                    <span data-testid="summary-delivery-fee">₱{deliveryFee.toFixed(2)}</span>
                  </div>
                  {serviceFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Service Fee:</span>
                      <span data-testid="summary-service-fee">₱{serviceFee.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span data-testid="summary-total">₱{total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card data-testid="payment-method-section">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment Method</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger data-testid="payment-method-select">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash on Delivery</SelectItem>
                                <SelectItem value="gcash">GCash</SelectItem>
                                <SelectItem value="maya">Maya</SelectItem>
                                <SelectItem value="card">Credit/Debit Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="specialInstructions"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Special Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any special instructions for your order..."
                              {...field}
                              data-testid="special-instructions-input"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Form>
                </CardContent>
              </Card>

              {/* Place Order Button */}
              <Button 
                className="w-full bg-primary text-white hover:bg-primary/90 py-6 text-lg font-semibold"
                onClick={form.handleSubmit(onSubmit)}
                disabled={createOrderMutation.isPending}
                data-testid="place-order-button"
              >
                {createOrderMutation.isPending ? "Placing Order..." : `Place Order - ₱${total.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
