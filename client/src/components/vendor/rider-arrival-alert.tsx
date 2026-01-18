/**
 * Rider Arrival Alert Component for Vendor App
 *
 * Displays real-time notifications when riders arrive at or approach
 * the restaurant for order pickup. Uses WebSocket for live updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Bell,
  BellRing,
  CheckCircle,
  Clock,
  MapPin,
  Bike,
  User,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Types for geofence notifications
export interface RiderArrivalNotification {
  orderId: string;
  orderNumber: string;
  event: 'rider_approaching' | 'rider_arrived';
  message: string;
  distance?: number;
  arrivalTime?: string;
  riderName?: string;
  timestamp: string;
}

interface RiderArrivalAlertProps {
  notification: RiderArrivalNotification;
  onDismiss?: () => void;
  onOrderReady?: (orderId: string) => void;
  className?: string;
}

/**
 * Single rider arrival alert card
 */
export function RiderArrivalAlert({
  notification,
  onDismiss,
  onOrderReady,
  className
}: RiderArrivalAlertProps) {
  const isArrived = notification.event === 'rider_arrived';
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <Alert
      className={cn(
        'relative transition-all duration-300',
        isArrived
          ? 'border-green-500 bg-green-50'
          : 'border-amber-500 bg-amber-50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-full shrink-0',
            isArrived ? 'bg-green-100' : 'bg-amber-100'
          )}
        >
          {isArrived ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <Bike className="h-5 w-5 text-amber-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <AlertTitle
            className={cn(
              'font-semibold',
              isArrived ? 'text-green-800' : 'text-amber-800'
            )}
          >
            {isArrived ? 'Rider Has Arrived!' : 'Rider Approaching'}
          </AlertTitle>
          <AlertDescription
            className={cn(
              'mt-1',
              isArrived ? 'text-green-700' : 'text-amber-700'
            )}
          >
            <div className="space-y-1">
              <p className="font-medium">Order #{notification.orderNumber}</p>
              <p className="text-sm">{notification.message}</p>
              {notification.distance && !isArrived && (
                <p className="text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {notification.distance < 1000
                    ? `${Math.round(notification.distance)}m away`
                    : `${(notification.distance / 1000).toFixed(1)}km away`}
                </p>
              )}
              {notification.riderName && (
                <p className="text-sm flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {notification.riderName}
                </p>
              )}
            </div>
          </AlertDescription>

          {isArrived && onOrderReady && (
            <Button
              size="sm"
              className="mt-3"
              onClick={() => onOrderReady(notification.orderId)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Handed Off
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </Alert>
  );
}

/**
 * Container for multiple rider arrival alerts
 */
interface RiderArrivalAlertsContainerProps {
  notifications: RiderArrivalNotification[];
  onDismiss?: (orderId: string) => void;
  onOrderReady?: (orderId: string) => void;
  maxVisible?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  className?: string;
}

export function RiderArrivalAlertsContainer({
  notifications,
  onDismiss,
  onOrderReady,
  maxVisible = 3,
  soundEnabled = true,
  onToggleSound,
  className
}: RiderArrivalAlertsContainerProps) {
  const { toast } = useToast();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out dismissed notifications
  const visibleNotifications = notifications
    .filter((n) => !dismissedIds.has(n.orderId))
    .slice(0, maxVisible);

  const hiddenCount = Math.max(
    0,
    notifications.filter((n) => !dismissedIds.has(n.orderId)).length - maxVisible
  );

  const handleDismiss = (orderId: string) => {
    setDismissedIds((prev) => new Set([...Array.from(prev), orderId]));
    onDismiss?.(orderId);
  };

  // Play sound for new arrivals
  useEffect(() => {
    if (soundEnabled && notifications.some((n) => n.event === 'rider_arrived')) {
      // Try to play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Autoplay may be blocked
        });
      } catch {
        // Audio not supported
      }

      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  }, [notifications.length, soundEnabled]);

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary animate-pulse" />
          <span className="font-semibold text-sm">
            Rider Notifications ({notifications.length - dismissedIds.size})
          </span>
        </div>
        {onToggleSound && (
          <Button variant="ghost" size="sm" onClick={onToggleSound}>
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {visibleNotifications.map((notification) => (
          <RiderArrivalAlert
            key={`${notification.orderId}-${notification.timestamp}`}
            notification={notification}
            onDismiss={() => handleDismiss(notification.orderId)}
            onOrderReady={onOrderReady}
          />
        ))}
      </div>

      {/* Hidden count */}
      {hiddenCount > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          +{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

/**
 * Compact badge for order cards showing rider status
 */
interface RiderStatusBadgeProps {
  status: 'approaching' | 'arrived' | 'none';
  distance?: number;
  className?: string;
}

export function RiderStatusBadge({
  status,
  distance,
  className
}: RiderStatusBadgeProps) {
  if (status === 'none') return null;

  if (status === 'arrived') {
    return (
      <Badge
        variant="default"
        className={cn('bg-green-600 animate-pulse', className)}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Rider Here
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className={cn('bg-amber-600', className)}
    >
      <Bike className="h-3 w-3 mr-1" />
      {distance ? `${Math.round(distance)}m away` : 'Approaching'}
    </Badge>
  );
}

/**
 * Hook for managing rider arrival notifications via WebSocket
 */
export function useRiderArrivalNotifications(vendorId: string | undefined) {
  const [notifications, setNotifications] = useState<RiderArrivalNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Check for rider arrival events
        if (
          data.type === 'vendor_alert' &&
          data.vendorId === vendorId &&
          data.data?.event &&
          ['rider_arrived', 'rider_approaching'].includes(data.data.event)
        ) {
          const notification: RiderArrivalNotification = {
            orderId: data.orderId,
            orderNumber: data.orderNumber,
            event: data.data.event,
            message: data.data.message,
            distance: data.data.distance,
            arrivalTime: data.data.arrivalTime,
            timestamp: data.timestamp
          };

          setNotifications((prev) => {
            // Replace existing notification for same order or add new
            const filtered = prev.filter((n) => n.orderId !== notification.orderId);
            return [notification, ...filtered];
          });

          // Show toast for arrivals
          if (notification.event === 'rider_arrived') {
            toast({
              title: 'Rider Has Arrived!',
              description: `Order #${notification.orderNumber} - Rider is here for pickup.`,
              duration: 10000
            });
          }
        }
      } catch {
        // Ignore parse errors
      }
    },
    [vendorId, toast]
  );

  // Clear notification for an order
  const clearNotification = useCallback((orderId: string) => {
    setNotifications((prev) => prev.filter((n) => n.orderId !== orderId));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  // Get notification for specific order
  const getOrderNotification = useCallback(
    (orderId: string) => {
      return notifications.find((n) => n.orderId === orderId);
    },
    [notifications]
  );

  return {
    notifications,
    soundEnabled,
    handleWebSocketMessage,
    clearNotification,
    clearAll,
    toggleSound,
    getOrderNotification
  };
}

export default RiderArrivalAlert;
