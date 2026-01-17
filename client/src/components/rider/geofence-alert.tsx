/**
 * Geofence Arrival Alert Component
 * For rider app - shows notification when entering pickup/delivery zone
 * Auto-detects via GPS and confirms arrival
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  MapPin,
  Navigation,
  CheckCircle,
  Store,
  Home,
  Bell,
  BellOff,
  ArrowRight,
  Truck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Types
interface GeofenceStatus {
  isInPickupZone: boolean;
  isInDeliveryZone: boolean;
  isNearbyPickup: boolean;
  isNearbyDelivery: boolean;
  distanceToPickup: number | null;
  distanceToDelivery: number | null;
  statusUpdated: boolean;
  newStatus?: string;
  message: string;
}

interface GeofenceAlertProps {
  riderId: string;
  orderId: string;
  orderStatus: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  onStatusUpdate?: (newStatus: string) => void;
  onArrivalConfirmed?: (type: 'pickup' | 'delivery') => void;
  className?: string;
}

// Geofence polling interval (5 seconds)
const GEOFENCE_CHECK_INTERVAL = 5000;

// Distance thresholds (meters)
const THRESHOLDS = {
  PICKUP: 50,
  DELIVERY: 100,
  NEARBY: 500
};

export function GeofenceAlert({
  riderId,
  orderId,
  orderStatus,
  pickupAddress,
  deliveryAddress,
  onStatusUpdate,
  onArrivalConfirmed,
  className
}: GeofenceAlertProps) {
  const { toast } = useToast();

  // State
  const [isTracking, setIsTracking] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState<GeofenceStatus | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // Refs
  const watchIdRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Determine current phase
  const isPickupPhase = ['confirmed', 'preparing', 'ready'].includes(orderStatus);
  const isDeliveryPhase = orderStatus === 'in_transit';
  const isArrived = orderStatus === 'arrived' || orderStatus === 'picked_up';

  // Start GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setIsTracking(true);
    setError(null);

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setError(null);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(getGeolocationErrorMessage(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }, []);

  // Stop GPS tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    setIsTracking(false);
  }, []);

  // Check geofence
  const checkGeofence = useCallback(async () => {
    if (!currentLocation || !riderId || !orderId) return;

    try {
      const response = await apiRequest('POST', '/api/rider/geofence-check', {
        riderId,
        orderId,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        accuracy: currentLocation.accuracy
      });

      const result: GeofenceStatus & { success: boolean } = await response.json();

      if (result.success) {
        setGeofenceStatus(result);
        setLastCheckTime(new Date());

        // Handle status updates
        if (result.statusUpdated && result.newStatus) {
          onStatusUpdate?.(result.newStatus);

          // Show notification
          const notificationType = result.isInPickupZone ? 'pickup' : 'delivery';
          showArrivalNotification(notificationType);
        }

        // Show nearby notification
        if ((result.isNearbyDelivery && isDeliveryPhase) || (result.isNearbyPickup && isPickupPhase)) {
          showNearbyNotification(result);
        }
      }
    } catch (err) {
      console.error('Geofence check error:', err);
    }
  }, [currentLocation, riderId, orderId, isPickupPhase, isDeliveryPhase, onStatusUpdate]);

  // Start geofence checking interval
  useEffect(() => {
    if (isTracking && currentLocation) {
      // Initial check
      checkGeofence();

      // Set up interval
      checkIntervalRef.current = setInterval(checkGeofence, GEOFENCE_CHECK_INTERVAL);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [isTracking, currentLocation, checkGeofence]);

  // Auto-start tracking if order is active
  useEffect(() => {
    if (isPickupPhase || isDeliveryPhase) {
      startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [orderStatus, isPickupPhase, isDeliveryPhase, startTracking, stopTracking]);

  // Show arrival notification
  const showArrivalNotification = (type: 'pickup' | 'delivery') => {
    toast({
      title: type === 'pickup' ? 'Arrived at Restaurant!' : 'Arrived at Delivery Location!',
      description: type === 'pickup'
        ? 'You have entered the pickup zone. The order status has been updated.'
        : 'You have entered the delivery zone. Ready to hand over the order.',
      duration: 10000
    });

    // Try to vibrate device
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    onArrivalConfirmed?.(type);
  };

  // Show nearby notification
  const showNearbyNotification = (status: GeofenceStatus) => {
    const distance = isDeliveryPhase ? status.distanceToDelivery : status.distanceToPickup;
    const location = isDeliveryPhase ? 'delivery location' : 'restaurant';

    toast({
      title: 'Almost there!',
      description: `You are ${Math.round(distance || 0)}m from the ${location}.`,
      duration: 5000
    });
  };

  // Manual arrival confirmation
  const handleManualConfirm = async (type: 'pickup' | 'delivery') => {
    setIsConfirming(true);

    try {
      // Add tracking event
      await apiRequest('POST', '/api/gps/tracking-event', {
        orderId,
        riderId,
        eventType: type === 'pickup' ? 'order_picked_up' : 'delivered',
        location: currentLocation ? {
          lat: currentLocation.lat,
          lng: currentLocation.lng
        } : undefined,
        notes: 'Manual confirmation by rider'
      });

      toast({
        title: 'Arrival Confirmed',
        description: type === 'pickup'
          ? 'Pickup confirmed. Ready to start delivery.'
          : 'Delivery confirmed. Order completed.',
      });

      onArrivalConfirmed?.(type);
    } catch (err) {
      console.error('Confirmation error:', err);
      toast({
        title: 'Error',
        description: 'Failed to confirm arrival. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsConfirming(false);
    }
  };

  // Get progress percentage
  const getProgress = () => {
    if (!geofenceStatus) return 0;

    if (isPickupPhase) {
      if (geofenceStatus.isInPickupZone) return 100;
      if (geofenceStatus.distanceToPickup === null) return 0;
      if (geofenceStatus.distanceToPickup <= THRESHOLDS.NEARBY) {
        return Math.min(95, 100 - (geofenceStatus.distanceToPickup / THRESHOLDS.NEARBY) * 50);
      }
      return Math.max(0, 45 - Math.min(45, (geofenceStatus.distanceToPickup - THRESHOLDS.NEARBY) / 1000 * 10));
    }

    if (isDeliveryPhase) {
      if (geofenceStatus.isInDeliveryZone) return 100;
      if (geofenceStatus.distanceToDelivery === null) return 0;
      if (geofenceStatus.distanceToDelivery <= THRESHOLDS.NEARBY) {
        return Math.min(95, 100 - (geofenceStatus.distanceToDelivery / THRESHOLDS.NEARBY) * 50);
      }
      return Math.max(0, 45 - Math.min(45, (geofenceStatus.distanceToDelivery - THRESHOLDS.NEARBY) / 1000 * 10));
    }

    return 0;
  };

  // Render phase-specific content
  const renderPhaseContent = () => {
    if (isPickupPhase) {
      return (
        <PhaseCard
          icon={<Store className="h-5 w-5" />}
          title="Heading to Restaurant"
          address={pickupAddress}
          distance={geofenceStatus?.distanceToPickup}
          isInZone={geofenceStatus?.isInPickupZone || false}
          isNearby={geofenceStatus?.isNearbyPickup || false}
          zoneType="pickup"
          onConfirm={() => handleManualConfirm('pickup')}
          isConfirming={isConfirming}
        />
      );
    }

    if (isDeliveryPhase) {
      return (
        <PhaseCard
          icon={<Home className="h-5 w-5" />}
          title="Delivering to Customer"
          address={deliveryAddress}
          distance={geofenceStatus?.distanceToDelivery}
          isInZone={geofenceStatus?.isInDeliveryZone || false}
          isNearby={geofenceStatus?.isNearbyDelivery || false}
          zoneType="delivery"
          onConfirm={() => handleManualConfirm('delivery')}
          isConfirming={isConfirming}
        />
      );
    }

    if (isArrived) {
      return (
        <div className="text-center py-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="font-medium text-green-700">
            {orderStatus === 'picked_up' ? 'Order Picked Up!' : 'Arrived at Destination!'}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-4 w-4" />
            Delivery Tracking
          </CardTitle>
          <Badge
            variant={isTracking ? 'default' : 'secondary'}
            className="gap-1"
          >
            {isTracking ? (
              <>
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live
              </>
            ) : (
              <>
                <BellOff className="h-3 w-3" />
                Paused
              </>
            )}
          </Badge>
        </div>
        {lastCheckTime && (
          <CardDescription className="text-xs">
            Last updated: {lastCheckTime.toLocaleTimeString()}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to destination</span>
            <span>{Math.round(getProgress())}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Phase Content */}
        {renderPhaseContent()}

        {/* Location Status */}
        {currentLocation && (
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>GPS Active</span>
            </div>
            {currentLocation.accuracy && (
              <span>Accuracy: {Math.round(currentLocation.accuracy)}m</span>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Tracking Controls */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button
              variant="outline"
              size="sm"
              onClick={startTracking}
              className="flex-1"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={checkGeofence}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Phase Card Component
interface PhaseCardProps {
  icon: React.ReactNode;
  title: string;
  address?: string;
  distance: number | null | undefined;
  isInZone: boolean;
  isNearby: boolean;
  zoneType: 'pickup' | 'delivery';
  onConfirm: () => void;
  isConfirming: boolean;
}

function PhaseCard({
  icon,
  title,
  address,
  distance,
  isInZone,
  isNearby,
  zoneType,
  onConfirm,
  isConfirming
}: PhaseCardProps) {
  const formatDistance = (d: number) => {
    if (d < 1000) return `${Math.round(d)}m`;
    return `${(d / 1000).toFixed(1)}km`;
  };

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-all',
      isInZone && 'border-green-500 bg-green-50',
      isNearby && !isInZone && 'border-amber-500 bg-amber-50'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-full',
          isInZone ? 'bg-green-100 text-green-700' :
          isNearby ? 'bg-amber-100 text-amber-700' :
          'bg-muted text-muted-foreground'
        )}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          {address && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {address}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {distance !== null && distance !== undefined && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {formatDistance(distance)} away
              </Badge>
            )}
            {isInZone && (
              <Badge variant="default" className="text-xs bg-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                In Zone
              </Badge>
            )}
            {isNearby && !isInZone && (
              <Badge variant="default" className="text-xs bg-amber-600">
                <Bell className="h-3 w-3 mr-1" />
                Nearby
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Arrival Notification */}
      {isInZone && (
        <Alert className="mt-3 border-green-200 bg-green-100">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            You've arrived at the {zoneType === 'pickup' ? 'restaurant' : 'delivery location'}!
          </AlertTitle>
          <AlertDescription className="text-green-700 text-sm">
            {zoneType === 'pickup'
              ? 'Please proceed to collect the order.'
              : 'Please hand over the order to the customer.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Nearby Notification */}
      {isNearby && !isInZone && (
        <Alert className="mt-3 border-amber-200 bg-amber-100">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Almost there!</AlertTitle>
          <AlertDescription className="text-amber-700 text-sm">
            You're getting close to the {zoneType === 'pickup' ? 'restaurant' : 'delivery location'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Manual Confirm Button */}
      {(isInZone || isNearby) && (
        <Button
          className="w-full mt-3"
          onClick={onConfirm}
          disabled={isConfirming}
          variant={isInZone ? 'default' : 'outline'}
        >
          {isConfirming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm {zoneType === 'pickup' ? 'Pickup' : 'Delivery'}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Helper function
function getGeolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location access denied. Please enable location permissions.';
    case error.POSITION_UNAVAILABLE:
      return 'Location information unavailable. Please check your GPS.';
    case error.TIMEOUT:
      return 'Location request timed out. Please try again.';
    default:
      return 'An unknown error occurred while getting your location.';
  }
}

// Compact version for embedding in delivery workflow
export function GeofenceStatusBadge({
  isInZone,
  isNearby,
  distance,
  className
}: {
  isInZone: boolean;
  isNearby: boolean;
  distance?: number | null;
  className?: string;
}) {
  if (isInZone) {
    return (
      <Badge variant="default" className={cn('bg-green-600', className)}>
        <CheckCircle className="h-3 w-3 mr-1" />
        In Zone
      </Badge>
    );
  }

  if (isNearby) {
    return (
      <Badge variant="default" className={cn('bg-amber-600', className)}>
        <Bell className="h-3 w-3 mr-1" />
        {distance ? `${Math.round(distance)}m away` : 'Nearby'}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <MapPin className="h-3 w-3 mr-1" />
      {distance ? `${(distance / 1000).toFixed(1)}km away` : 'Tracking...'}
    </Badge>
  );
}

export default GeofenceAlert;
