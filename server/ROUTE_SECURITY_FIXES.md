# Route Security Fixes - Implementation Guide

This guide shows the exact changes needed to protect all routes in `server/routes.ts`.

## Quick Reference: Route Protection Patterns

```typescript
// Public routes (no auth needed)
app.get("/api/config/public", ...)           // ✓ Public config
app.get("/api/restaurants", ...)             // ✓ Public listing
app.get("/api/restaurants/:id", ...)         // ✓ Public detail
app.get("/api/search/restaurants", ...)      // ✓ Public search
app.post("/api/auth/register", ...)          // ✓ Registration
app.post("/api/auth/login", ...)             // ✓ Login
app.post("/api/auth/forgot-password", ...)   // ✓ Password reset
app.post("/api/payment/webhook", ...)        // ✓ Uses signature verification

// Customer routes (require customer auth)
app.get("/api/orders", authenticateToken, ...)      // With customerId filter
app.post("/api/orders", authenticateToken, ...)
app.get("/api/orders/:id", authenticateToken, ...)  // Must verify ownership

// Vendor routes (require vendor auth)
app.get("/api/vendor/*", authenticateToken, requireRole(['vendor', 'admin']), ...)

// Rider routes (require rider auth)
app.get("/api/riders/:riderId/*", authenticateToken, requireRole(['rider', 'admin']), ...)
app.post("/api/riders/:riderId/location", authenticateToken, requireRole(['rider']), ...)

// Admin routes (require admin auth)
app.get("/api/admin/*", authenticateToken, requireAdmin, ...)
```

---

## CRITICAL FIXES NEEDED

### 1. Order Routes - Add Authentication

**Current (VULNERABLE):**
```typescript
app.get("/api/orders", async (req, res) => { ... });
app.get("/api/orders/:id", async (req, res) => { ... });
app.post("/api/orders", async (req, res) => { ... });
app.patch("/api/orders/:id/status", async (req, res) => { ... });
```

**Fixed:**
```typescript
// Get orders - require auth and filter by user
app.get("/api/orders", authenticateToken, async (req: any, res) => {
  try {
    const { customerId, restaurantId } = req.query;
    let orders;
    
    // Admin can see all orders
    if (req.user.role === 'admin') {
      if (customerId) {
        orders = await storage.getOrdersByCustomer(customerId as string);
      } else if (restaurantId) {
        orders = await storage.getOrdersByRestaurant(restaurantId as string);
      } else {
        orders = await storage.getOrders();
      }
    } 
    // Customers can only see their own orders
    else if (req.user.role === 'customer') {
      orders = await storage.getOrdersByCustomer(req.user.id);
    }
    // Vendors can see their restaurant's orders
    else if (req.user.role === 'vendor') {
      const vendorRestaurants = await storage.getRestaurantsByOwner(req.user.id);
      orders = [];
      for (const restaurant of vendorRestaurants) {
        const restaurantOrders = await storage.getOrdersByRestaurant(restaurant.id);
        orders.push(...restaurantOrders);
      }
    }
    // Riders can see their assigned orders
    else if (req.user.role === 'rider') {
      orders = await storage.getOrdersByRider(req.user.id);
    }
    else {
      orders = [];
    }
    
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// Get single order - verify access
app.get("/api/orders/:id", authenticateToken, async (req: any, res) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check permission
    const hasAccess = 
      req.user.role === 'admin' ||
      order.customerId === req.user.id ||
      order.riderId === req.user.id;
    
    // Check if vendor for this restaurant
    if (!hasAccess && req.user.role === 'vendor') {
      const restaurant = await storage.getRestaurant(order.restaurantId);
      if (restaurant?.ownerId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

// Create order - require auth
app.post("/api/orders", authenticateToken, async (req: any, res) => {
  try {
    const orderData = insertOrderSchema.parse({
      ...req.body,
      customerId: req.user.id // Force the customerId to be the authenticated user
    });
    // ... rest of order creation
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({ message: "Invalid order data" });
  }
});

// Update order status - require auth and verify permission
app.patch("/api/orders/:id/status", authenticateToken, async (req: any, res) => {
  try {
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Check permission based on status change
    const { status } = req.body;
    let authorized = false;
    
    // Admin can do anything
    if (req.user.role === 'admin') {
      authorized = true;
    }
    // Vendor can confirm, prepare, mark ready
    else if (req.user.role === 'vendor' && ['confirmed', 'preparing', 'ready'].includes(status)) {
      const restaurant = await storage.getRestaurant(order.restaurantId);
      authorized = restaurant?.ownerId === req.user.id;
    }
    // Rider can mark picked_up, in_transit, delivered
    else if (req.user.role === 'rider' && ['picked_up', 'in_transit', 'delivered'].includes(status)) {
      authorized = order.riderId === req.user.id;
    }
    // Customer can only cancel pending orders
    else if (req.user.role === 'customer' && status === 'cancelled') {
      authorized = order.customerId === req.user.id && order.status === 'pending';
    }
    
    if (!authorized) {
      return res.status(403).json({ message: "Not authorized for this status change" });
    }
    
    // ... continue with status update
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});
```

---

### 2. Rider Routes - Add Authentication and Role Check

**Current (VULNERABLE):**
```typescript
app.get("/api/riders", async (req, res) => { ... });
app.post("/api/riders/:riderId/location", async (req, res) => { ... });
app.post("/api/riders/:riderId/session/start", async (req, res) => { ... });
```

**Fixed:**
```typescript
// Get riders - admin only
app.get("/api/riders", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const riders = await storage.getRiders();
    res.json(riders);
  } catch (error) {
    console.error("Error fetching riders:", error);
    res.status(500).json({ message: "Failed to fetch riders" });
  }
});

// Update rider location - rider only (self)
app.post("/api/riders/:riderId/location", authenticateToken, requireRole(['rider']), async (req: any, res) => {
  try {
    // Verify rider is updating their own location
    const rider = await storage.getRiderByUserId(req.user.id);
    if (!rider || rider.id !== req.params.riderId) {
      return res.status(403).json({ message: "Cannot update another rider's location" });
    }
    
    const locationData = insertRiderLocationHistorySchema.parse({
      riderId: req.params.riderId,
      ...req.body
    });
    const location = await storage.createRiderLocationHistory(locationData);
    // ... broadcast, etc
    res.status(201).json(location);
  } catch (error) {
    console.error("Error updating rider location:", error);
    res.status(400).json({ message: "Invalid location data" });
  }
});

// Start rider session - rider only (self)
app.post("/api/riders/:riderId/session/start", authenticateToken, requireRole(['rider']), async (req: any, res) => {
  try {
    const rider = await storage.getRiderByUserId(req.user.id);
    if (!rider || rider.id !== req.params.riderId) {
      return res.status(403).json({ message: "Cannot start another rider's session" });
    }
    
    await storage.updateRiderStatus(req.params.riderId, { isOnline: true });
    res.status(201).json({ riderId: req.params.riderId, startTime: new Date(), status: 'active' });
  } catch (error) {
    console.error("Error starting rider session:", error);
    res.status(400).json({ message: "Invalid session data" });
  }
});
```

---

### 3. Admin Routes - Add Admin Role Check

**Current (VULNERABLE):**
```typescript
app.get("/api/admin/riders/online", async (req, res) => { ... });
```

**Fixed:**
```typescript
app.get("/api/admin/riders/online", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const onlineRiders = await storage.getOnlineRiders();
    res.json(onlineRiders);
  } catch (error) {
    console.error("Error fetching online riders:", error);
    res.status(500).json({ message: "Failed to fetch online riders" });
  }
});
```

---

### 4. Assignment Routes - Add Authentication

**Current (VULNERABLE):**
```typescript
app.post("/api/orders/:orderId/assign", async (req, res) => { ... });
app.patch("/api/assignments/:assignmentId/respond", async (req, res) => { ... });
```

**Fixed:**
```typescript
// Create order assignment - admin or system only
app.post("/api/orders/:orderId/assign", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const assignmentData = insertRiderAssignmentQueueSchema.parse({
      orderId: req.params.orderId,
      ...req.body
    });
    const assignment = await storage.createRiderAssignment(assignmentData);
    // ... notify rider
    res.status(201).json(assignment);
  } catch (error) {
    console.error("Error creating order assignment:", error);
    res.status(400).json({ message: "Invalid assignment data" });
  }
});

// Respond to assignment - rider only (assigned rider)
app.patch("/api/assignments/:assignmentId/respond", authenticateToken, requireRole(['rider']), async (req: any, res) => {
  try {
    const assignment = await storage.getRiderAssignment(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    
    // Verify this rider is the assigned rider
    const rider = await storage.getRiderByUserId(req.user.id);
    if (!rider || assignment.assignedRiderId !== rider.id) {
      return res.status(403).json({ message: "This assignment is not for you" });
    }
    
    const { status, rejectionReason } = req.body;
    const updated = await storage.updateRiderAssignmentStatus(
      req.params.assignmentId,
      status,
      rejectionReason
    );
    res.json(updated);
  } catch (error) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ message: "Failed to update assignment" });
  }
});
```

---

## Helper: Add to routes.ts imports

Make sure these are imported at the top of routes.ts:

```typescript
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
  requireAdmin,
  requireAdminOrVendor,
  requireAdminOrRider,
  auditLog
} from './middleware/auth';
```

---

## Testing Checklist

After implementing fixes, test:

- [ ] Unauthenticated request to `/api/orders` returns 401
- [ ] Customer can only see their own orders
- [ ] Vendor can only see their restaurant's orders
- [ ] Rider can only update their own location
- [ ] Admin endpoints require admin role
- [ ] Order status changes are properly authorized
- [ ] Webhook signature verification blocks unsigned webhooks in production
