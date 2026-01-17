/**
 * Enhanced Dispatch Service
 *
 * Handles batch order assignment, manual dispatch override, SLA breach auto-escalation,
 * emergency dispatch protocols, and rider capacity planning.
 */

import { db } from '../db';
import { eq, and, or, lt, gt, lte, gte, sql, desc, asc, isNull, inArray } from 'drizzle-orm';
import {
  orders,
  riders,
  users,
  restaurants,
  dispatchBatches,
  dispatchBatchOrders,
  dispatchEscalations,
  riderCapacity,
  emergencyDispatches,
  dispatchOverrideLogs,
  slaTrackingEvents,
  dispatchZonesConfig,
  orderStatusHistory,
  DISPATCH_BATCH_STATUS,
  ESCALATION_LEVELS,
  EMERGENCY_PRIORITY,
  type DispatchBatch,
  type InsertDispatchBatch,
  type DispatchBatchOrder,
  type InsertDispatchBatchOrder,
  type DispatchEscalation,
  type InsertDispatchEscalation,
  type RiderCapacity,
  type InsertRiderCapacity,
  type EmergencyDispatch,
  type InsertEmergencyDispatch,
  type DispatchOverrideLog,
  type InsertDispatchOverrideLog,
  type SlaTrackingEvent,
  type InsertSlaTrackingEvent,
} from '@shared/schema';
import { nanoid } from 'nanoid';
import { wsManager } from './websocket-manager';

// Helper to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Helper to generate batch number
function generateBatchNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(4).toUpperCase();
  return `BATCH-${timestamp}-${random}`;
}

// Interface definitions
export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  status: string;
  restaurantId: string;
  customerId: string;
  riderId: string | null;
  deliveryAddress: any;
  pickupAddress?: any;
  totalAmount: string;
  createdAt: Date | null;
  estimatedDeliveryTime: Date | null;
  deliveryTimeCommitment: Date | null;
  orderPriority: number | null;
  restaurantName?: string;
  customerName?: string;
  pickupLocation?: { lat: number; lng: number };
  deliveryLocation?: { lat: number; lng: number };
}

export interface RiderWithCapacity {
  id: string;
  userId: string;
  vehicleType: string;
  isOnline: boolean;
  currentLocation: { lat: number; lng: number; accuracy?: number; timestamp?: string } | null;
  rating: string | null;
  activeOrdersCount: number | null;
  maxActiveOrders: number | null;
  capacityInfo?: RiderCapacity;
  userName?: string;
  userPhone?: string;
}

export interface BatchAssignmentRequest {
  orderIds: string[];
  riderId: string;
  assignedBy: string;
  notes?: string;
}

export interface ManualOverrideRequest {
  orderId: string;
  newRiderId: string;
  overriddenBy: string;
  reason: string;
  description?: string;
}

export interface EscalationRequest {
  orderId: string;
  level: number;
  reason: string;
  description?: string;
}

export interface EmergencyDispatchRequest {
  orderId: string;
  reason: string;
  description?: string;
  priority: number;
  handledBy: string;
}

export interface RouteOptimizationResult {
  optimizedSequence: string[];
  totalDistance: number;
  totalDuration: number;
  stops: {
    orderId: string;
    type: 'pickup' | 'delivery';
    sequence: number;
    location: { lat: number; lng: number };
    estimatedArrival: Date;
    distanceFromPrevious: number;
    durationFromPrevious: number;
  }[];
}

export class DispatchService {

  // ============= BATCH ORDER ASSIGNMENT =============

  /**
   * Create a dispatch batch with multiple orders assigned to a single rider
   */
  async createDispatchBatch(request: BatchAssignmentRequest): Promise<DispatchBatch> {
    const { orderIds, riderId, assignedBy, notes } = request;

    // Validate orders exist and are in assignable state
    const orderList = await db.select()
      .from(orders)
      .where(inArray(orders.id, orderIds));

    if (orderList.length !== orderIds.length) {
      throw new Error('One or more orders not found');
    }

    // Check if any orders are already assigned
    const assignedOrders = orderList.filter(o => o.riderId);
    if (assignedOrders.length > 0) {
      throw new Error(`Orders already assigned: ${assignedOrders.map(o => o.orderNumber).join(', ')}`);
    }

    // Validate rider exists and is available
    const [rider] = await db.select()
      .from(riders)
      .where(eq(riders.id, riderId));

    if (!rider) {
      throw new Error('Rider not found');
    }

    if (!rider.isOnline) {
      throw new Error('Rider is not online');
    }

    // Check rider capacity
    const capacity = await this.getRiderCapacity(riderId);
    if (capacity && !capacity.isAvailableForDispatch) {
      throw new Error('Rider is not available for dispatch');
    }

    const newOrderCount = orderIds.length;
    const currentOrders = capacity?.currentOrders || 0;
    const maxOrders = capacity?.maxConcurrentOrders || rider.maxActiveOrders || 3;

    if (currentOrders + newOrderCount > maxOrders) {
      throw new Error(`Rider capacity exceeded. Current: ${currentOrders}, Adding: ${newOrderCount}, Max: ${maxOrders}`);
    }

    // Get order details for route optimization
    const ordersWithDetails = await this.getOrdersWithDetails(orderIds);

    // Optimize route for batch delivery
    const optimizedRoute = await this.optimizeRoute(ordersWithDetails, rider.currentLocation as any);

    // Create batch
    const batchNumber = generateBatchNumber();
    const [batch] = await db.insert(dispatchBatches).values({
      batchNumber,
      orderCount: orderIds.length,
      status: 'pending',
      assignedRiderId: riderId,
      assignedBy,
      notes,
      estimatedTotalDistance: optimizedRoute.totalDistance.toString(),
      estimatedTotalDuration: optimizedRoute.totalDuration,
      optimizedRoute: optimizedRoute.optimizedSequence,
      pickupLocations: ordersWithDetails.map(o => o.pickupLocation),
      deliveryLocations: ordersWithDetails.map(o => o.deliveryLocation),
    }).returning();

    // Create batch order entries
    const batchOrderEntries: InsertDispatchBatchOrder[] = optimizedRoute.stops
      .filter(s => s.type === 'pickup')
      .map((stop, index) => {
        const deliveryStop = optimizedRoute.stops.find(s => s.orderId === stop.orderId && s.type === 'delivery')!;
        return {
          batchId: batch.id,
          orderId: stop.orderId,
          sequence: index + 1,
          pickupSequence: stop.sequence,
          deliverySequence: deliveryStop.sequence,
          status: 'pending',
          estimatedPickupTime: stop.estimatedArrival,
          estimatedDeliveryTime: deliveryStop.estimatedArrival,
          distanceFromPrevious: stop.distanceFromPrevious.toString(),
          durationFromPrevious: stop.durationFromPrevious,
        };
      });

    await db.insert(dispatchBatchOrders).values(batchOrderEntries);

    // Update orders with rider assignment
    for (const orderId of orderIds) {
      await db.update(orders)
        .set({
          riderId: rider.userId,
          riderAssignedAt: new Date(),
          status: 'confirmed',
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      // Add status history
      await db.insert(orderStatusHistory).values({
        orderId,
        fromStatus: orderList.find(o => o.id === orderId)?.status || 'pending',
        toStatus: 'confirmed',
        changedBy: assignedBy,
        changedByRole: 'admin',
        reason: `Assigned to batch ${batchNumber}`,
        isAutomaticTransition: false,
      });
    }

    // Update rider capacity
    await this.updateRiderCapacity(riderId, {
      currentOrders: currentOrders + newOrderCount,
      currentBatchId: batch.id,
      lastDispatchedAt: new Date(),
      totalDispatchesToday: (capacity?.totalDispatchesToday || 0) + 1,
    });

    // Broadcast dispatch event
    this.broadcastDispatchEvent('batch_created', {
      batchId: batch.id,
      batchNumber,
      riderId,
      orderCount: orderIds.length,
      orderIds,
    });

    return batch;
  }

  /**
   * Get all dispatch batches with optional filters
   */
  async getDispatchBatches(filters?: {
    status?: string;
    riderId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DispatchBatch[]> {
    let query = db.select().from(dispatchBatches).$dynamic();

    if (filters?.status) {
      query = query.where(eq(dispatchBatches.status, filters.status));
    }
    if (filters?.riderId) {
      query = query.where(eq(dispatchBatches.assignedRiderId, filters.riderId));
    }

    query = query.orderBy(desc(dispatchBatches.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  /**
   * Get batch details with orders
   */
  async getBatchDetails(batchId: string) {
    const [batch] = await db.select()
      .from(dispatchBatches)
      .where(eq(dispatchBatches.id, batchId));

    if (!batch) {
      return null;
    }

    const batchOrders = await db.select({
      batchOrder: dispatchBatchOrders,
      order: orders,
    })
      .from(dispatchBatchOrders)
      .leftJoin(orders, eq(dispatchBatchOrders.orderId, orders.id))
      .where(eq(dispatchBatchOrders.batchId, batchId))
      .orderBy(asc(dispatchBatchOrders.sequence));

    return {
      ...batch,
      orders: batchOrders.map(bo => ({
        ...bo.batchOrder,
        orderDetails: bo.order,
      })),
    };
  }

  // ============= MANUAL DISPATCH OVERRIDE =============

  /**
   * Override automatic assignment and assign specific rider
   */
  async manualOverride(request: ManualOverrideRequest): Promise<DispatchOverrideLog> {
    const { orderId, newRiderId, overriddenBy, reason, description } = request;

    // Get current order state
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new Error('Order not found');
    }

    // Get new rider details
    const [newRider] = await db.select()
      .from(riders)
      .where(eq(riders.id, newRiderId));

    if (!newRider) {
      throw new Error('Rider not found');
    }

    if (!newRider.isOnline) {
      throw new Error('Rider is not online');
    }

    // Get capacity info
    const capacity = await this.getRiderCapacity(newRiderId);
    const currentOrders = capacity?.currentOrders || newRider.activeOrdersCount || 0;

    // Calculate distance to pickup
    let distanceToPickup: number | undefined;
    const restaurantAddress = order.pickupAddress || (await this.getRestaurantLocation(order.restaurantId));
    if (newRider.currentLocation && restaurantAddress) {
      const riderLoc = newRider.currentLocation as { lat: number; lng: number };
      const restAddr = restaurantAddress as { lat: number; lng: number };
      distanceToPickup = calculateDistance(
        riderLoc.lat, riderLoc.lng,
        restAddr.lat, restAddr.lng
      );
    }

    // Create override log
    const [overrideLog] = await db.insert(dispatchOverrideLogs).values({
      orderId,
      previousRiderId: order.riderId ? await this.getRiderIdFromUserId(order.riderId) : null,
      newRiderId,
      overriddenBy,
      reason,
      description,
      wasAutomaticAssignment: !!order.riderId,
      distanceToPickup: distanceToPickup?.toString(),
      riderCapacityAtOverride: currentOrders,
    }).returning();

    // Update previous rider capacity if exists
    if (order.riderId) {
      const prevRiderId = await this.getRiderIdFromUserId(order.riderId);
      if (prevRiderId) {
        await this.decrementRiderOrders(prevRiderId);
      }
    }

    // Update order with new rider
    await db.update(orders)
      .set({
        riderId: newRider.userId,
        riderAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Update new rider capacity
    await this.incrementRiderOrders(newRiderId);

    // Add status history
    await db.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus: order.status,
      changedBy: overriddenBy,
      changedByRole: 'admin',
      reason: `Manual override: ${reason}`,
      notes: description,
      isAutomaticTransition: false,
    });

    // Broadcast event
    this.broadcastDispatchEvent('manual_override', {
      orderId,
      orderNumber: order.orderNumber,
      previousRiderId: order.riderId,
      newRiderId: newRider.userId,
      reason,
    });

    return overrideLog;
  }

  // ============= SLA BREACH AUTO-ESCALATION =============

  /**
   * Monitor orders for SLA breaches and auto-escalate
   */
  async monitorSLABreaches(): Promise<void> {
    const now = new Date();

    // Get active orders with SLA commitments
    const activeOrders = await db.select({
      order: orders,
      restaurant: restaurants,
    })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(
        and(
          inArray(orders.status, ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit']),
          isNull(orders.actualDeliveryTime)
        )
      );

    for (const { order, restaurant } of activeOrders) {
      const createdAt = order.createdAt ? new Date(order.createdAt) : now;
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      // Check various SLA conditions
      const issues: { type: string; delayMinutes: number }[] = [];

      // Check vendor acceptance SLA (5 minutes)
      if (order.status === 'pending' && !order.vendorAcceptedAt && minutesSinceCreation > 5) {
        issues.push({ type: 'vendor_acceptance', delayMinutes: Math.floor(minutesSinceCreation - 5) });
      }

      // Check preparation SLA
      if (['confirmed', 'preparing'].includes(order.status) && order.vendorAcceptedAt) {
        const acceptedAt = new Date(order.vendorAcceptedAt);
        const prepTime = restaurant?.estimatedDeliveryTime || 30;
        const expectedPrepComplete = new Date(acceptedAt.getTime() + prepTime * 60000);
        if (now > expectedPrepComplete) {
          const delayMinutes = Math.floor((now.getTime() - expectedPrepComplete.getTime()) / 60000);
          issues.push({ type: 'preparation_time', delayMinutes });
        }
      }

      // Check pickup SLA (10 minutes after ready)
      if (order.status === 'ready' && !order.pickedUpAt) {
        // Find when order became ready from status history
        const [readyStatus] = await db.select()
          .from(orderStatusHistory)
          .where(
            and(
              eq(orderStatusHistory.orderId, order.id),
              eq(orderStatusHistory.toStatus, 'ready')
            )
          )
          .orderBy(desc(orderStatusHistory.timestamp))
          .limit(1);

        if (readyStatus?.timestamp) {
          const readyAt = new Date(readyStatus.timestamp);
          const minutesSinceReady = (now.getTime() - readyAt.getTime()) / (1000 * 60);
          if (minutesSinceReady > 10) {
            issues.push({ type: 'pickup_time', delayMinutes: Math.floor(minutesSinceReady - 10) });
          }
        }
      }

      // Check delivery SLA
      if (order.deliveryTimeCommitment) {
        const commitment = new Date(order.deliveryTimeCommitment);
        if (now > commitment) {
          const delayMinutes = Math.floor((now.getTime() - commitment.getTime()) / 60000);
          issues.push({ type: 'delivery_time', delayMinutes });
        }
      }

      // Process issues and create escalations
      for (const issue of issues) {
        await this.processSlaBreach(order.id, issue.type, issue.delayMinutes);
      }
    }
  }

  /**
   * Process an SLA breach and create appropriate escalation
   */
  private async processSlaBreach(orderId: string, slaType: string, delayMinutes: number): Promise<void> {
    // Check for existing escalation
    const [existingEscalation] = await db.select()
      .from(dispatchEscalations)
      .where(
        and(
          eq(dispatchEscalations.orderId, orderId),
          inArray(dispatchEscalations.status, ['open', 'acknowledged'])
        )
      )
      .orderBy(desc(dispatchEscalations.escalationLevel))
      .limit(1);

    let escalationLevel = 1;

    // Determine escalation level based on delay
    if (delayMinutes >= 30) {
      escalationLevel = ESCALATION_LEVELS.LEVEL_3;
    } else if (delayMinutes >= 20) {
      escalationLevel = ESCALATION_LEVELS.LEVEL_2;
    } else if (delayMinutes >= 10) {
      escalationLevel = ESCALATION_LEVELS.LEVEL_1;
    } else {
      return; // Not yet escalation-worthy
    }

    // If existing escalation is at same or higher level, skip
    if (existingEscalation && existingEscalation.escalationLevel >= escalationLevel) {
      return;
    }

    // Get order details
    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) return;

    // Create SLA tracking event
    await db.insert(slaTrackingEvents).values({
      orderId,
      eventType: 'breach',
      slaType,
      targetTime: new Date(Date.now() - delayMinutes * 60000),
      delayMinutes,
      escalationTriggered: true,
    });

    // Create or update escalation
    const [escalation] = await db.insert(dispatchEscalations).values({
      orderId,
      escalationLevel,
      reason: 'sla_breach',
      description: `SLA breach: ${slaType} delayed by ${delayMinutes} minutes`,
      previousRiderId: order.riderId ? await this.getRiderIdFromUserId(order.riderId) : null,
      responseDeadline: new Date(Date.now() + this.getResponseDeadline(escalationLevel)),
    }).returning();

    // Notify appropriate users based on level
    await this.notifyEscalation(escalation, escalationLevel);

    // Update existing escalation status if exists
    if (existingEscalation) {
      await db.update(dispatchEscalations)
        .set({ status: 'escalated_further' })
        .where(eq(dispatchEscalations.id, existingEscalation.id));
    }

    // Broadcast escalation event
    this.broadcastDispatchEvent('sla_breach', {
      orderId,
      orderNumber: order.orderNumber,
      slaType,
      delayMinutes,
      escalationLevel,
      escalationId: escalation.id,
    });
  }

  /**
   * Create manual escalation
   */
  async createEscalation(request: EscalationRequest): Promise<DispatchEscalation> {
    const { orderId, level, reason, description } = request;

    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new Error('Order not found');
    }

    const [escalation] = await db.insert(dispatchEscalations).values({
      orderId,
      escalationLevel: level,
      reason,
      description,
      previousRiderId: order.riderId ? await this.getRiderIdFromUserId(order.riderId) : null,
      responseDeadline: new Date(Date.now() + this.getResponseDeadline(level)),
    }).returning();

    await this.notifyEscalation(escalation, level);

    this.broadcastDispatchEvent('escalation_created', {
      escalationId: escalation.id,
      orderId,
      level,
      reason,
    });

    return escalation;
  }

  /**
   * Get escalations with filters
   */
  async getEscalations(filters?: {
    status?: string;
    level?: number;
    limit?: number;
    offset?: number;
  }): Promise<DispatchEscalation[]> {
    let query = db.select().from(dispatchEscalations).$dynamic();

    if (filters?.status) {
      query = query.where(eq(dispatchEscalations.status, filters.status));
    }
    if (filters?.level) {
      query = query.where(eq(dispatchEscalations.escalationLevel, filters.level));
    }

    query = query.orderBy(desc(dispatchEscalations.escalatedAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  /**
   * Resolve an escalation
   */
  async resolveEscalation(
    escalationId: string,
    resolvedBy: string,
    resolutionAction: string,
    resolutionNotes?: string
  ): Promise<DispatchEscalation> {
    const [escalation] = await db.update(dispatchEscalations)
      .set({
        status: 'resolved',
        resolvedBy,
        resolvedAt: new Date(),
        resolutionAction,
        resolutionNotes,
        updatedAt: new Date(),
      })
      .where(eq(dispatchEscalations.id, escalationId))
      .returning();

    this.broadcastDispatchEvent('escalation_resolved', {
      escalationId,
      resolutionAction,
    });

    return escalation;
  }

  // ============= EMERGENCY DISPATCH PROTOCOLS =============

  /**
   * Create emergency dispatch request
   */
  async createEmergencyDispatch(request: EmergencyDispatchRequest): Promise<EmergencyDispatch> {
    const { orderId, reason, description, priority, handledBy } = request;

    const [order] = await db.select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new Error('Order not found');
    }

    const [emergency] = await db.insert(emergencyDispatches).values({
      orderId,
      originalRiderId: order.riderId ? await this.getRiderIdFromUserId(order.riderId) : null,
      reason,
      description,
      priority,
      status: 'pending',
      handledBy,
    }).returning();

    // Find backup rider pool
    const backupRiders = await this.findBackupRiders(order, priority);

    this.broadcastDispatchEvent('emergency_created', {
      emergencyId: emergency.id,
      orderId,
      orderNumber: order.orderNumber,
      priority,
      reason,
      availableBackupRiders: backupRiders.length,
    });

    return emergency;
  }

  /**
   * Get emergency dispatches
   */
  async getEmergencyDispatches(filters?: {
    status?: string;
    priority?: number;
    limit?: number;
    offset?: number;
  }): Promise<EmergencyDispatch[]> {
    let query = db.select().from(emergencyDispatches).$dynamic();

    if (filters?.status) {
      query = query.where(eq(emergencyDispatches.status, filters.status));
    }
    if (filters?.priority) {
      query = query.where(eq(emergencyDispatches.priority, filters.priority));
    }

    query = query.orderBy(desc(emergencyDispatches.priority), desc(emergencyDispatches.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  /**
   * Reassign emergency dispatch to backup rider
   */
  async reassignEmergencyDispatch(
    emergencyId: string,
    newRiderId: string,
    adminId: string
  ): Promise<EmergencyDispatch> {
    const [emergency] = await db.select()
      .from(emergencyDispatches)
      .where(eq(emergencyDispatches.id, emergencyId));

    if (!emergency) {
      throw new Error('Emergency dispatch not found');
    }

    const [rider] = await db.select()
      .from(riders)
      .where(eq(riders.id, newRiderId));

    if (!rider) {
      throw new Error('Rider not found');
    }

    // Update emergency dispatch
    const [updatedEmergency] = await db.update(emergencyDispatches)
      .set({
        reassignedRiderId: newRiderId,
        status: 'assigned',
        responseTimeMinutes: Math.floor(
          (Date.now() - new Date(emergency.createdAt!).getTime()) / 60000
        ),
        updatedAt: new Date(),
      })
      .where(eq(emergencyDispatches.id, emergencyId))
      .returning();

    // Update order with new rider
    await db.update(orders)
      .set({
        riderId: rider.userId,
        riderAssignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, emergency.orderId));

    // Update capacities
    if (emergency.originalRiderId) {
      await this.decrementRiderOrders(emergency.originalRiderId);
    }
    await this.incrementRiderOrders(newRiderId);

    this.broadcastDispatchEvent('emergency_reassigned', {
      emergencyId,
      orderId: emergency.orderId,
      newRiderId: rider.userId,
    });

    return updatedEmergency;
  }

  /**
   * Resolve emergency dispatch
   */
  async resolveEmergencyDispatch(
    emergencyId: string,
    resolutionNotes: string
  ): Promise<EmergencyDispatch> {
    const [emergency] = await db.update(emergencyDispatches)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolutionNotes,
        updatedAt: new Date(),
      })
      .where(eq(emergencyDispatches.id, emergencyId))
      .returning();

    this.broadcastDispatchEvent('emergency_resolved', {
      emergencyId,
      orderId: emergency.orderId,
    });

    return emergency;
  }

  // ============= RIDER CAPACITY PLANNING =============

  /**
   * Get rider capacity information
   */
  async getRiderCapacity(riderId: string): Promise<RiderCapacity | null> {
    const [capacity] = await db.select()
      .from(riderCapacity)
      .where(eq(riderCapacity.riderId, riderId));
    return capacity || null;
  }

  /**
   * Update rider capacity
   */
  async updateRiderCapacity(riderId: string, updates: Partial<InsertRiderCapacity>): Promise<RiderCapacity> {
    const existing = await this.getRiderCapacity(riderId);

    if (existing) {
      const [updated] = await db.update(riderCapacity)
        .set({ ...updates, lastUpdated: new Date() })
        .where(eq(riderCapacity.riderId, riderId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(riderCapacity)
        .values({ riderId, ...updates })
        .returning();
      return created;
    }
  }

  /**
   * Get all riders with capacity overview
   */
  async getRidersCapacityOverview(): Promise<RiderWithCapacity[]> {
    const riderList = await db.select({
      rider: riders,
      capacity: riderCapacity,
      user: users,
    })
      .from(riders)
      .leftJoin(riderCapacity, eq(riders.id, riderCapacity.riderId))
      .leftJoin(users, eq(riders.userId, users.id))
      .where(eq(riders.isOnline, true));

    return riderList.map(r => ({
      id: r.rider.id,
      userId: r.rider.userId,
      vehicleType: r.rider.vehicleType,
      isOnline: r.rider.isOnline || false,
      currentLocation: r.rider.currentLocation as any,
      rating: r.rider.rating,
      activeOrdersCount: r.rider.activeOrdersCount,
      maxActiveOrders: r.rider.maxActiveOrders,
      capacityInfo: r.capacity || undefined,
      userName: r.user ? `${r.user.firstName} ${r.user.lastName}` : undefined,
      userPhone: r.user?.phone || undefined,
    }));
  }

  private async incrementRiderOrders(riderId: string): Promise<void> {
    const capacity = await this.getRiderCapacity(riderId);
    const current = capacity?.currentOrders || 0;
    await this.updateRiderCapacity(riderId, {
      currentOrders: current + 1,
      lastDispatchedAt: new Date(),
    });
  }

  private async decrementRiderOrders(riderId: string): Promise<void> {
    const capacity = await this.getRiderCapacity(riderId);
    const current = capacity?.currentOrders || 0;
    await this.updateRiderCapacity(riderId, {
      currentOrders: Math.max(0, current - 1),
    });
  }

  // ============= SLA MONITORING =============

  /**
   * Get real-time SLA monitoring data
   */
  async getSlaMonitoringData() {
    const now = new Date();

    const activeOrders = await db.select({
      order: orders,
      restaurant: restaurants,
    })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .where(
        and(
          inArray(orders.status, ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'in_transit']),
          isNull(orders.actualDeliveryTime)
        )
      )
      .orderBy(asc(orders.createdAt));

    return activeOrders.map(({ order, restaurant }) => {
      const createdAt = order.createdAt ? new Date(order.createdAt) : now;
      const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);

      let slaStatus: 'green' | 'yellow' | 'red' = 'green';
      let minutesToBreach = 0;

      // Calculate time to SLA breach
      if (order.deliveryTimeCommitment) {
        const commitment = new Date(order.deliveryTimeCommitment);
        minutesToBreach = (commitment.getTime() - now.getTime()) / 60000;

        if (minutesToBreach < 0) {
          slaStatus = 'red';
        } else if (minutesToBreach < 10) {
          slaStatus = 'yellow';
        }
      } else {
        // Default SLA based on order age
        const expectedDeliveryMinutes = (restaurant?.estimatedDeliveryTime || 30) + 15;
        minutesToBreach = expectedDeliveryMinutes - minutesSinceCreation;

        if (minutesToBreach < 0) {
          slaStatus = 'red';
        } else if (minutesToBreach < 10) {
          slaStatus = 'yellow';
        }
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        restaurantName: restaurant?.name || 'Unknown',
        minutesSinceCreation: Math.floor(minutesSinceCreation),
        minutesToBreach: Math.floor(minutesToBreach),
        slaStatus,
        hasRider: !!order.riderId,
        priority: order.orderPriority || 1,
      };
    });
  }

  // ============= HELPER METHODS =============

  private async getOrdersWithDetails(orderIds: string[]): Promise<OrderWithDetails[]> {
    const orderList = await db.select({
      order: orders,
      restaurant: restaurants,
      customer: users,
    })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(users, eq(orders.customerId, users.id))
      .where(inArray(orders.id, orderIds));

    return orderList.map(({ order, restaurant, customer }) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      restaurantId: order.restaurantId,
      customerId: order.customerId,
      riderId: order.riderId,
      deliveryAddress: order.deliveryAddress,
      pickupAddress: order.pickupAddress,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryTimeCommitment: order.deliveryTimeCommitment,
      orderPriority: order.orderPriority,
      restaurantName: restaurant?.name,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
      pickupLocation: restaurant?.address ? (restaurant.address as { lat: number; lng: number }) : undefined,
      deliveryLocation: (order.deliveryAddress as any)?.coordinates || order.deliveryAddress as { lat: number; lng: number },
    }));
  }

  private async optimizeRoute(
    ordersList: OrderWithDetails[],
    startLocation: { lat: number; lng: number } | null
  ): Promise<RouteOptimizationResult> {
    // Simple nearest-neighbor route optimization
    // In production, you would use a proper routing API like Google Maps Directions

    const stops: RouteOptimizationResult['stops'] = [];
    let currentLocation = startLocation || { lat: 13.9395, lng: 121.1618 }; // Default to Batangas
    let totalDistance = 0;
    let totalDuration = 0;
    const visitedPickups = new Set<string>();
    const visitedDeliveries = new Set<string>();
    let sequence = 1;
    let currentTime = new Date();

    // Sort orders by pickup location proximity (greedy nearest neighbor)
    const remainingOrders = [...ordersList];

    while (remainingOrders.length > 0 || visitedPickups.size < ordersList.length) {
      // Find nearest unvisited pickup
      let nearestPickup: OrderWithDetails | null = null;
      let nearestPickupDistance = Infinity;

      for (const order of remainingOrders) {
        if (visitedPickups.has(order.id)) continue;
        const pickupLoc = order.pickupLocation || { lat: 13.9395, lng: 121.1618 };
        const distance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          pickupLoc.lat, pickupLoc.lng
        );
        if (distance < nearestPickupDistance) {
          nearestPickupDistance = distance;
          nearestPickup = order;
        }
      }

      if (nearestPickup) {
        const pickupLoc = nearestPickup.pickupLocation || { lat: 13.9395, lng: 121.1618 };
        const duration = Math.ceil(nearestPickupDistance * 3); // ~3 min per km average
        currentTime = new Date(currentTime.getTime() + duration * 60000);

        stops.push({
          orderId: nearestPickup.id,
          type: 'pickup',
          sequence: sequence++,
          location: pickupLoc,
          estimatedArrival: new Date(currentTime),
          distanceFromPrevious: nearestPickupDistance,
          durationFromPrevious: duration,
        });

        totalDistance += nearestPickupDistance;
        totalDuration += duration;
        currentLocation = pickupLoc;
        visitedPickups.add(nearestPickup.id);

        // Add delivery stop immediately after pickup for this simple algorithm
        const deliveryLoc = nearestPickup.deliveryLocation || { lat: 13.9395, lng: 121.1618 };
        const deliveryDistance = calculateDistance(
          currentLocation.lat, currentLocation.lng,
          deliveryLoc.lat, deliveryLoc.lng
        );
        const deliveryDuration = Math.ceil(deliveryDistance * 3);
        currentTime = new Date(currentTime.getTime() + deliveryDuration * 60000);

        stops.push({
          orderId: nearestPickup.id,
          type: 'delivery',
          sequence: sequence++,
          location: deliveryLoc,
          estimatedArrival: new Date(currentTime),
          distanceFromPrevious: deliveryDistance,
          durationFromPrevious: deliveryDuration,
        });

        totalDistance += deliveryDistance;
        totalDuration += deliveryDuration;
        currentLocation = deliveryLoc;
        visitedDeliveries.add(nearestPickup.id);

        // Remove from remaining
        const idx = remainingOrders.findIndex(o => o.id === nearestPickup!.id);
        if (idx >= 0) remainingOrders.splice(idx, 1);
      } else {
        break;
      }
    }

    return {
      optimizedSequence: stops.filter(s => s.type === 'pickup').map(s => s.orderId),
      totalDistance,
      totalDuration,
      stops,
    };
  }

  private async getRestaurantLocation(restaurantId: string): Promise<{ lat: number; lng: number } | null> {
    const [restaurant] = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId));

    if (restaurant?.address) {
      const addr = restaurant.address as any;
      if (addr.lat && addr.lng) return addr;
      if (addr.coordinates) return addr.coordinates;
    }
    return null;
  }

  private async getRiderIdFromUserId(userId: string): Promise<string | null> {
    const [rider] = await db.select()
      .from(riders)
      .where(eq(riders.userId, userId));
    return rider?.id || null;
  }

  private getResponseDeadline(level: number): number {
    switch (level) {
      case ESCALATION_LEVELS.LEVEL_1: return 10 * 60000; // 10 minutes
      case ESCALATION_LEVELS.LEVEL_2: return 5 * 60000;  // 5 minutes
      case ESCALATION_LEVELS.LEVEL_3: return 2 * 60000;  // 2 minutes
      default: return 10 * 60000;
    }
  }

  private async notifyEscalation(escalation: DispatchEscalation, level: number): Promise<void> {
    // Get admin users to notify based on level
    const adminRoles = ['admin'];
    if (level >= ESCALATION_LEVELS.LEVEL_2) {
      // Could add dispatch_manager role
    }

    const admins = await db.select()
      .from(users)
      .where(eq(users.role, 'admin'))
      .limit(10);

    const notifiedUsers = admins.map(a => a.id);

    await db.update(dispatchEscalations)
      .set({ notifiedUsers })
      .where(eq(dispatchEscalations.id, escalation.id));

    // In production, send actual notifications via push/email/SMS
    console.log(`[DispatchService] Escalation Level ${level} notification sent to ${notifiedUsers.length} admins`);
  }

  private async findBackupRiders(order: any, priority: number): Promise<RiderWithCapacity[]> {
    // Find available riders sorted by distance and rating
    const availableRiders = await this.getRidersCapacityOverview();

    return availableRiders
      .filter(r => {
        const capacity = r.capacityInfo;
        const maxOrders = capacity?.maxConcurrentOrders || r.maxActiveOrders || 3;
        const currentOrders = capacity?.currentOrders || r.activeOrdersCount || 0;
        return currentOrders < maxOrders && r.isOnline;
      })
      .sort((a, b) => {
        // Sort by rating (higher is better) and then by current load (lower is better)
        const ratingDiff = parseFloat(b.rating || '0') - parseFloat(a.rating || '0');
        if (ratingDiff !== 0) return ratingDiff;
        const aLoad = (a.capacityInfo?.currentOrders || 0) / (a.capacityInfo?.maxConcurrentOrders || 3);
        const bLoad = (b.capacityInfo?.currentOrders || 0) / (b.capacityInfo?.maxConcurrentOrders || 3);
        return aLoad - bLoad;
      })
      .slice(0, 5); // Return top 5 backup riders
  }

  private broadcastDispatchEvent(type: string, data: any): void {
    try {
      wsManager.broadcastToChannel('admin:dispatch', {
        type: `dispatch_${type}`,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[DispatchService] Failed to broadcast event:', error);
    }
  }
}

// Export singleton instance
export const dispatchService = new DispatchService();
