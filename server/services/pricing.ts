// BTS Delivery Platform - Comprehensive Pricing and Fee Calculation Service
// Supports all order types: Food, Pabili, Pabayad, Parcel delivery

export interface ServiceFees {
  basePrice: number;
  deliveryFee: number;
  serviceFee: number;
  processingFee: number;
  insuranceFee?: number;
  tip?: number;
  tax: number;
  totalFees: number;
  finalAmount: number;
}

export interface DiscountInfo {
  promotionalDiscount: number;
  loyaltyPointsDiscount: number;
  couponDiscount: number;
  totalDiscounts: number;
}

export interface PricingCalculation {
  orderType: OrderType;
  baseAmount: number;
  serviceFees: ServiceFees;
  discounts: DiscountInfo;
  breakdown: PriceBreakdown;
  finalTotal: number;
}

export interface PriceBreakdown {
  itemsSubtotal: number;
  deliveryFee: number;
  serviceFee: number;
  processingFee: number;
  insuranceFee?: number;
  tip?: number;
  subtotalBeforeTax: number;
  tax: number;
  totalBeforeDiscounts: number;
  totalDiscounts: number;
  finalTotal: number;
}

export interface LocationPricing {
  city: string;
  baseDeliveryFee: number;
  extraDistanceFee: number; // per km
  maxDistance: number; // km
  surchargeMultiplier: number; // for high-traffic areas
}

export type OrderType = 'food' | 'pabili' | 'pabayad' | 'parcel';

export class PricingService {
  // Philippines VAT rate (12%)
  private readonly VAT_RATE = 0.12;
  
  // Base service fee rates by order type
  private readonly BASE_SERVICE_RATES = {
    food: 0.05, // 5% of order value
    pabili: 0.10, // 10% procurement fee
    pabayad: 0.03, // 3% convenience fee
    parcel: 0.08, // 8% handling fee
  };

  // Processing fees (fixed amounts in PHP)
  private readonly PROCESSING_FEES = {
    food: 10,
    pabili: 15,
    pabayad: 5,
    parcel: 12,
  };

  // Location-based delivery pricing
  private readonly LOCATION_PRICING: LocationPricing[] = [
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

  // Commission rates for different service types
  private readonly COMMISSION_RATES = {
    restaurant: 0.15, // 15% commission from restaurants
    pabiliVendor: 0.10, // 10% commission from Pabili vendors
    rider: 0.20, // 20% goes to rider from delivery fee
    platform: 0.05, // 5% platform fee
  };

  // Peak hour multipliers
  private readonly PEAK_HOUR_MULTIPLIERS = {
    lunch: 1.2, // 11 AM - 2 PM
    dinner: 1.3, // 6 PM - 9 PM
    lateNight: 1.5, // 9 PM - 12 AM
    weekend: 1.1, // Saturday & Sunday
  };

  // Weather surge pricing
  private readonly WEATHER_SURGE = {
    rain: 1.2,
    heavyRain: 1.5,
    typhoon: 2.0,
    flood: 2.5,
  };

  /**
   * Calculate comprehensive pricing for any order type
   */
  async calculatePricing(params: {
    orderType: OrderType;
    baseAmount: number;
    city: string;
    distance?: number; // km
    weight?: number; // kg (for parcel)
    isInsured?: boolean;
    isPeakHour?: boolean;
    weatherCondition?: string;
    loyaltyPoints?: number;
    promoCode?: string;
    tip?: number;
    customServiceFeeRate?: number;
  }): Promise<PricingCalculation> {
    
    const {
      orderType,
      baseAmount,
      city,
      distance = 5,
      weight = 1,
      isInsured = false,
      isPeakHour = false,
      weatherCondition,
      loyaltyPoints = 0,
      promoCode,
      tip = 0,
      customServiceFeeRate
    } = params;

    // 1. Calculate base delivery fee
    const deliveryFee = this.calculateDeliveryFee(city, distance, orderType, weight, isPeakHour, weatherCondition);
    
    // 2. Calculate service fee
    const serviceFeeRate = customServiceFeeRate || this.BASE_SERVICE_RATES[orderType];
    const serviceFee = Math.round(baseAmount * serviceFeeRate);
    
    // 3. Calculate processing fee
    const processingFee = this.PROCESSING_FEES[orderType];
    
    // 4. Calculate insurance fee (for parcel or high-value orders)
    const insuranceFee = this.calculateInsuranceFee(baseAmount, orderType, isInsured);
    
    // 5. Calculate subtotal before tax
    const subtotalBeforeTax = baseAmount + deliveryFee + serviceFee + processingFee + (insuranceFee || 0) + tip;
    
    // 6. Calculate VAT (applied to service fees only, not on food items)
    const taxableAmount = serviceFee + processingFee + (insuranceFee || 0);
    const tax = Math.round(taxableAmount * this.VAT_RATE);
    
    // 7. Calculate total before discounts
    const totalBeforeDiscounts = subtotalBeforeTax + tax;
    
    // 8. Calculate discounts
    const discounts = await this.calculateDiscounts({
      totalAmount: totalBeforeDiscounts,
      loyaltyPoints,
      promoCode,
      orderType
    });
    
    // 9. Calculate final total
    const finalTotal = Math.max(0, totalBeforeDiscounts - discounts.totalDiscounts);

    // Build comprehensive response
    const serviceFees: ServiceFees = {
      basePrice: baseAmount,
      deliveryFee,
      serviceFee,
      processingFee,
      insuranceFee,
      tip,
      tax,
      totalFees: deliveryFee + serviceFee + processingFee + (insuranceFee || 0) + tax,
      finalAmount: finalTotal
    };

    const breakdown: PriceBreakdown = {
      itemsSubtotal: baseAmount,
      deliveryFee,
      serviceFee,
      processingFee,
      insuranceFee,
      tip,
      subtotalBeforeTax,
      tax,
      totalBeforeDiscounts,
      totalDiscounts: discounts.totalDiscounts,
      finalTotal
    };

    return {
      orderType,
      baseAmount,
      serviceFees,
      discounts,
      breakdown,
      finalTotal
    };
  }

  /**
   * Calculate delivery fee based on location, distance, and conditions
   */
  private calculateDeliveryFee(
    city: string, 
    distance: number, 
    orderType: OrderType, 
    weight: number, 
    isPeakHour: boolean, 
    weatherCondition?: string
  ): number {
    // Get location pricing
    const locationPricing = this.LOCATION_PRICING.find(loc => 
      loc.city.toLowerCase() === city.toLowerCase()
    ) || this.LOCATION_PRICING.find(loc => loc.city === 'Other')!;

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
   * Calculate insurance fee for parcels and high-value orders
   */
  private calculateInsuranceFee(amount: number, orderType: OrderType, isInsured: boolean): number | undefined {
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
      totalDiscounts
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
  async getDynamicPricing(city: string, orderType: OrderType): Promise<{
    baseDeliveryFee: number;
    currentMultiplier: number;
    isHighDemand: boolean;
    estimatedWaitTime: string;
  }> {
    const locationPricing = this.LOCATION_PRICING.find(loc => 
      loc.city.toLowerCase() === city.toLowerCase()
    ) || this.LOCATION_PRICING.find(loc => loc.city === 'Other')!;

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
}

// Singleton instance
export const pricingService = new PricingService();