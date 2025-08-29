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

// User Sessions for authentication
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionToken: varchar("session_token", { length: 255 }).unique().notNull(),
  refreshToken: varchar("refresh_token", { length: 255 }).unique(),
  deviceInfo: jsonb("device_info"), // {browser, os, device, ip}
  expiresAt: timestamp("expires_at").notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Role Permissions System
export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  role: varchar("role", { length: 20 }).notNull(), // customer, vendor, rider, admin
  resource: varchar("resource", { length: 50 }).notNull(), // orders, restaurants, deliveries, users, etc
  actions: jsonb("actions").notNull(), // {create: true, read: true, update: false, delete: false}
  createdAt: timestamp("created_at").defaultNow(),
});

// Enhanced Users table with comprehensive role management
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique().notNull(),
  phone: varchar("phone", { length: 20 }).unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  role: varchar("role", { length: 20 }).notNull().default("customer"), // customer, vendor, rider, admin
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  lastLoginAt: timestamp("last_login_at"),
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  permissions: jsonb("permissions"), // role-specific permissions override
  preferences: jsonb("preferences"), // user dashboard preferences
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

// Riders table - Enhanced for advanced tracking
export const riders = pgTable("riders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  vehicleType: varchar("vehicle_type", { length: 20 }).notNull(), // motorcycle, bicycle, car
  licenseNumber: varchar("license_number", { length: 50 }),
  vehiclePlate: varchar("vehicle_plate", { length: 20 }),
  isOnline: boolean("is_online").default(false),
  currentLocation: jsonb("current_location"), // {lat, lng, accuracy, timestamp}
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalDeliveries: integer("total_deliveries").default(0),
  completedDeliveries: integer("completed_deliveries").default(0),
  cancelledDeliveries: integer("cancelled_deliveries").default(0),
  averageDeliveryTime: integer("average_delivery_time").default(0), // minutes
  earningsBalance: decimal("earnings_balance", { precision: 10, scale: 2 }).default("0"),
  todayEarnings: decimal("today_earnings", { precision: 10, scale: 2 }).default("0"),
  weeklyEarnings: decimal("weekly_earnings", { precision: 10, scale: 2 }).default("0"),
  monthlyEarnings: decimal("monthly_earnings", { precision: 10, scale: 2 }).default("0"),
  performanceScore: decimal("performance_score", { precision: 5, scale: 2 }).default("0"), // 0-100
  onTimeDeliveryRate: decimal("on_time_delivery_rate", { precision: 5, scale: 2 }).default("0"), // percentage
  customerSatisfactionRate: decimal("customer_satisfaction_rate", { precision: 5, scale: 2 }).default("0"), // percentage
  activeOrdersCount: integer("active_orders_count").default(0),
  maxActiveOrders: integer("max_active_orders").default(3),
  shiftStart: timestamp("shift_start"),
  shiftEnd: timestamp("shift_end"),
  totalOnlineTime: integer("total_online_time").default(0), // minutes
  zonePreferences: jsonb("zone_preferences"), // {preferredAreas: [], avoidAreas: []}
  isVerified: boolean("is_verified").default(false),
  isAvailableForOrders: boolean("is_available_for_orders").default(true),
  lastActivityAt: timestamp("last_activity_at"),
  emergencyContact: varchar("emergency_contact", { length: 100 }),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
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

// Rider Location Tracking table
export const riderLocationHistory = pgTable("rider_location_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  location: jsonb("location").notNull(), // {lat, lng, accuracy, speed, heading}
  timestamp: timestamp("timestamp").defaultNow(),
  orderId: uuid("order_id").references(() => orders.id), // if during active delivery
  activityType: varchar("activity_type", { length: 20 }).default("idle"), // idle, traveling_to_pickup, traveling_to_delivery, at_restaurant, at_customer
});

// Rider Assignment Queue table
export const riderAssignmentQueue = pgTable("rider_assignment_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  assignedRiderId: uuid("assigned_rider_id").references(() => riders.id),
  priority: integer("priority").default(1), // 1-5, higher = more urgent
  maxDistance: decimal("max_distance", { precision: 5, scale: 2 }).default("10"), // km
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  restaurantLocation: jsonb("restaurant_location").notNull(),
  deliveryLocation: jsonb("delivery_location").notNull(),
  assignmentAttempts: integer("assignment_attempts").default(0),
  rejectedByRiders: jsonb("rejected_by_riders"), // array of rider IDs who rejected
  assignmentStatus: varchar("assignment_status", { length: 20 }).default("pending"), // pending, assigned, accepted, rejected, timeout
  createdAt: timestamp("created_at").defaultNow(),
  assignedAt: timestamp("assigned_at"),
  acceptedAt: timestamp("accepted_at"),
  timeoutAt: timestamp("timeout_at"),
});

// Rider Performance Metrics table
export const riderPerformanceMetrics = pgTable("rider_performance_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  date: timestamp("date").notNull(),
  totalOrders: integer("total_orders").default(0),
  completedOrders: integer("completed_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  averageDeliveryTime: integer("average_delivery_time").default(0), // minutes
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  onlineTimeMinutes: integer("online_time_minutes").default(0),
  totalDistanceTraveled: decimal("total_distance_traveled", { precision: 8, scale: 2 }).default("0"), // km
  fuelCost: decimal("fuel_cost", { precision: 8, scale: 2 }).default("0"),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }).default("0"), // percentage
  onTimeDeliveryRate: decimal("on_time_delivery_rate", { precision: 5, scale: 2 }).default("0"),
  customerSatisfactionScore: decimal("customer_satisfaction_score", { precision: 5, scale: 2 }).default("0"),
  incidentsCount: integer("incidents_count").default(0),
  bonusEarned: decimal("bonus_earned", { precision: 10, scale: 2 }).default("0"),
});

// Payment transactions for NexusPay integration
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("PHP"),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // nexuspay_gcash, nexuspay_maya, nexuspay_card, cash
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed, cancelled, refunded
  nexusPayTransactionId: varchar("nexuspay_transaction_id", { length: 100 }),
  nexusPayReferenceNumber: varchar("nexuspay_reference_number", { length: 100 }),
  nexusPayStatus: varchar("nexuspay_status", { length: 50 }),
  nexusPayResponse: jsonb("nexuspay_response"), // Full response from NexusPay API
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at"),
  refundedAt: timestamp("refunded_at"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment status history for tracking payment state changes
export const paymentStatusHistory = pgTable("payment_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: uuid("payment_id").references(() => payments.id).notNull(),
  fromStatus: varchar("from_status", { length: 20 }),
  toStatus: varchar("to_status", { length: 20 }).notNull(),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow(),
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

export const ridersRelations = relations(riders, ({ one, many }) => ({
  user: one(users, { fields: [riders.userId], references: [users.id] }),
  locationHistory: many(riderLocationHistory),
  assignmentQueue: many(riderAssignmentQueue),
  performanceMetrics: many(riderPerformanceMetrics),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [orders.restaurantId], references: [restaurants.id] }),
  rider: one(users, { fields: [orders.riderId], references: [users.id] }),
  statusHistory: many(orderStatusHistory),
  review: many(reviews),
  riderLocationHistory: many(riderLocationHistory),
  assignmentQueue: many(riderAssignmentQueue),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const riderLocationHistoryRelations = relations(riderLocationHistory, ({ one }) => ({
  rider: one(riders, { fields: [riderLocationHistory.riderId], references: [riders.id] }),
  order: one(orders, { fields: [riderLocationHistory.orderId], references: [orders.id] }),
}));

export const riderAssignmentQueueRelations = relations(riderAssignmentQueue, ({ one }) => ({
  order: one(orders, { fields: [riderAssignmentQueue.orderId], references: [orders.id] }),
  assignedRider: one(riders, { fields: [riderAssignmentQueue.assignedRiderId], references: [riders.id] }),
}));

export const riderPerformanceMetricsRelations = relations(riderPerformanceMetrics, ({ one }) => ({
  rider: one(riders, { fields: [riderPerformanceMetrics.riderId], references: [riders.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
  customer: one(users, { fields: [reviews.customerId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [reviews.restaurantId], references: [restaurants.id] }),
  rider: one(users, { fields: [reviews.riderId], references: [users.id] }),
}));

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

export const btsIncentivesRelations = relations(btsIncentives, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsIncentives.riderId], references: [btsRiders.id] }),
}));

export const btsAuditReportsRelations = relations(btsAuditReports, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsAuditReports.riderId], references: [btsRiders.id] }),
}));

export const btsUndeclaredBookingsRelations = relations(btsUndeclaredBookings, ({ one }) => ({
  rider: one(btsRiders, { fields: [btsUndeclaredBookings.riderId], references: [btsRiders.id] }),
}));

// Zod schemas for validation  
export const insertUserSchema = createInsertSchema(users);
export const insertRestaurantSchema = createInsertSchema(restaurants);
export const insertMenuCategorySchema = createInsertSchema(menuCategories);
export const insertMenuItemSchema = createInsertSchema(menuItems);
export const insertOrderSchema = createInsertSchema(orders);
export const insertRiderSchema = createInsertSchema(riders);
export const insertReviewSchema = createInsertSchema(reviews);
export const insertRiderLocationHistorySchema = createInsertSchema(riderLocationHistory);
export const insertRiderAssignmentQueueSchema = createInsertSchema(riderAssignmentQueue);
export const insertRiderPerformanceMetricsSchema = createInsertSchema(riderPerformanceMetrics);

// Loyalty Types
export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints);
export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions);
export const insertRewardSchema = createInsertSchema(rewards);
export const insertRedemptionSchema = createInsertSchema(redemptions);

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
export type RiderLocationHistory = typeof riderLocationHistory.$inferSelect;
export type InsertRiderLocationHistory = z.infer<typeof insertRiderLocationHistorySchema>;
export type RiderAssignmentQueue = typeof riderAssignmentQueue.$inferSelect;
export type InsertRiderAssignmentQueue = z.infer<typeof insertRiderAssignmentQueueSchema>;
export type RiderPerformanceMetrics = typeof riderPerformanceMetrics.$inferSelect;
export type InsertRiderPerformanceMetrics = z.infer<typeof insertRiderPerformanceMetricsSchema>;

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;

// BTS System Types
export type BtsRider = typeof btsRiders.$inferSelect;
export type BtsSalesRemittance = typeof btsSalesRemittance.$inferSelect;
export type BtsLateRemittance = typeof btsLateRemittance.$inferSelect;
export type BtsAttendance = typeof btsAttendance.$inferSelect;
export type BtsPayroll = typeof btsPayroll.$inferSelect;
export type BtsIncentive = typeof btsIncentives.$inferSelect;
export type BtsAuditReport = typeof btsAuditReports.$inferSelect;
export type BtsUndeclaredBooking = typeof btsUndeclaredBookings.$inferSelect;