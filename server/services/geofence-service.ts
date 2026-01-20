/**
 * Geofence Service
 *
 * Handles automatic geofence-based pickup and delivery detection.
 * Auto-detects when rider arrives at restaurant or customer location
 * and triggers appropriate notifications and status updates.
 */

import { db } from "../db";
import { orders, riders, restaurants, deliveryTrackingEvents, riderLocationHistory } from "@shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { mapsService } from "../integrations/maps";
import { wsManager } from "./websocket-manager";
import { storage } from "../storage";

// ============= GEOFENCE CONFIGURATION =============

export const GEOFENCE_RADIUS = {
  RESTAURANT_ARRIVAL: 50,    // 50 meters - rider arrived at restaurant
  CUSTOMER_ARRIVAL: 100,     // 100 meters - rider arrived at customer
  RESTAURANT_NEARBY: 200,    // 200 meters - rider approaching restaurant
  CUSTOMER_NEARBY: 500,      // 500 meters - rider approaching customer
  SERVICE_AREA: 100000,      // 100 km - service area radius (covers all of Batangas Province)
};

// Batangas Province boundaries (covers entire province)
export const BATANGAS_PROVINCE_BOUNDS = {
  north: 14.15,   // Northern boundary (near Tanauan/Calamba border)
  south: 13.45,   // Southern boundary (Calatagan/Nasugbu area)
  east: 121.45,   // Eastern boundary (inland toward Quezon)
  west: 120.50,   // Western boundary (Nasugbu coast)
  // Province center for reference
  center: {
    lat: 13.7565,
    lng: 121.0583,
    name: 'Batangas City'
  }
};

// Delivery zone configuration based on distance from restaurant
export const DELIVERY_ZONES = {
  zone1: { maxDistanceKm: 5, fee: 49, estimatedMinutes: { min: 15, max: 25 }, name: 'Nearby' },
  zone2: { maxDistanceKm: 10, fee: 69, estimatedMinutes: { min: 25, max: 40 }, name: 'Inner' },
  zone3: { maxDistanceKm: 20, fee: 89, estimatedMinutes: { min: 40, max: 60 }, name: 'Outer' },
  zone4: { maxDistanceKm: 50, fee: 119, estimatedMinutes: { min: 60, max: 90 }, name: 'Extended' },
  zone5: { maxDistanceKm: 100, fee: 149, estimatedMinutes: { min: 90, max: 120 }, name: 'Province-wide' },
};

// Minimum time between same event triggers (to prevent spam)
const EVENT_COOLDOWN_MS = 60000; // 1 minute

// ============= TYPE DEFINITIONS =============

export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeofenceEvent {
  type: 'rider_at_restaurant' | 'rider_at_customer' | 'rider_nearby_restaurant' | 'rider_nearby_customer';
  orderId: string;
  riderId: string;
  distance: number;
  timestamp: Date;
}

export interface GeofenceCheckResult {
  isInRestaurantZone: boolean;
  isInCustomerZone: boolean;
  isNearbyRestaurant: boolean;
  isNearbyCustomer: boolean;
  distanceToRestaurant: number | null;
  distanceToCustomer: number | null;
  statusUpdated: boolean;
  newStatus?: string;
  events: GeofenceEvent[];
  message: string;
}

export interface OrderLocations {
  restaurantLocation: { lat: number; lng: number } | null;
  customerLocation: { lat: number; lng: number } | null;
  restaurantName?: string;
  customerAddress?: string;
}

interface GeofenceEventRecord {
  orderId: string;
  eventType: string;
  timestamp: number;
}

// ============= GEOFENCE SERVICE CLASS =============

class GeofenceService {
  // Track recent events to prevent duplicate triggers
  private recentEvents: Map<string, GeofenceEventRecord> = new Map();

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in meters
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if a location is within a geofence radius
   */
  checkGeofence(
    riderLat: number,
    riderLng: number,
    targetLat: number,
    targetLng: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(riderLat, riderLng, targetLat, targetLng);
    return distance <= radiusMeters;
  }

  /**
   * Get restaurant location by ID
   * Attempts to extract coordinates from restaurant address or geocode it
   */
  async getRestaurantLocation(restaurantId: string): Promise<{ lat: number; lng: number; name: string } | null> {
    try {
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) return null;

      const address = restaurant.address as any;

      // Check if address has coordinates stored
      if (address?.coordinates?.lat && address?.coordinates?.lng) {
        return {
          lat: parseFloat(address.coordinates.lat),
          lng: parseFloat(address.coordinates.lng),
          name: restaurant.name
        };
      }

      // Try to geocode the restaurant address
      const addressString = [
        address?.street,
        address?.barangay,
        address?.city || 'Batangas City',
        address?.province || 'Batangas'
      ].filter(Boolean).join(', ');

      const geocoded = await mapsService.geocodeAddress(addressString);
      if (geocoded) {
        return {
          lat: geocoded.lat,
          lng: geocoded.lng,
          name: restaurant.name
        };
      }

      // Fallback to Batangas City center with restaurant name
      console.log(`[GeofenceService] Could not geocode restaurant ${restaurant.name}, using default location`);
      return {
        lat: 13.7565,
        lng: 121.0583,
        name: restaurant.name
      };
    } catch (error) {
      console.error('[GeofenceService] Error getting restaurant location:', error);
      return null;
    }
  }

  /**
   * Get order locations (restaurant pickup and customer delivery)
   */
  async getOrderLocations(orderId: string): Promise<OrderLocations> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (!order) {
        return { restaurantLocation: null, customerLocation: null };
      }

      // Get restaurant location
      let restaurantLocation: { lat: number; lng: number } | null = null;
      let restaurantName: string | undefined;

      if (order.restaurantId) {
        const restaurantData = await this.getRestaurantLocation(order.restaurantId);
        if (restaurantData) {
          restaurantLocation = { lat: restaurantData.lat, lng: restaurantData.lng };
          restaurantName = restaurantData.name;
        }
      }

      // Get customer delivery location
      let customerLocation: { lat: number; lng: number } | null = null;
      let customerAddress: string | undefined;

      const deliveryAddress = order.deliveryAddress as any;

      if (deliveryAddress?.coordinates?.lat && deliveryAddress?.coordinates?.lng) {
        customerLocation = {
          lat: parseFloat(deliveryAddress.coordinates.lat),
          lng: parseFloat(deliveryAddress.coordinates.lng)
        };
        customerAddress = deliveryAddress.street || deliveryAddress.fullAddress;
      } else if (deliveryAddress) {
        // Try to geocode the delivery address
        const addressString = [
          deliveryAddress.street,
          deliveryAddress.barangay,
          deliveryAddress.city,
          deliveryAddress.province || 'Batangas'
        ].filter(Boolean).join(', ');

        const geocoded = await mapsService.geocodeAddress(addressString);
        if (geocoded) {
          customerLocation = { lat: geocoded.lat, lng: geocoded.lng };
          customerAddress = addressString;
        }
      }

      return {
        restaurantLocation,
        customerLocation,
        restaurantName,
        customerAddress
      };
    } catch (error) {
      console.error('[GeofenceService] Error getting order locations:', error);
      return { restaurantLocation: null, customerLocation: null };
    }
  }

  /**
   * Check if an event was recently triggered (within cooldown period)
   */
  private wasRecentlyTriggered(orderId: string, eventType: string): boolean {
    const key = `${orderId}:${eventType}`;
    const record = this.recentEvents.get(key);

    if (!record) return false;

    const elapsed = Date.now() - record.timestamp;
    return elapsed < EVENT_COOLDOWN_MS;
  }

  /**
   * Record that an event was triggered
   */
  private recordEventTrigger(orderId: string, eventType: string): void {
    const key = `${orderId}:${eventType}`;
    this.recentEvents.set(key, {
      orderId,
      eventType,
      timestamp: Date.now()
    });

    // Clean up old records periodically
    if (this.recentEvents.size > 1000) {
      const now = Date.now();
      const keysToDelete: string[] = [];
      this.recentEvents.forEach((v, k) => {
        if (now - v.timestamp > EVENT_COOLDOWN_MS * 2) {
          keysToDelete.push(k);
        }
      });
      keysToDelete.forEach(k => this.recentEvents.delete(k));
    }
  }

  /**
   * Called when a rider's location updates
   * Checks all active orders assigned to the rider for geofence events
   */
  async onRiderLocationUpdate(
    riderId: string,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): Promise<GeofenceCheckResult[]> {
    const results: GeofenceCheckResult[] = [];

    try {
      // Get rider profile to find userId
      const rider = await storage.getRider(riderId);
      if (!rider) {
        console.log(`[GeofenceService] Rider ${riderId} not found`);
        return results;
      }

      // Get all active orders assigned to this rider
      const activeStatuses = ['confirmed', 'preparing', 'ready', 'picked_up', 'in_transit'];
      const activeOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.riderId, rider.userId),
            inArray(orders.status, activeStatuses)
          )
        );

      // Check each order for geofence events
      for (const order of activeOrders) {
        const result = await this.checkOrderGeofence(
          riderId,
          order.id,
          { latitude, longitude, accuracy },
          order
        );
        results.push(result);
      }

      // Update rider's current location
      await db.update(riders)
        .set({
          currentLocation: {
            lat: latitude,
            lng: longitude,
            accuracy,
            timestamp: new Date().toISOString()
          },
          lastActivityAt: new Date()
        })
        .where(eq(riders.id, riderId));

    } catch (error) {
      console.error('[GeofenceService] Error in onRiderLocationUpdate:', error);
    }

    return results;
  }

  /**
   * Check geofence for a specific order
   */
  async checkOrderGeofence(
    riderId: string,
    orderId: string,
    location: GeofenceLocation,
    order?: any
  ): Promise<GeofenceCheckResult> {
    const result: GeofenceCheckResult = {
      isInRestaurantZone: false,
      isInCustomerZone: false,
      isNearbyRestaurant: false,
      isNearbyCustomer: false,
      distanceToRestaurant: null,
      distanceToCustomer: null,
      statusUpdated: false,
      events: [],
      message: ''
    };

    try {
      // Get order if not provided
      if (!order) {
        const [fetchedOrder] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);
        order = fetchedOrder;
      }

      if (!order) {
        result.message = 'Order not found';
        return result;
      }

      // Get order locations
      const { restaurantLocation, customerLocation, restaurantName, customerAddress } =
        await this.getOrderLocations(orderId);

      const currentStatus = order.status;

      // ============= RESTAURANT GEOFENCE CHECK =============
      if (restaurantLocation) {
        result.distanceToRestaurant = this.calculateDistance(
          location.latitude,
          location.longitude,
          restaurantLocation.lat,
          restaurantLocation.lng
        );

        result.isInRestaurantZone = result.distanceToRestaurant <= GEOFENCE_RADIUS.RESTAURANT_ARRIVAL;
        result.isNearbyRestaurant = result.distanceToRestaurant <= GEOFENCE_RADIUS.RESTAURANT_NEARBY;

        // Rider arrived at restaurant for pickup
        if (result.isInRestaurantZone && ['confirmed', 'preparing', 'ready'].includes(currentStatus)) {
          if (!this.wasRecentlyTriggered(orderId, 'rider_at_restaurant')) {
            this.recordEventTrigger(orderId, 'rider_at_restaurant');

            // Create geofence event
            const event: GeofenceEvent = {
              type: 'rider_at_restaurant',
              orderId,
              riderId,
              distance: result.distanceToRestaurant,
              timestamp: new Date()
            };
            result.events.push(event);

            // Update order status to indicate rider arrived
            await db.update(orders)
              .set({
                riderArrivedAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(orders.id, orderId));

            // Add tracking event
            await this.addTrackingEvent(orderId, riderId, 'rider_at_restaurant', {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy
            });

            // Notify vendor that rider has arrived
            await this.notifyVendorRiderArrived(order, restaurantName);

            // Notify rider they've arrived
            await this.notifyRiderAtRestaurant(riderId, orderId, restaurantName);

            result.message = `Rider arrived at ${restaurantName || 'restaurant'}`;
            console.log(`[GeofenceService] ${result.message} for order ${order.orderNumber}`);
          }
        }
        // Rider approaching restaurant
        else if (result.isNearbyRestaurant && !result.isInRestaurantZone &&
                 ['confirmed', 'preparing', 'ready'].includes(currentStatus)) {
          if (!this.wasRecentlyTriggered(orderId, 'rider_nearby_restaurant')) {
            this.recordEventTrigger(orderId, 'rider_nearby_restaurant');

            const event: GeofenceEvent = {
              type: 'rider_nearby_restaurant',
              orderId,
              riderId,
              distance: result.distanceToRestaurant,
              timestamp: new Date()
            };
            result.events.push(event);

            // Notify vendor that rider is approaching
            await this.notifyVendorRiderApproaching(order, result.distanceToRestaurant, restaurantName);
          }
        }
      }

      // ============= CUSTOMER GEOFENCE CHECK =============
      if (customerLocation) {
        result.distanceToCustomer = this.calculateDistance(
          location.latitude,
          location.longitude,
          customerLocation.lat,
          customerLocation.lng
        );

        result.isInCustomerZone = result.distanceToCustomer <= GEOFENCE_RADIUS.CUSTOMER_ARRIVAL;
        result.isNearbyCustomer = result.distanceToCustomer <= GEOFENCE_RADIUS.CUSTOMER_NEARBY;

        // Rider arrived at customer location
        if (result.isInCustomerZone && ['picked_up', 'in_transit'].includes(currentStatus)) {
          if (!this.wasRecentlyTriggered(orderId, 'rider_at_customer')) {
            this.recordEventTrigger(orderId, 'rider_at_customer');

            const event: GeofenceEvent = {
              type: 'rider_at_customer',
              orderId,
              riderId,
              distance: result.distanceToCustomer,
              timestamp: new Date()
            };
            result.events.push(event);

            // Update order status to 'arrived' (ready for delivery)
            await db.update(orders)
              .set({
                status: 'arrived',
                previousStatus: currentStatus,
                updatedAt: new Date()
              })
              .where(eq(orders.id, orderId));

            result.statusUpdated = true;
            result.newStatus = 'arrived';

            // Add tracking event
            await this.addTrackingEvent(orderId, riderId, 'rider_at_customer', {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy
            });

            // Notify customer that rider has arrived
            await this.notifyCustomerRiderArrived(order, customerAddress);

            // Notify rider they've arrived at customer
            await this.notifyRiderAtCustomer(riderId, orderId, customerAddress);

            // Broadcast order status update
            wsManager.broadcastOrderStatusUpdate({
              orderId,
              status: 'arrived',
              previousStatus: currentStatus,
              message: 'Rider has arrived at delivery location',
              timestamp: new Date().toISOString()
            });

            result.message = 'Rider arrived at customer location';
            console.log(`[GeofenceService] ${result.message} for order ${order.orderNumber}`);
          }
        }
        // Rider approaching customer
        else if (result.isNearbyCustomer && !result.isInCustomerZone &&
                 ['picked_up', 'in_transit'].includes(currentStatus)) {
          if (!this.wasRecentlyTriggered(orderId, 'rider_nearby_customer')) {
            this.recordEventTrigger(orderId, 'rider_nearby_customer');

            const event: GeofenceEvent = {
              type: 'rider_nearby_customer',
              orderId,
              riderId,
              distance: result.distanceToCustomer,
              timestamp: new Date()
            };
            result.events.push(event);

            // Add tracking event for nearby
            await this.addTrackingEvent(orderId, riderId, 'nearby', {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy
            });

            // Notify customer that rider is approaching
            await this.notifyCustomerRiderApproaching(order, result.distanceToCustomer);

            result.message = `Rider is ${Math.round(result.distanceToCustomer)}m away`;
          }
        }
      }

      if (!result.message) {
        result.message = 'Location updated';
      }

    } catch (error) {
      console.error('[GeofenceService] Error in checkOrderGeofence:', error);
      result.message = 'Error checking geofence';
    }

    return result;
  }

  // ============= NOTIFICATION METHODS =============

  /**
   * Notify vendor that rider has arrived at restaurant
   */
  private async notifyVendorRiderArrived(order: any, restaurantName?: string): Promise<void> {
    try {
      // Get vendor/restaurant details
      const restaurant = order.restaurantId ? await storage.getRestaurant(order.restaurantId) : null;

      // Send vendor alert via WebSocket
      wsManager.broadcastVendorAlert({
        type: 'rider_assigned', // Using existing type that vendors listen to
        orderId: order.id,
        orderNumber: order.orderNumber,
        vendorId: order.restaurantId,
        data: {
          event: 'rider_arrived',
          message: 'Rider has arrived for pickup',
          orderNumber: order.orderNumber,
          arrivalTime: new Date().toISOString()
        },
        urgency: 'high',
        timestamp: new Date().toISOString()
      });

      // Also broadcast to the order channel
      wsManager.broadcastToChannel(`order:${order.id}`, {
        type: 'geofence_event',
        event: 'rider_at_restaurant',
        orderId: order.id,
        message: `Rider has arrived at ${restaurantName || 'restaurant'}`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[GeofenceService] Error notifying vendor of rider arrival:', error);
    }
  }

  /**
   * Notify vendor that rider is approaching restaurant
   */
  private async notifyVendorRiderApproaching(order: any, distance: number, restaurantName?: string): Promise<void> {
    try {
      wsManager.broadcastVendorAlert({
        type: 'rider_assigned',
        orderId: order.id,
        orderNumber: order.orderNumber,
        vendorId: order.restaurantId,
        data: {
          event: 'rider_approaching',
          message: `Rider is ${Math.round(distance)}m away`,
          orderNumber: order.orderNumber,
          distance: Math.round(distance)
        },
        urgency: 'medium',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[GeofenceService] Error notifying vendor of rider approaching:', error);
    }
  }

  /**
   * Notify customer that rider has arrived
   */
  private async notifyCustomerRiderArrived(order: any, customerAddress?: string): Promise<void> {
    try {
      // Broadcast to customer via order channel
      wsManager.broadcastToChannel(`order:${order.id}`, {
        type: 'geofence_event',
        event: 'rider_at_customer',
        orderId: order.id,
        message: 'Your rider has arrived!',
        timestamp: new Date().toISOString()
      });

      // Send to customer directly if they're connected
      if (order.customerId) {
        wsManager.broadcastToUser(order.customerId, {
          type: 'delivery_notification',
          event: 'rider_arrived',
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: 'Your rider has arrived at your location!',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('[GeofenceService] Error notifying customer of rider arrival:', error);
    }
  }

  /**
   * Notify customer that rider is approaching
   */
  private async notifyCustomerRiderApproaching(order: any, distance: number): Promise<void> {
    try {
      const distanceDisplay = distance < 1000
        ? `${Math.round(distance)}m`
        : `${(distance / 1000).toFixed(1)}km`;

      // Broadcast to order channel
      wsManager.broadcastToChannel(`order:${order.id}`, {
        type: 'geofence_event',
        event: 'rider_nearby_customer',
        orderId: order.id,
        message: `Rider is ${distanceDisplay} away`,
        distance: Math.round(distance),
        timestamp: new Date().toISOString()
      });

      // Update ETA
      const etaMinutes = Math.max(1, Math.ceil(distance / 500)); // Rough estimate: 500m per minute
      wsManager.broadcastETAUpdate(
        order.id,
        new Date(Date.now() + etaMinutes * 60000).toISOString(),
        etaMinutes
      );

      // Send to customer directly
      if (order.customerId) {
        wsManager.broadcastToUser(order.customerId, {
          type: 'delivery_notification',
          event: 'rider_approaching',
          orderId: order.id,
          orderNumber: order.orderNumber,
          message: `Your rider is ${distanceDisplay} away and will arrive soon!`,
          distance: Math.round(distance),
          estimatedMinutes: etaMinutes,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('[GeofenceService] Error notifying customer of rider approaching:', error);
    }
  }

  /**
   * Notify rider that they've arrived at restaurant
   */
  private async notifyRiderAtRestaurant(riderId: string, orderId: string, restaurantName?: string): Promise<void> {
    try {
      wsManager.broadcastToChannel(`rider:${riderId}`, {
        type: 'geofence_notification',
        event: 'arrived_at_restaurant',
        orderId,
        message: `You've arrived at ${restaurantName || 'the restaurant'}. Please pick up the order.`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[GeofenceService] Error notifying rider of restaurant arrival:', error);
    }
  }

  /**
   * Notify rider that they've arrived at customer location
   */
  private async notifyRiderAtCustomer(riderId: string, orderId: string, customerAddress?: string): Promise<void> {
    try {
      wsManager.broadcastToChannel(`rider:${riderId}`, {
        type: 'geofence_notification',
        event: 'arrived_at_customer',
        orderId,
        message: `You've arrived at the delivery location. Please complete the delivery.`,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[GeofenceService] Error notifying rider of customer arrival:', error);
    }
  }

  // ============= UTILITY METHODS =============

  /**
   * Add a delivery tracking event to the database
   */
  async addTrackingEvent(
    orderId: string,
    riderId: string,
    eventType: string,
    location: { lat: number; lng: number; accuracy?: number }
  ): Promise<void> {
    try {
      await db.insert(deliveryTrackingEvents).values({
        orderId,
        riderId,
        eventType,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        },
        timestamp: new Date()
      });

      // Also broadcast as a tracking event
      wsManager.broadcastTrackingEvent(orderId, {
        eventType,
        location,
        riderId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[GeofenceService] Error adding tracking event:', error);
    }
  }

  /**
   * Check if a location is within Batangas Province boundaries
   * Uses bounding box check for the entire province
   */
  isWithinProvinceBounds(latitude: number, longitude: number): boolean {
    return (
      latitude >= BATANGAS_PROVINCE_BOUNDS.south &&
      latitude <= BATANGAS_PROVINCE_BOUNDS.north &&
      longitude >= BATANGAS_PROVINCE_BOUNDS.west &&
      longitude <= BATANGAS_PROVINCE_BOUNDS.east
    );
  }

  /**
   * Check if a location is within the service area
   * Now checks if location is within Batangas Province bounds
   */
  async isWithinServiceArea(
    latitude: number,
    longitude: number,
    centerLat?: number,
    centerLng?: number,
    radiusMeters?: number
  ): Promise<boolean> {
    // First check if within province bounds (primary check)
    if (this.isWithinProvinceBounds(latitude, longitude)) {
      return true;
    }

    // Fallback: check distance from center (for edge cases near borders)
    const refLat = centerLat ?? BATANGAS_PROVINCE_BOUNDS.center.lat;
    const refLng = centerLng ?? BATANGAS_PROVINCE_BOUNDS.center.lng;
    const radius = radiusMeters ?? GEOFENCE_RADIUS.SERVICE_AREA;

    const distance = this.calculateDistance(latitude, longitude, refLat, refLng);
    return distance <= radius;
  }

  /**
   * Get delivery zone and fee based on distance from restaurant
   */
  getDeliveryZone(distanceKm: number): { zone: string; fee: number; estimatedMinutes: { min: number; max: number }; name: string } | null {
    if (distanceKm <= DELIVERY_ZONES.zone1.maxDistanceKm) {
      return { zone: 'zone1', ...DELIVERY_ZONES.zone1 };
    } else if (distanceKm <= DELIVERY_ZONES.zone2.maxDistanceKm) {
      return { zone: 'zone2', ...DELIVERY_ZONES.zone2 };
    } else if (distanceKm <= DELIVERY_ZONES.zone3.maxDistanceKm) {
      return { zone: 'zone3', ...DELIVERY_ZONES.zone3 };
    } else if (distanceKm <= DELIVERY_ZONES.zone4.maxDistanceKm) {
      return { zone: 'zone4', ...DELIVERY_ZONES.zone4 };
    } else if (distanceKm <= DELIVERY_ZONES.zone5.maxDistanceKm) {
      return { zone: 'zone5', ...DELIVERY_ZONES.zone5 };
    }
    return null; // Outside all delivery zones
  }

  /**
   * Get nearby orders waiting for pickup (for rider assignment)
   */
  async getNearbyOrders(
    riderId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<any[]> {
    try {
      // Get all ready orders that need riders
      const pendingOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.status, 'ready'));

      // Filter orders by distance to restaurant
      const nearbyOrders = [];
      for (const order of pendingOrders) {
        const { restaurantLocation, restaurantName } = await this.getOrderLocations(order.id);
        if (restaurantLocation) {
          const distance = this.calculateDistance(
            latitude,
            longitude,
            restaurantLocation.lat,
            restaurantLocation.lng
          );
          if (distance <= radiusKm * 1000) {
            nearbyOrders.push({
              ...order,
              distanceToPickup: distance,
              restaurantLocation,
              restaurantName
            });
          }
        }
      }

      // Sort by distance
      nearbyOrders.sort((a, b) => a.distanceToPickup - b.distanceToPickup);

      return nearbyOrders;
    } catch (error) {
      console.error('[GeofenceService] Error getting nearby orders:', error);
      return [];
    }
  }

  /**
   * Get distance to order locations for a specific rider
   */
  async getDistancesToOrder(
    riderId: string,
    orderId: string
  ): Promise<{ toRestaurant: number | null; toCustomer: number | null }> {
    try {
      const rider = await storage.getRider(riderId);
      if (!rider?.currentLocation) {
        return { toRestaurant: null, toCustomer: null };
      }

      const currentLocation = rider.currentLocation as any;
      const riderLat = parseFloat(currentLocation.lat);
      const riderLng = parseFloat(currentLocation.lng);

      const { restaurantLocation, customerLocation } = await this.getOrderLocations(orderId);

      return {
        toRestaurant: restaurantLocation
          ? this.calculateDistance(riderLat, riderLng, restaurantLocation.lat, restaurantLocation.lng)
          : null,
        toCustomer: customerLocation
          ? this.calculateDistance(riderLat, riderLng, customerLocation.lat, customerLocation.lng)
          : null
      };
    } catch (error) {
      console.error('[GeofenceService] Error getting distances to order:', error);
      return { toRestaurant: null, toCustomer: null };
    }
  }
}

// Export singleton instance
export const geofenceService = new GeofenceService();
