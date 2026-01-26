import { db } from "./db";
import { riderLocationHistory, orders, riders, deliveryRoutes, deliveryTrackingEvents } from "@shared/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import type { InsertRiderLocationHistory, InsertDeliveryRoute, InsertDeliveryTrackingEvent } from "@shared/schema";
import { geofenceService } from "./services/geofence-service";
import { wsManager } from "./services/websocket-manager";
import { mapsService } from "./integrations/maps";

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
   * Update rider's current location and check geofences for automatic status updates
   */
  async updateRiderLocation(riderId: string, location: LocationData, orderId?: string): Promise<{
    geofenceResults: any[];
    locationSaved: boolean;
  }> {
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
        lastActivityAt: new Date()
      })
      .where(eq(riders.id, riderId));

    // Check geofences for all active orders assigned to this rider
    // This triggers automatic pickup detection, arrival notifications, etc.
    const geofenceResults = await geofenceService.onRiderLocationUpdate(
      riderId,
      location.latitude,
      location.longitude,
      location.accuracy
    );

    // Broadcast rider location update via WebSocket
    wsManager.broadcastRiderLocation({
      riderId,
      lat: location.latitude,
      lng: location.longitude,
      heading: location.heading,
      speed: location.speed,
      accuracy: location.accuracy,
      orderId,
      timestamp: new Date().toISOString()
    });

    return {
      geofenceResults,
      locationSaved: true
    };
  }

  /**
   * Get rider's latest location
   */
  async getRiderLatestLocation(riderId: string) {
    const [location] = await db
      .select()
      .from(riderLocationHistory)
      .where(eq(riderLocationHistory.riderId, riderId))
      .orderBy(desc(riderLocationHistory.timestamp))
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
      .from(riderLocationHistory)
      .where(and(
        eq(riderLocationHistory.riderId, riderId),
        gte(riderLocationHistory.timestamp, since)
      ))
      .orderBy(desc(riderLocationHistory.timestamp));
  }

  /**
   * Calculate optimal route using MapsService (OpenRouteService/Google Maps fallback)
   */
  async calculateOptimalRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: Array<{ lat: number; lng: number }>
  ): Promise<OptimizedRoute | null> {
    try {
      // Use MapsService which prioritizes OpenRouteService (FREE) over Google Maps
      const route = await mapsService.calculateRoute(
        { lat: origin.lat, lng: origin.lng },
        { lat: destination.lat, lng: destination.lng }
      );

      if (!route) {
        console.error('[GPSTracking] No route found from MapsService');
        return null;
      }

      // If there are waypoints, optimize the route
      let optimizedWaypoints = waypoints;
      if (waypoints && waypoints.length > 0) {
        const optimized = await mapsService.optimizeRoute(
          { lat: origin.lat, lng: origin.lng },
          waypoints.map(w => ({ lat: w.lat, lng: w.lng }))
        );
        if (optimized) {
          optimizedWaypoints = optimized;
        }
      }

      // Build the response in the expected format
      const result: OptimizedRoute = {
        distance: route.distance / 1000, // Convert meters to kilometers
        duration: Math.ceil(route.duration / 60), // Convert seconds to minutes
        steps: [], // Basic steps - detailed steps available in OpenRouteService response
        overview_polyline: route.polyline || '',
      };

      // Add basic navigation step
      result.steps.push({
        instruction: `Head to destination (${result.distance.toFixed(1)} km)`,
        distance: result.distance,
        duration: result.duration,
        startLocation: origin,
        endLocation: destination,
      });

      console.log(`[GPSTracking] Route calculated via ${mapsService.getProviderInfo().primary}: ${result.distance.toFixed(1)}km, ${result.duration}min`);
      return result;
    } catch (error) {
      console.error('[GPSTracking] Error calculating route:', error);
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
      origin: startLocation,
      destination: endLocation,
      waypoints,
      distance: optimizedRoute?.distance.toString() || "0",
      estimatedDuration: optimizedRoute?.duration || 0,
      routePolyline: optimizedRoute?.overview_polyline,
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
        status: 'active', 
        startedAt: new Date()
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
        completedAt: new Date(),
        actualDuration
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

    const locationData = riderLocation.location as any;
    const distance = this.calculateDistance(
      parseFloat(locationData.lat),
      parseFloat(locationData.lng),
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

    const locationData = riderLocation.location as any;
    const route = await this.calculateOptimalRoute(
      { 
        lat: parseFloat(locationData.lat), 
        lng: parseFloat(locationData.lng) 
      },
      destination
    );

    return route?.duration || null;
  }
}

export const gpsTrackingService = new GPSTrackingService();