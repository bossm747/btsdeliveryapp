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
  preferences: jsonb("preferences"), // user dashboard preferences including notifications, dietary restrictions
  onboardingCompleted: boolean("onboarding_completed").default(false),
  onboardingStep: varchar("onboarding_step", { length: 50 }).default("personal_info"), // personal_info, address, preferences, verification, completed
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender", { length: 20 }), // male, female, other
  emergencyContact: varchar("emergency_contact", { length: 100 }),
  emergencyPhone: varchar("emergency_phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email Verification Tokens for secure email verification
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).notNull(), // Email being verified
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password Reset Tokens for secure password reset
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Addresses for address book management
export const userAddresses = pgTable("user_addresses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  title: varchar("title", { length: 100 }).notNull(), // "Home", "Work", "Office", etc.
  streetAddress: varchar("street_address", { length: 255 }).notNull(),
  barangay: varchar("barangay", { length: 100 }),
  city: varchar("city", { length: 100 }).notNull(),
  province: varchar("province", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }),
  landmark: varchar("landmark", { length: 255 }), // Near McDonald's, etc.
  deliveryInstructions: text("delivery_instructions"),
  coordinates: jsonb("coordinates"), // {lat, lng}
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Onboarding Progress tracking
export const userOnboardingProgress = pgTable("user_onboarding_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  step: varchar("step", { length: 50 }).notNull(), // personal_info, address, preferences, verification, tutorial, completed
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  stepData: jsonb("step_data"), // Additional data for each step
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Dietary Preferences and Restrictions
export const userDietaryPreferences = pgTable("user_dietary_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  dietaryRestrictions: jsonb("dietary_restrictions"), // ["vegetarian", "halal", "no_pork", "no_nuts", "diabetic"]
  allergies: jsonb("allergies"), // ["nuts", "seafood", "dairy", "gluten"]
  foodPreferences: jsonb("food_preferences"), // ["spicy", "mild", "sweet", "salty"]
  cuisinePreferences: jsonb("cuisine_preferences"), // ["filipino", "chinese", "american", "japanese"]
  avoidIngredients: jsonb("avoid_ingredients"), // ["msg", "artificial_sweeteners"]
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Notification Preferences
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),
  orderUpdates: boolean("order_updates").default(true),
  promotionalEmails: boolean("promotional_emails").default(true),
  restaurantUpdates: boolean("restaurant_updates").default(true),
  loyaltyRewards: boolean("loyalty_rewards").default(true),
  securityAlerts: boolean("security_alerts").default(true),
  weeklyDigest: boolean("weekly_digest").default(false),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // "22:00"
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // "08:00"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurants/Vendors table - Enhanced for complete merchant panel
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: uuid("owner_id").references(() => users.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }), // Filipino Food, Fast Food, Chinese, etc.
  
  // Media Assets
  logoUrl: varchar("logo_url", { length: 500 }), // Business logo
  imageUrl: varchar("image_url", { length: 500 }), // Cover/hero image
  galleryImages: jsonb("gallery_images"), // Array of additional images
  
  // Contact Information  
  address: jsonb("address").notNull(), // {street, barangay, city, province, zipCode}
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  socialMedia: jsonb("social_media"), // {facebook, instagram, twitter}
  
  // Operating Information
  operatingHours: jsonb("operating_hours"), // {monday: {open: "08:00", close: "22:00", isClosed: false}, ...}
  holidayHours: jsonb("holiday_hours"), // Special hours/closures for holidays
  serviceAreas: jsonb("service_areas"), // Delivery zones and coverage areas
  services: jsonb("services").default("[]"), // ["food", "mart", "express", "parcel"]
  
  // Business Settings
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).default("0"),
  estimatedDeliveryTime: integer("estimated_delivery_time").default(30), // minutes
  maxOrdersPerHour: integer("max_orders_per_hour").default(50),
  preparationBuffer: integer("preparation_buffer").default(5), // minutes
  
  // Business Status
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  isAcceptingOrders: boolean("is_accepting_orders").default(true),
  pauseUntil: timestamp("pause_until"), // Temporary pause
  
  // Legal & Tax Information
  businessLicense: varchar("business_license", { length: 100 }),
  taxId: varchar("tax_id", { length: 50 }),
  vatRegistered: boolean("vat_registered").default(false),
  
  // Performance Metrics
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalOrders: integer("total_orders").default(0),
  totalReviews: integer("total_reviews").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu categories for organizing items - Enhanced
export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 500 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  isVisible: boolean("is_visible").default(true), // Hide/show category
  availableHours: jsonb("available_hours"), // Time-based availability
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu items - Enhanced for advanced management
export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  categoryId: uuid("category_id").references(() => menuCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  shortDescription: varchar("short_description", { length: 150 }),
  
  // Pricing & Availability
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }), // Original/crossed-out price
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // For profit analysis
  isAvailable: boolean("is_available").default(true),
  availableHours: jsonb("available_hours"), // Time-based availability
  
  // Media & Presentation
  imageUrl: varchar("image_url", { length: 500 }),
  galleryImages: jsonb("gallery_images"), // Multiple images
  displayOrder: integer("display_order").default(0),
  
  // Preparation & Kitchen
  preparationTime: integer("preparation_time").default(15), // minutes
  kitchenNotes: text("kitchen_notes"), // Internal preparation notes
  
  // Dietary & Allergen Information
  tags: jsonb("tags"), // ["spicy", "vegetarian", "gluten-free", "bestseller"]
  allergens: jsonb("allergens"), // ["nuts", "dairy", "gluten"]
  nutritionalInfo: jsonb("nutritional_info"), // calories, protein, etc
  
  // Inventory Management
  stockQuantity: integer("stock_quantity").default(-1), // -1 = unlimited
  lowStockThreshold: integer("low_stock_threshold").default(5),
  isTrackingStock: boolean("is_tracking_stock").default(false),
  
  // Performance Metrics
  totalOrders: integer("total_orders").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu item modifiers/options for customization
export const menuModifiers = pgTable("menu_modifiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // "Size", "Add-ons", "Spice Level"
  type: varchar("type", { length: 20 }).notNull(), // "single", "multiple"
  isRequired: boolean("is_required").default(false),
  minSelections: integer("min_selections").default(0),
  maxSelections: integer("max_selections").default(1),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Individual options within modifiers
export const modifierOptions = pgTable("modifier_options", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  modifierId: uuid("modifier_id").references(() => menuModifiers.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(), // "Large", "Extra Cheese", "Mild"
  priceAdjustment: decimal("price_adjustment", { precision: 10, scale: 2 }).default("0"),
  isDefault: boolean("is_default").default(false),
  isAvailable: boolean("is_available").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Link menu items to their available modifiers
export const menuItemModifiers = pgTable("menu_item_modifiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id).notNull(),
  modifierId: uuid("modifier_id").references(() => menuModifiers.id).notNull(),
  isRequired: boolean("is_required").default(false), // Override modifier's default
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Promotions and marketing campaigns
export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull(), // "percentage", "fixed_amount", "bogo", "bundle"
  code: varchar("code", { length: 50 }).unique(), // Promo code (optional for automatic promotions)
  
  // Discount Configuration
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }).default("0"),
  maximumDiscountAmount: decimal("maximum_discount_amount", { precision: 10, scale: 2 }),
  
  // Applicability
  applicableItems: jsonb("applicable_items"), // Array of menu item IDs (null = all items)
  applicableCategories: jsonb("applicable_categories"), // Array of category IDs
  
  // Usage Limits
  usageLimit: integer("usage_limit"), // Total usage limit (null = unlimited)
  usageLimitPerUser: integer("usage_limit_per_user").default(1),
  currentUsageCount: integer("current_usage_count").default(0),
  
  // Time Constraints
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  availableHours: jsonb("available_hours"), // Time-based availability
  
  // Status
  isActive: boolean("is_active").default(true),
  isAutoApply: boolean("is_auto_apply").default(false), // Apply automatically without code
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial records - Earnings, payouts, and fee breakdowns
export const vendorEarnings = pgTable("vendor_earnings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  
  // Revenue Breakdown
  grossAmount: decimal("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(), // Percentage
  processingFeeAmount: decimal("processing_fee_amount", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payout Information
  payoutStatus: varchar("payout_status", { length: 20 }).default("pending"), // pending, processed, failed
  payoutDate: timestamp("payout_date"),
  payoutReference: varchar("payout_reference", { length: 100 }),
  
  // Transaction Details
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // "order", "adjustment", "fee"
  description: text("description"),
  
  recordDate: timestamp("record_date").defaultNow(),
});

// Staff management for restaurant teams
export const restaurantStaff = pgTable("restaurant_staff", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  
  // Role and Permissions
  role: varchar("role", { length: 50 }).notNull(), // "owner", "manager", "staff", "cashier"
  permissions: jsonb("permissions"), // {orders: true, menu: true, analytics: false, settings: false}
  
  // Employment Details
  employeeId: varchar("employee_id", { length: 50 }),
  hourlyWage: decimal("hourly_wage", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"), // null if still active
  
  // Status
  isActive: boolean("is_active").default(true),
  canLogin: boolean("can_login").default(true),
  lastShiftStart: timestamp("last_shift_start"),
  lastShiftEnd: timestamp("last_shift_end"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced reviews system for customer relationship management
export const reviewResponses = pgTable("review_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: uuid("review_id").references(() => reviews.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  staffUserId: uuid("staff_user_id").references(() => users.id), // Who responded
  
  responseText: text("response_text").notNull(),
  isPublic: boolean("is_public").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer relationship management
export const customerNotes = pgTable("customer_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  staffUserId: uuid("staff_user_id").references(() => users.id).notNull(),
  
  noteText: text("note_text").notNull(),
  type: varchar("type", { length: 20 }).default("general"), // "general", "complaint", "preference", "allergy"
  isPrivate: boolean("is_private").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory management
export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }),
  unit: varchar("unit", { length: 20 }).notNull(), // "pieces", "kg", "liters", etc.
  
  // Stock Information
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).default("0"),
  minimumStock: decimal("minimum_stock", { precision: 10, scale: 2 }).default("0"),
  maximumStock: decimal("maximum_stock", { precision: 10, scale: 2 }),
  
  // Pricing
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  
  // Tracking
  isActive: boolean("is_active").default(true),
  isTrackStock: boolean("is_track_stock").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit trail for important actions
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  userId: uuid("user_id").references(() => users.id).notNull(),
  
  action: varchar("action", { length: 100 }).notNull(), // "order_status_changed", "menu_item_updated", etc.
  resource: varchar("resource", { length: 50 }).notNull(), // "order", "menu_item", "user", etc.
  resourceId: uuid("resource_id"),
  
  oldValues: jsonb("old_values"), // Previous state
  newValues: jsonb("new_values"), // New state
  metadata: jsonb("metadata"), // Additional context
  
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// User favorites for restaurants
export const userFavorites = pgTable("user_favorites", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Delivery Routes table for tracking optimized delivery paths
export const deliveryRoutes = pgTable("delivery_routes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  riderId: uuid("rider_id").references(() => riders.id).notNull(),
  origin: jsonb("origin").notNull(), // {lat, lng, address}
  destination: jsonb("destination").notNull(), // {lat, lng, address}
  waypoints: jsonb("waypoints"), // [{lat, lng, address}]
  distance: decimal("distance", { precision: 8, scale: 2 }).notNull(), // kilometers
  estimatedDuration: integer("estimated_duration").notNull(), // minutes
  actualDuration: integer("actual_duration"), // minutes
  routePolyline: text("route_polyline"), // encoded polyline
  status: varchar("status", { length: 20 }).default("planned"), // planned, active, completed, cancelled
  trafficConditions: varchar("traffic_conditions", { length: 20 }), // light, moderate, heavy
  weatherConditions: varchar("weather_conditions", { length: 20 }), // clear, rain, storm
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Delivery Tracking Events table for real-time status updates
export const deliveryTrackingEvents = pgTable("delivery_tracking_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  riderId: uuid("rider_id").references(() => riders.id),
  eventType: varchar("event_type", { length: 50 }).notNull(), // order_placed, rider_assigned, picked_up, in_transit, delivered, cancelled
  eventData: jsonb("event_data"), // Additional event-specific data
  location: jsonb("location"), // {lat, lng, accuracy}
  estimatedArrival: timestamp("estimated_arrival"),
  notes: text("notes"),
  timestamp: timestamp("timestamp").defaultNow(),
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

// ==================== ADMIN BACK OFFICE SYSTEM TABLES ====================
// Comprehensive admin dashboard and back office management

// Admin Audit Logs - Track all admin actions for security and compliance
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: uuid("admin_user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 100 }).notNull(), // create, update, delete, approve, suspend, etc.
  resource: varchar("resource", { length: 50 }).notNull(), // users, orders, restaurants, riders, etc.
  resourceId: varchar("resource_id", { length: 255 }), // ID of the affected resource
  details: jsonb("details"), // Full details of what was changed
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Commission Rules - Configurable commission structure
export const commissionRules = pgTable("commission_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  serviceType: varchar("service_type", { length: 50 }).notNull(), // food_delivery, pabili, pabayad, parcel
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // percentage, fixed, tiered
  value: decimal("value", { precision: 10, scale: 4 }).notNull(), // Commission percentage or fixed amount
  minOrderValue: decimal("min_order_value", { precision: 10, scale: 2 }),
  maxOrderValue: decimal("max_order_value", { precision: 10, scale: 2 }),
  restaurantCategory: varchar("restaurant_category", { length: 100 }),
  zoneRestrictions: jsonb("zone_restrictions"), // {includedZones: [], excludedZones: []}
  timeRestrictions: jsonb("time_restrictions"), // {validHours: [], validDays: []}
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").defaultNow(),
  expiryDate: timestamp("expiry_date"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Alerts - Platform-wide alerts and notifications
export const systemAlerts = pgTable("system_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // sla_breach, payment_failure, system_error, high_traffic
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  affectedService: varchar("affected_service", { length: 50 }),
  affectedZones: jsonb("affected_zones"),
  metadata: jsonb("metadata"), // Additional context data
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, acknowledged, resolved
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  autoResolve: boolean("auto_resolve").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support Tickets - Customer and merchant support system
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number", { length: 20 }).unique().notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  category: varchar("category", { length: 100 }).notNull(), // payment_issue, delivery_problem, app_bug, account_issue
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, in_progress, resolved, closed
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  attachments: jsonb("attachments"), // Array of file URLs
  customerSatisfaction: integer("customer_satisfaction"), // 1-5 rating
  internalNotes: jsonb("internal_notes"), // Array of admin notes
  resolutionTime: integer("resolution_time"), // minutes from creation to resolution
  firstResponseTime: integer("first_response_time"), // minutes to first admin response
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Messages - Conversation history for tickets
export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: uuid("ticket_id").references(() => supportTickets.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false), // Internal admin notes vs customer-visible messages
  attachments: jsonb("attachments"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Zones Management - Philippines barangay/city level zone configuration
export const deliveryZones: any = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  type: varchar("type", { length: 20 }).notNull(), // barangay, city, district
  parentZoneId: uuid("parent_zone_id").references(() => deliveryZones.id),
  boundaries: jsonb("boundaries").notNull(), // GeoJSON polygon
  isActive: boolean("is_active").default(true),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }),
  surgeMultiplier: decimal("surge_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  estimatedDeliveryTime: integer("estimated_delivery_time").default(30), // minutes
  weatherRestrictions: jsonb("weather_restrictions"), // Rain level restrictions etc
  operatingHours: jsonb("operating_hours"),
  maxRiders: integer("max_riders"),
  currentRiders: integer("current_riders").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Configuration - Global settings and feature toggles
export const platformConfig = pgTable("platform_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: varchar("config_key", { length: 100 }).unique().notNull(),
  configValue: jsonb("config_value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // payment, delivery, surge, notification
  dataType: varchar("data_type", { length: 20 }).notNull(), // string, number, boolean, json
  isEditable: boolean("is_editable").default(true),
  requiresRestart: boolean("requires_restart").default(false),
  lastModifiedBy: uuid("last_modified_by").references(() => users.id),
  validationRules: jsonb("validation_rules"), // Schema for validating config values
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Settlements - Track commission settlements with vendors/riders
export const financialSettlements = pgTable("financial_settlements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  settlementNumber: varchar("settlement_number", { length: 30 }).unique().notNull(),
  entityType: varchar("entity_type", { length: 20 }).notNull(), // vendor, rider
  entityId: uuid("entity_id").notNull(), // References users.id
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  totalOrders: integer("total_orders").default(0),
  grossRevenue: decimal("gross_revenue", { precision: 12, scale: 2 }).default("0"),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).default("0"),
  fees: decimal("fees", { precision: 10, scale: 2 }).default("0"),
  adjustments: decimal("adjustments", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).default("0"),
  codAmount: decimal("cod_amount", { precision: 12, scale: 2 }).default("0"), // Cash on delivery
  remittanceAmount: decimal("remittance_amount", { precision: 12, scale: 2 }).default("0"),
  outstandingBalance: decimal("outstanding_balance", { precision: 12, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, paid, disputed
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  generatedBy: uuid("generated_by").references(() => users.id).notNull(),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// System Health Monitoring - Track API and service health
export const systemHealthMetrics = pgTable("system_health_metrics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service", { length: 100 }).notNull(), // api, database, payments, maps, sms
  endpoint: varchar("endpoint", { length: 255 }),
  responseTime: integer("response_time"), // milliseconds
  statusCode: integer("status_code"),
  isHealthy: boolean("is_healthy").default(true),
  errorMessage: text("error_message"),
  errorCount: integer("error_count").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Broadcast Messages - Platform-wide communications
export const broadcastMessages = pgTable("broadcast_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 50 }).notNull(), // announcement, maintenance, promotion, warning
  targetAudience: varchar("target_audience", { length: 50 }).notNull(), // all, customers, vendors, riders
  targetZones: jsonb("target_zones"), // Specific zones if targeted
  targetUserSegment: jsonb("target_user_segment"), // Specific user criteria
  deliveryMethod: jsonb("delivery_method").notNull(), // {email: true, sms: false, push: true, in_app: true}
  priority: varchar("priority", { length: 20 }).notNull().default("normal"), // low, normal, high, urgent
  scheduledAt: timestamp("scheduled_at"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, scheduled, sent, cancelled
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  sentAt: timestamp("sent_at"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

// Zod schemas for admin back office tables
export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs);
export const selectAdminAuditLogSchema = adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;
export type SelectAdminAuditLog = typeof adminAuditLogs.$inferSelect;

export const insertCommissionRuleSchema = createInsertSchema(commissionRules);
export const selectCommissionRuleSchema = commissionRules.$inferSelect;
export type InsertCommissionRule = z.infer<typeof insertCommissionRuleSchema>;
export type SelectCommissionRule = typeof commissionRules.$inferSelect;

export const insertSystemAlertSchema = createInsertSchema(systemAlerts);
export const selectSystemAlertSchema = systemAlerts.$inferSelect;
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SelectSystemAlert = typeof systemAlerts.$inferSelect;

export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export const selectSupportTicketSchema = supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SelectSupportTicket = typeof supportTickets.$inferSelect;

export const insertSupportMessageSchema = createInsertSchema(supportMessages);
export const selectSupportMessageSchema = supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SelectSupportMessage = typeof supportMessages.$inferSelect;

export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones);
export const selectDeliveryZoneSchema = deliveryZones.$inferSelect;
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;
export type SelectDeliveryZone = typeof deliveryZones.$inferSelect;

export const insertPlatformConfigSchema = createInsertSchema(platformConfig);
export const selectPlatformConfigSchema = platformConfig.$inferSelect;
export type InsertPlatformConfig = z.infer<typeof insertPlatformConfigSchema>;
export type SelectPlatformConfig = typeof platformConfig.$inferSelect;

export const insertFinancialSettlementSchema = createInsertSchema(financialSettlements);
export const selectFinancialSettlementSchema = financialSettlements.$inferSelect;
export type InsertFinancialSettlement = z.infer<typeof insertFinancialSettlementSchema>;
export type SelectFinancialSettlement = typeof financialSettlements.$inferSelect;

export const insertSystemHealthMetricSchema = createInsertSchema(systemHealthMetrics);
export const selectSystemHealthMetricSchema = systemHealthMetrics.$inferSelect;
export type InsertSystemHealthMetric = z.infer<typeof insertSystemHealthMetricSchema>;
export type SelectSystemHealthMetric = typeof systemHealthMetrics.$inferSelect;

export const insertBroadcastMessageSchema = createInsertSchema(broadcastMessages);
export const selectBroadcastMessageSchema = broadcastMessages.$inferSelect;
export type InsertBroadcastMessage = z.infer<typeof insertBroadcastMessageSchema>;
export type SelectBroadcastMessage = typeof broadcastMessages.$inferSelect;

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
export const insertDeliveryRouteSchema = createInsertSchema(deliveryRoutes);
export const insertDeliveryTrackingEventSchema = createInsertSchema(deliveryTrackingEvents);

// User Management Schemas
export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const insertUserAddressSchema = createInsertSchema(userAddresses);
export const insertUserOnboardingProgressSchema = createInsertSchema(userOnboardingProgress);
export const insertUserDietaryPreferencesSchema = createInsertSchema(userDietaryPreferences);
export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences);

// Loyalty Types
export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints);
export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions);
export const insertRewardSchema = createInsertSchema(rewards);
export const insertRedemptionSchema = createInsertSchema(redemptions);

// Merchant Panel Types
export const insertMenuModifierSchema = createInsertSchema(menuModifiers);
export const insertModifierOptionSchema = createInsertSchema(modifierOptions);
export const insertMenuItemModifierSchema = createInsertSchema(menuItemModifiers);
export const insertPromotionSchema = createInsertSchema(promotions);
export const insertVendorEarningsSchema = createInsertSchema(vendorEarnings);
export const insertRestaurantStaffSchema = createInsertSchema(restaurantStaff);
export const insertReviewResponseSchema = createInsertSchema(reviewResponses);
export const insertCustomerNoteSchema = createInsertSchema(customerNotes);
export const insertInventoryItemSchema = createInsertSchema(inventoryItems);
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export const insertUserFavoritesSchema = createInsertSchema(userFavorites);

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
export type DeliveryRoute = typeof deliveryRoutes.$inferSelect;
export type InsertDeliveryRoute = z.infer<typeof insertDeliveryRouteSchema>;
export type DeliveryTrackingEvent = typeof deliveryTrackingEvents.$inferSelect;
export type InsertDeliveryTrackingEvent = z.infer<typeof insertDeliveryTrackingEventSchema>;

// User Management Types
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = z.infer<typeof insertUserAddressSchema>;
export type UserOnboardingProgress = typeof userOnboardingProgress.$inferSelect;
export type InsertUserOnboardingProgress = z.infer<typeof insertUserOnboardingProgressSchema>;
export type UserDietaryPreferences = typeof userDietaryPreferences.$inferSelect;
export type InsertUserDietaryPreferences = z.infer<typeof insertUserDietaryPreferencesSchema>;
export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;

// Merchant Panel Types  
export type MenuModifier = typeof menuModifiers.$inferSelect;
export type InsertMenuModifier = z.infer<typeof insertMenuModifierSchema>;
export type ModifierOption = typeof modifierOptions.$inferSelect;
export type InsertModifierOption = z.infer<typeof insertModifierOptionSchema>;
export type MenuItemModifier = typeof menuItemModifiers.$inferSelect;
export type InsertMenuItemModifier = z.infer<typeof insertMenuItemModifierSchema>;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type VendorEarnings = typeof vendorEarnings.$inferSelect;
export type InsertVendorEarnings = z.infer<typeof insertVendorEarningsSchema>;
export type RestaurantStaff = typeof restaurantStaff.$inferSelect;
export type InsertRestaurantStaff = z.infer<typeof insertRestaurantStaffSchema>;
export type ReviewResponse = typeof reviewResponses.$inferSelect;
export type InsertReviewResponse = z.infer<typeof insertReviewResponseSchema>;
export type CustomerNote = typeof customerNotes.$inferSelect;
export type InsertCustomerNote = z.infer<typeof insertCustomerNoteSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoritesSchema>;

// BTS System Types
export type BtsRider = typeof btsRiders.$inferSelect;
export type BtsSalesRemittance = typeof btsSalesRemittance.$inferSelect;
export type BtsLateRemittance = typeof btsLateRemittance.$inferSelect;
export type BtsAttendance = typeof btsAttendance.$inferSelect;
export type BtsPayroll = typeof btsPayroll.$inferSelect;
export type BtsIncentive = typeof btsIncentives.$inferSelect;
export type BtsAuditReport = typeof btsAuditReports.$inferSelect;
export type BtsUndeclaredBooking = typeof btsUndeclaredBookings.$inferSelect;