import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertRestaurantSchema, 
  insertMenuCategorySchema, 
  insertMenuItemSchema, 
  insertOrderSchema, 
  insertUserSchema,
  insertRiderLocationHistorySchema,
  insertRiderSessionSchema,
  insertOrderAssignmentSchema,
  insertDeliveryTrackingSchema,
  insertRiderPerformanceMetricsSchema,
  type RiderLocationHistory,
  type DeliveryTracking,
  type OrderAssignment
} from "@shared/schema";
import { z } from "zod";
import { nexusPayService, NEXUSPAY_CODES } from "./services/nexuspay";
import * as geminiAI from "./services/gemini";
import { nanoid } from "nanoid";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { gpsTrackingService } from "./gps-tracking";
import { generatePlatformImages, generateDishImages, generateCategoryImages } from "./generateImages";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  userRole?: string;
  isAlive?: boolean;
  clientId?: string;
  subscriptions?: Set<string>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
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
      broadcastToSubscribers('rider_location', {
        riderId: req.params.riderId,
        location: {
          lat: parseFloat(location.latitude),
          lng: parseFloat(location.longitude),
          timestamp: location.timestamp,
          speed: location.speed,
          heading: location.heading
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
      const sessionData = insertRiderSessionSchema.parse({
        riderId: req.params.riderId,
        ...req.body
      });
      const session = await storage.createRiderSession(sessionData);
      
      // Update rider online status
      await storage.updateRiderStatus(req.params.riderId, { isOnline: true });
      
      res.status(201).json(session);
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
      const assignmentData = insertOrderAssignmentSchema.parse({
        orderId: req.params.orderId,
        ...req.body
      });
      
      const assignment = await storage.createOrderAssignment(assignmentData);
      
      // Notify rider via WebSocket
      if (assignment.riderId) {
        broadcastToSubscribers('order_assignment', {
          riderId: assignment.riderId,
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
      const trackingData = insertDeliveryTrackingSchema.parse({
        orderId: req.params.orderId,
        ...req.body
      });
      
      const tracking = await storage.createDeliveryTracking(trackingData);
      
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
      // Mock rider profile for now
      const riderProfile = {
        id: "rider-1",
        name: "Juan Dela Cruz",
        vehicleType: "motorcycle",
        rating: 4.8,
        totalDeliveries: 523,
        earningsBalance: 2450.50,
        isOnline: false,
        isVerified: true
      };
      res.json(riderProfile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rider profile" });
    }
  });

  app.get("/api/rider/deliveries/active", async (req, res) => {
    try {
      // Return active deliveries for the rider
      const activeDeliveries: any[] = [];
      res.json(activeDeliveries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active deliveries" });
    }
  });

  app.get("/api/rider/deliveries/history", async (req, res) => {
    try {
      // Return delivery history
      const history: any[] = [];
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch delivery history" });
    }
  });

  app.patch("/api/rider/status", async (req, res) => {
    try {
      const { isOnline, currentLocation } = req.body;
      // Update rider status
      res.json({ success: true, isOnline });
    } catch (error) {
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
      // Return available deliveries in the area
      const mockDeliveries = [
        {
          id: "DEL-001",
          orderNumber: "ORD-5678",
          customer: {
            name: "Maria Santos",
            phone: "09171234567",
            address: "123 Main St, Batangas City",
            location: { lat: 13.7565, lng: 121.0583 }
          },
          restaurant: {
            name: "Lomi King",
            address: "456 Restaurant Row, Batangas",
            location: { lat: 13.7600, lng: 121.0600 }
          },
          items: 3,
          amount: 450,
          distance: 3.5,
          estimatedTime: 20,
          status: "assigned",
          priority: "high",
          tip: 50
        }
      ];
      res.json(mockDeliveries);
    } catch (error) {
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
      const earnings = {
        today: 1856.50,
        thisWeek: 8945.75,
        thisMonth: 35678.25,
        trips: 42,
        tips: 456.50,
        bonus: 250.00,
        completionRate: 95.5,
        acceptanceRate: 88.2
      };
      res.json(earnings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // Admin Routes
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = {
        totalUsers: 1543,
        activeRestaurants: 127,
        totalOrders: 8432,
        activeRiders: 89,
        onlineRiders: 34,
        revenueToday: 125430.50
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
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

  // ==================== VENDOR API ENDPOINTS ====================
  
  // Vendor Categories endpoints
  app.get("/api/vendor/categories", async (req, res) => {
    try {
      // In production, this would filter by vendor/restaurant ID from auth
      const categories = await storage.getMenuCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching vendor categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/vendor/categories", async (req, res) => {
    try {
      const categoryData = insertMenuCategorySchema.parse(req.body);
      const category = await storage.createMenuCategory(categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error creating vendor category:", error);
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  // Vendor Menu Items endpoints
  app.get("/api/vendor/menu-items", async (req, res) => {
    try {
      // In production, this would filter by vendor/restaurant ID from auth
      const menuItems = await storage.getMenuItems();
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching vendor menu items:", error);
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.post("/api/vendor/menu-items", async (req, res) => {
    try {
      const menuItemData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(menuItemData);
      res.json(menuItem);
    } catch (error) {
      console.error("Error creating vendor menu item:", error);
      res.status(400).json({ error: "Invalid menu item data" });
    }
  });

  // Vendor Orders endpoints
  app.get("/api/vendor/orders", async (req, res) => {
    try {
      // In production, this would filter by vendor/restaurant ID from auth
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching vendor orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.patch("/api/vendor/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const order = await storage.updateOrderStatus(parseInt(orderId), status);
      res.json(order);
    } catch (error) {
      console.error("Error updating vendor order:", error);
      res.status(400).json({ error: "Failed to update order" });
    }
  });

  // Vendor Restaurant endpoint
  app.get("/api/vendor/restaurant", async (req, res) => {
    try {
      // In production, this would get the restaurant from auth context
      const restaurants = await storage.getRestaurants();
      const restaurant = restaurants.length > 0 ? restaurants[0] : null;
      res.json(restaurant);
    } catch (error) {
      console.error("Error fetching vendor restaurant:", error);
      res.status(500).json({ error: "Failed to fetch restaurant" });
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

  // Admin Dashboard Endpoints
  app.get("/api/admin/stats", async (req, res) => {
    try {
      // Get various statistics for admin dashboard
      const restaurants = await storage.getRestaurants();
      const orders = await storage.getOrders();
      const riders = await storage.getRiders();
      
      // Calculate statistics
      const totalUsers = 15234; // Simplified for demo
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

      // Broadcast location update via WebSocket
      const locationUpdate = {
        type: "rider_location_update",
        riderId,
        location: { lat: parseFloat(latitude), lng: parseFloat(longitude) },
        timestamp: new Date().toISOString()
      };

      // Will be broadcast to subscribers via WebSocket
      if ((global as any).broadcastNotification) {
        (global as any).broadcastNotification(locationUpdate);
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

      // Broadcast tracking event via WebSocket
      const trackingUpdate = {
        type: "delivery_tracking_event",
        orderId,
        riderId,
        eventType,
        location,
        timestamp: new Date().toISOString()
      };

      if ((global as any).broadcastNotification) {
        (global as any).broadcastNotification(trackingUpdate);
      }

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

  // Get estimated arrival time
  app.post("/api/gps/eta", async (req, res) => {
    try {
      const { riderId, destination } = req.body;
      
      if (!riderId || !destination) {
        return res.status(400).json({ message: "Missing rider ID or destination" });
      }

      const eta = await gpsTrackingService.getEstimatedArrival(riderId, destination);
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

    ws.on("message", (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case "auth":
            ws.userId = data.userId;
            ws.userRole = data.role;
            if (data.userId) {
              clients.set(data.userId, ws);
            }
            
            ws.send(JSON.stringify({ 
              type: "auth", 
              success: true,
              userId: data.userId,
              role: data.role
            }));
            
            console.log(`User ${data.userId} authenticated with role ${data.role}`);
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
            // Subscribe to real-time tracking
            if (data.orderId && ws.subscriptions) {
              ws.subscriptions.add(`tracking:${data.orderId}`);
              ws.send(JSON.stringify({
                type: "subscription_confirmed",
                orderId: data.orderId,
                role: data.role,
                timestamp: new Date().toISOString()
              }));
            }
            break;
            
          case "rider_location":
            // Broadcast rider location to all subscribers
            if (data.orderId && data.location) {
              const trackingKey = `tracking:${data.orderId}`;
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && 
                    client.subscriptions?.has(trackingKey) &&
                    client.clientId !== ws.clientId) {
                  client.send(JSON.stringify({
                    type: "location_update",
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
              const trackingKey = `tracking:${data.orderId}`;
              wss.clients.forEach((client: ExtendedWebSocket) => {
                if (client.readyState === WebSocket.OPEN && 
                    client.subscriptions?.has(trackingKey)) {
                  client.send(JSON.stringify({
                    type: "order_update",
                    orderId: data.orderId,
                    status: data.status,
                    message: data.message,
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
  
  // Export notification functions for use in order status updates
  (global as any).notifyOrderUpdate = notifyOrderUpdate;
  (global as any).broadcastNotification = broadcastNotification;
  
  return httpServer;
}
