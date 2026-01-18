import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Location {
  lat: number;
  lng: number;
  label?: string;
  type?: "pickup" | "delivery" | "restaurant" | "rider" | "default";
}

interface ChatMapProps {
  locations: Location[];
  height?: string;
  showRoute?: boolean;
  className?: string;
}

// Custom marker icons
const markerIcons = {
  pickup: L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  delivery: L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  restaurant: L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
        <path d="M7 2v20"/>
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"/>
        <path d="M18 22v-7"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  rider: L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white animate-pulse">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="15" cy="5" r="1"/>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
  default: L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
};

export default function ChatMap({
  locations,
  height = "200px",
  showRoute = false,
  className = "",
}: ChatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapRef.current || locations.length === 0) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }

    try {
      // Calculate bounds
      const validLocations = locations.filter(
        (loc) => loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)
      );

      if (validLocations.length === 0) {
        setError("No valid locations to display");
        return;
      }

      // Default center to Batangas City
      const defaultCenter: [number, number] = [13.7565, 121.0583];
      const center: [number, number] =
        validLocations.length > 0
          ? [validLocations[0].lat, validLocations[0].lng]
          : defaultCenter;

      // Create map
      const map = L.map(mapRef.current, {
        center,
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
      });

      // Add tile layer (OpenStreetMap)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Add markers
      const markers: L.Marker[] = [];
      validLocations.forEach((location) => {
        const icon = markerIcons[location.type || "default"];
        const marker = L.marker([location.lat, location.lng], { icon }).addTo(map);

        if (location.label) {
          marker.bindPopup(`<strong>${location.label}</strong>`);
        }

        markers.push(marker);
      });

      // Fit bounds if multiple locations
      if (markers.length > 1) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.2));
      }

      // Draw route line if requested
      if (showRoute && validLocations.length >= 2) {
        const routePoints = validLocations.map(
          (loc) => [loc.lat, loc.lng] as [number, number]
        );
        L.polyline(routePoints, {
          color: "#6366f1",
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 10",
        }).addTo(map);
      }

      mapInstanceRef.current = map;
      setError(null);
    } catch (err) {
      console.error("Map error:", err);
      setError("Failed to load map");
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations, showRoute]);

  if (error) {
    return (
      <div
        className={`bg-muted rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (locations.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        className="rounded-lg overflow-hidden border"
        style={{ height }}
      />

      {/* Map controls overlay */}
      <div className="absolute bottom-2 right-2 flex gap-1">
        {locations.length > 0 && locations[0].lat && locations[0].lng && (
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs shadow-md"
            onClick={() => {
              const loc = locations[0];
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`,
                "_blank"
              );
            }}
          >
            <Navigation className="h-3 w-3 mr-1" />
            Navigate
          </Button>
        )}
      </div>

      {/* Legend */}
      {locations.some((l) => l.type) && (
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs shadow-md">
          <div className="flex items-center gap-3">
            {locations.some((l) => l.type === "restaurant") && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-orange-500 rounded-full" />
                Restaurant
              </span>
            )}
            {locations.some((l) => l.type === "delivery") && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                Delivery
              </span>
            )}
            {locations.some((l) => l.type === "rider") && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-purple-500 rounded-full" />
                Rider
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to extract locations from function results
export function extractLocationsFromData(data: any): Location[] {
  const locations: Location[] = [];

  // Handle restaurant data
  if (data.restaurant?.lat && data.restaurant?.lng) {
    locations.push({
      lat: data.restaurant.lat,
      lng: data.restaurant.lng,
      label: data.restaurant.name || "Restaurant",
      type: "restaurant",
    });
  }

  // Handle customer/delivery data
  if (data.customer?.lat && data.customer?.lng) {
    locations.push({
      lat: data.customer.lat,
      lng: data.customer.lng,
      label: data.customer.deliveryAddress || "Delivery Location",
      type: "delivery",
    });
  }

  // Handle delivery lat/lng directly
  if (data.deliveryLat && data.deliveryLng) {
    locations.push({
      lat: data.deliveryLat,
      lng: data.deliveryLng,
      label: data.deliveryAddress || "Delivery Location",
      type: "delivery",
    });
  }

  // Handle pickup location
  if (data.pickup?.lat && data.pickup?.lng) {
    locations.push({
      lat: data.pickup.lat,
      lng: data.pickup.lng,
      label: data.pickup.name || data.pickup.address || "Pickup",
      type: "pickup",
    });
  }

  // Handle array of restaurants
  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      if (item.lat && item.lng) {
        locations.push({
          lat: item.lat,
          lng: item.lng,
          label: item.name || `Location ${idx + 1}`,
          type: item.type || "restaurant",
        });
      }
      // Handle nested address object
      if (item.address?.lat && item.address?.lng) {
        locations.push({
          lat: item.address.lat,
          lng: item.address.lng,
          label: item.name || `Location ${idx + 1}`,
          type: "restaurant",
        });
      }
    });
  }

  return locations;
}
