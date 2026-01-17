/**
 * Geofence Service
 * Handles geofence-based auto-confirmation for pickup and delivery zones
 */

import { db } from "../db";
import { orders, riders, deliveryTrackingEvents, riderLocationHistory } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { mapsService } from "../integrations/maps";
import { wsManager } from "../services/websocket-manager";

// Geofence radius constants (in meters)
export const GEOFENCE_RADIUS = {
  PICKUP: 50,      // 50 meters for pickup zone (restaurant)
  DELIVERY: 100,   // 100 meters for delivery zone (customer)
  NEARBY: 500,     // 500 meters for "nearby" notification
};

export interface GeofenceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeofenceCheckResult {
  isInPickupZone: boolean;
  isInDeliveryZone: boolean;
  isNearbyPickup: boolean;
  isNearbyDelivery: boolean;
  distanceToPickup: number | null;
  distanceToDelivery: number | null;
  statusUpdated: boolean;
  newStatus?: string;
  message: string;
}

export interface OrderLocations {
  pickupLocation: { lat: number; lng: number } | null;
  deliveryLocation: { lat: number; lng: number } | null;
}

class GeofenceService {
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
  isWithinGeofence(
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
   * Get order locations (pickup from restaurant, delivery from customer address)
   */
  async getOrderLocations(orderId: string): Promise<OrderLocations> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return { pickupLocation: null, deliveryLocation: null };
    }

    // Get restaurant location (pickup point)
    let pickupLocation: { lat: number; lng: number } | null = null;
    if (order.restaurantId) {
      // Note: In a real app, you would query the restaurant's coordinates
      // For now, we'll use a mock location or the delivery address coordinates
      // This would be stored in the restaurants table
      pickupLocation = { lat: 13.7565, lng: 121.0583 }; // Default to Batangas City center
    }

    // Get delivery location from order
    let deliveryLocation: { lat: number; lng: number } | null = null;
    const deliveryAddress = order.deliveryAddress as any;
    if (deliveryAddress?.coordinates) {
      deliveryLocation = {
        lat: deliveryAddress.coordinates.lat,
        lng: deliveryAddress.coordinates.lng
      };
    } else if (deliveryAddress) {
      // Try to geocode the address
      const addressString = [
        deliveryAddress.street,
        deliveryAddress.barangay,
        deliveryAddress.city,
        deliveryAddress.province || 'Batangas'
      ].filter(Boolean).join(', ');

      const geocoded = await mapsService.geocodeAddress(addressString);
      if (geocoded) {
        deliveryLocation = { lat: geocoded.lat, lng: geocoded.lng };
      }
    }

    return { pickupLocation, deliveryLocation };
  }

  /**
   * Main geofence check - updates order status based on rider location
   */
  async checkGeofence(
    riderId: string,
    orderId: string,
    location: GeofenceLocation
  ): Promise<GeofenceCheckResult> {
    const result: GeofenceCheckResult = {
      isInPickupZone: false,
      isInDeliveryZone: false,
      isNearbyPickup: false,
      isNearbyDelivery: false,
      distanceToPickup: null,
      distanceToDelivery: null,
      statusUpdated: false,
      message: ''
    };

    // Get order details
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      result.message = 'Order not found';
      return result;
    }

    // Get order locations
    const { pickupLocation, deliveryLocation } = await this.getOrderLocations(orderId);

    // Calculate distances
    if (pickupLocation) {
      result.distanceToPickup = this.calculateDistance(
        location.latitude,
        location.longitude,
        pickupLocation.lat,
        pickupLocation.lng
      );

      result.isInPickupZone = result.distanceToPickup <= GEOFENCE_RADIUS.PICKUP;
      result.isNearbyPickup = result.distanceToPickup <= GEOFENCE_RADIUS.NEARBY;
    }

    if (deliveryLocation) {
      result.distanceToDelivery = this.calculateDistance(
        location.latitude,
        location.longitude,
        deliveryLocation.lat,
        deliveryLocation.lng
      );

      result.isInDeliveryZone = result.distanceToDelivery <= GEOFENCE_RADIUS.DELIVERY;
      result.isNearbyDelivery = result.distanceToDelivery <= GEOFENCE_RADIUS.NEARBY;
    }

    // Auto-update order status based on geofence
    const currentStatus = order.status;

    // Pickup zone logic - when rider arrives at restaurant
    if (result.isInPickupZone && ['confirmed', 'preparing', 'ready'].includes(currentStatus)) {
      await db.update(orders)
        .set({
          status: 'picked_up',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Add tracking event
      await this.addTrackingEvent(orderId, riderId, 'arrived_pickup', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });

      result.statusUpdated = true;
      result.newStatus = 'picked_up';
      result.message = 'Rider arrived at pickup location - order marked as picked up';

      // Notify via WebSocket
      wsManager.broadcastOrderStatusUpdate({
        orderId,
        status: 'picked_up',
        message: 'Rider arrived at pickup location',
        timestamp: new Date().toISOString()
      });
    }

    // Delivery zone logic - when rider approaches customer
    else if (result.isInDeliveryZone && currentStatus === 'in_transit') {
      await db.update(orders)
        .set({
          status: 'arrived',
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));

      // Add tracking event
      await this.addTrackingEvent(orderId, riderId, 'arrived_delivery', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });

      result.statusUpdated = true;
      result.newStatus = 'arrived';
      result.message = 'Rider arrived at delivery location';

      // Notify via WebSocket
      wsManager.broadcastOrderStatusUpdate({
        orderId,
        status: 'arrived',
        message: 'Rider arrived at delivery location',
        timestamp: new Date().toISOString()
      });
    }

    // Nearby notifications (500m)
    else if (result.isNearbyDelivery && currentStatus === 'in_transit') {
      // Add tracking event for nearby
      await this.addTrackingEvent(orderId, riderId, 'nearby', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });

      result.message = 'Rider is nearby delivery location';

      // Notify customer via WebSocket - using order status update for nearby notification
      wsManager.broadcastOrderStatusUpdate({
        orderId,
        status: 'in_transit',
        message: `Rider is ${Math.round(result.distanceToDelivery || 500)}m away`,
        timestamp: new Date().toISOString()
      });
    }

    if (!result.message) {
      result.message = 'Location updated';
    }

    // Update rider's current location
    await db.update(riders)
      .set({
        currentLocation: {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date().toISOString()
        },
        lastActivityAt: new Date()
      })
      .where(eq(riders.id, riderId));

    return result;
  }

  /**
   * Add a delivery tracking event
   */
  async addTrackingEvent(
    orderId: string,
    riderId: string,
    eventType: string,
    location: { lat: number; lng: number; accuracy?: number }
  ) {
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
  }

  /**
   * Check if rider is within service area
   */
  async isWithinServiceArea(
    latitude: number,
    longitude: number,
    centerLat: number = 13.7565,  // Default: Batangas City center
    centerLng: number = 121.0583,
    radiusKm: number = 25
  ): Promise<boolean> {
    const distance = this.calculateDistance(latitude, longitude, centerLat, centerLng);
    return distance <= radiusKm * 1000;
  }

  /**
   * Get nearby orders for a rider
   */
  async getNearbyOrders(
    riderId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ) {
    // Get all pending orders that need riders
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'ready'));

    // Filter orders by distance
    const nearbyOrders = [];
    for (const order of pendingOrders) {
      const { pickupLocation } = await this.getOrderLocations(order.id);
      if (pickupLocation) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          pickupLocation.lat,
          pickupLocation.lng
        );
        if (distance <= radiusKm * 1000) {
          nearbyOrders.push({
            ...order,
            distanceToPickup: distance,
            pickupLocation
          });
        }
      }
    }

    // Sort by distance
    nearbyOrders.sort((a, b) => a.distanceToPickup - b.distanceToPickup);

    return nearbyOrders;
  }
}

export const geofenceService = new GeofenceService();
