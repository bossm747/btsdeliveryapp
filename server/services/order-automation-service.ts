import { DatabaseStorage } from '../storage.js';
import { orderNotificationService } from './notification-service.js';
import { riderAssignmentService } from '../riderAssignmentService.js';
import { pricingService } from './pricing.js';
import type { Order, Rider, Restaurant, User } from '../../shared/schema.js';

export interface SLATargets {
  orderAcceptance: number; // minutes for restaurant to accept
  preparationTime: number; // minutes to prepare order
  riderAssignment: number; // minutes to assign rider
  pickupTime: number; // minutes for rider to pickup
  deliveryTime: number; // minutes for final delivery
  totalDeliveryTime: number; // end-to-end delivery time
}

export interface OrderPriority {
  level: 'low' | 'normal' | 'high' | 'express' | 'critical';
  multiplier: number; // fee multiplier
  slaReduction: number; // percentage reduction in SLA times
  assignmentPriority: number; // higher = assigned first
}

export interface BusinessRuleViolation {
  type: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  action: 'block' | 'warn' | 'monitor';
}

export class OrderAutomationService {
  private storage = new DatabaseStorage();
  private slaTargets: { [orderType: string]: SLATargets } = {
    food: {
      orderAcceptance: 5,
      preparationTime: 20,
      riderAssignment: 10,
      pickupTime: 15,
      deliveryTime: 30,
      totalDeliveryTime: 60
    },
    pabili: {
      orderAcceptance: 10,
      preparationTime: 30,
      riderAssignment: 15,
      pickupTime: 20,
      deliveryTime: 45,
      totalDeliveryTime: 90
    },
    pabayad: {
      orderAcceptance: 15,
      preparationTime: 5,
      riderAssignment: 10,
      pickupTime: 15,
      deliveryTime: 30,
      totalDeliveryTime: 45
    },
    parcel: {
      orderAcceptance: 20,
      preparationTime: 10,
      riderAssignment: 15,
      pickupTime: 20,
      deliveryTime: 60,
      totalDeliveryTime: 120
    }
  };

  private priorityLevels: { [key: string]: OrderPriority } = {
    low: { level: 'low', multiplier: 0.9, slaReduction: 0, assignmentPriority: 1 },
    normal: { level: 'normal', multiplier: 1.0, slaReduction: 0, assignmentPriority: 5 },
    high: { level: 'high', multiplier: 1.2, slaReduction: 10, assignmentPriority: 8 },
    express: { level: 'express', multiplier: 1.5, slaReduction: 25, assignmentPriority: 10 },
    critical: { level: 'critical', multiplier: 2.0, slaReduction: 40, assignmentPriority: 15 }
  };

  // ============= ORDER PLACEMENT AUTOMATION =============

  async processOrderPlacement(orderId: string): Promise<{ success: boolean; violations: BusinessRuleViolation[] }> {
    try {
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Validate business rules
      const violations = await this.validateBusinessRules(order);
      
      // Check for blocking violations
      const blockingViolations = violations.filter(v => v.action === 'block');
      if (blockingViolations.length > 0) {
        await this.handleOrderBlocked(order, blockingViolations);
        return { success: false, violations };
      }

      // Process order with business logic
      await this.applyBusinessLogic(order);
      
      // Send placement notifications
      await this.notifyOrderPlacement(order);
      
      // Start SLA monitoring
      await this.startSLAMonitoring(order);
      
      // Initiate automatic assignment process
      await this.initiateAssignmentProcess(order);

      return { success: true, violations };
      
    } catch (error) {
      console.error('Order placement automation failed:', error);
      throw error;
    }
  }

  // ============= BUSINESS RULE VALIDATION =============

  private async validateBusinessRules(order: Order): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];

    // Check restaurant operational status
    const restaurant = await this.storage.getRestaurant(order.restaurantId);
    if (!restaurant) {
      violations.push({
        type: 'restaurant_not_found',
        severity: 'critical',
        message: 'Restaurant not found in system',
        action: 'block'
      });
      return violations;
    }

    if (!restaurant.isActive) {
      violations.push({
        type: 'restaurant_inactive',
        severity: 'error',
        message: 'Restaurant is currently inactive',
        action: 'block'
      });
    }

    // Check operating hours
    const isWithinHours = await this.checkRestaurantHours(restaurant, order.createdAt ? new Date(order.createdAt) : new Date());
    if (!isWithinHours) {
      violations.push({
        type: 'outside_operating_hours',
        severity: 'error',
        message: 'Order placed outside restaurant operating hours',
        action: 'block'
      });
    }

    // Check inventory availability (for food orders)  
    if ((order as any).type === 'food') {
      const inventoryIssues = await this.checkInventoryAvailability(order);
      violations.push(...inventoryIssues);
    }

    // Check delivery area
    const isInDeliveryArea = await this.checkDeliveryArea(order);
    if (!isInDeliveryArea) {
      violations.push({
        type: 'outside_delivery_area',
        severity: 'error',
        message: 'Delivery address is outside service area',
        action: 'block'
      });
    }

    // Check minimum order value
    const minimumOrderValue = Number(restaurant.minimumOrder) || 0;
    if (Number(order.totalAmount) < minimumOrderValue) {
      violations.push({
        type: 'below_minimum_order',
        severity: 'error',
        message: `Order value below minimum (₱${minimumOrderValue})`,
        action: 'block'
      });
    }

    // Check peak hour surcharges
    const peakHourViolations = await this.checkPeakHourRules(order);
    violations.push(...peakHourViolations);

    // Check customer order limits
    const customerViolations = await this.checkCustomerLimits(order);
    violations.push(...customerViolations);

    return violations;
  }

  private async checkRestaurantHours(restaurant: Restaurant, orderTime: Date): Promise<boolean> {
    // Simplified check - in a real system this would check detailed operating hours
    const hour = orderTime.getHours();
    return hour >= 6 && hour <= 22; // 6 AM to 10 PM default
  }

  private async checkInventoryAvailability(order: Order): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];
    
    // Check each item's availability
    for (const item of (order as any).items || []) {
      // In a real system, this would check actual inventory
      const mockUnavailableItems = ['burger', 'pizza']; // Example
      
      if (mockUnavailableItems.some(name => item.name.toLowerCase().includes(name))) {
        violations.push({
          type: 'item_unavailable',
          severity: 'warning',
          message: `Item "${item.name}" may not be available`,
          action: 'warn'
        });
      }
    }
    
    return violations;
  }

  private async checkDeliveryArea(order: Order): Promise<boolean> {
    // Simplified distance check
    // In a real system, this would use proper geofencing
    const deliveryAddress = (order as any).deliveryAddress;
    
    // Mock delivery area check for Metro Manila cities
    const serviceCities = [
      'Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 
      'Marikina', 'San Juan', 'Mandaluyong', 'Pasay'
    ];
    
    return serviceCities.includes(deliveryAddress.city);
  }

  private async checkPeakHourRules(order: Order): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];
    const orderHour = new Date(order.createdAt || new Date()).getHours();
    
    // Peak hours: 11AM-1PM, 6PM-8PM
    const isPeakHour = (orderHour >= 11 && orderHour <= 13) || 
                       (orderHour >= 18 && orderHour <= 20);
    
    if (isPeakHour && (order as any).priority !== 'express') {
      violations.push({
        type: 'peak_hour_delay',
        severity: 'warning',
        message: 'Order placed during peak hours - expect delays',
        action: 'monitor'
      });
    }
    
    return violations;
  }

  private async checkCustomerLimits(order: Order): Promise<BusinessRuleViolation[]> {
    const violations: BusinessRuleViolation[] = [];
    
    // Check daily order limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayOrders = await this.storage.getOrdersByCustomer(order.customerId || '');
    if (todayOrders.length >= 10) {
      violations.push({
        type: 'daily_order_limit',
        severity: 'warning',
        message: 'Customer approaching daily order limit',
        action: 'monitor'
      });
    }
    
    return violations;
  }

  // ============= BUSINESS LOGIC APPLICATION =============

  private async applyBusinessLogic(order: Order): Promise<void> {
    // Apply priority-based SLA adjustments
    const priority = this.priorityLevels[(order as any).priority || 'normal'];
    const slaTargets = this.slaTargets[(order as any).type || 'food'];
    
    // Calculate adjusted delivery time
    const adjustmentFactor = (100 - priority.slaReduction) / 100;
    const adjustedDeliveryTime = slaTargets.totalDeliveryTime * adjustmentFactor;
    
    const estimatedDeliveryTime = new Date(order.createdAt || new Date());
    estimatedDeliveryTime.setMinutes(estimatedDeliveryTime.getMinutes() + adjustedDeliveryTime);
    
    // Update order with calculated delivery time
    await this.storage.updateOrder(order.id, {
      estimatedDeliveryTime
    });

    // Apply surge pricing if in peak hours
    await this.applySurgePricing(order);
  }

  private async applySurgePricing(order: Order): Promise<void> {
    const orderHour = new Date(order.createdAt || new Date()).getHours();
    const isPeakHour = (orderHour >= 11 && orderHour <= 13) || 
                       (orderHour >= 18 && orderHour <= 20);
    
    if (isPeakHour) {
      const surgeMultiplier = 1.2; // 20% increase during peak hours
      const originalDeliveryFee = order.deliveryFee;
      const surgedDeliveryFee = Number(originalDeliveryFee) * surgeMultiplier;
      
      await this.storage.updateOrder(order.id, {
        deliveryFee: surgedDeliveryFee.toString(),
        totalAmount: (Number(order.totalAmount) - Number(originalDeliveryFee) + surgedDeliveryFee).toString()
      });
    }
  }

  // ============= AUTOMATIC ORDER ASSIGNMENT =============

  async initiateAssignmentProcess(order: Order): Promise<void> {
    setTimeout(async () => {
      await this.processAutomaticAssignment(order.id);
    }, 2 * 60 * 1000); // Wait 2 minutes for manual acceptance
  }

  private async processAutomaticAssignment(orderId: string): Promise<void> {
    try {
      const order = await this.storage.getOrder(orderId);
      if (!order || order.status !== 'pending') return;

      // Check if restaurant accepted - removed duplicate check

      // Auto-assign to nearest available restaurant
      const nearbyRestaurants = await this.findNearbyRestaurants(order);
      
      if (nearbyRestaurants.length === 0) {
        await this.handleNoRestaurantsAvailable(order);
        return;
      }

      // Try to assign to the best available restaurant
      for (const restaurant of nearbyRestaurants) {
        const success = await this.attemptRestaurantAssignment(order, restaurant);
        if (success) {
          break;
        }
      }
      
      // If no restaurant accepts after attempts, escalate
      setTimeout(async () => {
        const updatedOrder = await this.storage.getOrder(orderId);
        if (updatedOrder && updatedOrder.status === 'pending') {
          await this.escalateUnassignedOrder(updatedOrder);
        }
      }, 10 * 60 * 1000); // Escalate after 10 more minutes
      
    } catch (error) {
      console.error('Automatic assignment failed:', error);
    }
  }

  private async findNearbyRestaurants(order: Order): Promise<Restaurant[]> {
    // In a real system, this would use geospatial queries
    const deliveryAddress = order.deliveryAddress as any;
    const allRestaurants = await this.storage.getRestaurantsByLocation(deliveryAddress?.city || '');
    
    return allRestaurants
      .filter(r => r.isActive && (r as any).acceptsOrders !== false)
      .sort((a, b) => {
        // Sort by rating and distance (simplified)
        return Number(b.rating || 0) - Number(a.rating || 0);
      })
      .slice(0, 5); // Top 5 candidates
  }

  private async attemptRestaurantAssignment(order: Order, restaurant: Restaurant): Promise<boolean> {
    try {
      // Send assignment notification to restaurant
      await orderNotificationService.notifyNewOrder(
        restaurant.email || '',
        restaurant.phone || '',
        {
          orderId: order.id,
          orderNumber: order.orderNumber || '',
          status: order.status,
          customerName: (order as any).customerName || '',
          customerEmail: (order as any).customerEmail || '',
          customerPhone: (order as any).customerPhone || '',
          restaurantName: restaurant.name,
          totalAmount: Number(order.totalAmount),
          estimatedDeliveryTime: order.estimatedDeliveryTime || undefined,
          deliveryAddress: order.deliveryAddress as any,
          items: (order.items as any) || [],
          urgency: 'medium'
        }
      );

      // Wait for acceptance (with timeout)
      return await this.waitForRestaurantResponse(order.id, restaurant.id, 5 * 60 * 1000);
      
    } catch (error) {
      console.error('Restaurant assignment attempt failed:', error);
      return false;
    }
  }

  private async waitForRestaurantResponse(orderId: string, restaurantId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkInterval = setInterval(async () => {
        const order = await this.storage.getOrder(orderId);
        
        if (!order) {
          clearInterval(checkInterval);
          resolve(false);
          return;
        }

        if (order.status === 'confirmed' && order.restaurantId === restaurantId) {
          clearInterval(checkInterval);
          resolve(true);
          return;
        }

        if (order.status === 'cancelled' || Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
          return;
        }
      }, 10000); // Check every 10 seconds
    });
  }

  // ============= SLA MONITORING =============

  async startSLAMonitoring(order: Order): Promise<void> {
    const slaTargets = this.slaTargets[(order as any).type || 'food'];
    const priority = this.priorityLevels[(order as any).priority || 'normal'];
    const adjustmentFactor = (100 - priority.slaReduction) / 100;

    // Schedule SLA checks
    this.scheduleSLACheck(order, 'acceptance', slaTargets.orderAcceptance * adjustmentFactor);
    this.scheduleSLACheck(order, 'preparation', slaTargets.preparationTime * adjustmentFactor);
    this.scheduleSLACheck(order, 'rider_assignment', slaTargets.riderAssignment * adjustmentFactor);
    this.scheduleSLACheck(order, 'pickup', slaTargets.pickupTime * adjustmentFactor);
    this.scheduleSLACheck(order, 'delivery', slaTargets.totalDeliveryTime * adjustmentFactor);
  }

  private scheduleSLACheck(order: Order, checkType: string, minutes: number): void {
    setTimeout(async () => {
      await this.performSLACheck(order.id, checkType);
    }, minutes * 60 * 1000);
  }

  private async performSLACheck(orderId: string, checkType: string): Promise<void> {
    try {
      const order = await this.storage.getOrder(orderId);
      if (!order || order.status === 'cancelled' || order.status === 'delivered') {
        return;
      }

      const slaViolation = await this.checkSLAViolation(order, checkType);
      
      if (slaViolation) {
        await this.handleSLAViolation(order, checkType, slaViolation);
      }
      
      // Record performance metrics
      await this.recordSLAPerformance(order, checkType, slaViolation);
      
    } catch (error) {
      console.error('SLA check failed:', error);
    }
  }

  private async checkSLAViolation(order: Order, checkType: string): Promise<any> {
    const now = new Date();
    const orderTime = order.createdAt ? new Date(order.createdAt) : new Date();
    const elapsedMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
    
    const slaTargets = this.slaTargets[(order as any).type || 'food'];
    const priority = this.priorityLevels[(order as any).priority || 'normal'];
    const adjustmentFactor = (100 - priority.slaReduction) / 100;

    let targetMinutes: number;
    let expectedStatus: string[];

    switch (checkType) {
      case 'acceptance':
        targetMinutes = slaTargets.orderAcceptance * adjustmentFactor;
        expectedStatus = ['confirmed', 'preparing'];
        break;
      case 'preparation':
        targetMinutes = slaTargets.preparationTime * adjustmentFactor;
        expectedStatus = ['ready', 'picked_up', 'in_transit', 'delivered'];
        break;
      case 'rider_assignment':
        targetMinutes = slaTargets.riderAssignment * adjustmentFactor;
        expectedStatus = ['picked_up', 'in_transit', 'delivered'];
        break;
      case 'pickup':
        targetMinutes = slaTargets.pickupTime * adjustmentFactor;
        expectedStatus = ['in_transit', 'delivered'];
        break;
      case 'delivery':
        targetMinutes = slaTargets.totalDeliveryTime * adjustmentFactor;
        expectedStatus = ['delivered'];
        break;
      default:
        return null;
    }

    if (elapsedMinutes > targetMinutes && !expectedStatus.includes(order.status)) {
      return {
        checkType,
        targetMinutes,
        actualMinutes: elapsedMinutes,
        delayMinutes: elapsedMinutes - targetMinutes,
        expectedStatus,
        actualStatus: order.status
      };
    }

    return null;
  }

  private async handleSLAViolation(order: Order, checkType: string, violation: any): Promise<void> {
    // Notify admins
    const adminEmails = await this.getAdminEmails();
    await orderNotificationService.notifySLAViolation(
      adminEmails,
      {
        orderId: order.id,
        orderNumber: order.orderNumber || '',
        status: order.status,
        customerName: (order as any).customerName || '',
        customerEmail: (order as any).customerEmail || '',
        customerPhone: (order as any).customerPhone || '',
        restaurantName: (order as any).restaurantName || '',
        totalAmount: Number(order.totalAmount),
        deliveryAddress: order.deliveryAddress,
        items: Array.isArray(order.items) ? order.items : [],
        urgency: 'high',
        violationType: checkType,
        expectedTime: new Date(Date.now() - violation.targetMinutes * 60 * 1000),
        actualTime: new Date()
      }
    );

    // Take corrective actions based on violation type
    await this.takeCorrectiveAction(order, checkType, violation);
  }

  private async takeCorrectiveAction(order: Order, checkType: string, violation: any): Promise<void> {
    switch (checkType) {
      case 'acceptance':
        // Escalate to other restaurants
        await this.escalateToAlternativeRestaurants(order);
        break;
      case 'rider_assignment':
        // Increase rider incentives
        await this.increaseRiderIncentives(order);
        break;
      case 'delivery':
        // Notify customer and offer compensation
        await this.offerCustomerCompensation(order, violation);
        break;
    }
  }

  // ============= HELPER METHODS =============

  private async notifyOrderPlacement(order: Order): Promise<void> {
    await orderNotificationService.notifyOrderPlaced({
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      status: order.status,
      customerName: (order as any).customerName || '',
      customerEmail: (order as any).customerEmail || '',
      customerPhone: (order as any).customerPhone || '',
      restaurantName: (order as any).restaurantName || '',
      totalAmount: Number(order.totalAmount),
      estimatedDeliveryTime: order.estimatedDeliveryTime || undefined,
      deliveryAddress: order.deliveryAddress as any,
      items: (order.items as any) || [],
      urgency: 'medium'
    });
  }

  private async handleOrderBlocked(order: Order, violations: BusinessRuleViolation[]): Promise<void> {
    await this.storage.updateOrder(order.id, {
      status: 'cancelled'
    });

    // Notify customer about cancellation
    await orderNotificationService.notifyOrderStatusChange({
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      status: 'cancelled',
      customerName: (order as any).customerName || '',
      customerEmail: (order as any).customerEmail || '',
      customerPhone: (order as any).customerPhone || '',
      restaurantName: (order as any).restaurantName || '',
      totalAmount: Number(order.totalAmount),
      deliveryAddress: order.deliveryAddress as any,
      items: (order.items as any) || [],
      message: 'Order cancelled due to business rule violations',
      urgency: 'high'
    });
  }

  private async handleNoRestaurantsAvailable(order: Order): Promise<void> {
    await this.storage.updateOrder(order.id, {
      status: 'cancelled'
    });

    await orderNotificationService.notifyOrderStatusChange({
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      status: 'cancelled',
      customerName: (order as any).customerName || '',
      customerEmail: (order as any).customerEmail || '',
      customerPhone: (order as any).customerPhone || '',
      restaurantName: (order as any).restaurantName || '',
      totalAmount: Number(order.totalAmount),
      deliveryAddress: order.deliveryAddress as any,
      items: (order.items as any) || [],
      message: 'Unfortunately, no restaurants are available to fulfill your order at this time',
      urgency: 'high'
    });
  }

  private async escalateUnassignedOrder(order: Order): Promise<void> {
    // Mark as high priority and notify admins
    await this.storage.updateOrder(order.id, {
      status: 'pending'
    });

    const adminEmails = await this.getAdminEmails();
    await orderNotificationService.notifyOrderIssue(adminEmails, {
      orderId: order.id,
      orderNumber: order.orderNumber || '',
      status: order.status,
      customerName: (order as any).customerName || '',
      customerEmail: (order as any).customerEmail || '',
      customerPhone: (order as any).customerPhone || '',
      restaurantName: (order as any).restaurantName || '',
      totalAmount: Number(order.totalAmount),
      deliveryAddress: order.deliveryAddress as any,
      items: (order.items as any) || [],
      urgency: 'critical',
      issueType: 'unassigned_order',
      issueDescription: 'Order remains unassigned after automatic assignment attempts'
    });
  }

  private async escalateToAlternativeRestaurants(order: Order): Promise<void> {
    // Implementation for finding alternative restaurants
    console.log(`Escalating order ${order.orderNumber} to alternative restaurants`);
  }

  private async increaseRiderIncentives(order: Order): Promise<void> {
    // Implementation for increasing rider incentives
    console.log(`Increasing rider incentives for order ${order.orderNumber}`);
  }

  private async offerCustomerCompensation(order: Order, violation: any): Promise<void> {
    // Implementation for customer compensation
    console.log(`Offering compensation for delayed order ${order.orderNumber}`);
  }

  private async getAdminEmails(): Promise<string[]> {
    // Get admin user emails - fallback to empty array if method doesn't exist
    try {
      const admins = await (this.storage as any).getUsersByRole?.('admin') || [];
      return admins.map((admin: any) => admin.email).filter(Boolean);
    } catch {
      return [];
    }
  }

  private async recordSLAPerformance(order: Order, checkType: string, violation: any): Promise<void> {
    // Record performance metrics for analytics - fallback if method doesn't exist
    try {
      await (this.storage as any).recordOrderPerformanceMetrics?.({
        orderId: order.id,
        checkType,
        targetTime: violation ? violation.targetMinutes : null,
        actualTime: violation ? violation.actualMinutes : null,
        violation: !!violation,
        timestamp: new Date()
      });
    } catch {
      console.log('Performance metrics recording not available');
    }
  }
}

// Export singleton instance
export const orderAutomationService = new OrderAutomationService();