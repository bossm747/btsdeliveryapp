import { useState, useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: Date;
}

export interface UseGPSTrackingOptions {
  riderId: string;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  trackingInterval?: number; // ms between location updates
}

export function useGPSTracking({
  riderId,
  enableHighAccuracy = true,
  timeout = 10000,
  maximumAge = 60000,
  trackingInterval = 5000 // 5 seconds
}: UseGPSTrackingOptions) {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if geolocation is supported
  useEffect(() => {
    setIsSupported("geolocation" in navigator);
  }, []);

  // Start GPS tracking
  const startTracking = () => {
    if (!isSupported) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    if (isTracking) return;

    const options: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    };

    // Success callback
    const handleSuccess = async (position: GeolocationPosition) => {
      const locationData: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
        timestamp: new Date(position.timestamp),
      };

      setCurrentLocation(locationData);
      setError(null);

      // Send location to server
      try {
        await apiRequest("POST", "/api/gps/location", {
          riderId,
          ...locationData,
        });
      } catch (err) {
        console.error("Failed to update location on server:", err);
      }
    };

    // Error callback
    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = "An unknown error occurred";
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied by user";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable";
          break;
        case error.TIMEOUT:
          errorMessage = "Location request timed out";
          break;
      }
      
      setError(errorMessage);
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    setIsTracking(true);
  };

  // Stop GPS tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsTracking(false);
  };

  // Get current position once
  const getCurrentPosition = (): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!isSupported) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            timestamp: new Date(position.timestamp),
          };
          resolve(locationData);
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        options
      );
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    currentLocation,
    isTracking,
    error,
    isSupported,
    startTracking,
    stopTracking,
    getCurrentPosition,
  };
}

// Hook for tracking delivery progress
export function useDeliveryTracking(orderId: string) {
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [estimatedArrival, setEstimatedArrival] = useState<number | null>(null);
  const [riderLocation, setRiderLocation] = useState<LocationData | null>(null);

  // Fetch tracking events
  const fetchTrackingEvents = async () => {
    try {
      const response = await apiRequest("GET", `/api/gps/order/${orderId}/tracking`);
      const events = await response.json();
      setTrackingEvents(events);

      if (events && events.length > 0) {
        setCurrentStatus(events[0].eventType);
      }
    } catch (error) {
      console.error("Failed to fetch tracking events:", error);
    }
  };

  // Add tracking event
  const addTrackingEvent = async (
    riderId: string,
    eventType: 'order_picked_up' | 'en_route' | 'nearby' | 'delivered',
    location?: { lat: number; lng: number; address?: string },
    notes?: string
  ) => {
    try {
      await apiRequest("POST", "/api/gps/tracking-event", {
        orderId,
        riderId,
        eventType,
        location,
        notes,
      });
      
      // Refresh tracking events
      await fetchTrackingEvents();
    } catch (error) {
      console.error("Failed to add tracking event:", error);
    }
  };

  // Get ETA
  const updateETA = async (riderId: string, destination: { lat: number; lng: number }) => {
    try {
      const response = await apiRequest("POST", "/api/gps/eta", {
        riderId,
        destination,
      });
      const data = await response.json();
      setEstimatedArrival(data.estimatedMinutes);
    } catch (error) {
      console.error("Failed to get ETA:", error);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchTrackingEvents();
    }
  }, [orderId]);

  return {
    trackingEvents,
    currentStatus,
    estimatedArrival,
    riderLocation,
    setRiderLocation,
    addTrackingEvent,
    updateETA,
    refreshTracking: fetchTrackingEvents,
  };
}

// Hook for real-time WebSocket tracking updates
export function useRealTimeTracking(orderId: string) {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [locationUpdates, setLocationUpdates] = useState<any[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setWsConnection(ws);
      
      // Subscribe to tracking updates for this order
      ws.send(JSON.stringify({
        type: "subscribe_tracking",
        orderId,
        role: "customer"
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "location_update":
            if (data.orderId === orderId) {
              setLocationUpdates(prev => [...prev, data]);
            }
            break;
            
          case "delivery_tracking_event":
            if (data.orderId === orderId) {
              setTrackingEvents(prev => [...prev, data]);
            }
            break;
            
          case "order_update":
            if (data.orderId === orderId) {
              setTrackingEvents(prev => [...prev, data]);
            }
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setWsConnection(null);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "unsubscribe",
          orderId
        }));
      }
      ws.close();
    };
  }, [orderId]);

  return {
    isConnected,
    locationUpdates,
    trackingEvents,
    wsConnection,
  };
}