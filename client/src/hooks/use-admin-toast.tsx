import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

/**
 * Custom hook for admin-specific toast notifications
 * Provides pre-defined toast messages for common admin actions
 */
export function useAdminToast() {
  const { toast } = useToast();

  // Restaurant management toasts
  const restaurantApproved = useCallback(
    (restaurantName?: string) => {
      toast({
        title: "Restaurant Approved",
        description: restaurantName
          ? `${restaurantName} is now active on the platform.`
          : "The restaurant is now active on the platform.",
      });
    },
    [toast]
  );

  const restaurantRejected = useCallback(
    (restaurantName?: string) => {
      toast({
        title: "Restaurant Rejected",
        description: restaurantName
          ? `${restaurantName} application has been rejected.`
          : "The restaurant application has been rejected.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const restaurantSuspended = useCallback(
    (restaurantName?: string) => {
      toast({
        title: "Restaurant Suspended",
        description: restaurantName
          ? `${restaurantName} has been temporarily suspended.`
          : "The restaurant has been temporarily suspended.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const restaurantReactivated = useCallback(
    (restaurantName?: string) => {
      toast({
        title: "Restaurant Reactivated",
        description: restaurantName
          ? `${restaurantName} is now active again.`
          : "The restaurant has been reactivated.",
      });
    },
    [toast]
  );

  // Rider management toasts
  const riderVerified = useCallback(
    (riderName?: string) => {
      toast({
        title: "Rider Verified",
        description: riderName
          ? `${riderName} can now accept deliveries.`
          : "The rider can now accept deliveries.",
      });
    },
    [toast]
  );

  const riderRejected = useCallback(
    (riderName?: string) => {
      toast({
        title: "Rider Rejected",
        description: riderName
          ? `${riderName}'s application has been rejected.`
          : "The rider application has been rejected.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const riderSuspended = useCallback(
    (riderName?: string) => {
      toast({
        title: "Rider Suspended",
        description: riderName
          ? `${riderName} has been temporarily suspended.`
          : "The rider has been temporarily suspended.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const riderReactivated = useCallback(
    (riderName?: string) => {
      toast({
        title: "Rider Reactivated",
        description: riderName
          ? `${riderName} is now active again.`
          : "The rider has been reactivated.",
      });
    },
    [toast]
  );

  // User management toasts
  const userBanned = useCallback(
    (userName?: string) => {
      toast({
        title: "User Banned",
        description: userName
          ? `${userName} has been banned from the platform.`
          : "The user has been banned from the platform.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const userUnbanned = useCallback(
    (userName?: string) => {
      toast({
        title: "User Unbanned",
        description: userName
          ? `${userName} has been restored to the platform.`
          : "The user has been restored to the platform.",
      });
    },
    [toast]
  );

  const userRoleUpdated = useCallback(
    (userName?: string, newRole?: string) => {
      toast({
        title: "User Role Updated",
        description: userName
          ? `${userName}'s role has been updated${newRole ? ` to ${newRole}` : ""}.`
          : "The user's role has been updated.",
      });
    },
    [toast]
  );

  // Order management toasts
  const orderAssigned = useCallback(
    (orderNumber?: string, riderName?: string) => {
      toast({
        title: "Order Assigned",
        description: orderNumber
          ? `Order #${orderNumber} has been assigned${riderName ? ` to ${riderName}` : ""}.`
          : "The order has been assigned successfully.",
      });
    },
    [toast]
  );

  const orderReassigned = useCallback(
    (orderNumber?: string) => {
      toast({
        title: "Order Reassigned",
        description: orderNumber
          ? `Order #${orderNumber} has been reassigned to a new rider.`
          : "The order has been reassigned.",
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
          : "The order has been cancelled.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const orderRefunded = useCallback(
    (orderNumber?: string, amount?: number) => {
      toast({
        title: "Refund Processed",
        description: orderNumber
          ? `Order #${orderNumber} refund${amount ? ` of ₱${amount.toFixed(2)}` : ""} has been processed.`
          : "The refund has been processed successfully.",
      });
    },
    [toast]
  );

  // Dispatch toasts
  const batchAssigned = useCallback(
    (orderCount?: number, riderName?: string) => {
      toast({
        title: "Batch Assigned",
        description: orderCount
          ? `${orderCount} orders assigned${riderName ? ` to ${riderName}` : ""}.`
          : "Orders have been batch assigned.",
      });
    },
    [toast]
  );

  const dispatchCompleted = useCallback(() => {
    toast({
      title: "Dispatch Completed",
      description: "All pending orders have been assigned to riders.",
    });
  }, [toast]);

  // Support ticket toasts
  const ticketResolved = useCallback(
    (ticketId?: string) => {
      toast({
        title: "Ticket Resolved",
        description: ticketId
          ? `Ticket #${ticketId} has been resolved.`
          : "The support ticket has been resolved.",
      });
    },
    [toast]
  );

  const ticketEscalated = useCallback(
    (ticketId?: string) => {
      toast({
        title: "Ticket Escalated",
        description: ticketId
          ? `Ticket #${ticketId} has been escalated to management.`
          : "The support ticket has been escalated.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const ticketAssigned = useCallback(
    (ticketId?: string, agentName?: string) => {
      toast({
        title: "Ticket Assigned",
        description: ticketId
          ? `Ticket #${ticketId} assigned${agentName ? ` to ${agentName}` : ""}.`
          : "The support ticket has been assigned.",
      });
    },
    [toast]
  );

  // Financial toasts
  const payoutProcessed = useCallback(
    (amount?: number, recipientName?: string) => {
      toast({
        title: "Payout Processed",
        description: recipientName
          ? `₱${amount?.toFixed(2) || "0.00"} payout to ${recipientName} processed.`
          : "The payout has been processed successfully.",
      });
    },
    [toast]
  );

  const commissionUpdated = useCallback(() => {
    toast({
      title: "Commission Updated",
      description: "Commission rates have been updated successfully.",
    });
  }, [toast]);

  const taxSettingsUpdated = useCallback(() => {
    toast({
      title: "Tax Settings Updated",
      description: "Tax configuration has been saved successfully.",
    });
  }, [toast]);

  // Promo code toasts
  const promoCreated = useCallback(
    (promoCode?: string) => {
      toast({
        title: "Promo Code Created",
        description: promoCode
          ? `Promo code "${promoCode}" is now active.`
          : "The promo code has been created.",
      });
    },
    [toast]
  );

  const promoDeactivated = useCallback(
    (promoCode?: string) => {
      toast({
        title: "Promo Code Deactivated",
        description: promoCode
          ? `Promo code "${promoCode}" has been deactivated.`
          : "The promo code has been deactivated.",
      });
    },
    [toast]
  );

  const promoDeleted = useCallback(
    (promoCode?: string) => {
      toast({
        title: "Promo Code Deleted",
        description: promoCode
          ? `Promo code "${promoCode}" has been deleted.`
          : "The promo code has been deleted.",
        variant: "destructive",
      });
    },
    [toast]
  );

  // Delivery zone toasts
  const zoneCreated = useCallback(
    (zoneName?: string) => {
      toast({
        title: "Delivery Zone Created",
        description: zoneName
          ? `${zoneName} zone is now active.`
          : "The delivery zone has been created.",
      });
    },
    [toast]
  );

  const zoneUpdated = useCallback(
    (zoneName?: string) => {
      toast({
        title: "Delivery Zone Updated",
        description: zoneName
          ? `${zoneName} zone has been updated.`
          : "The delivery zone has been updated.",
      });
    },
    [toast]
  );

  const zoneDeleted = useCallback(
    (zoneName?: string) => {
      toast({
        title: "Delivery Zone Deleted",
        description: zoneName
          ? `${zoneName} zone has been deleted.`
          : "The delivery zone has been deleted.",
        variant: "destructive",
      });
    },
    [toast]
  );

  // Fraud detection toasts
  const accountFlagged = useCallback(
    (userName?: string) => {
      toast({
        title: "Account Flagged",
        description: userName
          ? `${userName}'s account has been flagged for review.`
          : "The account has been flagged for review.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const fraudAlertDismissed = useCallback(() => {
    toast({
      title: "Alert Dismissed",
      description: "The fraud alert has been dismissed.",
    });
  }, [toast]);

  const fraudAlertConfirmed = useCallback(() => {
    toast({
      title: "Fraud Confirmed",
      description: "The fraudulent activity has been confirmed and action taken.",
      variant: "destructive",
    });
  }, [toast]);

  // Report toasts
  const reportGenerated = useCallback(
    (reportName?: string) => {
      toast({
        title: "Report Generated",
        description: reportName
          ? `${reportName} is ready for download.`
          : "The report has been generated successfully.",
      });
    },
    [toast]
  );

  const reportExported = useCallback(
    (format?: string) => {
      toast({
        title: "Report Exported",
        description: format
          ? `Report exported as ${format.toUpperCase()}.`
          : "The report has been exported.",
      });
    },
    [toast]
  );

  // Settings toasts
  const settingsSaved = useCallback(() => {
    toast({
      title: "Settings Saved",
      description: "Your changes have been saved successfully.",
    });
  }, [toast]);

  const configurationUpdated = useCallback(
    (configName?: string) => {
      toast({
        title: "Configuration Updated",
        description: configName
          ? `${configName} configuration has been updated.`
          : "The configuration has been updated.",
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
      description: "Unable to connect to the server. Please check your connection.",
      variant: "destructive",
    });
  }, [toast]);

  const permissionDenied = useCallback(() => {
    toast({
      title: "Permission Denied",
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

  // Copy to clipboard
  const copied = useCallback(
    (itemName?: string) => {
      toast({
        description: itemName ? `${itemName} copied to clipboard` : "Copied to clipboard",
        duration: 2000,
      });
    },
    [toast]
  );

  return {
    // Restaurant management
    restaurantApproved,
    restaurantRejected,
    restaurantSuspended,
    restaurantReactivated,

    // Rider management
    riderVerified,
    riderRejected,
    riderSuspended,
    riderReactivated,

    // User management
    userBanned,
    userUnbanned,
    userRoleUpdated,

    // Order management
    orderAssigned,
    orderReassigned,
    orderCancelled,
    orderRefunded,

    // Dispatch
    batchAssigned,
    dispatchCompleted,

    // Support tickets
    ticketResolved,
    ticketEscalated,
    ticketAssigned,

    // Financial
    payoutProcessed,
    commissionUpdated,
    taxSettingsUpdated,

    // Promo codes
    promoCreated,
    promoDeactivated,
    promoDeleted,

    // Delivery zones
    zoneCreated,
    zoneUpdated,
    zoneDeleted,

    // Fraud detection
    accountFlagged,
    fraudAlertDismissed,
    fraudAlertConfirmed,

    // Reports
    reportGenerated,
    reportExported,

    // Settings
    settingsSaved,
    configurationUpdated,

    // Generic
    error,
    networkError,
    permissionDenied,
    success,
    info,
    copied,

    // Raw toast function for custom messages
    toast,
  };
}
