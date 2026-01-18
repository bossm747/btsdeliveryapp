import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

type ToastType =
  | "orderPlaced"
  | "orderCancelled"
  | "itemAdded"
  | "itemRemoved"
  | "cartCleared"
  | "addressSaved"
  | "addressDeleted"
  | "favoriteAdded"
  | "favoriteRemoved"
  | "profileUpdated"
  | "paymentAdded"
  | "paymentRemoved"
  | "promoApplied"
  | "promoInvalid"
  | "pointsRedeemed"
  | "reviewSubmitted"
  | "error"
  | "networkError"
  | "sessionExpired";

interface ToastConfig {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

const toastConfigs: Record<ToastType, ToastConfig> = {
  orderPlaced: {
    title: "Order Placed!",
    description: "Your order has been submitted. We'll notify you when it's being prepared.",
  },
  orderCancelled: {
    title: "Order Cancelled",
    description: "Your order has been cancelled. Any payment will be refunded.",
  },
  itemAdded: {
    title: "Added to Cart",
    description: "Item has been added to your cart.",
  },
  itemRemoved: {
    title: "Removed from Cart",
    description: "Item has been removed from your cart.",
  },
  cartCleared: {
    title: "Cart Cleared",
    description: "All items have been removed from your cart.",
  },
  addressSaved: {
    title: "Address Saved",
    description: "Your delivery address has been saved successfully.",
  },
  addressDeleted: {
    title: "Address Deleted",
    description: "The address has been removed from your saved addresses.",
  },
  favoriteAdded: {
    title: "Added to Favorites",
    description: "Restaurant has been added to your favorites.",
  },
  favoriteRemoved: {
    title: "Removed from Favorites",
    description: "Restaurant has been removed from your favorites.",
  },
  profileUpdated: {
    title: "Profile Updated",
    description: "Your profile information has been updated successfully.",
  },
  paymentAdded: {
    title: "Payment Method Added",
    description: "Your payment method has been saved securely.",
  },
  paymentRemoved: {
    title: "Payment Method Removed",
    description: "The payment method has been removed from your account.",
  },
  promoApplied: {
    title: "Promo Applied!",
    description: "The promo code has been applied to your order.",
  },
  promoInvalid: {
    title: "Invalid Promo Code",
    description: "The promo code is invalid or has expired. Please try another.",
    variant: "destructive",
  },
  pointsRedeemed: {
    title: "Points Redeemed",
    description: "Your loyalty points have been applied to this order.",
  },
  reviewSubmitted: {
    title: "Review Submitted",
    description: "Thank you for your feedback! Your review has been submitted.",
  },
  error: {
    title: "Something went wrong",
    description: "An error occurred. Please try again.",
    variant: "destructive",
  },
  networkError: {
    title: "Connection Error",
    description: "Please check your internet connection and try again.",
    variant: "destructive",
  },
  sessionExpired: {
    title: "Session Expired",
    description: "Your session has expired. Please log in again.",
    variant: "destructive",
  },
};

export function useCustomerToast() {
  const { toast } = useToast();

  const showToast = useCallback(
    (type: ToastType, customDescription?: string) => {
      const config = toastConfigs[type];
      toast({
        title: config.title,
        description: customDescription || config.description,
        variant: config.variant || "default",
      });
    },
    [toast]
  );

  const showCustomToast = useCallback(
    (
      title: string,
      description: string,
      variant: "default" | "destructive" = "default"
    ) => {
      toast({ title, description, variant });
    },
    [toast]
  );

  const showSuccessToast = useCallback(
    (title: string, description: string) => {
      toast({ title, description, variant: "default" });
    },
    [toast]
  );

  const showErrorToast = useCallback(
    (title: string, description: string) => {
      toast({ title, description, variant: "destructive" });
    },
    [toast]
  );

  return {
    showToast,
    showCustomToast,
    showSuccessToast,
    showErrorToast,
    // Convenience methods
    orderPlaced: () => showToast("orderPlaced"),
    orderCancelled: () => showToast("orderCancelled"),
    itemAdded: (itemName?: string) =>
      showToast("itemAdded", itemName ? `${itemName} has been added to your cart.` : undefined),
    itemRemoved: (itemName?: string) =>
      showToast("itemRemoved", itemName ? `${itemName} has been removed from your cart.` : undefined),
    cartCleared: () => showToast("cartCleared"),
    addressSaved: () => showToast("addressSaved"),
    addressDeleted: () => showToast("addressDeleted"),
    favoriteAdded: (restaurantName?: string) =>
      showToast("favoriteAdded", restaurantName ? `${restaurantName} has been added to your favorites.` : undefined),
    favoriteRemoved: (restaurantName?: string) =>
      showToast("favoriteRemoved", restaurantName ? `${restaurantName} has been removed from your favorites.` : undefined),
    profileUpdated: () => showToast("profileUpdated"),
    paymentAdded: () => showToast("paymentAdded"),
    paymentRemoved: () => showToast("paymentRemoved"),
    promoApplied: (discount?: string) =>
      showToast("promoApplied", discount ? `The promo code has been applied. You saved ${discount}!` : undefined),
    promoInvalid: () => showToast("promoInvalid"),
    pointsRedeemed: (points?: number) =>
      showToast("pointsRedeemed", points ? `${points} loyalty points have been applied to this order.` : undefined),
    reviewSubmitted: () => showToast("reviewSubmitted"),
    error: (message?: string) => showToast("error", message),
    networkError: () => showToast("networkError"),
    sessionExpired: () => showToast("sessionExpired"),
  };
}

export default useCustomerToast;
