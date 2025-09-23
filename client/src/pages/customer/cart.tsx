import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Minus, Trash2, MapPin, CreditCard, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { DeliveryAddress } from "@/lib/types";
import { PAYMENT_METHODS } from "@/lib/types";
import btsLogo from "@assets/bts-logo-transparent.png";

const deliveryAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  barangay: z.string().min(1, "Barangay is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().default("Batangas"),
  zipCode: z.string().min(4, "Valid zip code required"),
});

const orderSchema = z.object({
  deliveryAddress: deliveryAddressSchema,
  paymentMethod: z.enum(["cash", "gcash", "maya", "card"]),
  specialInstructions: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice, getCurrentRestaurantId } = useCart();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [serviceFee] = useState(0);
  const [deliveryFee] = useState(49);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      deliveryAddress: {
        street: "",
        barangay: "",
        city: "",
        province: "Batangas",
        zipCode: "",
      },
      paymentMethod: "cash",
      specialInstructions: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // First create the order
      const orderResponse = await apiRequest("POST", "/api/orders", orderData);
      const order = await orderResponse.json();
      
      // If payment method is not cash, create NexusPay payment
      if (orderData.paymentMethod !== "cash") {
        const paymentResponse = await apiRequest("POST", "/api/payment/create", {
          amount: orderData.totalAmount,
          orderId: order.id
        });
        const paymentData = await paymentResponse.json();
        
        if (paymentData.success && paymentData.paymentLink) {
          // Redirect to NexusPay payment page
          window.location.href = paymentData.paymentLink;
          return order;
        }
      }
      
      return order;
    },
    onSuccess: async (order) => {
      if (form.getValues("paymentMethod") === "cash") {
        toast({
          title: "Order placed successfully!",
          description: `Your order #${order.orderNumber} has been placed.`,
        });
        clearCart();
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        setLocation(`/order/${order.id}`);
      }
      // For digital payments, user will be redirected to payment page
    },
    onError: (error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
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
