import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

/**
 * Custom hook for vendor-specific toast notifications
 * Provides pre-defined toast messages for common vendor actions
 */
export function useVendorToast() {
  const { toast } = useToast();

  // Order-related toasts
  const orderAccepted = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Accepted",
        description: orderNumber
          ? `Order #${orderNumber} has been accepted successfully.`
          : "Order has been accepted successfully.",
      });
    },
    [toast]
  );

  const orderRejected = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Rejected",
        description: orderNumber
          ? `Order #${orderNumber} has been rejected.`
          : "Order has been rejected.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const orderReady = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Ready for Pickup",
        description: orderNumber
          ? `Order #${orderNumber} is ready for rider pickup.`
          : "Order is ready for rider pickup.",
      });
    },
    [toast]
  );

  const orderCompleted = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Completed",
        description: orderNumber
          ? `Order #${orderNumber} has been completed successfully.`
          : "Order has been completed successfully.",
      });
    },
    [toast]
  );

  const orderCancelled = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Cancelled",
        description: orderNumber
          ? `Order #${orderNumber} has been cancelled.`
          : "Order has been cancelled.",
        variant: "destructive",
      });
    },
    [toast]
  );

  // Menu-related toasts
  const menuItemAdded = useCallback(
    (itemName?: string) => {
      toast({
        title: "Menu Item Added",
        description: itemName
          ? `${itemName} has been added to your menu.`
          : "Menu item has been added successfully.",
      });
    },
    [toast]
  );

  const menuItemUpdated = useCallback(
    (itemName?: string) => {
      toast({
        title: "Menu Item Updated",
        description: itemName
          ? `${itemName} has been updated successfully.`
          : "Menu item has been updated successfully.",
      });
    },
    [toast]
  );

  const menuItemDeleted = useCallback(
    (itemName?: string) => {
      toast({
        title: "Menu Item Deleted",
        description: itemName
          ? `${itemName} has been removed from your menu.`
          : "Menu item has been removed successfully.",
      });
    },
    [toast]
  );

  const menuItemOutOfStock = useCallback(
    (itemName?: string) => {
      toast({
        title: "Item Marked Unavailable",
        description: itemName
          ? `${itemName} has been marked as out of stock.`
          : "Item has been marked as unavailable.",
      });
    },
    [toast]
  );

  const menuItemBackInStock = useCallback(
    (itemName?: string) => {
      toast({
        title: "Item Available Again",
        description: itemName
          ? `${itemName} is now available for orders.`
          : "Item is now available for orders.",
      });
    },
    [toast]
  );

  const categoryAdded = useCallback(
    (categoryName?: string) => {
      toast({
        title: "Category Added",
        description: categoryName
          ? `${categoryName} category has been created.`
          : "Category has been created successfully.",
      });
    },
    [toast]
  );

  const categoryUpdated = useCallback(
    (categoryName?: string) => {
      toast({
        title: "Category Updated",
        description: categoryName
          ? `${categoryName} category has been updated.`
          : "Category has been updated successfully.",
      });
    },
    [toast]
  );

  const categoryDeleted = useCallback(
    (categoryName?: string) => {
      toast({
        title: "Category Deleted",
        description: categoryName
          ? `${categoryName} category has been removed.`
          : "Category has been removed successfully.",
      });
    },
    [toast]
  );

  // Promotion-related toasts
  const promotionCreated = useCallback(
    (promoName?: string) => {
      toast({
        title: "Promotion Created",
        description: promoName
          ? `${promoName} promotion is now active.`
          : "Promotion has been created successfully.",
      });
    },
    [toast]
  );

  const promotionUpdated = useCallback(
    (promoName?: string) => {
      toast({
        title: "Promotion Updated",
        description: promoName
          ? `${promoName} promotion has been updated.`
          : "Promotion has been updated successfully.",
      });
    },
    [toast]
  );

  const promotionDeleted = useCallback(
    (promoName?: string) => {
      toast({
        title: "Promotion Deleted",
        description: promoName
          ? `${promoName} promotion has been removed.`
          : "Promotion has been removed successfully.",
      });
    },
    [toast]
  );

  const promotionActivated = useCallback(
    (promoName?: string) => {
      toast({
        title: "Promotion Activated",
        description: promoName
          ? `${promoName} is now active.`
          : "Promotion is now active.",
      });
    },
    [toast]
  );

  const promotionDeactivated = useCallback(
    (promoName?: string) => {
      toast({
        title: "Promotion Deactivated",
        description: promoName
          ? `${promoName} has been deactivated.`
          : "Promotion has been deactivated.",
      });
    },
    [toast]
  );

  // Business settings toasts
  const settingsSaved = useCallback(() => {
    toast({
      title: "Settings Saved",
      description: "Your business settings have been updated successfully.",
    });
  }, [toast]);

  const hoursUpdated = useCallback(() => {
    toast({
      title: "Business Hours Updated",
      description: "Your operating hours have been updated successfully.",
    });
  }, [toast]);

  const restaurantOpened = useCallback(() => {
    toast({
      title: "Restaurant Opened",
      description: "Your restaurant is now accepting orders.",
    });
  }, [toast]);

  const restaurantClosed = useCallback(() => {
    toast({
      title: "Restaurant Closed",
      description: "Your restaurant is no longer accepting orders.",
      variant: "destructive",
    });
  }, [toast]);

  const profileUpdated = useCallback(() => {
    toast({
      title: "Profile Updated",
      description: "Your restaurant profile has been updated successfully.",
    });
  }, [toast]);

  // Staff-related toasts
  const staffAdded = useCallback(
    (staffName?: string) => {
      toast({
        title: "Staff Member Added",
        description: staffName
          ? `${staffName} has been added to your team.`
          : "Staff member has been added successfully.",
      });
    },
    [toast]
  );

  const staffUpdated = useCallback(
    (staffName?: string) => {
      toast({
        title: "Staff Member Updated",
        description: staffName
          ? `${staffName}'s information has been updated.`
          : "Staff member has been updated successfully.",
      });
    },
    [toast]
  );

  const staffRemoved = useCallback(
    (staffName?: string) => {
      toast({
        title: "Staff Member Removed",
        description: staffName
          ? `${staffName} has been removed from your team.`
          : "Staff member has been removed successfully.",
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

  const unauthorized = useCallback(() => {
    toast({
      title: "Unauthorized",
      description: "You don't have permission to perform this action.",
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

  // Image/Media toasts
  const imageUploaded = useCallback(() => {
    toast({
      title: "Image Uploaded",
      description: "Your image has been uploaded successfully.",
    });
  }, [toast]);

  const imageDeleted = useCallback(() => {
    toast({
      title: "Image Deleted",
      description: "Image has been removed successfully.",
    });
  }, [toast]);

  // AI-related toasts
  const aiContentGenerated = useCallback(() => {
    toast({
      title: "Content Generated",
      description: "AI has successfully generated your content.",
    });
  }, [toast]);

  const aiImageGenerated = useCallback(() => {
    toast({
      title: "Image Generated",
      description: "AI has created a professional image for you.",
    });
  }, [toast]);

  const aiError = useCallback(() => {
    toast({
      title: "AI Generation Failed",
      description: "Unable to generate content. Please try again.",
      variant: "destructive",
    });
  }, [toast]);

  // Copy to clipboard toast
  const copied = useCallback(() => {
    toast({
      description: "Copied to clipboard",
      duration: 2000,
    });
  }, [toast]);

  return {
    // Order toasts
    orderAccepted,
    orderRejected,
    orderReady,
    orderCompleted,
    orderCancelled,

    // Menu toasts
    menuItemAdded,
    menuItemUpdated,
    menuItemDeleted,
    menuItemOutOfStock,
    menuItemBackInStock,
    categoryAdded,
    categoryUpdated,
    categoryDeleted,

    // Promotion toasts
    promotionCreated,
    promotionUpdated,
    promotionDeleted,
    promotionActivated,
    promotionDeactivated,

    // Settings toasts
    settingsSaved,
    hoursUpdated,
    restaurantOpened,
    restaurantClosed,
    profileUpdated,

    // Staff toasts
    staffAdded,
    staffUpdated,
    staffRemoved,

    // Image toasts
    imageUploaded,
    imageDeleted,

    // AI toasts
    aiContentGenerated,
    aiImageGenerated,
    aiError,

    // Generic toasts
    error,
    networkError,
    unauthorized,
    success,
    info,
    copied,

    // Raw toast function for custom messages
    toast,
  };
}
