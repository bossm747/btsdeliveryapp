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
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn("Google Maps API key not configured, using mock data");
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<Location | null> {
    if (!this.apiKey) {
      // Mock data for Batangas locations
      const mockLocations: { [key: string]: Location } = {
        "batangas city": { lat: 13.7565, lng: 121.0583, address: "Batangas City, Batangas" },
        "lipa": { lat: 13.9411, lng: 121.1625, address: "Lipa City, Batangas" },
        "tanauan": { lat: 14.0822, lng: 121.1497, address: "Tanauan City, Batangas" },
        "sto. tomas": { lat: 14.1079, lng: 121.1413, address: "Santo Tomas, Batangas" },
        "rosario": { lat: 13.8456, lng: 121.2075, address: "Rosario, Batangas" },
        "san juan": { lat: 13.8214, lng: 121.3953, address: "San Juan, Batangas" },
        "nasugbu": { lat: 14.0667, lng: 120.6333, address: "Nasugbu, Batangas" },
        "lemery": { lat: 13.9167, lng: 120.8833, address: "Lemery, Batangas" },
        "taal": { lat: 13.8817, lng: 120.9217, address: "Taal, Batangas" },
        "balayan": { lat: 13.9367, lng: 120.7322, address: "Balayan, Batangas" },
      };

      const searchKey = address.toLowerCase();
      for (const [key, location] of Object.entries(mockLocations)) {
        if (searchKey.includes(key)) {
          return location;
        }
      }

      // Default to Batangas City center
      return { lat: 13.7565, lng: 121.0583, address: "Batangas City, Batangas" };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)},Batangas,Philippines&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
        };
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    if (!this.apiKey) {
      // Mock reverse geocoding for development
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}, Batangas, Philippines`;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }

      return null;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return null;
    }
  }

  // Calculate distance and duration between two points
  async calculateRoute(origin: Location, destination: Location): Promise<RouteInfo | null> {
    if (!this.apiKey) {
      // Mock calculation based on straight-line distance
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
      const duration = distance / 10; // Assume 10 m/s average speed (36 km/h)

      return {
        distance: Math.round(distance),
        duration: Math.round(duration),
      };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        return {
          distance: leg.distance.value,
          duration: leg.duration.value,
          polyline: route.overview_polyline.points,
        };
      }

      return null;
    } catch (error) {
      console.error("Route calculation error:", error);
      return null;
    }
  }

  // Get distance matrix for multiple destinations
  async getDistanceMatrix(
    origin: Location,
    destinations: Location[]
  ): Promise<RouteInfo[] | null> {
    if (!this.apiKey) {
      // Mock distance matrix
      const results: RouteInfo[] = [];
      for (const dest of destinations) {
        const route = await this.calculateRoute(origin, dest);
        if (route) {
          results.push(route);
        }
      }
      return results;
    }

    try {
      const origins = `${origin.lat},${origin.lng}`;
      const dests = destinations.map(d => `${d.lat},${d.lng}`).join('|');
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${dests}&mode=driving&key=${this.apiKey}`;
      
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
        return results;
      }

      return null;
    } catch (error) {
      console.error("Distance matrix error:", error);
      return null;
    }
  }

  // Find nearby places (restaurants, stores, etc.)
  async findNearbyPlaces(
    location: Location,
    type: string,
    radius: number = 5000
  ): Promise<any[] | null> {
    if (!this.apiKey) {
      // Mock nearby places for development
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

    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        return data.results;
      }

      return null;
    } catch (error) {
      console.error("Nearby search error:", error);
      return null;
    }
  }

  // Calculate delivery fee based on distance
  calculateDeliveryFee(distanceInMeters: number): number {
    const distanceInKm = distanceInMeters / 1000;
    const baseFee = 49; // Base fee in PHP
    const perKmRate = 10; // PHP per kilometer after first 2km

    if (distanceInKm <= 2) {
      return baseFee;
    }

    const additionalKm = distanceInKm - 2;
    const additionalFee = Math.ceil(additionalKm) * perKmRate;
    
    return baseFee + additionalFee;
  }

  // Estimate delivery time based on distance and current traffic
  estimateDeliveryTime(distanceInMeters: number, preparationTime: number = 15): number {
    const distanceInKm = distanceInMeters / 1000;
    const averageSpeedKmh = 30; // Average speed in city traffic
    const travelTimeMinutes = (distanceInKm / averageSpeedKmh) * 60;
    
    return Math.ceil(preparationTime + travelTimeMinutes);
  }

  // Check if location is within delivery zone
  isWithinDeliveryZone(location: Location, restaurantLocation: Location, maxRadiusKm: number = 15): boolean {
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

  // Get optimized route for multiple stops (for batch deliveries)
  async optimizeRoute(origin: Location, destinations: Location[]): Promise<Location[] | null> {
    if (destinations.length <= 1) {
      return destinations;
    }

    // Simple nearest neighbor algorithm for route optimization
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
}

export const mapsService = new MapsService();