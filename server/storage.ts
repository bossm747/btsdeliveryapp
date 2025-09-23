import { 
  users, 
  restaurants, 
  menuCategories, 
  menuItems, 
  orders, 
  orderStatusHistory, 
  riders, 
  reviews,
  riderLocationHistory,
  riderAssignmentQueue,
  riderPerformanceMetrics,
  adminAuditLogs,
  commissionRules,
  systemAlerts,
  supportTickets,
  supportMessages,
  deliveryZones,
  platformConfig,
  financialSettlements,
  systemHealthMetrics,
  broadcastMessages,
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type MenuCategory,
  type InsertMenuCategory,
  type MenuItem,
  type InsertMenuItem,
  type Order,
  type InsertOrder,
  type OrderStatusHistory,
  type Rider,
  type InsertRider,
  type Review,
  type InsertReview,
  type RiderLocationHistory,
  type InsertRiderLocationHistory,
  type RiderAssignmentQueue,
  type InsertRiderAssignmentQueue,
  type RiderPerformanceMetrics,
  type InsertRiderPerformanceMetrics,
  type SelectAdminAuditLog,
  type InsertAdminAuditLog,
  type SelectCommissionRule,
  type InsertCommissionRule,
  type SelectSystemAlert,
  type InsertSystemAlert,
  type SelectSupportTicket,
  type InsertSupportTicket,
  type SelectSupportMessage,
  type InsertSupportMessage,
  type SelectDeliveryZone,
  type InsertDeliveryZone,
  type SelectPlatformConfig,
  type InsertPlatformConfig,
  type SelectFinancialSettlement,
  type InsertFinancialSettlement,
  type SelectSystemHealthMetric,
  type InsertSystemHealthMetric,
  type SelectBroadcastMessage,
  type InsertBroadcastMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  // Restaurant operations
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: string): Promise<Restaurant | undefined>;
  getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]>;
  getRestaurantsByLocation(city: string): Promise<Restaurant[]>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | undefined>;

  // Menu operations
  getMenuCategories(restaurantId: string): Promise<MenuCategory[]>;
  getMenuItems(restaurantId: string): Promise<MenuItem[]>;
  getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;

  // Order operations
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, notes?: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;

  // Rider operations
  getRiders(): Promise<Rider[]>;
  getRider(id: string): Promise<Rider | undefined>;
  getRiderByUserId(userId: string): Promise<Rider | undefined>;
  createRider(rider: InsertRider): Promise<Rider>;
  updateRider(id: string, updates: Partial<Rider>): Promise<Rider | undefined>;

  // Review operations
  getReviewsByRestaurant(restaurantId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // BTS Operations
  getBtsRiders(): Promise<any[]>;
  createBtsRider(rider: any): Promise<any>;
  getBtsSalesRemittance(): Promise<any[]>;
  createBtsSalesRemittance(sale: any): Promise<any>;
  getBtsAttendance(): Promise<any[]>;
  createBtsAttendance(attendance: any): Promise<any>;
  getBtsIncentives(): Promise<any[]>;
  createBtsIncentive(incentive: any): Promise<any>;

  // Advanced Rider Tracking Operations
  createRiderLocationHistory(location: InsertRiderLocationHistory): Promise<RiderLocationHistory>;
  getRiderCurrentLocation(riderId: string): Promise<RiderLocationHistory | undefined>;
  getRiderLocationHistory(riderId: string, hours: number): Promise<RiderLocationHistory[]>;
  updateRiderStatus(riderId: string, updates: { isOnline?: boolean }): Promise<Rider | undefined>;
  
  createRiderSession(session: InsertRiderSession): Promise<RiderSession>;
  endRiderSession(riderId: string, endData: any): Promise<RiderSession | undefined>;
  
  getAvailableRiders(lat: number, lng: number, radiusKm: number): Promise<Rider[]>;
  getOnlineRiders(): Promise<Rider[]>;
  
  createOrderAssignment(assignment: InsertOrderAssignment): Promise<OrderAssignment>;
  updateOrderAssignmentStatus(assignmentId: string, status: string, rejectionReason?: string): Promise<OrderAssignment | undefined>;
  
  createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking>;
  updateDeliveryTracking(orderId: string, updates: any): Promise<DeliveryTracking | undefined>;
  getDeliveryTracking(orderId: string): Promise<DeliveryTracking | undefined>;
  
  getRiderPerformanceMetrics(riderId: string, startDate?: string, endDate?: string): Promise<RiderPerformanceMetrics[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Restaurant operations
  async getRestaurants(): Promise<Restaurant[]> {
    return await db.select().from(restaurants).where(eq(restaurants.isActive, true)).orderBy(desc(restaurants.isFeatured), restaurants.name);
  }

  async getRestaurant(id: string): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant;
  }

  async getRestaurantsByOwner(ownerId: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants)
      .where(and(
        eq(restaurants.ownerId, ownerId),
        eq(restaurants.isActive, true)
      ))
      .orderBy(desc(restaurants.isFeatured), restaurants.name);
  }

  async getRestaurantsByLocation(city: string): Promise<Restaurant[]> {
    return await db.select().from(restaurants)
      .where(and(
        eq(restaurants.isActive, true),
        sql`${restaurants.address}->>'city' ILIKE ${`%${city}%`}`
      ))
      .orderBy(desc(restaurants.isFeatured), restaurants.name);
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db.insert(restaurants).values(insertRestaurant).returning();
    return restaurant;
  }

  async updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<Restaurant | undefined> {
    const [restaurant] = await db.update(restaurants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant;
  }

  // Menu operations
  async getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
    return await db.select().from(menuCategories)
      .where(and(eq(menuCategories.restaurantId, restaurantId), eq(menuCategories.isActive, true)))
      .orderBy(menuCategories.displayOrder, menuCategories.name);
  }

  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems)
      .where(eq(menuItems.restaurantId, restaurantId))
      .orderBy(menuItems.displayOrder, menuItems.name);
  }

  async getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems)
      .where(eq(menuItems.categoryId, categoryId))
      .orderBy(menuItems.displayOrder, menuItems.name);
  }

  async createMenuCategory(insertCategory: InsertMenuCategory): Promise<MenuCategory> {
    const [category] = await db.insert(menuCategories).values(insertCategory).returning();
    return category;
  }

  async createMenuItem(insertItem: InsertMenuItem): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values(insertItem).returning();
    return item;
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [item] = await db.update(menuItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const orderNumber = `BTS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [order] = await db.insert(orders).values({
      ...insertOrder,
      orderNumber
    }).returning();

    // Add initial status to history
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      status: order.status,
      notes: "Order created"
    });

    return order;
  }

  async updateOrderStatus(id: string, status: string, notes?: string): Promise<Order | undefined> {
    const [order] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    if (order) {
      // Add status change to history
      await db.insert(orderStatusHistory).values({
        orderId: order.id,
        status,
        notes
      });
    }

    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db.update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Rider operations
  async getRiders(): Promise<Rider[]> {
    return await db.select().from(riders).orderBy(riders.isOnline, riders.rating);
  }

  async getRider(id: string): Promise<Rider | undefined> {
    const [rider] = await db.select().from(riders).where(eq(riders.id, id));
    return rider;
  }

  async getRiderByUserId(userId: string): Promise<Rider | undefined> {
    const [rider] = await db.select().from(riders).where(eq(riders.userId, userId));
    return rider;
  }

  async createRider(insertRider: InsertRider): Promise<Rider> {
    const [rider] = await db.insert(riders).values(insertRider).returning();
    return rider;
  }

  async updateRider(id: string, updates: Partial<Rider>): Promise<Rider | undefined> {
    const [rider] = await db.update(riders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(riders.id, id))
      .returning();
    return rider;
  }

  // Review operations
  async getReviewsByRestaurant(restaurantId: string): Promise<Review[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.restaurantId, restaurantId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(insertReview).returning();
    return review;
  }

  // BTS Operations implementation
  async getBtsRiders(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT * FROM bts_riders ORDER BY rider_name ASC
    `);
    return result.rows;
  }

  async createBtsRider(rider: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO bts_riders (rider_name, rider_code, phone_number, email, vehicle_type, commission_rate, base_salary)
      VALUES (${rider.riderName}, ${rider.riderCode}, ${rider.phoneNumber}, ${rider.email}, ${rider.vehicleType}, ${rider.commissionRate}, ${rider.baseSalary})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getBtsSalesRemittance(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT sr.*, r.rider_name 
      FROM bts_sales_remittance sr
      JOIN bts_riders r ON sr.rider_id = r.id
      ORDER BY sr.remit_date DESC
    `);
    return result.rows;
  }

  async createBtsSalesRemittance(sale: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO bts_sales_remittance (rider_id, remit_date, daily_sales, commission_amount, remitted_amount, balance, week_period, reference_number)
      VALUES (${sale.riderId}, ${sale.remitDate}, ${sale.dailySales}, ${sale.commissionAmount}, ${sale.remittedAmount}, ${sale.balance}, ${sale.weekPeriod}, ${sale.referenceNumber})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getBtsAttendance(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT a.*, r.rider_name 
      FROM bts_attendance a
      JOIN bts_riders r ON a.employee_id = r.id
      WHERE a.employee_type = 'rider'
      ORDER BY a.attendance_date DESC
    `);
    return result.rows;
  }

  async createBtsAttendance(attendance: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO bts_attendance (employee_id, employee_type, attendance_date, shift_type, hours_worked, overtime_hours, check_in_time, check_out_time)
      VALUES (${attendance.employeeId}, ${attendance.employeeType}, ${attendance.attendanceDate}, ${attendance.shiftType}, ${attendance.hoursWorked}, ${attendance.overtimeHours}, ${attendance.checkInTime}, ${attendance.checkOutTime})
      RETURNING *
    `);
    return result.rows[0];
  }

  async getBtsIncentives(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT i.*, r.rider_name 
      FROM bts_incentives i
      JOIN bts_riders r ON i.rider_id = r.id
      ORDER BY i.incentive_period DESC
    `);
    return result.rows;
  }

  async createBtsIncentive(incentive: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO bts_incentives (rider_id, incentive_period, sales_target, sales_achieved, target_percentage, incentive_amount, raffle_entries, raffle_won, raffle_prize)
      VALUES (${incentive.riderId}, ${incentive.incentivePeriod}, ${incentive.salesTarget}, ${incentive.salesAchieved}, ${incentive.targetPercentage}, ${incentive.incentiveAmount}, ${incentive.raffleEntries}, ${incentive.raffleWon}, ${incentive.rafflePrize})
      RETURNING *
    `);
    return result.rows[0];
  }

  // Advanced Rider Tracking Operations Implementation
  async createRiderLocationHistory(location: InsertRiderLocationHistory): Promise<RiderLocationHistory> {
    const [record] = await db.insert(riderLocationHistory).values(location).returning();
    return record;
  }

  async getRiderCurrentLocation(riderId: string): Promise<RiderLocationHistory | undefined> {
    const [location] = await db.select().from(riderLocationHistory)
      .where(eq(riderLocationHistory.riderId, riderId))
      .orderBy(desc(riderLocationHistory.timestamp))
      .limit(1);
    return location;
  }

  async getRiderLocationHistory(riderId: string, hours: number): Promise<RiderLocationHistory[]> {
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await db.select().from(riderLocationHistory)
      .where(and(
        eq(riderLocationHistory.riderId, riderId),
        sql`${riderLocationHistory.timestamp} >= ${hoursAgo}`
      ))
      .orderBy(desc(riderLocationHistory.timestamp));
  }

  async updateRiderStatus(riderId: string, updates: { isOnline?: boolean }): Promise<Rider | undefined> {
    const [rider] = await db.update(riders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(riders.id, riderId))
      .returning();
    return rider;
  }

  async createRiderSession(session: InsertRiderSession): Promise<RiderSession> {
    const [record] = await db.insert(riderSessions).values(session).returning();
    return record;
  }

  async endRiderSession(riderId: string, endData: any): Promise<RiderSession | undefined> {
    const [session] = await db.update(riderSessions)
      .set({ 
        endTime: new Date(),
        totalEarnings: endData.totalEarnings,
        totalOrders: endData.totalOrders,
        totalDistance: endData.totalDistance,
        status: 'ended'
      })
      .where(and(
        eq(riderSessions.riderId, riderId),
        sql`${riderSessions.endTime} IS NULL`
      ))
      .returning();
    return session;
  }

  async getAvailableRiders(lat: number, lng: number, radiusKm: number): Promise<Rider[]> {
    // Get riders that are online and have recent location data within radius
    const result = await db.execute(sql`
      SELECT DISTINCT r.*
      FROM riders r
      JOIN rider_location_history rlh ON r.id = rlh.rider_id
      WHERE r.is_online = true
        AND r.status = 'available'
        AND rlh.timestamp >= NOW() - INTERVAL '10 minutes'
        AND (6371 * acos(cos(radians(${lat})) * cos(radians(CAST(rlh.latitude AS DECIMAL))) * cos(radians(CAST(rlh.longitude AS DECIMAL)) - radians(${lng})) + sin(radians(${lat})) * sin(radians(CAST(rlh.latitude AS DECIMAL))))) <= ${radiusKm}
      ORDER BY r.rating DESC
    `);
    return result.rows as Rider[];
  }

  async getOnlineRiders(): Promise<Rider[]> {
    return await db.select().from(riders)
      .where(eq(riders.isOnline, true))
      .orderBy(desc(riders.rating));
  }

  async createOrderAssignment(assignment: InsertOrderAssignment): Promise<OrderAssignment> {
    const [record] = await db.insert(orderAssignments).values(assignment).returning();
    return record;
  }

  async updateOrderAssignmentStatus(assignmentId: string, status: string, rejectionReason?: string): Promise<OrderAssignment | undefined> {
    const updateData: any = { 
      status,
      ...(rejectionReason && { rejectionReason }),
    };
    
    if (status === 'accepted') {
      updateData.acceptedTime = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedTime = new Date();
    }
    
    const [assignment] = await db.update(orderAssignments)
      .set(updateData)
      .where(eq(orderAssignments.id, assignmentId))
      .returning();
    return assignment;
  }

  async createDeliveryTracking(tracking: InsertDeliveryTracking): Promise<DeliveryTracking> {
    const [record] = await db.insert(deliveryTracking).values(tracking).returning();
    return record;
  }

  async updateDeliveryTracking(orderId: string, updates: any): Promise<DeliveryTracking | undefined> {
    const [tracking] = await db.update(deliveryTracking)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(deliveryTracking.orderId, orderId))
      .returning();
    return tracking;
  }

  async getDeliveryTracking(orderId: string): Promise<DeliveryTracking | undefined> {
    const [tracking] = await db.select().from(deliveryTracking)
      .where(eq(deliveryTracking.orderId, orderId));
    return tracking;
  }

  async getRiderPerformanceMetrics(riderId: string, startDate?: string, endDate?: string): Promise<RiderPerformanceMetrics[]> {
    const whereConditions = [eq(riderPerformanceMetrics.riderId, riderId)];
    
    if (startDate) {
      whereConditions.push(sql`${riderPerformanceMetrics.date} >= ${startDate}`);
    }
    
    if (endDate) {
      whereConditions.push(sql`${riderPerformanceMetrics.date} <= ${endDate}`);
    }

    return await db.select().from(riderPerformanceMetrics)
      .where(and(...whereConditions))
      .orderBy(desc(riderPerformanceMetrics.date));
  }
}

export const storage = new DatabaseStorage();
