// BTS Delivery Platform - Advanced Comprehensive Pricing and Financial Engine
// Supports all order types: Food, Pabili, Pabayad, Parcel delivery
// Includes dynamic pricing, surge pricing, zone-based pricing, commission management, 
// tax compliance, and comprehensive financial calculations

import { db } from "../db";
import { eq, and, sql, desc, asc, inArray, gte, lte, isNull, or } from "drizzle-orm";
import {
  pricingZones, surgeSchedules, demandPricing, vehicleTypePricing,
  feeRules, paymentMethodFees, vendorCommissionTiers, riderEarningRules,
  taxRules, taxExemptions, pricingHistory, feeCalculations,
  revenueTracking, promotionRules, financialReports,
  type PricingZone, type SurgeSchedule, type DemandPricing, 
  type VehicleTypePricing, type FeeRule, type PaymentMethodFee,
  type VendorCommissionTier, type RiderEarningRule, type TaxRule,
  type TaxExemption, type PromotionRule, type FeeCalculation,
  type InsertFeeCalculation, type InsertRevenueTracking,
  type InsertDemandPricing, type InsertPricingHistory
} from "@shared/schema";

// Enhanced interfaces for comprehensive pricing calculation
export interface EnhancedServiceFees {
  basePrice: number;
  deliveryFee: number;
  distanceFee: number;
  surgeFee: number;
  vehicleTypeFee: number;
  serviceFee: number;
  processingFee: number;
  smallOrderFee: number;
  packagingFee: number;
  insuranceFee: number;
  expressFee: number;
  paymentMethodFee: number;
  tip: number;
  
  // Tax breakdown
  vatAmount: number;
  withholdingTax: number;
  localTax: number;
  totalTax: number;
  
  // Totals
  subtotalBeforeTax: number;
  totalFeesBeforeDiscount: number;
  totalDiscounts: number;
  finalAmount: number;
}

export interface ServiceFees extends EnhancedServiceFees {} // Backward compatibility

export interface EnhancedDiscountInfo {
  promotionalDiscount: number;
  loyaltyPointsDiscount: number;
  couponDiscount: number;
  volumeDiscount: number;
  firstTimeUserDiscount: number;
  referralDiscount: number;
  vendorPromoDiscount: number;
  seasonalDiscount: number;
  groupOrderDiscount: number;
  totalDiscounts: number;
  
  // Applied promotion details
  appliedPromotions: {
    code: string;
    name: string;
    type: string;
    value: number;
    discountAmount: number;
  }[];
}

export interface DiscountInfo extends EnhancedDiscountInfo {} // Backward compatibility

export interface ComprehensivePricingCalculation {
  orderId?: string;
  orderType: OrderType;
  serviceType: string;
  baseAmount: number;
  
  // Location and delivery info
  zoneInfo: {
    zoneId: string;
    zoneName: string;
    coordinates: { lat: number; lng: number };
  };
  
  // Vehicle and distance info
  vehicleType: string;
  distance: number;
  estimatedDuration: number;
  
  // Pricing components
  serviceFees: EnhancedServiceFees;
  discounts: EnhancedDiscountInfo;
  commissions: CommissionBreakdown;
  
  // Surge and dynamic pricing
  surgeInfo: {
    isActive: boolean;
    multiplier: number;
    reason: string[];
  };
  
  // Final breakdown
  breakdown: PriceBreakdown;
  finalTotal: number;
  
  // Metadata
  calculatedAt: Date;
  calculationVersion: string;
  pricingRulesSnapshot: any;
}

export interface PricingCalculation extends ComprehensivePricingCalculation {} // Backward compatibility

export interface PriceBreakdown {
  // Base amounts
  itemsSubtotal: number;
  
  // Delivery fees
  baseDeliveryFee: number;
  distanceFee: number;
  surgeFee: number;
  vehicleTypeFee: number;
  totalDeliveryFee: number;
  
  // Service fees
  serviceFee: number;
  processingFee: number;
  smallOrderFee: number;
  packagingFee: number;
  insuranceFee: number;
  expressFee: number;
  paymentMethodFee: number;
  totalServiceFees: number;
  
  // Other fees
  tip: number;
  
  // Subtotal calculation
  subtotalBeforeTax: number;
  
  // Tax breakdown
  vatAmount: number;
  withholdingTax: number;
  localTax: number;
  totalTax: number;
  
  // Final calculation
  totalBeforeDiscounts: number;
  totalDiscounts: number;
  finalTotal: number;
}

// Enhanced interfaces for sophisticated pricing
export interface CommissionBreakdown {
  vendorCommission: number;
  vendorCommissionRate: number;
  riderEarnings: number;
  riderEarningsRate: number;
  platformRevenue: number;
  platformFee: number;
  totalCommissions: number;
}

export interface DynamicPricingContext {
  // Location context
  zone: PricingZone;
  coordinates: { lat: number; lng: number };
  
  // Time context
  timestamp: Date;
  isWeekend: boolean;
  isPeakHour: boolean;
  peakHourType?: string;
  
  // Market context
  demandLevel: string;
  availableRiders: number;
  surgeMultiplier: number;
  weatherCondition?: string;
  eventFactors?: string[];
  
  // Service context
  serviceType: string;
  vehicleType: string;
  estimatedDistance: number;
  estimatedDuration: number;
}

export interface PricingEstimate {
  deliveryFee: { min: number; max: number; };
  totalFee: { min: number; max: number; };
  estimatedTime: string;
  surgeActive: boolean;
  surgeMultiplier?: number;
  availabilityStatus: string;
}

export interface LocationPricing {
  city: string;
  baseDeliveryFee: number;
  extraDistanceFee: number; // per km
  maxDistance: number; // km
  surchargeMultiplier: number; // for high-traffic areas
}

export type OrderType = 'food' | 'pabili' | 'pabayad' | 'parcel';
export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'truck';
export type PaymentMethodType = 'cash' | 'gcash' | 'maya' | 'card' | 'bank_transfer';
export type PromotionType = 'percentage' | 'fixed' | 'tiered' | 'bogo' | 'cashback' | 'loyalty_multiplier' | 'free_delivery';

export class EnhancedPricingService {
  // Philippines VAT rate (12%)
  private readonly VAT_RATE = 0.12;
  
  // Default rates (fallback when database rules not available)
  private readonly DEFAULT_SERVICE_RATES = {
    food: 0.05, // 5% of order value
    pabili: 0.10, // 10% procurement fee
    pabayad: 0.03, // 3% convenience fee
    parcel: 0.08, // 8% handling fee
  };

  // Default processing fees (fallback when database rules not available)
  private readonly DEFAULT_PROCESSING_FEES = {
    food: 10,
    pabili: 15,
    pabayad: 5,
    parcel: 12,
  };
  
  // Cache for database queries to improve performance
  private zoneCache = new Map<string, PricingZone>();
  private surgeCache = new Map<string, SurgeSchedule[]>();
  private feeRulesCache = new Map<string, FeeRule[]>();
  private promotionCache = new Map<string, PromotionRule[]>();
  
  // Cache expiry times (in milliseconds)
  private readonly CACHE_EXPIRY = {
    zones: 30 * 60 * 1000, // 30 minutes
    surge: 5 * 60 * 1000,  // 5 minutes
    feeRules: 15 * 60 * 1000, // 15 minutes
    promotions: 10 * 60 * 1000, // 10 minutes
  };

  // Fallback location-based delivery pricing (when database zones not available)
  private readonly FALLBACK_LOCATION_PRICING: LocationPricing[] = [
    // Metro Manila - Premium locations
    { city: 'Makati', baseDeliveryFee: 80, extraDistanceFee: 15, maxDistance: 25, surchargeMultiplier: 1.5 },
    { city: 'BGC', baseDeliveryFee: 80, extraDistanceFee: 15, maxDistance: 25, surchargeMultiplier: 1.5 },
    { city: 'Ortigas', baseDeliveryFee: 70, extraDistanceFee: 12, maxDistance: 30, surchargeMultiplier: 1.3 },
    { city: 'Manila', baseDeliveryFee: 65, extraDistanceFee: 10, maxDistance: 20, surchargeMultiplier: 1.2 },
    { city: 'Quezon City', baseDeliveryFee: 60, extraDistanceFee: 10, maxDistance: 30, surchargeMultiplier: 1.1 },
    
    // Metro Manila - Standard locations
    { city: 'Pasig', baseDeliveryFee: 55, extraDistanceFee: 8, maxDistance: 25, surchargeMultiplier: 1.0 },
    { city: 'Mandaluyong', baseDeliveryFee: 55, extraDistanceFee: 8, maxDistance: 20, surchargeMultiplier: 1.0 },
    { city: 'San Juan', baseDeliveryFee: 50, extraDistanceFee: 8, maxDistance: 15, surchargeMultiplier: 1.0 },
    { city: 'Marikina', baseDeliveryFee: 50, extraDistanceFee: 8, maxDistance: 25, surchargeMultiplier: 1.0 },
    
    // Metro Manila - Budget locations
    { city: 'Parañaque', baseDeliveryFee: 45, extraDistanceFee: 7, maxDistance: 20, surchargeMultiplier: 0.9 },
    { city: 'Las Piñas', baseDeliveryFee: 45, extraDistanceFee: 7, maxDistance: 20, surchargeMultiplier: 0.9 },
    { city: 'Muntinlupa', baseDeliveryFee: 45, extraDistanceFee: 7, maxDistance: 25, surchargeMultiplier: 0.9 },
    { city: 'Caloocan', baseDeliveryFee: 40, extraDistanceFee: 6, maxDistance: 20, surchargeMultiplier: 0.8 },
    { city: 'Malabon', baseDeliveryFee: 40, extraDistanceFee: 6, maxDistance: 15, surchargeMultiplier: 0.8 },
    { city: 'Navotas', baseDeliveryFee: 40, extraDistanceFee: 6, maxDistance: 15, surchargeMultiplier: 0.8 },
    { city: 'Valenzuela', baseDeliveryFee: 40, extraDistanceFee: 6, maxDistance: 20, surchargeMultiplier: 0.8 },
    
    // Regional cities
    { city: 'Cebu', baseDeliveryFee: 35, extraDistanceFee: 5, maxDistance: 30, surchargeMultiplier: 0.7 },
    { city: 'Davao', baseDeliveryFee: 30, extraDistanceFee: 5, maxDistance: 35, surchargeMultiplier: 0.6 },
    { city: 'Iloilo', baseDeliveryFee: 30, extraDistanceFee: 5, maxDistance: 25, surchargeMultiplier: 0.6 },
    
    // Default for other areas
    { city: 'Other', baseDeliveryFee: 25, extraDistanceFee: 4, maxDistance: 40, surchargeMultiplier: 0.5 },
  ];

  // Default commission rates (fallback when database rules not available)
  private readonly DEFAULT_COMMISSION_RATES = {
    restaurant: 0.15, // 15% commission from restaurants
    pabiliVendor: 0.10, // 10% commission from Pabili vendors
    rider: 0.20, // 20% goes to rider from delivery fee
    platform: 0.05, // 5% platform fee
  };

  // Default peak hour multipliers (fallback when database surge schedules not available)
  private readonly DEFAULT_PEAK_HOUR_MULTIPLIERS = {
    lunch: 1.2, // 11 AM - 2 PM
    dinner: 1.3, // 6 PM - 9 PM
    lateNight: 1.5, // 9 PM - 12 AM
    weekend: 1.1, // Saturday & Sunday
  };

  // Default weather surge pricing (fallback when database surge schedules not available)
  private readonly DEFAULT_WEATHER_SURGE = {
    rain: 1.2,
    heavyRain: 1.5,
    typhoon: 2.0,
    flood: 2.5,
  };
  
  // Aliases for backward compatibility (these reference the DEFAULT_ constants)
  private readonly PEAK_HOUR_MULTIPLIERS = this.DEFAULT_PEAK_HOUR_MULTIPLIERS;
  private readonly WEATHER_SURGE = this.DEFAULT_WEATHER_SURGE;
  private readonly COMMISSION_RATES = this.DEFAULT_COMMISSION_RATES;
  private readonly LOCATION_PRICING = this.FALLBACK_LOCATION_PRICING;
  
  constructor() {
    // Initialize cache cleanup interval
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000); // Clean up every 5 minutes
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    // Implementation would check cache timestamps and remove expired entries
    // For brevity, simplified here
  }

  /**
   * Main comprehensive pricing calculation method with database integration
   */
  async calculateComprehensivePricing(params: {
    orderType: OrderType;
    baseAmount: number;
    coordinates: { lat: number; lng: number };
    deliveryAddress: string;
    distance?: number; // km
    weight?: number; // kg (for parcel)
    vehicleType?: VehicleType;
    paymentMethod?: PaymentMethodType;
    isInsured?: boolean;
    isExpress?: boolean;
    weatherCondition?: string;
    loyaltyPoints?: number;
    promoCodes?: string[];
    tip?: number;
    customerId?: string;
    vendorId?: string;
    estimatedDuration?: number;
  }): Promise<ComprehensivePricingCalculation> {
    
    const {
      orderType,
      baseAmount,
      coordinates,
      deliveryAddress,
      distance = 5,
      weight = 1,
      vehicleType = 'motorcycle',
      paymentMethod = 'cash',
      isInsured = false,
      isExpress = false,
      weatherCondition,
      loyaltyPoints = 0,
      promoCodes = [],
      tip = 0,
      customerId,
      vendorId,
      estimatedDuration = 30
    } = params;
    
    const timestamp = new Date();
    
    try {

      // 1. Get pricing zone information
      const zoneInfo = await this.getPricingZone(coordinates);
      
      // 2. Get dynamic pricing context
      const pricingContext = await this.buildPricingContext({
        zone: zoneInfo,
        coordinates,
        timestamp,
        serviceType: orderType,
        vehicleType,
        distance,
        estimatedDuration,
        weatherCondition
      });
      
      // 3. Calculate comprehensive delivery fees
      const deliveryFeeBreakdown = await this.calculateAdvancedDeliveryFees({
        pricingContext,
        distance,
        weight,
        vehicleType,
        orderType
      });
    
      // 4. Calculate all service fees using database rules
      const serviceFeeBreakdown = await this.calculateComprehensiveServiceFees({
        baseAmount,
        orderType,
        paymentMethod,
        isExpress,
        zoneInfo,
        vendorId
      });
    
      // 5. Calculate insurance fee if needed
      const insuranceFee = await this.calculateInsuranceFee({
        baseAmount,
        orderType,
        isInsured,
        weight,
        isHighValue: baseAmount > 5000
      });
    
      // 6. Calculate taxes with regulatory compliance
      const taxBreakdown = await this.calculateTaxesWithCompliance({
        baseAmount,
        deliveryFee: deliveryFeeBreakdown.totalDeliveryFee,
        serviceFees: serviceFeeBreakdown,
        orderType,
        zoneInfo,
        vendorId,
        customerId
      });
    
      // 7. Calculate subtotal before discounts
      const subtotalBeforeTax = baseAmount + 
        deliveryFeeBreakdown.totalDeliveryFee + 
        serviceFeeBreakdown.totalServiceFees + 
        insuranceFee + 
        tip;
    
      // 8. Calculate total before discounts
      const totalBeforeDiscounts = subtotalBeforeTax + taxBreakdown.totalTax;
    
      // 9. Calculate comprehensive discounts and promotions
      const discountBreakdown = await this.calculateComprehensiveDiscounts({
        totalAmount: totalBeforeDiscounts,
        baseAmount,
        orderType,
        loyaltyPoints,
        promoCodes,
        customerId,
        vendorId,
        isFirstOrder: false, // would be determined from customer history
        pricingContext
      });
    
      // 10. Calculate final total
      const finalTotal = Math.max(0, totalBeforeDiscounts - discountBreakdown.totalDiscounts);
    
      // 11. Calculate commissions for all parties
      const commissionBreakdown = await this.calculateAdvancedCommissions({
        orderTotal: finalTotal,
        baseAmount,
        deliveryFeeBreakdown,
        serviceFeeBreakdown,
        orderType,
        vendorId,
        pricingContext
      });

      // 12. Build comprehensive service fees response
      const serviceFees: EnhancedServiceFees = {
        basePrice: baseAmount,
        deliveryFee: deliveryFeeBreakdown.baseDeliveryFee,
        distanceFee: deliveryFeeBreakdown.distanceFee,
        surgeFee: deliveryFeeBreakdown.surgeFee,
        vehicleTypeFee: deliveryFeeBreakdown.vehicleTypeFee,
        serviceFee: serviceFeeBreakdown.serviceFee,
        processingFee: serviceFeeBreakdown.processingFee,
        smallOrderFee: serviceFeeBreakdown.smallOrderFee,
        packagingFee: serviceFeeBreakdown.packagingFee,
        insuranceFee: insuranceFee,
        expressFee: serviceFeeBreakdown.expressFee,
        paymentMethodFee: serviceFeeBreakdown.paymentMethodFee,
        tip,
        
        // Tax breakdown
        vatAmount: taxBreakdown.vatAmount,
        withholdingTax: taxBreakdown.withholdingTax,
        localTax: taxBreakdown.localTax,
        totalTax: taxBreakdown.totalTax,
        
        // Totals
        subtotalBeforeTax,
        totalFeesBeforeDiscount: totalBeforeDiscounts,
        totalDiscounts: discountBreakdown.totalDiscounts,
        finalAmount: finalTotal
      };

      // 13. Build comprehensive price breakdown
      const breakdown: PriceBreakdown = {
        // Base amounts
        itemsSubtotal: baseAmount,
        
        // Delivery fees
        baseDeliveryFee: deliveryFeeBreakdown.baseDeliveryFee,
        distanceFee: deliveryFeeBreakdown.distanceFee,
        surgeFee: deliveryFeeBreakdown.surgeFee,
        vehicleTypeFee: deliveryFeeBreakdown.vehicleTypeFee,
        totalDeliveryFee: deliveryFeeBreakdown.totalDeliveryFee,
        
        // Service fees
        serviceFee: serviceFeeBreakdown.serviceFee,
        processingFee: serviceFeeBreakdown.processingFee,
        smallOrderFee: serviceFeeBreakdown.smallOrderFee,
        packagingFee: serviceFeeBreakdown.packagingFee,
        insuranceFee: insuranceFee,
        expressFee: serviceFeeBreakdown.expressFee,
        paymentMethodFee: serviceFeeBreakdown.paymentMethodFee,
        totalServiceFees: serviceFeeBreakdown.totalServiceFees,
        
        // Other fees
        tip,
        
        // Subtotal calculation
        subtotalBeforeTax,
        
        // Tax breakdown
        vatAmount: taxBreakdown.vatAmount,
        withholdingTax: taxBreakdown.withholdingTax,
        localTax: taxBreakdown.localTax,
        totalTax: taxBreakdown.totalTax,
        
        // Final calculation
        totalBeforeDiscounts,
        totalDiscounts: discountBreakdown.totalDiscounts,
        finalTotal
      };

      // 14. Store fee calculation in database for audit trail
      await this.storeFeeCalculation({
        orderType,
        baseAmount,
        serviceFees,
        breakdown,
        commissionBreakdown,
        pricingContext,
        calculationType: 'initial'
      });
      
      // 15. Build comprehensive response
      return {
        orderType,
        serviceType: orderType,
        baseAmount,
        
        // Zone and location info
        zoneInfo: {
          zoneId: zoneInfo.id,
          zoneName: zoneInfo.name,
          coordinates
        },
        
        // Vehicle and delivery info
        vehicleType,
        distance,
        estimatedDuration,
        
        // Pricing components
        serviceFees,
        discounts: discountBreakdown,
        commissions: commissionBreakdown,
        
        // Surge and dynamic pricing info
        surgeInfo: {
          isActive: pricingContext.surgeMultiplier > 1,
          multiplier: pricingContext.surgeMultiplier,
          reason: pricingContext.eventFactors || []
        },
        
        // Final breakdown
        breakdown,
        finalTotal,
        
        // Metadata
        calculatedAt: timestamp,
        calculationVersion: '2.0',
        pricingRulesSnapshot: {
          zoneRules: zoneInfo,
          surgeActive: pricingContext.surgeMultiplier > 1,
          weatherFactor: weatherCondition
        }
      };
      
    } catch (error) {
      console.error('Error in comprehensive pricing calculation:', error);
      // Fallback to basic pricing calculation
      return this.fallbackBasicPricing(params);
    }
  }

  /**
   * Fallback to basic pricing when database-driven pricing fails
   */
  private async fallbackBasicPricing(params: any): Promise<ComprehensivePricingCalculation> {
    // Implementation of basic pricing using hardcoded values as fallback
    // This would use the existing simple pricing logic
    const basicResult = await this.calculateBasicPricing(params);
    return {
      ...basicResult,
      serviceType: params.orderType,
      zoneInfo: {
        zoneId: 'fallback-zone',
        zoneName: 'Default Zone',
        coordinates: params.coordinates || { lat: 0, lng: 0 }
      },
      vehicleType: params.vehicleType || 'motorcycle',
      distance: params.distance || 5,
      estimatedDuration: params.estimatedDuration || 30,
      commissions: {
        vendorCommission: 0,
        vendorCommissionRate: 0.15,
        riderEarnings: 0,
        riderEarningsRate: 0.20,
        platformRevenue: 0,
        platformFee: 0,
        totalCommissions: 0
      },
      surgeInfo: {
        isActive: false,
        multiplier: 1.0,
        reason: []
      },
      calculatedAt: new Date(),
      calculationVersion: '1.0-fallback',
      pricingRulesSnapshot: {}
    };
  }
  
  /**
   * Get pricing zone information based on coordinates
   */
  private async getPricingZone(coordinates: { lat: number; lng: number }): Promise<PricingZone> {
    const cacheKey = `zone_${coordinates.lat}_${coordinates.lng}`;
    
    if (this.zoneCache.has(cacheKey)) {
      return this.zoneCache.get(cacheKey)!;
    }
    
    try {
      // Query database for pricing zones that contain these coordinates
      const zones = await db.select()
        .from(pricingZones)
        .where(
          and(
            eq(pricingZones.isActive, true),
            sql`ST_Contains(${pricingZones.boundaries}::geometry, ST_Point(${coordinates.lng}, ${coordinates.lat}))`
          )
        )
        .orderBy(desc(pricingZones.priority));
        
      let selectedZone: PricingZone;
      
      if (zones.length > 0) {
        selectedZone = zones[0]; // Highest priority zone
      } else {
        // Create default zone if none found
        selectedZone = {
          id: 'default-zone',
          name: 'Default Zone',
          description: 'Default pricing zone',
          boundaries: { type: 'Polygon', coordinates: [] },
          baseDeliveryFee: '45',
          perKilometerRate: '8',
          minimumFee: '25',
          maximumDistance: '20',
          surchargeMultiplier: '1.0',
          serviceTypes: ['food', 'pabili', 'pabayad', 'parcel'],
          isActive: true,
          priority: 1,
          effectiveFrom: new Date(),
          effectiveTo: null,
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Cache the result
      this.zoneCache.set(cacheKey, selectedZone);
      return selectedZone;
      
    } catch (error) {
      console.error('Error fetching pricing zone:', error);
      // Return default fallback zone
      return {
        id: 'fallback-zone',
        name: 'Fallback Zone',
        description: 'Fallback pricing zone when database unavailable',
        boundaries: { type: 'Polygon', coordinates: [] },
        baseDeliveryFee: '45',
        perKilometerRate: '8',
        minimumFee: '25',
        maximumDistance: '20',
        surchargeMultiplier: '1.0',
        serviceTypes: ['food', 'pabili', 'pabayad', 'parcel'],
        isActive: true,
        priority: 1,
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
  
  /**
   * Build comprehensive pricing context for dynamic pricing
   */
  private async buildPricingContext(params: {
    zone: PricingZone;
    coordinates: { lat: number; lng: number };
    timestamp: Date;
    serviceType: string;
    vehicleType: string;
    distance: number;
    estimatedDuration: number;
    weatherCondition?: string;
  }): Promise<DynamicPricingContext> {
    const { zone, coordinates, timestamp, serviceType, vehicleType, distance, estimatedDuration, weatherCondition } = params;
    
    // Determine time context
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let isPeakHour = false;
    let peakHourType: string | undefined;
    
    if (hour >= 11 && hour <= 14) {
      isPeakHour = true;
      peakHourType = 'lunch';
    } else if (hour >= 18 && hour <= 21) {
      isPeakHour = true;
      peakHourType = 'dinner';
    } else if (hour >= 21 || hour <= 2) {
      isPeakHour = true;
      peakHourType = 'lateNight';
    }
    
    // Get current demand pricing (if exists)
    let demandLevel = 'low';
    let availableRiders = 10; // Default assumption
    let surgeMultiplier = 1.0;
    let eventFactors: string[] = [];
    
    try {
      const demandData = await db.select()
        .from(demandPricing)
        .where(
          and(
            eq(demandPricing.zoneId, zone.id),
            eq(demandPricing.serviceType, serviceType),
            eq(demandPricing.isActive, true),
            gte(demandPricing.expiresAt, timestamp)
          )
        )
        .orderBy(desc(demandPricing.timestamp))
        .limit(1);
        
      if (demandData.length > 0) {
        const demand = demandData[0];
        demandLevel = demand.demandLevel;
        availableRiders = demand.activeBidders || 10;
        surgeMultiplier = parseFloat(demand.surgeMultiplier);
      }
    } catch (error) {
      console.error('Error fetching demand pricing:', error);
    }
    
    // Apply additional surge factors
    if (isPeakHour) {
      const peakMultiplier = this.DEFAULT_PEAK_HOUR_MULTIPLIERS[peakHourType as keyof typeof this.DEFAULT_PEAK_HOUR_MULTIPLIERS] || 1.2;
      surgeMultiplier = Math.max(surgeMultiplier, peakMultiplier);
      eventFactors.push(`Peak Hour: ${peakHourType}`);
    }
    
    if (isWeekend) {
      surgeMultiplier *= this.DEFAULT_PEAK_HOUR_MULTIPLIERS.weekend;
      eventFactors.push('Weekend');
    }
    
    if (weatherCondition && this.DEFAULT_WEATHER_SURGE[weatherCondition as keyof typeof this.DEFAULT_WEATHER_SURGE]) {
      const weatherMultiplier = this.DEFAULT_WEATHER_SURGE[weatherCondition as keyof typeof this.DEFAULT_WEATHER_SURGE];
      surgeMultiplier *= weatherMultiplier;
      eventFactors.push(`Weather: ${weatherCondition}`);
    }
    
    return {
      zone,
      coordinates,
      timestamp,
      isWeekend,
      isPeakHour,
      peakHourType,
      demandLevel,
      availableRiders,
      surgeMultiplier,
      weatherCondition,
      eventFactors,
      serviceType,
      vehicleType,
      estimatedDistance: distance,
      estimatedDuration
    };
  }

  /**
   * Legacy method kept for backward compatibility
   * Calculate delivery fee using fallback location pricing
   */
  private calculateLegacyDeliveryFee(params: {
    city: string;
    distance: number;
    weight: number;
    orderType: string;
    isPeakHour: boolean;
    weatherCondition?: string;
  }): number {
    const { city, distance, weight, orderType, isPeakHour, weatherCondition } = params;
    
    // Get location pricing
    const locationPricing = this.FALLBACK_LOCATION_PRICING.find(loc => 
      loc.city.toLowerCase() === city.toLowerCase()
    ) || this.FALLBACK_LOCATION_PRICING.find(loc => loc.city === 'Other')!;

    // Base delivery fee
    let deliveryFee = locationPricing.baseDeliveryFee;

    // Add extra distance fee
    if (distance > 5) { // First 5km included in base fee
      deliveryFee += (distance - 5) * locationPricing.extraDistanceFee;
    }

    // Weight surcharge for parcels
    if (orderType === 'parcel' && weight > 5) {
      deliveryFee += (weight - 5) * 5; // ₱5 per extra kg
    }

    // Apply location surcharge multiplier
    deliveryFee *= locationPricing.surchargeMultiplier;

    // Peak hour surcharge
    if (isPeakHour) {
      deliveryFee *= this.PEAK_HOUR_MULTIPLIERS.lunch; // Use lunch multiplier as default
    }

    // Weather surge pricing
    if (weatherCondition) {
      const surge = this.WEATHER_SURGE[weatherCondition as keyof typeof this.WEATHER_SURGE] || 1.0;
      deliveryFee *= surge;
    }

    return Math.round(deliveryFee);
  }
  
  /**
   * Calculate advanced delivery fees using database rules and dynamic pricing
   */
  private async calculateAdvancedDeliveryFees(params: {
    pricingContext: DynamicPricingContext;
    distance: number;
    weight: number;
    vehicleType: VehicleType;
    orderType: OrderType;
  }): Promise<{
    baseDeliveryFee: number;
    distanceFee: number;
    surgeFee: number;
    vehicleTypeFee: number;
    totalDeliveryFee: number;
  }> {
    const { pricingContext, distance, weight, vehicleType, orderType } = params;
    const { zone, surgeMultiplier } = pricingContext;
    
    // Base delivery fee from zone
    let baseDeliveryFee = parseFloat(zone.baseDeliveryFee);
    
    // Distance-based fee calculation
    const freeDistanceThreshold = 5; // First 5km included in base fee
    let distanceFee = 0;
    
    if (distance > freeDistanceThreshold) {
      const extraDistance = distance - freeDistanceThreshold;
      distanceFee = extraDistance * parseFloat(zone.perKilometerRate);
    }
    
    // Vehicle type adjustment
    let vehicleTypeFee = 0;
    try {
      const vehiclePricing = await db.select()
        .from(vehicleTypePricing)
        .where(
          and(
            eq(vehicleTypePricing.vehicleType, vehicleType),
            eq(vehicleTypePricing.serviceType, orderType),
            eq(vehicleTypePricing.isActive, true)
          )
        )
        .limit(1);
        
      if (vehiclePricing.length > 0) {
        const pricing = vehiclePricing[0];
        baseDeliveryFee *= parseFloat(pricing.baseFeeMultiplier);
        distanceFee *= parseFloat(pricing.perKilometerMultiplier);
        
        // Additional fees for weight/volume constraints
        if (pricing.maxWeightCapacity && weight > parseFloat(pricing.maxWeightCapacity)) {
          const overWeight = weight - parseFloat(pricing.maxWeightCapacity);
          vehicleTypeFee = overWeight * parseFloat(pricing.weightSurcharge || '0');
        }
      }
    } catch (error) {
      console.error('Error fetching vehicle type pricing:', error);
    }
    
    // Apply zone surcharge multiplier
    const zoneSurcharge = parseFloat(zone.surchargeMultiplier || '1.0') - 1;
    const zoneAdjustment = (baseDeliveryFee + distanceFee) * zoneSurcharge;
    
    // Calculate surge fee
    const baseFeeBeforeSurge = baseDeliveryFee + distanceFee + vehicleTypeFee + zoneAdjustment;
    let surgeFee = 0;
    
    if (surgeMultiplier > 1) {
      surgeFee = baseFeeBeforeSurge * (surgeMultiplier - 1);
    }
    
    const totalDeliveryFee = baseFeeBeforeSurge + surgeFee;
    
    return {
      baseDeliveryFee: Math.round(baseDeliveryFee + zoneAdjustment),
      distanceFee: Math.round(distanceFee),
      surgeFee: Math.round(surgeFee),
      vehicleTypeFee: Math.round(vehicleTypeFee),
      totalDeliveryFee: Math.round(totalDeliveryFee)
    };
  }
  
  /**
   * Calculate comprehensive service fees using database fee rules
   */
  private async calculateComprehensiveServiceFees(params: {
    baseAmount: number;
    orderType: OrderType;
    paymentMethod: PaymentMethodType;
    isExpress: boolean;
    zoneInfo: PricingZone;
    vendorId?: string;
  }): Promise<{
    serviceFee: number;
    processingFee: number;
    smallOrderFee: number;
    packagingFee: number;
    expressFee: number;
    paymentMethodFee: number;
    totalServiceFees: number;
  }> {
    const { baseAmount, orderType, paymentMethod, isExpress, zoneInfo, vendorId } = params;
    
    let serviceFee = 0;
    let processingFee = 0;
    let smallOrderFee = 0;
    let packagingFee = 0;
    let expressFee = 0;
    let paymentMethodFee = 0;
    
    try {
      // Get active fee rules for this service type
      const feeRulesData = await db.select()
        .from(feeRules)
        .where(
          and(
            eq(feeRules.isActive, true),
            sql`${feeRules.serviceTypes} @> ${JSON.stringify([orderType])}`,
            or(
              isNull(feeRules.effectiveTo),
              gte(feeRules.effectiveTo, new Date())
            )
          )
        )
        .orderBy(desc(feeRules.priority));
        
      // Process each fee rule
      for (const rule of feeRulesData) {
        const feeStructure = rule.feeStructure as any;
        let calculatedFee = 0;
        
        // Check if order meets minimum/maximum requirements
        if (rule.minimumOrderValue && baseAmount < parseFloat(rule.minimumOrderValue)) {
          continue;
        }
        if (rule.maximumOrderValue && baseAmount > parseFloat(rule.maximumOrderValue)) {
          continue;
        }
        
        // Calculate fee based on calculation type
        switch (rule.calculationType) {
          case 'percentage':
            calculatedFee = baseAmount * (feeStructure.rate || 0);
            break;
          case 'fixed':
            calculatedFee = feeStructure.amount || 0;
            break;
          case 'tiered':
            calculatedFee = this.calculateTieredFee(baseAmount, feeStructure.tiers || []);
            break;
          case 'conditional':
            calculatedFee = this.calculateConditionalFee(baseAmount, feeStructure.conditions || []);
            break;
        }
        
        // Apply minimum and maximum fee limits
        if (rule.minimumFee) {
          calculatedFee = Math.max(calculatedFee, parseFloat(rule.minimumFee));
        }
        if (rule.maximumFee) {
          calculatedFee = Math.min(calculatedFee, parseFloat(rule.maximumFee));
        }
        
        // Assign to appropriate fee category
        switch (rule.ruleType) {
          case 'service_fee':
            serviceFee += calculatedFee;
            break;
          case 'processing_fee':
            processingFee += calculatedFee;
            break;
          case 'small_order_fee':
            smallOrderFee += calculatedFee;
            break;
          case 'packaging_fee':
            packagingFee += calculatedFee;
            break;
        }
      }
      
      // Express delivery fee
      if (isExpress) {
        expressFee = Math.max(25, baseAmount * 0.05); // 5% or minimum ₱25
      }
      
      // Payment method fee
      const paymentFee = await this.calculatePaymentMethodFee(baseAmount, paymentMethod);
      paymentMethodFee = paymentFee;
      
    } catch (error) {
      console.error('Error calculating service fees:', error);
      // Fallback to default rates
      serviceFee = baseAmount * (this.DEFAULT_SERVICE_RATES[orderType] || 0.05);
      processingFee = this.DEFAULT_PROCESSING_FEES[orderType] || 10;
    }
    
    const totalServiceFees = serviceFee + processingFee + smallOrderFee + packagingFee + expressFee + paymentMethodFee;
    
    return {
      serviceFee: Math.round(serviceFee),
      processingFee: Math.round(processingFee),
      smallOrderFee: Math.round(smallOrderFee),
      packagingFee: Math.round(packagingFee),
      expressFee: Math.round(expressFee),
      paymentMethodFee: Math.round(paymentMethodFee),
      totalServiceFees: Math.round(totalServiceFees)
    };
  }
  
  /**
   * Calculate payment method specific fees
   */
  private async calculatePaymentMethodFee(amount: number, paymentMethod: PaymentMethodType): Promise<number> {
    if (paymentMethod === 'cash') {
      return 0; // No processing fee for cash
    }
    
    try {
      const paymentFees = await db.select()
        .from(paymentMethodFees)
        .where(
          and(
            eq(paymentMethodFees.paymentMethod, paymentMethod),
            eq(paymentMethodFees.isActive, true)
          )
        )
        .limit(1);
        
      if (paymentFees.length > 0) {
        const feeRule = paymentFees[0];
        let fee = 0;
        
        // Check if amount is above free threshold
        if (feeRule.freeThreshold && amount >= parseFloat(feeRule.freeThreshold)) {
          return 0;
        }
        
        switch (feeRule.feeCalculation) {
          case 'percentage':
            fee = amount * parseFloat(feeRule.feeValue);
            break;
          case 'fixed':
            fee = parseFloat(feeRule.feeValue);
            break;
          case 'hybrid':
            // Could implement hybrid calculation (fixed + percentage)
            fee = parseFloat(feeRule.feeValue) + (amount * 0.01); // Example
            break;
        }
        
        // Apply minimum and maximum fee limits
        if (feeRule.minimumFee) {
          fee = Math.max(fee, parseFloat(feeRule.minimumFee));
        }
        if (feeRule.maximumFee) {
          fee = Math.min(fee, parseFloat(feeRule.maximumFee));
        }
        
        return fee;
      }
    } catch (error) {
      console.error('Error calculating payment method fee:', error);
    }
    
    // Default payment processing fees
    const defaultFees = {
      gcash: amount * 0.02, // 2%
      maya: amount * 0.025, // 2.5%
      card: amount * 0.035, // 3.5%
      bank_transfer: 15 // Fixed ₱15
    };
    
    return defaultFees[paymentMethod] || 0;
  }
  
  /**
   * Calculate tiered fees based on amount brackets
   */
  private calculateTieredFee(amount: number, tiers: any[]): number {
    for (const tier of tiers) {
      if (amount >= tier.minAmount && (!tier.maxAmount || amount <= tier.maxAmount)) {
        if (tier.type === 'percentage') {
          return amount * tier.rate;
        } else {
          return tier.amount;
        }
      }
    }
    return 0;
  }
  
  /**
   * Calculate conditional fees based on complex conditions
   */
  private calculateConditionalFee(amount: number, conditions: any[]): number {
    // Implementation for conditional fee calculation based on various conditions
    // This could include time-based conditions, volume conditions, etc.
    return 0; // Simplified for now
  }
  
  /**
   * Enhanced insurance fee calculation with database rules
   */
  private async calculateInsuranceFee(params: {
    baseAmount: number;
    orderType: OrderType;
    isInsured: boolean;
    weight: number;
    isHighValue: boolean;
  }): Promise<number> {
    const { baseAmount, orderType, isInsured, weight, isHighValue } = params;
    
    if (!isInsured && !isHighValue && orderType !== 'parcel') {
      return 0;
    }
    
    // Auto-insure high-value orders or parcels over certain weight
    const shouldAutoInsure = isHighValue || (orderType === 'parcel' && weight > 5) || baseAmount > 5000;
    
    if (!isInsured && !shouldAutoInsure) {
      return 0;
    }
    
    try {
      // Try to get insurance fee rules from database
      const insuranceRules = await db.select()
        .from(feeRules)
        .where(
          and(
            eq(feeRules.ruleType, 'insurance_fee'),
            eq(feeRules.isActive, true),
            sql`${feeRules.serviceTypes} @> ${JSON.stringify([orderType])}`
          )
        )
        .limit(1);
        
      if (insuranceRules.length > 0) {
        const rule = insuranceRules[0];
        const feeStructure = rule.feeStructure as any;
        
        let fee = 0;
        if (feeStructure.type === 'percentage') {
          fee = baseAmount * feeStructure.rate;
        } else {
          fee = feeStructure.amount;
        }
        
        // Apply min/max limits
        if (rule.minimumFee) fee = Math.max(fee, parseFloat(rule.minimumFee));
        if (rule.maximumFee) fee = Math.min(fee, parseFloat(rule.maximumFee));
        
        return Math.round(fee);
      }
    } catch (error) {
      console.error('Error calculating insurance fee:', error);
    }
    
    // Fallback calculation when database rules are not available
    const insuranceFee = Math.max(20, Math.min(500, Math.round(baseAmount * 0.01)));
    return insuranceFee;
  }

  /**
   * Calculate insurance fee for parcels and high-value orders (legacy method)
   */
  private calculateLegacyInsuranceFee(amount: number, orderType: OrderType, isInsured: boolean): number | undefined {
    if (!isInsured && orderType !== 'parcel') return undefined;
    
    // Auto-insure high-value orders
    const shouldAutoInsure = amount > 5000 || (orderType === 'parcel' && amount > 1000);
    
    if (isInsured || shouldAutoInsure) {
      // Insurance fee: 1% of order value, minimum ₱20, maximum ₱500
      const insuranceFee = Math.max(20, Math.min(500, Math.round(amount * 0.01)));
      return insuranceFee;
    }
    
    return undefined;
  }

  /**
   * Calculate comprehensive discounts
   */
  private async calculateDiscounts(params: {
    totalAmount: number;
    loyaltyPoints?: number;
    promoCode?: string;
    orderType: OrderType;
  }): Promise<DiscountInfo> {
    const { totalAmount, loyaltyPoints = 0, promoCode, orderType } = params;
    
    let promotionalDiscount = 0;
    let loyaltyPointsDiscount = 0;
    let couponDiscount = 0;

    // Loyalty points discount (1 point = ₱1)
    const maxLoyaltyDiscount = Math.min(loyaltyPoints, totalAmount * 0.3); // Max 30% discount
    loyaltyPointsDiscount = Math.min(loyaltyPoints, maxLoyaltyDiscount);

    // Promotional discount (would integrate with actual promo system)
    if (promoCode) {
      promotionalDiscount = await this.calculatePromoDiscount(promoCode, totalAmount, orderType);
    }

    // Coupon discount (placeholder for future coupon system)
    couponDiscount = 0;

    const totalDiscounts = promotionalDiscount + loyaltyPointsDiscount + couponDiscount;

    return {
      promotionalDiscount,
      loyaltyPointsDiscount,
      couponDiscount,
      volumeDiscount: 0,
      firstTimeUserDiscount: 0,
      referralDiscount: 0,
      vendorPromoDiscount: 0,
      seasonalDiscount: 0,
      groupOrderDiscount: 0,
      totalDiscounts,
      appliedPromotions: []
    };
  }

  /**
   * Calculate promotional discount based on promo code
   */
  private async calculatePromoDiscount(promoCode: string, totalAmount: number, orderType: OrderType): Promise<number> {
    // Mock promo codes - in real system, this would query database
    const promoCodes: Record<string, {
      type: 'percentage' | 'fixed';
      value: number;
      minOrder: number;
      maxDiscount: number;
      orderTypes: OrderType[];
      isActive: boolean;
    }> = {
      'FIRST20': {
        type: 'percentage',
        value: 20,
        minOrder: 200,
        maxDiscount: 100,
        orderTypes: ['food', 'pabili', 'pabayad', 'parcel'],
        isActive: true
      },
      'FOOD10': {
        type: 'percentage', 
        value: 10,
        minOrder: 300,
        maxDiscount: 150,
        orderTypes: ['food'],
        isActive: true
      },
      'NEWBIE50': {
        type: 'fixed',
        value: 50,
        minOrder: 250,
        maxDiscount: 50,
        orderTypes: ['food', 'pabili'],
        isActive: true
      }
    };

    const promo = promoCodes[promoCode.toUpperCase()];
    
    if (!promo || !promo.isActive || totalAmount < promo.minOrder || !promo.orderTypes.includes(orderType)) {
      return 0;
    }

    if (promo.type === 'percentage') {
      const discount = Math.round(totalAmount * (promo.value / 100));
      return Math.min(discount, promo.maxDiscount);
    } else {
      return Math.min(promo.value, promo.maxDiscount);
    }
  }

  /**
   * Calculate commission breakdown for different parties
   */
  calculateCommissions(params: {
    orderTotal: number;
    deliveryFee: number;
    serviceFee: number;
    orderType: OrderType;
  }) {
    const { orderTotal, deliveryFee, serviceFee, orderType } = params;

    const restaurantCommission = Math.round(orderTotal * this.COMMISSION_RATES.restaurant);
    const riderEarnings = Math.round(deliveryFee * this.COMMISSION_RATES.rider);
    const platformFee = Math.round(serviceFee * this.COMMISSION_RATES.platform);

    let vendorCommission = 0;
    if (orderType === 'pabili') {
      vendorCommission = Math.round(orderTotal * this.COMMISSION_RATES.pabiliVendor);
    }

    return {
      restaurantCommission: orderType === 'food' ? restaurantCommission : 0,
      vendorCommission,
      riderEarnings,
      platformFee,
      totalCommissions: restaurantCommission + vendorCommission + riderEarnings + platformFee
    };
  }

  /**
   * Get dynamic pricing based on current conditions
   */
  async getDynamicPricing(city: string | null, orderType: OrderType): Promise<{
    baseDeliveryFee: number;
    currentMultiplier: number;
    isHighDemand: boolean;
    estimatedWaitTime: string;
  }> {
    const cityName = city || 'Other';
    const locationPricing = this.LOCATION_PRICING.find((loc: LocationPricing) => 
      loc.city.toLowerCase() === cityName.toLowerCase()
    ) || this.LOCATION_PRICING.find((loc: LocationPricing) => loc.city === 'Other')!;;

    // Check current time for peak hour detection
    const now = new Date();
    const hour = now.getHours();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    let multiplier = 1.0;
    let isHighDemand = false;
    let waitTime = '15-25 minutes';

    // Apply peak hour multipliers
    if (hour >= 11 && hour <= 14) {
      multiplier *= this.PEAK_HOUR_MULTIPLIERS.lunch;
      isHighDemand = true;
      waitTime = '25-35 minutes';
    } else if (hour >= 18 && hour <= 21) {
      multiplier *= this.PEAK_HOUR_MULTIPLIERS.dinner;
      isHighDemand = true;
      waitTime = '30-45 minutes';
    } else if (hour >= 21) {
      multiplier *= this.PEAK_HOUR_MULTIPLIERS.lateNight;
      waitTime = '20-30 minutes';
    }

    if (isWeekend) {
      multiplier *= this.PEAK_HOUR_MULTIPLIERS.weekend;
      waitTime = '25-40 minutes';
    }

    return {
      baseDeliveryFee: Math.round(locationPricing.baseDeliveryFee * multiplier),
      currentMultiplier: multiplier,
      isHighDemand,
      estimatedWaitTime: waitTime
    };
  }

  /**
   * Validate pricing calculation
   */
  validatePricing(calculation: PricingCalculation): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate positive amounts
    if (calculation.baseAmount <= 0) {
      errors.push('Base amount must be greater than 0');
    }

    if (calculation.finalTotal <= 0) {
      errors.push('Final total must be greater than 0');
    }

    // Validate reasonable ranges
    if (calculation.serviceFees.deliveryFee > 1000) {
      errors.push('Delivery fee seems too high');
    }

    if (calculation.discounts.totalDiscounts > calculation.breakdown.totalBeforeDiscounts) {
      errors.push('Total discounts cannot exceed order total');
    }

    // Validate calculation accuracy
    const expectedTotal = calculation.breakdown.totalBeforeDiscounts - calculation.discounts.totalDiscounts;
    if (Math.abs(calculation.finalTotal - expectedTotal) > 0.01) {
      errors.push('Pricing calculation mismatch');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate taxes with regulatory compliance for Philippines market
   */
  private async calculateTaxesWithCompliance(params: {
    baseAmount: number;
    deliveryFee: number;
    serviceFees: any;
    orderType: OrderType;
    zoneInfo: PricingZone;
    vendorId?: string;
    customerId?: string;
  }): Promise<{
    vatAmount: number;
    withholdingTax: number;
    localTax: number;
    totalTax: number;
  }> {
    const { baseAmount, deliveryFee, serviceFees, orderType, zoneInfo, vendorId, customerId } = params;
    
    let vatAmount = 0;
    let withholdingTax = 0;
    let localTax = 0;
    
    try {
      // Get active tax rules
      const taxRulesData = await db.select()
        .from(taxRules)
        .where(
          and(
            eq(taxRules.isActive, true),
            sql`${taxRules.applicableServices} @> ${JSON.stringify([orderType])}`,
            or(
              isNull(taxRules.effectiveTo),
              gte(taxRules.effectiveTo, new Date())
            )
          )
        );
        
      for (const rule of taxRulesData) {
        const taxRate = parseFloat(rule.taxRate);
        
        // Determine taxable amount based on tax type
        let taxableAmount = 0;
        
        switch (rule.taxType) {
          case 'vat':
            // VAT applies to service fees and delivery fees, not food items
            taxableAmount = serviceFees.totalServiceFees + deliveryFee;
            vatAmount += taxableAmount * taxRate;
            break;
            
          case 'withholding':
            // Withholding tax on vendor payments (if applicable)
            if (vendorId && ['food', 'pabili'].includes(orderType)) {
              taxableAmount = baseAmount;
              withholdingTax += taxableAmount * taxRate;
            }
            break;
            
          case 'local_tax':
            // Local government tax
            taxableAmount = baseAmount + serviceFees.totalServiceFees;
            localTax += taxableAmount * taxRate;
            break;
        }
        
        // Apply minimum and maximum amounts if specified
        if (rule.minimumAmount && taxableAmount < parseFloat(rule.minimumAmount)) {
          continue;
        }
        if (rule.maximumAmount && taxableAmount > parseFloat(rule.maximumAmount)) {
          // Cap the taxable amount
          taxableAmount = parseFloat(rule.maximumAmount);
        }
      }
      
    } catch (error) {
      console.error('Error calculating taxes:', error);
      // Fallback to standard Philippines VAT (12%)
      const taxableAmount = serviceFees.totalServiceFees + deliveryFee;
      vatAmount = taxableAmount * this.VAT_RATE;
    }
    
    return {
      vatAmount: Math.round(vatAmount),
      withholdingTax: Math.round(withholdingTax),
      localTax: Math.round(localTax),
      totalTax: Math.round(vatAmount + withholdingTax + localTax)
    };
  }
  
  /**
   * Calculate comprehensive discounts and promotions
   */
  private async calculateComprehensiveDiscounts(params: {
    totalAmount: number;
    baseAmount: number;
    orderType: OrderType;
    loyaltyPoints: number;
    promoCodes: string[];
    customerId?: string;
    vendorId?: string;
    isFirstOrder: boolean;
    pricingContext: DynamicPricingContext;
  }): Promise<EnhancedDiscountInfo> {
    const { 
      totalAmount, baseAmount, orderType, loyaltyPoints, promoCodes, 
      customerId, vendorId, isFirstOrder, pricingContext 
    } = params;
    
    let promotionalDiscount = 0;
    let loyaltyPointsDiscount = 0;
    let couponDiscount = 0;
    let volumeDiscount = 0;
    let firstTimeUserDiscount = 0;
    let referralDiscount = 0;
    let vendorPromoDiscount = 0;
    let seasonalDiscount = 0;
    let groupOrderDiscount = 0;
    
    const appliedPromotions: any[] = [];
    
    try {
      // 1. Loyalty points discount (1 point = ₱1)
      const maxLoyaltyDiscount = Math.min(loyaltyPoints, totalAmount * 0.3); // Max 30% discount
      loyaltyPointsDiscount = Math.min(loyaltyPoints, maxLoyaltyDiscount);
      
      // 2. First-time user discount
      if (isFirstOrder) {
        firstTimeUserDiscount = Math.min(100, totalAmount * 0.15); // 15% or max ₱100
        appliedPromotions.push({
          code: 'FIRST_ORDER',
          name: 'First Order Discount',
          type: 'first_time_user',
          value: 15,
          discountAmount: firstTimeUserDiscount
        });
      }
      
      // 3. Promotional codes
      for (const promoCode of promoCodes) {
        const discount = await this.calculatePromoCodeDiscount(promoCode, totalAmount, orderType, pricingContext);
        if (discount.amount > 0) {
          promotionalDiscount += discount.amount;
          appliedPromotions.push(discount.details);
        }
      }
      
      // 4. Volume discount (for large orders)
      if (baseAmount > 2000) {
        const volumeRate = Math.min(0.10, (baseAmount - 2000) / 10000); // Up to 10% for very large orders
        volumeDiscount = baseAmount * volumeRate;
        appliedPromotions.push({
          code: 'VOLUME_DISCOUNT',
          name: 'Large Order Discount',
          type: 'volume',
          value: volumeRate * 100,
          discountAmount: volumeDiscount
        });
      }
      
    } catch (error) {
      console.error('Error calculating discounts:', error);
    }
    
    const totalDiscounts = promotionalDiscount + loyaltyPointsDiscount + couponDiscount + 
                          volumeDiscount + firstTimeUserDiscount + referralDiscount + 
                          vendorPromoDiscount + seasonalDiscount + groupOrderDiscount;
    
    // Ensure discounts don't exceed reasonable limits
    const maxTotalDiscount = totalAmount * 0.8; // Maximum 80% discount
    const finalTotalDiscounts = Math.min(totalDiscounts, maxTotalDiscount);
    
    return {
      promotionalDiscount: Math.round(promotionalDiscount),
      loyaltyPointsDiscount: Math.round(loyaltyPointsDiscount),
      couponDiscount: Math.round(couponDiscount),
      volumeDiscount: Math.round(volumeDiscount),
      firstTimeUserDiscount: Math.round(firstTimeUserDiscount),
      referralDiscount: Math.round(referralDiscount),
      vendorPromoDiscount: Math.round(vendorPromoDiscount),
      seasonalDiscount: Math.round(seasonalDiscount),
      groupOrderDiscount: Math.round(groupOrderDiscount),
      totalDiscounts: Math.round(finalTotalDiscounts),
      appliedPromotions
    };
  }
  
  /**
   * Calculate promotional code discounts
   */
  private async calculatePromoCodeDiscount(
    promoCode: string, 
    totalAmount: number, 
    orderType: OrderType, 
    pricingContext: DynamicPricingContext
  ): Promise<{ amount: number; details: any }> {
    try {
      const promotions = await db.select()
        .from(promotionRules)
        .where(
          and(
            eq(promotionRules.promotionCode, promoCode),
            eq(promotionRules.isActive, true),
            lte(promotionRules.validFrom, new Date()),
            gte(promotionRules.validUntil, new Date())
          )
        )
        .limit(1);
        
      if (promotions.length === 0) {
        return { amount: 0, details: null };
      }
      
      const promotion = promotions[0];
      
      // Check eligibility criteria
      const serviceTypes = promotion.serviceTypes as string[] | null;
      if (serviceTypes && !serviceTypes.includes(orderType)) {
        return { amount: 0, details: null };
      }
      
      if (promotion.minimumOrderValue && totalAmount < parseFloat(promotion.minimumOrderValue)) {
        return { amount: 0, details: null };
      }
      
      // Calculate discount
      let discountAmount = 0;
      const discountValue = parseFloat(promotion.discountValue || '0');
      
      switch (promotion.discountType) {
        case 'percentage':
          discountAmount = totalAmount * (discountValue / 100);
          break;
        case 'fixed':
          discountAmount = discountValue;
          break;
      }
      
      // Apply maximum discount limit
      if (promotion.maximumDiscountAmount) {
        discountAmount = Math.min(discountAmount, parseFloat(promotion.maximumDiscountAmount));
      }
      
      return {
        amount: discountAmount,
        details: {
          code: promotion.promotionCode,
          name: promotion.name,
          type: promotion.promotionType,
          value: discountValue,
          discountAmount
        }
      };
      
    } catch (error) {
      console.error('Error calculating promo code discount:', error);
      return { amount: 0, details: null };
    }
  }
  
  /**
   * Calculate advanced commission breakdown for all parties
   */
  private async calculateAdvancedCommissions(params: {
    orderTotal: number;
    baseAmount: number;
    deliveryFeeBreakdown: any;
    serviceFeeBreakdown: any;
    orderType: OrderType;
    vendorId?: string;
    pricingContext: DynamicPricingContext;
  }): Promise<CommissionBreakdown> {
    const { 
      orderTotal, baseAmount, deliveryFeeBreakdown, serviceFeeBreakdown, 
      orderType, vendorId, pricingContext 
    } = params;
    
    let vendorCommission = 0;
    let vendorCommissionRate = 0;
    let riderEarnings = 0;
    let riderEarningsRate = 0;
    let platformFee = 0;
    
    try {
      // 1. Calculate vendor commission using database rules
      if (vendorId && ['food', 'pabili'].includes(orderType)) {
        const commissionResult = await this.calculateVendorCommission(vendorId, baseAmount, orderType);
        vendorCommission = commissionResult.amount;
        vendorCommissionRate = commissionResult.rate;
      }
      
      // 2. Calculate rider earnings using database rules
      const riderResult = await this.calculateRiderEarnings(
        deliveryFeeBreakdown.totalDeliveryFee,
        pricingContext
      );
      riderEarnings = riderResult.amount;
      riderEarningsRate = riderResult.rate;
      
      // 3. Calculate platform fee
      platformFee = serviceFeeBreakdown.totalServiceFees * 0.3; // Platform keeps 30% of service fees
      
    } catch (error) {
      console.error('Error calculating commissions:', error);
      // Fallback to default rates
      vendorCommissionRate = this.DEFAULT_COMMISSION_RATES.restaurant;
      vendorCommission = baseAmount * vendorCommissionRate;
      riderEarningsRate = this.DEFAULT_COMMISSION_RATES.rider;
      riderEarnings = deliveryFeeBreakdown.totalDeliveryFee * riderEarningsRate;
      platformFee = serviceFeeBreakdown.totalServiceFees * this.DEFAULT_COMMISSION_RATES.platform;
    }
    
    const platformRevenue = orderTotal - vendorCommission - riderEarnings;
    const totalCommissions = vendorCommission + riderEarnings + platformFee;
    
    return {
      vendorCommission: Math.round(vendorCommission),
      vendorCommissionRate,
      riderEarnings: Math.round(riderEarnings),
      riderEarningsRate,
      platformRevenue: Math.round(platformRevenue),
      platformFee: Math.round(platformFee),
      totalCommissions: Math.round(totalCommissions)
    };
  }
  
  /**
   * Calculate vendor commission using tiered commission rules
   */
  private async calculateVendorCommission(vendorId: string, amount: number, orderType: OrderType): Promise<{
    amount: number;
    rate: number;
  }> {
    try {
      // For now, use basic rate (would implement tier qualification logic)
      const defaultRate = this.DEFAULT_COMMISSION_RATES.restaurant;
      return {
        amount: amount * defaultRate,
        rate: defaultRate
      };
      
    } catch (error) {
      console.error('Error calculating vendor commission:', error);
      const defaultRate = this.DEFAULT_COMMISSION_RATES.restaurant;
      return {
        amount: amount * defaultRate,
        rate: defaultRate
      };
    }
  }
  
  /**
   * Calculate rider earnings using earning rules and performance bonuses
   */
  private async calculateRiderEarnings(deliveryFee: number, pricingContext: DynamicPricingContext): Promise<{
    amount: number;
    rate: number;
  }> {
    try {
      let baseRate = this.DEFAULT_COMMISSION_RATES.rider;
      let earnings = deliveryFee * baseRate;
      
      // Apply surge multiplier to rider earnings
      if (pricingContext.surgeMultiplier > 1) {
        earnings *= pricingContext.surgeMultiplier;
      }
      
      return {
        amount: earnings,
        rate: baseRate
      };
      
    } catch (error) {
      console.error('Error calculating rider earnings:', error);
      const defaultRate = this.DEFAULT_COMMISSION_RATES.rider;
      return {
        amount: deliveryFee * defaultRate,
        rate: defaultRate
      };
    }
  }
  
  /**
   * Store fee calculation in database for audit trail
   */
  private async storeFeeCalculation(params: {
    orderType: OrderType;
    baseAmount: number;
    serviceFees: EnhancedServiceFees;
    breakdown: PriceBreakdown;
    commissionBreakdown: CommissionBreakdown;
    pricingContext: DynamicPricingContext;
    calculationType: string;
    orderId?: string;
  }): Promise<void> {
    try {
      // Only store fee calculation if orderId is provided (required field in database)
      if (!params.orderId) {
        console.log('Skipping fee calculation storage: orderId not provided');
        return;
      }
      
      const feeCalculation: InsertFeeCalculation = {
        orderId: params.orderId,
        calculationType: params.calculationType,
        pricingSnapshot: params.pricingContext,
        baseAmount: params.baseAmount.toString(),
        
        // Delivery fees
        deliveryFee: params.breakdown.totalDeliveryFee.toString(),
        distanceFee: params.breakdown.distanceFee.toString(),
        surgeFee: params.breakdown.surgeFee.toString(),
        vehicleTypeFee: params.breakdown.vehicleTypeFee.toString(),
        
        // Service fees
        serviceFee: params.breakdown.serviceFee.toString(),
        processingFee: params.breakdown.processingFee.toString(),
        smallOrderFee: params.breakdown.smallOrderFee.toString(),
        packagingFee: params.breakdown.packagingFee.toString(),
        insuranceFee: params.breakdown.insuranceFee.toString(),
        expressFee: params.breakdown.expressFee.toString(),
        paymentMethodFee: params.breakdown.paymentMethodFee.toString(),
        
        // Subtotals
        subtotalBeforeTax: params.breakdown.subtotalBeforeTax.toString(),
        
        // Taxes
        vatAmount: params.breakdown.vatAmount.toString(),
        withholdingTax: params.breakdown.withholdingTax.toString(),
        localTax: params.breakdown.localTax.toString(),
        totalTax: params.breakdown.totalTax.toString(),
        
        // Discounts
        promotionalDiscount: '0', // Would be populated from discount calculation
        loyaltyDiscount: '0',
        couponDiscount: '0',
        volumeDiscount: '0',
        totalDiscount: params.breakdown.totalDiscounts.toString(),
        
        // Final amount
        finalAmount: params.breakdown.finalTotal.toString(),
        tip: params.serviceFees.tip.toString(),
        
        // Commissions
        vendorCommission: params.commissionBreakdown.vendorCommission.toString(),
        riderEarnings: params.commissionBreakdown.riderEarnings.toString(),
        platformRevenue: params.commissionBreakdown.platformRevenue.toString(),
        
        calculatedAt: new Date(),
        calculatedBy: 'enhanced_pricing_service',
        isActive: true
      };
      
      await db.insert(feeCalculations).values(feeCalculation);
      
    } catch (error) {
      console.error('Error storing fee calculation:', error);
      // Don't throw error - this is for audit purposes only
    }
  }
  
  /**
   * Basic pricing calculation for fallback scenarios
   */
  private async calculateBasicPricing(params: any): Promise<any> {
    // This implements the original basic pricing logic as fallback
    const basicServiceFees = {
      basePrice: params.baseAmount,
      deliveryFee: 50,
      serviceFee: params.baseAmount * 0.05,
      processingFee: 10,
      insuranceFee: 0,
      tip: params.tip || 0,
      tax: (params.baseAmount * 0.05 + 10) * 0.12,
      totalFees: 0,
      finalAmount: 0
    };
    
    const subtotal = basicServiceFees.basePrice + basicServiceFees.deliveryFee + 
                     basicServiceFees.serviceFee + basicServiceFees.processingFee + 
                     basicServiceFees.tip;
    const total = subtotal + basicServiceFees.tax;
    
    basicServiceFees.totalFees = basicServiceFees.deliveryFee + basicServiceFees.serviceFee + 
                                 basicServiceFees.processingFee + basicServiceFees.tax;
    basicServiceFees.finalAmount = total;
    
    return {
      orderType: params.orderType,
      baseAmount: params.baseAmount,
      serviceFees: basicServiceFees,
      discounts: {
        promotionalDiscount: 0,
        loyaltyPointsDiscount: 0,
        couponDiscount: 0,
        totalDiscounts: 0
      },
      breakdown: {
        itemsSubtotal: params.baseAmount,
        deliveryFee: basicServiceFees.deliveryFee,
        serviceFee: basicServiceFees.serviceFee,
        processingFee: basicServiceFees.processingFee,
        insuranceFee: basicServiceFees.insuranceFee,
        tip: basicServiceFees.tip,
        subtotalBeforeTax: subtotal,
        tax: basicServiceFees.tax,
        totalBeforeDiscounts: total,
        totalDiscounts: 0,
        finalTotal: total
      },
      finalTotal: total
    };
  }
}

// Singleton instances - export both for compatibility
export const enhancedPricingService = new EnhancedPricingService();
export const pricingService = enhancedPricingService; // Backward compatibility