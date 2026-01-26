/**
 * Leaflet Utilities
 *
 * Shared utilities for Leaflet maps including:
 * - Default icon fix
 * - Custom marker icons
 * - Polyline decoder for OpenRouteService
 * - Bounds calculation helpers
 */

import L from "leaflet";

// ============================================================================
// Fix Leaflet Default Marker Icons
// ============================================================================

// This fixes the default marker icon path issues in bundled applications
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ============================================================================
// Location Types
// ============================================================================

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  label?: string;
  type?: "pickup" | "delivery" | "restaurant" | "rider" | "customer" | "default";
}

// ============================================================================
// Custom Marker Icons
// ============================================================================

export const markerIcons = {
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
    popupAnchor: [0, -32],
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
    popupAnchor: [0, -32],
  }),

  customer: L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
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
    popupAnchor: [0, -32],
  }),

  rider: L.divIcon({
    className: "custom-marker rider-marker",
    html: `<div class="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white animate-pulse">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="18.5" cy="17.5" r="3.5"/>
        <circle cx="5.5" cy="17.5" r="3.5"/>
        <circle cx="15" cy="5" r="1"/>
        <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
      </svg>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
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
    popupAnchor: [0, -32],
  }),
};

// Get marker icon by type
export function getMarkerIcon(
  type: Location["type"] = "default"
): L.DivIcon {
  return markerIcons[type] || markerIcons.default;
}

// Create a custom marker icon with a specific color
export function createColoredIcon(
  color: string,
  svgContent: string,
  animated = false
): L.DivIcon {
  const animationClass = animated ? "animate-pulse" : "";
  return L.divIcon({
    className: "custom-marker",
    html: `<div class="w-8 h-8 ${color} rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white ${animationClass}">
      ${svgContent}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// ============================================================================
// Polyline Decoder
// ============================================================================

/**
 * Decode an encoded polyline string into an array of coordinates
 * Works with both Google Maps encoded polylines and OpenRouteService polylines
 *
 * @param encoded - The encoded polyline string
 * @param precision - The precision (5 for Google, 5 or 6 for ORS)
 * @returns Array of [lat, lng] tuples
 */
export function decodePolyline(
  encoded: string,
  precision: number = 5
): [number, number][] {
  if (!encoded || encoded.length === 0) {
    return [];
  }

  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);

  while (index < encoded.length) {
    // Decode latitude
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    // Decode longitude
    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

/**
 * Convert decoded polyline to Leaflet LatLng array
 */
export function polylineToLatLngs(
  encoded: string,
  precision: number = 5
): L.LatLng[] {
  const decoded = decodePolyline(encoded, precision);
  return decoded.map(([lat, lng]) => L.latLng(lat, lng));
}

// ============================================================================
// Bounds Calculation Helpers
// ============================================================================

/**
 * Calculate bounds from an array of locations
 */
export function calculateBounds(locations: Location[]): L.LatLngBounds | null {
  const validLocations = locations.filter(
    (loc) => loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)
  );

  if (validLocations.length === 0) {
    return null;
  }

  const bounds = L.latLngBounds(
    validLocations.map((loc) => [loc.lat, loc.lng] as [number, number])
  );

  return bounds;
}

/**
 * Fit map to bounds with padding
 */
export function fitMapToBounds(
  map: L.Map,
  locations: Location[],
  padding: number = 0.1
): void {
  const bounds = calculateBounds(locations);
  if (bounds) {
    map.fitBounds(bounds.pad(padding));
  }
}

/**
 * Get center point from locations
 */
export function getCenterFromLocations(
  locations: Location[]
): [number, number] {
  const validLocations = locations.filter(
    (loc) => loc.lat && loc.lng && !isNaN(loc.lat) && !isNaN(loc.lng)
  );

  if (validLocations.length === 0) {
    // Default to Batangas City
    return [13.7565, 121.0583];
  }

  const sumLat = validLocations.reduce((sum, loc) => sum + loc.lat, 0);
  const sumLng = validLocations.reduce((sum, loc) => sum + loc.lng, 0);

  return [sumLat / validLocations.length, sumLng / validLocations.length];
}

// ============================================================================
// Map Tile Layers
// ============================================================================

/**
 * Default tile layer options for OpenStreetMap
 */
export const defaultTileLayer = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  options: {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

/**
 * Alternative tile layers
 */
export const tileLayers = {
  osm: defaultTileLayer,
  cartoDark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  cartoLight: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
};

/**
 * Create a tile layer
 */
export function createTileLayer(
  type: keyof typeof tileLayers = "osm"
): L.TileLayer {
  const config = tileLayers[type];
  return L.tileLayer(config.url, config.options);
}

// ============================================================================
// Distance and Duration Formatting
// ============================================================================

/**
 * Format distance in meters to a human-readable string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Format duration in seconds to a human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

// ============================================================================
// Animation Helpers
// ============================================================================

/**
 * Animate a marker movement from one position to another
 */
export function animateMarkerMovement(
  marker: L.Marker,
  newPosition: L.LatLng,
  duration: number = 1000
): void {
  const currentPosition = marker.getLatLng();
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out function for smooth deceleration
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const lat =
      currentPosition.lat + (newPosition.lat - currentPosition.lat) * easeProgress;
    const lng =
      currentPosition.lng + (newPosition.lng - currentPosition.lng) * easeProgress;

    marker.setLatLng([lat, lng]);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}

/**
 * Calculate bearing between two points (for rotation)
 */
export function calculateBearing(
  from: L.LatLng,
  to: L.LatLng
): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = Math.atan2(x, y);
  return ((bearing * 180) / Math.PI + 360) % 360;
}

// ============================================================================
// Default Map Configuration
// ============================================================================

export const DEFAULT_CENTER: [number, number] = [13.7565, 121.0583]; // Batangas City
export const DEFAULT_ZOOM = 14;

export const defaultMapOptions: L.MapOptions = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  zoomControl: true,
  attributionControl: false,
};

// ============================================================================
// API Helpers
// ============================================================================

/**
 * Fetch directions from the routing API
 */
export async function fetchDirections(
  origin: Location,
  destination: Location
): Promise<{
  distance: number;
  duration: number;
  polyline?: string;
  distanceKm: string;
  durationMinutes: number;
} | null> {
  try {
    const response = await fetch("/api/routing/directions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ origin, destination }),
    });

    const data = await response.json();

    if (data.success) {
      return data.route;
    }

    console.error("[Leaflet Utils] Failed to fetch directions:", data.message);
    return null;
  } catch (error) {
    console.error("[Leaflet Utils] Error fetching directions:", error);
    return null;
  }
}

/**
 * Fetch delivery estimate from the routing API
 */
export async function fetchDeliveryEstimate(
  origin: Location,
  destination: Location,
  preparationTime: number = 15
): Promise<{
  distance: number;
  distanceKm: string;
  deliveryFee: number;
  estimatedTime: number;
  travelTime: number;
  preparationTime: number;
  polyline?: string;
} | null> {
  try {
    const response = await fetch("/api/routing/delivery-estimate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ origin, destination, preparationTime }),
    });

    const data = await response.json();

    if (data.success) {
      return data.estimate;
    }

    console.error("[Leaflet Utils] Failed to fetch delivery estimate:", data.message);
    return null;
  } catch (error) {
    console.error("[Leaflet Utils] Error fetching delivery estimate:", error);
    return null;
  }
}

// ============================================================================
// CSS Styles for Custom Markers
// ============================================================================

// Add this CSS to your global styles or inject it
export const leafletMarkerStyles = `
  .custom-marker {
    background: transparent;
    border: none;
  }

  .custom-marker > div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rider-marker > div {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
    }
  }

  .leaflet-popup-content {
    margin: 8px 12px;
    font-size: 14px;
  }

  .leaflet-popup-content-wrapper {
    border-radius: 8px;
  }
`;
