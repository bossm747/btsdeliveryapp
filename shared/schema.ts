import { sql, relations } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  uuid, 
  timestamp, 
  decimal, 
  boolean, 
  jsonb, 
  integer 
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for customers, vendors, riders, and admins
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("customer"), // customer, vendor, rider, admin
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants/Vendors table
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // Filipino Food, Fast Food, Chinese, etc.
  imageUrl: varchar("image_url", { length: 500 }),
  address: jsonb("address").notNull(), // {street, barangay, city, province, zipCode}
  phone: varchar("phone", { length: 20 }),
  operatingHours: jsonb("operating_hours"), // {monday: {open: "08:00", close: "22:00"}, ...}
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  estimatedDeliveryTime: integer("estimated_delivery_time").default(30), // minutes
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu categories for organizing items
export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Menu items
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  categoryId: uuid("category_id").references(() => menuCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  isAvailable: boolean("is_available").default(true),
  preparationTime: integer("preparation_time").default(15), // minutes
  isSpicy: boolean("is_spicy").default(false),
  isVegetarian: boolean("is_vegetarian").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  riderId: uuid("rider_id").references(() => users.id),
  orderNumber: varchar("order_number", { length: 20 }).unique().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, confirmed, preparing, ready, picked_up, in_transit, delivered, cancelled
  items: jsonb("items").notNull(), // Array of {itemId, name, price, quantity, specialInstructions}
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  serviceFee: decimal("service_fee", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"), // cash, gcash, maya, card
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending, paid, failed, refunded
  paymentTransactionId: varchar("payment_transaction_id", { length: 100 }),
  deliveryAddress: jsonb("delivery_address").notNull(),
  specialInstructions: text("special_instructions"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order status tracking
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
});

// Riders table
export const riders = pgTable("riders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  vehicleType: varchar("vehicle_type", { length: 20 }).notNull(), // motorcycle, bicycle, car
  licenseNumber: varchar("license_number", { length: 50 }),
  vehiclePlate: varchar("vehicle_plate", { length: 20 }),
  isOnline: boolean("is_online").default(false),
  currentLocation: jsonb("current_location"), // {lat, lng}
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalDeliveries: integer("total_deliveries").default(0),
  earningsBalance: decimal("earnings_balance", { precision: 10, scale: 2 }).default("0"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reviews and ratings
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  riderId: uuid("rider_id").references(() => users.id),
  restaurantRating: integer("restaurant_rating"), // 1-5
  riderRating: integer("rider_rating"), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedRestaurants: many(restaurants),
  orders: many(orders),
  reviews: many(reviews),
  riderProfile: many(riders),
}));

export const restaurantsRelations = relations(restaurants, ({ one, many }) => ({
  owner: one(users, { fields: [restaurants.ownerId], references: [users.id] }),
  menuCategories: many(menuCategories),
  menuItems: many(menuItems),
  orders: many(orders),
  reviews: many(reviews),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  restaurant: one(restaurants, { fields: [menuCategories.restaurantId], references: [restaurants.id] }),
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  restaurant: one(restaurants, { fields: [menuItems.restaurantId], references: [restaurants.id] }),
  category: one(menuCategories, { fields: [menuItems.categoryId], references: [menuCategories.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  rider: one(users, { fields: [orders.riderId], references: [users.id] }),
  statusHistory: many(orderStatusHistory),
  review: many(reviews),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const ridersRelations = relations(riders, ({ one }) => ({
  user: one(users, { fields: [riders.userId], references: [users.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  customer: one(users, { fields: [reviews.customerId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [reviews.restaurantId], references: [restaurants.id] }),
  rider: one(users, { fields: [reviews.riderId], references: [users.id] }),
}));

// Zod schemas for validation  
export const insertUserSchema = createInsertSchema(users);
export const insertRestaurantSchema = createInsertSchema(restaurants);
export const insertMenuCategorySchema = createInsertSchema(menuCategories);
export const insertMenuItemSchema = createInsertSchema(menuItems);
export const insertOrderSchema = createInsertSchema(orders);
export const insertRiderSchema = createInsertSchema(riders);
export const insertReviewSchema = createInsertSchema(reviews);

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type Rider = typeof riders.$inferSelect;
export type InsertRider = z.infer<typeof insertRiderSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

// Loyalty Points System Tables
export const loyaltyPoints = pgTable("loyalty_points", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  points: integer("points").notNull().default(0),
  lifetimePoints: integer("lifetime_points").notNull().default(0),
  tier: varchar("tier", { length: 50 }).notNull().default("Bronze"),
  lastEarnedAt: timestamp("last_earned_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const pointsTransactions = pgTable("points_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  type: varchar("type", { length: 50 }).notNull(),
  points: integer("points").notNull(),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const rewards = pgTable("rewards", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  category: varchar("category", { length: 100 }),
  value: varchar("value", { length: 100 }),
  code: varchar("code", { length: 50 }).unique(),
  imageUrl: varchar("image_url", { length: 500 }),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const redemptions = pgTable("redemptions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id),
  rewardId: varchar("reward_id", { length: 255 }).notNull().references(() => rewards.id),
  orderId: uuid("order_id").references(() => orders.id),
  pointsUsed: integer("points_used").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow()
});

// Loyalty Types
export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints);
export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions);
export const insertRewardSchema = createInsertSchema(rewards);
export const insertRedemptionSchema = createInsertSchema(redemptions);

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;

// ==================== BTS OPERATIONAL SYSTEM TABLES ====================
// These tables are based on actual BTS Excel spreadsheet data analysis

// BTS Riders table - Comprehensive rider management with attendance and performance tracking
export const btsRiders = pgTable("bts_riders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").references(() => users.id), // Link to main users table
  riderName: varchar("rider_name", { length: 100 }).notNull(),
  riderCode: varchar("rider_code", { length: 20 }).unique().notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
  hireDate: timestamp("hire_date"),
  vehicleType: varchar("vehicle_type", { length: 50 }),
  licenseNumber: varchar("license_number", { length: 50 }),
  emergencyContact: varchar("emergency_contact", { length: 100 }),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default("0.02"), // 2% from BTS data
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// BTS Sales Remittance - Daily sales tracking and remittance management with late payment tracking
export const btsSalesRemittance = pgTable("bts_sales_remittance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  riderId: integer("rider_id").references(() => btsRiders.id).notNull(),
  remitDate: timestamp("remit_date").notNull(),
  dailySales: decimal("daily_sales", { precision: 10, scale: 2 }).default("0"),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).default("0"),
  remittedAmount: decimal("remitted_amount", { precision: 10, scale: 2 }).default("0"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0"),
  isLate: boolean("is_late").default(false),
  lateDays: integer("late_days").default(0),
  referenceNumber: varchar("reference_number", { length: 50 }),
  paymentMethod: varchar("payment_method", { length: 30 }),
  remarks: text("remarks"),
  weekPeriod: varchar("week_period", { length: 20 }), // "jan 4-jan 10" format from BTS data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// BTS Late Remittance - Track late payments and penalties
export const btsLateRemittance = pgTable("bts_late_remittance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  riderId: integer("rider_id").references(() => btsRiders.id).notNull(),
  originalRemitId: integer("original_remit_id").references(() => btsSalesRemittance.id).notNull(),
  lateAmount: decimal("late_amount", { precision: 10, scale: 2 }).notNull(),
  penaltyAmount: decimal("penalty_amount", { precision: 10, scale: 2 }).default("0"),
  daysLate: integer("days_late").notNull(),
  paidDate: timestamp("paid_date"),
  referenceNumber: varchar("reference_number", { length: 50 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, resolved, escalated
  createdAt: timestamp("created_at").defaultNow(),
});

// BTS Attendance - Daily attendance tracking for all staff including riders and admins
export const btsAttendance = pgTable("bts_attendance", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").notNull(), // Can reference bts_riders.id or admin staff
  employeeType: varchar("employee_type", { length: 20 }).notNull(), // 'rider' or 'admin'
  attendanceDate: timestamp("attendance_date").notNull(),
  shiftType: varchar("shift_type", { length: 20 }), // 'OPENING', 'CLOSING', 'HALFDAY', 'OTC', etc.
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("present"), // present, absent, late, overtime
  checkInTime: varchar("check_in_time", { length: 10 }), // time format
  checkOutTime: varchar("check_out_time", { length: 10 }),
  breakHours: decimal("break_hours", { precision: 4, scale: 2 }).default("0"),
  notes: text("notes"),
  approvedBy: integer("approved_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// BTS Payroll - Payroll calculation based on attendance and sales performance
export const btsPayroll = pgTable("bts_payroll", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  employeeId: integer("employee_id").notNull(),
  employeeType: varchar("employee_type", { length: 20 }).notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  regularHours: decimal("regular_hours", { precision: 6, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0"),
  basePay: decimal("base_pay", { precision: 10, scale: 2 }).default("0"),
  overtimePay: decimal("overtime_pay", { precision: 10, scale: 2 }).default("0"),
  commissionEarnings: decimal("commission_earnings", { precision: 10, scale: 2 }).default("0"),
  incentiveEarnings: decimal("incentive_earnings", { precision: 10, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, paid, cancelled
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// BTS Incentives - Performance-based incentives and raffle system for riders
export const btsIncentives = pgTable("bts_incentives", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  riderId: integer("rider_id").references(() => btsRiders.id).notNull(),
  incentivePeriod: varchar("incentive_period", { length: 30 }).notNull(), // 'JAN 1- JAN 15' format from BTS data
  performanceScore: decimal("performance_score", { precision: 8, scale: 2 }).default("0"),
  salesTarget: decimal("sales_target", { precision: 10, scale: 2 }).default("0"),
  salesAchieved: decimal("sales_achieved", { precision: 10, scale: 2 }).default("0"),
  targetPercentage: decimal("target_percentage", { precision: 5, scale: 2 }).default("0"),
  incentiveAmount: decimal("incentive_amount", { precision: 10, scale: 2 }).default("0"),
  raffleEntries: integer("raffle_entries").default(0),
  raffleWon: boolean("raffle_won").default(false),
  rafflePrize: varchar("raffle_prize", { length: 100 }),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: varchar("payment_status", { length: 20 }).default("pending"), // pending, paid, cancelled
  paidDate: timestamp("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// BTS Audit Reports - Comprehensive audit trail and reporting system
export const btsAuditReports = pgTable("bts_audit_reports", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'MONTHLY_AUDIT', 'UNDECLARED_BOOKING', 'CLOSING_REPORT'
  reportPeriod: varchar("report_period", { length: 30 }).notNull(),
  riderId: integer("rider_id").references(() => btsRiders.id),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
  declaredSales: decimal("declared_sales", { precision: 12, scale: 2 }).default("0"),
  undeclaredSales: decimal("undeclared_sales", { precision: 12, scale: 2 }).default("0"),
  discrepancyAmount: decimal("discrepancy_amount", { precision: 12, scale: 2 }).default("0"),
  auditStatus: varchar("audit_status", { length: 20 }).default("pending"), // pending, resolved, escalated
  auditNotes: text("audit_notes"),
  auditedBy: integer("audited_by"),
  auditDate: timestamp("audit_date").notNull(),
  resolutionDate: timestamp("resolution_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// BTS Undeclared Bookings - Track undeclared or missing booking records
export const btsUndeclaredBookings = pgTable("bts_undeclared_bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  riderId: integer("rider_id").references(() => btsRiders.id).notNull(),
  bookingDate: timestamp("booking_date").notNull(),
  estimatedAmount: decimal("estimated_amount", { precision: 10, scale: 2 }),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  discrepancyReason: varchar("discrepancy_reason", { length: 100 }),
  status: varchar("status", { length: 20 }).default("flagged"), // flagged, explained, resolved
  explanation: text("explanation"),
  resolvedBy: integer("resolved_by"),
  resolvedDate: timestamp("resolved_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// BTS Relations  
export const btsRidersRelations = relations(btsRiders, ({ one, many }) => ({
  user: one(users, { fields: [btsRiders.userId], references: [users.id] }),
  salesRemittances: many(btsSalesRemittance),
  lateRemittances: many(btsLateRemittance), 
  incentives: many(btsIncentives),
  auditReports: many(btsAuditReports),
  undeclaredBookings: many(btsUndeclaredBookings),
}));

export const btsSalesRemittanceRelations = relations(btsSalesRemittance, ({ one, many }) => ({
  rider: one(btsRiders, { fields: [btsSalesRemittance.riderId], references: [btsRiders.id] }),
  lateRemittances: many(btsLateRemittance),
}));

export const btsLateRemittanceRelations = relations(btsLateRemittance, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsLateRemittance.riderId], references: [btsRiders.id] }),
  originalRemit: one(btsSalesRemittance, { fields: [btsLateRemittance.originalRemitId], references: [btsSalesRemittance.id] }),
}));

// Attendance can link to different employee types, so we'll skip direct relation for now

export const btsIncentivesRelations = relations(btsIncentives, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsIncentives.riderId], references: [btsRiders.id] }),
}));

export const btsAuditReportsRelations = relations(btsAuditReports, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsAuditReports.riderId], references: [btsRiders.id] }),
}));

export const btsUndeclaredBookingsRelations = relations(btsUndeclaredBookings, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsUndeclaredBookings.riderId], references: [btsRiders.id] }),
}));

// ==================== ADVANCED RIDER TRACKING SYSTEM ====================

// Real-time rider location tracking with history
export const riderLocationHistory = pgTable("rider_location_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 8, scale: 2 }), // GPS accuracy in meters
  speed: decimal("speed", { precision: 6, scale: 2 }), // km/h
  heading: decimal("heading", { precision: 5, scale: 2 }), // degrees
  altitude: decimal("altitude", { precision: 8, scale: 2 }), // meters
  timestamp: timestamp("timestamp").defaultNow(),
  batteryLevel: integer("battery_level"), // percentage
  isOnline: boolean("is_online").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rider work sessions for tracking active periods
export const riderSessions = pgTable("rider_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  startLocation: jsonb("start_location"), // {lat, lng, address}
  endLocation: jsonb("end_location"), // {lat, lng, address}
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }).default("0"), // km
  totalOrders: integer("total_orders").default(0),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).default("active"), // active, paused, ended
  deviceInfo: jsonb("device_info"), // device type, app version
  createdAt: timestamp("created_at").defaultNow(),
});

// Order assignment tracking with advanced algorithms
export const orderAssignments = pgTable("order_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  riderId: uuid("rider_id").references(() => riders.id),
  assignedBy: varchar("assigned_by", { length: 20 }).default("system"), // system, manual, rider_accepted
  assignmentTime: timestamp("assignment_time").defaultNow(),
  acceptedTime: timestamp("accepted_time"),
  rejectedTime: timestamp("rejected_time"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, accepted, rejected, cancelled, completed
  riderDistance: decimal("rider_distance", { precision: 8, scale: 2 }), // km from restaurant
  estimatedPickupTime: timestamp("estimated_pickup_time"),
  actualPickupTime: timestamp("actual_pickup_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  rejectionReason: varchar("rejection_reason", { length: 100 }),
  priority: integer("priority").default(1), // 1=highest, 5=lowest
  assignmentScore: decimal("assignment_score", { precision: 5, scale: 2 }), // algorithm score
  createdAt: timestamp("created_at").defaultNow(),
});

// Real-time delivery tracking
export const deliveryTracking = pgTable("delivery_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  currentStatus: varchar("current_status", { length: 20 }).notNull(),
  currentLocation: jsonb("current_location").notNull(), // {lat, lng}
  restaurantLocation: jsonb("restaurant_location").notNull(),
  deliveryLocation: jsonb("delivery_location").notNull(),
  routeToRestaurant: jsonb("route_to_restaurant"), // Google Maps route data
  routeToCustomer: jsonb("route_to_customer"), // Google Maps route data
  estimatedArrivalRestaurant: timestamp("estimated_arrival_restaurant"),
  estimatedArrivalCustomer: timestamp("estimated_arrival_customer"),
  distanceToRestaurant: decimal("distance_to_restaurant", { precision: 8, scale: 2 }),
  distanceToCustomer: decimal("distance_to_customer", { precision: 8, scale: 2 }),
  totalTravelTime: integer("total_travel_time"), // minutes
  lastLocationUpdate: timestamp("last_location_update").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider performance analytics
export const riderPerformanceMetrics = pgTable("rider_performance_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  date: timestamp("date").notNull(),
  onlineHours: decimal("online_hours", { precision: 4, scale: 2 }).default("0"),
  activeHours: decimal("active_hours", { precision: 4, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  completedOrders: integer("completed_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  rejectedOrders: integer("rejected_orders").default(0),
  averageDeliveryTime: decimal("average_delivery_time", { precision: 5, scale: 2 }), // minutes
  totalDistance: decimal("total_distance", { precision: 10, scale: 2 }).default("0"), // km
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  customerRatings: decimal("customer_ratings", { precision: 3, scale: 2 }),
  onTimePercentage: decimal("on_time_percentage", { precision: 5, scale: 2 }),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }),
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Geofencing zones for service areas
export const serviceZones = pgTable("service_zones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  boundaries: jsonb("boundaries").notNull(), // GeoJSON polygon
  isActive: boolean("is_active").default(true),
  deliveryFee: decimal("delivery_fee", { precision: 8, scale: 2 }).default("0"),
  minimumOrder: decimal("minimum_order", { precision: 8, scale: 2 }).default("0"),
  maxDeliveryRadius: decimal("max_delivery_radius", { precision: 6, scale: 2 }).default("10"), // km
  peakHours: jsonb("peak_hours"), // {start: "17:00", end: "21:00"}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced Relations
export const riderLocationHistoryRelations = relations(riderLocationHistory, ({ one }) => ({
  rider: one(riders, { fields: [riderLocationHistory.riderId], references: [riders.id] }),
}));

export const riderSessionsRelations = relations(riderSessions, ({ one }) => ({
  rider: one(riders, { fields: [riderSessions.riderId], references: [riders.id] }),
}));

export const orderAssignmentsRelations = relations(orderAssignments, ({ one }) => ({
  order: one(orders, { fields: [orderAssignments.orderId], references: [orders.id] }),
  rider: one(riders, { fields: [orderAssignments.riderId], references: [riders.id] }),
}));

export const deliveryTrackingRelations = relations(deliveryTracking, ({ one }) => ({
  order: one(orders, { fields: [deliveryTracking.orderId], references: [orders.id] }),
  rider: one(riders, { fields: [deliveryTracking.riderId], references: [riders.id] }),
}));

export const riderPerformanceMetricsRelations = relations(riderPerformanceMetrics, ({ one }) => ({
  rider: one(riders, { fields: [riderPerformanceMetrics.riderId], references: [riders.id] }),
}));

// Advanced Tracking Types
export const insertRiderLocationHistorySchema = createInsertSchema(riderLocationHistory);
export const insertRiderSessionSchema = createInsertSchema(riderSessions);
export const insertOrderAssignmentSchema = createInsertSchema(orderAssignments);
export const insertDeliveryTrackingSchema = createInsertSchema(deliveryTracking);
export const insertRiderPerformanceMetricsSchema = createInsertSchema(riderPerformanceMetrics);
export const insertServiceZoneSchema = createInsertSchema(serviceZones);

export type RiderLocationHistory = typeof riderLocationHistory.$inferSelect;
export type InsertRiderLocationHistory = z.infer<typeof insertRiderLocationHistorySchema>;
export type RiderSession = typeof riderSessions.$inferSelect;
export type InsertRiderSession = z.infer<typeof insertRiderSessionSchema>;
export type OrderAssignment = typeof orderAssignments.$inferSelect;
export type InsertOrderAssignment = z.infer<typeof insertOrderAssignmentSchema>;
export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type InsertDeliveryTracking = z.infer<typeof insertDeliveryTrackingSchema>;
export type RiderPerformanceMetrics = typeof riderPerformanceMetrics.$inferSelect;
export type InsertRiderPerformanceMetrics = z.infer<typeof insertRiderPerformanceMetricsSchema>;
export type ServiceZone = typeof serviceZones.$inferSelect;
export type InsertServiceZone = z.infer<typeof insertServiceZoneSchema>;

// BTS Zod schemas for validation
export const insertBtsRiderSchema = createInsertSchema(btsRiders);
export const insertBtsSalesRemittanceSchema = createInsertSchema(btsSalesRemittance);
export const insertBtsLateRemittanceSchema = createInsertSchema(btsLateRemittance);
export const insertBtsAttendanceSchema = createInsertSchema(btsAttendance);
export const insertBtsPayrollSchema = createInsertSchema(btsPayroll);
export const insertBtsIncentivesSchema = createInsertSchema(btsIncentives);
export const insertBtsAuditReportsSchema = createInsertSchema(btsAuditReports);
export const insertBtsUndeclaredBookingsSchema = createInsertSchema(btsUndeclaredBookings);

// GPS Tracking and Delivery Optimization Tables

// Real-time rider location tracking
export const riderLocations = pgTable("rider_locations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => users.id).notNull(), // rider user
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }), // GPS accuracy in meters
  speed: decimal("speed", { precision: 6, scale: 2 }), // km/h
  heading: decimal("heading", { precision: 6, scale: 2 }), // degrees 0-360
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery routes and optimization
export const deliveryRoutes = pgTable("delivery_routes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  startLocation: jsonb("start_location").notNull(), // {lat, lng, address}
  endLocation: jsonb("end_location").notNull(), // {lat, lng, address}
  waypoints: jsonb("waypoints"), // [{lat, lng, address}] for multiple deliveries
  optimizedRoute: jsonb("optimized_route"), // Google Maps route response
  estimatedDistance: decimal("estimated_distance", { precision: 8, scale: 2 }), // km
  estimatedDuration: integer("estimated_duration"), // minutes
  actualDistance: decimal("actual_distance", { precision: 8, scale: 2 }),
  actualDuration: integer("actual_duration"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: varchar("status", { length: 20 }).default("planned"), // planned, in_progress, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Delivery tracking events for real-time updates
export const deliveryTrackingEvents = pgTable("delivery_tracking_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  riderId: uuid("rider_id").references(() => users.id).notNull(),
  eventType: varchar("event_type", { length: 30 }).notNull(), // order_picked_up, en_route, nearby, delivered
  location: jsonb("location"), // {lat, lng, address}
  timestamp: timestamp("timestamp").defaultNow(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery zones for optimization
export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  boundaries: jsonb("boundaries").notNull(), // GeoJSON polygon coordinates
  baseDeliveryFee: decimal("base_delivery_fee", { precision: 8, scale: 2 }).default("0"),
  priorityLevel: integer("priority_level").default(1), // 1=high, 2=medium, 3=low
  maxDeliveryTime: integer("max_delivery_time").default(60), // minutes
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// GPS Tracking Relations
export const riderLocationsRelations = relations(riderLocations, ({ one }) => ({
  rider: one(users, { fields: [riderLocations.riderId], references: [users.id] }),
}));

export const deliveryRoutesRelations = relations(deliveryRoutes, ({ one }) => ({
  rider: one(users, { fields: [deliveryRoutes.riderId], references: [users.id] }),
  order: one(orders, { fields: [deliveryRoutes.orderId], references: [orders.id] }),
}));

export const deliveryTrackingEventsRelations = relations(deliveryTrackingEvents, ({ one }) => ({
  order: one(orders, { fields: [deliveryTrackingEvents.orderId], references: [orders.id] }),
  rider: one(users, { fields: [deliveryTrackingEvents.riderId], references: [users.id] }),
}));

// GPS Tracking Zod schemas
export const insertRiderLocationSchema = createInsertSchema(riderLocations);
export const insertDeliveryRouteSchema = createInsertSchema(deliveryRoutes);
export const insertDeliveryTrackingEventSchema = createInsertSchema(deliveryTrackingEvents);
export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones);

// GPS Tracking TypeScript types
export type RiderLocation = typeof riderLocations.$inferSelect;
export type InsertRiderLocation = z.infer<typeof insertRiderLocationSchema>;
export type DeliveryRoute = typeof deliveryRoutes.$inferSelect;
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;
export type DeliveryTrackingEvent = typeof deliveryTrackingEvents.$inferSelect;
export type InsertDeliveryTrackingEvent = z.infer<typeof insertDeliveryTrackingEventSchema>;
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;

// BTS TypeScript types
export type BtsRider = typeof btsRiders.$inferSelect;
export type InsertBtsRider = z.infer<typeof insertBtsRiderSchema>;
export type BtsSalesRemittance = typeof btsSalesRemittance.$inferSelect;
export type InsertBtsSalesRemittance = z.infer<typeof insertBtsSalesRemittanceSchema>;
export type BtsLateRemittance = typeof btsLateRemittance.$inferSelect;
export type InsertBtsLateRemittance = z.infer<typeof insertBtsLateRemittanceSchema>;
export type BtsAttendance = typeof btsAttendance.$inferSelect;
export type InsertBtsAttendance = z.infer<typeof insertBtsAttendanceSchema>;
export type BtsPayroll = typeof btsPayroll.$inferSelect;
export type InsertBtsPayroll = z.infer<typeof insertBtsPayrollSchema>;
export type BtsIncentives = typeof btsIncentives.$inferSelect;
export type InsertBtsIncentives = z.infer<typeof insertBtsIncentivesSchema>;
export type BtsAuditReports = typeof btsAuditReports.$inferSelect;
export type InsertBtsAuditReports = z.infer<typeof insertBtsAuditReportsSchema>;
export type BtsUndeclaredBookings = typeof btsUndeclaredBookings.$inferSelect;
export type InsertBtsUndeclaredBookings = z.infer<typeof insertBtsUndeclaredBookingsSchema>;
