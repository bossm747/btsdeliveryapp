import { db } from "./db";
import { riderLocationHistory, orders, riders } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertRiderLocationHistory } from "@shared/schema";

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp?: Date;
}

export interface OptimizedRoute {
  distance: number; // in kilometers
  duration: number; // in minutes
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
    startLocation: { lat: number; lng: number };
    endLocation: { lat: number; lng: number };
  }>;
  overview_polyline: string;
}

export class GPSTrackingService {
  
  /**
   * Update rider's current location
   */
  async updateRiderLocation(riderId: string, location: LocationData, orderId?: string): Promise<void> {
    const locationData: InsertRiderLocationHistory = {
      riderId,
      location: {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        timestamp: (location.timestamp || new Date()).toISOString()
      },
      timestamp: location.timestamp || new Date(),
      orderId: orderId || null,
      activityType: "idle"
    };

    await db.insert(riderLocationHistory).values(locationData);
    
    // Also update rider's current location
    await db.update(riders)
      .set({
        currentLocation: {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
          timestamp: (location.timestamp || new Date()).toISOString()
        },
        lastLocationUpdate: new Date(),
        lastActivityAt: new Date()
      })
      .where(eq(riders.id, riderId));
  }

  /**
   * Get rider's latest location
   */
  async getRiderLatestLocation(riderId: string) {
    const [location] = await db
      .select()
      .from(riderLocations)
      .where(eq(riderLocations.riderId, riderId))
      .orderBy(desc(riderLocations.timestamp))
      .limit(1);

    return location;
  }

  /**
   * Get rider's location history
   */
  async getRiderLocationHistory(riderId: string, hours: number = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db
      .select()
      .from(riderLocations)
      .where(and(
        eq(riderLocations.riderId, riderId),
        // Note: You might need to adjust the timestamp comparison based on your DB setup
      ))
      .orderBy(desc(riderLocations.timestamp));
  }

  /**
   * Calculate optimal route using Google Maps Directions API
   */
  async calculateOptimalRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: Array<{ lat: number; lng: number }>
  ): Promise<OptimizedRoute | null> {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return null;
    }

    try {
      const waypointsParam = waypoints ? 
        `&waypoints=optimize:true|${waypoints.map(w => `${w.lat},${w.lng}`).join('|')}` : '';
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.lat},${origin.lng}&` +
        `destination=${destination.lat},${destination.lng}${waypointsParam}&` +
        `mode=driving&` +
        `traffic_model=best_guess&` +
        `departure_time=now&` +
        `key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        return {
          distance: leg.distance.value / 1000, // Convert to kilometers
          duration: Math.ceil(leg.duration.value / 60), // Convert to minutes
          steps: leg.steps.map((step: any) => ({
            instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
            distance: step.distance.value / 1000,
            duration: Math.ceil(step.duration.value / 60),
            startLocation: step.start_location,
            endLocation: step.end_location,
          })),
          overview_polyline: route.overview_polyline.points,
        };
      }

      return null;
    } catch (error) {
      console.error('Error calculating route:', error);
      return null;
    }
  }

  /**
   * Create a delivery route with optimization
   */
  async createDeliveryRoute(
    riderId: string,
    orderId: string,
    startLocation: { lat: number; lng: number; address: string },
    endLocation: { lat: number; lng: number; address: string },
    waypoints?: Array<{ lat: number; lng: number; address: string }>
  ) {
    // Calculate optimal route
    const optimizedRoute = await this.calculateOptimalRoute(
      { lat: startLocation.lat, lng: startLocation.lng },
      { lat: endLocation.lat, lng: endLocation.lng },
      waypoints?.map(w => ({ lat: w.lat, lng: w.lng }))
    );

    const routeData: InsertDeliveryRoute = {
      riderId,
      orderId,
      startLocation,
      endLocation,
      waypoints,
      optimizedRoute,
      estimatedDistance: optimizedRoute?.distance.toString(),
      estimatedDuration: optimizedRoute?.duration,
      status: 'planned',
    };

    const [route] = await db.insert(deliveryRoutes).values(routeData).returning();
    return route;
  }

  /**
   * Start delivery route
   */
  async startDeliveryRoute(routeId: string) {
    await db
      .update(deliveryRoutes)
      .set({ 
        status: 'in_progress', 
        startTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(deliveryRoutes.id, routeId));
  }

  /**
   * Complete delivery route
   */
  async completeDeliveryRoute(
    routeId: string, 
    actualDistance?: number, 
    actualDuration?: number
  ) {
    await db
      .update(deliveryRoutes)
      .set({ 
        status: 'completed',
        endTime: new Date(),
        actualDistance: actualDistance?.toString(),
        actualDuration,
        updatedAt: new Date()
      })
      .where(eq(deliveryRoutes.id, routeId));
  }

  /**
   * Add delivery tracking event
   */
  async addTrackingEvent(
    orderId: string,
    riderId: string,
    eventType: 'order_picked_up' | 'en_route' | 'nearby' | 'delivered',
    location?: { lat: number; lng: number; address?: string },
    notes?: string
  ) {
    const eventData: InsertDeliveryTrackingEvent = {
      orderId,
      riderId,
      eventType,
      location,
      notes,
    };

    const [event] = await db.insert(deliveryTrackingEvents).values(eventData).returning();
    return event;
  }

  /**
   * Get delivery tracking events for an order
   */
  async getOrderTrackingEvents(orderId: string) {
    return await db
      .select()
      .from(deliveryTrackingEvents)
      .where(eq(deliveryTrackingEvents.orderId, orderId))
      .orderBy(desc(deliveryTrackingEvents.timestamp));
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Check if rider is near delivery location (within 500 meters)
   */
  async isRiderNearDelivery(riderId: string, deliveryLocation: { lat: number; lng: number }): Promise<boolean> {
    const riderLocation = await this.getRiderLatestLocation(riderId);
    if (!riderLocation) return false;

    const distance = this.calculateDistance(
      parseFloat(riderLocation.latitude),
      parseFloat(riderLocation.longitude),
      deliveryLocation.lat,
      deliveryLocation.lng
    );

    return distance <= 0.5; // Within 500 meters
  }

  /**
   * Get estimated time of arrival
   */
  async getEstimatedArrival(riderId: string, destination: { lat: number; lng: number }): Promise<number | null> {
    const riderLocation = await this.getRiderLatestLocation(riderId);
    if (!riderLocation) return null;

    const route = await this.calculateOptimalRoute(
      { 
        lat: parseFloat(riderLocation.latitude), 
        lng: parseFloat(riderLocation.longitude) 
      },
      destination
    );

    return route?.duration || null;
  }
}

export const gpsTrackingService = new GPSTrackingService();