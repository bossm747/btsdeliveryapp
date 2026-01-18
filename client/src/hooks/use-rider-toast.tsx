import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

/**
 * Custom hook for rider-specific toast notifications
 * Provides pre-defined toast messages for common rider actions
 * Uses Batangas Tagalog dialect mixed with English (Taglish)
 */
export function useRiderToast() {
  const { toast } = useToast();

  // Status-related toasts
  const wentOnline = useCallback(() => {
    toast({
      title: "Online na kayo!",
      description: "Makakatanggap na kayo ng mga delivery requests.",
    });
  }, [toast]);

  const wentOffline = useCallback(() => {
    toast({
      title: "Offline na kayo",
      description: "Hindi na kayo makakatanggap ng bagong delivery.",
    });
  }, [toast]);

  // Delivery-related toasts
  const deliveryAccepted = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Delivery Accepted!",
        description: orderNumber
          ? `Order #${orderNumber} - Puntahan ang restaurant para kunin ang order.`
          : "Puntahan ang restaurant para kunin ang order.",
      });
    },
    [toast]
  );

  const deliveryRejected = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Skipped",
        description: orderNumber
          ? `Order #${orderNumber} has been removed from your queue.`
          : "The order has been removed from your queue.",
      });
    },
    [toast]
  );

  const deliveryPickedUp = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Picked Up!",
        description: orderNumber
          ? `Order #${orderNumber} - Navigate to the delivery location.`
          : "Navigate to the delivery location.",
      });
    },
    [toast]
  );

  const deliveryCompleted = useCallback(
    (orderNumber?: string, earnings?: number) => {
      toast({
        title: "Delivery Completed!",
        description: orderNumber
          ? `Order #${orderNumber} delivered successfully.${earnings ? ` You earned ₱${earnings.toFixed(2)}` : ""}`
          : "Order delivered successfully. Great job!",
      });
    },
    [toast]
  );

  const deliveryCancelled = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Delivery Cancelled",
        description: orderNumber
          ? `Order #${orderNumber} has been cancelled.`
          : "The delivery has been cancelled.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const deliveryReassigned = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Delivery Reassigned",
        description: orderNumber
          ? `Order #${orderNumber} has been reassigned to another rider.`
          : "The delivery has been reassigned to another rider.",
        variant: "destructive",
      });
    },
    [toast]
  );

  // Batch delivery toasts
  const batchAccepted = useCallback(
    (orderCount?: number) => {
      toast({
        title: "Batch Accepted!",
        description: orderCount
          ? `${orderCount} orders accepted. Navigate to the first pickup location.`
          : "Batch delivery accepted. Navigate to the first pickup location.",
      });
    },
    [toast]
  );

  const batchDeclined = useCallback(() => {
    toast({
      title: "Batch Declined",
      description: "The batch offer has been removed from your queue.",
    });
  }, [toast]);

  // Navigation toasts
  const navigationStarted = useCallback(
    (destination?: string) => {
      toast({
        title: "Navigation Started",
        description: destination
          ? `Navigating to ${destination}.`
          : "Follow the route to your destination.",
      });
    },
    [toast]
  );

  const arrivedAtPickup = useCallback(
    (restaurantName?: string) => {
      toast({
        title: "Arrived at Pickup",
        description: restaurantName
          ? `You've arrived at ${restaurantName}. Collect the order.`
          : "You've arrived at the pickup location.",
      });
    },
    [toast]
  );

  const arrivedAtDelivery = useCallback(
    (customerName?: string) => {
      toast({
        title: "Arrived at Delivery",
        description: customerName
          ? `You've arrived at ${customerName}'s location. Complete the delivery.`
          : "You've arrived at the delivery location.",
      });
    },
    [toast]
  );

  // Earnings toasts
  const earningsUpdated = useCallback(
    (amount?: number) => {
      toast({
        title: "Earnings Updated",
        description: amount
          ? `Your total earnings are now ₱${amount.toFixed(2)}.`
          : "Your earnings have been updated.",
      });
    },
    [toast]
  );

  const bonusEarned = useCallback(
    (amount?: number, reason?: string) => {
      toast({
        title: "Bonus Earned!",
        description: amount
          ? `You earned a ₱${amount.toFixed(2)} bonus${reason ? ` for ${reason}` : ""}!`
          : "You earned a bonus! Check your earnings.",
      });
    },
    [toast]
  );

  const tipReceived = useCallback(
    (amount?: number) => {
      toast({
        title: "Tip Received!",
        description: amount
          ? `You received a ₱${amount.toFixed(2)} tip from the customer!`
          : "You received a tip from the customer!",
      });
    },
    [toast]
  );

  const payoutProcessed = useCallback(
    (amount?: number) => {
      toast({
        title: "Payout Processed",
        description: amount
          ? `₱${amount.toFixed(2)} has been transferred to your account.`
          : "Your payout has been processed successfully.",
      });
    },
    [toast]
  );

  // Performance toasts
  const ratingReceived = useCallback(
    (rating?: number) => {
      toast({
        title: "New Rating Received",
        description: rating
          ? `You received a ${rating}-star rating. ${rating >= 4 ? "Great job!" : "Keep improving!"}`
          : "You received a new rating from a customer.",
      });
    },
    [toast]
  );

  const performanceGoalReached = useCallback(
    (goal?: string) => {
      toast({
        title: "Goal Reached!",
        description: goal
          ? `Congratulations! You've reached your ${goal} goal.`
          : "Congratulations! You've reached your performance goal.",
      });
    },
    [toast]
  );

  const acceptanceRateWarning = useCallback(() => {
    toast({
      title: "Acceptance Rate Low",
      description: "Your acceptance rate is dropping. Try to accept more orders to maintain your status.",
      variant: "destructive",
    });
  }, [toast]);

  // Location toasts
  const locationUpdated = useCallback(() => {
    toast({
      title: "Location Updated",
      description: "Your location has been updated successfully.",
    });
  }, [toast]);

  const locationError = useCallback(() => {
    toast({
      title: "Location Error",
      description: "Unable to get your location. Please enable location services.",
      variant: "destructive",
    });
  }, [toast]);

  const enteredDeliveryZone = useCallback(
    (zoneName?: string) => {
      toast({
        title: "Entered Delivery Zone",
        description: zoneName
          ? `You're now in the ${zoneName} delivery zone.`
          : "You've entered an active delivery zone.",
      });
    },
    [toast]
  );

  const leftDeliveryZone = useCallback(() => {
    toast({
      title: "Left Delivery Zone",
      description: "You've left the active delivery zone. Orders may be limited.",
      variant: "destructive",
    });
  }, [toast]);

  // New order notification
  const newOrderAvailable = useCallback(
    (restaurantName?: string, earnings?: number) => {
      toast({
        title: "New Order Available!",
        description: restaurantName
          ? `${restaurantName}${earnings ? ` - ₱${earnings.toFixed(2)}` : ""}`
          : "A new delivery is available nearby.",
      });
    },
    [toast]
  );

  const orderExpired = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Expired",
        description: orderNumber
          ? `Order #${orderNumber} has expired and been reassigned.`
          : "The order has expired and been reassigned.",
        variant: "destructive",
      });
    },
    [toast]
  );

  // Error toasts
  const error = useCallback(
    (message?: string) => {
      toast({
        title: "Error",
        description: message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const networkError = useCallback(() => {
    toast({
      title: "Connection Error",
      description: "Unable to connect to the server. Please check your internet connection.",
      variant: "destructive",
    });
  }, [toast]);

  // Success toasts
  const success = useCallback(
    (message: string) => {
      toast({
        title: "Success",
        description: message,
      });
    },
    [toast]
  );

  // Info toasts
  const info = useCallback(
    (message: string) => {
      toast({
        description: message,
      });
    },
    [toast]
  );

  // Proof of delivery
  const proofSubmitted = useCallback(() => {
    toast({
      title: "Proof Submitted",
      description: "Delivery proof has been submitted successfully.",
    });
  }, [toast]);

  const proofRequired = useCallback(() => {
    toast({
      title: "Proof Required",
      description: "Please take a photo as proof of delivery before completing.",
      variant: "destructive",
    });
  }, [toast]);

  // Customer communication
  const callingCustomer = useCallback(
    (customerName?: string) => {
      toast({
        title: "Calling Customer",
        description: customerName
          ? `Connecting to ${customerName}...`
          : "Connecting to customer...",
      });
    },
    [toast]
  );

  const messageSent = useCallback(() => {
    toast({
      title: "Message Sent",
      description: "Your message has been sent to the customer.",
    });
  }, [toast]);

  return {
    // Status
    wentOnline,
    wentOffline,

    // Delivery
    deliveryAccepted,
    deliveryRejected,
    deliveryPickedUp,
    deliveryCompleted,
    deliveryCancelled,
    deliveryReassigned,

    // Batch
    batchAccepted,
    batchDeclined,

    // Navigation
    navigationStarted,
    arrivedAtPickup,
    arrivedAtDelivery,

    // Earnings
    earningsUpdated,
    bonusEarned,
    tipReceived,
    payoutProcessed,

    // Performance
    ratingReceived,
    performanceGoalReached,
    acceptanceRateWarning,

    // Location
    locationUpdated,
    locationError,
    enteredDeliveryZone,
    leftDeliveryZone,

    // Orders
    newOrderAvailable,
    orderExpired,

    // Proof
    proofSubmitted,
    proofRequired,

    // Customer communication
    callingCustomer,
    messageSent,

    // Generic
    error,
    networkError,
    success,
    info,

    // Raw toast function for custom messages
    toast,
  };
}
