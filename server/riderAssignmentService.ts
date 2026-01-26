import { db } from "./db";
import { riders, orders, riderAssignmentQueue, riderLocationHistory, riderPerformanceMetrics, restaurants } from "@shared/schema";
import { eq, and, gte, lte, desc, asc, isNull, or } from "drizzle-orm";
import type { InsertRiderAssignmentQueue } from "@shared/schema";

interface RiderCandidate {
  riderId: string;
  distance: number;
  performanceScore: number;
  isOnline: boolean;
  activeOrdersCount: number;
  maxActiveOrders: number;
  rating: number;
  onTimeDeliveryRate: number;
  currentLocation: {lat: number, lng: number} | null;
  assignmentScore: number;
}

interface AssignmentRequest {
  orderId: string;
  restaurantLocation: {lat: number, lng: number};
  deliveryLocation: {lat: number, lng: number};
  priority: number;
  estimatedValue: number;
  maxDistance?: number;
}

export class RiderAssignmentService {
  
  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number, 
    lng1: number, 
    lat2: number, 
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  }

  /**
   * Calculate assignment score based on multiple factors
   * Higher score = better candidate
   */
  private calculateAssignmentScore(
    candidate: Omit<RiderCandidate, 'assignmentScore'>,
    request: AssignmentRequest
  ): number {
    let score = 0;

    // Distance factor (closer is better) - 40% weight
    const maxDistance = request.maxDistance || 10;
    const distanceScore = Math.max(0, (maxDistance - candidate.distance) / maxDistance) * 40;
    score += distanceScore;

    // Performance score - 25% weight
    const performanceScore = (candidate.performanceScore / 100) * 25;
    score += performanceScore;

    // Rating factor - 15% weight
    const ratingScore = (candidate.rating / 5) * 15;
    score += ratingScore;

    // On-time delivery rate - 10% weight
    const onTimeScore = (candidate.onTimeDeliveryRate / 100) * 10;
    score += onTimeScore;

    // Availability factor (fewer active orders is better) - 10% weight
    const availabilityRatio = 1 - (candidate.activeOrdersCount / candidate.maxActiveOrders);
    const availabilityScore = availabilityRatio * 10;
    score += availabilityScore;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get eligible rider candidates for an order
   */
  private async getEligibleRiders(request: AssignmentRequest): Promise<RiderCandidate[]> {
    // Get all online riders with current location and capacity
    const eligibleRiders = await db
      .select()
      .from(riders)
      .where(
        and(
          eq(riders.isOnline, true),
          eq(riders.isAvailableForOrders, true),
          eq(riders.isVerified, true)
        )
      );

    const candidates: RiderCandidate[] = [];

    for (const rider of eligibleRiders) {
      // Skip riders who are at capacity
      if ((rider.activeOrdersCount || 0) >= (rider.maxActiveOrders || 3)) {
        continue;
      }

      // Skip riders without current location
      if (!rider.currentLocation || typeof rider.currentLocation !== 'object') {
        continue;
      }

      const location = rider.currentLocation as {lat: number, lng: number};
      
      // Calculate distance to restaurant (pickup location)
      const distance = this.calculateDistance(
        location.lat,
        location.lng,
        request.restaurantLocation.lat,
        request.restaurantLocation.lng
      );

      // Skip riders outside max distance
      const maxDistance = request.maxDistance || 10;
      if (distance > maxDistance) {
        continue;
      }

      const candidate: Omit<RiderCandidate, 'assignmentScore'> = {
        riderId: rider.id,
        distance,
        performanceScore: Number(rider.performanceScore) || 0,
        isOnline: rider.isOnline || false,
        activeOrdersCount: rider.activeOrdersCount || 0,
        maxActiveOrders: rider.maxActiveOrders || 3,
        rating: Number(rider.rating) || 0,
        onTimeDeliveryRate: Number(rider.onTimeDeliveryRate) || 0,
        currentLocation: location,
      };

      const assignmentScore = this.calculateAssignmentScore(candidate, request);

      candidates.push({
        ...candidate,
        assignmentScore
      });
    }

    // Sort by assignment score (highest first)
    return candidates.sort((a, b) => b.assignmentScore - a.assignmentScore);
  }

  /**
   * Create assignment queue entry for an order
   */
  async createAssignment(request: AssignmentRequest): Promise<string | null> {
    try {
      // Check if assignment already exists for this order
      const existingAssignment = await db
        .select()
        .from(riderAssignmentQueue)
        .where(eq(riderAssignmentQueue.orderId, request.orderId))
        .limit(1);

      if (existingAssignment.length > 0) {
        return existingAssignment[0].id;
      }

      // Get eligible riders
      const candidates = await this.getEligibleRiders(request);

      if (candidates.length === 0) {
        console.log(`No eligible riders found for order ${request.orderId}`);
        
        // Create assignment entry without assigned rider (will be picked up by retry mechanism)
        const [assignment] = await db
          .insert(riderAssignmentQueue)
          .values({
            orderId: request.orderId,
            priority: request.priority,
            maxDistance: request.maxDistance?.toString() || "10",
            estimatedValue: request.estimatedValue.toString(),
            restaurantLocation: request.restaurantLocation,
            deliveryLocation: request.deliveryLocation,
            assignmentStatus: "pending",
            assignmentAttempts: 0,
            rejectedByRiders: [],
            timeoutAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes timeout
          })
          .returning({ id: riderAssignmentQueue.id });

        return assignment.id;
      }

      // Assign to best candidate
      const bestCandidate = candidates[0];
      
      const [assignment] = await db
        .insert(riderAssignmentQueue)
        .values({
          orderId: request.orderId,
          assignedRiderId: bestCandidate.riderId,
          priority: request.priority,
          maxDistance: request.maxDistance?.toString() || "10",
          estimatedValue: request.estimatedValue.toString(),
          restaurantLocation: request.restaurantLocation,
          deliveryLocation: request.deliveryLocation,
          assignmentStatus: "assigned",
          assignmentAttempts: 1,
          rejectedByRiders: [],
          assignedAt: new Date(),
          timeoutAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
        })
        .returning({ id: riderAssignmentQueue.id });

      console.log(`Assigned order ${request.orderId} to rider ${bestCandidate.riderId} with score ${bestCandidate.assignmentScore}`);
      
      return assignment.id;
    } catch (error) {
      console.error("Error creating rider assignment:", error);
      return null;
    }
  }

  /**
   * Handle rider rejection and reassign to next best candidate
   */
  async handleRejection(assignmentId: string, rejectedRiderId: string): Promise<boolean> {
    try {
      const [assignment] = await db
        .select()
        .from(riderAssignmentQueue)
        .where(eq(riderAssignmentQueue.id, assignmentId))
        .limit(1);

      if (!assignment) {
        return false;
      }

      // Get current rejected riders list
      const rejectedRiders = (assignment.rejectedByRiders as string[]) || [];
      rejectedRiders.push(rejectedRiderId);

      // Get order details for reassignment
      const request: AssignmentRequest = {
        orderId: assignment.orderId,
        restaurantLocation: assignment.restaurantLocation as {lat: number, lng: number},
        deliveryLocation: assignment.deliveryLocation as {lat: number, lng: number},
        priority: assignment.priority ?? 1,
        estimatedValue: Number(assignment.estimatedValue ?? 0),
        maxDistance: Number(assignment.maxDistance ?? 10)
      };

      // Get eligible riders excluding rejected ones
      const allCandidates = await this.getEligibleRiders(request);
      const availableCandidates = allCandidates.filter(
        candidate => !rejectedRiders.includes(candidate.riderId)
      );

      if (availableCandidates.length === 0) {
        // No more candidates, mark as timeout
        await db
          .update(riderAssignmentQueue)
          .set({
            assignmentStatus: "timeout",
            rejectedByRiders: rejectedRiders,
            assignmentAttempts: (assignment.assignmentAttempts || 0) + 1
          })
          .where(eq(riderAssignmentQueue.id, assignmentId));

        return false;
      }

      // Assign to next best candidate
      const nextCandidate = availableCandidates[0];
      
      await db
        .update(riderAssignmentQueue)
        .set({
          assignedRiderId: nextCandidate.riderId,
          assignmentStatus: "assigned",
          rejectedByRiders: rejectedRiders,
          assignmentAttempts: (assignment.assignmentAttempts || 0) + 1,
          assignedAt: new Date(),
          timeoutAt: new Date(Date.now() + 2 * 60 * 1000) // 2 minutes to accept
        })
        .where(eq(riderAssignmentQueue.id, assignmentId));

      console.log(`Reassigned order ${assignment.orderId} to rider ${nextCandidate.riderId} after rejection`);
      
      return true;
    } catch (error) {
      console.error("Error handling rider rejection:", error);
      return false;
    }
  }

  /**
   * Accept assignment and update rider status
   * RIDER-FIRST FLOW: This is the key method that triggers vendor notification
   */
  async acceptAssignment(assignmentId: string, riderId: string): Promise<{ success: boolean; order?: any }> {
    try {
      const [assignment] = await db
        .select()
        .from(riderAssignmentQueue)
        .where(
          and(
            eq(riderAssignmentQueue.id, assignmentId),
            eq(riderAssignmentQueue.assignedRiderId, riderId)
          )
        )
        .limit(1);

      if (!assignment || assignment.assignmentStatus !== "assigned") {
        return { success: false };
      }

      // Get rider data first
      const [riderData] = await db
        .select()
        .from(riders)
        .where(eq(riders.id, riderId))
        .limit(1);

      if (!riderData) {
        return { success: false };
      }

      // Update assignment status
      await db
        .update(riderAssignmentQueue)
        .set({
          assignmentStatus: "accepted",
          acceptedAt: new Date()
        })
        .where(eq(riderAssignmentQueue.id, assignmentId));

      // Update rider's active orders count
      await db
        .update(riders)
        .set({
          activeOrdersCount: (riderData.activeOrdersCount || 0) + 1
        })
        .where(eq(riders.id, riderId));

      // RIDER-FIRST FLOW: Update order status and assign rider
      // This is when the vendor gets notified - AFTER rider accepts
      const [updatedOrder] = await db
        .update(orders)
        .set({
          status: "confirmed",
          riderId: riderId,
          riderAcceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(orders.id, assignment.orderId))
        .returning();

      console.log(`[Rider-First] Rider ${riderId} accepted assignment ${assignmentId} for order ${assignment.orderId}`);
      console.log(`[Rider-First] Order ${assignment.orderId} status changed to 'confirmed', vendor will be notified`);

      return { success: true, order: updatedOrder };
    } catch (error) {
      console.error("Error accepting assignment:", error);
      return { success: false };
    }
  }

  /**
   * Get pending assignments for a rider
   */
  async getRiderPendingAssignments(riderId: string) {
    try {
      return await db
        .select({
          id: riderAssignmentQueue.id,
          orderId: riderAssignmentQueue.orderId,
          priority: riderAssignmentQueue.priority,
          estimatedValue: riderAssignmentQueue.estimatedValue,
          restaurantLocation: riderAssignmentQueue.restaurantLocation,
          deliveryLocation: riderAssignmentQueue.deliveryLocation,
          assignedAt: riderAssignmentQueue.assignedAt,
          timeoutAt: riderAssignmentQueue.timeoutAt,
        })
        .from(riderAssignmentQueue)
        .where(
          and(
            eq(riderAssignmentQueue.assignedRiderId, riderId),
            eq(riderAssignmentQueue.assignmentStatus, "assigned")
          )
        )
        .orderBy(desc(riderAssignmentQueue.priority), asc(riderAssignmentQueue.assignedAt));
    } catch (error) {
      console.error("Error getting rider pending assignments:", error);
      return [];
    }
  }

  /**
   * Update rider location and trigger reassignment for nearby pending orders
   */
  async updateRiderLocation(riderId: string, location: {lat: number, lng: number, accuracy?: number}) {
    try {
      // Update rider's current location (location includes timestamp)
      await db
        .update(riders)
        .set({
          currentLocation: { ...location, timestamp: new Date().toISOString() },
          lastActivityAt: new Date()
        })
        .where(eq(riders.id, riderId));

      // Log location history
      await db
        .insert(riderLocationHistory)
        .values({
          riderId,
          location: {
            ...location,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date(),
          activityType: "idle"
        });

      // Check for pending assignments that might now be within range
      const pendingAssignments = await db
        .select()
        .from(riderAssignmentQueue)
        .where(
          and(
            eq(riderAssignmentQueue.assignmentStatus, "pending"),
            isNull(riderAssignmentQueue.assignedRiderId)
          )
        );

      // Try to assign pending orders to this rider if they're now in range
      for (const assignment of pendingAssignments) {
        const restaurantLocation = assignment.restaurantLocation as {lat: number, lng: number};
        const distance = this.calculateDistance(
          location.lat,
          location.lng,
          restaurantLocation.lat,
          restaurantLocation.lng
        );

        const maxDistance = Number(assignment.maxDistance || "10");
        if (distance <= maxDistance) {
          // This rider is now in range, trigger reassignment
          const request: AssignmentRequest = {
            orderId: assignment.orderId,
            restaurantLocation,
            deliveryLocation: assignment.deliveryLocation as {lat: number, lng: number},
            priority: assignment.priority ?? 1,
            estimatedValue: Number(assignment.estimatedValue ?? 0),
            maxDistance
          };

          await this.createAssignment(request);
        }
      }

      return true;
    } catch (error) {
      console.error("Error updating rider location:", error);
      return false;
    }
  }

  /**
   * Clean up expired assignments
   */
  async cleanupExpiredAssignments() {
    try {
      const now = new Date();
      
      // Find expired assignments
      const expiredAssignments = await db
        .select()
        .from(riderAssignmentQueue)
        .where(
          and(
            or(
              eq(riderAssignmentQueue.assignmentStatus, "assigned"),
              eq(riderAssignmentQueue.assignmentStatus, "pending")
            ),
            lte(riderAssignmentQueue.timeoutAt, now)
          )
        );

      for (const assignment of expiredAssignments) {
        await db
          .update(riderAssignmentQueue)
          .set({
            assignmentStatus: "timeout"
          })
          .where(eq(riderAssignmentQueue.id, assignment.id));

        console.log(`Assignment ${assignment.id} expired for order ${assignment.orderId}`);
      }

      return expiredAssignments.length;
    } catch (error) {
      console.error("Error cleaning up expired assignments:", error);
      return 0;
    }
  }
}

export const riderAssignmentService = new RiderAssignmentService();