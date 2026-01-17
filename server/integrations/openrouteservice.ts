/**
 * OpenRouteService Integration
 *
 * Free maps API alternative to Google Maps
 * - 2,000 requests/day free tier
 * - Geocoding, routing, distance matrix, isochrones
 * - Based on OpenStreetMap data
 *
 * Get free API key: https://openrouteservice.org/dev/#/signup
 */

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  polyline?: string;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name?: string;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  address: string;
  confidence: number;
  type: string;
}

// OpenRouteService API configuration
const ORS_BASE_URL = 'https://api.openrouteservice.org';

export class OpenRouteService {
  private apiKey: string;
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.OPENROUTESERVICE_API_KEY || '';
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      console.warn('[OpenRouteService] API key not configured. Get free key at: https://openrouteservice.org/dev/#/signup');
    } else {
      console.log('[OpenRouteService] Initialized with API key');
    }
  }

  /**
   * Check if service is configured
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Geocode address to coordinates
   */
  async geocode(address: string, country: string = 'PH'): Promise<GeocodingResult | null> {
    if (!this.enabled) return null;

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        text: address,
        'boundary.country': country,
        size: '1',
      });

      const response = await fetch(`${ORS_BASE_URL}/geocode/search?${params}`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.geometry.coordinates;

        return {
          lat,
          lng,
          address: feature.properties.label || address,
          confidence: feature.properties.confidence || 0,
          type: feature.properties.layer || 'unknown',
        };
      }

      return null;
    } catch (error) {
      console.error('[OpenRouteService] Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.enabled) return null;

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        'point.lat': lat.toString(),
        'point.lon': lng.toString(),
        size: '1',
      });

      const response = await fetch(`${ORS_BASE_URL}/geocode/reverse?${params}`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features[0].properties.label;
      }

      return null;
    } catch (error) {
      console.error('[OpenRouteService] Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get directions between two points
   * Profile options: driving-car, driving-hgv, cycling-regular, cycling-road, foot-walking
   */
  async getDirections(
    origin: Location,
    destination: Location,
    profile: string = 'driving-car'
  ): Promise<RouteInfo | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${ORS_BASE_URL}/v2/directions/${profile}`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat],
          ],
          instructions: true,
          geometry: true,
        }),
      });

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const summary = route.summary;

        // Parse steps if available
        const steps: RouteStep[] = [];
        if (route.segments) {
          for (const segment of route.segments) {
            if (segment.steps) {
              for (const step of segment.steps) {
                steps.push({
                  instruction: step.instruction,
                  distance: step.distance,
                  duration: step.duration,
                  name: step.name,
                });
              }
            }
          }
        }

        return {
          distance: Math.round(summary.distance),
          duration: Math.round(summary.duration),
          polyline: route.geometry,
          steps: steps.length > 0 ? steps : undefined,
        };
      }

      return null;
    } catch (error) {
      console.error('[OpenRouteService] Directions error:', error);
      return null;
    }
  }

  /**
   * Calculate distance matrix for multiple destinations
   */
  async getDistanceMatrix(
    origins: Location[],
    destinations: Location[],
    profile: string = 'driving-car'
  ): Promise<{ distances: number[][]; durations: number[][] } | null> {
    if (!this.enabled) return null;

    try {
      // Combine all locations
      const locations = [
        ...origins.map(o => [o.lng, o.lat]),
        ...destinations.map(d => [d.lng, d.lat]),
      ];

      const sources = origins.map((_, i) => i);
      const destinationsIdx = destinations.map((_, i) => origins.length + i);

      const response = await fetch(`${ORS_BASE_URL}/v2/matrix/${profile}`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations,
          sources,
          destinations: destinationsIdx,
          metrics: ['distance', 'duration'],
        }),
      });

      const data = await response.json();

      if (data.distances && data.durations) {
        return {
          distances: data.distances,
          durations: data.durations,
        };
      }

      return null;
    } catch (error) {
      console.error('[OpenRouteService] Distance matrix error:', error);
      return null;
    }
  }

  /**
   * Get isochrone (area reachable within time/distance)
   * Useful for delivery zone visualization
   */
  async getIsochrone(
    center: Location,
    rangeSeconds: number[] = [600, 1200, 1800], // 10, 20, 30 minutes
    profile: string = 'driving-car'
  ): Promise<any | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${ORS_BASE_URL}/v2/isochrones/${profile}`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: [[center.lng, center.lat]],
          range: rangeSeconds,
          range_type: 'time',
        }),
      });

      const data = await response.json();
      return data.features || null;
    } catch (error) {
      console.error('[OpenRouteService] Isochrone error:', error);
      return null;
    }
  }

  /**
   * Optimize route for multiple stops (traveling salesman)
   * Great for delivery route optimization
   */
  async optimizeRoute(
    start: Location,
    stops: Location[],
    end?: Location,
    profile: string = 'driving-car'
  ): Promise<{ route: Location[]; totalDistance: number; totalDuration: number } | null> {
    if (!this.enabled) return null;

    try {
      // Build jobs (delivery stops)
      const jobs = stops.map((stop, index) => ({
        id: index + 1,
        location: [stop.lng, stop.lat],
      }));

      // Build vehicle
      const vehicle = {
        id: 1,
        profile,
        start: [start.lng, start.lat],
        end: end ? [end.lng, end.lat] : [start.lng, start.lat],
      };

      const response = await fetch(`${ORS_BASE_URL}/optimization`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobs,
          vehicles: [vehicle],
        }),
      });

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const optimizedRoute = data.routes[0];
        const orderedStops: Location[] = [];

        // Extract optimized order
        for (const step of optimizedRoute.steps) {
          if (step.type === 'job') {
            const jobIndex = step.job - 1;
            orderedStops.push(stops[jobIndex]);
          }
        }

        return {
          route: orderedStops,
          totalDistance: optimizedRoute.distance,
          totalDuration: optimizedRoute.duration,
        };
      }

      return null;
    } catch (error) {
      console.error('[OpenRouteService] Route optimization error:', error);
      return null;
    }
  }
}

// Singleton instance
export const openRouteService = new OpenRouteService();
