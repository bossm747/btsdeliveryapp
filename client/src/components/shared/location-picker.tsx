/**
 * Location Picker Component
 *
 * A Leaflet-based location picker with auto-detection and reverse geocoding.
 * Features:
 * - Auto-detect current GPS location
 * - Click on map to select location
 * - Drag marker to adjust location
 * - Auto-fill address from coordinates
 * - Manual address search with geocoding
 */

import { useEffect, useState, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  Check,
  AlertCircle,
  Crosshair,
  RefreshCw,
} from "lucide-react";
import { useCurrentLocation, LocationData } from "@/hooks/use-current-location";
import {
  markerIcons,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "@/lib/leaflet-utils";

export interface LocationPickerValue {
  lat: number;
  lng: number;
  address?: string;
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  landmark?: string;
}

interface LocationPickerProps {
  /** Current value */
  value?: LocationPickerValue | null;
  /** Called when location changes */
  onChange?: (location: LocationPickerValue) => void;
  /** Auto-detect location on mount */
  autoDetect?: boolean;
  /** Show address input field */
  showAddressInput?: boolean;
  /** Show search functionality */
  showSearch?: boolean;
  /** Map height */
  height?: string;
  /** Label for the component */
  label?: string;
  /** Placeholder for address input */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show coordinates display */
  showCoordinates?: boolean;
  /** Custom marker icon type */
  markerType?: "pickup" | "delivery" | "customer" | "rider" | "restaurant";
}

export default function LocationPicker({
  value,
  onChange,
  autoDetect = false,
  showAddressInput = true,
  showSearch = true,
  height = "300px",
  label = "Select Location",
  placeholder = "Enter address or use current location",
  disabled = false,
  showCoordinates = true,
  markerType = "pickup",
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const {
    location: detectedLocation,
    address: detectedAddress,
    isLoading: isDetecting,
    isGeocodingAddress,
    error: detectError,
    detectLocation,
    reverseGeocode,
    isSupported,
  } = useCurrentLocation({ autoDetect, autoReverseGeocode: true });

  // Update parent when detected location changes
  useEffect(() => {
    if (detectedLocation && onChange && !value) {
      onChange({
        lat: detectedLocation.lat,
        lng: detectedLocation.lng,
        address: detectedAddress || undefined,
      });
    }
  }, [detectedLocation, detectedAddress]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    try {
      // Clean up existing map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const initialCenter = value
        ? [value.lat, value.lng]
        : detectedLocation
        ? [detectedLocation.lat, detectedLocation.lng]
        : DEFAULT_CENTER;

      // Create map
      const map = L.map(mapRef.current, {
        center: initialCenter as [number, number],
        zoom: value || detectedLocation ? 16 : DEFAULT_ZOOM,
        zoomControl: true,
        attributionControl: false,
      });

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add initial marker if value exists
      if (value) {
        addMarker(value.lat, value.lng, map);
      }

      // Click to select location
      if (!disabled) {
        map.on("click", async (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          addMarker(lat, lng, map);

          // Reverse geocode to get address
          const address = await reverseGeocode(lat, lng);

          onChange?.({
            lat,
            lng,
            address: address || undefined,
          });
        });
      }

      setMapReady(true);
    } catch (error) {
      console.error("Failed to initialize location picker map:", error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [disabled]);

  // Update marker when value changes
  useEffect(() => {
    if (!mapInstanceRef.current || !value) return;

    addMarker(value.lat, value.lng, mapInstanceRef.current);
    mapInstanceRef.current.setView([value.lat, value.lng], 16);
  }, [value?.lat, value?.lng]);

  // Add or update marker
  const addMarker = useCallback((lat: number, lng: number, map: L.Map) => {
    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Get icon based on marker type
    const icon = markerIcons[markerType] || markerIcons.pickup;

    // Create new marker
    const marker = L.marker([lat, lng], {
      icon,
      draggable: !disabled,
    }).addTo(map);

    // Handle drag end
    if (!disabled) {
      marker.on("dragend", async (e: L.LeafletEvent) => {
        const { lat, lng } = (e.target as L.Marker).getLatLng();
        const address = await reverseGeocode(lat, lng);
        onChange?.({
          lat,
          lng,
          address: address || undefined,
        });
      });
    }

    markerRef.current = marker;
  }, [disabled, markerType, onChange, reverseGeocode]);

  // Handle detect location button
  const handleDetectLocation = async () => {
    const location = await detectLocation();
    if (location && mapInstanceRef.current) {
      addMarker(location.lat, location.lng, mapInstanceRef.current);
      mapInstanceRef.current.setView([location.lat, location.lng], 16);

      onChange?.({
        lat: location.lat,
        lng: location.lng,
        address: location.address,
      });
    }
  };

  // Handle address search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch("/api/routing/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: searchQuery }),
      });

      const data = await response.json();

      if (data.success && data.location) {
        const { lat, lng, address } = data.location;

        if (mapInstanceRef.current) {
          addMarker(lat, lng, mapInstanceRef.current);
          mapInstanceRef.current.setView([lat, lng], 16);
        }

        onChange?.({
          lat,
          lng,
          address: address || searchQuery,
        });
      } else {
        setSearchError("Address not found. Try a different search term.");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Failed to search address. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4 text-orange-500" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Detect Buttons */}
        {(showSearch || isSupported) && !disabled && (
          <div className="flex gap-2">
            {showSearch && (
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  disabled={isSearching}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            {isSupported && (
              <Button
                variant="outline"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="shrink-0"
              >
                {isDetecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crosshair className="h-4 w-4 mr-2" />
                )}
                {isDetecting ? "Detecting..." : "Use My Location"}
              </Button>
            )}
          </div>
        )}

        {/* Error Messages */}
        {(searchError || detectError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{searchError || detectError}</AlertDescription>
          </Alert>
        )}

        {/* Map */}
        <div
          ref={mapRef}
          className="w-full rounded-lg border bg-gray-100"
          style={{ height }}
        />

        {/* Location Info */}
        {value && (
          <div className="space-y-2">
            {/* Address */}
            {showAddressInput && (
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Address</Label>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                  {isGeocodingAddress ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">
                    {value.address || "Address will appear here..."}
                  </span>
                </div>
              </div>
            )}

            {/* Coordinates */}
            {showCoordinates && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  Lat: {value.lat.toFixed(6)}
                </span>
                <span>Lng: {value.lng.toFixed(6)}</span>
                <Check className="h-3 w-3 text-green-500" />
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!value && !disabled && (
          <p className="text-xs text-muted-foreground text-center">
            Click on the map to select a location, or use the buttons above to detect your current location.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { LocationPicker };
