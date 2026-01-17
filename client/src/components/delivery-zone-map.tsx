/**
 * Delivery Zone Map Component
 * Displays service area boundaries with color-coded zones by delivery fee
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  Truck,
  Clock,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

// Types
interface DeliveryZone {
  id: string;
  name: string;
  radiusKm: number;
  deliveryFee: number;
  estimatedTime: string;
  color: string;
  description: string;
}

interface ZoneCheckResult {
  serviceable: boolean;
  zone: string;
  deliveryFee: number;
  distanceKm: number;
  message: string;
}

interface DeliveryZoneMapProps {
  showCheckFeature?: boolean;
  initialCenter?: { lat: number; lng: number };
  onZoneSelect?: (zone: DeliveryZone | null) => void;
  className?: string;
}

// Batangas City center
const DEFAULT_CENTER = { lat: 13.7565, lng: 121.0583 };

export function DeliveryZoneMap({
  showCheckFeature = true,
  initialCenter = DEFAULT_CENTER,
  onZoneSelect,
  className
}: DeliveryZoneMapProps) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [center, setCenter] = useState(initialCenter);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check location state
  const [checkLocation, setCheckLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [checkResult, setCheckResult] = useState<ZoneCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Map reference (for Leaflet integration)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  // Fetch delivery zones configuration
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch('/api/delivery-zones');
        const data = await response.json();
        setZones(data.zones || []);
        if (data.center) {
          setCenter(data.center);
        }
      } catch (err) {
        console.error('Error fetching delivery zones:', err);
        setError('Failed to load delivery zones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchZones();
  }, []);

  // Initialize map (using Leaflet if available, otherwise show static visualization)
  useEffect(() => {
    if (!mapContainerRef.current || zones.length === 0) return;

    // Check if Leaflet is available
    const L = (window as any).L;
    if (!L) {
      console.log('Leaflet not available, showing static visualization');
      return;
    }

    // Initialize Leaflet map
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView(
        [center.lat, center.lng],
        11
      );

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Clear existing layers
    mapRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.Circle || layer instanceof L.Marker) {
        mapRef.current.removeLayer(layer);
      }
    });

    // Draw zone circles (outer to inner)
    const sortedZones = [...zones].sort((a, b) => b.radiusKm - a.radiusKm);

    sortedZones.forEach(zone => {
      L.circle([center.lat, center.lng], {
        radius: zone.radiusKm * 1000,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.15,
        weight: 2
      }).addTo(mapRef.current);
    });

    // Add center marker
    L.marker([center.lat, center.lng], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
        iconSize: [12, 12]
      })
    }).addTo(mapRef.current);

    // Add check location marker if exists
    if (checkLocation) {
      L.marker([checkLocation.lat, checkLocation.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background: ${checkResult?.serviceable ? '#22c55e' : '#ef4444'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
          iconSize: [16, 16]
        })
      }).addTo(mapRef.current);
    }

    return () => {
      // Cleanup map on unmount
      if (mapRef.current) {
        // Don't destroy the map, just keep it
      }
    };
  }, [zones, center, checkLocation, checkResult]);

  // Get user's current location
  const handleGetLocation = useCallback(async () => {
    setIsLocating(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setCheckLocation(location);
      await checkDeliveryZone(location);
    } catch (err: any) {
      console.error('Error getting location:', err);
      setError(err.message || 'Failed to get your location');
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Check if location is within delivery zone
  const checkDeliveryZone = async (location: { lat: number; lng: number }) => {
    setIsChecking(true);
    setCheckResult(null);

    try {
      const response = await apiRequest('POST', '/api/delivery-zones/check', {
        latitude: location.lat,
        longitude: location.lng
      });

      const result: ZoneCheckResult = await response.json();
      setCheckResult(result);

      // Find matching zone for callback
      if (onZoneSelect) {
        const matchingZone = zones.find(z => z.id === result.zone);
        onZoneSelect(result.serviceable ? (matchingZone || null) : null);
      }
    } catch (err) {
      console.error('Error checking delivery zone:', err);
      setError('Failed to check delivery zone');
    } finally {
      setIsChecking(false);
    }
  };

  // Handle map click to check location
  const handleMapClick = useCallback((e: any) => {
    if (!e.latlng) return;

    const location = { lat: e.latlng.lat, lng: e.latlng.lng };
    setCheckLocation(location);
    checkDeliveryZone(location);
  }, [zones, onZoneSelect]);

  // Add click handler to map
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.on('click', handleMapClick);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, [handleMapClick]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Delivery Service Area
        </CardTitle>
        <CardDescription>
          View our delivery zones and check if we deliver to your location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Container */}
        <div
          ref={mapContainerRef}
          className="w-full h-64 sm:h-80 rounded-lg border bg-muted overflow-hidden relative"
        >
          {/* Static visualization fallback (when Leaflet is not available) */}
          <StaticZoneVisualization
            zones={zones}
            center={center}
            checkLocation={checkLocation}
            checkResult={checkResult}
          />
        </div>

        {/* Zone Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {zones.map(zone => (
            <div
              key={zone.id}
              className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: zone.color }}
                />
                <span className="text-xs font-medium truncate">{zone.name}</span>
              </div>
              <div className="text-lg font-bold text-primary">
                ₱{zone.deliveryFee}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {zone.estimatedTime}
              </div>
            </div>
          ))}
        </div>

        {/* Check Location Feature */}
        {showCheckFeature && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleGetLocation}
                disabled={isLocating || isChecking}
                className="flex-1"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting location...
                  </>
                ) : (
                  <>
                    <Navigation className="h-4 w-4 mr-2" />
                    Use My Location
                  </>
                )}
              </Button>
              <div className="flex-1 text-center text-sm text-muted-foreground py-2">
                or click on the map
              </div>
            </div>

            {/* Check Result */}
            {checkResult && (
              <Alert
                variant={checkResult.serviceable ? 'default' : 'destructive'}
                className={cn(
                  checkResult.serviceable && 'border-green-200 bg-green-50 text-green-800'
                )}
              >
                {checkResult.serviceable ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {checkResult.serviceable ? 'Great news!' : 'Outside Delivery Area'}
                </AlertTitle>
                <AlertDescription className="mt-2">
                  {checkResult.message}
                  {checkResult.serviceable && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        <Truck className="h-3 w-3 mr-1" />
                        ₱{checkResult.deliveryFee} delivery fee
                      </Badge>
                      <Badge variant="secondary">
                        <MapPin className="h-3 w-3 mr-1" />
                        {checkResult.distanceKm} km away
                      </Badge>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Delivery fees and times are estimates. Actual fees may vary based on traffic conditions and order specifics.
            Our service area covers most of Batangas province.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Static Zone Visualization (fallback when Leaflet is not available)
function StaticZoneVisualization({
  zones,
  center,
  checkLocation,
  checkResult
}: {
  zones: DeliveryZone[];
  center: { lat: number; lng: number };
  checkLocation: { lat: number; lng: number } | null;
  checkResult: ZoneCheckResult | null;
}) {
  const maxRadius = Math.max(...zones.map(z => z.radiusKm));

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
      <svg
        viewBox="0 0 300 300"
        className="w-full h-full max-w-[300px] max-h-[300px]"
      >
        {/* Draw zone circles */}
        {[...zones].sort((a, b) => b.radiusKm - a.radiusKm).map(zone => {
          const radius = (zone.radiusKm / maxRadius) * 120;
          return (
            <g key={zone.id}>
              <circle
                cx="150"
                cy="150"
                r={radius}
                fill={zone.color}
                fillOpacity="0.2"
                stroke={zone.color}
                strokeWidth="2"
              />
              {/* Zone label */}
              <text
                x="150"
                y={150 - radius + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                fontSize="10"
              >
                {zone.radiusKm}km
              </text>
            </g>
          );
        })}

        {/* Center marker */}
        <circle
          cx="150"
          cy="150"
          r="6"
          fill="#ef4444"
          stroke="white"
          strokeWidth="2"
        />

        {/* Check location marker */}
        {checkLocation && (
          <circle
            cx="175"
            cy="125"
            r="8"
            fill={checkResult?.serviceable ? '#22c55e' : '#ef4444'}
            stroke="white"
            strokeWidth="2"
          />
        )}

        {/* Center label */}
        <text
          x="150"
          y="170"
          textAnchor="middle"
          className="text-xs font-medium fill-gray-800"
          fontSize="11"
        >
          Batangas City
        </text>
      </svg>

      {/* Overlay text */}
      <div className="absolute bottom-2 left-2 right-2 text-center">
        <p className="text-xs text-muted-foreground bg-white/80 rounded px-2 py-1">
          Click "Use My Location" to check if we deliver to you
        </p>
      </div>
    </div>
  );
}

// Mini version for embedding in other components
export function DeliveryZoneBadge({
  zone,
  deliveryFee,
  className
}: {
  zone?: string;
  deliveryFee?: number;
  className?: string;
}) {
  const zoneColors: Record<string, string> = {
    zone1: '#22c55e',
    zone2: '#3b82f6',
    zone3: '#f59e0b',
    zone4: '#ef4444',
    outside: '#6b7280'
  };

  return (
    <Badge
      variant="outline"
      className={cn('gap-1', className)}
      style={{ borderColor: zoneColors[zone || 'outside'] }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: zoneColors[zone || 'outside'] }}
      />
      {zone && zone !== 'outside' ? (
        <span>₱{deliveryFee} delivery</span>
      ) : (
        <span>Outside area</span>
      )}
    </Badge>
  );
}

export default DeliveryZoneMap;
