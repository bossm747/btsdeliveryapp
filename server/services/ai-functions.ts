import { storage } from "../storage";
import { generateMenuItemDescription, generateMenuItemImage } from "../ai-services";

// ============================================================================
// AI Assistant Function Definitions & Execution
// ============================================================================

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  roles: ("customer" | "rider" | "vendor" | "admin")[];
}

// ============================================================================
// CUSTOMER FUNCTIONS
// ============================================================================

const customerFunctions: FunctionDefinition[] = [
  {
    name: "browse_restaurants",
    description: "Browse available restaurants. Can filter by location/city in Batangas.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City or municipality in Batangas (e.g., 'Batangas City', 'Lipa', 'Tanauan')"
        },
        limit: {
          type: "number",
          description: "Maximum number of restaurants to return (default 10)"
        }
      }
    },
    roles: ["customer", "admin"]
  },
  {
    name: "get_restaurant_menu",
    description: "Get the full menu of a restaurant including categories and items with prices.",
    parameters: {
      type: "object",
      properties: {
        restaurantId: {
          type: "string",
          description: "The restaurant ID"
        },
        restaurantName: {
          type: "string",
          description: "The restaurant name (used to search if ID not provided)"
        }
      }
    },
    roles: ["customer", "vendor", "admin"]
  },
  {
    name: "search_menu_items",
    description: "Search for specific food items across all restaurants.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term (e.g., 'Bulalo', 'Lomi', 'Chicken')"
        },
        category: {
          type: "string",
          description: "Filter by category (e.g., 'Main Course', 'Appetizers', 'Beverages')"
        }
      },
      required: ["query"]
    },
    roles: ["customer", "admin"]
  },
  {
    name: "create_order",
    description: "Create a new food order for the customer. IMPORTANT: Confirm all details with customer before calling.",
    parameters: {
      type: "object",
      properties: {
        restaurantId: {
          type: "string",
          description: "The restaurant ID to order from"
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              menuItemId: { type: "string" },
              quantity: { type: "number" },
              specialInstructions: { type: "string" }
            }
          },
          description: "Array of items to order with quantities"
        },
        deliveryAddress: {
          type: "string",
          description: "Full delivery address"
        },
        deliveryLat: {
          type: "number",
          description: "Delivery latitude"
        },
        deliveryLng: {
          type: "number",
          description: "Delivery longitude"
        },
        paymentMethod: {
          type: "string",
          enum: ["cod", "gcash", "maya", "wallet"],
          description: "Payment method"
        },
        orderType: {
          type: "string",
          enum: ["delivery", "pickup"],
          description: "Delivery or pickup"
        },
        specialInstructions: {
          type: "string",
          description: "Special instructions for the order"
        }
      },
      required: ["restaurantId", "items", "paymentMethod", "orderType"]
    },
    roles: ["customer"]
  },
  {
    name: "get_order_status",
    description: "Get the current status and details of an order.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The order ID or order number (e.g., BTS-2026-123456)"
        }
      },
      required: ["orderId"]
    },
    roles: ["customer", "rider", "vendor", "admin"]
  },
  {
    name: "get_customer_orders",
    description: "Get the order history for the customer.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of orders to return (default 10)"
        },
        status: {
          type: "string",
          enum: ["pending", "confirmed", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled"],
          description: "Filter by order status"
        }
      }
    },
    roles: ["customer"]
  },
  {
    name: "cancel_order",
    description: "Cancel an order. Only works for orders that haven't been picked up yet.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The order ID to cancel"
        },
        reason: {
          type: "string",
          description: "Reason for cancellation"
        }
      },
      required: ["orderId", "reason"]
    },
    roles: ["customer", "admin"]
  },
  {
    name: "apply_promo_code",
    description: "Check if a promo code is valid and get discount details.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "The promo code to apply"
        },
        orderTotal: {
          type: "number",
          description: "The order subtotal to calculate discount"
        }
      },
      required: ["code"]
    },
    roles: ["customer"]
  },
  {
    name: "get_saved_addresses",
    description: "Get the customer's saved delivery addresses.",
    parameters: {
      type: "object",
      properties: {}
    },
    roles: ["customer"]
  }
];

// ============================================================================
// RIDER FUNCTIONS
// ============================================================================

const riderFunctions: FunctionDefinition[] = [
  {
    name: "get_rider_assignments",
    description: "Get the rider's current and pending delivery assignments.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "accepted", "picked_up", "on_the_way"],
          description: "Filter by assignment status"
        }
      }
    },
    roles: ["rider"]
  },
  {
    name: "get_delivery_details",
    description: "Get complete details for a delivery including restaurant address, customer address, items, and special instructions.",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The order ID to get details for"
        }
      },
      required: ["orderId"]
    },
    roles: ["rider", "admin"]
  },
  {
    name: "update_delivery_status",
    description: "Update the status of a delivery (e.g., picked up, on the way, delivered).",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The order ID"
        },
        status: {
          type: "string",
          enum: ["picked_up", "on_the_way", "delivered"],
          description: "New delivery status"
        },
        notes: {
          type: "string",
          description: "Optional notes about the delivery"
        }
      },
      required: ["orderId", "status"]
    },
    roles: ["rider"]
  },
  {
    name: "get_rider_earnings",
    description: "Get the rider's earnings summary.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month"],
          description: "Time period for earnings"
        }
      }
    },
    roles: ["rider"]
  },
  {
    name: "update_rider_availability",
    description: "Update rider's online/offline status.",
    parameters: {
      type: "object",
      properties: {
        isOnline: {
          type: "boolean",
          description: "Whether rider is available for deliveries"
        }
      },
      required: ["isOnline"]
    },
    roles: ["rider"]
  },
  {
    name: "get_route_info",
    description: "Get navigation info between two points (restaurant to customer).",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "Order ID to get route for"
        }
      },
      required: ["orderId"]
    },
    roles: ["rider"]
  }
];

// ============================================================================
// VENDOR FUNCTIONS
// ============================================================================

const vendorFunctions: FunctionDefinition[] = [
  {
    name: "get_vendor_orders",
    description: "Get orders for the vendor's restaurant.",
    parameters: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["pending", "confirmed", "preparing", "ready", "picked_up", "delivered", "cancelled"],
          description: "Filter by order status"
        },
        limit: {
          type: "number",
          description: "Maximum number of orders (default 20)"
        }
      }
    },
    roles: ["vendor"]
  },
  {
    name: "update_order_status_vendor",
    description: "Update order status from vendor perspective (confirm, start preparing, mark ready).",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "The order ID"
        },
        status: {
          type: "string",
          enum: ["confirmed", "preparing", "ready"],
          description: "New order status"
        },
        prepTime: {
          type: "number",
          description: "Estimated preparation time in minutes"
        }
      },
      required: ["orderId", "status"]
    },
    roles: ["vendor"]
  },
  {
    name: "create_menu_item",
    description: "Create a new menu item for the restaurant. Can auto-generate description and image.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the menu item"
        },
        categoryId: {
          type: "string",
          description: "Category ID to add item to"
        },
        price: {
          type: "number",
          description: "Price in PHP"
        },
        description: {
          type: "string",
          description: "Description (optional - can be AI generated)"
        },
        generateDescription: {
          type: "boolean",
          description: "Whether to auto-generate an appetizing description"
        },
        generateImage: {
          type: "boolean",
          description: "Whether to auto-generate a food image"
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "List of ingredients (helps with description generation)"
        },
        isAvailable: {
          type: "boolean",
          description: "Whether item is available (default true)"
        },
        stockQuantity: {
          type: "number",
          description: "Initial stock quantity"
        }
      },
      required: ["name", "price"]
    },
    roles: ["vendor"]
  },
  {
    name: "update_menu_item",
    description: "Update an existing menu item (price, availability, description, etc.).",
    parameters: {
      type: "object",
      properties: {
        menuItemId: {
          type: "string",
          description: "The menu item ID to update"
        },
        name: { type: "string" },
        price: { type: "number" },
        description: { type: "string" },
        isAvailable: { type: "boolean" },
        stockQuantity: { type: "number" },
        regenerateDescription: { type: "boolean" },
        regenerateImage: { type: "boolean" }
      },
      required: ["menuItemId"]
    },
    roles: ["vendor"]
  },
  {
    name: "create_menu_category",
    description: "Create a new menu category.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Category name (e.g., 'Main Course', 'Appetizers', 'Beverages')"
        },
        description: {
          type: "string",
          description: "Category description"
        },
        displayOrder: {
          type: "number",
          description: "Order to display in menu (lower = first)"
        }
      },
      required: ["name"]
    },
    roles: ["vendor"]
  },
  {
    name: "get_menu_categories",
    description: "Get all menu categories for the restaurant.",
    parameters: {
      type: "object",
      properties: {}
    },
    roles: ["vendor"]
  },
  {
    name: "get_vendor_analytics",
    description: "Get sales analytics and insights for the restaurant.",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "this_week", "this_month", "last_30_days"],
          description: "Time period for analytics"
        }
      }
    },
    roles: ["vendor"]
  },
  {
    name: "update_item_availability",
    description: "Quickly toggle item availability or update stock.",
    parameters: {
      type: "object",
      properties: {
        menuItemId: {
          type: "string",
          description: "Menu item ID"
        },
        isAvailable: {
          type: "boolean",
          description: "Whether item is available"
        },
        stockQuantity: {
          type: "number",
          description: "New stock quantity"
        }
      },
      required: ["menuItemId"]
    },
    roles: ["vendor"]
  },
  {
    name: "create_promotion",
    description: "Create a promotional offer for the restaurant.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Promotion title"
        },
        description: {
          type: "string",
          description: "Promotion description"
        },
        discountType: {
          type: "string",
          enum: ["percentage", "fixed"],
          description: "Type of discount"
        },
        discountValue: {
          type: "number",
          description: "Discount amount (percentage or fixed PHP)"
        },
        minimumOrder: {
          type: "number",
          description: "Minimum order amount to qualify"
        },
        startDate: {
          type: "string",
          description: "Start date (ISO format)"
        },
        endDate: {
          type: "string",
          description: "End date (ISO format)"
        }
      },
      required: ["title", "discountType", "discountValue"]
    },
    roles: ["vendor"]
  },
  {
    name: "generate_menu_content",
    description: "Generate AI content for menu items (descriptions, images, promotional text).",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["description", "image", "promo_text"],
          description: "Type of content to generate"
        },
        itemName: {
          type: "string",
          description: "Name of the menu item"
        },
        category: {
          type: "string",
          description: "Item category"
        },
        ingredients: {
          type: "array",
          items: { type: "string" },
          description: "Ingredients list"
        },
        style: {
          type: "string",
          description: "Style preference for content"
        }
      },
      required: ["type", "itemName"]
    },
    roles: ["vendor"]
  }
];

// ============================================================================
// COMBINE ALL FUNCTIONS
// ============================================================================

export const allFunctions: FunctionDefinition[] = [
  ...customerFunctions,
  ...riderFunctions,
  ...vendorFunctions
];

// Get functions available for a specific role
export function getFunctionsForRole(role: string): FunctionDefinition[] {
  return allFunctions.filter(fn => fn.roles.includes(role as any));
}

// Convert to OpenAI function format
export function getOpenAIFunctions(role: string): any[] {
  return getFunctionsForRole(role).map(fn => ({
    type: "function",
    function: {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters
    }
  }));
}

// ============================================================================
// FUNCTION EXECUTION
// ============================================================================

export interface FunctionContext {
  userId: string;
  userRole: "customer" | "rider" | "vendor" | "admin";
  restaurantId?: string; // For vendors
  riderId?: string; // For riders
}

export async function executeFunction(
  functionName: string,
  args: Record<string, any>,
  context: FunctionContext
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    switch (functionName) {
      // ==================== CUSTOMER FUNCTIONS ====================
      case "browse_restaurants": {
        let restaurants;
        if (args.city) {
          restaurants = await storage.getRestaurantsByLocation(args.city);
        } else {
          restaurants = await storage.getRestaurants();
        }
        const limit = args.limit || 10;
        return {
          success: true,
          data: restaurants.slice(0, limit).map((r: any) => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine,
            rating: r.rating,
            address: r.address,
            city: r.city,
            isOpen: r.isOpen,
            deliveryFee: r.deliveryFee,
            minOrder: r.minOrder,
            estimatedDeliveryTime: r.estimatedDeliveryTime
          }))
        };
      }

      case "get_restaurant_menu": {
        let restaurantId = args.restaurantId;

        if (!restaurantId && args.restaurantName) {
          const restaurants = await storage.getRestaurants();
          const found = restaurants.find((r: any) =>
            r.name.toLowerCase().includes(args.restaurantName.toLowerCase())
          );
          if (found) restaurantId = found.id;
        }

        if (!restaurantId) {
          return { success: false, error: "Restaurant not found" };
        }

        const restaurant = await storage.getRestaurant(restaurantId);
        const categories = await storage.getMenuCategories(restaurantId);
        const items = await storage.getMenuItems(restaurantId);

        return {
          success: true,
          data: {
            restaurant: {
              id: restaurant?.id,
              name: restaurant?.name,
              category: restaurant?.category
            },
            categories: categories.map((c: any) => ({
              id: c.id,
              name: c.name,
              items: items
                .filter((i: any) => i.categoryId === c.id && i.isAvailable)
                .map((i: any) => ({
                  id: i.id,
                  name: i.name,
                  description: i.description,
                  price: i.price,
                  image: i.image,
                  isAvailable: i.isAvailable
                }))
            }))
          }
        };
      }

      case "search_menu_items": {
        const restaurants = await storage.getRestaurants();
        const results: any[] = [];

        for (const restaurant of restaurants.slice(0, 20)) {
          const items = await storage.getMenuItems(restaurant.id);
          const matching = items.filter((item: any) => {
            const matchesQuery = item.name.toLowerCase().includes(args.query.toLowerCase()) ||
                                 (item.description && item.description.toLowerCase().includes(args.query.toLowerCase()));
            const matchesCategory = !args.category ||
                                    (item.categoryName && item.categoryName.toLowerCase().includes(args.category.toLowerCase()));
            return matchesQuery && matchesCategory && item.isAvailable;
          });

          for (const item of matching) {
            results.push({
              restaurantId: restaurant.id,
              restaurantName: restaurant.name,
              itemId: item.id,
              itemName: item.name,
              description: item.description,
              price: item.price
            });
          }
        }

        return { success: true, data: results.slice(0, 20) };
      }

      case "create_order": {
        // Validate items first
        const validation = await storage.validateOrderItems(args.restaurantId, args.items);
        if (!validation.isValid) {
          return { success: false, error: `Order validation failed: ${validation.errors.join(", ")}` };
        }

        // Calculate totals
        const menuItems = await storage.getMenuItems(args.restaurantId);
        let subtotal = 0;
        const orderItems = args.items.map((item: any) => {
          const menuItem = menuItems.find((m: any) => m.id === item.menuItemId);
          const itemPrice = menuItem ? parseFloat(String(menuItem.price)) : 0;
          const itemTotal = itemPrice * item.quantity;
          subtotal += itemTotal;
          return {
            menuItemId: item.menuItemId,
            name: menuItem?.name,
            quantity: item.quantity,
            price: itemPrice,
            total: itemTotal,
            specialInstructions: item.specialInstructions
          };
        });

        const deliveryFee = args.orderType === "pickup" ? 0 : 50; // Default delivery fee
        const total = subtotal + deliveryFee;

        const orderNumber = `BTS-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

        const order = await storage.createOrder({
          customerId: context.userId,
          restaurantId: args.restaurantId,
          orderNumber,
          orderType: args.orderType === "pickup" ? "pickup" : "food",
          items: orderItems,
          subtotal: String(subtotal),
          deliveryFee: String(deliveryFee),
          totalAmount: String(total),
          status: "pending",
          paymentMethod: args.paymentMethod || "cash",
          paymentStatus: "pending",
          deliveryAddress: args.deliveryAddress || {}
        });

        // Reserve inventory
        await storage.reserveInventory(args.restaurantId, args.items);

        return {
          success: true,
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.totalAmount,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            message: `Order ${order.orderNumber} created successfully!`
          }
        };
      }

      case "get_order_status": {
        let order;
        if (args.orderId.startsWith("BTS-")) {
          // Search by order number
          const orders = await storage.getOrders();
          order = orders.find((o: any) => o.orderNumber === args.orderId);
        } else {
          order = await storage.getOrder(args.orderId);
        }

        if (!order) {
          return { success: false, error: "Order not found" };
        }

        const restaurant = await storage.getRestaurant(order.restaurantId);

        return {
          success: true,
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            restaurant: restaurant?.name,
            items: order.items,
            total: order.totalAmount,
            deliveryAddress: order.deliveryAddress,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
            createdAt: order.createdAt,
            riderAssigned: order.riderId ? true : false
          }
        };
      }

      case "get_customer_orders": {
        let orders = await storage.getOrdersByCustomer(context.userId);

        if (args.status) {
          orders = orders.filter((o: any) => o.status === args.status);
        }

        const limit = args.limit || 10;

        return {
          success: true,
          data: orders.slice(0, limit).map((o: any) => ({
            orderId: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            total: o.totalAmount,
            createdAt: o.createdAt,
            items: Array.isArray(o.items) ? o.items.length : 0
          }))
        };
      }

      case "cancel_order": {
        const order = await storage.getOrder(args.orderId);
        if (!order) {
          return { success: false, error: "Order not found" };
        }

        // Check if order can be cancelled
        const cancellableStatuses = ["pending", "confirmed", "preparing"];
        if (!cancellableStatuses.includes(order.status)) {
          return { success: false, error: `Cannot cancel order with status: ${order.status}` };
        }

        // Check ownership
        if (order.customerId !== context.userId && context.userRole !== "admin") {
          return { success: false, error: "Not authorized to cancel this order" };
        }

        await storage.cancelOrder(args.orderId, args.reason, context.userId);

        return {
          success: true,
          data: { message: "Order cancelled successfully", orderId: args.orderId }
        };
      }

      case "apply_promo_code": {
        const promo = await storage.getPromoCodeByCode(args.code);

        if (!promo) {
          return { success: false, error: "Promo code not found" };
        }

        if (!promo.isActive) {
          return { success: false, error: "Promo code is no longer active" };
        }

        if (promo.endDate && new Date(promo.endDate) < new Date()) {
          return { success: false, error: "Promo code has expired" };
        }

        let discount = 0;
        const minOrder = promo.minOrderAmount ? parseFloat(String(promo.minOrderAmount)) : 0;
        const discountValue = promo.discountValue ? parseFloat(String(promo.discountValue)) : 0;
        const maxDiscountAmt = promo.maxDiscount ? parseFloat(String(promo.maxDiscount)) : 0;

        if (args.orderTotal) {
          if (minOrder > 0 && args.orderTotal < minOrder) {
            return {
              success: false,
              error: `Minimum order of ₱${minOrder} required`
            };
          }

          if (promo.discountType === "percentage") {
            discount = (args.orderTotal * discountValue) / 100;
            if (maxDiscountAmt > 0 && discount > maxDiscountAmt) {
              discount = maxDiscountAmt;
            }
          } else {
            discount = discountValue;
          }
        }

        return {
          success: true,
          data: {
            code: promo.code,
            discountType: promo.discountType,
            discountValue: discountValue,
            calculatedDiscount: discount,
            description: promo.description
          }
        };
      }

      case "get_saved_addresses": {
        const addresses = await storage.getUserAddresses(context.userId);
        return {
          success: true,
          data: addresses.map((a: any) => ({
            id: a.id,
            label: a.label,
            address: a.address,
            city: a.city,
            isDefault: a.isDefault,
            lat: a.lat,
            lng: a.lng
          }))
        };
      }

      // ==================== RIDER FUNCTIONS ====================
      case "get_rider_assignments": {
        if (!context.riderId) {
          const rider = await storage.getRiderByUserId(context.userId);
          if (!rider) return { success: false, error: "Rider profile not found" };
          context.riderId = rider.id;
        }

        let orders = await storage.getOrdersByRider(context.riderId);

        if (args.status) {
          orders = orders.filter((o: any) => o.status === args.status);
        }

        const result = [];
        for (const order of orders.slice(0, 10)) {
          const restaurant = await storage.getRestaurant(order.restaurantId);
          result.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            restaurant: restaurant?.name,
            restaurantAddress: restaurant?.address,
            deliveryAddress: order.deliveryAddress,
            total: order.totalAmount,
            items: Array.isArray(order.items) ? order.items.length : 0,
            createdAt: order.createdAt
          });
        }

        return { success: true, data: result };
      }

      case "get_delivery_details": {
        const order = await storage.getOrder(args.orderId);
        if (!order) {
          return { success: false, error: "Order not found" };
        }

        const restaurant = await storage.getRestaurant(order.restaurantId);
        const customer = await storage.getUser(order.customerId);
        const restaurantAddress = restaurant?.address as any;

        return {
          success: true,
          data: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            restaurant: {
              name: restaurant?.name,
              address: restaurant?.address,
              phone: restaurant?.phone,
              lat: restaurantAddress?.lat,
              lng: restaurantAddress?.lng
            },
            customer: {
              name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : null,
              phone: customer?.phone,
              deliveryAddress: order.deliveryAddress,
              lat: (order.deliveryAddress as any)?.lat,
              lng: (order.deliveryAddress as any)?.lng
            },
            items: order.items,
            total: order.totalAmount,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            specialInstructions: order.specialInstructions,
            contactlessDelivery: (order as any).contactlessDelivery
          }
        };
      }

      case "update_delivery_status": {
        const order = await storage.getOrder(args.orderId);
        if (!order) {
          return { success: false, error: "Order not found" };
        }

        // Map rider status to order status
        const statusMap: Record<string, string> = {
          "picked_up": "picked_up",
          "on_the_way": "on_the_way",
          "delivered": "delivered"
        };

        const newStatus = statusMap[args.status];
        if (!newStatus) {
          return { success: false, error: "Invalid status" };
        }

        await storage.updateOrderStatus(args.orderId, newStatus, context.userId, args.notes);

        return {
          success: true,
          data: {
            orderId: args.orderId,
            newStatus,
            message: `Order status updated to ${newStatus}`
          }
        };
      }

      case "get_rider_earnings": {
        if (!context.riderId) {
          const rider = await storage.getRiderByUserId(context.userId);
          if (!rider) return { success: false, error: "Rider profile not found" };
          context.riderId = rider.id;
        }

        // Get delivered orders for the period
        const orders = await storage.getOrdersByRider(context.riderId);
        const deliveredOrders = orders.filter((o: any) => o.status === "delivered");

        // Calculate based on period
        const now = new Date();
        let startDate: Date;

        switch (args.period) {
          case "today":
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case "this_week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "this_month":
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const periodOrders = deliveredOrders.filter((o: any) =>
          new Date(o.createdAt) >= startDate
        );

        const totalDeliveries = periodOrders.length;
        // Assume ₱40 per delivery as base earnings
        const totalEarnings = totalDeliveries * 40;

        return {
          success: true,
          data: {
            period: args.period || "this_month",
            totalDeliveries,
            totalEarnings,
            averagePerDelivery: totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0
          }
        };
      }

      case "update_rider_availability": {
        if (!context.riderId) {
          const rider = await storage.getRiderByUserId(context.userId);
          if (!rider) return { success: false, error: "Rider profile not found" };
          context.riderId = rider.id;
        }

        await storage.updateRiderStatus(context.riderId, { isOnline: args.isOnline });

        return {
          success: true,
          data: {
            isOnline: args.isOnline,
            message: args.isOnline ? "You are now online and accepting deliveries" : "You are now offline"
          }
        };
      }

      case "get_route_info": {
        const order = await storage.getOrder(args.orderId);
        if (!order) {
          return { success: false, error: "Order not found" };
        }

        const restaurant = await storage.getRestaurant(order.restaurantId);
        const restaurantAddr = restaurant?.address as any;
        const deliveryAddr = order.deliveryAddress as any;

        return {
          success: true,
          data: {
            pickup: {
              name: restaurant?.name,
              address: restaurant?.address,
              lat: restaurantAddr?.lat,
              lng: restaurantAddr?.lng
            },
            delivery: {
              address: order.deliveryAddress,
              lat: deliveryAddr?.lat,
              lng: deliveryAddr?.lng
            },
            // Would integrate with OpenRouteService for actual routing
            estimatedDistance: "Calculating...",
            estimatedTime: order.estimatedDeliveryTime
          }
        };
      }

      // ==================== VENDOR FUNCTIONS ====================
      case "get_vendor_orders": {
        if (!context.restaurantId) {
          const restaurants = await storage.getRestaurantsByOwner(context.userId);
          if (!restaurants.length) return { success: false, error: "No restaurant found" };
          context.restaurantId = restaurants[0].id;
        }

        let orders = await storage.getOrdersByRestaurant(context.restaurantId);

        if (args.status) {
          orders = orders.filter((o: any) => o.status === args.status);
        }

        const limit = args.limit || 20;

        return {
          success: true,
          data: orders.slice(0, limit).map((o: any) => ({
            orderId: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            items: o.items,
            total: o.total,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            deliveryMode: o.deliveryMode,
            createdAt: o.createdAt
          }))
        };
      }

      case "update_order_status_vendor": {
        const order = await storage.getOrder(args.orderId);
        if (!order) {
          return { success: false, error: "Order not found" };
        }

        await storage.updateOrderStatus(args.orderId, args.status, context.userId);

        if (args.prepTime) {
          const estimatedTime = new Date(Date.now() + args.prepTime * 60 * 1000);
          await storage.updateOrder(args.orderId, {
            estimatedDeliveryTime: estimatedTime
          });
        }

        return {
          success: true,
          data: {
            orderId: args.orderId,
            newStatus: args.status,
            message: `Order status updated to ${args.status}`
          }
        };
      }

      case "create_menu_item": {
        if (!context.restaurantId) {
          const restaurants = await storage.getRestaurantsByOwner(context.userId);
          if (!restaurants.length) return { success: false, error: "No restaurant found" };
          context.restaurantId = restaurants[0].id;
        }

        let description = args.description;
        let image = args.image;

        // Get or create category
        let categoryId = args.categoryId;
        if (!categoryId) {
          const categories = await storage.getMenuCategories(context.restaurantId);
          if (categories.length > 0) {
            categoryId = categories[0].id;
          } else {
            const newCategory = await storage.createMenuCategory({
              restaurantId: context.restaurantId,
              name: "Menu Items",
              displayOrder: 1
            });
            categoryId = newCategory.id;
          }
        }

        // Generate description if requested
        if (args.generateDescription) {
          const categories = await storage.getMenuCategories(context.restaurantId);
          const category = categories.find((c: any) => c.id === categoryId);
          description = await generateMenuItemDescription(
            args.name,
            category?.name || "Main Course",
            args.ingredients
          );
        }

        // Generate image if requested
        if (args.generateImage) {
          image = await generateMenuItemImage(args.name, description || args.name);
        }

        const menuItem = await storage.createMenuItem({
          restaurantId: context.restaurantId,
          categoryId,
          name: args.name,
          description,
          price: String(args.price),
          imageUrl: image,
          isAvailable: args.isAvailable !== false,
          stockQuantity: args.stockQuantity || 100
        });

        return {
          success: true,
          data: {
            id: menuItem.id,
            name: menuItem.name,
            description: menuItem.description,
            price: menuItem.price,
            image: menuItem.imageUrl,
            message: `Menu item "${args.name}" created successfully!`
          }
        };
      }

      case "update_menu_item": {
        const menuItem = await storage.getMenuItem(args.menuItemId);
        if (!menuItem) {
          return { success: false, error: "Menu item not found" };
        }

        const updates: any = {};
        if (args.name) updates.name = args.name;
        if (args.price !== undefined) updates.price = args.price;
        if (args.description) updates.description = args.description;
        if (args.isAvailable !== undefined) updates.isAvailable = args.isAvailable;
        if (args.stockQuantity !== undefined) updates.stockQuantity = args.stockQuantity;

        // Regenerate content if requested
        if (args.regenerateDescription) {
          const categories = await storage.getMenuCategories(menuItem.restaurantId);
          const category = categories.find((c: any) => c.id === menuItem.categoryId);
          updates.description = await generateMenuItemDescription(
            args.name || menuItem.name,
            category?.name || "Main Course"
          );
        }

        if (args.regenerateImage) {
          updates.image = await generateMenuItemImage(
            args.name || menuItem.name,
            args.description || menuItem.description || ""
          );
        }

        await storage.updateMenuItem(args.menuItemId, updates);

        return {
          success: true,
          data: {
            id: args.menuItemId,
            updates,
            message: "Menu item updated successfully!"
          }
        };
      }

      case "create_menu_category": {
        if (!context.restaurantId) {
          const restaurants = await storage.getRestaurantsByOwner(context.userId);
          if (!restaurants.length) return { success: false, error: "No restaurant found" };
          context.restaurantId = restaurants[0].id;
        }

        const category = await storage.createMenuCategory({
          restaurantId: context.restaurantId,
          name: args.name,
          description: args.description,
          displayOrder: args.displayOrder || 99
        });

        return {
          success: true,
          data: {
            id: category.id,
            name: category.name,
            message: `Category "${args.name}" created!`
          }
        };
      }

      case "get_menu_categories": {
        if (!context.restaurantId) {
          const restaurants = await storage.getRestaurantsByOwner(context.userId);
          if (!restaurants.length) return { success: false, error: "No restaurant found" };
          context.restaurantId = restaurants[0].id;
        }

        const categories = await storage.getMenuCategories(context.restaurantId);

        return {
          success: true,
          data: categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            displayOrder: c.displayOrder
          }))
        };
      }

      case "get_vendor_analytics": {
        if (!context.restaurantId) {
          const restaurants = await storage.getRestaurantsByOwner(context.userId);
          if (!restaurants.length) return { success: false, error: "No restaurant found" };
          context.restaurantId = restaurants[0].id;
        }

        // Determine date range
        const now = new Date();
        let days = 30;
        switch (args.period) {
          case "today": days = 1; break;
          case "this_week": days = 7; break;
          case "this_month": days = 30; break;
          case "last_30_days": days = 30; break;
        }

        const analytics = await storage.getRestaurantOrderAnalytics(context.restaurantId, days);

        return {
          success: true,
          data: {
            period: args.period || "last_30_days",
            ...analytics
          }
        };
      }

      case "update_item_availability": {
        const menuItem = await storage.getMenuItem(args.menuItemId);
        if (!menuItem) {
          return { success: false, error: "Menu item not found" };
        }

        const updates: any = {};
        if (args.isAvailable !== undefined) updates.isAvailable = args.isAvailable;
        if (args.stockQuantity !== undefined) updates.stockQuantity = args.stockQuantity;

        await storage.updateMenuItem(args.menuItemId, updates);

        return {
          success: true,
          data: {
            id: args.menuItemId,
            isAvailable: args.isAvailable,
            stockQuantity: args.stockQuantity,
            message: `Item availability updated`
          }
        };
      }

      case "create_promotion": {
        if (!context.restaurantId) {
          const restaurants = await storage.getRestaurantsByOwner(context.userId);
          if (!restaurants.length) return { success: false, error: "No restaurant found" };
          context.restaurantId = restaurants[0].id;
        }

        const startDate = args.startDate ? new Date(args.startDate) : new Date();
        const endDate = args.endDate ? new Date(args.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

        const promotion = await storage.createPromotion({
          restaurantId: context.restaurantId,
          name: args.title,
          description: args.description,
          type: args.discountType,
          discountValue: String(args.discountValue),
          minimumOrderAmount: args.minimumOrder ? String(args.minimumOrder) : "0",
          startDate,
          endDate,
          isActive: true
        });

        return {
          success: true,
          data: {
            id: promotion.id,
            name: promotion.name,
            message: `Promotion "${args.title}" created!`
          }
        };
      }

      case "generate_menu_content": {
        let result: any = {};

        switch (args.type) {
          case "description":
            result.description = await generateMenuItemDescription(
              args.itemName,
              args.category || "Main Course",
              args.ingredients
            );
            break;
          case "image":
            result.imageUrl = await generateMenuItemImage(
              args.itemName,
              args.style || "Professional food photography"
            );
            break;
          case "promo_text":
            result.promoText = `Try our delicious ${args.itemName}! `;
            if (args.ingredients) {
              result.promoText += `Made with ${args.ingredients.slice(0, 3).join(", ")}. `;
            }
            result.promoText += "Order now on BTS Delivery!";
            break;
        }

        return { success: true, data: result };
      }

      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
  } catch (error: any) {
    console.error(`[AI Functions] Error executing ${functionName}:`, error);
    return { success: false, error: error.message || "Function execution failed" };
  }
}
