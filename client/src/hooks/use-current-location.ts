/**
 * useCurrentLocation Hook
 *
 * Provides automatic GPS location detection with reverse geocoding.
 * Uses the browser's Geolocation API and our routing API for address lookup.
 */

import { useState, useEffect, useCallback } from "react";

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  accuracy?: number;
  timestamp?: number;
}

export interface UseCurrentLocationOptions {
  /** Auto-detect location on mount */
  autoDetect?: boolean;
  /** Enable high accuracy mode (uses more battery) */
  highAccuracy?: boolean;
  /** Timeout for location request in ms */
  timeout?: number;
  /** Maximum age of cached position in ms */
  maxAge?: number;
  /** Auto reverse-geocode the location to get address */
  autoReverseGeocode?: boolean;
  /** Watch position continuously */
  watchPosition?: boolean;
}

export interface UseCurrentLocationReturn {
  location: LocationData | null;
  address: string | null;
  isLoading: boolean;
  isGeocodingAddress: boolean;
  error: string | null;
  /** Manually trigger location detection */
  detectLocation: () => Promise<LocationData | null>;
  /** Reverse geocode coordinates to address */
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  /** Clear current location */
  clearLocation: () => void;
  /** Check if geolocation is supported */
  isSupported: boolean;
}

// Default Batangas City coordinates
const DEFAULT_LOCATION: LocationData = {
  lat: 13.7565,
  lng: 121.0583,
};

export function useCurrentLocation(
  options: UseCurrentLocationOptions = {}
): UseCurrentLocationReturn {
  const {
    autoDetect = false,
    highAccuracy = true,
    timeout = 10000,
    maxAge = 60000,
    autoReverseGeocode = true,
    watchPosition = false,
  } = options;

  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof navigator !== "undefined" && "geolocation" in navigator;

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      setIsGeocodingAddress(true);
      const response = await fetch("/api/routing/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      if (!response.ok) {
        throw new Error("Failed to reverse geocode");
      }

      const data = await response.json();
      if (data.success && data.address) {
        setAddress(data.address);
        return data.address;
      }
      return null;
    } catch (err) {
      console.error("Reverse geocode error:", err);
      return null;
    } finally {
      setIsGeocodingAddress(false);
    }
  }, []);

  // Detect current location
  const detectLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!isSupported) {
      setError("Geolocation is not supported by your browser");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: maxAge,
        });
      });

      const locationData: LocationData = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      setLocation(locationData);

      // Auto reverse geocode if enabled
      if (autoReverseGeocode) {
        const addr = await reverseGeocode(locationData.lat, locationData.lng);
        if (addr) {
          locationData.address = addr;
        }
      }

      return locationData;
    } catch (err: any) {
      let errorMessage = "Failed to detect location";

      if (err.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions.";
      } else if (err.code === 2) {
        errorMessage = "Location unavailable. Please try again.";
      } else if (err.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      setError(errorMessage);
      console.error("Geolocation error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, highAccuracy, timeout, maxAge, autoReverseGeocode, reverseGeocode]);

  // Clear location
  const clearLocation = useCallback(() => {
    setLocation(null);
    setAddress(null);
    setError(null);
  }, []);

  // Auto-detect on mount if enabled
  useEffect(() => {
    if (autoDetect && isSupported) {
      detectLocation();
    }
  }, [autoDetect, isSupported]); // Don't include detectLocation to avoid loop

  // Watch position if enabled
  useEffect(() => {
    if (!watchPosition || !isSupported) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const locationData: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        setLocation(locationData);

        if (autoReverseGeocode) {
          const addr = await reverseGeocode(locationData.lat, locationData.lng);
          if (addr) {
            locationData.address = addr;
          }
        }
      },
      (err) => {
        console.error("Watch position error:", err);
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout,
        maximumAge: maxAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watchPosition, isSupported, highAccuracy, timeout, maxAge, autoReverseGeocode, reverseGeocode]);

  return {
    location,
    address,
    isLoading,
    isGeocodingAddress,
    error,
    detectLocation,
    reverseGeocode,
    clearLocation,
    isSupported,
  };
}

export default useCurrentLocation;
