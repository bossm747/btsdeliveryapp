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

// Order Management Enums and Constants
export const ORDER_TYPES = {
  FOOD: 'food',
  PABILI: 'pabili', 
  PABAYAD: 'pabayad',
  PARCEL: 'parcel'
} as const;

export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
} as const;

// Delivery Type Options for Contactless Delivery
export const DELIVERY_TYPES = {
  HAND_TO_CUSTOMER: 'hand_to_customer',
  LEAVE_AT_DOOR: 'leave_at_door',
  MEET_OUTSIDE: 'meet_outside'
} as const;

export type DeliveryType = typeof DELIVERY_TYPES[keyof typeof DELIVERY_TYPES];

export const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  WHATSAPP: 'whatsapp',
  VIBER: 'viber'
} as const;

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

  // Channel preferences
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(true),
  pushNotifications: boolean("push_notifications").default(true),

  // Order notification preferences (granular)
  orderUpdates: boolean("order_updates").default(true),
  orderPlaced: boolean("order_placed").default(true),
  orderConfirmed: boolean("order_confirmed").default(true),
  orderPreparing: boolean("order_preparing").default(true),
  orderReady: boolean("order_ready").default(true),
  orderDelivered: boolean("order_delivered").default(true),

  // Rider notification preferences
  riderUpdates: boolean("rider_updates").default(true),
  riderAssigned: boolean("rider_assigned").default(true),
  riderArriving: boolean("rider_arriving").default(true),

  // Marketing/Promotional preferences
  promotionalEmails: boolean("promotional_emails").default(true),
  restaurantUpdates: boolean("restaurant_updates").default(true),
  loyaltyRewards: boolean("loyalty_rewards").default(true),

  // System preferences
  securityAlerts: boolean("security_alerts").default(true),
  weeklyDigest: boolean("weekly_digest").default(false),

  // Quiet hours settings
  quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
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

// Vendor Settlements - Aggregated settlement records for vendors
export const vendorSettlements = pgTable("vendor_settlements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  settlementNumber: varchar("settlement_number", { length: 50 }).unique().notNull(),

  // Settlement Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  settlementType: varchar("settlement_type", { length: 20 }).notNull().default("daily"), // daily, weekly, monthly

  // Order Summary
  totalOrders: integer("total_orders").default(0),
  completedOrders: integer("completed_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  refundedOrders: integer("refunded_orders").default(0),

  // Financial Summary
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).notNull().default("0.15"), // Default 15%
  serviceFees: decimal("service_fees", { precision: 10, scale: 2 }).default("0"),
  adjustments: decimal("adjustments", { precision: 10, scale: 2 }).default("0"), // Refunds, credits, etc.
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull().default("0"),

  // Status Tracking
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, processing, paid, disputed
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  processedAt: timestamp("processed_at"),

  // Payout Reference (if paid)
  payoutId: uuid("payout_id"),

  // Notes and Metadata
  notes: text("notes"),
  metadata: jsonb("metadata"), // Additional data like commission tier info

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor Payouts - Track actual money transfers to vendors
export const vendorPayouts = pgTable("vendor_payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => users.id).notNull(),
  settlementId: uuid("settlement_id").references(() => vendorSettlements.id),

  // Payout Details
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("PHP"),

  // Bank/Payment Details
  bankAccountId: uuid("bank_account_id"), // Reference to vendor's saved bank account
  payoutMethod: varchar("payout_method", { length: 50 }).notNull(), // bank_transfer, gcash, maya
  accountDetails: jsonb("account_details"), // Encrypted: {bank_name, account_number, account_name}

  // Status and Processing
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed, cancelled
  transactionRef: varchar("transaction_ref", { length: 100 }),
  providerRef: varchar("provider_ref", { length: 100 }), // Reference from payment provider

  // Processing Info
  processedBy: uuid("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  scheduledFor: timestamp("scheduled_for"),

  // Failure Handling
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").default(0),
  lastRetryAt: timestamp("last_retry_at"),

  // Batch Processing
  batchId: varchar("batch_id", { length: 100 }),

  // Notes
  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Enhanced Orders table for complete lifecycle management
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id).notNull(),
  riderId: uuid("rider_id").references(() => users.id),
  orderNumber: varchar("order_number", { length: 20 }).unique().notNull(),
  
  // Order Type and Status
  orderType: varchar("order_type", { length: 20 }).notNull().default("food"), // food, pabili, pabayad, parcel
  status: varchar("status", { length: 20 }).notNull().default("pending"), // payment_pending, pending, confirmed, preparing, ready, picked_up, in_transit, delivered, completed, cancelled
  previousStatus: varchar("previous_status", { length: 20 }), // For rollback purposes

  // Payment-Order Race Condition Prevention
  paymentPendingAt: timestamp("payment_pending_at"), // When order was created waiting for payment
  paymentConfirmedAt: timestamp("payment_confirmed_at"), // When payment was confirmed
  
  // Items and Pricing
  items: jsonb("items").notNull(), // Array of {itemId, name, price, quantity, specialInstructions, modifiers}
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  serviceFee: decimal("service_fee", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  tip: decimal("tip", { precision: 10, scale: 2 }).default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Payment Information
  paymentMethod: varchar("payment_method", { length: 50 }).notNull().default("cash"), // cash, gcash, maya, card
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"), // pending, processing, paid, failed, refunded, cancelled
  paymentTransactionId: varchar("payment_transaction_id", { length: 100 }),
  paymentProvider: varchar("payment_provider", { length: 50 }), // nexuspay, cash
  paidAt: timestamp("paid_at"), // When payment was confirmed/received
  paymentFailureReason: text("payment_failure_reason"), // Reason for payment failure
  
  // Delivery Information
  deliveryAddress: jsonb("delivery_address").notNull(), // Enhanced with coordinates, landmarks, etc.
  pickupAddress: jsonb("pickup_address"), // For parcel orders or special pickup locations
  specialInstructions: text("special_instructions"),
  customerNotes: text("customer_notes"), // Customer-specific notes
  internalNotes: text("internal_notes"), // Admin/vendor internal notes

  // Contactless Delivery Options
  deliveryType: varchar("delivery_type", { length: 30 }).default("hand_to_customer"), // hand_to_customer, leave_at_door, meet_outside
  contactlessInstructions: text("contactless_instructions"), // Specific instructions for leave_at_door (e.g., "Leave by the gate")
  deliveryProofPhoto: text("delivery_proof_photo"), // URL of proof photo for contactless delivery
  
  // Timing and SLA Management
  scheduledFor: timestamp("scheduled_for"), // Pre-order scheduling: when customer wants delivery (nullable = deliver now)
  estimatedPreparationTime: integer("estimated_preparation_time"), // minutes
  actualPreparationTime: integer("actual_preparation_time"), // minutes
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  deliveryTimeCommitment: timestamp("delivery_time_commitment"), // SLA commitment to customer
  orderPriority: integer("order_priority").default(1), // 1-5, higher = more urgent
  
  // Vendor Management
  vendorAcceptedAt: timestamp("vendor_accepted_at"),
  vendorRejectedAt: timestamp("vendor_rejected_at"),
  vendorRejectionReason: text("vendor_rejection_reason"),
  vendorPreparationTimeEstimate: integer("vendor_preparation_time_estimate"), // minutes
  autoAcceptDeadline: timestamp("auto_accept_deadline"), // Deadline for vendor acceptance
  
  // Rider Assignment and Tracking
  riderAssignedAt: timestamp("rider_assigned_at"),
  riderAcceptedAt: timestamp("rider_accepted_at"),
  riderArrivedAt: timestamp("rider_arrived_at"),
  pickedUpAt: timestamp("picked_up_at"),
  riderNotes: text("rider_notes"),
  proofOfDelivery: jsonb("proof_of_delivery"), // {type: 'photo', 'signature', data: 'base64...'}
  deliveryConfirmationCode: varchar("delivery_confirmation_code", { length: 10 }),
  
  // Performance and Quality Tracking
  isOnTime: boolean("is_on_time"),
  qualityRating: decimal("quality_rating", { precision: 3, scale: 2 }), // Customer rating
  deliveryRating: decimal("delivery_rating", { precision: 3, scale: 2 }), // Delivery experience rating
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }), // Combined rating
  
  // Dispute and Issue Management
  hasDispute: boolean("has_dispute").default(false),
  disputeReason: varchar("dispute_reason", { length: 100 }),
  disputeStatus: varchar("dispute_status", { length: 20 }), // open, investigating, resolved, escalated
  adminNotes: text("admin_notes"),
  resolutionNotes: text("resolution_notes"),
  
  // Notification Tracking
  notificationsSent: jsonb("notifications_sent"), // Track which notifications were sent and when
  customerContactPreference: varchar("customer_contact_preference", { length: 20 }).default("app"), // app, sms, call, email
  
  // Order Type Specific Fields
  parcelInsuranceValue: decimal("parcel_insurance_value", { precision: 10, scale: 2 }), // For parcel orders
  pabiliShoppingList: jsonb("pabili_shopping_list"), // For pabili orders - items to purchase
  pabiliReceipts: jsonb("pabili_receipts"), // Receipts from shopping
  pabayadBillDetails: jsonb("pabayad_bill_details"), // Bill payment details
  pabayadConfirmationCode: varchar("pabayad_confirmation_code", { length: 50 }),
  
  // Analytics and Reporting
  orderSource: varchar("order_source", { length: 50 }).default("app"), // app, web, phone, admin
  customerDevice: varchar("customer_device", { length: 50 }), // mobile, desktop, tablet
  peakHourOrder: boolean("peak_hour_order").default(false),
  weekendOrder: boolean("weekend_order").default(false),
  
  // System Fields
  isTest: boolean("is_test").default(false), // For testing purposes
  migrationId: varchar("migration_id", { length: 50 }), // For data migration tracking
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Order status tracking with comprehensive details
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  fromStatus: varchar("from_status", { length: 20 }),
  toStatus: varchar("to_status", { length: 20 }).notNull(),
  changedBy: uuid("changed_by").references(() => users.id), // Who made the status change
  changedByRole: varchar("changed_by_role", { length: 20 }), // customer, vendor, rider, admin, system
  reason: varchar("reason", { length: 100 }), // Reason for status change
  notes: text("notes"),
  isAutomaticTransition: boolean("is_automatic_transition").default(false),
  location: jsonb("location"), // GPS coordinates when status changed
  metadata: jsonb("metadata"), // Additional context data
  timestamp: timestamp("timestamp").defaultNow(),
});

// Order SLA Management - Track delivery commitments and performance
export const orderSlaTracking = pgTable("order_sla_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  
  // SLA Definitions
  vendorAcceptanceSla: integer("vendor_acceptance_sla").default(300), // 5 minutes in seconds
  preparationTimeSla: integer("preparation_time_sla"), // Expected preparation time in seconds
  pickupTimeSla: integer("pickup_time_sla").default(600), // 10 minutes for pickup
  deliveryTimeSla: integer("delivery_time_sla"), // Total delivery time commitment
  
  // Actual Performance
  vendorAcceptanceTime: integer("vendor_acceptance_time"), // Actual time taken
  preparationTime: integer("preparation_time"), // Actual time taken  
  pickupTime: integer("pickup_time"), // Actual time taken
  deliveryTime: integer("delivery_time"), // Actual total delivery time
  
  // SLA Status
  vendorAcceptanceSlaBreached: boolean("vendor_acceptance_sla_breached").default(false),
  preparationSlaBreached: boolean("preparation_sla_breached").default(false),
  pickupSlaBreached: boolean("pickup_sla_breached").default(false),
  deliverySlaBreached: boolean("delivery_sla_breached").default(false),
  
  // Customer Communication
  customerNotifiedOfDelay: boolean("customer_notified_of_delay").default(false),
  delayReason: varchar("delay_reason", { length: 200 }),
  compensationOffered: jsonb("compensation_offered"), // {type, amount, description}
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Notifications - Track all notifications sent for each order
export const orderNotifications = pgTable("order_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  recipientId: uuid("recipient_id").references(() => users.id).notNull(),
  recipientRole: varchar("recipient_role", { length: 20 }).notNull(), // customer, vendor, rider, admin
  
  // Notification Details
  notificationType: varchar("notification_type", { length: 20 }).notNull(), // email, sms, push, whatsapp, viber
  trigger: varchar("trigger", { length: 50 }).notNull(), // order_placed, status_changed, rider_assigned, etc.
  templateId: varchar("template_id", { length: 50 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message"),
  
  // Delivery Status
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, delivered, failed, read
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failureReason: text("failure_reason"),
  
  // Channel Specific Data
  channelData: jsonb("channel_data"), // Provider-specific data (message ID, etc.)
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Order Business Rules - Define automatic status transitions and business logic
export const orderBusinessRules = pgTable("order_business_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  // Rule Conditions
  orderType: varchar("order_type", { length: 20 }), // Apply to specific order types
  fromStatus: varchar("from_status", { length: 20 }).notNull(),
  toStatus: varchar("to_status", { length: 20 }).notNull(),
  triggerConditions: jsonb("trigger_conditions"), // Complex conditions in JSON
  
  // Rule Actions
  actions: jsonb("actions"), // {notify: [], updateFields: {}, assignRider: true}
  autoTransition: boolean("auto_transition").default(false),
  transitionDelay: integer("transition_delay").default(0), // Delay in seconds
  
  // Rule Constraints
  timeConstraints: jsonb("time_constraints"), // {validHours: [], validDays: []}
  locationConstraints: jsonb("location_constraints"), // Specific to zones/areas
  orderValueConstraints: jsonb("order_value_constraints"), // Min/max order values
  
  // Rule Status
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // 1-10, higher = more priority
  
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Disputes - Handle customer complaints and dispute resolution
export const orderDisputes = pgTable("order_disputes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  reportedBy: uuid("reported_by").references(() => users.id).notNull(),
  reporterRole: varchar("reporter_role", { length: 20 }).notNull(), // customer, vendor, rider
  
  // Dispute Details
  disputeType: varchar("dispute_type", { length: 50 }).notNull(), // wrong_order, late_delivery, quality_issue, payment_issue, damage, missing_items
  category: varchar("category", { length: 50 }).notNull(), // delivery, food_quality, service, payment, other
  severity: varchar("severity", { length: 20 }).default("medium"), // low, medium, high, critical
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  evidence: jsonb("evidence"), // Photos, videos, documents
  
  // Resolution Process
  status: varchar("status", { length: 20 }).default("open"), // open, investigating, escalated, resolved, closed
  assignedTo: uuid("assigned_to").references(() => users.id), // Admin handling the dispute
  priority: integer("priority").default(1), // 1-5, higher = more urgent
  
  // Communication
  lastResponseAt: timestamp("last_response_at"),
  responseTimeTarget: timestamp("response_time_target"),
  resolutionTarget: timestamp("resolution_target"),
  
  // Resolution Details
  resolutionType: varchar("resolution_type", { length: 50 }), // refund, replacement, credit, apology, no_action
  resolutionAmount: decimal("resolution_amount", { precision: 10, scale: 2 }),
  resolutionDescription: text("resolution_description"),
  resolutionNotes: text("resolution_notes"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  
  // Customer Satisfaction
  customerSatisfied: boolean("customer_satisfied"),
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  satisfactionFeedback: text("satisfaction_feedback"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order Dispute Messages - Communication thread for dispute resolution
export const orderDisputeMessages = pgTable("order_dispute_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  disputeId: uuid("dispute_id").references(() => orderDisputes.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  senderRole: varchar("sender_role", { length: 20 }).notNull(),
  
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text"), // text, image, document, status_update
  attachments: jsonb("attachments"), // File attachments
  isInternal: boolean("is_internal").default(false), // Internal admin notes
  
  readBy: jsonb("read_by"), // Array of user IDs who read the message

  createdAt: timestamp("created_at").defaultNow(),
});

// Order Messages - In-app chat between customers and riders during active deliveries
export const orderMessages = pgTable("order_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  senderRole: varchar("sender_role", { length: 20 }).notNull(), // 'customer' or 'rider'
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Loyalty Tiers Configuration
export const LOYALTY_TIERS = {
  BRONZE: 'bronze',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum'
} as const;

export const LOYALTY_TRANSACTION_TYPES = {
  EARN: 'earn',
  REDEEM: 'redeem',
  EXPIRE: 'expire',
  BONUS: 'bonus',
  ADJUSTMENT: 'adjustment',
  SIGNUP: 'signup',
  BIRTHDAY: 'birthday',
  PROMO: 'promo'
} as const;

// Loyalty Tiers table - configurable tier definitions
export const loyaltyTiers = pgTable("loyalty_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(), // bronze, silver, gold, platinum
  displayName: varchar("display_name", { length: 100 }).notNull(),
  minPoints: integer("min_points").notNull().default(0),
  maxPoints: integer("max_points"), // null for highest tier
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).notNull().default("1.00"), // Points multiplier
  benefits: jsonb("benefits").notNull().default("[]"), // Array of benefit strings
  icon: varchar("icon", { length: 50 }), // Icon name
  color: varchar("color", { length: 20 }), // Hex color code
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Enhanced Loyalty Points/Accounts table
export const loyaltyPoints = pgTable("loyalty_points", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  points: integer("points").notNull().default(0), // Current available balance
  lifetimePoints: integer("lifetime_points").notNull().default(0), // Total earned (for tier calculation)
  pendingPoints: integer("pending_points").notNull().default(0), // Points pending from incomplete orders
  expiredPoints: integer("expired_points").notNull().default(0), // Total expired points
  redeemedPoints: integer("redeemed_points").notNull().default(0), // Total redeemed points
  tier: varchar("tier", { length: 50 }).notNull().default("bronze"),
  tierUpdatedAt: timestamp("tier_updated_at"),
  nextTierProgress: integer("next_tier_progress").default(0), // Percentage to next tier
  lastEarnedAt: timestamp("last_earned_at"),
  lastRedeemedAt: timestamp("last_redeemed_at"),
  signupBonusAwarded: boolean("signup_bonus_awarded").default(false),
  birthdayBonusYear: integer("birthday_bonus_year"), // Track which year birthday bonus was given
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Enhanced Points Transactions table with expiry
export const pointsTransactions = pgTable("points_transactions", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id", { length: 255 }).references(() => loyaltyPoints.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),
  type: varchar("type", { length: 50 }).notNull(), // earn, redeem, expire, bonus, adjustment
  points: integer("points").notNull(), // Positive for earn/bonus, negative for redeem/expire
  balanceBefore: integer("balance_before"),
  balanceAfter: integer("balance_after"),
  description: varchar("description", { length: 500 }),
  metadata: jsonb("metadata"), // Additional info like order amount, multiplier used, etc.
  expiresAt: timestamp("expires_at"), // When these points expire (for earned points)
  expiredAt: timestamp("expired_at"), // When points actually expired
  isExpired: boolean("is_expired").default(false),
  referenceId: varchar("reference_id", { length: 255 }), // For tracking related transactions
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

// Customer Payment Methods - for storing saved payment methods
export const customerPaymentMethods = pgTable("customer_payment_methods", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // card, gcash, maya, bank_account
  provider: varchar("provider", { length: 50 }).notNull(), // paymongo, nexuspay
  
  // Tokenized payment data (never store actual card details)
  token: varchar("token", { length: 255 }).notNull(), // Provider token/ID
  fingerprint: varchar("fingerprint", { length: 100 }), // Unique identifier for deduplication
  
  // Display information (safe to store)
  displayName: varchar("display_name", { length: 100 }), // "Visa •••• 1234"
  lastFour: varchar("last_four", { length: 4 }), // Last 4 digits for cards
  expiryMonth: integer("expiry_month"), // For cards
  expiryYear: integer("expiry_year"), // For cards
  brand: varchar("brand", { length: 50 }), // visa, mastercard, gcash, maya
  nickname: varchar("nickname", { length: 100 }), // User-defined nickname like "My GCash", "Work Card"

  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"), // Provider-specific metadata
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Webhook Events - for tracking webhook notifications
export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: uuid("payment_id").references(() => payments.id),
  provider: varchar("provider", { length: 50 }).notNull(), // nexuspay, paymongo
  eventType: varchar("event_type", { length: 100 }).notNull(), // payment_intent.succeeded, etc.
  webhookId: varchar("webhook_id", { length: 255 }), // Provider webhook ID
  
  payload: jsonb("payload").notNull(), // Full webhook payload
  signature: varchar("signature", { length: 255 }), // Webhook signature for verification
  processed: boolean("processed").default(false),
  processingError: text("processing_error"),
  
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Refunds - Enhanced refund management
export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentId: uuid("payment_id").references(() => payments.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 100 }).notNull(), // customer_request, fraudulent, duplicate, etc.
  description: text("description"),
  
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  provider: varchar("provider", { length: 50 }).notNull(),
  providerRefundId: varchar("provider_refund_id", { length: 255 }),
  
  initiatedBy: uuid("initiated_by").references(() => users.id), // Admin/staff who initiated
  approvedBy: uuid("approved_by").references(() => users.id), // Admin who approved
  
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payouts - For rider and vendor payouts
export const payouts = pgTable("payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: uuid("recipient_id").references(() => users.id).notNull(), // rider or vendor
  recipientType: varchar("recipient_type", { length: 20 }).notNull(), // rider, vendor
  
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("PHP"),
  
  payoutMethod: varchar("payout_method", { length: 50 }).notNull(), // gcash, bank_transfer, maya
  accountDetails: jsonb("account_details").notNull(), // encrypted account info
  
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  provider: varchar("provider", { length: 50 }).notNull(), // nexuspay, paymongo
  providerPayoutId: varchar("provider_payout_id", { length: 255 }),
  
  batchId: varchar("batch_id", { length: 100 }), // For batch payouts
  description: text("description"),
  
  scheduledFor: timestamp("scheduled_for"), // For scheduled payouts
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  messages: many(orderMessages),
}));

export const orderMessagesRelations = relations(orderMessages, ({ one }) => ({
  order: one(orders, { fields: [orderMessages.orderId], references: [orders.id] }),
  sender: one(users, { fields: [orderMessages.senderId], references: [users.id] }),
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
export const insertOrderStatusHistorySchema = createInsertSchema(orderStatusHistory);
export const insertOrderSlaTrackingSchema = createInsertSchema(orderSlaTracking);
export const insertOrderNotificationSchema = createInsertSchema(orderNotifications);
export const insertOrderBusinessRuleSchema = createInsertSchema(orderBusinessRules);
export const insertOrderDisputeSchema = createInsertSchema(orderDisputes);
export const insertOrderDisputeMessageSchema = createInsertSchema(orderDisputeMessages);
export const insertOrderMessageSchema = createInsertSchema(orderMessages, {
  senderRole: z.enum(['customer', 'rider']),
});
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

// Payment Types
export const insertPaymentSchema = createInsertSchema(payments);
export const insertPaymentStatusHistorySchema = createInsertSchema(paymentStatusHistory);
export const insertCustomerPaymentMethodSchema = createInsertSchema(customerPaymentMethods);
export const insertPaymentWebhookEventSchema = createInsertSchema(paymentWebhookEvents);
export const insertRefundSchema = createInsertSchema(refunds);
export const insertPayoutSchema = createInsertSchema(payouts);

// Loyalty Types
export const insertLoyaltyTierSchema = createInsertSchema(loyaltyTiers);
export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints);
export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions, {
  type: z.enum(['earn', 'redeem', 'expire', 'bonus', 'adjustment', 'signup', 'birthday', 'promo'])
});
export const insertRewardSchema = createInsertSchema(rewards);
export const insertRedemptionSchema = createInsertSchema(redemptions);

// Merchant Panel Types
export const insertMenuModifierSchema = createInsertSchema(menuModifiers);
export const insertModifierOptionSchema = createInsertSchema(modifierOptions);
export const insertMenuItemModifierSchema = createInsertSchema(menuItemModifiers);
export const insertPromotionSchema = createInsertSchema(promotions);
export const insertVendorEarningsSchema = createInsertSchema(vendorEarnings);
export const insertVendorSettlementSchema = createInsertSchema(vendorSettlements);
export const insertVendorPayoutSchema = createInsertSchema(vendorPayouts);
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
export type InsertOrderStatusHistory = z.infer<typeof insertOrderStatusHistorySchema>;
export type OrderSlaTracking = typeof orderSlaTracking.$inferSelect;
export type InsertOrderSlaTracking = z.infer<typeof insertOrderSlaTrackingSchema>;
export type OrderNotification = typeof orderNotifications.$inferSelect;
export type InsertOrderNotification = z.infer<typeof insertOrderNotificationSchema>;
export type OrderBusinessRule = typeof orderBusinessRules.$inferSelect;
export type InsertOrderBusinessRule = z.infer<typeof insertOrderBusinessRuleSchema>;
export type OrderDispute = typeof orderDisputes.$inferSelect;
export type InsertOrderDispute = z.infer<typeof insertOrderDisputeSchema>;
export type OrderDisputeMessage = typeof orderDisputeMessages.$inferSelect;
export type InsertOrderDisputeMessage = z.infer<typeof insertOrderDisputeMessageSchema>;
export type OrderMessage = typeof orderMessages.$inferSelect;
export type InsertOrderMessage = z.infer<typeof insertOrderMessageSchema>;
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

// Payment Types
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type PaymentStatusHistory = typeof paymentStatusHistory.$inferSelect;
export type InsertPaymentStatusHistory = z.infer<typeof insertPaymentStatusHistorySchema>;
export type CustomerPaymentMethod = typeof customerPaymentMethods.$inferSelect;
export type InsertCustomerPaymentMethod = z.infer<typeof insertCustomerPaymentMethodSchema>;
export type PaymentWebhookEvent = typeof paymentWebhookEvents.$inferSelect;
export type InsertPaymentWebhookEvent = z.infer<typeof insertPaymentWebhookEventSchema>;
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;

export type LoyaltyTier = typeof loyaltyTiers.$inferSelect;
export type InsertLoyaltyTier = z.infer<typeof insertLoyaltyTierSchema>;
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
export type VendorSettlement = typeof vendorSettlements.$inferSelect;
export type InsertVendorSettlement = z.infer<typeof insertVendorSettlementSchema>;
export type VendorPayout = typeof vendorPayouts.$inferSelect;
export type InsertVendorPayout = z.infer<typeof insertVendorPayoutSchema>;
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

// User Push Subscriptions for web push notifications
export const userPushSubscriptions = pgTable("user_push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Analytics for tracking delivery and engagement
export const notificationAnalytics = pgTable("notification_analytics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: uuid("notification_id").references(() => orderNotifications.id),
  userId: uuid("user_id").references(() => users.id),
  notificationType: varchar("notification_type", { length: 20 }).notNull(), // email, sms, push
  channel: varchar("channel", { length: 50 }), // SendGrid, Twilio, WebPush, etc.
  status: varchar("status", { length: 20 }).notNull(), // sent, delivered, opened, clicked, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  metadata: jsonb("metadata"), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow(),
});

// Bulk Notification Campaigns
export const notificationCampaigns = pgTable("notification_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // promotional, announcement, alert
  channels: jsonb("channels").notNull(), // ["email", "sms", "push"]
  targetAudience: jsonb("target_audience"), // Targeting criteria
  templateData: jsonb("template_data").notNull(),
  scheduledFor: timestamp("scheduled_for"),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, scheduled, sending, sent, failed
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  openedCount: integer("opened_count").default(0),
  clickedCount: integer("clicked_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Queue for reliable delivery
export const notificationQueue = pgTable("notification_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  campaignId: uuid("campaign_id").references(() => notificationCampaigns.id),
  notificationType: varchar("notification_type", { length: 20 }).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(), // email or phone
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  templateData: jsonb("template_data"),
  priority: varchar("priority", { length: 10 }).notNull().default("normal"), // low, normal, high, critical
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, sent, failed, retrying
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  scheduledFor: timestamp("scheduled_for").defaultNow(),
  processedAt: timestamp("processed_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification Templates Management
export const notificationTemplates = pgTable("notification_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // order, payment, promotional, admin
  type: varchar("type", { length: 20 }).notNull(), // email, sms, push
  language: varchar("language", { length: 5 }).notNull().default("en"), // en, tl
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  variables: jsonb("variables"), // Available template variables
  isActive: boolean("is_active").default(true),
  version: integer("version").default(1),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ==================== COMPREHENSIVE FINANCIAL ENGINE TABLES ====================
// Dynamic Pricing Engine - Geographic zone-based pricing configuration
export const pricingZones = pgTable("pricing_zones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  boundaries: jsonb("boundaries").notNull(), // GeoJSON polygon defining zone boundaries
  baseDeliveryFee: decimal("base_delivery_fee", { precision: 10, scale: 2 }).notNull(),
  perKilometerRate: decimal("per_kilometer_rate", { precision: 8, scale: 2 }).notNull(),
  minimumFee: decimal("minimum_fee", { precision: 10, scale: 2 }).notNull(),
  maximumDistance: decimal("maximum_distance", { precision: 8, scale: 2 }).notNull(), // km
  surchargeMultiplier: decimal("surcharge_multiplier", { precision: 5, scale: 3 }).default("1.000"),
  serviceTypes: jsonb("service_types").notNull(), // ["food", "pabili", "pabayad", "parcel"]
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // Higher priority zones override lower ones
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time-based Surge Pricing Schedules
export const surgeSchedules = pgTable("surge_schedules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  scheduleType: varchar("schedule_type", { length: 50 }).notNull(), // peak_hour, weekend, holiday, weather, event
  timeRules: jsonb("time_rules").notNull(), // {dayOfWeek: [1,2,3], timeStart: "11:00", timeEnd: "14:00"}
  surgeMultiplier: decimal("surge_multiplier", { precision: 5, scale: 3 }).notNull(),
  weatherConditions: jsonb("weather_conditions"), // ["rain", "storm", "typhoon"]
  eventTriggers: jsonb("event_triggers"), // External event triggers
  zoneRestrictions: jsonb("zone_restrictions"), // Specific zones or "all"
  serviceTypeRestrictions: jsonb("service_type_restrictions"), // Specific service types
  minimumOrderValue: decimal("minimum_order_value", { precision: 10, scale: 2 }),
  maximumSurgeAmount: decimal("maximum_surge_amount", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Real-time Demand-based Pricing
export const demandPricing = pgTable("demand_pricing", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: uuid("zone_id").references(() => pricingZones.id).notNull(),
  serviceType: varchar("service_type", { length: 50 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  activeBidders: integer("active_bidders").default(0), // Number of riders available
  demandLevel: varchar("demand_level", { length: 20 }).notNull(), // low, medium, high, critical
  surgeMultiplier: decimal("surge_multiplier", { precision: 5, scale: 3 }).notNull(),
  averageWaitTime: integer("average_wait_time"), // minutes
  completionRate: decimal("completion_rate", { precision: 5, scale: 2 }), // percentage
  weatherFactor: decimal("weather_factor", { precision: 3, scale: 2 }).default("1.00"),
  eventFactor: decimal("event_factor", { precision: 3, scale: 2 }).default("1.00"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
});

// Vehicle Type Pricing Configuration
export const vehicleTypePricing = pgTable("vehicle_type_pricing", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleType: varchar("vehicle_type", { length: 50 }).notNull(), // motorcycle, bicycle, car, truck
  serviceType: varchar("service_type", { length: 50 }).notNull(),
  baseFeeMultiplier: decimal("base_fee_multiplier", { precision: 5, scale: 3 }).notNull(),
  perKilometerMultiplier: decimal("per_kilometer_multiplier", { precision: 5, scale: 3 }).notNull(),
  maxWeightCapacity: decimal("max_weight_capacity", { precision: 8, scale: 2 }), // kg
  maxVolumeCapacity: decimal("max_volume_capacity", { precision: 8, scale: 2 }), // cubic meters
  weightSurcharge: decimal("weight_surcharge", { precision: 8, scale: 2 }), // per kg over limit
  volumeSurcharge: decimal("volume_surcharge", { precision: 8, scale: 2 }), // per cubic meter over
  environmentFee: decimal("environment_fee", { precision: 8, scale: 2 }).default("0"), // Environmental impact fee
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comprehensive Fee Rules Configuration
export const feeRules = pgTable("fee_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // service_fee, processing_fee, small_order_fee, packaging_fee, insurance_fee, cancellation_fee
  calculationType: varchar("calculation_type", { length: 50 }).notNull(), // percentage, fixed, tiered, conditional
  serviceTypes: jsonb("service_types").notNull(), // ["food", "pabili", "pabayad", "parcel"]
  feeStructure: jsonb("fee_structure").notNull(), // Configuration based on calculation type
  minimumOrderValue: decimal("minimum_order_value", { precision: 10, scale: 2 }),
  maximumOrderValue: decimal("maximum_order_value", { precision: 10, scale: 2 }),
  minimumFee: decimal("minimum_fee", { precision: 10, scale: 2 }),
  maximumFee: decimal("maximum_fee", { precision: 10, scale: 2 }),
  conditions: jsonb("conditions"), // Additional conditions for fee application
  taxable: boolean("taxable").default(true),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Method Fee Configuration
export const paymentMethodFees = pgTable("payment_method_fees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // cash, gcash, maya, card, bank_transfer
  feeType: varchar("fee_type", { length: 50 }).notNull(), // processing, convenience, transaction
  feeCalculation: varchar("fee_calculation", { length: 20 }).notNull(), // percentage, fixed, hybrid
  feeValue: decimal("fee_value", { precision: 8, scale: 4 }).notNull(),
  minimumFee: decimal("minimum_fee", { precision: 8, scale: 2 }),
  maximumFee: decimal("maximum_fee", { precision: 8, scale: 2 }),
  freeThreshold: decimal("free_threshold", { precision: 10, scale: 2 }), // Amount above which fee is waived
  supportedServiceTypes: jsonb("supported_service_types"),
  merchantFeeShare: decimal("merchant_fee_share", { precision: 5, scale: 4 }), // Percentage shared with merchant
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendor Commission Tier System
export const vendorCommissionTiers = pgTable("vendor_commission_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: varchar("tier_name", { length: 100 }).notNull(),
  description: text("description"),
  serviceType: varchar("service_type", { length: 50 }).notNull(),
  vendorCategory: varchar("vendor_category", { length: 100 }), // fast_food, fine_dining, grocery, etc.
  requirementType: varchar("requirement_type", { length: 50 }).notNull(), // volume, performance, partnership_level
  requirements: jsonb("requirements").notNull(), // Specific requirements to qualify
  commissionStructure: jsonb("commission_structure").notNull(), // Complex commission rules
  performanceBonus: decimal("performance_bonus", { precision: 5, scale: 4 }), // Additional bonus for high performers
  volumeDiscounts: jsonb("volume_discounts"), // Volume-based discount tiers
  promotionalRates: jsonb("promotional_rates"), // Special promotional commission rates
  contractualBenefits: jsonb("contractual_benefits"), // Additional benefits
  reviewPeriod: integer("review_period").default(30), // Days between tier reviews
  autoUpgrade: boolean("auto_upgrade").default(false),
  autoDowngrade: boolean("auto_downgrade").default(false),
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider Earning Rules and Incentive Structure
export const riderEarningRules = pgTable("rider_earning_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: varchar("rule_name", { length: 255 }).notNull(),
  earningType: varchar("earning_type", { length: 50 }).notNull(), // base, performance_bonus, surge_bonus, fuel_allowance, maintenance_subsidy
  calculationType: varchar("calculation_type", { length: 50 }).notNull(), // fixed, percentage, tiered, performance_based
  serviceTypes: jsonb("service_types"),
  vehicleTypes: jsonb("vehicle_types"),
  earningStructure: jsonb("earning_structure").notNull(), // Detailed calculation rules
  performanceCriteria: jsonb("performance_criteria"), // Rating, completion rate, etc.
  timePeriod: varchar("time_period", { length: 50 }), // per_order, daily, weekly, monthly
  minimumRequirements: jsonb("minimum_requirements"),
  maximumEarning: decimal("maximum_earning", { precision: 10, scale: 2 }),
  penaltyStructure: jsonb("penalty_structure"), // Deductions for violations
  bonusMultipliers: jsonb("bonus_multipliers"), // Peak hour, surge, etc.
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Rules and Regulatory Compliance
export const taxRules = pgTable("tax_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  taxType: varchar("tax_type", { length: 50 }).notNull(), // vat, withholding, local_tax, business_permit
  description: text("description"),
  taxRate: decimal("tax_rate", { precision: 8, scale: 5 }).notNull(),
  applicableServices: jsonb("applicable_services"), // Which services this tax applies to
  applicableFees: jsonb("applicable_fees"), // Which fees are taxable
  minimumAmount: decimal("minimum_amount", { precision: 10, scale: 2 }),
  maximumAmount: decimal("maximum_amount", { precision: 10, scale: 2 }),
  geographicScope: jsonb("geographic_scope"), // Cities, provinces, or nationwide
  exemptionConditions: jsonb("exemption_conditions"),
  reportingRequirements: jsonb("reporting_requirements"),
  remittanceSchedule: varchar("remittance_schedule", { length: 50 }), // monthly, quarterly, annually
  penaltyStructure: jsonb("penalty_structure"), // Late payment penalties
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").notNull(),
  effectiveTo: timestamp("effective_to"),
  regulatoryReference: varchar("regulatory_reference", { length: 255 }), // Government reference
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Exemption Management
export const taxExemptions = pgTable("tax_exemptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  exemptionType: varchar("exemption_type", { length: 50 }).notNull(), // senior_citizen, pwd, government, charitable
  description: text("description"),
  applicableTaxes: jsonb("applicable_taxes").notNull(), // Which taxes are exempted
  exemptionRate: decimal("exemption_rate", { precision: 5, scale: 4 }).notNull(), // 0-1 (percentage exempted)
  requiredDocuments: jsonb("required_documents"), // Required documentation
  verificationProcess: jsonb("verification_process"),
  maximumExemptionAmount: decimal("maximum_exemption_amount", { precision: 10, scale: 2 }),
  validityPeriod: integer("validity_period"), // Days
  geographicLimitations: jsonb("geographic_limitations"),
  serviceTypeLimitations: jsonb("service_type_limitations"),
  isActive: boolean("is_active").default(true),
  regulatoryBasis: text("regulatory_basis"), // Legal basis for exemption
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pricing History and Audit Trail
export const pricingHistory = pgTable("pricing_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  changeType: varchar("change_type", { length: 50 }).notNull(), // zone_pricing, surge_pricing, fee_rule, commission_rule
  entityId: uuid("entity_id").notNull(), // ID of the changed entity
  entityType: varchar("entity_type", { length: 50 }).notNull(), // pricing_zone, surge_schedule, fee_rule, etc.
  previousValues: jsonb("previous_values"), // Previous configuration
  newValues: jsonb("new_values").notNull(), // New configuration
  reason: text("reason"), // Reason for change
  impactAnalysis: jsonb("impact_analysis"), // Projected impact of the change
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending"), // pending, approved, rejected
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  implementedAt: timestamp("implemented_at"),
  rollbackAt: timestamp("rollback_at"), // If change was rolled back
  changedBy: uuid("changed_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fee Calculation Storage for Orders
export const feeCalculations = pgTable("fee_calculations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id).notNull(),
  calculationType: varchar("calculation_type", { length: 50 }).notNull(), // initial, updated, final
  pricingSnapshot: jsonb("pricing_snapshot").notNull(), // Complete pricing rules at time of calculation
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Delivery Fees
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  distanceFee: decimal("distance_fee", { precision: 10, scale: 2 }).default("0"),
  surgeFee: decimal("surge_fee", { precision: 10, scale: 2 }).default("0"),
  vehicleTypeFee: decimal("vehicle_type_fee", { precision: 10, scale: 2 }).default("0"),
  
  // Service Fees
  serviceFee: decimal("service_fee", { precision: 10, scale: 2 }).notNull(),
  processingFee: decimal("processing_fee", { precision: 10, scale: 2 }).notNull(),
  smallOrderFee: decimal("small_order_fee", { precision: 10, scale: 2 }).default("0"),
  packagingFee: decimal("packaging_fee", { precision: 10, scale: 2 }).default("0"),
  insuranceFee: decimal("insurance_fee", { precision: 10, scale: 2 }).default("0"),
  expressFee: decimal("express_fee", { precision: 10, scale: 2 }).default("0"),
  
  // Payment Processing Fees
  paymentMethodFee: decimal("payment_method_fee", { precision: 10, scale: 2 }).default("0"),
  
  // Subtotals
  subtotalBeforeTax: decimal("subtotal_before_tax", { precision: 10, scale: 2 }).notNull(),
  
  // Taxes
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default("0"),
  withholdingTax: decimal("withholding_tax", { precision: 10, scale: 2 }).default("0"),
  localTax: decimal("local_tax", { precision: 10, scale: 2 }).default("0"),
  totalTax: decimal("total_tax", { precision: 10, scale: 2 }).notNull(),
  
  // Discounts
  promotionalDiscount: decimal("promotional_discount", { precision: 10, scale: 2 }).default("0"),
  loyaltyDiscount: decimal("loyalty_discount", { precision: 10, scale: 2 }).default("0"),
  couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default("0"),
  volumeDiscount: decimal("volume_discount", { precision: 10, scale: 2 }).default("0"),
  totalDiscount: decimal("total_discount", { precision: 10, scale: 2 }).notNull(),
  
  // Final Amount
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }).notNull(),
  
  // Tips and Additional
  tip: decimal("tip", { precision: 10, scale: 2 }).default("0"),
  
  // Commissions and Earnings
  vendorCommission: decimal("vendor_commission", { precision: 10, scale: 2 }).default("0"),
  riderEarnings: decimal("rider_earnings", { precision: 10, scale: 2 }).default("0"),
  platformRevenue: decimal("platform_revenue", { precision: 10, scale: 2 }).notNull(),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
  calculatedBy: varchar("calculated_by", { length: 100 }), // system, admin, api
  isActive: boolean("is_active").default(true),
});

// Revenue Tracking and Analytics
export const revenueTracking = pgTable("revenue_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  trackingDate: timestamp("tracking_date").notNull(),
  period: varchar("period", { length: 20 }).notNull(), // hourly, daily, weekly, monthly
  serviceType: varchar("service_type", { length: 50 }).notNull(),
  zoneId: uuid("zone_id").references(() => pricingZones.id),
  
  // Order Metrics
  totalOrders: integer("total_orders").default(0),
  completedOrders: integer("completed_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  
  // Revenue Breakdown
  grossRevenue: decimal("gross_revenue", { precision: 12, scale: 2 }).default("0"),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).default("0"),
  deliveryFeeRevenue: decimal("delivery_fee_revenue", { precision: 12, scale: 2 }).default("0"),
  serviceFeeRevenue: decimal("service_fee_revenue", { precision: 12, scale: 2 }).default("0"),
  surgeRevenue: decimal("surge_revenue", { precision: 12, scale: 2 }).default("0"),
  
  // Costs and Commissions
  totalCommissions: decimal("total_commissions", { precision: 12, scale: 2 }).default("0"),
  vendorCommissions: decimal("vendor_commissions", { precision: 12, scale: 2 }).default("0"),
  riderEarnings: decimal("rider_earnings", { precision: 12, scale: 2 }).default("0"),
  paymentProcessingFees: decimal("payment_processing_fees", { precision: 12, scale: 2 }).default("0"),
  
  // Tax Collections
  vatCollected: decimal("vat_collected", { precision: 12, scale: 2 }).default("0"),
  withholdingTaxCollected: decimal("withholding_tax_collected", { precision: 12, scale: 2 }).default("0"),
  localTaxCollected: decimal("local_tax_collected", { precision: 12, scale: 2 }).default("0"),
  
  // Discounts Given
  totalDiscounts: decimal("total_discounts", { precision: 12, scale: 2 }).default("0"),
  promotionalDiscounts: decimal("promotional_discounts", { precision: 12, scale: 2 }).default("0"),
  loyaltyDiscounts: decimal("loyalty_discounts", { precision: 12, scale: 2 }).default("0"),
  
  // Performance Metrics
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),
  averageDeliveryFee: decimal("average_delivery_fee", { precision: 10, scale: 2 }),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 4 }),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 4 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Advanced Promotion Rules Engine
export const promotionRules = pgTable("promotion_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  promotionCode: varchar("promotion_code", { length: 50 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  promotionType: varchar("promotion_type", { length: 50 }).notNull(), // discount, cashback, loyalty_multiplier, free_delivery
  discountType: varchar("discount_type", { length: 50 }), // percentage, fixed, tiered, bogo
  discountValue: decimal("discount_value", { precision: 10, scale: 4 }),
  
  // Eligibility Criteria
  customerType: varchar("customer_type", { length: 50 }), // new, returning, vip, all
  serviceTypes: jsonb("service_types"), // Applicable service types
  vendorRestrictions: jsonb("vendor_restrictions"), // Specific vendors or categories
  minimumOrderValue: decimal("minimum_order_value", { precision: 10, scale: 2 }),
  maximumOrderValue: decimal("maximum_order_value", { precision: 10, scale: 2 }),
  geographicRestrictions: jsonb("geographic_restrictions"),
  timeRestrictions: jsonb("time_restrictions"), // Valid days/hours
  
  // Usage Limits
  usageLimitPerCustomer: integer("usage_limit_per_customer"),
  totalUsageLimit: integer("total_usage_limit"),
  currentUsageCount: integer("current_usage_count").default(0),
  
  // Financial Limits
  maximumDiscountAmount: decimal("maximum_discount_amount", { precision: 10, scale: 2 }),
  budgetLimit: decimal("budget_limit", { precision: 12, scale: 2 }),
  currentSpend: decimal("current_spend", { precision: 12, scale: 2 }).default("0"),
  
  // Stacking Rules
  stackableWithOthers: boolean("stackable_with_others").default(false),
  stackingPriority: integer("stacking_priority").default(1),
  exclusiveWith: jsonb("exclusive_with"), // Promotion codes that can't be used together
  
  // Validity Period
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  
  isActive: boolean("is_active").default(true),
  requiresApproval: boolean("requires_approval").default(false),
  approvedBy: uuid("approved_by").references(() => users.id),
  
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily Financial Snapshots - Pre-computed daily financial metrics for fast analytics
export const dailyFinancialSnapshots = pgTable("daily_financial_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull().unique(),

  // Revenue Metrics
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }).notNull().default("0"),
  orderCount: integer("order_count").notNull().default(0),
  completedOrderCount: integer("completed_order_count").notNull().default(0),
  cancelledOrderCount: integer("cancelled_order_count").notNull().default(0),
  avgOrderValue: decimal("avg_order_value", { precision: 10, scale: 2 }).default("0"),

  // Revenue by Service Type
  foodRevenue: decimal("food_revenue", { precision: 15, scale: 2 }).default("0"),
  pabiliRevenue: decimal("pabili_revenue", { precision: 15, scale: 2 }).default("0"),
  pabayadRevenue: decimal("pabayad_revenue", { precision: 15, scale: 2 }).default("0"),
  parcelRevenue: decimal("parcel_revenue", { precision: 15, scale: 2 }).default("0"),

  // Fee Revenue Breakdown
  deliveryRevenue: decimal("delivery_revenue", { precision: 15, scale: 2 }).default("0"),
  serviceFees: decimal("service_fees", { precision: 15, scale: 2 }).default("0"),
  processingFees: decimal("processing_fees", { precision: 15, scale: 2 }).default("0"),
  surgeRevenue: decimal("surge_revenue", { precision: 15, scale: 2 }).default("0"),
  tipsCollected: decimal("tips_collected", { precision: 15, scale: 2 }).default("0"),

  // Commissions and Payouts
  commissionsEarned: decimal("commissions_earned", { precision: 15, scale: 2 }).default("0"),
  vendorCommissionsPaid: decimal("vendor_commissions_paid", { precision: 15, scale: 2 }).default("0"),
  riderEarningsPaid: decimal("rider_earnings_paid", { precision: 15, scale: 2 }).default("0"),

  // Discounts and Refunds
  discountsGiven: decimal("discounts_given", { precision: 15, scale: 2 }).default("0"),
  promoDiscounts: decimal("promo_discounts", { precision: 15, scale: 2 }).default("0"),
  loyaltyDiscounts: decimal("loyalty_discounts", { precision: 15, scale: 2 }).default("0"),
  refundsIssued: decimal("refunds_issued", { precision: 15, scale: 2 }).default("0"),
  refundCount: integer("refund_count").default(0),

  // Tax Collection
  vatCollected: decimal("vat_collected", { precision: 15, scale: 2 }).default("0"),
  otherTaxesCollected: decimal("other_taxes_collected", { precision: 15, scale: 2 }).default("0"),

  // Profit Metrics
  grossProfit: decimal("gross_profit", { precision: 15, scale: 2 }).default("0"),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }).default("0"),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 4 }).default("0"),

  // User Activity
  newCustomers: integer("new_customers").default(0),
  activeCustomers: integer("active_customers").default(0),
  activeVendors: integer("active_vendors").default(0),
  activeRiders: integer("active_riders").default(0),

  // Performance Metrics
  avgDeliveryTime: integer("avg_delivery_time"), // minutes
  onTimeDeliveryRate: decimal("on_time_delivery_rate", { precision: 5, scale: 4 }).default("0"),
  cancellationRate: decimal("cancellation_rate", { precision: 5, scale: 4 }).default("0"),

  // Payment Method Breakdown
  cashPayments: decimal("cash_payments", { precision: 15, scale: 2 }).default("0"),
  gcashPayments: decimal("gcash_payments", { precision: 15, scale: 2 }).default("0"),
  mayaPayments: decimal("maya_payments", { precision: 15, scale: 2 }).default("0"),
  cardPayments: decimal("card_payments", { precision: 15, scale: 2 }).default("0"),
  walletPayments: decimal("wallet_payments", { precision: 15, scale: 2 }).default("0"),

  // Regional Breakdown (stored as JSON for flexibility)
  revenueByRegion: jsonb("revenue_by_region"),
  ordersByRegion: jsonb("orders_by_region"),

  // Peak Hours Analysis
  peakHourRevenue: jsonb("peak_hour_revenue"), // Revenue by hour
  peakHourOrders: jsonb("peak_hour_orders"), // Orders by hour

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Report Generation and Storage
export const financialReports = pgTable("financial_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reportType: varchar("report_type", { length: 50 }).notNull(), // revenue_summary, commission_report, tax_report, profit_loss
  reportPeriod: varchar("report_period", { length: 20 }).notNull(), // daily, weekly, monthly, quarterly, yearly
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Report Filters
  serviceTypes: jsonb("service_types"),
  zones: jsonb("zones"),
  vendorCategories: jsonb("vendor_categories"),
  
  // Report Data
  reportData: jsonb("report_data").notNull(), // Complete report data
  summary: jsonb("summary").notNull(), // Key metrics summary
  
  // Financial Totals
  totalRevenue: decimal("total_revenue", { precision: 15, scale: 2 }),
  totalCosts: decimal("total_costs", { precision: 15, scale: 2 }),
  netProfit: decimal("net_profit", { precision: 15, scale: 2 }),
  taxLiability: decimal("tax_liability", { precision: 15, scale: 2 }),
  
  // Generation Info
  generatedBy: uuid("generated_by").references(() => users.id).notNull(),
  generationStatus: varchar("generation_status", { length: 20 }).default("generating"), // generating, completed, failed
  filePath: varchar("file_path", { length: 500 }), // Path to generated report file
  fileFormat: varchar("file_format", { length: 10 }), // pdf, excel, csv
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Insert schemas for new notification tables
export const insertUserPushSubscriptionSchema = createInsertSchema(userPushSubscriptions);
export const insertNotificationAnalyticsSchema = createInsertSchema(notificationAnalytics);
export const insertNotificationCampaignSchema = createInsertSchema(notificationCampaigns);
export const insertNotificationQueueSchema = createInsertSchema(notificationQueue);
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates);

// Insert schemas for comprehensive financial engine tables
export const insertPricingZoneSchema = createInsertSchema(pricingZones);
export const insertSurgeScheduleSchema = createInsertSchema(surgeSchedules);
export const insertDemandPricingSchema = createInsertSchema(demandPricing);
export const insertVehicleTypePricingSchema = createInsertSchema(vehicleTypePricing);
export const insertFeeRuleSchema = createInsertSchema(feeRules);
export const insertPaymentMethodFeeSchema = createInsertSchema(paymentMethodFees);
export const insertVendorCommissionTierSchema = createInsertSchema(vendorCommissionTiers);
export const insertRiderEarningRuleSchema = createInsertSchema(riderEarningRules);
export const insertTaxRuleSchema = createInsertSchema(taxRules);
export const insertTaxExemptionSchema = createInsertSchema(taxExemptions);
export const insertPricingHistorySchema = createInsertSchema(pricingHistory);
export const insertFeeCalculationSchema = createInsertSchema(feeCalculations);
export const insertRevenueTrackingSchema = createInsertSchema(revenueTracking);
export const insertPromotionRuleSchema = createInsertSchema(promotionRules);
export const insertFinancialReportSchema = createInsertSchema(financialReports);
export const insertDailyFinancialSnapshotSchema = createInsertSchema(dailyFinancialSnapshots);

// Types for new notification tables
export type UserPushSubscription = typeof userPushSubscriptions.$inferSelect;
export type InsertUserPushSubscription = z.infer<typeof insertUserPushSubscriptionSchema>;
export type NotificationAnalytics = typeof notificationAnalytics.$inferSelect;
export type InsertNotificationAnalytics = z.infer<typeof insertNotificationAnalyticsSchema>;
export type NotificationCampaign = typeof notificationCampaigns.$inferSelect;
export type InsertNotificationCampaign = z.infer<typeof insertNotificationCampaignSchema>;
export type NotificationQueue = typeof notificationQueue.$inferSelect;
export type InsertNotificationQueue = z.infer<typeof insertNotificationQueueSchema>;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = z.infer<typeof insertNotificationTemplateSchema>;

// Types for comprehensive financial engine tables
export type PricingZone = typeof pricingZones.$inferSelect;
export type InsertPricingZone = z.infer<typeof insertPricingZoneSchema>;
export type SurgeSchedule = typeof surgeSchedules.$inferSelect;
export type InsertSurgeSchedule = z.infer<typeof insertSurgeScheduleSchema>;
export type DemandPricing = typeof demandPricing.$inferSelect;
export type InsertDemandPricing = z.infer<typeof insertDemandPricingSchema>;
export type VehicleTypePricing = typeof vehicleTypePricing.$inferSelect;
export type InsertVehicleTypePricing = z.infer<typeof insertVehicleTypePricingSchema>;
export type FeeRule = typeof feeRules.$inferSelect;
export type InsertFeeRule = z.infer<typeof insertFeeRuleSchema>;
export type PaymentMethodFee = typeof paymentMethodFees.$inferSelect;
export type InsertPaymentMethodFee = z.infer<typeof insertPaymentMethodFeeSchema>;
export type VendorCommissionTier = typeof vendorCommissionTiers.$inferSelect;
export type InsertVendorCommissionTier = z.infer<typeof insertVendorCommissionTierSchema>;
export type RiderEarningRule = typeof riderEarningRules.$inferSelect;
export type InsertRiderEarningRule = z.infer<typeof insertRiderEarningRuleSchema>;
export type TaxRule = typeof taxRules.$inferSelect;
export type InsertTaxRule = z.infer<typeof insertTaxRuleSchema>;
export type TaxExemption = typeof taxExemptions.$inferSelect;
export type InsertTaxExemption = z.infer<typeof insertTaxExemptionSchema>;
export type PricingHistory = typeof pricingHistory.$inferSelect;
export type InsertPricingHistory = z.infer<typeof insertPricingHistorySchema>;
export type FeeCalculation = typeof feeCalculations.$inferSelect;
export type InsertFeeCalculation = z.infer<typeof insertFeeCalculationSchema>;
export type RevenueTracking = typeof revenueTracking.$inferSelect;
export type InsertRevenueTracking = z.infer<typeof insertRevenueTrackingSchema>;
export type PromotionRule = typeof promotionRules.$inferSelect;
export type InsertPromotionRule = z.infer<typeof insertPromotionRuleSchema>;
export type FinancialReport = typeof financialReports.$inferSelect;
export type InsertFinancialReport = z.infer<typeof insertFinancialReportSchema>;
export type DailyFinancialSnapshot = typeof dailyFinancialSnapshots.$inferSelect;
export type InsertDailyFinancialSnapshot = z.infer<typeof insertDailyFinancialSnapshotSchema>;

// BTS System Types
export type BtsRider = typeof btsRiders.$inferSelect;
export type BtsSalesRemittance = typeof btsSalesRemittance.$inferSelect;
export type BtsLateRemittance = typeof btsLateRemittance.$inferSelect;
export type BtsAttendance = typeof btsAttendance.$inferSelect;
export type BtsPayroll = typeof btsPayroll.$inferSelect;
export type BtsIncentive = typeof btsIncentives.$inferSelect;
export type BtsAuditReport = typeof btsAuditReports.$inferSelect;
export type BtsUndeclaredBooking = typeof btsUndeclaredBookings.$inferSelect;

// ==================== RIDER VERIFICATION SYSTEM ====================

// Document types and verification statuses
export const RIDER_DOC_TYPES = {
  GOVERNMENT_ID: 'government_id',
  DRIVERS_LICENSE: 'drivers_license',
  VEHICLE_REGISTRATION: 'vehicle_registration',
  VEHICLE_INSURANCE: 'vehicle_insurance',
  NBI_CLEARANCE: 'nbi_clearance',
  BARANGAY_CLEARANCE: 'barangay_clearance',
  SELFIE_WITH_ID: 'selfie_with_id',
  PROFILE_PHOTO: 'profile_photo'
} as const;

export const RIDER_DOC_STATUSES = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

export const RIDER_VERIFICATION_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
} as const;

export const BACKGROUND_CHECK_STATUSES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PASSED: 'passed',
  FAILED: 'failed',
  PENDING: 'pending'
} as const;

// Rider Documents table - stores all verification documents uploaded by riders
export const riderDocuments = pgTable("rider_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id, { onDelete: "cascade" }).notNull(),
  docType: varchar("doc_type", { length: 50 }).notNull(), // government_id, drivers_license, vehicle_registration, etc.
  documentUrl: varchar("document_url", { length: 500 }).notNull(),
  documentName: varchar("document_name", { length: 255 }), // Original filename
  documentNumber: varchar("document_number", { length: 100 }), // License number, ID number, etc.
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, under_review, approved, rejected, expired
  rejectionReason: text("rejection_reason"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  metadata: jsonb("metadata"), // Additional document-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider Verification Status table - tracks overall verification status for each rider
export const riderVerificationStatus = pgTable("rider_verification_status", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id, { onDelete: "cascade" }).notNull().unique(),

  // Individual verification flags
  idVerified: boolean("id_verified").default(false),
  licenseVerified: boolean("license_verified").default(false),
  vehicleVerified: boolean("vehicle_verified").default(false),
  insuranceVerified: boolean("insurance_verified").default(false),

  // Background check
  backgroundCheckStatus: varchar("background_check_status", { length: 20 }).default("not_started"), // not_started, in_progress, passed, failed, pending
  backgroundCheckDate: timestamp("background_check_date"),
  backgroundCheckNotes: text("background_check_notes"),

  // Overall verification status
  overallStatus: varchar("overall_status", { length: 20 }).notNull().default("not_started"), // not_started, in_progress, pending_review, verified, rejected, suspended

  // Verification completion tracking
  verificationStartedAt: timestamp("verification_started_at"),
  verificationCompletedAt: timestamp("verification_completed_at"),
  verificationCompletedBy: uuid("verification_completed_by").references(() => users.id),

  // Additional notes and flags
  adminNotes: text("admin_notes"),
  requiresReVerification: boolean("requires_re_verification").default(false),
  reVerificationReason: text("re_verification_reason"),
  nextReviewDate: timestamp("next_review_date"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for rider verification tables
export const riderDocumentsRelations = relations(riderDocuments, ({ one }) => ({
  rider: one(riders, { fields: [riderDocuments.riderId], references: [riders.id] }),
  verifier: one(users, { fields: [riderDocuments.verifiedBy], references: [users.id] }),
}));

export const riderVerificationStatusRelations = relations(riderVerificationStatus, ({ one }) => ({
  rider: one(riders, { fields: [riderVerificationStatus.riderId], references: [riders.id] }),
  completedByAdmin: one(users, { fields: [riderVerificationStatus.verificationCompletedBy], references: [users.id] }),
}));

// Insert schemas for rider verification tables
export const insertRiderDocumentSchema = createInsertSchema(riderDocuments, {
  docType: z.enum([
    'government_id',
    'drivers_license',
    'vehicle_registration',
    'vehicle_insurance',
    'nbi_clearance',
    'barangay_clearance',
    'selfie_with_id',
    'profile_photo'
  ]),
  status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'expired']).default('pending'),
});

export const insertRiderVerificationStatusSchema = createInsertSchema(riderVerificationStatus, {
  backgroundCheckStatus: z.enum(['not_started', 'in_progress', 'passed', 'failed', 'pending']).default('not_started'),
  overallStatus: z.enum(['not_started', 'in_progress', 'pending_review', 'verified', 'rejected', 'suspended']).default('not_started'),
});

// Types for rider verification tables
export type RiderDocument = typeof riderDocuments.$inferSelect;
export type InsertRiderDocument = z.infer<typeof insertRiderDocumentSchema>;
export type RiderVerificationStatus = typeof riderVerificationStatus.$inferSelect;
export type InsertRiderVerificationStatus = z.infer<typeof insertRiderVerificationStatusSchema>;

// ============= VENDOR ONBOARDING & KYC SYSTEM =============

// KYC Document Status Constants
export const KYC_DOC_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

// KYC Document Types
export const KYC_DOC_TYPES = {
  BUSINESS_PERMIT: 'business_permit',
  DTI_REGISTRATION: 'dti_registration',
  SEC_REGISTRATION: 'sec_registration',
  BIR_REGISTRATION: 'bir_registration',
  MAYORS_PERMIT: 'mayors_permit',
  SANITARY_PERMIT: 'sanitary_permit',
  FOOD_HANDLER_CERTIFICATE: 'food_handler_certificate',
  VALID_ID: 'valid_id',
  PROOF_OF_ADDRESS: 'proof_of_address',
  OTHER: 'other'
} as const;

// Vendor KYC Status
export const VENDOR_KYC_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
} as const;

// Vendor KYC Documents table
export const vendorKycDocuments = pgTable("vendor_kyc_documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  docType: varchar("doc_type", { length: 50 }).notNull(), // business_permit, dti_registration, bir_registration, etc.
  documentUrl: varchar("document_url", { length: 500 }).notNull(),
  documentName: varchar("document_name", { length: 255 }), // Original file name
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, under_review, approved, rejected, expired
  rejectionReason: text("rejection_reason"), // Reason for rejection if status is rejected
  expiryDate: timestamp("expiry_date"), // Document expiry date if applicable
  verifiedAt: timestamp("verified_at"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  metadata: jsonb("metadata"), // Additional document metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor Bank Accounts table
export const vendorBankAccounts = pgTable("vendor_bank_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  bankName: varchar("bank_name", { length: 100 }).notNull(),
  bankCode: varchar("bank_code", { length: 20 }), // SWIFT/BIC code
  accountName: varchar("account_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  accountType: varchar("account_type", { length: 20 }).default("savings"), // savings, checking
  branchName: varchar("branch_name", { length: 100 }),
  branchCode: varchar("branch_code", { length: 20 }),
  isVerified: boolean("is_verified").default(false),
  isDefault: boolean("is_default").default(false),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor Onboarding Status table - tracks overall vendor onboarding progress
export const vendorOnboardingStatus = pgTable("vendor_onboarding_status", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),

  // KYC Status
  kycStatus: varchar("kyc_status", { length: 20 }).notNull().default("not_started"), // not_started, in_progress, pending_review, approved, rejected, suspended
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  kycReviewedAt: timestamp("kyc_reviewed_at"),
  kycReviewedBy: uuid("kyc_reviewed_by").references(() => users.id),
  kycRejectionReason: text("kyc_rejection_reason"),

  // Required Documents Checklist
  requiredDocuments: jsonb("required_documents").default("[]"), // Array of required doc types
  submittedDocuments: jsonb("submitted_documents").default("[]"), // Array of submitted doc types

  // Bank Account Status
  bankAccountAdded: boolean("bank_account_added").default(false),
  bankAccountVerified: boolean("bank_account_verified").default(false),

  // Restaurant/Business Profile Status
  businessProfileComplete: boolean("business_profile_complete").default(false),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),

  // Overall Onboarding Status
  onboardingStep: varchar("onboarding_step", { length: 50 }).default("registration"), // registration, kyc_documents, bank_account, business_profile, review, completed
  isOnboardingComplete: boolean("is_onboarding_complete").default(false),
  onboardingCompletedAt: timestamp("onboarding_completed_at"),

  // Admin Notes
  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for Vendor KYC tables
export const vendorKycDocumentsRelations = relations(vendorKycDocuments, ({ one }) => ({
  vendor: one(users, { fields: [vendorKycDocuments.vendorId], references: [users.id] }),
  verifier: one(users, { fields: [vendorKycDocuments.verifiedBy], references: [users.id] }),
}));

export const vendorBankAccountsRelations = relations(vendorBankAccounts, ({ one }) => ({
  vendor: one(users, { fields: [vendorBankAccounts.vendorId], references: [users.id] }),
  verifier: one(users, { fields: [vendorBankAccounts.verifiedBy], references: [users.id] }),
}));

export const vendorOnboardingStatusRelations = relations(vendorOnboardingStatus, ({ one }) => ({
  vendor: one(users, { fields: [vendorOnboardingStatus.vendorId], references: [users.id] }),
  reviewer: one(users, { fields: [vendorOnboardingStatus.kycReviewedBy], references: [users.id] }),
  restaurant: one(restaurants, { fields: [vendorOnboardingStatus.restaurantId], references: [restaurants.id] }),
}));

// Insert schemas for Vendor KYC tables
export const insertVendorKycDocumentSchema = createInsertSchema(vendorKycDocuments, {
  docType: z.enum([
    'business_permit',
    'dti_registration',
    'sec_registration',
    'bir_registration',
    'mayors_permit',
    'sanitary_permit',
    'food_handler_certificate',
    'valid_id',
    'proof_of_address',
    'other'
  ]),
  status: z.enum(['pending', 'under_review', 'approved', 'rejected', 'expired']).default('pending'),
});

export const insertVendorBankAccountSchema = createInsertSchema(vendorBankAccounts, {
  accountType: z.enum(['savings', 'checking']).default('savings'),
});

export const insertVendorOnboardingStatusSchema = createInsertSchema(vendorOnboardingStatus, {
  kycStatus: z.enum(['not_started', 'in_progress', 'pending_review', 'approved', 'rejected', 'suspended']).default('not_started'),
  onboardingStep: z.enum(['registration', 'kyc_documents', 'bank_account', 'business_profile', 'review', 'completed']).default('registration'),
});

// Types for Vendor KYC tables
export type VendorKycDocument = typeof vendorKycDocuments.$inferSelect;
export type InsertVendorKycDocument = z.infer<typeof insertVendorKycDocumentSchema>;
export type VendorBankAccount = typeof vendorBankAccounts.$inferSelect;
export type InsertVendorBankAccount = z.infer<typeof insertVendorBankAccountSchema>;
export type VendorOnboardingStatus = typeof vendorOnboardingStatus.$inferSelect;
export type InsertVendorOnboardingStatus = z.infer<typeof insertVendorOnboardingStatusSchema>;

// ==================== ADVANCED PROMO CODE SYSTEM ====================

export const PROMO_DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  FREE_DELIVERY: 'free_delivery',
  FIRST_ORDER: 'first_order',
  TIERED: 'tiered'
} as const;

export const PROMO_APPLICABLE_TO = {
  ALL: 'all',
  NEW_USERS: 'new_users',
  SPECIFIC_RESTAURANTS: 'specific_restaurants'
} as const;

export const PROMO_FUNDING_TYPES = {
  PLATFORM: 'platform',
  VENDOR: 'vendor',
  SPLIT: 'split'
} as const;

// Promo Codes table - comprehensive promotional codes for the platform
export const promoCodes = pgTable("promo_codes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).unique().notNull(), // SAVE20, WELCOME50, etc.
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Discount Configuration
  discountType: varchar("discount_type", { length: 30 }).notNull(), // percentage, fixed, free_delivery, first_order, tiered
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }), // Discount amount or percentage
  tieredDiscounts: jsonb("tiered_discounts"), // For tiered discounts: [{minOrder: 500, discount: 50}, {minOrder: 1000, discount: 100}]

  // Order Requirements
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }), // Cap for percentage discounts

  // Usage Limits
  usageLimit: integer("usage_limit"), // Total times this code can be used (null = unlimited)
  perUserLimit: integer("per_user_limit").default(1), // Times a single user can use it
  timesUsed: integer("times_used").default(0),

  // Validity Period
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),

  // Scheduling (for day/time restrictions)
  validDaysOfWeek: jsonb("valid_days_of_week"), // [0,1,2,3,4,5,6] - 0=Sunday, 6=Saturday
  validTimeStart: varchar("valid_time_start", { length: 10 }), // "09:00"
  validTimeEnd: varchar("valid_time_end", { length: 10 }), // "21:00"

  // Applicability
  applicableTo: varchar("applicable_to", { length: 30 }).notNull().default("all"), // all, new_users, specific_restaurants
  restaurantIds: jsonb("restaurant_ids"), // Array of restaurant IDs if specific_restaurants
  excludedRestaurantIds: jsonb("excluded_restaurant_ids"), // Restaurants where promo doesn't apply
  applicableServiceTypes: jsonb("applicable_service_types"), // ['food', 'pabili', 'parcel'] - null means all

  // Funding Configuration
  fundingType: varchar("funding_type", { length: 20 }).notNull().default("platform"), // platform, vendor, split
  vendorContribution: decimal("vendor_contribution", { precision: 5, scale: 2 }), // Percentage vendor pays (for split)
  vendorId: uuid("vendor_id").references(() => users.id), // For vendor-funded promos
  restaurantId: uuid("restaurant_id").references(() => restaurants.id), // For restaurant-specific vendor promos

  // Status
  isActive: boolean("is_active").default(true),

  // Stacking
  isStackable: boolean("is_stackable").default(false), // Can be combined with other promos

  // First Order Specific
  firstOrderOnly: boolean("first_order_only").default(false),

  // Audit Fields
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Promo Usage tracking - records every promo code usage
export const promoUsage = pgTable("promo_usage", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  promoId: uuid("promo_id").references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),

  // Discount Applied
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  originalOrderAmount: decimal("original_order_amount", { precision: 10, scale: 2 }).notNull(),
  finalOrderAmount: decimal("final_order_amount", { precision: 10, scale: 2 }).notNull(),

  // Funding Breakdown
  platformContribution: decimal("platform_contribution", { precision: 10, scale: 2 }).default("0"),
  vendorContribution: decimal("vendor_contribution", { precision: 10, scale: 2 }).default("0"),

  // Status
  status: varchar("status", { length: 20 }).default("applied"), // applied, refunded, expired

  usedAt: timestamp("used_at").defaultNow(),
});

// Relations for Promo Code tables
export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
  creator: one(users, { fields: [promoCodes.createdBy], references: [users.id] }),
  vendor: one(users, { fields: [promoCodes.vendorId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [promoCodes.restaurantId], references: [restaurants.id] }),
  usages: many(promoUsage),
}));

export const promoUsageRelations = relations(promoUsage, ({ one }) => ({
  promo: one(promoCodes, { fields: [promoUsage.promoId], references: [promoCodes.id] }),
  user: one(users, { fields: [promoUsage.userId], references: [users.id] }),
  order: one(orders, { fields: [promoUsage.orderId], references: [orders.id] }),
}));

// Insert schemas for Promo Code tables
export const insertPromoCodeSchema = createInsertSchema(promoCodes, {
  discountType: z.enum(['percentage', 'fixed', 'free_delivery', 'first_order', 'tiered']),
  applicableTo: z.enum(['all', 'new_users', 'specific_restaurants']).default('all'),
  fundingType: z.enum(['platform', 'vendor', 'split']).default('platform'),
});

export const insertPromoUsageSchema = createInsertSchema(promoUsage, {
  status: z.enum(['applied', 'refunded', 'expired']).default('applied'),
});

// Types for Promo Code tables
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoUsage = typeof promoUsage.$inferSelect;
export type InsertPromoUsage = z.infer<typeof insertPromoUsageSchema>;

// ============= CUSTOMER WALLET SYSTEM =============

// Wallet Transaction Types
export const WALLET_TRANSACTION_TYPES = {
  TOPUP: 'topup',
  PAYMENT: 'payment',
  REFUND: 'refund',
  CASHBACK: 'cashback',
  WITHDRAWAL: 'withdrawal',
  ADJUSTMENT: 'adjustment'
} as const;

// Wallet Transaction Reference Types
export const WALLET_REFERENCE_TYPES = {
  ORDER: 'order',
  REFUND: 'refund',
  TOPUP: 'topup',
  PROMO: 'promo',
  ADMIN: 'admin'
} as const;

// Wallet Transaction Statuses
export const WALLET_TRANSACTION_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// Customer Wallets table - stores wallet information for each customer
export const customerWallets = pgTable("customer_wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).notNull().default("PHP"),
  isActive: boolean("is_active").notNull().default(true),

  // Settings
  autoUseWallet: boolean("auto_use_wallet").default(true), // Auto-use wallet at checkout
  lowBalanceAlert: decimal("low_balance_alert", { precision: 10, scale: 2 }).default("100"), // Alert when balance falls below

  // Statistics
  totalTopups: decimal("total_topups", { precision: 12, scale: 2 }).default("0"),
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0"),
  totalCashback: decimal("total_cashback", { precision: 12, scale: 2 }).default("0"),
  totalRefunds: decimal("total_refunds", { precision: 12, scale: 2 }).default("0"),

  // Last activity
  lastTopupAt: timestamp("last_topup_at"),
  lastTransactionAt: timestamp("last_transaction_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transactions table - stores all wallet transaction history
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: uuid("wallet_id").references(() => customerWallets.id, { onDelete: "cascade" }).notNull(),

  // Transaction details
  type: varchar("type", { length: 20 }).notNull(), // topup, payment, refund, cashback, withdrawal, adjustment
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),

  // Reference
  referenceId: uuid("reference_id"), // Order ID, Topup ID, etc.
  referenceType: varchar("reference_type", { length: 20 }), // order, refund, topup, promo, admin

  // Description and metadata
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data like payment method, order details, etc.

  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, failed, cancelled
  failureReason: text("failure_reason"),

  // External reference (for topups)
  externalTransactionId: varchar("external_transaction_id", { length: 100 }),
  paymentProvider: varchar("payment_provider", { length: 50 }),
  paymentMethod: varchar("payment_method", { length: 50 }),

  // Admin adjustment fields
  adjustedBy: uuid("adjusted_by").references(() => users.id),
  adjustmentReason: text("adjustment_reason"),

  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Wallet Topup Requests - for tracking payment gateway topup requests
export const walletTopupRequests = pgTable("wallet_topup_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: uuid("wallet_id").references(() => customerWallets.id, { onDelete: "cascade" }).notNull(),
  transactionId: uuid("transaction_id").references(() => walletTransactions.id),

  // Amount
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("PHP"),

  // Payment details
  paymentProvider: varchar("payment_provider", { length: 50 }).notNull(), // nexuspay, gcash, maya
  paymentMethod: varchar("payment_method", { length: 50 }), // gcash, maya, card, bank

  // External reference
  externalTransactionId: varchar("external_transaction_id", { length: 100 }),
  paymentLink: varchar("payment_link", { length: 500 }),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed, expired
  failureReason: text("failure_reason"),

  // Expiry
  expiresAt: timestamp("expires_at"),

  // Callback tracking
  callbackReceived: boolean("callback_received").default(false),
  callbackData: jsonb("callback_data"),

  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Cashback Rules - configurable cashback system
export const cashbackRules = pgTable("cashback_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Cashback configuration
  cashbackType: varchar("cashback_type", { length: 20 }).notNull(), // percentage, fixed
  cashbackValue: decimal("cashback_value", { precision: 8, scale: 4 }).notNull(), // Percentage (0.05 = 5%) or fixed amount

  // Limits
  minimumOrderValue: decimal("minimum_order_value", { precision: 10, scale: 2 }),
  maximumCashback: decimal("maximum_cashback", { precision: 10, scale: 2 }),

  // Eligibility
  serviceTypes: jsonb("service_types"), // ["food", "pabili", "pabayad", "parcel"] or null for all
  restaurantIds: jsonb("restaurant_ids"), // Specific restaurants or null for all
  customerTypes: jsonb("customer_types"), // ["new", "returning", "vip"] or null for all

  // Time constraints
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  dayOfWeekRestrictions: jsonb("day_of_week_restrictions"), // [0,1,2,3,4,5,6] for days
  timeRestrictions: jsonb("time_restrictions"), // {start: "11:00", end: "14:00"}

  // Usage limits
  usageLimitPerCustomer: integer("usage_limit_per_customer"),
  totalUsageLimit: integer("total_usage_limit"),
  currentUsageCount: integer("current_usage_count").default(0),

  // Budget
  budgetLimit: decimal("budget_limit", { precision: 12, scale: 2 }),
  currentSpend: decimal("current_spend", { precision: 12, scale: 2 }).default("0"),

  // Status
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // Higher priority rules apply first

  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for wallet tables
export const customerWalletsRelations = relations(customerWallets, ({ one, many }) => ({
  customer: one(users, { fields: [customerWallets.customerId], references: [users.id] }),
  transactions: many(walletTransactions),
  topupRequests: many(walletTopupRequests),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(customerWallets, { fields: [walletTransactions.walletId], references: [customerWallets.id] }),
  adjustedByUser: one(users, { fields: [walletTransactions.adjustedBy], references: [users.id] }),
}));

export const walletTopupRequestsRelations = relations(walletTopupRequests, ({ one }) => ({
  wallet: one(customerWallets, { fields: [walletTopupRequests.walletId], references: [customerWallets.id] }),
  transaction: one(walletTransactions, { fields: [walletTopupRequests.transactionId], references: [walletTransactions.id] }),
}));

export const cashbackRulesRelations = relations(cashbackRules, ({ one }) => ({
  createdByUser: one(users, { fields: [cashbackRules.createdBy], references: [users.id] }),
}));

// Insert schemas for wallet tables
export const insertCustomerWalletSchema = createInsertSchema(customerWallets);

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions, {
  type: z.enum(['topup', 'payment', 'refund', 'cashback', 'withdrawal', 'adjustment']),
  referenceType: z.enum(['order', 'refund', 'topup', 'promo', 'admin']).optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled']).default('pending'),
});

export const insertWalletTopupRequestSchema = createInsertSchema(walletTopupRequests, {
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'expired']).default('pending'),
});

export const insertCashbackRuleSchema = createInsertSchema(cashbackRules, {
  cashbackType: z.enum(['percentage', 'fixed']),
});

// Types for wallet tables
export type CustomerWallet = typeof customerWallets.$inferSelect;
export type InsertCustomerWallet = z.infer<typeof insertCustomerWalletSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTopupRequest = typeof walletTopupRequests.$inferSelect;
export type InsertWalletTopupRequest = z.infer<typeof insertWalletTopupRequestSchema>;
export type CashbackRule = typeof cashbackRules.$inferSelect;
export type InsertCashbackRule = z.infer<typeof insertCashbackRuleSchema>;

// ==================== ENHANCED DISPATCH SYSTEM ====================

// Dispatch Batch Status Constants
export const DISPATCH_BATCH_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

// Dispatch Escalation Level Constants
export const ESCALATION_LEVELS = {
  LEVEL_1: 1, // Notify supervisor (10 min delay)
  LEVEL_2: 2, // Alert dispatch manager (20 min)
  LEVEL_3: 3  // Emergency escalation (30 min)
} as const;

// Emergency Priority Constants
export const EMERGENCY_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
} as const;

// Dispatch Batches table - group multiple orders for batch assignment to riders
export const dispatchBatches = pgTable("dispatch_batches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  batchNumber: varchar("batch_number", { length: 20 }).unique().notNull(),
  orderCount: integer("order_count").default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
  assignedRiderId: uuid("assigned_rider_id").references(() => riders.id),
  assignedBy: uuid("assigned_by").references(() => users.id).notNull(),
  notes: text("notes"),
  estimatedTotalDistance: decimal("estimated_total_distance", { precision: 8, scale: 2 }), // km
  estimatedTotalDuration: integer("estimated_total_duration"), // minutes
  optimizedRoute: jsonb("optimized_route"), // Array of order IDs in optimal sequence
  pickupLocations: jsonb("pickup_locations"), // Array of pickup coordinates
  deliveryLocations: jsonb("delivery_locations"), // Array of delivery coordinates
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dispatch Batch Orders table - links orders to batches with sequence
export const dispatchBatchOrders = pgTable("dispatch_batch_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: uuid("batch_id").references(() => dispatchBatches.id, { onDelete: "cascade" }).notNull(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  sequence: integer("sequence").notNull(), // Order in the route
  pickupSequence: integer("pickup_sequence").notNull(), // Order of pickup
  deliverySequence: integer("delivery_sequence").notNull(), // Order of delivery
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, picked_up, delivered
  estimatedPickupTime: timestamp("estimated_pickup_time"),
  actualPickupTime: timestamp("actual_pickup_time"),
  estimatedDeliveryTime: timestamp("estimated_delivery_time"),
  actualDeliveryTime: timestamp("actual_delivery_time"),
  distanceFromPrevious: decimal("distance_from_previous", { precision: 8, scale: 2 }), // km from previous stop
  durationFromPrevious: integer("duration_from_previous"), // minutes from previous stop
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dispatch Escalations table - SLA breach auto-escalation tracking
export const dispatchEscalations = pgTable("dispatch_escalations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  escalationLevel: integer("escalation_level").notNull().default(1), // 1, 2, 3
  reason: varchar("reason", { length: 255 }).notNull(), // sla_breach, rider_unresponsive, customer_complaint, etc.
  description: text("description"),
  previousRiderId: uuid("previous_rider_id").references(() => riders.id),
  escalatedAt: timestamp("escalated_at").defaultNow(),
  notifiedUsers: jsonb("notified_users"), // Array of user IDs who were notified
  responseDeadline: timestamp("response_deadline"), // When escalation must be handled
  status: varchar("status", { length: 20 }).notNull().default("open"), // open, acknowledged, resolved, escalated_further
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  resolutionAction: varchar("resolution_action", { length: 100 }), // reassigned, customer_notified, refunded, etc.
  metadata: jsonb("metadata"), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rider Capacity table - track concurrent order capacity per rider
export const riderCapacity = pgTable("rider_capacity", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  riderId: uuid("rider_id").references(() => riders.id, { onDelete: "cascade" }).notNull().unique(),
  maxConcurrentOrders: integer("max_concurrent_orders").notNull().default(3),
  currentOrders: integer("current_orders").notNull().default(0),
  currentBatchId: uuid("current_batch_id").references(() => dispatchBatches.id),
  isAvailableForDispatch: boolean("is_available_for_dispatch").default(true),
  preferredZones: jsonb("preferred_zones"), // Array of zone IDs
  excludedZones: jsonb("excluded_zones"), // Zones rider doesn't want
  maxDistanceKm: decimal("max_distance_km", { precision: 5, scale: 2 }).default("15"), // Max distance willing to travel
  vehicleCapacity: jsonb("vehicle_capacity"), // {maxWeight: 10, maxItems: 20, maxVolume: 0.5}
  currentLoadWeight: decimal("current_load_weight", { precision: 6, scale: 2 }).default("0"),
  currentLoadItems: integer("current_load_items").default(0),
  lastDispatchedAt: timestamp("last_dispatched_at"),
  totalDispatchesToday: integer("total_dispatches_today").default(0),
  successfulDeliveriesToday: integer("successful_deliveries_today").default(0),
  averageDeliveryTimeToday: integer("average_delivery_time_today"), // minutes
  lastLocationUpdate: timestamp("last_location_update"),
  currentLocation: jsonb("current_location"), // {lat, lng, accuracy}
  lastUpdated: timestamp("last_updated").defaultNow(),
});

// Emergency Dispatches table - priority reassignment and backup riders
export const emergencyDispatches = pgTable("emergency_dispatches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  originalRiderId: uuid("original_rider_id").references(() => riders.id),
  reason: varchar("reason", { length: 255 }).notNull(), // rider_accident, vehicle_breakdown, rider_unresponsive, weather_emergency
  description: text("description"),
  priority: integer("priority").notNull().default(2), // 1=low, 2=medium, 3=high, 4=critical
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, assigned, resolved, cancelled
  reassignedRiderId: uuid("reassigned_rider_id").references(() => riders.id),
  handledBy: uuid("handled_by").references(() => users.id),
  customerNotified: boolean("customer_notified").default(false),
  customerNotifiedAt: timestamp("customer_notified_at"),
  customerNotificationMethod: varchar("customer_notification_method", { length: 50 }), // sms, push, call
  vendorNotified: boolean("vendor_notified").default(false),
  vendorNotifiedAt: timestamp("vendor_notified_at"),
  responseTimeMinutes: integer("response_time_minutes"), // How long it took to handle
  resolutionNotes: text("resolution_notes"),
  compensationOffered: jsonb("compensation_offered"), // {type, amount, description}
  metadata: jsonb("metadata"), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dispatch Override Logs table - track manual assignment overrides
export const dispatchOverrideLogs = pgTable("dispatch_override_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  previousRiderId: uuid("previous_rider_id").references(() => riders.id),
  newRiderId: uuid("new_rider_id").references(() => riders.id).notNull(),
  overriddenBy: uuid("overridden_by").references(() => users.id).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  wasAutomaticAssignment: boolean("was_automatic_assignment").default(false),
  automaticAssignmentReason: text("automatic_assignment_reason"), // Why auto-assignment failed/was overridden
  distanceToPickup: decimal("distance_to_pickup", { precision: 8, scale: 2 }), // km
  estimatedPickupTime: integer("estimated_pickup_time"), // minutes
  riderCapacityAtOverride: integer("rider_capacity_at_override"), // Current orders for new rider
  createdAt: timestamp("created_at").defaultNow(),
});

// SLA Tracking Events table - real-time SLA monitoring
export const slaTrackingEvents = pgTable("sla_tracking_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(), // approaching_breach, breach, resolved, extended
  slaType: varchar("sla_type", { length: 50 }).notNull(), // pickup_time, delivery_time, total_time, vendor_acceptance
  targetTime: timestamp("target_time").notNull(), // When SLA should be met
  actualTime: timestamp("actual_time"), // When SLA was actually met (if resolved)
  delayMinutes: integer("delay_minutes"), // How many minutes delayed (negative if early)
  escalationTriggered: boolean("escalation_triggered").default(false),
  escalationId: uuid("escalation_id").references(() => dispatchEscalations.id),
  notificationsSent: jsonb("notifications_sent"), // Array of {userId, type, sentAt}
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dispatch Zones Config - geographic dispatch zones for routing
export const dispatchZonesConfig = pgTable("dispatch_zones_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).unique().notNull(),
  boundaries: jsonb("boundaries").notNull(), // GeoJSON polygon
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // Higher priority zones get riders first
  maxRiders: integer("max_riders").default(10),
  currentActiveRiders: integer("current_active_riders").default(0),
  averageDeliveryTime: integer("average_delivery_time"), // minutes
  demandLevel: varchar("demand_level", { length: 20 }).default("normal"), // low, normal, high, critical
  surgeMultiplier: decimal("surge_multiplier", { precision: 3, scale: 2 }).default("1.00"),
  operatingHours: jsonb("operating_hours"), // {monday: {open: "08:00", close: "22:00"}, ...}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for dispatch tables
export const dispatchBatchesRelations = relations(dispatchBatches, ({ one, many }) => ({
  rider: one(riders, { fields: [dispatchBatches.assignedRiderId], references: [riders.id] }),
  assignedByUser: one(users, { fields: [dispatchBatches.assignedBy], references: [users.id] }),
  orders: many(dispatchBatchOrders),
}));

export const dispatchBatchOrdersRelations = relations(dispatchBatchOrders, ({ one }) => ({
  batch: one(dispatchBatches, { fields: [dispatchBatchOrders.batchId], references: [dispatchBatches.id] }),
  order: one(orders, { fields: [dispatchBatchOrders.orderId], references: [orders.id] }),
}));

export const dispatchEscalationsRelations = relations(dispatchEscalations, ({ one }) => ({
  order: one(orders, { fields: [dispatchEscalations.orderId], references: [orders.id] }),
  previousRider: one(riders, { fields: [dispatchEscalations.previousRiderId], references: [riders.id] }),
  acknowledgedByUser: one(users, { fields: [dispatchEscalations.acknowledgedBy], references: [users.id] }),
  resolvedByUser: one(users, { fields: [dispatchEscalations.resolvedBy], references: [users.id] }),
}));

export const riderCapacityRelations = relations(riderCapacity, ({ one }) => ({
  rider: one(riders, { fields: [riderCapacity.riderId], references: [riders.id] }),
  currentBatch: one(dispatchBatches, { fields: [riderCapacity.currentBatchId], references: [dispatchBatches.id] }),
}));

export const emergencyDispatchesRelations = relations(emergencyDispatches, ({ one }) => ({
  order: one(orders, { fields: [emergencyDispatches.orderId], references: [orders.id] }),
  originalRider: one(riders, { fields: [emergencyDispatches.originalRiderId], references: [riders.id] }),
  reassignedRider: one(riders, { fields: [emergencyDispatches.reassignedRiderId], references: [riders.id] }),
  handler: one(users, { fields: [emergencyDispatches.handledBy], references: [users.id] }),
}));

export const dispatchOverrideLogsRelations = relations(dispatchOverrideLogs, ({ one }) => ({
  order: one(orders, { fields: [dispatchOverrideLogs.orderId], references: [orders.id] }),
  previousRider: one(riders, { fields: [dispatchOverrideLogs.previousRiderId], references: [riders.id] }),
  newRider: one(riders, { fields: [dispatchOverrideLogs.newRiderId], references: [riders.id] }),
  overriddenByUser: one(users, { fields: [dispatchOverrideLogs.overriddenBy], references: [users.id] }),
}));

// Insert schemas for dispatch tables
export const insertDispatchBatchSchema = createInsertSchema(dispatchBatches, {
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
});

export const insertDispatchBatchOrderSchema = createInsertSchema(dispatchBatchOrders, {
  status: z.enum(['pending', 'picked_up', 'delivered']).default('pending'),
});

export const insertDispatchEscalationSchema = createInsertSchema(dispatchEscalations, {
  escalationLevel: z.number().min(1).max(3).default(1),
  status: z.enum(['open', 'acknowledged', 'resolved', 'escalated_further']).default('open'),
});

export const insertRiderCapacitySchema = createInsertSchema(riderCapacity);

export const insertEmergencyDispatchSchema = createInsertSchema(emergencyDispatches, {
  priority: z.number().min(1).max(4).default(2),
  status: z.enum(['pending', 'assigned', 'resolved', 'cancelled']).default('pending'),
});

export const insertDispatchOverrideLogSchema = createInsertSchema(dispatchOverrideLogs);

export const insertSlaTrackingEventSchema = createInsertSchema(slaTrackingEvents);

export const insertDispatchZonesConfigSchema = createInsertSchema(dispatchZonesConfig);

// Types for dispatch tables
export type DispatchBatch = typeof dispatchBatches.$inferSelect;
export type InsertDispatchBatch = z.infer<typeof insertDispatchBatchSchema>;
export type DispatchBatchOrder = typeof dispatchBatchOrders.$inferSelect;
export type InsertDispatchBatchOrder = z.infer<typeof insertDispatchBatchOrderSchema>;
export type DispatchEscalation = typeof dispatchEscalations.$inferSelect;
export type InsertDispatchEscalation = z.infer<typeof insertDispatchEscalationSchema>;
export type RiderCapacity = typeof riderCapacity.$inferSelect;
export type InsertRiderCapacity = z.infer<typeof insertRiderCapacitySchema>;
export type EmergencyDispatch = typeof emergencyDispatches.$inferSelect;
export type InsertEmergencyDispatch = z.infer<typeof insertEmergencyDispatchSchema>;
export type DispatchOverrideLog = typeof dispatchOverrideLogs.$inferSelect;
export type InsertDispatchOverrideLog = z.infer<typeof insertDispatchOverrideLogSchema>;
export type SlaTrackingEvent = typeof slaTrackingEvents.$inferSelect;
export type InsertSlaTrackingEvent = z.infer<typeof insertSlaTrackingEventSchema>;
export type DispatchZonesConfig = typeof dispatchZonesConfig.$inferSelect;
export type InsertDispatchZonesConfig = z.infer<typeof insertDispatchZonesConfigSchema>;

// ==================== FRAUD DETECTION SYSTEM TABLES ====================
// Comprehensive fraud prevention and detection for platform security

// Fraud Rule Severity Levels
export const FRAUD_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

// Fraud Alert Statuses
export const FRAUD_ALERT_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  DISMISSED: 'dismissed',
  CONFIRMED: 'confirmed'
} as const;

// Fraud Rule Types
export const FRAUD_RULE_TYPES = {
  VELOCITY: 'velocity',
  GEOLOCATION: 'geolocation',
  DEVICE: 'device',
  PAYMENT: 'payment',
  BEHAVIOR: 'behavior',
  IDENTITY: 'identity'
} as const;

// Fraud Rule Actions
export const FRAUD_ACTIONS = {
  ALLOW: 'allow',
  FLAG: 'flag',
  BLOCK: 'block',
  REVIEW: 'review',
  NOTIFY: 'notify'
} as const;

// Fraud Rules - Configurable rules for detecting fraudulent activity
export const fraudRules = pgTable("fraud_rules", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // velocity, geolocation, device, payment, behavior, identity

  // Rule conditions in JSON format
  conditions: jsonb("conditions").notNull(), // Complex conditions based on rule type
  /*
    velocity: {
      metric: "orders_per_hour" | "payment_attempts" | "account_creations",
      threshold: number,
      timeWindow: number (seconds),
      scope: "user" | "ip" | "device"
    }
    geolocation: {
      maxDistance: number (km),
      checkVpn: boolean,
      checkProxy: boolean,
      allowedCountries: string[]
    }
    device: {
      maxAccountsPerDevice: number,
      trustNewDevices: boolean,
      flagDeviceChanges: boolean
    }
    payment: {
      maxFailedAttempts: number,
      minTransactionAmount: number,
      maxTransactionAmount: number,
      flagSmallTransactions: boolean
    }
    behavior: {
      minAccountAge: number (days),
      maxRefundRate: number (percentage),
      unusualOrderPatterns: boolean
    }
  */

  action: varchar("action", { length: 20 }).notNull().default("flag"), // allow, flag, block, review, notify
  severity: varchar("severity", { length: 20 }).notNull().default("medium"), // low, medium, high, critical

  // Score contribution
  scoreImpact: integer("score_impact").default(10), // Points added to risk score when triggered

  // Rule status and targeting
  isActive: boolean("is_active").default(true),
  applicableOrderTypes: jsonb("applicable_order_types"), // ["food", "pabili", "pabayad", "parcel"] or null for all
  applicableUserRoles: jsonb("applicable_user_roles"), // ["customer", "vendor", "rider"] or null for all

  // Statistics
  triggerCount: integer("trigger_count").default(0),
  lastTriggeredAt: timestamp("last_triggered_at"),
  falsePositiveCount: integer("false_positive_count").default(0),

  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fraud Alerts - Records of potential fraudulent activity
export const fraudAlerts = pgTable("fraud_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  ruleId: uuid("rule_id").references(() => fraudRules.id),

  // Alert classification
  alertType: varchar("alert_type", { length: 50 }).notNull(), // velocity, geolocation, device, payment, behavior, identity, manual
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical

  // Alert details
  details: jsonb("details").notNull(), // Specific details about what triggered the alert
  /*
    {
      triggeredRule: string,
      riskScore: number,
      factors: Array<{name: string, score: number, description: string}>,
      rawData: object,
      location: {lat, lng},
      device: {fingerprint, userAgent, ip}
    }
  */

  riskScore: integer("risk_score").default(0), // 0-100 risk score at time of alert

  // Alert status
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, reviewed, dismissed, confirmed
  statusReason: text("status_reason"),

  // Resolution tracking
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  resolutionNotes: text("resolution_notes"),

  // User action taken
  userBlocked: boolean("user_blocked").default(false),
  orderCancelled: boolean("order_cancelled").default(false),
  refundIssued: boolean("refund_issued").default(false),

  // Metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Risk Scores - Calculated risk profiles for each user
export const userRiskScores = pgTable("user_risk_scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),

  // Risk assessment
  riskScore: integer("risk_score").notNull().default(0), // 0-100, higher = more risky
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("low"), // low, medium, high, critical

  // Risk factors breakdown
  factors: jsonb("factors").notNull().default("[]"), // Array of contributing factors
  /*
    [
      { name: "account_age", score: 5, weight: 0.1, description: "Account less than 7 days old" },
      { name: "payment_failures", score: 20, weight: 0.2, description: "3 failed payments in last 24h" },
      { name: "velocity", score: 15, weight: 0.15, description: "5 orders in last hour" },
      ...
    ]
  */

  // Historical data
  flagCount: integer("flag_count").default(0), // Total number of times flagged
  confirmedFraudCount: integer("confirmed_fraud_count").default(0),
  dismissedAlertCount: integer("dismissed_alert_count").default(0),

  // Activity metrics
  totalOrders: integer("total_orders").default(0),
  cancelledOrders: integer("cancelled_orders").default(0),
  refundedOrders: integer("refunded_orders").default(0),
  chargebackCount: integer("chargeback_count").default(0),

  // Payment metrics
  failedPaymentCount: integer("failed_payment_count").default(0),
  lastFailedPaymentAt: timestamp("last_failed_payment_at"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }),

  // Behavioral metrics
  deviceCount: integer("device_count").default(0),
  ipAddressCount: integer("ip_address_count").default(0),
  unusualActivityCount: integer("unusual_activity_count").default(0),

  // Account status
  isBlocked: boolean("is_blocked").default(false),
  blockedAt: timestamp("blocked_at"),
  blockedBy: uuid("blocked_by").references(() => users.id),
  blockedReason: text("blocked_reason"),
  unblockAt: timestamp("unblock_at"), // For temporary blocks

  // Calculation tracking
  lastCalculated: timestamp("last_calculated").defaultNow(),
  calculationVersion: varchar("calculation_version", { length: 20 }).default("v1"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Device Fingerprints - Track devices used by users
export const deviceFingerprints = pgTable("device_fingerprints", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Fingerprint identification
  fingerprintHash: varchar("fingerprint_hash", { length: 64 }).notNull(), // SHA-256 hash of device fingerprint

  // Device information
  deviceInfo: jsonb("device_info").notNull(), // Detailed device information
  /*
    {
      userAgent: string,
      platform: string,
      screenResolution: string,
      timezone: string,
      language: string,
      colorDepth: number,
      deviceMemory: number,
      hardwareConcurrency: number,
      plugins: string[],
      canvas: string (hash),
      webgl: string (hash),
      fonts: string[],
      audioContext: string (hash)
    }
  */

  // IP information
  ipAddress: varchar("ip_address", { length: 45 }),
  ipInfo: jsonb("ip_info"), // GeoIP data
  /*
    {
      country: string,
      region: string,
      city: string,
      isp: string,
      asn: string,
      isVpn: boolean,
      isProxy: boolean,
      isTor: boolean,
      isDatacenter: boolean
    }
  */

  // Trust status
  isTrusted: boolean("is_trusted").default(false),
  trustScore: integer("trust_score").default(50), // 0-100

  // Activity tracking
  firstSeen: timestamp("first_seen").defaultNow(),
  lastSeen: timestamp("last_seen").defaultNow(),
  sessionCount: integer("session_count").default(1),
  orderCount: integer("order_count").default(0),

  // Flags
  isBlocked: boolean("is_blocked").default(false),
  isSuspicious: boolean("is_suspicious").default(false),
  suspiciousReasons: jsonb("suspicious_reasons"), // Array of reasons

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fraud Check Logs - Log of all fraud checks performed
export const fraudCheckLogs = pgTable("fraud_check_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  orderId: uuid("order_id").references(() => orders.id),

  // Check context
  checkType: varchar("check_type", { length: 50 }).notNull(), // order_creation, payment, login, account_update

  // Input data
  inputData: jsonb("input_data").notNull(), // Data submitted for checking

  // Check results
  riskScore: integer("risk_score").notNull(), // Calculated risk score
  riskLevel: varchar("risk_level", { length: 20 }).notNull(), // low, medium, high, critical
  triggeredRules: jsonb("triggered_rules").notNull().default("[]"), // Array of rule IDs that triggered

  // Decision
  recommendation: varchar("recommendation", { length: 20 }).notNull(), // allow, review, block
  finalDecision: varchar("final_decision", { length: 20 }).notNull(), // allow, review, block
  decisionOverridden: boolean("decision_overridden").default(false),
  overriddenBy: uuid("overridden_by").references(() => users.id),
  overrideReason: text("override_reason"),

  // Performance tracking
  processingTimeMs: integer("processing_time_ms"),

  // Request metadata
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceFingerprint: varchar("device_fingerprint", { length: 64 }),

  createdAt: timestamp("created_at").defaultNow(),
});

// IP Intelligence Cache - Cache for IP lookup results
export const ipIntelligenceCache = pgTable("ip_intelligence_cache", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: varchar("ip_address", { length: 45 }).notNull().unique(),

  // GeoIP data
  country: varchar("country", { length: 2 }),
  countryName: varchar("country_name", { length: 100 }),
  region: varchar("region", { length: 100 }),
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  timezone: varchar("timezone", { length: 50 }),

  // ISP data
  isp: varchar("isp", { length: 255 }),
  organization: varchar("organization", { length: 255 }),
  asn: varchar("asn", { length: 20 }),

  // Threat intelligence
  isVpn: boolean("is_vpn").default(false),
  isProxy: boolean("is_proxy").default(false),
  isTor: boolean("is_tor").default(false),
  isDatacenter: boolean("is_datacenter").default(false),
  isKnownAttacker: boolean("is_known_attacker").default(false),
  threatScore: integer("threat_score").default(0), // 0-100

  // Caching
  lastUpdated: timestamp("last_updated").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  source: varchar("source", { length: 50 }), // Provider name

  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for fraud tables
export const fraudRulesRelations = relations(fraudRules, ({ one, many }) => ({
  createdByUser: one(users, { fields: [fraudRules.createdBy], references: [users.id] }),
  alerts: many(fraudAlerts),
}));

export const fraudAlertsRelations = relations(fraudAlerts, ({ one }) => ({
  user: one(users, { fields: [fraudAlerts.userId], references: [users.id] }),
  order: one(orders, { fields: [fraudAlerts.orderId], references: [orders.id] }),
  rule: one(fraudRules, { fields: [fraudAlerts.ruleId], references: [fraudRules.id] }),
  reviewer: one(users, { fields: [fraudAlerts.reviewedBy], references: [users.id] }),
}));

export const userRiskScoresRelations = relations(userRiskScores, ({ one }) => ({
  user: one(users, { fields: [userRiskScores.userId], references: [users.id] }),
  blockedByUser: one(users, { fields: [userRiskScores.blockedBy], references: [users.id] }),
}));

export const deviceFingerprintsRelations = relations(deviceFingerprints, ({ one }) => ({
  user: one(users, { fields: [deviceFingerprints.userId], references: [users.id] }),
}));

export const fraudCheckLogsRelations = relations(fraudCheckLogs, ({ one }) => ({
  user: one(users, { fields: [fraudCheckLogs.userId], references: [users.id] }),
  order: one(orders, { fields: [fraudCheckLogs.orderId], references: [orders.id] }),
  overriddenByUser: one(users, { fields: [fraudCheckLogs.overriddenBy], references: [users.id] }),
}));

// Insert schemas for fraud tables
export const insertFraudRuleSchema = createInsertSchema(fraudRules, {
  ruleType: z.enum(['velocity', 'geolocation', 'device', 'payment', 'behavior', 'identity']),
  action: z.enum(['allow', 'flag', 'block', 'review', 'notify']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlerts, {
  alertType: z.enum(['velocity', 'geolocation', 'device', 'payment', 'behavior', 'identity', 'manual']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['pending', 'reviewed', 'dismissed', 'confirmed']).default('pending'),
});

export const insertUserRiskScoreSchema = createInsertSchema(userRiskScores, {
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).default('low'),
});

export const insertDeviceFingerprintSchema = createInsertSchema(deviceFingerprints);

export const insertFraudCheckLogSchema = createInsertSchema(fraudCheckLogs, {
  checkType: z.enum(['order_creation', 'payment', 'login', 'account_update']),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  recommendation: z.enum(['allow', 'review', 'block']),
  finalDecision: z.enum(['allow', 'review', 'block']),
});

export const insertIpIntelligenceCacheSchema = createInsertSchema(ipIntelligenceCache);

// Types for fraud tables
export type FraudRule = typeof fraudRules.$inferSelect;
export type InsertFraudRule = z.infer<typeof insertFraudRuleSchema>;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;
export type UserRiskScore = typeof userRiskScores.$inferSelect;
export type InsertUserRiskScore = z.infer<typeof insertUserRiskScoreSchema>;
export type DeviceFingerprint = typeof deviceFingerprints.$inferSelect;
export type InsertDeviceFingerprint = z.infer<typeof insertDeviceFingerprintSchema>;
export type FraudCheckLog = typeof fraudCheckLogs.$inferSelect;
export type InsertFraudCheckLog = z.infer<typeof insertFraudCheckLogSchema>;
export type IpIntelligenceCache = typeof ipIntelligenceCache.$inferSelect;
export type InsertIpIntelligenceCache = z.infer<typeof insertIpIntelligenceCacheSchema>;

// ============= TAX COMPLIANCE TABLES (Philippine BIR) =============

// Tax Type Constants
export const TAX_TYPES = {
  VAT: 'vat',
  WITHHOLDING: 'withholding',
  SERVICE: 'service'
} as const;

export const TAX_EXEMPTION_TYPES = {
  SENIOR: 'senior',
  PWD: 'pwd',
  DIPLOMATIC: 'diplomatic'
} as const;

export const TAX_REPORT_TYPES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual'
} as const;

export const TAX_REPORT_STATUSES = {
  DRAFT: 'draft',
  GENERATED: 'generated',
  SUBMITTED: 'submitted',
  FILED: 'filed'
} as const;

export const TAX_EXEMPTION_STATUSES = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
} as const;

// Tax Rates - Configurable tax rates for VAT, withholding, service fees
export const taxRates = pgTable("tax_rates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(), // "Standard VAT", "Senior/PWD VAT Exempt", "Withholding 1%"
  description: text("description"),
  rate: decimal("rate", { precision: 8, scale: 4 }).notNull(), // 0.12 for 12% VAT, 0.01 for 1% withholding
  type: varchar("type", { length: 20 }).notNull(), // vat, withholding, service

  // Applicability
  applicableToVendors: boolean("applicable_to_vendors").default(true),
  applicableToCustomers: boolean("applicable_to_customers").default(true),
  minimumAmount: decimal("minimum_amount", { precision: 10, scale: 2 }), // Minimum order amount for tax to apply

  // Status and validity
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  expiryDate: timestamp("expiry_date"), // null = no expiry

  // Audit
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer Tax Exemptions - Senior citizen, PWD, diplomatic exemptions for specific customers
export const customerTaxExemptions = pgTable("customer_tax_exemptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // Exemption details
  exemptionType: varchar("exemption_type", { length: 20 }).notNull(), // senior, pwd, diplomatic
  idNumber: varchar("id_number", { length: 50 }).notNull(), // SC ID number, PWD ID number, diplomatic ID
  idDocumentUrl: varchar("id_document_url", { length: 500 }), // Uploaded ID photo

  // Personal details for verification
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  dateOfBirth: timestamp("date_of_birth"),

  // Validity period
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"), // For IDs with expiry

  // Verification status
  status: varchar("status", { length: 20 }).default("pending"), // pending, verified, rejected, expired
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),

  // Audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tax Invoices - Official receipts/invoices for orders with tax breakdown
export const taxInvoices = pgTable("tax_invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),

  // Invoice identification
  invoiceNumber: varchar("invoice_number", { length: 50 }).unique().notNull(), // BIR-compliant format
  invoiceSeries: varchar("invoice_series", { length: 20 }), // Series identifier

  // Customer information
  customerId: uuid("customer_id").references(() => users.id).notNull(),
  customerName: varchar("customer_name", { length: 200 }),
  customerTin: varchar("customer_tin", { length: 20 }), // Tax Identification Number
  customerAddress: text("customer_address"),

  // Vendor information
  vendorId: uuid("vendor_id").references(() => users.id),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),
  vendorTin: varchar("vendor_tin", { length: 20 }),
  vendorName: varchar("vendor_name", { length: 200 }),
  vendorAddress: text("vendor_address"),

  // Amount breakdown
  grossAmount: decimal("gross_amount", { precision: 12, scale: 2 }).notNull(), // Total before tax/discounts
  vatableAmount: decimal("vatable_amount", { precision: 12, scale: 2 }).default("0"), // Amount subject to VAT
  vatExemptAmount: decimal("vat_exempt_amount", { precision: 12, scale: 2 }).default("0"), // VAT-exempt amount
  zeroRatedAmount: decimal("zero_rated_amount", { precision: 12, scale: 2 }).default("0"), // Zero-rated sales
  vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).default("0"), // 12% VAT

  // Discounts
  seniorDiscount: decimal("senior_discount", { precision: 12, scale: 2 }).default("0"), // 20% senior discount
  pwdDiscount: decimal("pwd_discount", { precision: 12, scale: 2 }).default("0"), // 20% PWD discount
  otherDiscounts: decimal("other_discounts", { precision: 12, scale: 2 }).default("0"),

  // Withholding tax (for vendor payments)
  withholdingTax: decimal("withholding_tax", { precision: 12, scale: 2 }).default("0"), // 1-2% withholding
  withholdingRate: decimal("withholding_rate", { precision: 5, scale: 4 }), // Rate applied

  // Final amounts
  netAmount: decimal("net_amount", { precision: 12, scale: 2 }).notNull(), // Final amount after all calculations

  // Tax exemption reference
  exemptionId: uuid("exemption_id").references(() => customerTaxExemptions.id),
  exemptionType: varchar("exemption_type", { length: 20 }), // senior, pwd, diplomatic

  // Status
  status: varchar("status", { length: 20 }).default("issued"), // draft, issued, cancelled, voided
  voidedAt: timestamp("voided_at"),
  voidedBy: uuid("voided_by").references(() => users.id),
  voidReason: text("void_reason"),

  // Timestamps
  issuedAt: timestamp("issued_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Vendor Tax Reports - BIR reporting for vendors
export const vendorTaxReports = pgTable("vendor_tax_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: uuid("vendor_id").references(() => users.id).notNull(),
  restaurantId: uuid("restaurant_id").references(() => restaurants.id),

  // Report period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  reportType: varchar("report_type", { length: 20 }).notNull(), // monthly, quarterly, annual

  // Report identification
  reportNumber: varchar("report_number", { length: 50 }).unique(),

  // Sales summary
  grossSales: decimal("gross_sales", { precision: 14, scale: 2 }).notNull().default("0"),
  vatableSales: decimal("vatable_sales", { precision: 14, scale: 2 }).default("0"),
  vatExemptSales: decimal("vat_exempt_sales", { precision: 14, scale: 2 }).default("0"),
  zeroRatedSales: decimal("zero_rated_sales", { precision: 14, scale: 2 }).default("0"),

  // Tax collected
  vatCollected: decimal("vat_collected", { precision: 14, scale: 2 }).default("0"),

  // Deductions and payments
  inputVat: decimal("input_vat", { precision: 14, scale: 2 }).default("0"), // VAT on purchases/expenses
  vatPayable: decimal("vat_payable", { precision: 14, scale: 2 }).default("0"), // Output VAT - Input VAT

  // Withholding summary
  withholdingCollected: decimal("withholding_collected", { precision: 14, scale: 2 }).default("0"),
  withholdingPaid: decimal("withholding_paid", { precision: 14, scale: 2 }).default("0"),

  // Order statistics
  totalOrders: integer("total_orders").default(0),
  totalInvoices: integer("total_invoices").default(0),
  seniorTransactions: integer("senior_transactions").default(0),
  pwdTransactions: integer("pwd_transactions").default(0),

  // Report status
  status: varchar("status", { length: 20 }).default("draft"), // draft, generated, submitted, filed

  // Export and filing
  exportedAt: timestamp("exported_at"),
  exportFormat: varchar("export_format", { length: 20 }), // csv, pdf, xml
  exportUrl: varchar("export_url", { length: 500 }), // Link to exported file
  filedAt: timestamp("filed_at"),
  filingReference: varchar("filing_reference", { length: 100 }), // BIR filing reference

  // Audit
  generatedBy: uuid("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for tax tables
export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  createdByUser: one(users, { fields: [taxRates.createdBy], references: [users.id] }),
}));

export const customerTaxExemptionsRelations = relations(customerTaxExemptions, ({ one }) => ({
  user: one(users, { fields: [customerTaxExemptions.userId], references: [users.id] }),
  verifiedByUser: one(users, { fields: [customerTaxExemptions.verifiedBy], references: [users.id] }),
}));

export const taxInvoicesRelations = relations(taxInvoices, ({ one }) => ({
  order: one(orders, { fields: [taxInvoices.orderId], references: [orders.id] }),
  customer: one(users, { fields: [taxInvoices.customerId], references: [users.id] }),
  vendor: one(users, { fields: [taxInvoices.vendorId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [taxInvoices.restaurantId], references: [restaurants.id] }),
  exemption: one(customerTaxExemptions, { fields: [taxInvoices.exemptionId], references: [customerTaxExemptions.id] }),
}));

export const vendorTaxReportsRelations = relations(vendorTaxReports, ({ one }) => ({
  vendor: one(users, { fields: [vendorTaxReports.vendorId], references: [users.id] }),
  restaurant: one(restaurants, { fields: [vendorTaxReports.restaurantId], references: [restaurants.id] }),
  generatedByUser: one(users, { fields: [vendorTaxReports.generatedBy], references: [users.id] }),
}));

// Insert schemas for tax tables
export const insertTaxRateSchema = createInsertSchema(taxRates, {
  type: z.enum(['vat', 'withholding', 'service']),
});

export const insertCustomerTaxExemptionSchema = createInsertSchema(customerTaxExemptions, {
  exemptionType: z.enum(['senior', 'pwd', 'diplomatic']),
  status: z.enum(['pending', 'verified', 'rejected', 'expired']).default('pending'),
});

export const insertTaxInvoiceSchema = createInsertSchema(taxInvoices, {
  status: z.enum(['draft', 'issued', 'cancelled', 'voided']).default('issued'),
  exemptionType: z.enum(['senior', 'pwd', 'diplomatic']).optional(),
});

export const insertVendorTaxReportSchema = createInsertSchema(vendorTaxReports, {
  reportType: z.enum(['monthly', 'quarterly', 'annual']),
  status: z.enum(['draft', 'generated', 'submitted', 'filed']).default('draft'),
});

// Types for tax tables
export type TaxRate = typeof taxRates.$inferSelect;
export type InsertTaxRate = z.infer<typeof insertTaxRateSchema>;
export type CustomerTaxExemption = typeof customerTaxExemptions.$inferSelect;
export type InsertCustomerTaxExemption = z.infer<typeof insertCustomerTaxExemptionSchema>;
export type TaxInvoice = typeof taxInvoices.$inferSelect;
export type InsertTaxInvoice = z.infer<typeof insertTaxInvoiceSchema>;
export type VendorTaxReport = typeof vendorTaxReports.$inferSelect;
export type InsertVendorTaxReport = z.infer<typeof insertVendorTaxReportSchema>;