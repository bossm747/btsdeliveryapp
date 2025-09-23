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
  // Merchant Panel Tables
  menuModifiers,
  modifierOptions,
  menuItemModifiers,
  promotions,
  vendorEarnings,
  restaurantStaff,
  reviewResponses,
  customerNotes,
  inventoryItems,
  auditLogs,
  userFavorites,
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
  type InsertBroadcastMessage,
  // Merchant Panel Types
  type MenuModifier,
  type InsertMenuModifier,
  type ModifierOption,
  type InsertModifierOption,
  type MenuItemModifier,
  type InsertMenuItemModifier,
  type Promotion,
  type InsertPromotion,
  type VendorEarnings,
  type InsertVendorEarnings,
  type RestaurantStaff,
  type InsertRestaurantStaff,
  type ReviewResponse,
  type InsertReviewResponse,
  type CustomerNote,
  type InsertCustomerNote,
  type InventoryItem,
  type InsertInventoryItem,
  type AuditLog,
  type InsertAuditLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Customer-specific operations
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getFavoriteRestaurants(customerId: string): Promise<Restaurant[]>;
  addFavoriteRestaurant(customerId: string, restaurantId: string): Promise<any>;
  removeFavoriteRestaurant(customerId: string, restaurantId: string): Promise<void>;

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
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;
  updateMenuCategory(id: string, updates: Partial<MenuCategory>): Promise<MenuCategory | undefined>;
  deleteMenuCategory(id: string): Promise<void>;

  // Order operations
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrdersByRestaurant(restaurantId: string): Promise<Order[]>;
  getRestaurantOrders(restaurantId: string): Promise<Order[]>;
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
  
  getAvailableRiders(lat: number, lng: number, radiusKm: number): Promise<Rider[]>;
  getOnlineRiders(): Promise<Rider[]>;
  
  // Rider Assignment Queue Operations (using existing schema)
  createRiderAssignment(assignment: InsertRiderAssignmentQueue): Promise<RiderAssignmentQueue>;
  updateRiderAssignmentStatus(assignmentId: string, status: string, rejectionReason?: string): Promise<RiderAssignmentQueue | undefined>;
  
  getRiderPerformanceMetrics(riderId: string, startDate?: string, endDate?: string): Promise<RiderPerformanceMetrics[]>;

  // Merchant Panel Operations
  
  // Menu Modifiers Operations
  getMenuModifiers(restaurantId: string): Promise<MenuModifier[]>;
  getMenuModifier(id: string): Promise<MenuModifier | undefined>;
  createMenuModifier(modifier: InsertMenuModifier): Promise<MenuModifier>;
  updateMenuModifier(id: string, updates: Partial<MenuModifier>): Promise<MenuModifier | undefined>;
  deleteMenuModifier(id: string): Promise<void>;
  
  getModifierOptions(modifierId: string): Promise<ModifierOption[]>;
  createModifierOption(option: InsertModifierOption): Promise<ModifierOption>;
  updateModifierOption(id: string, updates: Partial<ModifierOption>): Promise<ModifierOption | undefined>;
  deleteModifierOption(id: string): Promise<void>;
  
  getMenuItemModifiers(menuItemId: string): Promise<MenuItemModifier[]>;
  createMenuItemModifier(itemModifier: InsertMenuItemModifier): Promise<MenuItemModifier>;
  deleteMenuItemModifier(id: string): Promise<void>;
  
  // Promotions Operations
  getPromotions(restaurantId: string): Promise<Promotion[]>;
  getPromotion(id: string): Promise<Promotion | undefined>;
  getPromotionByCode(code: string): Promise<Promotion | undefined>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion | undefined>;
  deletePromotion(id: string): Promise<void>;
  
  // Financial Operations
  getVendorEarnings(restaurantId: string, startDate?: string, endDate?: string): Promise<VendorEarnings[]>;
  createVendorEarnings(earnings: InsertVendorEarnings): Promise<VendorEarnings>;
  getEarningsSummary(restaurantId: string, period: 'day' | 'week' | 'month'): Promise<any>;
  
  // Staff Management Operations
  getRestaurantStaff(restaurantId: string): Promise<RestaurantStaff[]>;
  getStaffMember(id: string): Promise<RestaurantStaff | undefined>;
  createStaffMember(staff: InsertRestaurantStaff): Promise<RestaurantStaff>;
  updateStaffMember(id: string, updates: Partial<RestaurantStaff>): Promise<RestaurantStaff | undefined>;
  deleteStaffMember(id: string): Promise<void>;
  
  // Review Management Operations
  getReviewResponses(reviewId: string): Promise<ReviewResponse[]>;
  createReviewResponse(response: InsertReviewResponse): Promise<ReviewResponse>;
  updateReviewResponse(id: string, updates: Partial<ReviewResponse>): Promise<ReviewResponse | undefined>;
  deleteReviewResponse(id: string): Promise<void>;
  
  // Customer Relationship Management
  getCustomerNotes(restaurantId: string, customerId?: string): Promise<CustomerNote[]>;
  createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote>;
  updateCustomerNote(id: string, updates: Partial<CustomerNote>): Promise<CustomerNote | undefined>;
  deleteCustomerNote(id: string): Promise<void>;
  
  // Inventory Management Operations
  getInventoryItems(restaurantId: string): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<void>;
  getLowStockItems(restaurantId: string): Promise<InventoryItem[]>;
  
  // Audit Log Operations
  getAuditLogs(restaurantId?: string, userId?: string): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Delivery Tracking Operations
  updateDeliveryTracking(orderId: string, updates: any): Promise<any>;
  getDeliveryTracking(orderId: string): Promise<any>;
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

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Customer-specific operations
  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
  }


  async getFavoriteRestaurants(customerId: string): Promise<Restaurant[]> {
    const favoriteRestaurants = await db
      .select({
        id: restaurants.id,
        ownerId: restaurants.ownerId,
        name: restaurants.name,
        description: restaurants.description,
        category: restaurants.category,
        logoUrl: restaurants.logoUrl,
        imageUrl: restaurants.imageUrl,
        galleryImages: restaurants.galleryImages,
        address: restaurants.address,
        phone: restaurants.phone,
        email: restaurants.email,
        website: restaurants.website,
        socialMedia: restaurants.socialMedia,
        operatingHours: restaurants.operatingHours,
        holidayHours: restaurants.holidayHours,
        serviceAreas: restaurants.serviceAreas,
        services: restaurants.services,
        deliveryFee: restaurants.deliveryFee,
        minimumOrder: restaurants.minimumOrder,
        estimatedDeliveryTime: restaurants.estimatedDeliveryTime,
        maxOrdersPerHour: restaurants.maxOrdersPerHour,
        preparationBuffer: restaurants.preparationBuffer,
        isActive: restaurants.isActive,
        isFeatured: restaurants.isFeatured,
        isAcceptingOrders: restaurants.isAcceptingOrders,
        pauseUntil: restaurants.pauseUntil,
        businessLicense: restaurants.businessLicense,
        taxId: restaurants.taxId,
        vatRegistered: restaurants.vatRegistered,
        rating: restaurants.rating,
        totalOrders: restaurants.totalOrders,
        totalReviews: restaurants.totalReviews,
        createdAt: restaurants.createdAt,
        updatedAt: restaurants.updatedAt
      })
      .from(userFavorites)
      .innerJoin(restaurants, eq(userFavorites.restaurantId, restaurants.id))
      .where(and(
        eq(userFavorites.userId, customerId),
        eq(restaurants.isActive, true)
      ))
      .orderBy(desc(userFavorites.createdAt));
    
    return favoriteRestaurants;
  }

  async addFavoriteRestaurant(customerId: string, restaurantId: string): Promise<any> {
    // Check if already exists to prevent duplicates
    const [existing] = await db.select().from(userFavorites)
      .where(and(
        eq(userFavorites.userId, customerId),
        eq(userFavorites.restaurantId, restaurantId)
      ));
    
    if (existing) {
      return existing;
    }

    const [favorite] = await db.insert(userFavorites).values({
      userId: customerId,
      restaurantId
    }).returning();
    
    return favorite;
  }

  async removeFavoriteRestaurant(customerId: string, restaurantId: string): Promise<void> {
    await db.delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, customerId),
        eq(userFavorites.restaurantId, restaurantId)
      ));
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

  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async updateMenuCategory(id: string, updates: Partial<MenuCategory>): Promise<MenuCategory | undefined> {
    const [category] = await db.update(menuCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(menuCategories.id, id))
      .returning();
    return category;
  }

  async deleteMenuCategory(id: string): Promise<void> {
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
  }

  // Order operations
  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrdersByRestaurant(restaurantId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.restaurantId, restaurantId))
      .orderBy(desc(orders.createdAt));
  }

  async getRestaurantOrders(restaurantId: string): Promise<Order[]> {
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

  // Rider Assignment Queue Operations
  async createRiderAssignment(assignment: InsertRiderAssignmentQueue): Promise<RiderAssignmentQueue> {
    const [record] = await db.insert(riderAssignmentQueue).values(assignment).returning();
    return record;
  }

  async updateRiderAssignmentStatus(assignmentId: string, status: string, rejectionReason?: string): Promise<RiderAssignmentQueue | undefined> {
    const updateData: any = { 
      assignmentStatus: status,
    };
    
    if (status === 'accepted') {
      updateData.acceptedAt = new Date();
    } else if (status === 'rejected') {
      updateData.rejectedByRiders = sql`COALESCE(rejected_by_riders, '[]'::jsonb) || ${JSON.stringify([rejectionReason])}`;
    }
    
    const [assignment] = await db.update(riderAssignmentQueue)
      .set(updateData)
      .where(eq(riderAssignmentQueue.id, assignmentId))
      .returning();
    return assignment;
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

  // Merchant Panel Operations Implementation
  
  // Menu Modifiers Operations
  async getMenuModifiers(restaurantId: string): Promise<MenuModifier[]> {
    return await db.select().from(menuModifiers)
      .where(eq(menuModifiers.restaurantId, restaurantId))
      .orderBy(menuModifiers.displayOrder);
  }

  async getMenuModifier(id: string): Promise<MenuModifier | undefined> {
    const [modifier] = await db.select().from(menuModifiers).where(eq(menuModifiers.id, id));
    return modifier;
  }

  async createMenuModifier(modifier: InsertMenuModifier): Promise<MenuModifier> {
    const [record] = await db.insert(menuModifiers).values(modifier).returning();
    return record;
  }

  async updateMenuModifier(id: string, updates: Partial<MenuModifier>): Promise<MenuModifier | undefined> {
    const [updated] = await db.update(menuModifiers)
      .set(updates)
      .where(eq(menuModifiers.id, id))
      .returning();
    return updated;
  }

  async deleteMenuModifier(id: string): Promise<void> {
    await db.delete(menuModifiers).where(eq(menuModifiers.id, id));
  }

  async getModifierOptions(modifierId: string): Promise<ModifierOption[]> {
    return await db.select().from(modifierOptions)
      .where(eq(modifierOptions.modifierId, modifierId))
      .orderBy(modifierOptions.displayOrder);
  }

  async createModifierOption(option: InsertModifierOption): Promise<ModifierOption> {
    const [record] = await db.insert(modifierOptions).values(option).returning();
    return record;
  }

  async updateModifierOption(id: string, updates: Partial<ModifierOption>): Promise<ModifierOption | undefined> {
    const [updated] = await db.update(modifierOptions)
      .set(updates)
      .where(eq(modifierOptions.id, id))
      .returning();
    return updated;
  }

  async deleteModifierOption(id: string): Promise<void> {
    await db.delete(modifierOptions).where(eq(modifierOptions.id, id));
  }

  async getMenuItemModifiers(menuItemId: string): Promise<MenuItemModifier[]> {
    return await db.select().from(menuItemModifiers)
      .where(eq(menuItemModifiers.menuItemId, menuItemId))
      .orderBy(menuItemModifiers.displayOrder);
  }

  async createMenuItemModifier(itemModifier: InsertMenuItemModifier): Promise<MenuItemModifier> {
    const [record] = await db.insert(menuItemModifiers).values(itemModifier).returning();
    return record;
  }

  async deleteMenuItemModifier(id: string): Promise<void> {
    await db.delete(menuItemModifiers).where(eq(menuItemModifiers.id, id));
  }

  // Promotions Operations
  async getPromotions(restaurantId: string): Promise<Promotion[]> {
    return await db.select().from(promotions)
      .where(eq(promotions.restaurantId, restaurantId))
      .orderBy(desc(promotions.createdAt));
  }

  async getPromotion(id: string): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions).where(eq(promotions.id, id));
    return promotion;
  }

  async getPromotionByCode(code: string): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions)
      .where(and(
        eq(promotions.code, code),
        eq(promotions.isActive, true)
      ));
    return promotion;
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const [record] = await db.insert(promotions).values(promotion).returning();
    return record;
  }

  async updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion | undefined> {
    const [updated] = await db.update(promotions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(promotions.id, id))
      .returning();
    return updated;
  }

  async deletePromotion(id: string): Promise<void> {
    await db.delete(promotions).where(eq(promotions.id, id));
  }

  // Financial Operations
  async getVendorEarnings(restaurantId: string, startDate?: string, endDate?: string): Promise<VendorEarnings[]> {
    let whereConditions = [eq(vendorEarnings.restaurantId, restaurantId)];
    
    if (startDate && endDate) {
      whereConditions.push(
        sql`${vendorEarnings.recordDate} >= ${startDate}`,
        sql`${vendorEarnings.recordDate} <= ${endDate}`
      );
    }
    
    return await db.select().from(vendorEarnings)
      .where(and(...whereConditions))
      .orderBy(desc(vendorEarnings.recordDate));
  }

  async createVendorEarnings(earnings: InsertVendorEarnings): Promise<VendorEarnings> {
    const [record] = await db.insert(vendorEarnings).values(earnings).returning();
    return record;
  }

  async getEarningsSummary(restaurantId: string, period: 'day' | 'week' | 'month'): Promise<any> {
    let dateFilter = '';
    switch (period) {
      case 'day':
        dateFilter = "record_date >= NOW() - INTERVAL '1 day'";
        break;
      case 'week':
        dateFilter = "record_date >= NOW() - INTERVAL '1 week'";
        break;
      case 'month':
        dateFilter = "record_date >= NOW() - INTERVAL '1 month'";
        break;
    }

    const result = await db.execute(sql`
      SELECT 
        SUM(gross_amount) as total_gross,
        SUM(commission_amount) as total_commission,
        SUM(net_amount) as total_net,
        COUNT(*) as total_transactions
      FROM vendor_earnings 
      WHERE restaurant_id = ${restaurantId} 
        AND ${sql.raw(dateFilter)}
    `);
    
    return result.rows[0];
  }

  // Staff Management Operations
  async getRestaurantStaff(restaurantId: string): Promise<RestaurantStaff[]> {
    return await db.select().from(restaurantStaff)
      .where(eq(restaurantStaff.restaurantId, restaurantId))
      .orderBy(restaurantStaff.role);
  }

  async getStaffMember(id: string): Promise<RestaurantStaff | undefined> {
    const [staff] = await db.select().from(restaurantStaff).where(eq(restaurantStaff.id, id));
    return staff;
  }

  async createStaffMember(staff: InsertRestaurantStaff): Promise<RestaurantStaff> {
    const [record] = await db.insert(restaurantStaff).values(staff).returning();
    return record;
  }

  async updateStaffMember(id: string, updates: Partial<RestaurantStaff>): Promise<RestaurantStaff | undefined> {
    const [updated] = await db.update(restaurantStaff)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(restaurantStaff.id, id))
      .returning();
    return updated;
  }

  async deleteStaffMember(id: string): Promise<void> {
    await db.delete(restaurantStaff).where(eq(restaurantStaff.id, id));
  }

  // Review Management Operations
  async getReviewResponses(reviewId: string): Promise<ReviewResponse[]> {
    return await db.select().from(reviewResponses)
      .where(eq(reviewResponses.reviewId, reviewId))
      .orderBy(desc(reviewResponses.createdAt));
  }

  async createReviewResponse(response: InsertReviewResponse): Promise<ReviewResponse> {
    const [record] = await db.insert(reviewResponses).values(response).returning();
    return record;
  }

  async updateReviewResponse(id: string, updates: Partial<ReviewResponse>): Promise<ReviewResponse | undefined> {
    const [updated] = await db.update(reviewResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reviewResponses.id, id))
      .returning();
    return updated;
  }

  async deleteReviewResponse(id: string): Promise<void> {
    await db.delete(reviewResponses).where(eq(reviewResponses.id, id));
  }

  // Customer Relationship Management
  async getCustomerNotes(restaurantId: string, customerId?: string): Promise<CustomerNote[]> {
    let whereConditions = [eq(customerNotes.restaurantId, restaurantId)];
    
    if (customerId) {
      whereConditions.push(eq(customerNotes.customerId, customerId));
    }
    
    return await db.select().from(customerNotes)
      .where(and(...whereConditions))
      .orderBy(desc(customerNotes.createdAt));
  }

  async createCustomerNote(note: InsertCustomerNote): Promise<CustomerNote> {
    const [record] = await db.insert(customerNotes).values(note).returning();
    return record;
  }

  async updateCustomerNote(id: string, updates: Partial<CustomerNote>): Promise<CustomerNote | undefined> {
    const [updated] = await db.update(customerNotes)
      .set(updates)
      .where(eq(customerNotes.id, id))
      .returning();
    return updated;
  }

  async deleteCustomerNote(id: string): Promise<void> {
    await db.delete(customerNotes).where(eq(customerNotes.id, id));
  }

  // Inventory Management Operations
  async getInventoryItems(restaurantId: string): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems)
      .where(eq(inventoryItems.restaurantId, restaurantId))
      .orderBy(inventoryItems.name);
  }

  async getInventoryItem(id: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [record] = await db.insert(inventoryItems).values(item).returning();
    return record;
  }

  async updateInventoryItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem | undefined> {
    const [updated] = await db.update(inventoryItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async getLowStockItems(restaurantId: string): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems)
      .where(and(
        eq(inventoryItems.restaurantId, restaurantId),
        sql`${inventoryItems.currentStock} <= ${inventoryItems.minimumStock}`
      ))
      .orderBy(inventoryItems.name);
  }

  // Audit Log Operations
  async getAuditLogs(restaurantId?: string, userId?: string): Promise<AuditLog[]> {
    let whereConditions = [];
    
    if (restaurantId) {
      whereConditions.push(eq(auditLogs.restaurantId, restaurantId));
    }
    if (userId) {
      whereConditions.push(eq(auditLogs.userId, userId));
    }
    
    const query = whereConditions.length > 0 
      ? db.select().from(auditLogs).where(and(...whereConditions))
      : db.select().from(auditLogs);
    
    return await query.orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [record] = await db.insert(auditLogs).values(log).returning();
    return record;
  }
  
  // Delivery Tracking Operations
  async updateDeliveryTracking(orderId: string, updates: any): Promise<any> {
    try {
      // Update the order status and tracking info
      const [order] = await db.update(orders)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(orders.id, orderId))
        .returning();
      
      if (order && updates.status) {
        // Add status to history
        await db.insert(orderStatusHistory).values({
          orderId: order.id,
          status: updates.status,
          notes: updates.notes || "Tracking update"
        });
      }
      
      return order;
    } catch (error) {
      console.error("Error updating delivery tracking:", error);
      throw error;
    }
  }
  
  async getDeliveryTracking(orderId: string): Promise<any> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) return null;
      
      // Get tracking history
      const history = await db.select().from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, orderId))
        .orderBy(orderStatusHistory.timestamp);
      
      return {
        orderId: order.id,
        currentStatus: order.status,
        estimatedArrival: order.estimatedDeliveryTime?.toISOString(),
        actualDeliveryTime: order.actualDeliveryTime?.toISOString(),
        timeline: history
      };
    } catch (error) {
      console.error("Error getting delivery tracking:", error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
