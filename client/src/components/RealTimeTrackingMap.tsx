import { useEffect, useRef, useState } from 'react';
import { useDeliveryTracking, useRealTimeTracking } from '@/hooks/use-gps-tracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    google: any;
  }
}

interface RealTimeTrackingMapProps {
  orderId: string;
  customerLocation: { lat: number; lng: number; address: string };
  restaurantLocation: { lat: number; lng: number; address: string };
  className?: string;
}

export function RealTimeTrackingMap({
  orderId,
  customerLocation,
  restaurantLocation,
  className
}: RealTimeTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  const { trackingEvents, currentStatus, estimatedArrival } = useDeliveryTracking(orderId);
  const { isConnected, locationUpdates } = useRealTimeTracking(orderId);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.google) return;

      // Create map centered between restaurant and customer
      const center = {
        lat: (restaurantLocation.lat + customerLocation.lat) / 2,
        lng: (restaurantLocation.lng + customerLocation.lng) / 2
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
        mapTypeId: 'roadmap',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Add restaurant marker
      new window.google.maps.Marker({
        position: restaurantLocation,
        map: mapInstanceRef.current,
        title: 'Restaurant',
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="#FF6B35" stroke="white" stroke-width="2"/>
              <path d="M20 12v8h-2v-8h-4v8h-2v-8c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2z" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Add customer marker
      new window.google.maps.Marker({
        position: customerLocation,
        map: mapInstanceRef.current,
        title: 'Delivery Location',
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="#004225" stroke="white" stroke-width="2"/>
              <path d="M16 8c-2.2 0-4 1.8-4 4 0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      // Create rider marker (initially hidden)
      riderMarkerRef.current = new window.google.maps.Marker({
        map: mapInstanceRef.current,
        title: 'Rider Location',
        icon: {
          url: 'data:image/svg+xml,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="12" fill="#FFD23F" stroke="white" stroke-width="2"/>
              <path d="M12 10h8v2h-8v-2zm0 4h8v2h-8v-2zm4 4l4 4h-8l4-4z" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        },
        visible: false
      });

      setIsMapLoaded(true);
    };

    // Load Google Maps API if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [customerLocation, restaurantLocation]);

  // Update rider location from real-time updates
  useEffect(() => {
    if (!isMapLoaded || !riderMarkerRef.current || locationUpdates.length === 0) return;

    const latestUpdate = locationUpdates[locationUpdates.length - 1];
    if (latestUpdate.location) {
      const position = new window.google.maps.LatLng(
        latestUpdate.location.lat,
        latestUpdate.location.lng
      );
      
      riderMarkerRef.current.setPosition(position);
      riderMarkerRef.current.setVisible(true);
      
      // Optionally pan map to show rider
      mapInstanceRef.current?.panTo(position);
    }
  }, [locationUpdates, isMapLoaded]);

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'order_picked_up':
        return { 
          label: 'Order Picked Up', 
          color: 'bg-blue-500', 
          icon: CheckCircle,
          textColor: 'text-blue-600'
        };
      case 'en_route':
        return { 
          label: 'On the Way', 
          color: 'bg-yellow-500', 
          icon: Truck,
          textColor: 'text-yellow-600'
        };
      case 'nearby':
        return { 
          label: 'Nearby', 
          color: 'bg-orange-500', 
          icon: MapPin,
          textColor: 'text-orange-600'
        };
      case 'delivered':
        return { 
          label: 'Delivered', 
          color: 'bg-green-500', 
          icon: CheckCircle,
          textColor: 'text-green-600'
        };
      default:
        return { 
          label: 'Preparing', 
          color: 'bg-gray-500', 
          icon: Clock,
          textColor: 'text-gray-600'
        };
    }
  };

  const statusConfig = getStatusConfig(currentStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Header */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", statusConfig.textColor)} />
            Delivery Tracking
            {isConnected && (
              <Badge variant="secondary" className="ml-auto">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                Live
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", statusConfig.color)} />
              <span className="font-medium">{statusConfig.label}</span>
            </div>
            {estimatedArrival && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {estimatedArrival} min
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map Container */}
      <Card>
        <CardContent className="p-0">
          <div 
            ref={mapRef}
            className="w-full h-80 rounded-lg"
            data-testid="delivery-tracking-map"
          />
        </CardContent>
      </Card>

      {/* Tracking Timeline */}
      {trackingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingEvents.slice(0, 5).map((event, index) => {
                const eventConfig = getStatusConfig(event.eventType);
                const EventIcon = eventConfig.icon;
                
                return (
                  <div key={event.id || index} className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      eventConfig.color
                    )}>
                      <EventIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{eventConfig.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.timestamp || event.createdAt).toLocaleString()}
                      </p>
                      {event.notes && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      {!isConnected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                Real-time updates unavailable. Refreshing connection...
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}