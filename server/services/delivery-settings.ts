/**
 * Delivery Settings Service
 *
 * Manages configurable delivery rates, rider commissions, and platform fees
 * Based on Philippine market research (GrabFood, Foodpanda rates 2024-2025)
 *
 * Research Sources:
 * - GrabFood: Base fare ₱39-45, ₱10-15/km, 24% vendor commission
 * - Foodpanda: Base fare ₱29-35, ₱10-12/km, 25-30% vendor commission
 * - Service fee: 5-10% of order value
 * - Small order fee: ₱20-30 for orders below minimum
 * - Rider base pay: ₱40-50 per delivery + ₱10-15/km
 */

import { db } from "../db";
import { platformConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Type Definitions
// ============================================================================

export interface DeliveryFeeSettings {
  // Base delivery fee (starting fee)
  baseFee: number;                    // Default: ₱39
  // Per kilometer rate
  perKmRate: number;                  // Default: ₱12
  // Minimum delivery fee
  minimumFee: number;                 // Default: ₱39
  // Maximum delivery fee cap
  maximumFee: number;                 // Default: ₱199
  // Free delivery threshold (order amount for free delivery)
  freeDeliveryThreshold: number;      // Default: ₱999
  // Small order fee (for orders below minimum)
  smallOrderFee: number;              // Default: ₱25
  // Small order threshold
  smallOrderThreshold: number;        // Default: ₱149
}

export interface ServiceFeeSettings {
  // Platform service fee percentage
  serviceFeePercent: number;          // Default: 5% (0.05)
  // Minimum service fee
  minimumServiceFee: number;          // Default: ₱10
  // Maximum service fee cap
  maximumServiceFee: number;          // Default: ₱99
  // Processing fee for online payments
  paymentProcessingFee: number;       // Default: ₱5
}

export interface RiderCommissionSettings {
  // Base pay per delivery
  basePayPerDelivery: number;         // Default: ₱45
  // Per kilometer rate for rider
  perKmRate: number;                  // Default: ₱12
  // Minimum earnings per delivery
  minimumEarnings: number;            // Default: ₱45
  // Waiting time compensation (per 10 min after 15 min)
  waitingTimeFee: number;             // Default: ₱10
  // Night differential (10pm-6am) multiplier
  nightDifferentialMultiplier: number; // Default: 1.15 (15% extra)
  // Rain/bad weather bonus
  badWeatherBonus: number;            // Default: ₱20
}

export interface VendorCommissionSettings {
  // Default commission rate for vendors
  defaultCommissionPercent: number;   // Default: 20% (0.20)
  // Minimum commission rate
  minimumCommissionPercent: number;   // Default: 10% (0.10)
  // Maximum commission rate
  maximumCommissionPercent: number;   // Default: 30% (0.30)
  // Commission for self-delivery vendors
  selfDeliveryCommissionPercent: number; // Default: 8% (0.08)
}

export interface SurgePricingSettings {
  // Enable surge pricing
  enabled: boolean;                   // Default: true
  // Peak hours (lunch: 11am-2pm, dinner: 6pm-9pm)
  peakHours: {
    lunch: { start: number; end: number };
    dinner: { start: number; end: number };
  };
  // Surge multiplier during peak hours
  peakHourMultiplier: number;         // Default: 1.2 (20% increase)
  // Maximum surge multiplier
  maxSurgeMultiplier: number;         // Default: 2.0
  // High demand threshold (orders per hour)
  highDemandThreshold: number;        // Default: 50
}

export interface DistanceZoneSettings {
  zones: Array<{
    name: string;
    maxDistanceKm: number;
    deliveryFee: number;
    estimatedMinutesMin: number;
    estimatedMinutesMax: number;
    riderBonus: number;
  }>;
}

export interface DeliverySettingsConfig {
  deliveryFees: DeliveryFeeSettings;
  serviceFees: ServiceFeeSettings;
  riderCommission: RiderCommissionSettings;
  vendorCommission: VendorCommissionSettings;
  surgePricing: SurgePricingSettings;
  distanceZones: DistanceZoneSettings;
  updatedAt: string;
  updatedBy?: string;
}

// ============================================================================
// Default Configuration (Based on Philippine Market Research)
// ============================================================================

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettingsConfig = {
  deliveryFees: {
    baseFee: 39,
    perKmRate: 12,
    minimumFee: 39,
    maximumFee: 199,
    freeDeliveryThreshold: 999,
    smallOrderFee: 25,
    smallOrderThreshold: 149,
  },
  serviceFees: {
    serviceFeePercent: 0.05,
    minimumServiceFee: 10,
    maximumServiceFee: 99,
    paymentProcessingFee: 5,
  },
  riderCommission: {
    basePayPerDelivery: 45,
    perKmRate: 12,
    minimumEarnings: 45,
    waitingTimeFee: 10,
    nightDifferentialMultiplier: 1.15,
    badWeatherBonus: 20,
  },
  vendorCommission: {
    defaultCommissionPercent: 0.20,
    minimumCommissionPercent: 0.10,
    maximumCommissionPercent: 0.30,
    selfDeliveryCommissionPercent: 0.08,
  },
  surgePricing: {
    enabled: true,
    peakHours: {
      lunch: { start: 11, end: 14 },
      dinner: { start: 18, end: 21 },
    },
    peakHourMultiplier: 1.2,
    maxSurgeMultiplier: 2.0,
    highDemandThreshold: 50,
  },
  distanceZones: {
    zones: [
      {
        name: "Nearby",
        maxDistanceKm: 3,
        deliveryFee: 39,
        estimatedMinutesMin: 15,
        estimatedMinutesMax: 25,
        riderBonus: 0,
      },
      {
        name: "Standard",
        maxDistanceKm: 5,
        deliveryFee: 49,
        estimatedMinutesMin: 20,
        estimatedMinutesMax: 35,
        riderBonus: 5,
      },
      {
        name: "Extended",
        maxDistanceKm: 10,
        deliveryFee: 69,
        estimatedMinutesMin: 30,
        estimatedMinutesMax: 50,
        riderBonus: 15,
      },
      {
        name: "Far",
        maxDistanceKm: 20,
        deliveryFee: 99,
        estimatedMinutesMin: 45,
        estimatedMinutesMax: 75,
        riderBonus: 30,
      },
      {
        name: "Province-wide",
        maxDistanceKm: 50,
        deliveryFee: 149,
        estimatedMinutesMin: 60,
        estimatedMinutesMax: 120,
        riderBonus: 50,
      },
    ],
  },
  updatedAt: new Date().toISOString(),
};

// ============================================================================
// Delivery Settings Service
// ============================================================================

class DeliverySettingsService {
  private cache: DeliverySettingsConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get current delivery settings (with caching)
   */
  async getSettings(): Promise<DeliverySettingsConfig> {
    // Check cache
    if (this.cache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.cache;
    }

    try {
      // Try to get from database
      const result = await db
        .select()
        .from(platformConfig)
        .where(eq(platformConfig.configKey, "delivery_settings"))
        .limit(1);

      if (result.length > 0 && result[0].configValue) {
        this.cache = result[0].configValue as DeliverySettingsConfig;
        this.cacheTimestamp = Date.now();
        return this.cache;
      }

      // Return defaults if not found
      return DEFAULT_DELIVERY_SETTINGS;
    } catch (error) {
      console.error("[DeliverySettings] Error fetching settings:", error);
      return DEFAULT_DELIVERY_SETTINGS;
    }
  }

  /**
   * Update delivery settings
   */
  async updateSettings(
    settings: Partial<DeliverySettingsConfig>,
    updatedBy?: string
  ): Promise<DeliverySettingsConfig> {
    const currentSettings = await this.getSettings();

    const newSettings: DeliverySettingsConfig = {
      deliveryFees: { ...currentSettings.deliveryFees, ...settings.deliveryFees },
      serviceFees: { ...currentSettings.serviceFees, ...settings.serviceFees },
      riderCommission: { ...currentSettings.riderCommission, ...settings.riderCommission },
      vendorCommission: { ...currentSettings.vendorCommission, ...settings.vendorCommission },
      surgePricing: { ...currentSettings.surgePricing, ...settings.surgePricing },
      distanceZones: settings.distanceZones || currentSettings.distanceZones,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    try {
      // Upsert to database
      const existing = await db
        .select()
        .from(platformConfig)
        .where(eq(platformConfig.configKey, "delivery_settings"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(platformConfig)
          .set({
            configValue: newSettings,
            updatedAt: new Date(),
          })
          .where(eq(platformConfig.configKey, "delivery_settings"));
      } else {
        await db.insert(platformConfig).values({
          configKey: "delivery_settings",
          configValue: newSettings,
          description: "Delivery fees, rider commissions, and platform settings",
          category: "delivery",
          dataType: "json",
          isEditable: true,
          requiresRestart: false,
        });
      }

      // Clear cache
      this.cache = null;
      this.cacheTimestamp = 0;

      console.log("[DeliverySettings] Settings updated successfully");
      return newSettings;
    } catch (error) {
      console.error("[DeliverySettings] Error updating settings:", error);
      throw error;
    }
  }

  /**
   * Calculate delivery fee based on distance
   */
  async calculateDeliveryFee(
    distanceKm: number,
    orderAmount: number
  ): Promise<{
    deliveryFee: number;
    zone: string;
    estimatedMinutes: { min: number; max: number };
    isFreeDelivery: boolean;
    smallOrderFee: number;
  }> {
    const settings = await this.getSettings();
    const { deliveryFees, distanceZones, surgePricing } = settings;

    // Check for free delivery
    const isFreeDelivery = orderAmount >= deliveryFees.freeDeliveryThreshold;

    // Find applicable zone
    const zone = distanceZones.zones.find((z) => distanceKm <= z.maxDistanceKm);
    const zoneName = zone?.name || "Province-wide";
    const estimatedMinutes = zone
      ? { min: zone.estimatedMinutesMin, max: zone.estimatedMinutesMax }
      : { min: 60, max: 120 };

    // Calculate base delivery fee
    let deliveryFee = zone?.deliveryFee || deliveryFees.maximumFee;

    // Apply surge pricing if enabled
    if (surgePricing.enabled) {
      const hour = new Date().getHours();
      const isLunchPeak = hour >= surgePricing.peakHours.lunch.start && hour < surgePricing.peakHours.lunch.end;
      const isDinnerPeak = hour >= surgePricing.peakHours.dinner.start && hour < surgePricing.peakHours.dinner.end;

      if (isLunchPeak || isDinnerPeak) {
        deliveryFee = Math.round(deliveryFee * surgePricing.peakHourMultiplier);
      }
    }

    // Cap delivery fee
    deliveryFee = Math.min(deliveryFee, deliveryFees.maximumFee);

    // Calculate small order fee
    const smallOrderFee = orderAmount < deliveryFees.smallOrderThreshold ? deliveryFees.smallOrderFee : 0;

    // Free delivery overrides
    if (isFreeDelivery) {
      deliveryFee = 0;
    }

    return {
      deliveryFee,
      zone: zoneName,
      estimatedMinutes,
      isFreeDelivery,
      smallOrderFee,
    };
  }

  /**
   * Calculate service fee
   */
  async calculateServiceFee(orderAmount: number, useOnlinePayment: boolean = false): Promise<{
    serviceFee: number;
    processingFee: number;
    total: number;
  }> {
    const settings = await this.getSettings();
    const { serviceFees } = settings;

    // Calculate percentage-based service fee
    let serviceFee = Math.round(orderAmount * serviceFees.serviceFeePercent);

    // Apply min/max
    serviceFee = Math.max(serviceFee, serviceFees.minimumServiceFee);
    serviceFee = Math.min(serviceFee, serviceFees.maximumServiceFee);

    // Add processing fee for online payments
    const processingFee = useOnlinePayment ? serviceFees.paymentProcessingFee : 0;

    return {
      serviceFee,
      processingFee,
      total: serviceFee + processingFee,
    };
  }

  /**
   * Calculate rider earnings for a delivery
   */
  async calculateRiderEarnings(
    distanceKm: number,
    waitingTimeMinutes: number = 0,
    isNightTime: boolean = false,
    isBadWeather: boolean = false
  ): Promise<{
    baseEarnings: number;
    distanceBonus: number;
    waitingFee: number;
    nightBonus: number;
    weatherBonus: number;
    totalEarnings: number;
  }> {
    const settings = await this.getSettings();
    const { riderCommission, distanceZones } = settings;

    // Base earnings
    let baseEarnings = riderCommission.basePayPerDelivery;

    // Distance-based earnings
    const distanceBonus = Math.round(distanceKm * riderCommission.perKmRate);

    // Zone bonus
    const zone = distanceZones.zones.find((z) => distanceKm <= z.maxDistanceKm);
    const zoneBonus = zone?.riderBonus || 0;

    // Waiting time fee (after 15 minutes, per 10 min block)
    const excessWaitingMinutes = Math.max(0, waitingTimeMinutes - 15);
    const waitingFee = Math.floor(excessWaitingMinutes / 10) * riderCommission.waitingTimeFee;

    // Night differential
    const nightBonus = isNightTime ? Math.round(baseEarnings * (riderCommission.nightDifferentialMultiplier - 1)) : 0;

    // Weather bonus
    const weatherBonus = isBadWeather ? riderCommission.badWeatherBonus : 0;

    // Total earnings
    const totalEarnings = Math.max(
      riderCommission.minimumEarnings,
      baseEarnings + distanceBonus + zoneBonus + waitingFee + nightBonus + weatherBonus
    );

    return {
      baseEarnings,
      distanceBonus: distanceBonus + zoneBonus,
      waitingFee,
      nightBonus,
      weatherBonus,
      totalEarnings,
    };
  }

  /**
   * Calculate vendor commission
   */
  async calculateVendorCommission(
    orderAmount: number,
    vendorCommissionRate?: number,
    isSelfDelivery: boolean = false
  ): Promise<{
    commissionRate: number;
    commissionAmount: number;
    vendorEarnings: number;
  }> {
    const settings = await this.getSettings();
    const { vendorCommission } = settings;

    // Determine commission rate
    let commissionRate = vendorCommissionRate || vendorCommission.defaultCommissionPercent;

    // Use self-delivery rate if applicable
    if (isSelfDelivery) {
      commissionRate = vendorCommission.selfDeliveryCommissionPercent;
    }

    // Ensure within bounds
    commissionRate = Math.max(commissionRate, vendorCommission.minimumCommissionPercent);
    commissionRate = Math.min(commissionRate, vendorCommission.maximumCommissionPercent);

    // Calculate amounts
    const commissionAmount = Math.round(orderAmount * commissionRate);
    const vendorEarnings = orderAmount - commissionAmount;

    return {
      commissionRate,
      commissionAmount,
      vendorEarnings,
    };
  }

  /**
   * Clear cache (call when settings are updated externally)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(updatedBy?: string): Promise<DeliverySettingsConfig> {
    return this.updateSettings(DEFAULT_DELIVERY_SETTINGS, updatedBy);
  }
}

// Export singleton instance
export const deliverySettingsService = new DeliverySettingsService();
