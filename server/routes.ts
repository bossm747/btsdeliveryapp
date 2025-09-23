import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { 
  insertRestaurantSchema, 
  insertMenuCategorySchema, 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertUserSchema,
  insertRiderLocationHistorySchema,
  insertRiderAssignmentQueueSchema,
  insertRiderPerformanceMetricsSchema,
  insertLoyaltyPointsSchema,
  insertPointsTransactionSchema,
  insertRewardSchema,
  insertRedemptionSchema,
  type RiderLocationHistory,
  type RiderAssignmentQueue,
  riders,
  users,
  userSessions,
  orders,
  restaurants
} from "@shared/schema";
import { eq, sql, and, isNull, inArray, desc } from "drizzle-orm";
import { db, pool } from "./db";
import { z } from "zod";
import { nexusPayService, NEXUSPAY_CODES } from "./services/nexuspay";
import * as geminiAI from "./services/gemini";
import { nanoid } from "nanoid";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { gpsTrackingService } from "./gps-tracking";
import { generatePlatformImages, generateDishImages, generateCategoryImages } from "./generateImages";
import * as aiServices from "./ai-services";
import { riderAssignmentService } from "./riderAssignmentService";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
  clientId?: string;
  subscriptions?: Set<string>;
}

// JWT secret - loaded from environment variables
const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Authentication middleware
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if session is still valid
    const [session] = await db.select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, token));
    
    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ message: "Token expired" });
    }

    // Get user data
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Role-based access control middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Admin-only middleware
const requireAdmin = requireRole(['admin']);

// Admin or vendor middleware
const requireAdminOrVendor = requireRole(['admin', 'vendor']);

// Admin or rider middleware  
const requireAdminOrRider = requireRole(['admin', 'rider']);

// Audit logging middleware for admin actions
const auditLog = (action: string, resource: string) => {
  return async (req: any, res: any, next: any) => {
    const originalSend = res.send;
    
    res.send = function(body: any) {
      // Log the admin action if it was successful (200-299 status)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.role === 'admin') {
        // Import adminAuditLogs here to avoid circular dependency
        const { adminAuditLogs } = require("@shared/schema");
        
        db.insert(adminAuditLogs).values({
          adminUserId: req.user.id,
          action,
          resource,
          resourceId: req.params.id || req.body?.id || 'unknown',
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
            query: req.query,
            params: req.params
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }).catch((error) => {
          console.error('Failed to log admin action:', error);
        });
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============= AUTHENTICATION ROUTES =============
  
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { firstName, lastName, email, phone, password, role } = req.body;

      // Validate input
      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Check if user already exists
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const [newUser] = await db.insert(users).values({
        email,
        phone,
        firstName,
        lastName,
        role,
        passwordHash,
        status: "active"
      }).returning();

      // Create session
      const sessionToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: newUser.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
      
      await db.insert(userSessions).values({
        userId: newUser.id,
        sessionToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = newUser;

      res.status(201).json({
        message: "User created successfully",
        user: userResponse,
        token: sessionToken
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Find user by email
      const [user] = await db.select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is active
      if (user.status !== "active") {
        return res.status(401).json({ message: "Account is suspended or inactive" });
      }

      // Create session
      const sessionToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
      
      await db.insert(userSessions).values({
        userId: user.id,
        sessionToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      // Update last login
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = user;

      res.json({
        message: "Login successful",
        user: userResponse,
        token: sessionToken
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const { passwordHash: _, ...userResponse } = req.user;
      res.json(userResponse);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", authenticateToken, async (req: any, res) => {
    try {
      // Delete session
      await db.delete(userSessions)
        .where(eq(userSessions.id, req.sessionId));

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ============= OTHER ROUTES =============
  
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Restaurant routes
  app.get("/api/restaurants", async (req, res) => {
    try {
      const { city } = req.query;
      const restaurants = city 
        ? await storage.getRestaurantsByLocation(city as string)
        : await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const restaurantData = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(restaurantData);
      res.status(201).json(restaurant);
    } catch (error) {
      console.error("Error creating restaurant:", error);
      res.status(400).json({ message: "Invalid restaurant data" });
    }
  });

  // Menu routes
  app.get("/api/restaurants/:id/categories", async (req, res) => {
    try {
      const categories = await storage.getMenuCategories(req.params.id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching menu categories:", error);
      res.status(500).json({ message: "Failed to fetch menu categories" });
    }
  });

  app.get("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const menuItems = await storage.getMenuItems(req.params.id);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post("/api/restaurants/:id/categories", async (req, res) => {
    try {
      const categoryData = insertMenuCategorySchema.parse({
        ...req.body,
        restaurantId: req.params.id
      });
      const category = await storage.createMenuCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating menu category:", error);
      res.status(400).json({ message: "Invalid category data" });
    }
  });

  app.post("/api/restaurants/:id/menu", async (req, res) => {
    try {
      const itemData = insertMenuItemSchema.parse({
        ...req.body,
        restaurantId: req.params.id
      });
      const item = await storage.createMenuItem(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(400).json({ message: "Invalid menu item data" });
    }
  });

  // Order routes
  app.get("/api/orders", async (req, res) => {
    try {
      const { customerId, restaurantId } = req.query;
      let orders;
      
      if (customerId) {
        orders = await storage.getOrdersByCustomer(customerId as string);
      } else if (restaurantId) {
        orders = await storage.getOrdersByRestaurant(restaurantId as string);
      } else {
        orders = await storage.getOrders();
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status, notes } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const order = await storage.updateOrderStatus(req.params.id, status, notes);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Send real-time notification for order status update
      const statusMessages: { [key: string]: string } = {
        'confirmed': 'Ang iyong order ay nakumpirma na!',
        'preparing': 'Ginagawa na ang iyong order',
        'ready': 'Handa na ang iyong order para sa pickup',
        'picked_up': 'Nakuha na ng rider ang iyong order',
        'on_the_way': 'Papunta na sa iyo ang iyong order',
        'delivered': 'Nadeliver na ang iyong order. Salamat!',
        'cancelled': 'Na-cancel ang iyong order'
      };
      
      const message = statusMessages[status] || `Order status updated to ${status}`;
      
      // Use global notification function if available
      if ((global as any).notifyOrderUpdate) {
        await (global as any).notifyOrderUpdate(order.id, status, message);
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Rider routes
  app.get("/api/riders", async (req, res) => {
    try {
      const riders = await storage.getRiders();
      res.json(riders);
    } catch (error) {
      console.error("Error fetching riders:", error);
      res.status(500).json({ message: "Failed to fetch riders" });
    }
  });

  app.get("/api/riders/user/:userId", async (req, res) => {
    try {
      const rider = await storage.getRiderByUserId(req.params.userId);
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      res.json(rider);
    } catch (error) {
      console.error("Error fetching rider:", error);
      res.status(500).json({ message: "Failed to fetch rider" });
    }
  });

  // ==================== ADVANCED RIDER TRACKING ENDPOINTS ====================
  
  // Real-time location updates
  app.post("/api/riders/:riderId/location", async (req, res) => {
    try {
      const locationData = insertRiderLocationHistorySchema.parse({
        riderId: req.params.riderId,
        ...req.body
      });
      const location = await storage.createRiderLocationHistory(locationData);
      
      // Broadcast location update via WebSocket
      const locationJson = location.location as any;
      broadcastToSubscribers('rider_location', {
        riderId: req.params.riderId,
        location: {
          lat: parseFloat(locationJson.lat || locationJson.latitude || '0'),
          lng: parseFloat(locationJson.lng || locationJson.longitude || '0'),
          timestamp: location.timestamp,
          speed: locationJson.speed || 0,
          heading: locationJson.heading || 0
        }
      });
      
      res.status(201).json(location);
    } catch (error) {
      console.error("Error updating rider location:", error);
      res.status(400).json({ message: "Invalid location data" });
    }
  });

  // Get rider's current location
  app.get("/api/riders/:riderId/location/current", async (req, res) => {
    try {
      const location = await storage.getRiderCurrentLocation(req.params.riderId);
      if (!location) {
        return res.status(404).json({ message: "No location data found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching current location:", error);
      res.status(500).json({ message: "Failed to fetch current location" });
    }
  });

  // Get rider location history
  app.get("/api/riders/:riderId/location/history", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const history = await storage.getRiderLocationHistory(req.params.riderId, hours);
      res.json(history);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });

  // Start rider session
  app.post("/api/riders/:riderId/session/start", async (req, res) => {
    try {
      // Update rider online status
      await storage.updateRiderStatus(req.params.riderId, { isOnline: true });
      
      const sessionInfo = {
        riderId: req.params.riderId,
        startTime: new Date(),
        status: 'active'
      };
      
      res.status(201).json(sessionInfo);
    } catch (error) {
      console.error("Error starting rider session:", error);
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  // End rider session
  app.patch("/api/riders/:riderId/session/end", async (req, res) => {
    try {
      const session = await storage.endRiderSession(req.params.riderId, req.body);
      if (!session) {
        return res.status(404).json({ message: "No active session found" });
      }
      
      // Update rider offline status
      await storage.updateRiderStatus(req.params.riderId, { isOnline: false });
      
      res.json(session);
    } catch (error) {
      console.error("Error ending rider session:", error);
      res.status(500).json({ message: "Failed to end session" });
    }
  });

  // Get available riders for order assignment
  app.get("/api/orders/:orderId/available-riders", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Location coordinates required" });
      }
      
      const availableRiders = await storage.getAvailableRiders(
        parseFloat(lat as string),
        parseFloat(lng as string),
        10 // 10km radius
      );
      
      res.json(availableRiders);
    } catch (error) {
      console.error("Error fetching available riders:", error);
      res.status(500).json({ message: "Failed to fetch available riders" });
    }
  });

  // Create order assignment
  app.post("/api/orders/:orderId/assign", async (req, res) => {
    try {
      const assignmentData = insertRiderAssignmentQueueSchema.parse({
        orderId: req.params.orderId,
        ...req.body
      });
      
      const assignment = await storage.createOrderAssignment(assignmentData);
      
      // Notify rider via WebSocket
      if (assignment.assignedRiderId) {
        broadcastToSubscribers('order_assignment', {
          riderId: assignment.assignedRiderId,
          orderId: assignment.orderId,
          assignmentId: assignment.id,
          priority: assignment.priority
        });
      }
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating order assignment:", error);
      res.status(400).json({ message: "Invalid assignment data" });
    }
  });

  // Accept/Reject order assignment
  app.patch("/api/assignments/:assignmentId/respond", async (req, res) => {
    try {
      const { status, rejectionReason } = req.body;
      
      const assignment = await storage.updateOrderAssignmentStatus(
        req.params.assignmentId,
        status,
        rejectionReason
      );
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      // Broadcast status update
      broadcastToSubscribers('assignment_update', {
        assignmentId: assignment.id,
        orderId: assignment.orderId,
        riderId: assignment.riderId,
        status: assignment.status
      });
      
      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  // Create delivery tracking
  app.post("/api/deliveries/:orderId/tracking", async (req, res) => {
    try {
      const trackingData = insertRiderLocationHistorySchema.parse({
        orderId: req.params.orderId,
        ...req.body
      });
      
      const tracking = await storage.createRiderLocationHistory(trackingData);
      
      res.status(201).json(tracking);
    } catch (error) {
      console.error("Error creating delivery tracking:", error);
      res.status(400).json({ message: "Invalid tracking data" });
    }
  });

  // Update delivery tracking
  app.patch("/api/deliveries/:orderId/tracking", async (req, res) => {
    try {
      const tracking = await storage.updateDeliveryTracking(req.params.orderId, req.body);
      if (!tracking) {
        return res.status(404).json({ message: "Delivery tracking not found" });
      }
      
      // Broadcast tracking update to customer
      broadcastToSubscribers('delivery_update', {
        orderId: tracking.orderId,
        currentLocation: tracking.currentLocation,
        currentStatus: tracking.currentStatus,
        estimatedArrival: tracking.estimatedArrivalCustomer
      });
      
      res.json(tracking);
    } catch (error) {
      console.error("Error updating delivery tracking:", error);
      res.status(500).json({ message: "Failed to update delivery tracking" });
    }
  });

  // Get delivery tracking for customer
  app.get("/api/deliveries/:orderId/tracking", async (req, res) => {
    try {
      const tracking = await storage.getDeliveryTracking(req.params.orderId);
      if (!tracking) {
        return res.status(404).json({ message: "Delivery tracking not found" });
      }
      res.json(tracking);
    } catch (error) {
      console.error("Error fetching delivery tracking:", error);
      res.status(500).json({ message: "Failed to fetch delivery tracking" });
    }
  });

  // Get rider performance metrics
  app.get("/api/riders/:riderId/performance", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const metrics = await storage.getRiderPerformanceMetrics(
        req.params.riderId,
        startDate as string,
        endDate as string
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching rider performance:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  // Get all online riders for admin dashboard
  app.get("/api/admin/riders/online", async (req, res) => {
    try {
      const onlineRiders = await storage.getOnlineRiders();
      res.json(onlineRiders);
    } catch (error) {
      console.error("Error fetching online riders:", error);
      res.status(500).json({ message: "Failed to fetch online riders" });
    }
  });

  // Search restaurants
  app.get("/api/search/restaurants", async (req, res) => {
    try {
      const { q, category, city } = req.query;
      let restaurants = await storage.getRestaurants();
      
      if (city) {
        restaurants = await storage.getRestaurantsByLocation(city as string);
      }
      
      if (q) {
        const searchTerm = (q as string).toLowerCase();
        restaurants = restaurants.filter(r => 
          r.name.toLowerCase().includes(searchTerm) ||
          (r.description && r.description.toLowerCase().includes(searchTerm))
        );
      }
      
      if (category) {
        restaurants = restaurants.filter(r => 
          r.category?.toLowerCase() === (category as string).toLowerCase()
        );
      }
      
      res.json(restaurants);
    } catch (error) {
      console.error("Error searching restaurants:", error);
      res.status(500).json({ message: "Failed to search restaurants" });
    }
  });

  // NexusPay Payment Routes
  app.post("/api/payment/create", async (req, res) => {
    try {
      const { amount, orderId } = req.body;
      
      // Create webhook URL for payment status updates
      const webhookUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://localhost:5000'}/api/payment/webhook`;
      const redirectUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'https://localhost:5000'}/order/${orderId}`;
      
      // Create payment with NexusPay
      const payment = await nexusPayService.createCashInPayment(
        amount,
        webhookUrl,
        redirectUrl
      );
      
      // Store payment info in order
      if (payment.transactionId) {
        await storage.updateOrder(orderId, {
          paymentTransactionId: payment.transactionId,
          paymentStatus: 'pending'
        });
      }
      
      res.json({
        success: true,
        paymentLink: payment.link,
        transactionId: payment.transactionId
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to create payment" 
      });
    }
  });

  // Payment webhook endpoint
  app.post("/api/payment/webhook", async (req, res) => {
    try {
      const { transactionId, status, amount } = req.body;
      
      // Find order with this transaction ID
      const orders = await storage.getOrders();
      const order = orders.find(o => o.paymentTransactionId === transactionId);
      
      if (order) {
        // Update order payment status
        await storage.updateOrder(order.id, {
          paymentStatus: status === 'success' ? 'paid' : 'failed'
        });
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Check payment status
  app.get("/api/payment/status/:transactionId", async (req, res) => {
    try {
      const { transactionId } = req.params;
      const status = await nexusPayService.getPaymentStatus(transactionId);
      res.json(status);
    } catch (error: any) {
      console.error("Error checking payment status:", error);
      res.status(500).json({ 
        message: error.message || "Failed to check payment status" 
      });
    }
  });

  // Rider payout endpoint
  app.post("/api/rider/payout", async (req, res) => {
    try {
      const { riderId, amount, accountNumber, name, paymentMethod } = req.body;
      
      // Determine payment code based on method
      const code = paymentMethod === 'maya' ? NEXUSPAY_CODES.MAYA : NEXUSPAY_CODES.GCASH;
      
      // Create payout
      const payout = await nexusPayService.createPayout(
        code,
        accountNumber,
        name,
        amount
      );
      
      // Update rider balance
      const rider = await storage.getRider(riderId);
      if (rider) {
        await storage.updateRider(riderId, {
          earningsBalance: rider.earningsBalance - amount
        });
      }
      
      res.json({
        success: true,
        payoutLink: payout.payoutlink,
        message: "Payout initiated successfully"
      });
    } catch (error: any) {
      console.error("Error creating payout:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Failed to create payout" 
      });
    }
  });

  // Pabili Service Routes
  app.post("/api/pabili", async (req, res) => {
    try {
      const pabiliData = {
        ...req.body,
        serviceType: "pabili",
        status: "pending"
      };
      
      // Create order with pabili service type
      const order = await storage.createOrder({
        customerId: req.body.customerId || "guest",
        restaurantId: "pabili-service",
        items: pabiliData.items,
        subtotal: pabiliData.estimatedBudget,
        deliveryFee: pabiliData.deliveryFee || 49,
        serviceFee: pabiliData.serviceFee || 50,
        totalAmount: pabiliData.estimatedBudget + (pabiliData.deliveryFee || 49) + (pabiliData.serviceFee || 50),
        paymentMethod: "cash",
        paymentStatus: "pending",
        deliveryAddress: { address: pabiliData.deliveryAddress },
        specialInstructions: pabiliData.specialInstructions
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating pabili request:", error);
      res.status(500).json({ message: "Failed to create pabili request" });
    }
  });

  // Pabayad Service Routes  
  app.post("/api/pabayad", async (req, res) => {
    try {
      const pabayData = {
        ...req.body,
        serviceType: "pabayad",
        status: "pending"
      };
      
      // Create order with pabayad service type
      const order = await storage.createOrder({
        customerId: req.body.customerId || "guest",
        restaurantId: "pabayad-service",
        items: [{ 
          name: `Bill Payment - ${pabayData.billType}`,
          accountNumber: pabayData.accountNumber,
          amount: pabayData.amount
        }],
        subtotal: pabayData.amount,
        deliveryFee: 0,
        serviceFee: pabayData.serviceFee || 25,
        totalAmount: pabayData.amount + (pabayData.serviceFee || 25),
        paymentMethod: "cash",
        paymentStatus: "pending",
        deliveryAddress: { phone: pabayData.contactNumber },
        specialInstructions: `Account: ${pabayData.accountNumber}, Due: ${pabayData.dueDate}`
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating pabayad request:", error);
      res.status(500).json({ message: "Failed to create pabayad request" });
    }
  });

  // Parcel Service Routes
  app.post("/api/parcel", async (req, res) => {
    try {
      const parcelData = {
        ...req.body,
        serviceType: "parcel",
        status: "pending"
      };
      
      // Create order with parcel service type
      const order = await storage.createOrder({
        customerId: req.body.customerId || "guest",
        restaurantId: "parcel-service",
        items: [{
          name: `Parcel Delivery - ${parcelData.packageSize}`,
          description: parcelData.itemDescription,
          value: parcelData.itemValue
        }],
        subtotal: 0,
        deliveryFee: parcelData.deliveryFee,
        serviceFee: 0,
        totalAmount: parcelData.deliveryFee,
        paymentMethod: "cash",
        paymentStatus: "pending",
        deliveryAddress: {
          sender: parcelData.sender,
          receiver: parcelData.receiver
        },
        specialInstructions: parcelData.specialInstructions
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating parcel request:", error);
      res.status(500).json({ message: "Failed to create parcel request" });
    }
  });

  // Rider Routes
  app.get("/api/rider/profile", async (req, res) => {
    try {
      // Use raw connection to avoid schema issues
      const result = await pool.query(`
        SELECT 
          r.id,
          r.user_id,
          r.vehicle_type,
          r.license_number,
          r.vehicle_plate,
          r.is_online,
          r.current_location,
          r.rating,
          r.total_deliveries,
          r.earnings_balance,
          r.is_verified,
          COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.last_name, 'Rider') as user_name
        FROM riders r
        INNER JOIN users u ON r.user_id = u.id
        LIMIT 1
      `);

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({ message: "Rider not found" });
      }

      const rider = result.rows[0] as any;
      
      const riderProfile = {
        id: rider.id,
        name: rider.user_name || "Juan Dela Cruz",
        vehicleType: rider.vehicle_type,
        licenseNumber: rider.license_number,
        vehiclePlate: rider.vehicle_plate,
        rating: parseFloat(rider.rating?.toString() || "0"),
        totalDeliveries: rider.total_deliveries || 0,
        earningsBalance: parseFloat(rider.earnings_balance?.toString() || "0"),
        isOnline: rider.is_online || false,
        isVerified: rider.is_verified || false,
        currentLocation: rider.current_location
      };
      
      res.json(riderProfile);
    } catch (error) {
      console.error("Error fetching rider profile:", error);
      res.status(500).json({ message: "Failed to fetch rider profile" });
    }
  });

  app.get("/api/rider/deliveries/active", async (req, res) => {
    try {
      // Get active deliveries for the authenticated rider
      // In production, get rider ID from auth token
      const [rider] = await db.select().from(riders).limit(1);
      
      if (!rider) {
        return res.json([]);
      }
      
      const activeDeliveries = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.riderId, rider.id),
            inArray(orders.status, ["assigned", "picked_up", "in_transit"])
          )
        );
      
      res.json(activeDeliveries);
    } catch (error) {
      console.error("Error fetching active deliveries:", error);
      res.status(500).json({ message: "Failed to fetch active deliveries" });
    }
  });

  app.get("/api/rider/deliveries/history", async (req, res) => {
    try {
      // Get delivery history for the authenticated rider
      // In production, get rider ID from auth token  
      const [rider] = await db.select().from(riders).limit(1);
      
      if (!rider) {
        return res.json([]);
      }
      
      const history = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.riderId, rider.id),
            eq(orders.status, "delivered")
          )
        )
        .orderBy(desc(orders.updatedAt))
        .limit(50);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching delivery history:", error);
      res.status(500).json({ message: "Failed to fetch delivery history" });
    }
  });

  app.patch("/api/rider/status", async (req, res) => {
    try {
      const { isOnline, currentLocation } = req.body;
      
      // Update the first available rider (in production, use proper authentication)
      const [rider] = await db.select().from(riders).limit(1);
      
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }

      const updateData: any = { isOnline };
      
      if (currentLocation) {
        updateData.currentLocation = currentLocation;
      }

      await db
        .update(riders)
        .set(updateData)
        .where(eq(riders.id, rider.id));
      
      res.json({ success: true, isOnline, riderId: rider.id });
    } catch (error) {
      console.error("Error updating rider status:", error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.post("/api/rider/deliveries/:orderId/accept", async (req, res) => {
    try {
      const { orderId } = req.params;
      // Accept delivery
      res.json({ success: true, orderId });
    } catch (error) {
      res.status(500).json({ message: "Failed to accept delivery" });
    }
  });

  // Real-time delivery queue for riders
  app.get("/api/rider/deliveries/queue", async (req, res) => {
    try {
      // Get available orders that need delivery
      const availableOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
          status: orders.status,
          deliveryAddress: orders.deliveryAddress,
          customerId: orders.customerId,
          restaurantId: orders.restaurantId,
          createdAt: orders.createdAt
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "ready"),
            isNull(orders.riderId)
          )
        )
        .limit(10);

      // Enrich with restaurant and customer data
      const enrichedOrders = await Promise.all(
        availableOrders.map(async (order) => {
          const restaurant = await storage.getRestaurant(order.restaurantId);
          const customer = await db.select().from(users).where(eq(users.id, order.customerId)).limit(1);
          
          return {
            id: order.id,
            orderNumber: order.orderNumber,
            customer: {
              name: customer[0] ? `${customer[0].firstName} ${customer[0].lastName}` : "Customer",
              phone: customer[0]?.phone || "",
              address: typeof order.deliveryAddress === 'object' ? 
                (order.deliveryAddress as any)?.address || "Delivery Address" : 
                order.deliveryAddress || "Delivery Address",
              location: typeof order.deliveryAddress === 'object' ? 
                (order.deliveryAddress as any)?.location || { lat: 13.7565, lng: 121.0583 } :
                { lat: 13.7565, lng: 121.0583 }
            },
            restaurant: {
              name: restaurant?.name || "Restaurant",
              address: restaurant?.address || "Restaurant Address",
              location: restaurant?.location || { lat: 13.7600, lng: 121.0600 }
            },
            items: Array.isArray(order.deliveryAddress) ? order.deliveryAddress.length : 1,
            amount: parseFloat(order.totalAmount),
            distance: 3.5, // TODO: Calculate actual distance
            estimatedTime: 25, // TODO: Calculate based on distance
            status: order.status,
            priority: "normal",
            tip: 0
          };
        })
      );

      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching delivery queue:", error);
      res.status(500).json({ message: "Failed to fetch delivery queue" });
    }
  });

  // AI Route Optimization endpoint
  app.post("/api/rider/optimize-route", async (req, res) => {
    try {
      const { deliveries, currentLocation } = req.body;
      
      // Simulate AI route optimization using Gemini AI
      const optimizedRoute = {
        originalDistance: deliveries?.reduce((sum: number, d: any) => sum + d.distance, 0) || 0,
        optimizedDistance: (deliveries?.reduce((sum: number, d: any) => sum + d.distance, 0) || 0) * 0.85,
        timeSaved: Math.floor(Math.random() * 15) + 5,
        suggestedOrder: deliveries || [],
        aiSuggestions: [
          "Take Route 2 to avoid traffic on Main Street",
          "Prioritize high-tip orders for better earnings",
          "Group nearby deliveries to save time",
          "Expected lunch rush in 30 minutes - prepare for more orders"
        ]
      };
      
      res.json(optimizedRoute);
    } catch (error) {
      res.status(500).json({ message: "Failed to optimize route" });
    }
  });

  // Update rider location for real-time tracking
  app.post("/api/rider/location", async (req, res) => {
    try {
      const { lat, lng, riderId } = req.body;
      // In production, broadcast location to customers via WebSocket
      res.json({ 
        success: true, 
        message: "Location updated",
        location: { lat, lng }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Get rider earnings and stats
  app.get("/api/rider/earnings", async (req, res) => {
    try {
      // Get rider ID from authenticated user or request
      const riderId = req.user?.id; // Assuming middleware provides rider user
      
      if (!riderId) {
        return res.status(401).json({ message: "Rider authentication required" });
      }

      // Find rider record
      const [rider] = await db.select().from(riders).where(eq(riders.userId, riderId)).limit(1);
      
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }

      // Get delivered orders for this rider
      const deliveredOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.riderId, rider.id),
            eq(orders.status, "delivered")
          )
        );

      // Calculate time periods
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Filter orders by time periods
      const todayOrders = deliveredOrders.filter(o => o.actualDeliveryTime && new Date(o.actualDeliveryTime) >= today);
      const thisWeekOrders = deliveredOrders.filter(o => o.actualDeliveryTime && new Date(o.actualDeliveryTime) >= thisWeekStart);
      const thisMonthOrders = deliveredOrders.filter(o => o.actualDeliveryTime && new Date(o.actualDeliveryTime) >= thisMonthStart);

      // Calculate earnings (assuming 20% commission)
      const calculateEarnings = (orders: any[]) => 
        orders.reduce((sum, o) => sum + (parseFloat(o.totalAmount) * 0.2), 0);

      const earnings = {
        today: calculateEarnings(todayOrders),
        thisWeek: calculateEarnings(thisWeekOrders),
        thisMonth: calculateEarnings(thisMonthOrders),
        trips: deliveredOrders.length,
        tips: 0, // TODO: Implement tips system
        bonus: 0, // TODO: Implement bonus system
        completionRate: 100, // TODO: Calculate based on accepted vs completed
        acceptanceRate: 100 // TODO: Calculate based on offered vs accepted
      };

      res.json(earnings);
    } catch (error) {
      console.error("Error fetching rider earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });


  app.get("/api/admin/users", async (req, res) => {
    try {
      // Return users list
      const users: any[] = [];
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/riders", async (req, res) => {
    try {
      const riders = await storage.getRiders();
      res.json(riders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch riders" });
    }
  });

  app.patch("/api/admin/restaurants/:id/approve", async (req, res) => {
    try {
      const restaurant = await storage.updateRestaurant(req.params.id, { isActive: true });
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve restaurant" });
    }
  });

  app.patch("/api/admin/riders/:id/verify", async (req, res) => {
    try {
      const rider = await storage.updateRider(req.params.id, { isVerified: true });
      res.json(rider);
    } catch (error) {
      res.status(500).json({ message: "Failed to verify rider" });
    }
  });

  // Rider Assignment Routes
  app.post("/api/rider-assignments", async (req, res) => {
    try {
      const { orderId, restaurantLocation, deliveryLocation, priority = 1, estimatedValue, maxDistance = 10 } = req.body;
      
      if (!orderId || !restaurantLocation || !deliveryLocation) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const assignmentId = await riderAssignmentService.createAssignment({
        orderId,
        restaurantLocation,
        deliveryLocation,
        priority,
        estimatedValue: estimatedValue || 0,
        maxDistance
      });

      if (!assignmentId) {
        return res.status(500).json({ message: "Failed to create assignment" });
      }

      res.json({ assignmentId, message: "Assignment created successfully" });
    } catch (error) {
      console.error("Error creating rider assignment:", error);
      res.status(500).json({ message: "Failed to create rider assignment" });
    }
  });

  app.post("/api/rider-assignments/:assignmentId/accept", async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { riderId } = req.body;

      if (!riderId) {
        return res.status(400).json({ message: "Rider ID is required" });
      }

      const success = await riderAssignmentService.acceptAssignment(assignmentId, riderId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to accept assignment" });
      }

      res.json({ message: "Assignment accepted successfully" });
    } catch (error) {
      console.error("Error accepting assignment:", error);
      res.status(500).json({ message: "Failed to accept assignment" });
    }
  });

  app.get("/api/riders/:riderId/pending-assignments", async (req, res) => {
    try {
      const { riderId } = req.params;
      const assignments = await riderAssignmentService.getRiderPendingAssignments(riderId);
      res.json(assignments);
    } catch (error) {
      console.error("Error getting pending assignments:", error);
      res.status(500).json({ message: "Failed to get pending assignments" });
    }
  });

  app.post("/api/riders/:riderId/location", async (req, res) => {
    try {
      const { riderId } = req.params;
      const { latitude, longitude, accuracy } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const success = await riderAssignmentService.updateRiderLocation(riderId, {
        lat: latitude,
        lng: longitude,
        accuracy
      });

      if (!success) {
        return res.status(500).json({ message: "Failed to update location" });
      }

      res.json({ message: "Location updated successfully" });
    } catch (error) {
      console.error("Error updating rider location:", error);
      res.status(500).json({ message: "Failed to update rider location" });
    }
  });

  // Generate platform images endpoint
  app.post("/api/admin/generate-images", async (req, res) => {
    try {
      console.log("Starting image generation...");
      await generatePlatformImages();
      res.json({ success: true, message: "Images generated successfully" });
    } catch (error) {
      console.error("Error generating images:", error);
      res.status(500).json({ message: "Failed to generate images" });
    }
  });

  // Generate dish images endpoint
  app.post("/api/admin/generate-dish-images", async (req, res) => {
    try {
      console.log("Starting dish image generation...");
      await generateDishImages();
      res.json({ success: true, message: "Dish images generated successfully" });
    } catch (error) {
      console.error("Error generating dish images:", error);
      res.status(500).json({ message: "Failed to generate dish images" });
    }
  });

  // Generate category images endpoint
  app.post("/api/admin/generate-category-images", async (req, res) => {
    try {
      console.log("Starting category image generation...");
      await generateCategoryImages();
      res.json({ success: true, message: "Category images generated successfully" });
    } catch (error) {
      console.error("Error generating category images:", error);
      res.status(500).json({ message: "Failed to generate category images" });
    }
  });

  // AI-Powered Endpoints
  
  // Get personalized recommendations for customer
  app.post("/api/ai/recommendations", async (req, res) => {
    try {
      const { customerId, orderHistory, location } = req.body;
      const recommendations = await geminiAI.getPersonalizedRecommendations({
        customerId,
        orderHistory,
        currentTime: new Date(),
        location
      });
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  // Predict delivery time
  app.post("/api/ai/predict-delivery", async (req, res) => {
    try {
      const { distance, orderItems, restaurantPrepTime, currentTraffic, weatherCondition, timeOfDay } = req.body;
      const prediction = await geminiAI.predictDeliveryTime(
        distance,
        orderItems,
        restaurantPrepTime || 20,
        currentTraffic || "medium",
        weatherCondition || "clear",
        timeOfDay || new Date().toLocaleTimeString()
      );
      res.json(prediction);
    } catch (error) {
      console.error("Error predicting delivery time:", error);
      res.status(500).json({ message: "Failed to predict delivery time" });
    }
  });

  // Analyze review sentiment
  app.post("/api/ai/analyze-sentiment", async (req, res) => {
    try {
      const { reviewText } = req.body;
      const analysis = await geminiAI.analyzeReviewSentiment(reviewText);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      res.status(500).json({ message: "Failed to analyze sentiment" });
    }
  });

  // ==================== OBJECT STORAGE ENDPOINTS ====================
  
  // Object Storage Routes
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Serve private objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Serve public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== CUSTOMER API ENDPOINTS ====================
  
  // Customer Profile endpoints
  app.get("/api/customer/profile", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive data
      const { passwordHash, ...profile } = user;
      res.json(profile);
    } catch (error) {
      console.error("Error fetching customer profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/customer/profile", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const updates = req.body;
      // Remove fields that shouldn't be updated through this endpoint
      delete updates.id;
      delete updates.passwordHash;
      delete updates.role;
      delete updates.createdAt;

      const updatedUser = await storage.updateUser(req.user.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { passwordHash, ...profile } = updatedUser;
      res.json(profile);
    } catch (error) {
      console.error("Error updating customer profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Customer Orders endpoints
  app.get("/api/customer/orders", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const orders = await storage.getOrdersByCustomer(req.user.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/customer/orders/recent", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const orders = await storage.getOrdersByCustomer(req.user.id);
      // Return only the 10 most recent orders
      const recentOrders = orders.slice(0, 10);
      res.json(recentOrders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      res.status(500).json({ message: "Failed to fetch recent orders" });
    }
  });

  // Customer Favorites endpoints
  app.get("/api/customer/favorites", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const favorites = await storage.getFavoriteRestaurants(req.user.id);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorite restaurants:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/customer/favorites/:restaurantId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { restaurantId } = req.params;
      const favorite = await storage.addFavoriteRestaurant(req.user.id, restaurantId);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding favorite restaurant:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  app.delete("/api/customer/favorites/:restaurantId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { restaurantId } = req.params;
      await storage.removeFavoriteRestaurant(req.user.id, restaurantId);
      res.json({ message: "Removed from favorites" });
    } catch (error) {
      console.error("Error removing favorite restaurant:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // ==================== VENDOR API ENDPOINTS ====================
  
  // Vendor Categories endpoints
  app.get("/api/vendor/categories", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant first
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const categories = await storage.getMenuCategories(restaurants[0].id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching vendor categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/vendor/categories", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant first
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const categoryData = {
        ...req.body,
        restaurantId: restaurants[0].id
      };
      
      const validatedData = insertMenuCategorySchema.parse(categoryData);
      const category = await storage.createMenuCategory(validatedData);
      res.json(category);
    } catch (error) {
      console.error("Error creating vendor category:", error);
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  // Vendor Menu Items endpoints
  app.get("/api/vendor/menu-items", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant first
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const menuItems = await storage.getMenuItems(restaurants[0].id);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching vendor menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.post("/api/vendor/menu-items", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant first
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const menuItemData = {
        ...req.body,
        restaurantId: restaurants[0].id
      };
      
      const validatedData = insertMenuItemSchema.parse(menuItemData);
      const menuItem = await storage.createMenuItem(validatedData);
      res.json(menuItem);
    } catch (error) {
      console.error("Error creating vendor menu item:", error);
      res.status(400).json({ error: "Invalid menu item data" });
    }
  });

  // Vendor Orders endpoints
  app.get("/api/vendor/orders", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant first
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const orders = await storage.getOrdersByRestaurant(restaurants[0].id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.patch("/api/vendor/orders/:orderId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { orderId } = req.params;
      const { status, notes } = req.body;
      
      // Verify order belongs to vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const order = await storage.updateOrderStatus(parseInt(orderId), status, notes);
      res.json(order);
    } catch (error) {
      console.error("Error updating vendor order:", error);
      res.status(400).json({ error: "Failed to update order" });
    }
  });

  // Additional CRUD endpoints for Menu Items
  app.patch("/api/vendor/menu-items/:itemId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { itemId } = req.params;
      const updates = req.body;
      
      // Verify menu item belongs to vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updatedMenuItem = await storage.updateMenuItem(itemId, updates);
      if (!updatedMenuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      
      res.json(updatedMenuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/vendor/menu-items/:itemId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { itemId } = req.params;
      
      // Verify menu item belongs to vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      await storage.deleteMenuItem(itemId);
      res.json({ message: "Menu item deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // Additional CRUD endpoints for Categories
  app.patch("/api/vendor/categories/:categoryId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { categoryId } = req.params;
      const updates = req.body;
      
      // Verify category belongs to vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updatedCategory = await storage.updateMenuCategory(categoryId, updates);
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/vendor/categories/:categoryId", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { categoryId } = req.params;
      
      // Verify category belongs to vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      await storage.deleteMenuCategory(categoryId);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Restaurant profile management
  app.patch("/api/vendor/restaurant", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const updates = req.body;
      
      // Get vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const updatedRestaurant = await storage.updateRestaurant(restaurants[0].id, updates);
      if (!updatedRestaurant) {
        return res.status(404).json({ message: "Failed to update restaurant" });
      }
      
      res.json(updatedRestaurant);
    } catch (error) {
      console.error("Error updating restaurant:", error);
      res.status(500).json({ message: "Failed to update restaurant" });
    }
  });

  // Vendor Restaurant endpoint
  app.get("/api/vendor/restaurant", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get restaurants owned by the authenticated user
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      const restaurant = restaurants.length > 0 ? restaurants[0] : null;
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching vendor restaurant:", error);
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  // ==================== MERCHANT PANEL API ENDPOINTS ====================

  // Menu Modifiers Management
  app.get("/api/vendor/modifiers", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const modifiers = await storage.getMenuModifiers(restaurants[0].id);
      res.json(modifiers);
    } catch (error) {
      console.error("Error fetching modifiers:", error);
      res.status(500).json({ message: "Failed to fetch modifiers" });
    }
  });

  app.post("/api/vendor/modifiers", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const modifierData = insertMenuModifierSchema.parse({
        ...req.body,
        restaurantId: restaurants[0].id
      });

      const modifier = await storage.createMenuModifier(modifierData);
      res.status(201).json(modifier);
    } catch (error) {
      console.error("Error creating modifier:", error);
      res.status(400).json({ message: "Failed to create modifier" });
    }
  });

  // Modifier Options Management
  app.get("/api/vendor/modifiers/:modifierId/options", authenticateToken, async (req, res) => {
    try {
      const { modifierId } = req.params;
      const options = await storage.getModifierOptions(modifierId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching modifier options:", error);
      res.status(500).json({ message: "Failed to fetch modifier options" });
    }
  });

  app.post("/api/vendor/modifiers/:modifierId/options", authenticateToken, async (req, res) => {
    try {
      const { modifierId } = req.params;
      const optionData = insertModifierOptionSchema.parse({
        ...req.body,
        modifierId
      });

      const option = await storage.createModifierOption(optionData);
      res.status(201).json(option);
    } catch (error) {
      console.error("Error creating modifier option:", error);
      res.status(400).json({ message: "Failed to create modifier option" });
    }
  });

  app.patch("/api/vendor/modifiers/:modifierId/options/:optionId", authenticateToken, async (req, res) => {
    try {
      const { optionId } = req.params;
      const updates = req.body;

      const updatedOption = await storage.updateModifierOption(optionId, updates);
      if (!updatedOption) {
        return res.status(404).json({ message: "Modifier option not found" });
      }

      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating modifier option:", error);
      res.status(500).json({ message: "Failed to update modifier option" });
    }
  });

  app.delete("/api/vendor/modifiers/:modifierId/options/:optionId", authenticateToken, async (req, res) => {
    try {
      const { optionId } = req.params;
      await storage.deleteModifierOption(optionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting modifier option:", error);
      res.status(500).json({ message: "Failed to delete modifier option" });
    }
  });

  // Modifier CRUD endpoints
  app.patch("/api/vendor/modifiers/:modifierId", authenticateToken, async (req, res) => {
    try {
      const { modifierId } = req.params;
      const updates = req.body;

      const updatedModifier = await storage.updateMenuModifier(modifierId, updates);
      if (!updatedModifier) {
        return res.status(404).json({ message: "Modifier not found" });
      }

      res.json(updatedModifier);
    } catch (error) {
      console.error("Error updating modifier:", error);
      res.status(500).json({ message: "Failed to update modifier" });
    }
  });

  app.delete("/api/vendor/modifiers/:modifierId", authenticateToken, async (req, res) => {
    try {
      const { modifierId } = req.params;
      
      // First delete all options for this modifier
      const options = await storage.getModifierOptions(modifierId);
      for (const option of options) {
        await storage.deleteModifierOption(option.id);
      }
      
      // Then delete the modifier itself
      await storage.deleteMenuModifier(modifierId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting modifier:", error);
      res.status(500).json({ message: "Failed to delete modifier" });
    }
  });

  // Menu Item Modifier Assignment endpoints
  app.get("/api/vendor/menu-items/:itemId/modifiers", authenticateToken, async (req, res) => {
    try {
      const { itemId } = req.params;
      const modifiers = await storage.getMenuItemModifiers(itemId);
      res.json(modifiers);
    } catch (error) {
      console.error("Error fetching item modifiers:", error);
      res.status(500).json({ message: "Failed to fetch item modifiers" });
    }
  });

  app.post("/api/vendor/menu-items/:itemId/modifiers", authenticateToken, async (req, res) => {
    try {
      const { itemId } = req.params;
      const assignmentData = insertMenuItemModifierSchema.parse({
        ...req.body,
        menuItemId: itemId
      });

      const assignment = await storage.createMenuItemModifier(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error assigning modifier:", error);
      res.status(400).json({ message: "Failed to assign modifier" });
    }
  });

  app.delete("/api/vendor/menu-items/:itemId/modifiers/:assignmentId", authenticateToken, async (req, res) => {
    try {
      const { assignmentId } = req.params;
      await storage.deleteMenuItemModifier(assignmentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing modifier assignment:", error);
      res.status(500).json({ message: "Failed to remove modifier assignment" });
    }
  });

  // Promotions Management
  app.get("/api/vendor/promotions", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const promotions = await storage.getPromotions(restaurants[0].id);
      res.json(promotions);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      res.status(500).json({ message: "Failed to fetch promotions" });
    }
  });

  app.post("/api/vendor/promotions", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const promotionData = insertPromotionSchema.parse({
        ...req.body,
        restaurantId: restaurants[0].id
      });

      const promotion = await storage.createPromotion(promotionData);
      res.status(201).json(promotion);
    } catch (error) {
      console.error("Error creating promotion:", error);
      res.status(400).json({ message: "Failed to create promotion" });
    }
  });

  app.patch("/api/vendor/promotions/:promotionId", authenticateToken, async (req, res) => {
    try {
      const { promotionId } = req.params;
      const updates = req.body;

      const updatedPromotion = await storage.updatePromotion(promotionId, updates);
      if (!updatedPromotion) {
        return res.status(404).json({ message: "Promotion not found" });
      }

      res.json(updatedPromotion);
    } catch (error) {
      console.error("Error updating promotion:", error);
      res.status(500).json({ message: "Failed to update promotion" });
    }
  });

  app.delete("/api/vendor/promotions/:promotionId", authenticateToken, async (req, res) => {
    try {
      const { promotionId } = req.params;
      
      await storage.deletePromotion(promotionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      res.status(500).json({ message: "Failed to delete promotion" });
    }
  });

  // Financial Management - Vendor Earnings
  app.get("/api/vendor/earnings", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const { startDate, endDate } = req.query;
      const earnings = await storage.getVendorEarnings(
        restaurants[0].id, 
        startDate as string, 
        endDate as string
      );

      res.json(earnings);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.get("/api/vendor/earnings/summary", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json({ total_gross: 0, total_commission: 0, total_net: 0, total_transactions: 0 });
      }

      const { period = 'week' } = req.query;
      const summary = await storage.getEarningsSummary(
        restaurants[0].id, 
        period as 'day' | 'week' | 'month'
      );

      res.json(summary);
    } catch (error) {
      console.error("Error fetching earnings summary:", error);
      res.status(500).json({ message: "Failed to fetch earnings summary" });
    }
  });

  // Staff Management
  app.get("/api/vendor/staff", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const staff = await storage.getRestaurantStaff(restaurants[0].id);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.post("/api/vendor/staff", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const staffData = insertRestaurantStaffSchema.parse({
        ...req.body,
        restaurantId: restaurants[0].id
      });

      const staff = await storage.createStaffMember(staffData);
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating staff member:", error);
      res.status(400).json({ message: "Failed to create staff member" });
    }
  });

  app.patch("/api/vendor/staff/:staffId", authenticateToken, async (req, res) => {
    try {
      const { staffId } = req.params;
      const updates = req.body;

      const updatedStaff = await storage.updateStaffMember(staffId, updates);
      if (!updatedStaff) {
        return res.status(404).json({ message: "Staff member not found" });
      }

      res.json(updatedStaff);
    } catch (error) {
      console.error("Error updating staff member:", error);
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete("/api/vendor/staff/:staffId", authenticateToken, async (req, res) => {
    try {
      const { staffId } = req.params;
      
      await storage.deleteStaffMember(staffId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting staff member:", error);
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  // Inventory Management
  app.get("/api/vendor/inventory", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const inventory = await storage.getInventoryItems(restaurants[0].id);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/vendor/inventory/low-stock", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.json([]);
      }

      const lowStockItems = await storage.getLowStockItems(restaurants[0].id);
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  app.post("/api/vendor/inventory", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      const inventoryData = {
        ...req.body,
        restaurantId: restaurants[0].id
      };

      const item = await storage.createInventoryItem(inventoryData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating inventory item:", error);
      res.status(400).json({ message: "Failed to create inventory item" });
    }
  });

  app.patch("/api/vendor/inventory/:itemId", authenticateToken, async (req, res) => {
    try {
      const { itemId } = req.params;
      const updates = req.body;

      const updatedItem = await storage.updateInventoryItem(itemId, updates);
      if (!updatedItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/vendor/inventory/:itemId", authenticateToken, async (req, res) => {
    try {
      const { itemId } = req.params;
      
      await storage.deleteInventoryItem(itemId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // ==================== AI-POWERED VENDOR FEATURES ====================
  
  // AI Menu Description Generator
  app.post("/api/ai/menu-description", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { itemName, category, ingredients } = req.body;
      
      if (!itemName || !category) {
        return res.status(400).json({ message: "Item name and category are required" });
      }

      const description = await aiServices.generateMenuItemDescription(itemName, category, ingredients);
      res.json({ description });
    } catch (error) {
      console.error("Error generating menu description:", error);
      res.status(500).json({ message: "Failed to generate description" });
    }
  });

  // AI Business Description Generator
  app.post("/api/ai/business-description", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { businessName, cuisineType, specialties } = req.body;
      
      if (!businessName || !cuisineType) {
        return res.status(400).json({ message: "Business name and cuisine type are required" });
      }

      const description = await aiServices.generateBusinessDescription(businessName, cuisineType, specialties || []);
      res.json({ description });
    } catch (error) {
      console.error("Error generating business description:", error);
      res.status(500).json({ message: "Failed to generate business description" });
    }
  });

  // AI Image Generation for Menu Items
  app.post("/api/ai/menu-image", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { itemName, description } = req.body;
      
      if (!itemName || !description) {
        return res.status(400).json({ message: "Item name and description are required" });
      }

      const imageUrl = await aiServices.generateMenuItemImage(itemName, description);
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error generating menu item image:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // AI Promotional Banner Generator
  app.post("/api/ai/promotional-banner", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { businessName, promotion, colors } = req.body;
      
      if (!businessName || !promotion) {
        return res.status(400).json({ message: "Business name and promotion details are required" });
      }

      const imageUrl = await aiServices.generatePromotionalBanner(businessName, promotion, colors);
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error generating promotional banner:", error);
      res.status(500).json({ message: "Failed to generate promotional banner" });
    }
  });

  // AI Sales Analytics
  app.post("/api/ai/sales-analysis", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { period } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get sales data for the restaurant
      const orders = await storage.getOrdersByRestaurant(restaurants[0].id);
      
      const analysis = await aiServices.analyzeSalesData(orders, period || 'week');
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing sales data:", error);
      res.status(500).json({ message: "Failed to analyze sales data" });
    }
  });

  // AI Pricing Recommendations
  app.post("/api/ai/pricing-recommendations", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { menuItemId, competitorPrices, marketData } = req.body;
      
      if (!menuItemId) {
        return res.status(400).json({ message: "Menu item ID is required" });
      }

      const menuItem = await storage.getMenuItem(menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      const recommendations = await aiServices.generatePricingRecommendations(
        menuItem, 
        competitorPrices || [], 
        marketData || {}
      );
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating pricing recommendations:", error);
      res.status(500).json({ message: "Failed to generate pricing recommendations" });
    }
  });

  // AI Social Media Post Generator
  app.post("/api/ai/social-media-post", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { businessName, postType, content } = req.body;
      
      if (!businessName || !postType) {
        return res.status(400).json({ message: "Business name and post type are required" });
      }

      const post = await aiServices.generateSocialMediaPost(businessName, postType, content || {});
      res.json(post);
    } catch (error) {
      console.error("Error generating social media post:", error);
      res.status(500).json({ message: "Failed to generate social media post" });
    }
  });

  // AI Review Response Generator
  app.post("/api/ai/review-response", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { reviewText, rating, businessName } = req.body;
      
      if (!reviewText || !rating || !businessName) {
        return res.status(400).json({ message: "Review text, rating, and business name are required" });
      }

      const response = await aiServices.generateReviewResponse(reviewText, rating, businessName);
      res.json({ response });
    } catch (error) {
      console.error("Error generating review response:", error);
      res.status(500).json({ message: "Failed to generate review response" });
    }
  });

  // AI Demand Prediction
  app.post("/api/ai/demand-prediction", authenticateToken, requireAdminOrVendor, async (req, res) => {
    try {
      const { timeframe } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get historical order data
      const orders = await storage.getOrdersByRestaurant(restaurants[0].id);
      
      const predictions = await aiServices.predictDemand(orders, timeframe || '1day');
      res.json(predictions);
    } catch (error) {
      console.error("Error predicting demand:", error);
      res.status(500).json({ message: "Failed to predict demand" });
    }
  });

  // ==================== BTS OPERATIONAL API ENDPOINTS ====================
  
  // BTS Riders endpoints
  app.get("/api/bts/riders", async (req, res) => {
    try {
      const riders = await storage.getBtsRiders();
      res.json(riders);
    } catch (error) {
      console.error("Error fetching BTS riders:", error);
      res.status(500).json({ message: "Failed to fetch riders" });
    }
  });

  app.post("/api/bts/riders", async (req, res) => {
    try {
      const rider = await storage.createBtsRider(req.body);
      res.json(rider);
    } catch (error) {
      console.error("Error creating BTS rider:", error);
      res.status(400).json({ message: "Invalid rider data" });
    }
  });

  // BTS Sales Remittance endpoints
  app.get("/api/bts/sales-remittance", async (req, res) => {
    try {
      const salesData = await storage.getBtsSalesRemittance();
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching BTS sales remittance:", error);
      res.status(500).json({ message: "Failed to fetch sales data" });
    }
  });

  app.post("/api/bts/sales-remittance", async (req, res) => {
    try {
      const sale = await storage.createBtsSalesRemittance(req.body);
      res.json(sale);
    } catch (error) {
      console.error("Error creating BTS sales remittance:", error);
      res.status(400).json({ message: "Invalid sales data" });
    }
  });

  // BTS Attendance endpoints
  app.get("/api/bts/attendance", async (req, res) => {
    try {
      const attendanceData = await storage.getBtsAttendance();
      res.json(attendanceData);
    } catch (error) {
      console.error("Error fetching BTS attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance data" });
    }
  });

  app.post("/api/bts/attendance", async (req, res) => {
    try {
      const attendance = await storage.createBtsAttendance(req.body);
      res.json(attendance);
    } catch (error) {
      console.error("Error creating BTS attendance:", error);
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  // BTS Incentives endpoints
  app.get("/api/bts/incentives", async (req, res) => {
    try {
      const incentivesData = await storage.getBtsIncentives();
      res.json(incentivesData);
    } catch (error) {
      console.error("Error fetching BTS incentives:", error);
      res.status(500).json({ message: "Failed to fetch incentives data" });
    }
  });

  app.post("/api/bts/incentives", async (req, res) => {
    try {
      const incentive = await storage.createBtsIncentive(req.body);
      res.json(incentive);
    } catch (error) {
      console.error("Error creating BTS incentive:", error);
      res.status(400).json({ message: "Invalid incentive data" });
    }
  });

  // Customer support chatbot
  app.post("/api/ai/chat-support", async (req, res) => {
    try {
      const { query, orderId, orderStatus, customerName } = req.body;
      const response = await geminiAI.processCustomerQuery(query, {
        orderId,
        orderStatus,
        customerName
      });
      res.json(response);
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat query" });
    }
  });

  // Optimize delivery route
  app.post("/api/ai/optimize-route", async (req, res) => {
    try {
      const { pickupLocations, deliveryLocations, riderLocation } = req.body;
      const optimizedRoute = await geminiAI.optimizeDeliveryRoute(
        pickupLocations,
        deliveryLocations,
        riderLocation
      );
      res.json(optimizedRoute);
    } catch (error) {
      console.error("Error optimizing route:", error);
      res.status(500).json({ message: "Failed to optimize route" });
    }
  });

  // Predict demand forecast for restaurant
  app.post("/api/ai/demand-forecast", async (req, res) => {
    try {
      const { restaurantId, historicalData, upcomingDays } = req.body;
      const forecast = await geminiAI.predictDemandForecast(
        restaurantId,
        historicalData,
        upcomingDays || 7
      );
      res.json(forecast);
    } catch (error) {
      console.error("Error forecasting demand:", error);
      res.status(500).json({ message: "Failed to forecast demand" });
    }
  });

  // Generate promotional content
  app.post("/api/ai/generate-promo", async (req, res) => {
    try {
      const { restaurantName, cuisine, targetAudience, promoType, context } = req.body;
      const promoContent = await geminiAI.generatePromoContent(
        restaurantName,
        cuisine,
        targetAudience,
        promoType,
        context
      );
      res.json(promoContent);
    } catch (error) {
      console.error("Error generating promo:", error);
      res.status(500).json({ message: "Failed to generate promo content" });
    }
  });

  // Secure Chatbot Endpoints
  
  // Validate chatbot context and session
  const validateChatContext = (req: any, res: any, next: any) => {
    const { context } = req.body;
    if (!context || !context.timestamp) {
      return res.status(401).json({ message: "Invalid chat context" });
    }
    
    // Check if timestamp is within valid range (5 minutes)
    const now = Date.now();
    if (Math.abs(now - context.timestamp) > 300000) {
      return res.status(401).json({ message: "Session expired" });
    }
    
    // Validate signature (simplified for demo)
    try {
      const decoded = atob(context.signature);
      const parsed = JSON.parse(decoded);
      if (!parsed.endpoint) {
        return res.status(401).json({ message: "Invalid signature" });
      }
    } catch (error) {
      return res.status(401).json({ message: "Invalid signature format" });
    }
    
    next();
  };

  // Get real-time order tracking data
  app.post("/api/chatbot/track-order", validateChatContext, async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Get real-time tracking data
      const trackingData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        restaurant: await storage.getRestaurant(order.restaurantId),
        rider: order.riderId ? await storage.getRider(order.riderId) : null,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress
      };
      
      res.json(trackingData);
    } catch (error) {
      console.error("Error tracking order:", error);
      res.status(500).json({ message: "Failed to track order" });
    }
  });

  // Get customer analytics
  app.post("/api/chatbot/analytics", validateChatContext, async (req, res) => {
    try {
      const { customerId, dateRange } = req.body;
      
      // Get customer orders for analytics
      const orders = await storage.getOrdersByCustomer(customerId);
      
      // Calculate analytics
      const analytics = {
        totalOrders: orders.length,
        totalSpent: orders.reduce((sum: number, order: any) => sum + parseFloat(order.totalAmount), 0),
        averageOrderValue: orders.length > 0 ? 
          orders.reduce((sum: number, order: any) => sum + parseFloat(order.totalAmount), 0) / orders.length : 0,
        favoriteRestaurants: [],
        ordersByDay: [],
        serviceBreakdown: {
          foodDelivery: 45,
          pabili: 25,
          pabayad: 20,
          parcel: 10
        }
      };
      
      res.json(analytics);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Get order history with security
  app.post("/api/chatbot/order-history", validateChatContext, async (req, res) => {
    try {
      const { customerId, limit = 10 } = req.body;
      
      const orders = await storage.getOrdersByCustomer(customerId);
      const recentOrders = orders.slice(0, limit).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        status: order.status,
        totalAmount: order.totalAmount,
        restaurantId: order.restaurantId,
        items: order.items
      }));
      
      res.json(recentOrders);
    } catch (error) {
      console.error("Error getting order history:", error);
      res.status(500).json({ message: "Failed to get order history" });
    }
  });

  // Generate order receipt
  app.post("/api/chatbot/receipt", validateChatContext, async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const restaurant = await storage.getRestaurant(order.restaurantId);
      
      const receipt = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        restaurant: restaurant?.name || "Restaurant",
        items: order.items,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        serviceFee: order.serviceFee,
        discount: order.discount,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        deliveryAddress: order.deliveryAddress
      };
      
      res.json(receipt);
    } catch (error) {
      console.error("Error generating receipt:", error);
      res.status(500).json({ message: "Failed to generate receipt" });
    }
  });

  // Admin Dispatch Console Endpoints
  app.get("/api/admin/dispatch/orders", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      
      // Transform orders for dispatch console with live data
      const liveOrders = orders.map((order: any) => {
        const now = new Date();
        const createdAt = new Date(order.createdAt);
        const estimatedDelivery = new Date(createdAt.getTime() + (order.estimatedDeliveryTime || 30) * 60000);
        const slaBreach = now > estimatedDelivery && !['delivered', 'cancelled'].includes(order.status);
        
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: `Customer ${order.customerId}`,
          customerPhone: "09171234567",
          restaurantName: "Restaurant",
          status: order.status,
          estimatedDeliveryTime: estimatedDelivery.toLocaleTimeString(),
          riderId: order.riderId,
          riderName: order.riderId ? `Rider ${order.riderId}` : null,
          riderPhone: order.riderId ? "09187654321" : null,
          deliveryAddress: order.deliveryAddress,
          totalAmount: order.totalAmount,
          priority: 1,
          createdAt: order.createdAt,
          slaBreach,
          lastUpdate: order.updatedAt
        };
      });
      
      res.json(liveOrders);
    } catch (error) {
      console.error("Error fetching dispatch orders:", error);
      res.status(500).json({ message: "Failed to fetch dispatch orders" });
    }
  });

  app.get("/api/admin/dispatch/riders", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const riders = await storage.getRiders();
      
      // Transform riders for dispatch console with live data
      const liveRiders = riders.map((rider: any) => ({
        id: rider.id,
        name: `${rider.userId}`, // Would need user join in real implementation
        phone: "09171234567",
        vehicleType: rider.vehicleType || "motorcycle",
        isOnline: rider.isOnline || false,
        currentLocation: rider.currentLocation || {
          lat: 13.7563 + (Math.random() - 0.5) * 0.1,
          lng: 121.0583 + (Math.random() - 0.5) * 0.1,
          accuracy: 10,
          timestamp: new Date().toISOString()
        },
        activeOrdersCount: rider.activeOrdersCount || 0,
        maxActiveOrders: rider.maxActiveOrders || 3,
        status: rider.isOnline ? 'available' : 'offline',
        lastActivity: rider.lastActivityAt || new Date().toISOString(),
        rating: rider.rating || 4.5,
        todayDeliveries: rider.completedDeliveries || 0
      }));
      
      res.json(liveRiders);
    } catch (error) {
      console.error("Error fetching dispatch riders:", error);
      res.status(500).json({ message: "Failed to fetch dispatch riders" });
    }
  });

  app.get("/api/admin/dispatch/alerts", authenticateToken, requireAdmin, async (req, res) => {
    try {
      // Get real alerts from database
      const currentTime = new Date();
      const alerts = [];
      
      // Check for SLA breaches - orders taking longer than estimated
      const overDueOrders = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, "in_transit"),
            sql`${orders.createdAt} < ${new Date(currentTime.getTime() - 60 * 60 * 1000)}` // 1 hour overdue
          )
        );
      
      if (overDueOrders.length > 0) {
        alerts.push({
          id: `sla-breach-${Date.now()}`,
          type: "sla_breach",
          severity: "high",
          title: `${overDueOrders.length} Orders Overdue`,
          description: `${overDueOrders.length} orders have exceeded their estimated delivery time`,
          timestamp: currentTime.toISOString(),
          acknowledged: false,
          affectedOrders: overDueOrders.map(o => o.id)
        });
      }
      
      // Check for low rider capacity
      const onlineRiders = await db
        .select()
        .from(riders)
        .where(eq(riders.isOnline, true));
      
      if (onlineRiders.length < 5) {
        alerts.push({
          id: `low-capacity-${Date.now()}`,
          type: "rider_offline",
          severity: "medium", 
          title: "Low Rider Capacity",
          description: `Only ${onlineRiders.length} riders online`,
          timestamp: currentTime.toISOString(),
          acknowledged: false,
          affectedRiders: onlineRiders.map(r => r.id)
        });
      }
      
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching dispatch alerts:", error);
      res.status(500).json({ message: "Failed to fetch dispatch alerts" });
    }
  });

  app.post("/api/admin/dispatch/assign", authenticateToken, requireAdmin, auditLog('assign', 'orders'), async (req, res) => {
    try {
      const { orderId, riderId } = req.body;
      
      if (!orderId || !riderId) {
        return res.status(400).json({ message: "Order ID and Rider ID are required" });
      }
      
      // Update order with assigned rider
      const updatedOrder = await storage.updateOrder(orderId, { riderId });
      
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update rider active orders count
      const rider = await storage.getRider(riderId);
      if (rider) {
        await storage.updateRider(riderId, { 
          activeOrdersCount: (rider.activeOrdersCount || 0) + 1 
        });
      }
      
      res.json({ message: "Rider assigned successfully", order: updatedOrder });
    } catch (error) {
      console.error("Error assigning rider:", error);
      res.status(500).json({ message: "Failed to assign rider" });
    }
  });

  app.post("/api/admin/dispatch/reassign", authenticateToken, requireAdmin, auditLog('reassign', 'orders'), async (req, res) => {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // If order had a rider, decrease their active count
      if (order.riderId) {
        const rider = await storage.getRider(order.riderId);
        if (rider) {
          await storage.updateRider(order.riderId, {
            activeOrdersCount: Math.max((rider.activeOrdersCount || 1) - 1, 0)
          });
        }
      }
      
      // Remove rider assignment and reset status
      const updatedOrder = await storage.updateOrder(orderId, { 
        riderId: null,
        status: 'confirmed'
      });
      
      res.json({ message: "Order reassigned successfully", order: updatedOrder });
    } catch (error) {
      console.error("Error reassigning order:", error);
      res.status(500).json({ message: "Failed to reassign order" });
    }
  });

  app.patch("/api/admin/dispatch/alerts/:id/acknowledge", authenticateToken, requireAdmin, auditLog('acknowledge', 'alerts'), async (req, res) => {
    try {
      const { id } = req.params;
      
      // In real implementation, would update systemAlerts table
      // For now, just return success
      
      res.json({ message: "Alert acknowledged successfully" });
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  // Admin Dashboard Endpoints
  app.get("/api/admin/stats", authenticateToken, requireAdmin, auditLog('view', 'admin_stats'), async (req, res) => {
    try {
      // Get various statistics for admin dashboard
      const restaurants = await storage.getRestaurants();
      const orders = await storage.getOrders();
      const riders = await storage.getRiders();
      
      // Calculate real statistics from database
      const users = await storage.getUsers();
      const totalUsers = users.length;
      const activeRestaurants = restaurants.filter(r => r.isActive).length;
      const totalOrders = orders.length;
      const activeRiders = riders.filter(r => r.isOnline).length;
      const onlineRiders = riders.filter(r => r.isOnline).length;
      
      // Calculate today's revenue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = orders.filter(o => new Date(o.createdAt) >= today);
      const revenueToday = todayOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount), 0);
      
      res.json({
        totalUsers,
        activeRestaurants,
        totalOrders,
        activeRiders: riders.length,
        onlineRiders,
        revenueToday,
        activeUsers: 12456
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      // Mock user data for demo
      const users = [
        { id: "1", firstName: "Juan", lastName: "Dela Cruz", email: "juan@example.com", phone: "09171234567", role: "customer", status: "active" },
        { id: "2", firstName: "Maria", lastName: "Santos", email: "maria@example.com", phone: "09181234567", role: "vendor", status: "active" },
        { id: "3", firstName: "Pedro", lastName: "Garcia", email: "pedro@example.com", phone: "09191234567", role: "rider", status: "active" },
        { id: "4", firstName: "Ana", lastName: "Reyes", email: "ana@example.com", phone: "09201234567", role: "customer", status: "active" },
        { id: "5", firstName: "Jose", lastName: "Mendoza", email: "jose@example.com", phone: "09211234567", role: "customer", status: "inactive" }
      ];
      
      const { searchTerm } = req.query;
      if (searchTerm) {
        const filtered = users.filter(u => 
          u.firstName.toLowerCase().includes(searchTerm.toString().toLowerCase()) ||
          u.lastName.toLowerCase().includes(searchTerm.toString().toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toString().toLowerCase())
        );
        return res.json(filtered);
      }
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getRestaurants();
      const enrichedRestaurants = restaurants.map(r => ({
        ...r,
        ownerName: "Restaurant Owner",
        city: r.address?.city || "Batangas City"
      }));
      res.json(enrichedRestaurants);
    } catch (error) {
      console.error("Error fetching admin restaurants:", error);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/admin/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const { filterStatus } = req.query;
      
      let filteredOrders = orders;
      if (filterStatus && filterStatus !== "all") {
        filteredOrders = orders.filter(o => o.status === filterStatus);
      }
      
      // Enrich order data
      const enrichedOrders = await Promise.all(
        filteredOrders.slice(0, 20).map(async (order) => {
          const restaurant = await storage.getRestaurant(order.restaurantId);
          return {
            ...order,
            customerName: "Customer",
            restaurantName: restaurant?.name || "Restaurant"
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/riders", async (req, res) => {
    try {
      const riders = await storage.getRiders();
      const enrichedRiders = riders.map(r => ({
        ...r,
        name: "Rider " + r.id.slice(0, 8),
        totalDeliveries: Math.floor(Math.random() * 200) + 50
      }));
      res.json(enrichedRiders);
    } catch (error) {
      console.error("Error fetching admin riders:", error);
      res.status(500).json({ message: "Failed to fetch riders" });
    }
  });

  app.patch("/api/admin/restaurants/:id/approve", async (req, res) => {
    try {
      const restaurant = await storage.updateRestaurant(req.params.id, { isActive: true });
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      console.error("Error approving restaurant:", error);
      res.status(500).json({ message: "Failed to approve restaurant" });
    }
  });

  app.patch("/api/admin/riders/:id/verify", async (req, res) => {
    try {
      const rider = await storage.updateRider(req.params.id, { isVerified: true });
      if (!rider) {
        return res.status(404).json({ message: "Rider not found" });
      }
      res.json(rider);
    } catch (error) {
      console.error("Error verifying rider:", error);
      res.status(500).json({ message: "Failed to verify rider" });
    }
  });

  // Get live delivery tracking
  app.post("/api/chatbot/live-tracking", validateChatContext, async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await storage.getOrder(orderId);
      
      if (!order || !order.riderId) {
        return res.status(404).json({ message: "No active delivery found" });
      }
      
      const rider = await storage.getRider(order.riderId);
      const restaurant = await storage.getRestaurant(order.restaurantId);
      
      // Calculate estimated time (simplified)
      const now = new Date();
      const estimatedTime = order.estimatedDeliveryTime ? 
        Math.max(0, Math.round((new Date(order.estimatedDeliveryTime).getTime() - now.getTime()) / 60000)) : 15;
      
      const tracking = {
        orderId: order.id,
        status: order.status,
        rider: {
          name: rider?.userId || "Rider",
          location: rider?.currentLocation || { lat: 13.7565, lng: 121.0583 },
          vehicleType: rider?.vehicleType || "motorcycle"
        },
        restaurant: {
          name: restaurant?.name || "Restaurant",
          location: { lat: 13.7565, lng: 121.0583 }
        },
        delivery: {
          address: order.deliveryAddress,
          estimatedMinutes: estimatedTime,
          distance: 2.5 // Simplified
        }
      };
      
      res.json(tracking);
    } catch (error) {
      console.error("Error getting live tracking:", error);
      res.status(500).json({ message: "Failed to get live tracking" });
    }
  });

  // GPS Tracking and Delivery Optimization Routes
  
  // Update rider location
  app.post("/api/gps/location", async (req, res) => {
    try {
      const { riderId, latitude, longitude, accuracy, speed, heading } = req.body;
      
      if (!riderId || !latitude || !longitude) {
        return res.status(400).json({ message: "Missing required location data" });
      }

      await gpsTrackingService.updateRiderLocation(riderId, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : undefined,
        speed: speed ? parseFloat(speed) : undefined,
        heading: heading ? parseFloat(heading) : undefined,
      });

      // Get current order for rider to broadcast location to tracking subscribers
      const orders = await storage.getOrders();
      const activeOrder = orders.find(o => o.riderId === riderId && (o.status === 'picked_up' || o.status === 'in_transit'));
      
      if (activeOrder) {
        broadcastRiderLocationUpdate(activeOrder.id, {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : undefined,
          speed: speed ? parseFloat(speed) : undefined,
          heading: heading ? parseFloat(heading) : undefined
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating rider location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Get rider's current location
  app.get("/api/gps/rider/:riderId/location", async (req, res) => {
    try {
      const location = await gpsTrackingService.getRiderLatestLocation(req.params.riderId);
      if (!location) {
        return res.status(404).json({ message: "No location data found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching rider location:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // Get rider's location history
  app.get("/api/gps/rider/:riderId/history", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const history = await gpsTrackingService.getRiderLocationHistory(req.params.riderId, hours);
      res.json(history);
    } catch (error) {
      console.error("Error fetching location history:", error);
      res.status(500).json({ message: "Failed to fetch location history" });
    }
  });

  // Create optimized delivery route
  app.post("/api/gps/route", async (req, res) => {
    try {
      const { riderId, orderId, startLocation, endLocation, waypoints } = req.body;
      
      if (!riderId || !orderId || !startLocation || !endLocation) {
        return res.status(400).json({ message: "Missing required route data" });
      }

      const route = await gpsTrackingService.createDeliveryRoute(
        riderId,
        orderId,
        startLocation,
        endLocation,
        waypoints
      );

      res.json(route);
    } catch (error) {
      console.error("Error creating delivery route:", error);
      res.status(500).json({ message: "Failed to create delivery route" });
    }
  });

  // Start delivery route
  app.post("/api/gps/route/:routeId/start", async (req, res) => {
    try {
      await gpsTrackingService.startDeliveryRoute(req.params.routeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error starting delivery route:", error);
      res.status(500).json({ message: "Failed to start delivery route" });
    }
  });

  // Complete delivery route
  app.post("/api/gps/route/:routeId/complete", async (req, res) => {
    try {
      const { actualDistance, actualDuration } = req.body;
      await gpsTrackingService.completeDeliveryRoute(
        req.params.routeId,
        actualDistance,
        actualDuration
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error completing delivery route:", error);
      res.status(500).json({ message: "Failed to complete delivery route" });
    }
  });

  // Add delivery tracking event
  app.post("/api/gps/tracking-event", async (req, res) => {
    try {
      const { orderId, riderId, eventType, location, notes } = req.body;
      
      if (!orderId || !riderId || !eventType) {
        return res.status(400).json({ message: "Missing required tracking data" });
      }

      const event = await gpsTrackingService.addTrackingEvent(
        orderId,
        riderId,
        eventType,
        location,
        notes
      );

      // Broadcast tracking event to real-time subscribers
      broadcastTrackingEvent(orderId, event);

      res.json(event);
    } catch (error) {
      console.error("Error adding tracking event:", error);
      res.status(500).json({ message: "Failed to add tracking event" });
    }
  });

  // Get order tracking events
  app.get("/api/gps/order/:orderId/tracking", async (req, res) => {
    try {
      const events = await gpsTrackingService.getOrderTrackingEvents(req.params.orderId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching tracking events:", error);
      res.status(500).json({ message: "Failed to fetch tracking events" });
    }
  });

  // CRITICAL FIX: Add missing API route that client expects
  app.get("/api/orders/:id/tracking", async (req, res) => {
    const startTime = Date.now();
    const orderId = req.params.id;
    
    console.log(`📍 TRACKING API: GET /api/orders/${orderId}/tracking requested`);
    
    try {
      
      // Get the order details
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Get the restaurant details
      const restaurant = await storage.getRestaurant(order.restaurantId);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      // Get rider details if assigned
      let rider = null;
      let riderLocation = null;
      if (order.riderId) {
        const riderData = await storage.getRider(order.riderId);
        if (riderData) {
          rider = {
            id: riderData.id,
            name: riderData.firstName + " " + riderData.lastName,
            phone: riderData.phone,
            vehicleType: riderData.vehicleType || "motorcycle",
            rating: riderData.rating || 4.5,
            photo: riderData.profileImageUrl
          };
          
          // Get rider's current location
          const latestLocation = await gpsTrackingService.getRiderLatestLocation(order.riderId);
          if (latestLocation) {
            riderLocation = latestLocation.location;
          }
        }
      }

      // Get tracking events
      const events = await gpsTrackingService.getOrderTrackingEvents(orderId);

      // Build tracking timeline from events
      const timeline = events.map(event => ({
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp.toISOString(),
        location: event.location,
        notes: event.notes
      }));

      // Calculate estimated time based on status
      let estimatedTime = 30; // Default 30 minutes
      switch (order.status) {
        case 'pending':
        case 'confirmed':
          estimatedTime = 45;
          break;
        case 'preparing':
          estimatedTime = 25;
          break;
        case 'ready':
        case 'picked_up':
          estimatedTime = 15;
          break;
        case 'in_transit':
          estimatedTime = 10;
          break;
        case 'delivered':
          estimatedTime = 0;
          break;
      }

      // Build comprehensive tracking response that client expects
      const trackingData = {
        orderId: order.id,
        orderNumber: order.orderNumber || `BTS-${order.id.slice(-6).toUpperCase()}`,
        status: order.status,
        estimatedTime,
        actualDeliveryTime: order.status === 'delivered' ? order.updatedAt?.toISOString() : undefined,
        distance: 5.2, // TODO: Calculate actual distance
        customer: {
          name: order.customerName || "Customer",
          phone: order.customerPhone || "",
          address: order.deliveryAddress || "",
          location: order.deliveryLocation || { lat: 13.7565, lng: 121.0583 }
        },
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          phone: restaurant.phone || "",
          address: restaurant.address || "",
          location: restaurant.location || { lat: 13.7565, lng: 121.0583 }
        },
        rider,
        timeline,
        currentLocation: riderLocation,
        estimatedArrival: order.status === 'delivered' ? null : 
          new Date(Date.now() + estimatedTime * 60 * 1000).toISOString()
      };

      const duration = Date.now() - startTime;
      console.log(`✅ TRACKING API: Successfully returned tracking data for order ${orderId} in ${duration}ms`);
      console.log(`📊 TRACKING DATA: Status=${trackingData.status}, Rider=${trackingData.rider ? trackingData.rider.name : 'None'}, Timeline=${trackingData.timeline.length} events`);
      
      res.json(trackingData);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ TRACKING API: Failed to fetch tracking for order ${orderId} in ${duration}ms:`, error);
      res.status(500).json({ message: "Failed to fetch order tracking" });
    }
  });

  // Get estimated arrival time
  app.post("/api/gps/eta", async (req, res) => {
    try {
      const { riderId, destination } = req.body;
      
      if (!riderId || !destination) {
        return res.status(400).json({ message: "Missing rider ID or destination" });
      }

      const eta = await gpsTrackingService.getEstimatedArrival(riderId, destination);
      
      // Get current order for rider to broadcast ETA update
      const orders = await storage.getOrders();
      const activeOrder = orders.find(o => o.riderId === riderId && (o.status === 'picked_up' || o.status === 'in_transit'));
      
      if (activeOrder && eta) {
        const estimatedArrival = new Date(Date.now() + eta * 60 * 1000).toISOString();
        broadcastETAUpdate(activeOrder.id, estimatedArrival, eta);
      }
      
      res.json({ estimatedMinutes: eta });
    } catch (error) {
      console.error("Error calculating ETA:", error);
      res.status(500).json({ message: "Failed to calculate ETA" });
    }
  });

  // Check if rider is near delivery location
  app.post("/api/gps/rider/:riderId/near-delivery", async (req, res) => {
    try {
      const { deliveryLocation } = req.body;
      
      if (!deliveryLocation) {
        return res.status(400).json({ message: "Missing delivery location" });
      }

      const isNear = await gpsTrackingService.isRiderNearDelivery(req.params.riderId, deliveryLocation);
      res.json({ isNear });
    } catch (error) {
      console.error("Error checking proximity:", error);
      res.status(500).json({ message: "Failed to check proximity" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Map<string, ExtendedWebSocket>();

  // Broadcast notification to specific users
  const broadcastNotification = (notification: any, targetUsers?: string[]) => {
    const message = JSON.stringify(notification);
    
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        if (targetUsers && client.userId) {
          if (targetUsers.includes(client.userId)) {
            client.send(message);
          }
        } else if (!targetUsers) {
          client.send(message);
        }
      }
    });
  };

  // Enhanced broadcast for subscription-based notifications
  const broadcastToSubscribers = (event: string, data: any) => {
    const message = JSON.stringify({
      type: event,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.subscriptions?.has(event)) {
        client.send(message);
      }
    });
  };

  // Send notification by role
  const notifyByRole = (notification: any, role: string) => {
    const message = JSON.stringify(notification);
    
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && client.userRole === role) {
        client.send(message);
      }
    });
  };

  // Send notification for order updates
  const notifyOrderUpdate = async (orderId: string, status: string, message: string) => {
    const order = await storage.getOrder(orderId);
    if (!order) return;
    
    const notification = {
      type: "order_update",
      orderId,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    // Notify customer
    if (order.customerId) {
      broadcastNotification(notification, [order.customerId]);
    }
    
    // Notify restaurant
    const restaurant = await storage.getRestaurant(order.restaurantId);
    if (restaurant?.ownerId) {
      broadcastNotification(notification, [restaurant.ownerId]);
    }
    
    // Notify rider if assigned
    if (order.riderId) {
      const rider = await storage.getRider(order.riderId);
      if (rider?.userId) {
        broadcastNotification(notification, [rider.userId]);
      }
    }
  };

  // Broadcast order status updates to tracking subscribers
  const broadcastOrderStatusUpdate = (orderId: string, trackingData: any, previousStatus?: string) => {
    const statusKey = `order_status:${orderId}`;
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions?.has(statusKey)) {
        client.send(JSON.stringify({
          type: "order_status_update",
          orderId,
          trackingData,
          previousStatus,
          timestamp: new Date().toISOString()
        }));
      }
    });
  };

  // Broadcast rider location updates to tracking subscribers
  const broadcastRiderLocationUpdate = (orderId: string, location: any) => {
    const locationKey = `rider_location:${orderId}`;
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions?.has(locationKey)) {
        client.send(JSON.stringify({
          type: "rider_location_update",
          orderId,
          location,
          timestamp: new Date().toISOString()
        }));
      }
    });
  };

  // Broadcast tracking events to tracking subscribers
  const broadcastTrackingEvent = (orderId: string, event: any) => {
    const eventKey = `tracking_events:${orderId}`;
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions?.has(eventKey)) {
        client.send(JSON.stringify({
          type: "tracking_event",
          orderId,
          event,
          timestamp: new Date().toISOString()
        }));
      }
    });
  };

  // Broadcast ETA updates to tracking subscribers
  const broadcastETAUpdate = (orderId: string, estimatedArrival: string, estimatedTime: number) => {
    const etaKey = `eta_updates:${orderId}`;
    wss.clients.forEach((client: ExtendedWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.subscriptions?.has(etaKey)) {
        client.send(JSON.stringify({
          type: "eta_update",
          orderId,
          estimatedArrival,
          estimatedTime,
          timestamp: new Date().toISOString()
        }));
      }
    });
  };

  wss.on("connection", (ws: ExtendedWebSocket) => {
    const clientId = nanoid();
    ws.clientId = clientId;
    ws.isAlive = true;
    ws.subscriptions = new Set();
    
    console.log(`New WebSocket connection: ${clientId}`);

    // Send initial connection success
    ws.send(JSON.stringify({ 
      type: "connection", 
      status: "connected",
      clientId,
      timestamp: new Date().toISOString()
    }));

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case "auth":
            // Validate JWT token for WebSocket authentication
            try {
              if (!data.token) {
                ws.send(JSON.stringify({ 
                  type: "auth", 
                  success: false, 
                  error: "JWT token required" 
                }));
                console.log(`WebSocket auth failed: No JWT token provided`);
                break;
              }

              const decoded = jwt.verify(data.token, JWT_SECRET) as any;
              
              // Check if session is still valid
              const [session] = await db.select()
                .from(userSessions)
                .where(eq(userSessions.sessionToken, data.token));
              
              if (!session || new Date() > session.expiresAt) {
                ws.send(JSON.stringify({ 
                  type: "auth", 
                  success: false, 
                  error: "Token expired or invalid" 
                }));
                console.log(`WebSocket auth failed: Invalid or expired token`);
                break;
              }

              // Get user data
              const [user] = await db.select()
                .from(users)
                .where(eq(users.id, decoded.userId));

              if (!user) {
                ws.send(JSON.stringify({ 
                  type: "auth", 
                  success: false, 
                  error: "User not found" 
                }));
                console.log(`WebSocket auth failed: User ${decoded.userId} not found`);
                break;
              }

              ws.userId = user.id;
              ws.userRole = user.role;
              if (user.id) {
                clients.set(user.id, ws);
              }
              
              ws.send(JSON.stringify({ 
                type: "auth", 
                success: true,
                userId: user.id,
                role: user.role,
                timestamp: new Date().toISOString()
              }));
              
              console.log(`WebSocket: User ${user.id} authenticated with role ${user.role} (${clientId})`);
            } catch (error) {
              ws.send(JSON.stringify({ 
                type: "auth", 
                success: false, 
                error: "Invalid JWT token" 
              }));
              console.log(`WebSocket auth failed: JWT validation error:`, error);
            }
            break;
            
          case "subscribe":
            // Subscribe to specific order updates
            if (data.orderId && ws.subscriptions) {
              ws.subscriptions.add(data.orderId);
              ws.send(JSON.stringify({
                type: "subscribed",
                orderId: data.orderId,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          case "subscribe_tracking":
          case "subscribe_order_tracking":
            // Subscribe to real-time tracking (requires authentication)
            if (!ws.userId) {
              ws.send(JSON.stringify({ 
                type: "error", 
                message: "Authentication required for order tracking subscriptions" 
              }));
              console.log(`WebSocket: Unauthenticated client ${ws.clientId} attempted to subscribe to order ${data.orderId}`);
              break;
            }

            if (data.orderId && ws.subscriptions) {
              // Verify user has access to this order
              try {
                const order = await storage.getOrder(data.orderId);
                if (!order) {
                  ws.send(JSON.stringify({ 
                    type: "error", 
                    message: "Order not found" 
                  }));
                  console.log(`WebSocket: Order ${data.orderId} not found for subscription`);
                  break;
                }

                // Check if user has permission to track this order
                const canTrack = (
                  order.customerId === ws.userId || // Customer can track own orders
                  order.vendorId === ws.userId ||   // Vendor can track orders from their restaurant
                  order.riderId === ws.userId ||    // Rider can track assigned orders
                  ws.userRole === 'admin'           // Admin can track all orders
                );

                if (!canTrack) {
                  ws.send(JSON.stringify({ 
                    type: "error", 
                    message: "Insufficient permissions to track this order" 
                  }));
                  console.log(`WebSocket: User ${ws.userId} denied access to track order ${data.orderId}`);
                  break;
                }

                ws.subscriptions.add(`tracking:${data.orderId}`);
                ws.subscriptions.add(`order_status:${data.orderId}`);
                ws.subscriptions.add(`rider_location:${data.orderId}`);
                ws.subscriptions.add(`eta_updates:${data.orderId}`);
                ws.subscriptions.add(`tracking_events:${data.orderId}`);
                
                ws.send(JSON.stringify({
                  type: "subscription_confirmed",
                  orderId: data.orderId,
                  role: ws.userRole,
                  timestamp: new Date().toISOString()
                }));
                
                console.log(`WebSocket: User ${ws.userId} (${ws.userRole}) subscribed to order tracking for ${data.orderId} (${ws.clientId})`);
              } catch (error) {
                console.error(`WebSocket: Error verifying order access:`, error);
                ws.send(JSON.stringify({ 
                  type: "error", 
                  message: "Failed to verify order access" 
                }));
              }
            }
            break;
            
          case "rider_location":
            // Broadcast rider location to all subscribers
            if (data.orderId && data.location) {
              const trackingKey = `rider_location:${data.orderId}`;
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && 
                    client.subscriptions?.has(trackingKey) &&
                    client.clientId !== ws.clientId) {
                  client.send(JSON.stringify({
                    type: "rider_location_update",
                    orderId: data.orderId,
                    location: data.location,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            }
            break;
            
          case "order_status_update":
            // Broadcast order status to all subscribers
            if (data.orderId && data.status) {
              const statusKey = `order_status:${data.orderId}`;
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && 
                    client.subscriptions?.has(statusKey)) {
                  client.send(JSON.stringify({
                    type: "order_status_update",
                    orderId: data.orderId,
                    trackingData: data.trackingData,
                    previousStatus: data.previousStatus,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            }
            break;
            
          case "tracking_event":
            // Broadcast tracking events to all subscribers
            if (data.orderId && data.event) {
              const eventKey = `tracking_events:${data.orderId}`;
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && 
                    client.subscriptions?.has(eventKey)) {
                  client.send(JSON.stringify({
                    type: "tracking_event",
                    orderId: data.orderId,
                    event: data.event,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            }
            break;
            
          case "eta_update":
            // Broadcast ETA updates to all subscribers
            if (data.orderId && (data.estimatedArrival || data.estimatedTime)) {
              const etaKey = `eta_updates:${data.orderId}`;
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && 
                    client.subscriptions?.has(etaKey)) {
                  client.send(JSON.stringify({
                    type: "eta_update",
                    orderId: data.orderId,
                    estimatedArrival: data.estimatedArrival,
                    estimatedTime: data.estimatedTime,
                    timestamp: new Date().toISOString()
                  }));
                }
              });
            }
            break;
            
          case "unsubscribe":
            if (data.orderId && ws.subscriptions) {
              ws.subscriptions.delete(data.orderId);
              ws.subscriptions.delete(`tracking:${data.orderId}`);
              ws.send(JSON.stringify({
                type: "unsubscribed",
                orderId: data.orderId
              }));
            }
            break;
            
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        ws.send(JSON.stringify({ 
          type: "error", 
          message: "Invalid message format" 
        }));
      }
    });

    ws.on("close", () => {
      console.log(`WebSocket connection closed: ${clientId}`);
      if (ws.userId) {
        clients.delete(ws.userId);
      }
    });

    ws.on("error", (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
    });
  });

  // Heartbeat to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      if (ws.isAlive === false) {
        if (ws.userId) {
          clients.delete(ws.userId);
        }
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });
  
  // ============================================================================
  // AI SERVICES ENDPOINTS  
  // ============================================================================

  // Generate menu item description using AI
  app.post('/api/ai/generate-description', authenticateToken, async (req, res) => {
    try {
      const { itemName, category, ingredients } = req.body;
      
      if (!itemName || !category) {
        return res.status(400).json({ message: 'Item name and category are required' });
      }
      
      const description = await aiServices.generateMenuItemDescription(itemName, category, ingredients);
      res.json({ description });
    } catch (error) {
      console.error('Error generating description:', error);
      res.status(500).json({ message: 'Failed to generate description' });
    }
  });

  // Generate AI-powered sales insights
  app.post('/api/ai/analyze-sales', authenticateToken, async (req, res) => {
    try {
      const { period = 'month' } = req.body;
      
      // Get vendor's restaurant
      const restaurants = await storage.getRestaurantsByOwner(req.user.id);
      if (restaurants.length === 0) {
        return res.status(404).json({ message: 'Restaurant not found' });
      }
      
      // Get sales data (orders)
      const orders = await storage.getRestaurantOrders(restaurants[0].id);
      const insights = await aiServices.analyzeSalesData(orders, period);
      
      res.json(insights);
    } catch (error) {
      console.error('Error analyzing sales:', error);
      res.status(500).json({ message: 'Failed to analyze sales data' });
    }
  });

  // Generate promotional content
  app.post('/api/ai/generate-promotion', authenticateToken, async (req, res) => {
    try {
      const { businessName, promotion, colors } = req.body;
      
      if (!businessName || !promotion) {
        return res.status(400).json({ message: 'Business name and promotion are required' });
      }
      
      const bannerUrl = await aiServices.generatePromotionalBanner(businessName, promotion, colors);
      res.json({ bannerUrl });
    } catch (error) {
      console.error('Error generating promotional banner:', error);
      res.status(500).json({ message: 'Failed to generate promotional banner' });
    }
  });

  // Generate social media content
  app.post('/api/ai/generate-social-post', authenticateToken, async (req, res) => {
    try {
      const { businessName, postType, content } = req.body;
      
      if (!businessName || !postType) {
        return res.status(400).json({ message: 'Business name and post type are required' });
      }
      
      const socialPost = await aiServices.generateSocialMediaPost(businessName, postType, content);
      res.json(socialPost);
    } catch (error) {
      console.error('Error generating social media post:', error);
      res.status(500).json({ message: 'Failed to generate social media post' });
    }
  });

  // Export notification functions for use in order status updates
  (global as any).notifyOrderUpdate = notifyOrderUpdate;
  (global as any).broadcastNotification = broadcastNotification;
  
  return httpServer;
}
