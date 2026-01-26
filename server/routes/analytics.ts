import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { authenticateToken, requireAdmin, requireAdminOrVendor } from "../middleware/auth";
import { cacheQuery, CacheTTL, getStats as getCacheStats, del as cacheDelete, delPattern } from "../services/cache";

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:orders:summary:${startDate.toISOString()}:${endDate.toISOString()}`;

      const analytics = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getOrderAnalytics(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:orders:trends:${startDate.toISOString()}:${endDate.toISOString()}`;

      const trends = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getOrderTrends(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:orders:by-status:${startDate.toISOString()}:${endDate.toISOString()}`;

      const data = await cacheQuery(cacheKey, CacheTTL.MEDIUM, async () => {
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
      });

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
  async (req: Request, res: Response) => {
    try {
      const { period = "day", orderType } = req.query;

      if (!["day", "week", "month"].includes(period as string)) {
        return res.status(400).json({ message: "Period must be 'day', 'week', or 'month'" });
      }

      const cacheKey = `analytics:orders:by-type:${period}:${orderType || 'all'}`;

      const trends = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getOrderTrendAnalysis(
          period as "day" | "week" | "month",
          orderType as string
        );
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:revenue:summary:${startDate.toISOString()}:${endDate.toISOString()}`;

      const revenue = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getRevenueAnalytics(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:revenue:trends:${startDate.toISOString()}:${endDate.toISOString()}`;

      const trends = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getRevenueTrends(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { timeRange = "30d" } = req.query;
      const cacheKey = `analytics:financial:${timeRange}`;

      const financials = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getFinancialTrends(timeRange as string);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:users:summary:${startDate.toISOString()}:${endDate.toISOString()}`;

      const userStats = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getUserAnalytics(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:users:growth:${startDate.toISOString()}:${endDate.toISOString()}`;

      const data = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
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

        return {
          dailyGrowth: byDay,
          totalNew: filteredUsers.length,
          byRole: {
            customers: filteredUsers.filter((u) => u.role === "customer").length,
            vendors: filteredUsers.filter((u) => u.role === "vendor").length,
            riders: filteredUsers.filter((u) => u.role === "rider").length,
          },
        };
      });

      res.json({
        success: true,
        data,
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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:riders:summary:${startDate.toISOString()}:${endDate.toISOString()}`;

      const riderStats = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getRiderAnalytics(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const cacheKey = `analytics:riders:performance`;

      const performance = await cacheQuery(cacheKey, CacheTTL.MEDIUM, async () => {
        const riders = await storage.getUsers();
        const riderUsers = riders.filter((u) => u.role === "rider");

        // Get delivery stats for each rider
        const riderPerformance = await Promise.all(
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

        return riderPerformance.sort((a, b) => b.totalDeliveries - a.totalDeliveries);
      });

      res.json({
        success: true,
        data: performance,
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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:restaurants:summary:${startDate.toISOString()}:${endDate.toISOString()}`;

      const restaurantStats = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getRestaurantAnalytics(startDate, endDate);
      });

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

      const cacheKey = `analytics:restaurant:${id}:${days}`;

      const analytics = await cacheQuery(cacheKey, CacheTTL.MEDIUM, async () => {
        return storage.getRestaurantOrderAnalytics(id, days);
      });

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
  async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const cacheKey = `analytics:restaurants:top-performers:${limit}`;

      const performers = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        const restaurants = await storage.getRestaurants();

        // Calculate performance scores
        const restaurantPerformance = await Promise.all(
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

        return restaurantPerformance
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      });

      res.json({
        success: true,
        data: performers,
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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:geographic:${startDate.toISOString()}:${endDate.toISOString()}`;

      const geoData = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
        return storage.getGeographicAnalytics(startDate, endDate);
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:geographic:heatmap:${startDate.toISOString()}:${endDate.toISOString()}`;

      const heatmapData = await cacheQuery(cacheKey, CacheTTL.LONG, async () => {
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
        return filteredOrders
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
      });

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
  async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = parseDateRange(req);
      const cacheKey = `analytics:dashboard:${startDate.toISOString()}:${endDate.toISOString()}`;

      const data = await cacheQuery(cacheKey, CacheTTL.MEDIUM, async () => {
        // Parallel fetch all analytics
        const [orderAnalytics, revenueAnalytics, userAnalytics, riderAnalytics, restaurantAnalytics] =
          await Promise.all([
            storage.getOrderAnalytics(startDate, endDate),
            storage.getRevenueAnalytics(startDate, endDate),
            storage.getUserAnalytics(startDate, endDate),
            storage.getRiderAnalytics(startDate, endDate),
            storage.getRestaurantAnalytics(startDate, endDate),
          ]);

        return {
          orders: orderAnalytics,
          revenue: revenueAnalytics,
          users: userAnalytics,
          riders: riderAnalytics,
          restaurants: restaurantAnalytics,
        };
      });

      res.json({
        success: true,
        data,
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
  async (req: Request, res: Response) => {
    try {
      const cacheKey = `analytics:realtime`;

      const data = await cacheQuery(cacheKey, CacheTTL.SHORT, async () => {
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

        return {
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
        };
      });

      res.json({
        success: true,
        data,
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
      const stats = await getCacheStats();
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
        const deleted = await delPattern(pattern);
        res.json({ success: true, message: `Cleared ${deleted} cache entries` });
      } else {
        // Clear all analytics caches
        const deleted = await delPattern('analytics:*');
        res.json({ success: true, message: `Cleared ${deleted} analytics cache entries` });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Failed to clear cache" });
    }
  }
);

export default router;
