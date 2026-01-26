import { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, Minus, Trash2, MapPin, CreditCard, ArrowLeft, Clock, Shield, Percent, Gift, AlertCircle, CheckCircle2, Smartphone, Building2, Store, Banknote, Search, Truck, Coins, TrendingUp, Crown, Star, Trophy, Award, Wallet, Loader2, Heart } from "lucide-react";
import { CustomerPageWrapper } from "@/components/customer/customer-page-wrapper";
import { EmptyState } from "@/components/customer/empty-state";
import { CartItemsSkeleton, CartSummarySkeleton } from "@/components/skeletons";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { AddressSelector, SelectedDeliveryAddress } from "@/components/address-selector";
import { DeliveryZoneBadge } from "@/components/delivery-zone-map";
import { LoyaltyEarnPreview } from "@/components/loyalty-widget";
import { WalletBalance, useWallet } from "@/components/wallet-balance";
import { PaymentMethodSelector } from "@/components/payment-method-selector";
import { TaxBreakdown, TaxSummaryLine } from "@/components/tax-breakdown";
import { SchedulePicker } from "@/components/schedule-picker";
import { DeliveryOptions } from "@/components/delivery-options";
import { Slider } from "@/components/ui/slider";
import { Link, useLocation } from "wouter";
import { DELIVERY_TYPES, type DeliveryType } from "@shared/schema";
import { useCartStore, CartItem, CartSnapshot } from "@/stores/cart-store";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { DeliveryAddress } from "@/lib/types";
import btsLogo from "@assets/bts-logo-transparent.png";
import CustomerHeader from "@/components/customer/customer-header";
import { TipSelector, PromoCodeInput } from "@/components/checkout";

// Types for optimistic update context
interface OptimisticUpdateContext {
  previousItems: CartItem[];
  previousPricing: any;
  operationId: string;
}

// Enhanced validation schemas for comprehensive payment system
const deliveryAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  barangay: z.string().optional().default(""),
  city: z.string().min(1, "City is required"),
  province: z.string().default("Batangas"),
  zipCode: z.string().optional().default(""),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
});

const orderSchema = z.object({
  deliveryAddress: deliveryAddressSchema,
  paymentProvider: z.enum(['nexuspay', 'cod']).default('nexuspay'),
  paymentMethodType: z.string().optional(),
  specialInstructions: z.string().optional(),
  tip: z.number().min(0).optional(),
  loyaltyPoints: z.number().min(0).optional(),
  promoCode: z.string().optional(),
  isInsured: z.boolean().default(false),
  savePaymentMethod: z.boolean().default(false),
  scheduledFor: z.date().nullable().optional(), // Pre-order scheduling
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
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalPrice,
    getCurrentRestaurantId,
    beginOptimisticUpdate,
    commitOperation,
    rollbackOperation,
    hasPendingOperations
  } = useCartStore();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Track items being updated for loading states
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  // Debounce timer ref for pricing recalculation
  const pricingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced state management for comprehensive payment system
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'nexuspay' | 'cod'>('nexuspay');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [savedPaymentMethodId, setSavedPaymentMethodId] = useState<string | undefined>();
  const [savePaymentForFuture, setSavePaymentForFuture] = useState(false);
  const [pricingCalculation, setPricingCalculation] = useState<any>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [appliedPromoCode, setAppliedPromoCode] = useState<string>('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [isInsured, setIsInsured] = useState(false);
  const [distance, setDistance] = useState(5); // Default 5km
  const [currentCity, setCurrentCity] = useState('Batangas City'); // Default city

  // Wallet payment state
  const [useWalletPayment, setUseWalletPayment] = useState(false);
  const [walletPaymentAmount, setWalletPaymentAmount] = useState(0);
  const { wallet, hasWallet, balance: walletBalance, isLoading: walletLoading } = useWallet();

  // Address selection state
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [deliveryZone, setDeliveryZone] = useState<{ zone: string; deliveryFee: number } | null>(null);
  const [useAddressAutocomplete, setUseAddressAutocomplete] = useState(true);
  const [addressSelectionMode, setAddressSelectionMode] = useState<'saved' | 'autocomplete' | 'manual'>('saved');
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<SelectedDeliveryAddress | null>(null);

  // Pre-order scheduling state
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);

  // Delivery type state for contactless delivery
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(DELIVERY_TYPES.HAND_TO_CUSTOMER);
  const [contactlessInstructions, setContactlessInstructions] = useState("");

  // Pricing derived from delivery zone or defaults
  const deliveryFee = deliveryZone?.deliveryFee ?? 49; // Default delivery fee
  const serviceFee = pricingCalculation?.serviceFee ?? 10; // Default service fee

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

  const { data: userLoyaltyPoints } = useQuery<{
    points: number;
    tier: string;
    lifetimePoints: number;
  }>({
    queryKey: ["/api/loyalty/points"],
    enabled: !!user?.id
  });

  // Fetch saved addresses for the address selector
  interface SavedAddress {
    id: string;
    title: string;
    streetAddress: string;
    barangay?: string;
    city: string;
    province: string;
    zipCode?: string;
    landmark?: string;
    deliveryInstructions?: string;
    coordinates?: { lat: number; lng: number };
    isDefault: boolean;
  }

  const { data: savedAddresses = [], isLoading: isLoadingAddresses } = useQuery<SavedAddress[]>({
    queryKey: ["/api/customer/addresses"],
    enabled: !!user?.id
  });

  // Check if user has saved addresses
  const hasSavedAddresses = savedAddresses.length > 0;

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
      scheduledFor: null,
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

  // Optimistic update mutation for quantity changes
  const updateQuantityMutation = useMutation<
    { success: boolean; item: CartItem },
    Error,
    { itemId: string; quantity: number; previousQuantity: number },
    OptimisticUpdateContext
  >({
    mutationFn: async ({ itemId, quantity }) => {
      // Simulate API call - in a real app, this would sync with backend
      // For now, we'll just return success since cart is local-first
      await new Promise(resolve => setTimeout(resolve, 100));
      const item = items.find(i => i.id === itemId);
      if (!item) throw new Error('Item not found');
      return { success: true, item: { ...item, quantity } };
    },
    onMutate: async ({ itemId, quantity, previousQuantity }) => {
      // Cancel any outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      await queryClient.cancelQueries({ queryKey: ['/api/pricing/calculate'] });

      // Start tracking this operation
      const operationId = beginOptimisticUpdate('update', itemId);

      // Store previous state for rollback
      const previousItems = [...items];
      const previousPricing = pricingCalculation;

      // Mark item as updating
      setUpdatingItems(prev => new Set(prev).add(itemId));

      // Optimistically update the cart
      updateQuantity(itemId, quantity);

      return { previousItems, previousPricing, operationId };
    },
    onError: (error, { itemId, previousQuantity }, context) => {
      // Rollback to previous state
      if (context) {
        rollbackOperation(context.operationId);
      }

      // Show error toast
      toast({
        title: 'Failed to update quantity',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });

      // Remove from updating set
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    onSuccess: (data, { itemId }, context) => {
      // Commit the operation
      if (context) {
        commitOperation(context.operationId);
      }

      // Remove from updating set
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    onSettled: () => {
      // Trigger pricing recalculation with debounce
      if (pricingDebounceRef.current) {
        clearTimeout(pricingDebounceRef.current);
      }
      pricingDebounceRef.current = setTimeout(() => {
        const subtotal = getTotalPrice();
        if (subtotal > 0) {
          setIsCalculatingPricing(true);
          calculatePricingMutation.mutate({
            orderType: 'food',
            baseAmount: subtotal,
            city: currentCity,
            distance: distance,
            isInsured: isInsured,
            tip: tipAmount,
            loyaltyPoints: loyaltyPointsToUse,
            promoCode: appliedPromoCode
          });
        }
      }, 300);
    },
  });

  // Optimistic update mutation for removing items
  const removeItemMutation = useMutation<
    { success: boolean },
    Error,
    { itemId: string; itemName: string },
    OptimisticUpdateContext
  >({
    mutationFn: async ({ itemId }) => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    },
    onMutate: async ({ itemId }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });

      const operationId = beginOptimisticUpdate('remove', itemId);
      const previousItems = [...items];
      const previousPricing = pricingCalculation;

      setUpdatingItems(prev => new Set(prev).add(itemId));

      // Optimistically remove the item
      removeItem(itemId);

      return { previousItems, previousPricing, operationId };
    },
    onError: (error, { itemId, itemName }, context) => {
      if (context) {
        rollbackOperation(context.operationId);
      }

      toast({
        title: 'Failed to remove item',
        description: `Could not remove ${itemName}. Please try again.`,
        variant: 'destructive',
      });

      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    onSuccess: (data, { itemId, itemName }, context) => {
      if (context) {
        commitOperation(context.operationId);
      }

      toast({
        title: 'Item removed',
        description: `${itemName} has been removed from your cart`,
      });

      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    onSettled: () => {
      // Trigger pricing recalculation
      if (pricingDebounceRef.current) {
        clearTimeout(pricingDebounceRef.current);
      }
      pricingDebounceRef.current = setTimeout(() => {
        const subtotal = getTotalPrice();
        if (subtotal > 0) {
          setIsCalculatingPricing(true);
          calculatePricingMutation.mutate({
            orderType: 'food',
            baseAmount: subtotal,
            city: currentCity,
            distance: distance,
            isInsured: isInsured,
            tip: tipAmount,
            loyaltyPoints: loyaltyPointsToUse,
            promoCode: appliedPromoCode
          });
        }
      }, 300);
    },
  });

  // Handlers for optimistic cart operations
  const handleQuantityChange = useCallback((itemId: string, newQuantity: number, currentQuantity: number) => {
    if (newQuantity <= 0) {
      // Trigger remove instead
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleRemoveItem(itemId, item.name);
      }
      return;
    }

    updateQuantityMutation.mutate({
      itemId,
      quantity: newQuantity,
      previousQuantity: currentQuantity,
    });
  }, [items, updateQuantityMutation]);

  const handleRemoveItem = useCallback((itemId: string, itemName: string) => {
    removeItemMutation.mutate({ itemId, itemName });
  }, [removeItemMutation]);

  // Check if a specific item is being updated
  const isItemUpdating = useCallback((itemId: string) => {
    return updatingItems.has(itemId);
  }, [updatingItems]);

  // Check delivery zone based on coordinates
  const checkDeliveryZone = async (lat: number, lng: number) => {
    try {
      const restaurantId = getCurrentRestaurantId();
      const response = await apiRequest('POST', '/api/delivery-zones/check', {
        latitude: lat,
        longitude: lng,
        restaurantId: restaurantId || undefined
      });
      const result = await response.json();

      if (result.serviceable) {
        setDeliveryZone({
          zone: result.zone,
          deliveryFee: result.deliveryFee
        });
        setDistance(result.distanceKm);
      } else {
        setDeliveryZone(null);
        toast({
          title: "Outside Delivery Area",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking delivery zone:', error);
    }
  };

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
        
      } else if (orderData.paymentProvider === "nexuspay") {
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
          // Redirect to NexusPay payment page
          return { 
            order, 
            paymentType: "nexuspay", 
            paymentLink: paymentData.paymentLink,
            transactionId: paymentData.transactionId,
            pricing: paymentData.pricing
          };
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

    // Check if delivery address is complete
    if (!data.deliveryAddress.street || !data.deliveryAddress.city) {
      toast({
        title: "Delivery address required",
        description: "Please enter or select a delivery address.",
        variant: "destructive",
      });
      return;
    }

    const subtotal = getTotalPrice();
    const total = subtotal + deliveryFee + serviceFee;

    // Get coordinates from selected address if available
    let addressCoordinates = data.deliveryAddress.coordinates;
    if (!addressCoordinates && selectedSavedAddress?.coordinates) {
      addressCoordinates = selectedSavedAddress.coordinates;
    } else if (!addressCoordinates && selectedAddress?.coordinates) {
      addressCoordinates = selectedAddress.coordinates;
    }

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
      tip: tipAmount,
      promoCode: appliedPromoCode || undefined,
      promoDiscount: promoDiscount,
      totalAmount: total,
      paymentMethod: data.paymentProvider,
      paymentProvider: data.paymentProvider,
      paymentMethodType: data.paymentMethodType,
      // Saved payment method support
      savedPaymentMethodId: savedPaymentMethodId, // Use saved payment method if selected
      savePaymentMethod: savePaymentForFuture, // Option to save new payment method
      deliveryAddress: {
        ...data.deliveryAddress,
        coordinates: addressCoordinates // Include coordinates if available
      },
      specialInstructions: data.specialInstructions,
      paymentStatus: "pending",
      loyaltyPointsUsed: loyaltyPointsToUse,
      loyaltyDiscount: (loyaltyPointsToUse / 100) * 10,
      scheduledFor: scheduledFor ? scheduledFor.toISOString() : null, // Pre-order scheduling
      // Contactless delivery options
      deliveryType: deliveryType,
      contactlessInstructions: deliveryType === DELIVERY_TYPES.LEAVE_AT_DOOR ? contactlessInstructions : null,
    };

    createOrderMutation.mutate(orderData);
  };

  if (items.length === 0) {
    return (
      <CustomerPageWrapper
        pageTitle="Your Cart"
        pageDescription="Your shopping cart is currently empty"
      >
        <div className="min-h-screen bg-background pb-20" data-testid="empty-cart-page">
          <CustomerHeader title="Your Cart" showBack backPath="/restaurants" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EmptyState
              type="cart"
              title="Your cart is empty"
              description="Looks like you haven't added any items to your cart yet. Browse restaurants to find delicious food!"
              actionLabel="Browse Restaurants"
              actionLink="/restaurants"
            />
          </div>
        </div>
      </CustomerPageWrapper>
    );
  }

  const subtotal = getTotalPrice();
  const total = subtotal + deliveryFee + serviceFee + tipAmount - promoDiscount;

  return (
    <CustomerPageWrapper
      refreshQueryKeys={["/api/pricing/calculate", "/api/customer/addresses", "/api/loyalty/points"]}
      pageTitle="Your Cart"
      pageDescription="Review your order items and complete checkout"
    >
      <div className="min-h-screen bg-background pb-20" data-testid="cart-page">
        <CustomerHeader title="Your Cart" showBack backPath="/restaurants" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cart Summary */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground" data-testid="cart-title">Review your order and complete checkout</p>
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
                {items.map((item) => {
                  const itemIsUpdating = isItemUpdating(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center space-x-4 p-4 border border-border rounded-lg transition-all duration-200 ${
                        itemIsUpdating ? 'opacity-70 bg-muted/50' : ''
                      }`}
                      data-testid={`cart-item-${item.id}`}
                    >
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        data-testid={`cart-item-image-${item.id}`}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground" data-testid={`cart-item-name-${item.id}`}>
                          {item.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">PHP{item.price.toFixed(2)} each</p>
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
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1, item.quantity)}
                            disabled={itemIsUpdating}
                            data-testid={`decrease-quantity-${item.id}`}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            {itemIsUpdating && item.quantity === 1 ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </Button>
                          <span
                            className={`font-semibold min-w-[1.5rem] text-center ${
                              itemIsUpdating ? 'text-muted-foreground' : ''
                            }`}
                            data-testid={`item-quantity-${item.id}`}
                          >
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1, item.quantity)}
                            disabled={itemIsUpdating}
                            data-testid={`increase-quantity-${item.id}`}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <span
                          className={`font-bold w-20 text-right transition-colors ${
                            itemIsUpdating ? 'text-muted-foreground' : 'text-primary'
                          }`}
                          data-testid={`item-total-${item.id}`}
                        >
                          PHP{(item.price * item.quantity).toFixed(2)}
                        </span>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(item.id, item.name)}
                          disabled={itemIsUpdating}
                          data-testid={`remove-item-${item.id}`}
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          {itemIsUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Delivery Address Section - Enhanced with saved addresses */}
            <Card data-testid="delivery-address-section">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Delivery Address</span>
                  </div>
                  {deliveryZone && (
                    <DeliveryZoneBadge zone={deliveryZone.zone} deliveryFee={deliveryZone.deliveryFee} />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Address Selection Mode Tabs - for users with saved addresses */}
                {user && hasSavedAddresses && (
                  <Tabs
                    value={addressSelectionMode}
                    onValueChange={(value) => setAddressSelectionMode(value as 'saved' | 'autocomplete' | 'manual')}
                    className="mb-4"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="saved" className="text-xs sm:text-sm">
                        <Star className="h-3 w-3 mr-1 hidden sm:inline" />
                        Saved
                      </TabsTrigger>
                      <TabsTrigger value="autocomplete" className="text-xs sm:text-sm">
                        <Search className="h-3 w-3 mr-1 hidden sm:inline" />
                        Search
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="text-xs sm:text-sm">
                        <MapPin className="h-3 w-3 mr-1 hidden sm:inline" />
                        Manual
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {/* Mode Toggle for users without saved addresses */}
                {(!user || !hasSavedAddresses) && (
                  <div className="flex items-center justify-between mb-4 pb-4 border-b">
                    <div className="text-sm text-muted-foreground">
                      {addressSelectionMode === 'autocomplete' ? 'Search for your address' : 'Enter address manually'}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddressSelectionMode(
                        addressSelectionMode === 'autocomplete' ? 'manual' : 'autocomplete'
                      )}
                    >
                      {addressSelectionMode === 'autocomplete' ? (
                        <>Enter Manually</>
                      ) : (
                        <><Search className="h-4 w-4 mr-1" /> Search Address</>
                      )}
                    </Button>
                  </div>
                )}

                {/* Saved Addresses Mode */}
                {addressSelectionMode === 'saved' && isLoadingAddresses && (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                        <div className="h-4 w-4 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-20 bg-muted rounded" />
                          <div className="h-3 w-40 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {addressSelectionMode === 'saved' && !isLoadingAddresses && hasSavedAddresses && (
                  <AddressSelector
                    onAddressSelect={(address) => {
                      setSelectedSavedAddress(address);
                      setSelectedAddress(null);
                      // Update form values
                      form.setValue('deliveryAddress.street', address.street || '');
                      form.setValue('deliveryAddress.barangay', address.barangay || '');
                      form.setValue('deliveryAddress.city', address.city || '');
                      form.setValue('deliveryAddress.province', address.province || 'Batangas');
                      form.setValue('deliveryAddress.zipCode', address.zipCode || '');

                      // Update current city for pricing
                      if (address.city) {
                        setCurrentCity(address.city);
                      }

                      // Check delivery zone if coordinates available
                      if (address.coordinates) {
                        checkDeliveryZone(address.coordinates.lat, address.coordinates.lng);
                      }
                    }}
                    selectedAddressId={selectedSavedAddress?.id}
                    showAddNewOption={true}
                    allowNewAddressEntry={true}
                  />
                )}

                {/* Address Autocomplete Mode */}
                {addressSelectionMode === 'autocomplete' && (
                  <div className="space-y-4">
                    <AddressAutocomplete
                      placeholder="Search for your delivery address..."
                      showValidation={true}
                      manualEntryAllowed={true}
                      onAddressSelect={(address) => {
                        if (!address) return;
                        setSelectedAddress(address);
                        setSelectedSavedAddress(null);
                        // Update form values
                        if (address && 'street' in address) {
                          const addr = address as { street?: string; barangay?: string; city?: string; province?: string; zipCode?: string };
                          form.setValue('deliveryAddress.street', addr.street || '');
                          form.setValue('deliveryAddress.barangay', addr.barangay || '');
                          form.setValue('deliveryAddress.city', addr.city || '');
                          form.setValue('deliveryAddress.province', addr.province || 'Batangas');
                          form.setValue('deliveryAddress.zipCode', addr.zipCode || '');

                          // Update current city for pricing
                          if (addr.city) {
                            setCurrentCity(addr.city);
                          }
                        }

                        // Check delivery zone if coordinates available
                        if (address && 'coordinates' in address) {
                          const addrWithCoords = address as { coordinates?: { lat: number; lng: number } };
                          if (addrWithCoords.coordinates) {
                            checkDeliveryZone(addrWithCoords.coordinates.lat, addrWithCoords.coordinates.lng);
                          }
                        }
                      }}
                    />

                    {/* Selected Address Preview */}
                    {selectedAddress && (
                      <div className="p-3 rounded-lg bg-muted">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">
                              {'fullAddress' in selectedAddress
                                ? selectedAddress.fullAddress
                                : selectedAddress.formattedAddress}
                            </p>
                            {'coordinates' in selectedAddress && selectedAddress.coordinates && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Coordinates: {selectedAddress.coordinates.lat.toFixed(4)}, {selectedAddress.coordinates.lng.toFixed(4)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Entry Mode */}
                {addressSelectionMode === 'manual' && (
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
                )}

                {/* Link to manage addresses */}
                {user && (
                  <div className="mt-4 pt-4 border-t">
                    <Link href="/customer/addresses">
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">
                        <MapPin className="h-3 w-3 mr-1" />
                        Manage saved addresses
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Options - Contactless Delivery */}
            <DeliveryOptions
              value={deliveryType}
              onChange={setDeliveryType}
              contactlessInstructions={contactlessInstructions}
              onContactlessInstructionsChange={setContactlessInstructions}
              className="mt-6"
            />

            {/* Pre-Order Scheduling */}
            <SchedulePicker
              value={scheduledFor}
              onChange={setScheduledFor}
              className="mt-6"
            />
          </div>

          {/* Order Summary & Payment */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Tip Your Rider */}
              <TipSelector
                subtotal={subtotal}
                value={tipAmount}
                onChange={setTipAmount}
              />

              {/* Promo Code */}
              <PromoCodeInput
                subtotal={subtotal}
                appliedCode={appliedPromoCode}
                onApply={(code, discount) => {
                  setAppliedPromoCode(code);
                  setPromoDiscount(discount);
                }}
                onRemove={() => {
                  setAppliedPromoCode('');
                  setPromoDiscount(0);
                }}
              />

              {/* Loyalty Points Section */}
              {user && (
                <Card data-testid="loyalty-points-section" className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Gift className="h-5 w-5 text-orange-600" />
                      Loyalty Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Available Points */}
                    {userLoyaltyPoints && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Available Points:</span>
                        <Badge variant="outline" className="bg-white border-orange-200">
                          <Coins className="h-3 w-3 mr-1 text-orange-600" />
                          {userLoyaltyPoints.points?.toLocaleString() || 0}
                        </Badge>
                      </div>
                    )}

                    {/* Points Redemption Slider */}
                    {userLoyaltyPoints && userLoyaltyPoints.points >= 100 && (
                      <div className="space-y-3 p-3 bg-white rounded-lg border border-orange-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Redeem Points</span>
                          <div className="text-right">
                            <span className="text-sm font-bold text-orange-600">
                              {loyaltyPointsToUse} pts
                            </span>
                            <span className="text-xs text-gray-500 block">
                              = ₱{((loyaltyPointsToUse / 100) * 10).toFixed(2)} off
                            </span>
                          </div>
                        </div>
                        <Slider
                          value={[loyaltyPointsToUse]}
                          onValueChange={(value) => setLoyaltyPointsToUse(Math.floor(value[0] / 100) * 100)}
                          max={Math.min(userLoyaltyPoints.points, Math.floor(subtotal / 10) * 100)}
                          min={0}
                          step={100}
                          className="py-2"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0 pts</span>
                          <span>{Math.min(userLoyaltyPoints.points, Math.floor(subtotal / 10) * 100).toLocaleString()} pts max</span>
                        </div>
                      </div>
                    )}

                    {/* Points to Earn Preview */}
                    {subtotal > 0 && (
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-700">You'll earn:</span>
                        </div>
                        <span className="font-semibold text-green-700">
                          ~{Math.floor(subtotal / 10)} pts
                        </span>
                      </div>
                    )}

                    {/* Low points message */}
                    {userLoyaltyPoints && userLoyaltyPoints.points < 100 && (
                      <p className="text-xs text-gray-500 text-center">
                        Earn {100 - (userLoyaltyPoints.points || 0)} more points to start redeeming!
                      </p>
                    )}

                    <Link href="/loyalty">
                      <Button variant="ghost" size="sm" className="w-full text-orange-600 hover:bg-orange-100">
                        View Rewards Program
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              {/* Order Summary with Tax Breakdown */}
              <Card data-testid="order-summary">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      Order Summary
                      {isCalculatingPricing && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </span>
                    <TaxSummaryLine subtotal={subtotal} deliveryFee={deliveryFee} serviceFee={serviceFee} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pricing calculation error alert */}
                  {calculatePricingMutation.isError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Failed to calculate pricing. Using default rates.
                      </AlertDescription>
                    </Alert>
                  )}
                  {/* Tax-aware breakdown with Senior/PWD discounts */}
                  <TaxBreakdown
                    subtotal={subtotal}
                    deliveryFee={deliveryFee}
                    serviceFee={serviceFee}
                  />

                  {/* Tip Amount */}
                  {tipAmount > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1 text-pink-600">
                          <Heart className="h-3 w-3" />
                          Rider Tip:
                        </span>
                        <span className="text-pink-600" data-testid="summary-tip">+₱{tipAmount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {/* Promo Discount */}
                  {promoDiscount > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Promo Discount:
                        </span>
                        <span data-testid="summary-promo-discount">-₱{promoDiscount.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {/* Loyalty Points Discount (applied on top of tax calculations) */}
                  {loyaltyPointsToUse > 0 && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm text-green-600">
                        <span className="flex items-center gap-1">
                          <Gift className="h-3 w-3" />
                          Points Discount:
                        </span>
                        <span data-testid="summary-loyalty-discount">-₱{((loyaltyPointsToUse / 100) * 10).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Final Total:</span>
                        <span data-testid="summary-total">₱{Math.max(0, total - (loyaltyPointsToUse / 100) * 10).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-green-600 text-center">
                        You're saving ₱{((loyaltyPointsToUse / 100) * 10).toFixed(2)} with loyalty points!
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Wallet Payment Option */}
              <WalletBalance
                variant="checkout"
                orderTotal={Math.max(0, total - (loyaltyPointsToUse / 100) * 10)}
                onUseWalletChange={(useWallet, amount, remaining) => {
                  setUseWalletPayment(useWallet);
                  setWalletPaymentAmount(amount);
                }}
              />

              {/* Show remaining amount to pay after wallet */}
              {useWalletPayment && walletPaymentAmount > 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    <div className="flex justify-between items-center">
                      <span>Wallet will pay: <strong>₱{walletPaymentAmount.toFixed(2)}</strong></span>
                      {Math.max(0, total - (loyaltyPointsToUse / 100) * 10) - walletPaymentAmount > 0 && (
                        <span>Remaining: <strong>₱{(Math.max(0, total - (loyaltyPointsToUse / 100) * 10) - walletPaymentAmount).toFixed(2)}</strong></span>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Payment Method - only show if there's remaining amount after wallet */}
              {(!useWalletPayment || (Math.max(0, total - (loyaltyPointsToUse / 100) * 10) - walletPaymentAmount > 0)) && (
                <PaymentMethodSelector
                  selectedMethodId={savedPaymentMethodId}
                  showSaveOption={true}
                  onSelectPaymentMethod={(method) => {
                    if (method.type === 'cod') {
                      setSelectedPaymentProvider('cod');
                      setSelectedPaymentMethod('cash');
                      setSavedPaymentMethodId(undefined);
                      setSavePaymentForFuture(false);
                      form.setValue('paymentProvider', 'cod');
                      form.setValue('paymentMethodType', '');
                      form.setValue('savePaymentMethod', false);
                    } else if (method.type === 'saved') {
                      setSelectedPaymentProvider('nexuspay');
                      setSelectedPaymentMethod(method.paymentMethodType || '');
                      setSavedPaymentMethodId(method.savedMethodId);
                      setSavePaymentForFuture(false);
                      form.setValue('paymentProvider', 'nexuspay');
                      form.setValue('paymentMethodType', method.paymentMethodType || '');
                      form.setValue('savePaymentMethod', false);
                    } else if (method.type === 'new') {
                      setSelectedPaymentProvider('nexuspay');
                      setSelectedPaymentMethod(method.paymentMethodType || '');
                      setSavedPaymentMethodId(undefined);
                      setSavePaymentForFuture(method.saveForFuture || false);
                      form.setValue('paymentProvider', 'nexuspay');
                      form.setValue('paymentMethodType', method.paymentMethodType || '');
                      form.setValue('savePaymentMethod', method.saveForFuture || false);
                    }
                  }}
                />
              )}

              {/* Special Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Special Instructions (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <FormField
                      control={form.control}
                      name="specialInstructions"
                      render={({ field }) => (
                        <FormItem>
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
                onClick={form.handleSubmit(onSubmit, (errors) => {
                  console.error("Form validation errors:", errors);
                  // Show first validation error to user
                  const firstError = Object.entries(errors)[0];
                  if (firstError) {
                    const [field, error] = firstError;
                    toast({
                      title: "Please complete your order details",
                      description: typeof error?.message === 'string'
                        ? error.message
                        : `Please check the ${field.replace('deliveryAddress.', '')} field`,
                      variant: "destructive"
                    });
                  }
                })}
                disabled={createOrderMutation.isPending}
                data-testid="place-order-button"
              >
                {createOrderMutation.isPending ? "Placing Order..." : (
                  useWalletPayment && walletPaymentAmount >= Math.max(0, total - (loyaltyPointsToUse / 100) * 10)
                    ? `Pay with Wallet - ₱${Math.max(0, total - (loyaltyPointsToUse / 100) * 10).toFixed(2)}`
                    : `Place Order - ₱${Math.max(0, total - (loyaltyPointsToUse / 100) * 10).toFixed(2)}`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </CustomerPageWrapper>
  );
}
