/**
 * Maps Service - Unified Maps Integration
 *
 * Priority order for API calls:
 * 1. OpenRouteService (FREE - 2,000 req/day)
 * 2. Google Maps (if configured and billing enabled)
 * 3. Mock data for Batangas Province (always works)
 *
 * Get free OpenRouteService key: https://openrouteservice.org/dev/#/signup
 */

import { openRouteService } from './openrouteservice';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  polyline?: string; // encoded polyline for route
}

export class MapsService {
  private googleApiKey: string;
  private useOpenRouteService: boolean;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    this.useOpenRouteService = openRouteService.isEnabled();

    if (this.useOpenRouteService) {
      console.log('[Maps] Using OpenRouteService as primary provider (FREE)');
    } else if (this.googleApiKey) {
      console.log('[Maps] Using Google Maps as primary provider');
    } else {
      console.log('[Maps] Using mock data for Batangas Province');
    }
  }

  // ============================================================================
  // Mock Data for Batangas Province (Fallback)
  // ============================================================================

  private getMockLocation(address: string): Location | null {
    const mockLocations: { [key: string]: Location } = {
      // Major cities
      "batangas city": { lat: 13.7565, lng: 121.0583, address: "Batangas City, Batangas" },
      "batangas": { lat: 13.7565, lng: 121.0583, address: "Batangas City, Batangas" },
      "lipa": { lat: 13.9411, lng: 121.1625, address: "Lipa City, Batangas" },
      "lipa city": { lat: 13.9411, lng: 121.1625, address: "Lipa City, Batangas" },
      "tanauan": { lat: 14.0822, lng: 121.1497, address: "Tanauan City, Batangas" },
      "tanauan city": { lat: 14.0822, lng: 121.1497, address: "Tanauan City, Batangas" },

      // Municipalities
      "sto. tomas": { lat: 14.1079, lng: 121.1413, address: "Santo Tomas, Batangas" },
      "santo tomas": { lat: 14.1079, lng: 121.1413, address: "Santo Tomas, Batangas" },
      "rosario": { lat: 13.8456, lng: 121.2075, address: "Rosario, Batangas" },
      "san juan": { lat: 13.8214, lng: 121.3953, address: "San Juan, Batangas" },
      "nasugbu": { lat: 14.0667, lng: 120.6333, address: "Nasugbu, Batangas" },
      "lemery": { lat: 13.9167, lng: 120.8833, address: "Lemery, Batangas" },
      "taal": { lat: 13.8817, lng: 120.9217, address: "Taal, Batangas" },
      "balayan": { lat: 13.9367, lng: 120.7322, address: "Balayan, Batangas" },
      "calaca": { lat: 13.9333, lng: 120.8167, address: "Calaca, Batangas" },
      "calatagan": { lat: 13.8333, lng: 120.6333, address: "Calatagan, Batangas" },
      "cuenca": { lat: 13.9000, lng: 121.0500, address: "Cuenca, Batangas" },
      "ibaan": { lat: 13.8167, lng: 121.1333, address: "Ibaan, Batangas" },
      "laurel": { lat: 14.0500, lng: 120.9167, address: "Laurel, Batangas" },
      "malvar": { lat: 14.0417, lng: 121.1583, address: "Malvar, Batangas" },
      "mataas na kahoy": { lat: 13.9667, lng: 121.1000, address: "Mataas na Kahoy, Batangas" },
      "san jose": { lat: 13.8667, lng: 121.1000, address: "San Jose, Batangas" },
      "san pascual": { lat: 13.8167, lng: 121.0333, address: "San Pascual, Batangas" },
      "santa teresita": { lat: 13.8500, lng: 121.0167, address: "Santa Teresita, Batangas" },
      "bauan": { lat: 13.7917, lng: 121.0083, address: "Bauan, Batangas" },
      "mabini": { lat: 13.7583, lng: 120.9250, address: "Mabini, Batangas" },
      "tingloy": { lat: 13.6500, lng: 120.8667, address: "Tingloy, Batangas" },
      "lobo": { lat: 13.6500, lng: 121.2333, address: "Lobo, Batangas" },
      "taysan": { lat: 13.7833, lng: 121.1833, address: "Taysan, Batangas" },
      "san luis": { lat: 13.8500, lng: 121.0833, address: "San Luis, Batangas" },
      "padre garcia": { lat: 13.8833, lng: 121.2167, address: "Padre Garcia, Batangas" },
      "san nicolas": { lat: 13.9167, lng: 120.9500, address: "San Nicolas, Batangas" },
      "agoncillo": { lat: 13.9333, lng: 120.9333, address: "Agoncillo, Batangas" },
      "alitagtag": { lat: 13.8667, lng: 121.0167, address: "Alitagtag, Batangas" },

      // Popular landmarks
      "sm batangas": { lat: 13.7589, lng: 121.0548, address: "SM City Batangas" },
      "sm lipa": { lat: 13.9456, lng: 121.1612, address: "SM City Lipa" },
      "robinsons lipa": { lat: 13.9398, lng: 121.1589, address: "Robinsons Place Lipa" },
      "taal lake": { lat: 13.9500, lng: 121.0000, address: "Taal Lake, Batangas" },
      "laiya": { lat: 13.6833, lng: 121.4000, address: "Laiya Beach, San Juan" },
      "anilao": { lat: 13.7667, lng: 120.9333, address: "Anilao, Mabini" },
    };

    const searchKey = address.toLowerCase().trim();

    // Direct match
    if (mockLocations[searchKey]) {
      return mockLocations[searchKey];
    }

    // Partial match
    for (const [key, location] of Object.entries(mockLocations)) {
      if (searchKey.includes(key) || key.includes(searchKey)) {
        return location;
      }
    }

    return null;
  }

  // ============================================================================
  // Geocoding
  // ============================================================================

  async geocodeAddress(address: string): Promise<Location | null> {
    // 1. Try OpenRouteService first (FREE)
    if (this.useOpenRouteService) {
      const orsResult = await openRouteService.geocode(address + ', Batangas, Philippines');
      if (orsResult) {
        console.log('[Maps] Geocoded via OpenRouteService');
        return {
          lat: orsResult.lat,
          lng: orsResult.lng,
          address: orsResult.address,
        };
      }
    }

    // 2. Try Google Maps
    if (this.googleApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)},Batangas,Philippines&key=${this.googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          console.log('[Maps] Geocoded via Google Maps');
          return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
            address: result.formatted_address,
          };
        }
      } catch (error) {
        console.error('[Maps] Google geocoding error:', error);
      }
    }

    // 3. Fall back to mock data
    const mockResult = this.getMockLocation(address);
    if (mockResult) {
      console.log('[Maps] Geocoded via mock data');
      return mockResult;
    }

    // Default to Batangas City for Batangas addresses
    if (address.toLowerCase().includes('batangas')) {
      return { lat: 13.7565, lng: 121.0583, address: "Batangas City, Batangas" };
    }

    return null;
  }

  // ============================================================================
  // Reverse Geocoding
  // ============================================================================

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    // 1. Try OpenRouteService first (FREE)
    if (this.useOpenRouteService) {
      const address = await openRouteService.reverseGeocode(lat, lng);
      if (address) {
        console.log('[Maps] Reverse geocoded via OpenRouteService');
        return address;
      }
    }

    // 2. Try Google Maps
    if (this.googleApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
          console.log('[Maps] Reverse geocoded via Google Maps');
          return data.results[0].formatted_address;
        }
      } catch (error) {
        console.error('[Maps] Google reverse geocoding error:', error);
      }
    }

    // 3. Mock fallback
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}, Batangas, Philippines`;
  }

  // ============================================================================
  // Route Calculation
  // ============================================================================

  async calculateRoute(origin: Location, destination: Location): Promise<RouteInfo | null> {
    // 1. Try OpenRouteService first (FREE)
    if (this.useOpenRouteService) {
      const orsRoute = await openRouteService.getDirections(origin, destination, 'driving-car');
      if (orsRoute) {
        console.log('[Maps] Route calculated via OpenRouteService');
        return {
          distance: orsRoute.distance,
          duration: orsRoute.duration,
          polyline: orsRoute.polyline,
        };
      }
    }

    // 2. Try Google Maps
    if (this.googleApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&key=${this.googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          console.log('[Maps] Route calculated via Google Maps');

          return {
            distance: leg.distance.value,
            duration: leg.duration.value,
            polyline: route.overview_polyline.points,
          };
        }
      } catch (error) {
        console.error('[Maps] Google directions error:', error);
      }
    }

    // 3. Mock calculation using Haversine formula
    const R = 6371e3; // Earth's radius in meters
    const φ1 = origin.lat * Math.PI / 180;
    const φ2 = destination.lat * Math.PI / 180;
    const Δφ = (destination.lat - origin.lat) * Math.PI / 180;
    const Δλ = (destination.lng - origin.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // in meters
    // Assume 30 km/h average speed in Batangas traffic
    const duration = (distance / 1000) / 30 * 3600;

    console.log('[Maps] Route calculated via mock (Haversine)');
    return {
      distance: Math.round(distance),
      duration: Math.round(duration),
    };
  }

  // ============================================================================
  // Distance Matrix
  // ============================================================================

  async getDistanceMatrix(
    origin: Location,
    destinations: Location[]
  ): Promise<RouteInfo[] | null> {
    // 1. Try OpenRouteService first (FREE)
    if (this.useOpenRouteService) {
      const matrix = await openRouteService.getDistanceMatrix([origin], destinations);
      if (matrix) {
        console.log('[Maps] Distance matrix via OpenRouteService');
        return destinations.map((_, i) => ({
          distance: Math.round(matrix.distances[0][i]),
          duration: Math.round(matrix.durations[0][i]),
        }));
      }
    }

    // 2. Try Google Maps
    if (this.googleApiKey) {
      try {
        const origins = `${origin.lat},${origin.lng}`;
        const dests = destinations.map(d => `${d.lat},${d.lng}`).join('|');
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${dests}&mode=driving&key=${this.googleApiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
          const results: RouteInfo[] = [];
          for (const element of data.rows[0].elements) {
            if (element.status === 'OK') {
              results.push({
                distance: element.distance.value,
                duration: element.duration.value,
              });
            }
          }
          console.log('[Maps] Distance matrix via Google Maps');
          return results;
        }
      } catch (error) {
        console.error('[Maps] Google distance matrix error:', error);
      }
    }

    // 3. Mock calculation for each destination
    console.log('[Maps] Distance matrix via mock calculation');
    const results: RouteInfo[] = [];
    for (const dest of destinations) {
      const route = await this.calculateRoute(origin, dest);
      if (route) {
        results.push(route);
      }
    }
    return results;
  }

  // ============================================================================
  // Route Optimization (for batch deliveries)
  // ============================================================================

  async optimizeRoute(origin: Location, destinations: Location[]): Promise<Location[] | null> {
    if (destinations.length <= 1) {
      return destinations;
    }

    // 1. Try OpenRouteService optimization (FREE)
    if (this.useOpenRouteService) {
      const optimized = await openRouteService.optimizeRoute(origin, destinations);
      if (optimized) {
        console.log(`[Maps] Route optimized via OpenRouteService: ${optimized.totalDistance}m, ${Math.round(optimized.totalDuration / 60)}min`);
        return optimized.route;
      }
    }

    // 2. Fallback: Simple nearest neighbor algorithm
    console.log('[Maps] Route optimized via nearest neighbor algorithm');
    const optimized: Location[] = [];
    const remaining = [...destinations];
    let current = origin;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const route = await this.calculateRoute(current, remaining[i]);
        if (route && route.distance < nearestDistance) {
          nearestDistance = route.distance;
          nearestIndex = i;
        }
      }

      const nearest = remaining.splice(nearestIndex, 1)[0];
      optimized.push(nearest);
      current = nearest;
    }

    return optimized;
  }

  // ============================================================================
  // Nearby Places
  // ============================================================================

  async findNearbyPlaces(
    location: Location,
    type: string,
    radius: number = 5000
  ): Promise<any[] | null> {
    // Google Maps Places API (if configured)
    if (this.googleApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${this.googleApiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK') {
          console.log('[Maps] Nearby places via Google Maps');
          return data.results;
        }
      } catch (error) {
        console.error('[Maps] Google places error:', error);
      }
    }

    // Mock data for development
    console.log('[Maps] Nearby places via mock data');
    return [
      {
        name: "Lomi King Batangas",
        location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
        rating: 4.5,
        price_level: 2,
      },
      {
        name: "Kapeng Barako Café",
        location: { lat: location.lat - 0.01, lng: location.lng + 0.01 },
        rating: 4.3,
        price_level: 2,
      },
      {
        name: "Bulalo Point",
        location: { lat: location.lat + 0.01, lng: location.lng - 0.01 },
        rating: 4.7,
        price_level: 3,
      },
    ];
  }

  // ============================================================================
  // Delivery Utilities
  // ============================================================================

  /**
   * Calculate delivery fee based on distance
   * Base fee: ₱49 for first 2km, then ₱10 per additional km
   */
  calculateDeliveryFee(distanceInMeters: number): number {
    const distanceInKm = distanceInMeters / 1000;
    const baseFee = 49;
    const perKmRate = 10;

    if (distanceInKm <= 2) {
      return baseFee;
    }

    const additionalKm = distanceInKm - 2;
    const additionalFee = Math.ceil(additionalKm) * perKmRate;

    return baseFee + additionalFee;
  }

  /**
   * Estimate delivery time based on distance
   */
  estimateDeliveryTime(distanceInMeters: number, preparationTime: number = 15): number {
    const distanceInKm = distanceInMeters / 1000;
    const averageSpeedKmh = 30; // Average speed in Batangas traffic
    const travelTimeMinutes = (distanceInKm / averageSpeedKmh) * 60;

    return Math.ceil(preparationTime + travelTimeMinutes);
  }

  /**
   * Check if location is within delivery zone
   */
  isWithinDeliveryZone(
    location: Location,
    restaurantLocation: Location,
    maxRadiusKm: number = 15
  ): boolean {
    const R = 6371; // Earth's radius in km
    const dLat = (location.lat - restaurantLocation.lat) * Math.PI / 180;
    const dLon = (location.lng - restaurantLocation.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(restaurantLocation.lat * Math.PI / 180) * Math.cos(location.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    return distance <= maxRadiusKm;
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { primary: string; fallback: string; status: string } {
    if (this.useOpenRouteService) {
      return {
        primary: 'OpenRouteService',
        fallback: this.googleApiKey ? 'Google Maps' : 'Mock Data',
        status: 'FREE tier active',
      };
    } else if (this.googleApiKey) {
      return {
        primary: 'Google Maps',
        fallback: 'Mock Data',
        status: 'Paid API',
      };
    }
    return {
      primary: 'Mock Data',
      fallback: 'None',
      status: 'Development mode',
    };
  }
}

export const mapsService = new MapsService();
