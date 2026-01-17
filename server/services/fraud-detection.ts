/**
 * Advanced Fraud Detection Service
 *
 * Comprehensive fraud detection and prevention system for the BTS Delivery platform.
 * Implements multiple detection strategies including velocity checks, geolocation validation,
 * device fingerprinting, payment analysis, and behavior analysis.
 */

import { db } from '../db';
import { eq, and, gte, lte, desc, sql, count, inArray } from 'drizzle-orm';
import {
  fraudRules,
  fraudAlerts,
  userRiskScores,
  deviceFingerprints,
  fraudCheckLogs,
  ipIntelligenceCache,
  orders,
  payments,
  users,
  type FraudRule,
  type FraudAlert,
  type UserRiskScore,
  type DeviceFingerprint,
  type InsertFraudAlert,
  type InsertUserRiskScore,
  type InsertDeviceFingerprint,
  type InsertFraudCheckLog,
} from '@shared/schema';
import crypto from 'crypto';

// Risk thresholds
const RISK_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 90,
};

// Decision thresholds
const DECISION_THRESHOLDS = {
  ALLOW: 30,
  REVIEW: 60,
  BLOCK: 80,
};

// Interfaces
export interface FraudCheckInput {
  userId: string;
  orderId?: string;
  orderDetails?: {
    totalAmount: number;
    orderType: string;
    deliveryAddress?: { lat: number; lng: number };
    pickupAddress?: { lat: number; lng: number };
  };
  device?: {
    fingerprint: string;
    userAgent: string;
    ip: string;
    deviceInfo?: Record<string, unknown>;
  };
  payment?: {
    method: string;
    amount: number;
    cardLastFour?: string;
  };
  checkType: 'order_creation' | 'payment' | 'login' | 'account_update';
}

export interface FraudCheckResult {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'allow' | 'review' | 'block';
  flags: FraudFlag[];
  triggeredRules: string[];
  processingTimeMs: number;
}

export interface FraudFlag {
  name: string;
  score: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  ruleId?: string;
}

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Generate device fingerprint hash
export function generateFingerprintHash(deviceInfo: Record<string, unknown>): string {
  const data = JSON.stringify(deviceInfo);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Determine risk level from score
function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= RISK_THRESHOLDS.HIGH) return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

// Determine decision from score
function getDecision(score: number): 'allow' | 'review' | 'block' {
  if (score >= DECISION_THRESHOLDS.BLOCK) return 'block';
  if (score >= DECISION_THRESHOLDS.REVIEW) return 'review';
  return 'allow';
}

/**
 * Main fraud detection service class
 */
export class FraudDetectionService {
  /**
   * Perform comprehensive fraud check
   */
  async checkFraud(input: FraudCheckInput): Promise<FraudCheckResult> {
    const startTime = Date.now();
    const flags: FraudFlag[] = [];
    const triggeredRules: string[] = [];

    try {
      // Get active fraud rules
      const activeRules = await db
        .select()
        .from(fraudRules)
        .where(eq(fraudRules.isActive, true));

      // Get user's existing risk score
      const existingRiskScore = await this.getUserRiskScore(input.userId);

      // Base score from existing risk profile
      let totalScore = existingRiskScore?.riskScore || 0;

      // Run velocity checks
      const velocityFlags = await this.runVelocityChecks(input, activeRules);
      flags.push(...velocityFlags);

      // Run geolocation checks
      if (input.orderDetails?.deliveryAddress || input.orderDetails?.pickupAddress) {
        const geoFlags = await this.runGeolocationChecks(input, activeRules);
        flags.push(...geoFlags);
      }

      // Run device fingerprinting checks
      if (input.device) {
        const deviceFlags = await this.runDeviceChecks(input, activeRules);
        flags.push(...deviceFlags);
      }

      // Run payment analysis
      if (input.payment) {
        const paymentFlags = await this.runPaymentChecks(input, activeRules);
        flags.push(...paymentFlags);
      }

      // Run behavior analysis
      const behaviorFlags = await this.runBehaviorChecks(input, activeRules);
      flags.push(...behaviorFlags);

      // Calculate final score
      for (const flag of flags) {
        totalScore += flag.score;
        if (flag.ruleId) {
          triggeredRules.push(flag.ruleId);
        }
      }

      // Cap score at 100
      totalScore = Math.min(100, totalScore);

      const riskLevel = getRiskLevel(totalScore);
      const recommendation = getDecision(totalScore);
      const processingTimeMs = Date.now() - startTime;

      // Log the fraud check
      await this.logFraudCheck({
        userId: input.userId,
        orderId: input.orderId,
        checkType: input.checkType,
        inputData: input as unknown as Record<string, unknown>,
        riskScore: totalScore,
        riskLevel,
        triggeredRules,
        recommendation,
        finalDecision: recommendation,
        processingTimeMs,
        ipAddress: input.device?.ip,
        userAgent: input.device?.userAgent,
        deviceFingerprint: input.device?.fingerprint,
      });

      // Create alert if necessary
      if (recommendation !== 'allow') {
        await this.createAlert({
          userId: input.userId,
          orderId: input.orderId,
          alertType: this.determineAlertType(flags),
          severity: riskLevel,
          details: {
            flags,
            triggeredRules,
            inputData: input,
          },
          riskScore: totalScore,
          ipAddress: input.device?.ip,
          userAgent: input.device?.userAgent,
        });
      }

      // Update user risk score
      await this.updateUserRiskScore(input.userId, totalScore, flags);

      // Update rule trigger counts
      await this.updateRuleTriggerCounts(triggeredRules);

      return {
        riskScore: totalScore,
        riskLevel,
        recommendation,
        flags,
        triggeredRules,
        processingTimeMs,
      };
    } catch (error) {
      console.error('Fraud check error:', error);
      // Return safe default on error
      return {
        riskScore: 50,
        riskLevel: 'medium',
        recommendation: 'review',
        flags: [{
          name: 'system_error',
          score: 50,
          severity: 'medium',
          description: 'Unable to complete fraud check, flagged for manual review',
        }],
        triggeredRules: [],
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Velocity Checks - Rate limiting and frequency analysis
   */
  private async runVelocityChecks(input: FraudCheckInput, rules: FraudRule[]): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const velocityRules = rules.filter(r => r.ruleType === 'velocity');

    for (const rule of velocityRules) {
      const conditions = rule.conditions as {
        metric: string;
        threshold: number;
        timeWindow: number;
        scope: string;
      };

      let count = 0;
      const windowStart = new Date(Date.now() - conditions.timeWindow * 1000);

      switch (conditions.metric) {
        case 'orders_per_hour':
          const orderCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(orders)
            .where(
              and(
                eq(orders.customerId, input.userId),
                gte(orders.createdAt, windowStart)
              )
            );
          count = orderCount[0]?.count || 0;
          break;

        case 'payment_attempts':
          const paymentCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(payments)
            .where(
              and(
                eq(payments.customerId, input.userId),
                gte(payments.createdAt, windowStart)
              )
            );
          count = paymentCount[0]?.count || 0;
          break;
      }

      if (count >= conditions.threshold) {
        flags.push({
          name: `velocity_${conditions.metric}`,
          score: rule.scoreImpact || 10,
          severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
          description: `${conditions.metric.replace(/_/g, ' ')}: ${count} in last ${conditions.timeWindow / 3600} hour(s), threshold: ${conditions.threshold}`,
          ruleId: rule.id,
        });
      }
    }

    return flags;
  }

  /**
   * Geolocation Checks - Location-based fraud detection
   */
  private async runGeolocationChecks(input: FraudCheckInput, rules: FraudRule[]): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const geoRules = rules.filter(r => r.ruleType === 'geolocation');

    for (const rule of geoRules) {
      const conditions = rule.conditions as {
        maxDistance?: number;
        checkVpn?: boolean;
        checkProxy?: boolean;
        allowedCountries?: string[];
      };

      // Check distance between pickup and delivery
      if (conditions.maxDistance && input.orderDetails?.deliveryAddress && input.orderDetails?.pickupAddress) {
        const distance = calculateDistance(
          input.orderDetails.pickupAddress.lat,
          input.orderDetails.pickupAddress.lng,
          input.orderDetails.deliveryAddress.lat,
          input.orderDetails.deliveryAddress.lng
        );

        if (distance > conditions.maxDistance) {
          flags.push({
            name: 'excessive_delivery_distance',
            score: rule.scoreImpact || 15,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: `Delivery distance (${distance.toFixed(2)} km) exceeds maximum allowed (${conditions.maxDistance} km)`,
            ruleId: rule.id,
          });
        }
      }

      // Check VPN/Proxy using IP intelligence
      if ((conditions.checkVpn || conditions.checkProxy) && input.device?.ip) {
        const ipInfo = await this.getIpIntelligence(input.device.ip);

        if (conditions.checkVpn && ipInfo?.isVpn) {
          flags.push({
            name: 'vpn_detected',
            score: rule.scoreImpact || 20,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: 'VPN connection detected',
            ruleId: rule.id,
          });
        }

        if (conditions.checkProxy && ipInfo?.isProxy) {
          flags.push({
            name: 'proxy_detected',
            score: rule.scoreImpact || 20,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: 'Proxy connection detected',
            ruleId: rule.id,
          });
        }

        // Check allowed countries
        if (conditions.allowedCountries && ipInfo?.country) {
          if (!conditions.allowedCountries.includes(ipInfo.country)) {
            flags.push({
              name: 'disallowed_country',
              score: rule.scoreImpact || 30,
              severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
              description: `Order from disallowed country: ${ipInfo.countryName || ipInfo.country}`,
              ruleId: rule.id,
            });
          }
        }
      }
    }

    return flags;
  }

  /**
   * Device Fingerprinting Checks
   */
  private async runDeviceChecks(input: FraudCheckInput, rules: FraudRule[]): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const deviceRules = rules.filter(r => r.ruleType === 'device');

    if (!input.device?.fingerprint) return flags;

    // Get or create device fingerprint record
    const fingerprintHash = input.device.fingerprint;

    // Check for existing fingerprint
    const existingFingerprint = await db
      .select()
      .from(deviceFingerprints)
      .where(eq(deviceFingerprints.fingerprintHash, fingerprintHash))
      .limit(1);

    for (const rule of deviceRules) {
      const conditions = rule.conditions as {
        maxAccountsPerDevice?: number;
        trustNewDevices?: boolean;
        flagDeviceChanges?: boolean;
      };

      // Check multiple accounts per device
      if (conditions.maxAccountsPerDevice) {
        const accountsOnDevice = await db
          .select({ count: sql<number>`count(distinct user_id)` })
          .from(deviceFingerprints)
          .where(eq(deviceFingerprints.fingerprintHash, fingerprintHash));

        const accountCount = accountsOnDevice[0]?.count || 0;

        if (accountCount >= conditions.maxAccountsPerDevice) {
          flags.push({
            name: 'multiple_accounts_device',
            score: rule.scoreImpact || 25,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: `${accountCount} accounts detected on this device, maximum allowed: ${conditions.maxAccountsPerDevice}`,
            ruleId: rule.id,
          });
        }
      }

      // Flag new/untrusted devices
      if (!conditions.trustNewDevices && existingFingerprint.length === 0) {
        flags.push({
          name: 'new_device',
          score: rule.scoreImpact || 10,
          severity: 'low',
          description: 'First time order from this device',
          ruleId: rule.id,
        });
      }

      // Flag device changes
      if (conditions.flagDeviceChanges) {
        const userDevices = await db
          .select()
          .from(deviceFingerprints)
          .where(eq(deviceFingerprints.userId, input.userId))
          .orderBy(desc(deviceFingerprints.lastSeen))
          .limit(1);

        if (userDevices.length > 0 && userDevices[0].fingerprintHash !== fingerprintHash) {
          flags.push({
            name: 'device_change',
            score: rule.scoreImpact || 15,
            severity: 'medium',
            description: 'Order from a different device than usual',
            ruleId: rule.id,
          });
        }
      }
    }

    // Update or create device fingerprint record
    await this.upsertDeviceFingerprint({
      userId: input.userId,
      fingerprintHash,
      deviceInfo: input.device.deviceInfo || {},
      ipAddress: input.device.ip,
    });

    return flags;
  }

  /**
   * Payment Analysis Checks
   */
  private async runPaymentChecks(input: FraudCheckInput, rules: FraudRule[]): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const paymentRules = rules.filter(r => r.ruleType === 'payment');

    for (const rule of paymentRules) {
      const conditions = rule.conditions as {
        maxFailedAttempts?: number;
        minTransactionAmount?: number;
        maxTransactionAmount?: number;
        flagSmallTransactions?: boolean;
        timeWindow?: number;
      };

      const timeWindow = conditions.timeWindow || 86400; // Default 24 hours
      const windowStart = new Date(Date.now() - timeWindow * 1000);

      // Check failed payment attempts
      if (conditions.maxFailedAttempts) {
        const failedPayments = await db
          .select({ count: sql<number>`count(*)` })
          .from(payments)
          .where(
            and(
              eq(payments.customerId, input.userId),
              eq(payments.status, 'failed'),
              gte(payments.createdAt, windowStart)
            )
          );

        const failedCount = failedPayments[0]?.count || 0;

        if (failedCount >= conditions.maxFailedAttempts) {
          flags.push({
            name: 'excessive_failed_payments',
            score: rule.scoreImpact || 25,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: `${failedCount} failed payment attempts in the last ${timeWindow / 3600} hours`,
            ruleId: rule.id,
          });
        }
      }

      // Check transaction amount limits
      if (input.payment?.amount) {
        if (conditions.minTransactionAmount && input.payment.amount < conditions.minTransactionAmount) {
          if (conditions.flagSmallTransactions) {
            flags.push({
              name: 'small_transaction',
              score: rule.scoreImpact || 5,
              severity: 'low',
              description: `Transaction amount (${input.payment.amount}) is below minimum threshold`,
              ruleId: rule.id,
            });
          }
        }

        if (conditions.maxTransactionAmount && input.payment.amount > conditions.maxTransactionAmount) {
          flags.push({
            name: 'large_transaction',
            score: rule.scoreImpact || 20,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: `Transaction amount (${input.payment.amount}) exceeds maximum threshold (${conditions.maxTransactionAmount})`,
            ruleId: rule.id,
          });
        }
      }
    }

    return flags;
  }

  /**
   * Behavior Analysis Checks
   */
  private async runBehaviorChecks(input: FraudCheckInput, rules: FraudRule[]): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];
    const behaviorRules = rules.filter(r => r.ruleType === 'behavior');

    // Get user data
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);

    if (user.length === 0) return flags;

    const userData = user[0];
    const accountAge = userData.createdAt
      ? Math.floor((Date.now() - new Date(userData.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    for (const rule of behaviorRules) {
      const conditions = rule.conditions as {
        minAccountAge?: number;
        maxRefundRate?: number;
        unusualOrderPatterns?: boolean;
      };

      // Check account age
      if (conditions.minAccountAge && accountAge < conditions.minAccountAge) {
        flags.push({
          name: 'new_account',
          score: rule.scoreImpact || 10,
          severity: 'low',
          description: `Account is only ${accountAge} days old, minimum required: ${conditions.minAccountAge} days`,
          ruleId: rule.id,
        });
      }

      // Check refund rate
      if (conditions.maxRefundRate) {
        const orderStats = await db
          .select({
            total: sql<number>`count(*)`,
            refunded: sql<number>`count(*) filter (where payment_status = 'refunded')`,
          })
          .from(orders)
          .where(eq(orders.customerId, input.userId));

        const stats = orderStats[0];
        const refundRate = stats.total > 0 ? (stats.refunded / stats.total) * 100 : 0;

        if (refundRate > conditions.maxRefundRate) {
          flags.push({
            name: 'high_refund_rate',
            score: rule.scoreImpact || 30,
            severity: rule.severity as 'low' | 'medium' | 'high' | 'critical',
            description: `Refund rate (${refundRate.toFixed(1)}%) exceeds maximum allowed (${conditions.maxRefundRate}%)`,
            ruleId: rule.id,
          });
        }
      }

      // Check unusual order patterns
      if (conditions.unusualOrderPatterns && input.orderDetails) {
        // Get user's average order value
        const avgOrderValue = await db
          .select({ avg: sql<number>`avg(total_amount)` })
          .from(orders)
          .where(eq(orders.customerId, input.userId));

        const average = avgOrderValue[0]?.avg || 0;

        if (average > 0 && input.orderDetails.totalAmount > average * 3) {
          flags.push({
            name: 'unusual_order_amount',
            score: rule.scoreImpact || 15,
            severity: 'medium',
            description: `Order amount is ${(input.orderDetails.totalAmount / average).toFixed(1)}x the user's average`,
            ruleId: rule.id,
          });
        }
      }
    }

    return flags;
  }

  /**
   * Get IP intelligence from cache or external service
   */
  private async getIpIntelligence(ip: string) {
    // Check cache first
    const cached = await db
      .select()
      .from(ipIntelligenceCache)
      .where(
        and(
          eq(ipIntelligenceCache.ipAddress, ip),
          gte(ipIntelligenceCache.expiresAt, new Date())
        )
      )
      .limit(1);

    if (cached.length > 0) {
      return cached[0];
    }

    // TODO: Implement actual IP intelligence lookup
    // For now, return null - would integrate with services like MaxMind, IPInfo, etc.
    return null;
  }

  /**
   * Get or create user risk score
   */
  async getUserRiskScore(userId: string): Promise<UserRiskScore | null> {
    const existing = await db
      .select()
      .from(userRiskScores)
      .where(eq(userRiskScores.userId, userId))
      .limit(1);

    return existing[0] || null;
  }

  /**
   * Update user risk score
   */
  private async updateUserRiskScore(userId: string, newScore: number, flags: FraudFlag[]): Promise<void> {
    const factors: RiskFactor[] = flags.map(f => ({
      name: f.name,
      score: f.score,
      weight: f.score / 100,
      description: f.description,
    }));

    const riskLevel = getRiskLevel(newScore);

    const existing = await this.getUserRiskScore(userId);

    if (existing) {
      await db
        .update(userRiskScores)
        .set({
          riskScore: newScore,
          riskLevel,
          factors,
          flagCount: existing.flagCount! + (flags.length > 0 ? 1 : 0),
          lastCalculated: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userRiskScores.userId, userId));
    } else {
      await db.insert(userRiskScores).values({
        userId,
        riskScore: newScore,
        riskLevel,
        factors,
        flagCount: flags.length > 0 ? 1 : 0,
        lastCalculated: new Date(),
      });
    }
  }

  /**
   * Create fraud alert
   */
  private async createAlert(data: {
    userId: string;
    orderId?: string;
    alertType: string;
    severity: string;
    details: Record<string, unknown>;
    riskScore: number;
    ipAddress?: string;
    userAgent?: string;
    ruleId?: string;
  }): Promise<FraudAlert> {
    const [alert] = await db
      .insert(fraudAlerts)
      .values({
        userId: data.userId,
        orderId: data.orderId,
        ruleId: data.ruleId,
        alertType: data.alertType as 'velocity' | 'geolocation' | 'device' | 'payment' | 'behavior' | 'identity' | 'manual',
        severity: data.severity as 'low' | 'medium' | 'high' | 'critical',
        details: data.details,
        riskScore: data.riskScore,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      })
      .returning();

    return alert;
  }

  /**
   * Log fraud check
   */
  private async logFraudCheck(data: InsertFraudCheckLog): Promise<void> {
    await db.insert(fraudCheckLogs).values(data);
  }

  /**
   * Upsert device fingerprint
   */
  private async upsertDeviceFingerprint(data: {
    userId: string;
    fingerprintHash: string;
    deviceInfo: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    const existing = await db
      .select()
      .from(deviceFingerprints)
      .where(
        and(
          eq(deviceFingerprints.userId, data.userId),
          eq(deviceFingerprints.fingerprintHash, data.fingerprintHash)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(deviceFingerprints)
        .set({
          lastSeen: new Date(),
          sessionCount: (existing[0].sessionCount || 0) + 1,
          ipAddress: data.ipAddress,
          updatedAt: new Date(),
        })
        .where(eq(deviceFingerprints.id, existing[0].id));
    } else {
      await db.insert(deviceFingerprints).values({
        userId: data.userId,
        fingerprintHash: data.fingerprintHash,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
      });
    }
  }

  /**
   * Update rule trigger counts
   */
  private async updateRuleTriggerCounts(ruleIds: string[]): Promise<void> {
    for (const ruleId of ruleIds) {
      await db
        .update(fraudRules)
        .set({
          triggerCount: sql`${fraudRules.triggerCount} + 1`,
          lastTriggeredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(fraudRules.id, ruleId));
    }
  }

  /**
   * Determine the primary alert type from flags
   */
  private determineAlertType(flags: FraudFlag[]): string {
    if (flags.length === 0) return 'manual';

    const typeMap: Record<string, string> = {
      'velocity': 'velocity',
      'orders_per_hour': 'velocity',
      'payment_attempts': 'velocity',
      'excessive': 'geolocation',
      'vpn': 'geolocation',
      'proxy': 'geolocation',
      'country': 'geolocation',
      'device': 'device',
      'multiple_accounts': 'device',
      'payment': 'payment',
      'failed': 'payment',
      'transaction': 'payment',
      'account': 'behavior',
      'refund': 'behavior',
      'unusual': 'behavior',
    };

    // Find the most severe flag
    const sortedFlags = [...flags].sort((a, b) => b.score - a.score);
    const topFlag = sortedFlags[0];

    for (const [keyword, type] of Object.entries(typeMap)) {
      if (topFlag.name.toLowerCase().includes(keyword)) {
        return type;
      }
    }

    return 'behavior';
  }

  // ============== ADMIN METHODS ==============

  /**
   * Get all fraud alerts with filtering
   */
  async getAlerts(options: {
    status?: string;
    severity?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{ alerts: FraudAlert[]; total: number }> {
    let query = db.select().from(fraudAlerts);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(fraudAlerts);

    const conditions = [];

    if (options.status) {
      conditions.push(eq(fraudAlerts.status, options.status as 'pending' | 'reviewed' | 'dismissed' | 'confirmed'));
    }
    if (options.severity) {
      conditions.push(eq(fraudAlerts.severity, options.severity as 'low' | 'medium' | 'high' | 'critical'));
    }
    if (options.startDate) {
      conditions.push(gte(fraudAlerts.createdAt, options.startDate));
    }
    if (options.endDate) {
      conditions.push(lte(fraudAlerts.createdAt, options.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
      countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
    }

    const [totalResult] = await countQuery;
    const alerts = await query
      .orderBy(desc(fraudAlerts.createdAt))
      .limit(options.limit || 50)
      .offset(options.offset || 0);

    return {
      alerts,
      total: totalResult.count,
    };
  }

  /**
   * Review fraud alert
   */
  async reviewAlert(
    alertId: string,
    reviewerId: string,
    decision: 'dismissed' | 'confirmed',
    options?: {
      blockUser?: boolean;
      cancelOrder?: boolean;
      issueRefund?: boolean;
      notes?: string;
    }
  ): Promise<FraudAlert> {
    const [alert] = await db
      .select()
      .from(fraudAlerts)
      .where(eq(fraudAlerts.id, alertId));

    if (!alert) {
      throw new Error('Alert not found');
    }

    const [updatedAlert] = await db
      .update(fraudAlerts)
      .set({
        status: decision === 'dismissed' ? 'dismissed' : 'confirmed',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        resolutionNotes: options?.notes,
        userBlocked: options?.blockUser || false,
        orderCancelled: options?.cancelOrder || false,
        refundIssued: options?.issueRefund || false,
        updatedAt: new Date(),
      })
      .where(eq(fraudAlerts.id, alertId))
      .returning();

    // Update user risk score if confirmed fraud
    if (decision === 'confirmed') {
      const userRisk = await this.getUserRiskScore(alert.userId);
      if (userRisk) {
        await db
          .update(userRiskScores)
          .set({
            confirmedFraudCount: (userRisk.confirmedFraudCount || 0) + 1,
            isBlocked: options?.blockUser || userRisk.isBlocked,
            blockedAt: options?.blockUser ? new Date() : userRisk.blockedAt,
            blockedBy: options?.blockUser ? reviewerId : userRisk.blockedBy,
            blockedReason: options?.blockUser ? 'Confirmed fraud' : userRisk.blockedReason,
            updatedAt: new Date(),
          })
          .where(eq(userRiskScores.userId, alert.userId));
      }
    } else {
      // Update false positive count for rule
      if (alert.ruleId) {
        await db
          .update(fraudRules)
          .set({
            falsePositiveCount: sql`${fraudRules.falsePositiveCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(fraudRules.id, alert.ruleId));
      }

      // Update dismissed count
      const userRisk = await this.getUserRiskScore(alert.userId);
      if (userRisk) {
        await db
          .update(userRiskScores)
          .set({
            dismissedAlertCount: (userRisk.dismissedAlertCount || 0) + 1,
            updatedAt: new Date(),
          })
          .where(eq(userRiskScores.userId, alert.userId));
      }
    }

    return updatedAlert;
  }

  /**
   * Get fraud rules
   */
  async getRules(options?: { isActive?: boolean }): Promise<FraudRule[]> {
    let query = db.select().from(fraudRules);

    if (options?.isActive !== undefined) {
      query = query.where(eq(fraudRules.isActive, options.isActive)) as typeof query;
    }

    return await query.orderBy(desc(fraudRules.createdAt));
  }

  /**
   * Create or update fraud rule
   */
  async upsertRule(rule: Partial<FraudRule> & { name: string; ruleType: string; conditions: unknown }): Promise<FraudRule> {
    if (rule.id) {
      const [updated] = await db
        .update(fraudRules)
        .set({
          ...rule,
          updatedAt: new Date(),
        })
        .where(eq(fraudRules.id, rule.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(fraudRules)
        .values(rule as any)
        .returning();
      return created;
    }
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId: string, isActive: boolean): Promise<FraudRule> {
    const [updated] = await db
      .update(fraudRules)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(fraudRules.id, ruleId))
      .returning();
    return updated;
  }

  /**
   * Delete fraud rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    await db.delete(fraudRules).where(eq(fraudRules.id, ruleId));
  }

  /**
   * Get user risk profile
   */
  async getUserRiskProfile(userId: string): Promise<{
    riskScore: UserRiskScore | null;
    recentAlerts: FraudAlert[];
    deviceCount: number;
    orderStats: {
      total: number;
      cancelled: number;
      refunded: number;
    };
  }> {
    const riskScore = await this.getUserRiskScore(userId);

    const recentAlerts = await db
      .select()
      .from(fraudAlerts)
      .where(eq(fraudAlerts.userId, userId))
      .orderBy(desc(fraudAlerts.createdAt))
      .limit(10);

    const devices = await db
      .select({ count: sql<number>`count(*)` })
      .from(deviceFingerprints)
      .where(eq(deviceFingerprints.userId, userId));

    const orderStats = await db
      .select({
        total: sql<number>`count(*)`,
        cancelled: sql<number>`count(*) filter (where status = 'cancelled')`,
        refunded: sql<number>`count(*) filter (where payment_status = 'refunded')`,
      })
      .from(orders)
      .where(eq(orders.customerId, userId));

    return {
      riskScore,
      recentAlerts,
      deviceCount: devices[0]?.count || 0,
      orderStats: orderStats[0] || { total: 0, cancelled: 0, refunded: 0 },
    };
  }

  /**
   * Block user
   */
  async blockUser(userId: string, blockedBy: string, reason: string, unblockAt?: Date): Promise<void> {
    const existing = await this.getUserRiskScore(userId);

    if (existing) {
      await db
        .update(userRiskScores)
        .set({
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy,
          blockedReason: reason,
          unblockAt,
          updatedAt: new Date(),
        })
        .where(eq(userRiskScores.userId, userId));
    } else {
      await db.insert(userRiskScores).values({
        userId,
        riskScore: 100,
        riskLevel: 'critical',
        factors: [],
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy,
        blockedReason: reason,
        unblockAt,
      });
    }

    // Update user status
    await db
      .update(users)
      .set({
        status: 'suspended',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string): Promise<void> {
    await db
      .update(userRiskScores)
      .set({
        isBlocked: false,
        blockedAt: null,
        blockedBy: null,
        blockedReason: null,
        unblockAt: null,
        updatedAt: new Date(),
      })
      .where(eq(userRiskScores.userId, userId));

    // Update user status
    await db
      .update(users)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Get fraud statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    alertsToday: number;
    highRiskOrders: number;
    blockedUsers: number;
    falsePositiveRate: number;
    alertsBySeverity: Record<string, number>;
    alertsByType: Record<string, number>;
    recentTrends: { date: string; count: number }[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Alerts today
    const alertsTodayResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(fraudAlerts)
      .where(gte(fraudAlerts.createdAt, today));

    // High risk orders (orders with associated high/critical alerts)
    const highRiskResult = await db
      .select({ count: sql<number>`count(distinct order_id)` })
      .from(fraudAlerts)
      .where(
        and(
          inArray(fraudAlerts.severity, ['high', 'critical']),
          eq(fraudAlerts.status, 'pending')
        )
      );

    // Blocked users
    const blockedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userRiskScores)
      .where(eq(userRiskScores.isBlocked, true));

    // False positive rate
    const reviewedAlerts = await db
      .select({
        total: sql<number>`count(*)`,
        dismissed: sql<number>`count(*) filter (where status = 'dismissed')`,
      })
      .from(fraudAlerts)
      .where(inArray(fraudAlerts.status, ['dismissed', 'confirmed']));

    const falsePositiveRate = reviewedAlerts[0].total > 0
      ? (reviewedAlerts[0].dismissed / reviewedAlerts[0].total) * 100
      : 0;

    // Alerts by severity
    const bySeverity = await db
      .select({
        severity: fraudAlerts.severity,
        count: sql<number>`count(*)`,
      })
      .from(fraudAlerts)
      .groupBy(fraudAlerts.severity);

    const alertsBySeverity: Record<string, number> = {};
    for (const row of bySeverity) {
      alertsBySeverity[row.severity] = row.count;
    }

    // Alerts by type
    const byType = await db
      .select({
        type: fraudAlerts.alertType,
        count: sql<number>`count(*)`,
      })
      .from(fraudAlerts)
      .groupBy(fraudAlerts.alertType);

    const alertsByType: Record<string, number> = {};
    for (const row of byType) {
      alertsByType[row.type] = row.count;
    }

    // Recent trends (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trends = await db
      .select({
        date: sql<string>`date(created_at)`,
        count: sql<number>`count(*)`,
      })
      .from(fraudAlerts)
      .where(gte(fraudAlerts.createdAt, sevenDaysAgo))
      .groupBy(sql`date(created_at)`)
      .orderBy(sql`date(created_at)`);

    return {
      alertsToday: alertsTodayResult[0]?.count || 0,
      highRiskOrders: highRiskResult[0]?.count || 0,
      blockedUsers: blockedResult[0]?.count || 0,
      falsePositiveRate,
      alertsBySeverity,
      alertsByType,
      recentTrends: trends.map(t => ({ date: t.date, count: t.count })),
    };
  }
}

// Export singleton instance
export const fraudDetectionService = new FraudDetectionService();
