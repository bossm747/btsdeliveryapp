import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRestaurantSchema, insertMenuCategorySchema, insertMenuItemSchema, insertOrderSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { nexusPayService, NEXUSPAY_CODES } from "./services/nexuspay";
import * as geminiAI from "./services/gemini";

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

  const httpServer = createServer(app);
  return httpServer;
}
