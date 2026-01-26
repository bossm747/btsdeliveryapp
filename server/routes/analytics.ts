import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireAdmin, requireAdminOrVendor } from "../middleware/auth";
import { cache, CacheKeys, CacheTTL, cacheMiddleware } from "../services/cache-service";

const router = Router();

/**
 * Admin Analytics Dashboard Routes
 *
 * Provides comprehensive analytics endpoints for admin dashboards:
 * - Order analytics (volume, revenue, trends)
 * - User analytics (growth, retention, segments)
 * - Rider analytics (performance, availability)
 * - Restaurant analytics (performance, popularity)
 * - Geographic analytics (heatmaps, zones)
 * - Financial analytics (revenue, costs, margins)
 */

// Helper to parse date range from query params
function parseDateRange(req: Request): { startDate: Date; endDate: Date } {
  const endDate = req.query.endDate
    ? new Date(req.query.endDate as string)
    : new Date();
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
  return { startDate, endDate };
}

// ============================================
// ORDER ANALYTICS
// ============================================

/**
 * GET /api/analytics/orders/summary
 * Get order summary statistics
 */
router.get(
  "/orders/summary",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const analytics = await storage.getOrderAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: analytics,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Order summary analytics error:", error);
      res.status(500).json({ message: "Failed to fetch order analytics" });
    }
  }
);

/**
 * GET /api/analytics/orders/trends
 * Get order trend analysis by period
 */
router.get(
  "/orders/trends",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const trends = await storage.getOrderTrends(startDate, endDate);

      res.json({
        success: true,
        data: trends,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Order trends error:", error);
      res.status(500).json({ message: "Failed to fetch order trends" });
    }
  }
);

/**
 * GET /api/analytics/orders/by-status
 * Get order breakdown by status
 */
router.get(
  "/orders/by-status",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.MEDIUM),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      const cacheKey = CacheKeys.analyticsOrders(
        startDate.toISOString(),
        endDate.toISOString()
      );

      const data = await cache.getOrSet(
        cacheKey,
        async () => {
          const orders = await storage.getOrders();
          const filteredOrders = orders.filter((o) => {
            if (!o.createdAt) return false;
            const createdAt = new Date(o.createdAt);
            return createdAt >= startDate && createdAt <= endDate;
          });

          // Group by status
          const byStatus: Record<string, number> = {};
          filteredOrders.forEach((order) => {
            byStatus[order.status] = (byStatus[order.status] || 0) + 1;
          });

          return {
            byStatus,
            totalOrders: filteredOrders.length,
          };
        },
        CacheTTL.LONG
      );

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Orders by status error:", error);
      res.status(500).json({ message: "Failed to fetch orders by status" });
    }
  }
);

/**
 * GET /api/analytics/orders/by-type
 * Get order breakdown by order type (food, pabili, pabayad, parcel)
 */
router.get(
  "/orders/by-type",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { period = "day", orderType } = req.query;

      if (!["day", "week", "month"].includes(period as string)) {
        return res.status(400).json({ message: "Period must be 'day', 'week', or 'month'" });
      }

      const trends = await storage.getOrderTrendAnalysis(
        period as "day" | "week" | "month",
        orderType as string
      );

      res.json({ success: true, data: trends });
    } catch (error: any) {
      console.error("Orders by type error:", error);
      res.status(500).json({ message: "Failed to fetch orders by type" });
    }
  }
);

// ============================================
// REVENUE ANALYTICS
// ============================================

/**
 * GET /api/analytics/revenue/summary
 * Get revenue summary statistics
 */
router.get(
  "/revenue/summary",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const revenue = await storage.getRevenueAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: revenue,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Revenue summary error:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  }
);

/**
 * GET /api/analytics/revenue/trends
 * Get revenue trend analysis
 */
router.get(
  "/revenue/trends",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const trends = await storage.getRevenueTrends(startDate, endDate);

      res.json({
        success: true,
        data: trends,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Revenue trends error:", error);
      res.status(500).json({ message: "Failed to fetch revenue trends" });
    }
  }
);

/**
 * GET /api/analytics/financial
 * Get comprehensive financial analytics
 */
router.get(
  "/financial",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { timeRange = "30d" } = req.query;
      const financials = await storage.getFinancialTrends(timeRange as string);

      res.json({ success: true, data: financials });
    } catch (error: any) {
      console.error("Financial analytics error:", error);
      res.status(500).json({ message: "Failed to fetch financial analytics" });
    }
  }
);

// ============================================
// USER ANALYTICS
// ============================================

/**
 * GET /api/analytics/users/summary
 * Get user statistics and growth
 */
router.get(
  "/users/summary",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const userStats = await storage.getUserAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: userStats,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("User analytics error:", error);
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  }
);

/**
 * GET /api/analytics/users/growth
 * Get user growth trends
 */
router.get(
  "/users/growth",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      // Get users grouped by registration date
      const users = await storage.getUsers();
      const filteredUsers = users.filter((u) => {
        if (!u.createdAt) return false;
        const createdAt = new Date(u.createdAt);
        return createdAt >= startDate && createdAt <= endDate;
      });

      // Group by day
      const byDay: Record<string, { customers: number; vendors: number; riders: number }> = {};
      filteredUsers.forEach((user) => {
        if (!user.createdAt) return;
        const day = new Date(user.createdAt).toISOString().split("T")[0];
        if (!byDay[day]) {
          byDay[day] = { customers: 0, vendors: 0, riders: 0 };
        }
        if (user.role === "customer") byDay[day].customers++;
        else if (user.role === "vendor") byDay[day].vendors++;
        else if (user.role === "rider") byDay[day].riders++;
      });

      res.json({
        success: true,
        data: {
          dailyGrowth: byDay,
          totalNew: filteredUsers.length,
          byRole: {
            customers: filteredUsers.filter((u) => u.role === "customer").length,
            vendors: filteredUsers.filter((u) => u.role === "vendor").length,
            riders: filteredUsers.filter((u) => u.role === "rider").length,
          },
        },
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("User growth error:", error);
      res.status(500).json({ message: "Failed to fetch user growth" });
    }
  }
);

// ============================================
// RIDER ANALYTICS
// ============================================

/**
 * GET /api/analytics/riders/summary
 * Get rider performance statistics
 */
router.get(
  "/riders/summary",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const riderStats = await storage.getRiderAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: riderStats,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Rider analytics error:", error);
      res.status(500).json({ message: "Failed to fetch rider analytics" });
    }
  }
);

/**
 * GET /api/analytics/riders/performance
 * Get individual rider performance metrics
 */
router.get(
  "/riders/performance",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.MEDIUM),
  async (req: Request, res: Response) => {
    try {
      const riders = await storage.getUsers();
      const riderUsers = riders.filter((u) => u.role === "rider");

      // Get delivery stats for each rider
      const performance = await Promise.all(
        riderUsers.slice(0, 50).map(async (rider) => {
          const orders = await storage.getOrdersByRider(rider.id);
          const deliveredOrders = orders.filter((o) => o.status === "delivered");

          return {
            riderId: rider.id,
            name: `${rider.firstName} ${rider.lastName}`,
            totalDeliveries: deliveredOrders.length,
            avgRating: 0, // Would come from rider profile/ratings table
            isOnline: false, // Would come from rider availability status
          };
        })
      );

      res.json({
        success: true,
        data: performance.sort((a, b) => b.totalDeliveries - a.totalDeliveries),
      });
    } catch (error: any) {
      console.error("Rider performance error:", error);
      res.status(500).json({ message: "Failed to fetch rider performance" });
    }
  }
);

// ============================================
// RESTAURANT ANALYTICS
// ============================================

/**
 * GET /api/analytics/restaurants/summary
 * Get restaurant performance statistics
 */
router.get(
  "/restaurants/summary",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const restaurantStats = await storage.getRestaurantAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: restaurantStats,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Restaurant analytics error:", error);
      res.status(500).json({ message: "Failed to fetch restaurant analytics" });
    }
  }
);

/**
 * GET /api/analytics/restaurants/:id
 * Get specific restaurant analytics (for vendor dashboard)
 */
router.get(
  "/restaurants/:id",
  authenticateToken,
  requireAdminOrVendor,
  cacheMiddleware(CacheTTL.MEDIUM),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      // Verify ownership if not admin
      if (req.user?.role !== "admin") {
        const restaurants = await storage.getRestaurantsByOwner(req.user!.id);
        if (!restaurants.some((r) => r.id === id)) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const analytics = await storage.getRestaurantOrderAnalytics(id, days);

      res.json({ success: true, data: analytics });
    } catch (error: any) {
      console.error("Restaurant detail analytics error:", error);
      res.status(500).json({ message: "Failed to fetch restaurant analytics" });
    }
  }
);

/**
 * GET /api/analytics/restaurants/top-performers
 * Get top performing restaurants
 */
router.get(
  "/restaurants/top-performers",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const restaurants = await storage.getRestaurants();

      // Calculate performance scores
      const performers = await Promise.all(
        restaurants.slice(0, 50).map(async (restaurant) => {
          const orders = await storage.getOrdersByRestaurant(restaurant.id);
          const completedOrders = orders.filter((o) => o.status === "delivered");
          const revenue = completedOrders.reduce(
            (sum, o) => sum + (Number(o.totalAmount) || 0),
            0
          );

          return {
            id: restaurant.id,
            name: restaurant.name,
            totalOrders: completedOrders.length,
            revenue,
            avgRating: Number(restaurant.rating) || 0,
          };
        })
      );

      res.json({
        success: true,
        data: performers
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit),
      });
    } catch (error: any) {
      console.error("Top performers error:", error);
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  }
);

// ============================================
// GEOGRAPHIC ANALYTICS
// ============================================

/**
 * GET /api/analytics/geographic
 * Get geographic distribution analytics
 */
router.get(
  "/geographic",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const geoData = await storage.getGeographicAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: geoData,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Geographic analytics error:", error);
      res.status(500).json({ message: "Failed to fetch geographic analytics" });
    }
  }
);

/**
 * GET /api/analytics/geographic/heatmap
 * Get order heatmap data for visualization
 */
router.get(
  "/geographic/heatmap",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.LONG),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      // Get orders with delivery addresses
      const orders = await storage.getOrders();
      const filteredOrders = orders.filter((o) => {
        if (!o.createdAt) return false;
        const createdAt = new Date(o.createdAt);
        return (
          createdAt >= startDate &&
          createdAt <= endDate &&
          o.deliveryAddress &&
          typeof o.deliveryAddress === "object"
        );
      });

      // Extract coordinates
      const heatmapData = filteredOrders
        .map((order) => {
          const addr = order.deliveryAddress as any;
          if (addr?.coordinates) {
            return {
              lat: addr.coordinates.lat,
              lng: addr.coordinates.lng,
              weight: 1,
            };
          }
          return null;
        })
        .filter((d): d is NonNullable<typeof d> => d !== null);

      res.json({
        success: true,
        data: heatmapData,
        totalPoints: heatmapData.length,
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Heatmap data error:", error);
      res.status(500).json({ message: "Failed to fetch heatmap data" });
    }
  }
);

// ============================================
// DASHBOARD AGGREGATES
// ============================================

/**
 * GET /api/analytics/dashboard
 * Get aggregated dashboard data (all key metrics in one call)
 */
router.get(
  "/dashboard",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.MEDIUM),
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);

      // Parallel fetch all analytics
      const [orderAnalytics, revenueAnalytics, userAnalytics, riderAnalytics, restaurantAnalytics] =
        await Promise.all([
          storage.getOrderAnalytics(startDate, endDate),
          storage.getRevenueAnalytics(startDate, endDate),
          storage.getUserAnalytics(startDate, endDate),
          storage.getRiderAnalytics(startDate, endDate),
          storage.getRestaurantAnalytics(startDate, endDate),
        ]);

      res.json({
        success: true,
        data: {
          orders: orderAnalytics,
          revenue: revenueAnalytics,
          users: userAnalytics,
          riders: riderAnalytics,
          restaurants: restaurantAnalytics,
        },
        period: { startDate, endDate },
      });
    } catch (error: any) {
      console.error("Dashboard analytics error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  }
);

/**
 * GET /api/analytics/realtime
 * Get real-time statistics (minimal caching)
 */
router.get(
  "/realtime",
  authenticateToken,
  requireAdmin,
  cacheMiddleware(CacheTTL.SHORT),
  async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const orders = await storage.getOrders();
      const todaysOrders = orders.filter((o) => o.createdAt && new Date(o.createdAt) >= today);

      // Calculate real-time metrics
      const pending = todaysOrders.filter((o) => o.status === "pending").length;
      const preparing = todaysOrders.filter((o) => o.status === "preparing").length;
      const inDelivery = todaysOrders.filter(
        (o) => o.status === "picked_up" || o.status === "on_the_way"
      ).length;
      const delivered = todaysOrders.filter((o) => o.status === "delivered").length;
      const cancelled = todaysOrders.filter((o) => o.status === "cancelled").length;

      const todaysRevenue = todaysOrders
        .filter((o) => o.status === "delivered")
        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      // Get active riders (count riders who are verified and active)
      const users = await storage.getUsers();
      const activeRiders = users.filter((u) => u.role === "rider" && u.status === "active").length;

      res.json({
        success: true,
        data: {
          orders: {
            total: todaysOrders.length,
            pending,
            preparing,
            inDelivery,
            delivered,
            cancelled,
          },
          revenue: todaysRevenue,
          activeRiders,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      console.error("Realtime analytics error:", error);
      res.status(500).json({ message: "Failed to fetch realtime analytics" });
    }
  }
);

/**
 * GET /api/analytics/cache/stats
 * Get cache statistics (admin only)
 */
router.get(
  "/cache/stats",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = cache.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch cache stats" });
    }
  }
);

/**
 * POST /api/analytics/cache/clear
 * Clear cache (admin only)
 */
router.post(
  "/cache/clear",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { pattern } = req.body;

      if (pattern) {
        const deleted = cache.deletePattern(pattern);
        res.json({ success: true, message: `Cleared ${deleted} cache entries` });
      } else {
        cache.clear();
        res.json({ success: true, message: "Cache cleared" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear cache" });
    }
  }
);

export default router;
