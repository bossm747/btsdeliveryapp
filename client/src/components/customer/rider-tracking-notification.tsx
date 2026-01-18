/**
 * Rider Tracking Notification Component for Customer App
 *
 * Displays real-time notifications when riders are approaching
 * or have arrived at the customer's delivery location.
 * Integrates with WebSocket for live geofence updates.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Bike,
  CheckCircle,
  MapPin,
  Clock,
  Bell,
  BellRing,
  Navigation,
  Home,
  Phone,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Types
export interface RiderTrackingNotification {
  orderId: string;
  orderNumber: string;
  event: 'rider_approaching' | 'rider_arrived';
  message: string;
  distance?: number;
  estimatedMinutes?: number;
  riderName?: string;
  riderPhone?: string;
  timestamp: string;
}

interface RiderTrackingBannerProps {
  notification: RiderTrackingNotification;
  onCallRider?: () => void;
  onMessageRider?: () => void;
  className?: string;
}

/**
 * Full-width banner for rider tracking status
 */
export function RiderTrackingBanner({
  notification,
  onCallRider,
  onMessageRider,
  className
}: RiderTrackingBannerProps) {
  const isArrived = notification.event === 'rider_arrived';
  const [showPulse, setShowPulse] = useState(true);

  // Stop pulsing after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 10000);
    return () => clearTimeout(timer);
  }, [notification.timestamp]);

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden transition-all',
        isArrived
          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
        showPulse && 'animate-pulse',
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={cn(
              'p-3 rounded-full',
              isArrived ? 'bg-green-400/30' : 'bg-amber-400/30'
            )}
          >
            {isArrived ? (
              <Home className="h-6 w-6" />
            ) : (
              <Bike className="h-6 w-6" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg">
              {isArrived ? 'Your Rider Has Arrived!' : 'Rider is Approaching!'}
            </h3>
            <p className="text-sm opacity-90">{notification.message}</p>

            {/* Distance/ETA info */}
            <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
              {!isArrived && notification.distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {notification.distance < 1000
                    ? `${Math.round(notification.distance)}m away`
                    : `${(notification.distance / 1000).toFixed(1)}km away`}
                </span>
              )}
              {!isArrived && notification.estimatedMinutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ~{notification.estimatedMinutes} min
                </span>
              )}
              {notification.riderName && (
                <span className="flex items-center gap-1">
                  <Bike className="h-4 w-4" />
                  {notification.riderName}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isArrived && (onCallRider || onMessageRider) && (
            <div className="flex gap-2">
              {onCallRider && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30"
                  onClick={onCallRider}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}
              {onMessageRider && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 hover:bg-white/30"
                  onClick={onMessageRider}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Progress indicator for approaching */}
        {!isArrived && notification.distance && (
          <div className="mt-3">
            <Progress
              value={Math.max(
                10,
                100 - (notification.distance / 500) * 100
              )}
              className="h-1.5 bg-white/20"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact notification card
 */
export function RiderTrackingCard({
  notification,
  onCallRider,
  onMessageRider,
  className
}: RiderTrackingBannerProps) {
  const isArrived = notification.event === 'rider_arrived';

  return (
    <Card
      className={cn(
        'overflow-hidden border-2',
        isArrived ? 'border-green-500' : 'border-amber-500',
        className
      )}
    >
      <CardHeader
        className={cn(
          'py-3',
          isArrived ? 'bg-green-50' : 'bg-amber-50'
        )}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          <BellRing
            className={cn(
              'h-4 w-4',
              isArrived ? 'text-green-600' : 'text-amber-600'
            )}
          />
          {isArrived ? 'Rider Arrived' : 'Rider Approaching'}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{notification.message}</p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {notification.distance && !isArrived && (
              <Badge variant="secondary">
                <MapPin className="h-3 w-3 mr-1" />
                {Math.round(notification.distance)}m
              </Badge>
            )}
            {notification.estimatedMinutes && !isArrived && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {notification.estimatedMinutes} min
              </Badge>
            )}
            {isArrived && (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Waiting for you
              </Badge>
            )}
          </div>

          {(onCallRider || onMessageRider) && (
            <div className="flex gap-2 pt-2">
              {onCallRider && (
                <Button size="sm" variant="outline" onClick={onCallRider}>
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
              )}
              {onMessageRider && (
                <Button size="sm" variant="outline" onClick={onMessageRider}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Floating toast-style notification
 */
export function RiderTrackingToast({
  notification,
  onDismiss,
  className
}: {
  notification: RiderTrackingNotification;
  onDismiss?: () => void;
  className?: string;
}) {
  const isArrived = notification.event === 'rider_arrived';

  return (
    <Alert
      className={cn(
        'fixed bottom-20 left-4 right-4 z-50 shadow-lg animate-in slide-in-from-bottom-5',
        isArrived
          ? 'border-green-500 bg-green-50'
          : 'border-amber-500 bg-amber-50',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {isArrived ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <Bike className="h-5 w-5 text-amber-600" />
        )}
        <div className="flex-1">
          <AlertTitle
            className={isArrived ? 'text-green-800' : 'text-amber-800'}
          >
            {isArrived ? 'Rider Has Arrived!' : 'Rider Nearby!'}
          </AlertTitle>
          <AlertDescription
            className={cn(
              'text-sm',
              isArrived ? 'text-green-700' : 'text-amber-700'
            )}
          >
            {notification.message}
          </AlertDescription>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            OK
          </Button>
        )}
      </div>
    </Alert>
  );
}

/**
 * Status badge for order tracking page
 */
interface RiderLocationBadgeProps {
  event: 'approaching' | 'arrived' | 'in_transit' | 'none';
  distance?: number;
  estimatedMinutes?: number;
  className?: string;
}

export function RiderLocationBadge({
  event,
  distance,
  estimatedMinutes,
  className
}: RiderLocationBadgeProps) {
  switch (event) {
    case 'arrived':
      return (
        <Badge
          variant="default"
          className={cn('bg-green-600 animate-pulse', className)}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Rider Arrived
        </Badge>
      );

    case 'approaching':
      return (
        <Badge variant="default" className={cn('bg-amber-600', className)}>
          <Navigation className="h-3 w-3 mr-1" />
          {distance
            ? `${Math.round(distance)}m away`
            : estimatedMinutes
            ? `${estimatedMinutes} min away`
            : 'Approaching'}
        </Badge>
      );

    case 'in_transit':
      return (
        <Badge variant="secondary" className={className}>
          <Bike className="h-3 w-3 mr-1" />
          On the way
        </Badge>
      );

    default:
      return null;
  }
}

/**
 * Hook for managing rider tracking notifications via WebSocket
 */
export function useRiderTrackingNotifications(orderId: string | undefined) {
  const [notification, setNotification] = useState<RiderTrackingNotification | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Check for geofence events related to this order
        if (
          data.orderId === orderId &&
          (data.type === 'geofence_event' || data.type === 'delivery_notification')
        ) {
          const eventType = data.event;

          if (['rider_nearby_customer', 'rider_approaching'].includes(eventType)) {
            const newNotification: RiderTrackingNotification = {
              orderId: data.orderId,
              orderNumber: data.orderNumber || '',
              event: 'rider_approaching',
              message: data.message,
              distance: data.distance,
              estimatedMinutes: data.estimatedMinutes,
              timestamp: data.timestamp
            };
            setNotification(newNotification);
            setShowToast(true);
          } else if (['rider_at_customer', 'rider_arrived'].includes(eventType)) {
            const newNotification: RiderTrackingNotification = {
              orderId: data.orderId,
              orderNumber: data.orderNumber || '',
              event: 'rider_arrived',
              message: data.message,
              timestamp: data.timestamp
            };
            setNotification(newNotification);
            setShowToast(true);

            // Vibrate device
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200, 100, 200]);
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    },
    [orderId]
  );

  // Dismiss toast
  const dismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  // Clear notification
  const clearNotification = useCallback(() => {
    setNotification(null);
    setShowToast(false);
  }, []);

  return {
    notification,
    showToast,
    handleWebSocketMessage,
    dismissToast,
    clearNotification
  };
}

/**
 * Inline tracking status for order detail page
 */
interface RiderTrackingStatusProps {
  notification: RiderTrackingNotification | null;
  riderName?: string;
  riderPhone?: string;
  onCallRider?: () => void;
  onMessageRider?: () => void;
  className?: string;
}

export function RiderTrackingStatus({
  notification,
  riderName,
  riderPhone,
  onCallRider,
  onMessageRider,
  className
}: RiderTrackingStatusProps) {
  if (!notification) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-lg bg-muted',
          className
        )}
      >
        <Bike className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">Rider is on the way</p>
          <p className="text-xs text-muted-foreground">
            We'll notify you when they're approaching
          </p>
        </div>
      </div>
    );
  }

  const isArrived = notification.event === 'rider_arrived';

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2',
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
            <Home className="h-5 w-5 text-green-600" />
          ) : (
            <Navigation className="h-5 w-5 text-amber-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              'font-semibold',
              isArrived ? 'text-green-800' : 'text-amber-800'
            )}
          >
            {isArrived ? 'Your Rider Has Arrived!' : 'Rider is Approaching'}
          </h4>
          <p
            className={cn(
              'text-sm mt-1',
              isArrived ? 'text-green-700' : 'text-amber-700'
            )}
          >
            {notification.message}
          </p>

          {/* Distance and ETA */}
          {!isArrived && (
            <div className="flex items-center gap-3 mt-2">
              {notification.distance && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {notification.distance < 1000
                    ? `${Math.round(notification.distance)}m`
                    : `${(notification.distance / 1000).toFixed(1)}km`}
                </Badge>
              )}
              {notification.estimatedMinutes && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  ~{notification.estimatedMinutes} min
                </Badge>
              )}
            </div>
          )}

          {/* Contact options when arrived */}
          {isArrived && (onCallRider || onMessageRider) && (
            <div className="flex gap-2 mt-3">
              {onCallRider && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={onCallRider}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call Rider
                </Button>
              )}
              {onMessageRider && (
                <Button size="sm" variant="outline" onClick={onMessageRider}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiderTrackingBanner;
