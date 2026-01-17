/**
 * Fraud Detection API Routes
 *
 * Admin endpoints for managing fraud detection, alerts, rules, and user risk profiles.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fraudDetectionService } from '../services/fraud-detection';
import { fraudCheckMiddleware, getClientIp, getDeviceFingerprint } from '../middleware/fraud-check';
import { db } from '../db';
import { eq, desc, and, gte, lte, sql, inArray } from 'drizzle-orm';
import {
  fraudRules,
  fraudAlerts,
  userRiskScores,
  deviceFingerprints,
  fraudCheckLogs,
  users,
  orders,
} from '@shared/schema';

const router = Router();

// Validation schemas
const fraudCheckSchema = z.object({
  userId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  orderDetails: z.object({
    totalAmount: z.number(),
    orderType: z.string(),
    deliveryAddress: z.object({ lat: z.number(), lng: z.number() }).optional(),
    pickupAddress: z.object({ lat: z.number(), lng: z.number() }).optional(),
  }).optional(),
  device: z.object({
    fingerprint: z.string(),
    userAgent: z.string(),
    ip: z.string(),
    deviceInfo: z.record(z.unknown()).optional(),
  }).optional(),
  payment: z.object({
    method: z.string(),
    amount: z.number(),
    cardLastFour: z.string().optional(),
  }).optional(),
  checkType: z.enum(['order_creation', 'payment', 'login', 'account_update']),
});

const reviewAlertSchema = z.object({
  decision: z.enum(['dismissed', 'confirmed']),
  blockUser: z.boolean().optional(),
  cancelOrder: z.boolean().optional(),
  issueRefund: z.boolean().optional(),
  notes: z.string().optional(),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ruleType: z.enum(['velocity', 'geolocation', 'device', 'payment', 'behavior', 'identity']),
  conditions: z.record(z.unknown()),
  action: z.enum(['allow', 'flag', 'block', 'review', 'notify']).default('flag'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  scoreImpact: z.number().min(0).max(100).default(10),
  isActive: z.boolean().default(true),
  applicableOrderTypes: z.array(z.string()).optional().nullable(),
  applicableUserRoles: z.array(z.string()).optional().nullable(),
});

const blockUserSchema = z.object({
  reason: z.string().min(1),
  duration: z.number().optional(), // Duration in hours, undefined = permanent
});

// ============================================================
// PUBLIC FRAUD CHECK ENDPOINT
// ============================================================

/**
 * POST /api/fraud/check
 * Perform a fraud check on order/payment
 */
router.post('/fraud/check', async (req: any, res: Response) => {
  try {
    const parsed = fraudCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.errors,
      });
    }

    // Use the device info from the request if not provided
    const input = parsed.data;
    if (!input.device) {
      const clientIp = getClientIp(req);
      const { fingerprint, deviceInfo } = getDeviceFingerprint(req);
      input.device = {
        fingerprint,
        userAgent: req.headers['user-agent'] || '',
        ip: clientIp,
        deviceInfo,
      };
    }

    const result = await fraudDetectionService.checkFraud(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform fraud check',
    });
  }
});

// ============================================================
// ADMIN FRAUD ALERT ENDPOINTS
// ============================================================

/**
 * GET /api/admin/fraud/alerts
 * List fraud alerts with filtering
 */
router.get('/admin/fraud/alerts', async (req: any, res: Response) => {
  try {
    const {
      status,
      severity,
      limit = '50',
      offset = '0',
      startDate,
      endDate,
    } = req.query;

    const result = await fraudDetectionService.getAlerts({
      status: status as string,
      severity: severity as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    // Enrich alerts with user and order data
    const enrichedAlerts = await Promise.all(
      result.alerts.map(async (alert) => {
        const [user] = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, alert.userId));

        let order = null;
        if (alert.orderId) {
          const [orderData] = await db
            .select({
              id: orders.id,
              orderNumber: orders.orderNumber,
              totalAmount: orders.totalAmount,
              status: orders.status,
            })
            .from(orders)
            .where(eq(orders.id, alert.orderId));
          order = orderData || null;
        }

        return {
          ...alert,
          user,
          order,
        };
      })
    );

    res.json({
      success: true,
      data: {
        alerts: enrichedAlerts,
        total: result.total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud alerts',
    });
  }
});

/**
 * GET /api/admin/fraud/alerts/:id
 * Get single fraud alert details
 */
router.get('/admin/fraud/alerts/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const [alert] = await db
      .select()
      .from(fraudAlerts)
      .where(eq(fraudAlerts.id, id));

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found',
      });
    }

    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, alert.userId));

    // Get order details if applicable
    let order = null;
    if (alert.orderId) {
      const [orderData] = await db.select().from(orders).where(eq(orders.id, alert.orderId));
      order = orderData;
    }

    // Get rule details if applicable
    let rule = null;
    if (alert.ruleId) {
      const [ruleData] = await db.select().from(fraudRules).where(eq(fraudRules.id, alert.ruleId));
      rule = ruleData;
    }

    // Get reviewer details if reviewed
    let reviewer = null;
    if (alert.reviewedBy) {
      const [reviewerData] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(eq(users.id, alert.reviewedBy));
      reviewer = reviewerData;
    }

    res.json({
      success: true,
      data: {
        ...alert,
        user,
        order,
        rule,
        reviewer,
      },
    });
  } catch (error) {
    console.error('Error fetching fraud alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud alert',
    });
  }
});

/**
 * POST /api/admin/fraud/alerts/:id/review
 * Review and resolve a fraud alert
 */
router.post('/admin/fraud/alerts/:id/review', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;

    const parsed = reviewAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.errors,
      });
    }

    const { decision, blockUser, cancelOrder, issueRefund, notes } = parsed.data;

    const updatedAlert = await fraudDetectionService.reviewAlert(id, reviewerId, decision, {
      blockUser,
      cancelOrder,
      issueRefund,
      notes,
    });

    res.json({
      success: true,
      data: updatedAlert,
      message: `Alert ${decision}${blockUser ? ' and user blocked' : ''}`,
    });
  } catch (error) {
    console.error('Error reviewing fraud alert:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to review alert',
    });
  }
});

// ============================================================
// ADMIN FRAUD RULES ENDPOINTS
// ============================================================

/**
 * GET /api/admin/fraud/rules
 * List all fraud rules
 */
router.get('/admin/fraud/rules', async (req: any, res: Response) => {
  try {
    const { isActive } = req.query;

    const rules = await fraudDetectionService.getRules({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error('Error fetching fraud rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud rules',
    });
  }
});

/**
 * GET /api/admin/fraud/rules/:id
 * Get single fraud rule
 */
router.get('/admin/fraud/rules/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const [rule] = await db
      .select()
      .from(fraudRules)
      .where(eq(fraudRules.id, id));

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Rule not found',
      });
    }

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    console.error('Error fetching fraud rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud rule',
    });
  }
});

/**
 * POST /api/admin/fraud/rules
 * Create a new fraud rule
 */
router.post('/admin/fraud/rules', async (req: any, res: Response) => {
  try {
    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.errors,
      });
    }

    const rule = await fraudDetectionService.upsertRule({
      ...parsed.data,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: rule,
      message: 'Fraud rule created successfully',
    });
  } catch (error) {
    console.error('Error creating fraud rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create fraud rule',
    });
  }
});

/**
 * PUT /api/admin/fraud/rules/:id
 * Update an existing fraud rule
 */
router.put('/admin/fraud/rules/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const parsed = createRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.errors,
      });
    }

    const rule = await fraudDetectionService.upsertRule({
      id,
      ...parsed.data,
    });

    res.json({
      success: true,
      data: rule,
      message: 'Fraud rule updated successfully',
    });
  } catch (error) {
    console.error('Error updating fraud rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fraud rule',
    });
  }
});

/**
 * PATCH /api/admin/fraud/rules/:id/toggle
 * Toggle fraud rule active status
 */
router.patch('/admin/fraud/rules/:id/toggle', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const rule = await fraudDetectionService.toggleRule(id, isActive);

    res.json({
      success: true,
      data: rule,
      message: `Rule ${isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling fraud rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle fraud rule',
    });
  }
});

/**
 * DELETE /api/admin/fraud/rules/:id
 * Delete a fraud rule
 */
router.delete('/admin/fraud/rules/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await fraudDetectionService.deleteRule(id);

    res.json({
      success: true,
      message: 'Fraud rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting fraud rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fraud rule',
    });
  }
});

// ============================================================
// ADMIN USER RISK PROFILE ENDPOINTS
// ============================================================

/**
 * GET /api/admin/fraud/user/:id/risk
 * Get user risk profile
 */
router.get('/admin/fraud/user/:id/risk', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await fraudDetectionService.getUserRiskProfile(id);

    // Get user details
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get devices
    const devices = await db
      .select()
      .from(deviceFingerprints)
      .where(eq(deviceFingerprints.userId, id))
      .orderBy(desc(deviceFingerprints.lastSeen))
      .limit(10);

    res.json({
      success: true,
      data: {
        user,
        ...profile,
        devices,
      },
    });
  } catch (error) {
    console.error('Error fetching user risk profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user risk profile',
    });
  }
});

/**
 * POST /api/admin/fraud/user/:id/block
 * Block a suspicious user
 */
router.post('/admin/fraud/user/:id/block', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const parsed = blockUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        details: parsed.error.errors,
      });
    }

    const { reason, duration } = parsed.data;
    const unblockAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined;

    await fraudDetectionService.blockUser(id, adminId, reason, unblockAt);

    res.json({
      success: true,
      message: duration
        ? `User blocked for ${duration} hours`
        : 'User blocked permanently',
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block user',
    });
  }
});

/**
 * POST /api/admin/fraud/user/:id/unblock
 * Unblock a user
 */
router.post('/admin/fraud/user/:id/unblock', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    await fraudDetectionService.unblockUser(id);

    res.json({
      success: true,
      message: 'User unblocked successfully',
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock user',
    });
  }
});

// ============================================================
// ADMIN FRAUD STATISTICS ENDPOINTS
// ============================================================

/**
 * GET /api/admin/fraud/stats
 * Get fraud statistics
 */
router.get('/admin/fraud/stats', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const stats = await fraudDetectionService.getStatistics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching fraud stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud statistics',
    });
  }
});

/**
 * GET /api/admin/fraud/logs
 * Get fraud check logs
 */
router.get('/admin/fraud/logs', async (req: any, res: Response) => {
  try {
    const {
      userId,
      checkType,
      riskLevel,
      limit = '50',
      offset = '0',
    } = req.query;

    let query = db.select().from(fraudCheckLogs);

    const conditions = [];
    if (userId) {
      conditions.push(eq(fraudCheckLogs.userId, userId as string));
    }
    if (checkType) {
      conditions.push(eq(fraudCheckLogs.checkType, checkType as string));
    }
    if (riskLevel) {
      conditions.push(eq(fraudCheckLogs.riskLevel, riskLevel as string));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const logs = await query
      .orderBy(desc(fraudCheckLogs.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fraudCheckLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({
      success: true,
      data: {
        logs,
        total: countResult.count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error('Error fetching fraud logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud logs',
    });
  }
});

/**
 * GET /api/admin/fraud/high-risk-users
 * Get list of high risk users
 */
router.get('/admin/fraud/high-risk-users', async (req: any, res: Response) => {
  try {
    const { limit = '20' } = req.query;

    const highRiskUsers = await db
      .select({
        riskScore: userRiskScores,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
          createdAt: users.createdAt,
        },
      })
      .from(userRiskScores)
      .innerJoin(users, eq(userRiskScores.userId, users.id))
      .where(inArray(userRiskScores.riskLevel, ['high', 'critical']))
      .orderBy(desc(userRiskScores.riskScore))
      .limit(parseInt(limit as string));

    res.json({
      success: true,
      data: highRiskUsers,
    });
  } catch (error) {
    console.error('Error fetching high risk users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high risk users',
    });
  }
});

/**
 * GET /api/admin/fraud/blocked-users
 * Get list of blocked users
 */
router.get('/admin/fraud/blocked-users', async (req: any, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const blockedUsers = await db
      .select({
        riskScore: userRiskScores,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          status: users.status,
        },
      })
      .from(userRiskScores)
      .innerJoin(users, eq(userRiskScores.userId, users.id))
      .where(eq(userRiskScores.isBlocked, true))
      .orderBy(desc(userRiskScores.blockedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userRiskScores)
      .where(eq(userRiskScores.isBlocked, true));

    res.json({
      success: true,
      data: {
        users: blockedUsers,
        total: countResult.count,
      },
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blocked users',
    });
  }
});

export default router;
