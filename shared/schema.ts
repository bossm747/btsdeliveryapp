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
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRestaurantSchema = createInsertSchema(restaurants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({ id: true, createdAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRiderSchema = createInsertSchema(riders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });

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
export const insertLoyaltyPointsSchema = createInsertSchema(loyaltyPoints).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions).omit({ id: true, createdAt: true });
export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, createdAt: true });
export const insertRedemptionSchema = createInsertSchema(redemptions).omit({ id: true, createdAt: true });

export type LoyaltyPoints = typeof loyaltyPoints.$inferSelect;
export type InsertLoyaltyPoints = z.infer<typeof insertLoyaltyPointsSchema>;
export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
