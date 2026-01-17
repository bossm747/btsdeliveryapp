/**
 * Philippine Tax Compliance Service
 *
 * Implements BIR-compliant tax calculations including:
 * - 12% VAT (Value Added Tax)
 * - Senior Citizen Discount (20% + VAT exempt)
 * - PWD (Person with Disability) Discount (20% + VAT exempt)
 * - Withholding Tax on vendor payments (1-2%)
 */

import { db } from "../db";
import { eq, and, gte, lte, isNull, or, desc } from "drizzle-orm";
import {
  taxRates,
  customerTaxExemptions,
  taxInvoices,
  vendorTaxReports,
  orders,
  users,
  restaurants,
  TAX_TYPES,
  TAX_EXEMPTION_TYPES,
  TAX_EXEMPTION_STATUSES,
  type CustomerTaxExemption,
  type TaxInvoice,
  type VendorTaxReport
} from "@shared/schema";
import { nanoid } from "nanoid";

// Philippine Tax Constants
export const PH_TAX_CONSTANTS = {
  // Standard VAT rate
  VAT_RATE: 0.12, // 12%

  // Senior/PWD discount rate (applied before VAT exemption)
  SENIOR_PWD_DISCOUNT_RATE: 0.20, // 20%

  // Withholding tax rates for vendor payments
  WITHHOLDING_RATE_GOODS: 0.01, // 1% for goods
  WITHHOLDING_RATE_SERVICES: 0.02, // 2% for services

  // Minimum amount for withholding tax
  WITHHOLDING_MINIMUM_AMOUNT: 10000, // PHP 10,000

  // VAT threshold for registration
  VAT_REGISTRATION_THRESHOLD: 3000000, // PHP 3,000,000 annual gross sales
} as const;

// Interfaces
export interface TaxCalculationInput {
  subtotal: number;
  deliveryFee?: number;
  serviceFee?: number;
  exemptionType?: 'senior' | 'pwd' | 'diplomatic' | null;
  customerId?: string;
  vendorId?: string;
  isVatRegistered?: boolean;
}

export interface TaxCalculationResult {
  // Input amounts
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;

  // Tax breakdown
  vatableAmount: number;
  vatExemptAmount: number;
  vatAmount: number;

  // Discounts
  seniorDiscount: number;
  pwdDiscount: number;
  totalDiscount: number;

  // Exemption info
  exemptionType: string | null;
  exemptionApplied: boolean;

  // Final totals
  grossAmount: number;
  netAmount: number;

  // For display
  breakdown: TaxBreakdownLine[];
}

export interface TaxBreakdownLine {
  label: string;
  amount: number;
  type: 'subtotal' | 'fee' | 'discount' | 'tax' | 'total';
}

export interface WithholdingTaxResult {
  grossAmount: number;
  withholdingRate: number;
  withholdingAmount: number;
  netPayable: number;
  isWithholdingApplicable: boolean;
}

export interface InvoiceGenerationInput {
  orderId: string;
  customerId: string;
  vendorId?: string;
  restaurantId?: string;
  grossAmount: number;
  taxCalculation: TaxCalculationResult;
  exemptionId?: string;
}

class TaxService {

  /**
   * Calculate taxes for an order
   */
  async calculateOrderTax(input: TaxCalculationInput): Promise<TaxCalculationResult> {
    const {
      subtotal,
      deliveryFee = 0,
      serviceFee = 0,
      exemptionType = null,
      customerId,
      isVatRegistered = true
    } = input;

    let vatableAmount = 0;
    let vatExemptAmount = 0;
    let vatAmount = 0;
    let seniorDiscount = 0;
    let pwdDiscount = 0;
    let exemptionApplied = false;

    const grossAmount = subtotal + deliveryFee + serviceFee;

    // Check if customer has verified exemption
    let verifiedExemption: CustomerTaxExemption | null = null;
    if (customerId && exemptionType) {
      verifiedExemption = await this.getVerifiedExemption(customerId, exemptionType);
    }

    if (verifiedExemption && (exemptionType === 'senior' || exemptionType === 'pwd')) {
      // Senior Citizen / PWD Treatment:
      // 1. 20% discount on subtotal (not on delivery/service fees)
      // 2. VAT exempt on the discounted amount

      const discountAmount = subtotal * PH_TAX_CONSTANTS.SENIOR_PWD_DISCOUNT_RATE;

      if (exemptionType === 'senior') {
        seniorDiscount = discountAmount;
      } else {
        pwdDiscount = discountAmount;
      }

      // The discounted subtotal is VAT exempt
      vatExemptAmount = subtotal - discountAmount;

      // Delivery and service fees are still vatable (if vendor is VAT registered)
      if (isVatRegistered) {
        vatableAmount = deliveryFee + serviceFee;
        vatAmount = vatableAmount * PH_TAX_CONSTANTS.VAT_RATE;
      }

      exemptionApplied = true;

    } else if (verifiedExemption && exemptionType === 'diplomatic') {
      // Diplomatic exemption: Full VAT exempt
      vatExemptAmount = grossAmount;
      vatableAmount = 0;
      vatAmount = 0;
      exemptionApplied = true;

    } else if (isVatRegistered) {
      // Standard VAT calculation (VAT inclusive pricing)
      // Philippine standard: prices shown are VAT inclusive
      // VAT = (Amount / 1.12) * 0.12
      vatableAmount = grossAmount;
      vatAmount = (grossAmount / 1.12) * PH_TAX_CONSTANTS.VAT_RATE;
      vatExemptAmount = 0;
    } else {
      // Non-VAT registered vendor
      vatableAmount = 0;
      vatExemptAmount = grossAmount;
      vatAmount = 0;
    }

    const totalDiscount = seniorDiscount + pwdDiscount;
    const netAmount = grossAmount - totalDiscount;

    // Build breakdown for display
    const breakdown: TaxBreakdownLine[] = [
      { label: 'Subtotal', amount: subtotal, type: 'subtotal' },
    ];

    if (deliveryFee > 0) {
      breakdown.push({ label: 'Delivery Fee', amount: deliveryFee, type: 'fee' });
    }

    if (serviceFee > 0) {
      breakdown.push({ label: 'Service Fee', amount: serviceFee, type: 'fee' });
    }

    if (seniorDiscount > 0) {
      breakdown.push({ label: 'Senior Citizen Discount (20%)', amount: -seniorDiscount, type: 'discount' });
    }

    if (pwdDiscount > 0) {
      breakdown.push({ label: 'PWD Discount (20%)', amount: -pwdDiscount, type: 'discount' });
    }

    // VAT line (informational - already included in prices)
    if (vatAmount > 0) {
      breakdown.push({ label: 'VAT (12% included)', amount: vatAmount, type: 'tax' });
    } else if (exemptionApplied) {
      breakdown.push({ label: 'VAT Exempt', amount: 0, type: 'tax' });
    }

    breakdown.push({ label: 'Total', amount: netAmount, type: 'total' });

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      vatableAmount,
      vatExemptAmount,
      vatAmount,
      seniorDiscount,
      pwdDiscount,
      totalDiscount,
      exemptionType,
      exemptionApplied,
      grossAmount,
      netAmount,
      breakdown
    };
  }

  /**
   * Calculate withholding tax on vendor payments
   */
  calculateWithholdingTax(
    grossAmount: number,
    isServicePayment: boolean = false
  ): WithholdingTaxResult {
    // Withholding tax applies only above minimum threshold
    if (grossAmount < PH_TAX_CONSTANTS.WITHHOLDING_MINIMUM_AMOUNT) {
      return {
        grossAmount,
        withholdingRate: 0,
        withholdingAmount: 0,
        netPayable: grossAmount,
        isWithholdingApplicable: false
      };
    }

    const withholdingRate = isServicePayment
      ? PH_TAX_CONSTANTS.WITHHOLDING_RATE_SERVICES
      : PH_TAX_CONSTANTS.WITHHOLDING_RATE_GOODS;

    const withholdingAmount = grossAmount * withholdingRate;
    const netPayable = grossAmount - withholdingAmount;

    return {
      grossAmount,
      withholdingRate,
      withholdingAmount,
      netPayable,
      isWithholdingApplicable: true
    };
  }

  /**
   * Get customer's verified tax exemption
   */
  async getVerifiedExemption(
    userId: string,
    exemptionType?: string
  ): Promise<CustomerTaxExemption | null> {
    const now = new Date();

    const conditions = [
      eq(customerTaxExemptions.userId, userId),
      eq(customerTaxExemptions.status, 'verified'),
      or(
        isNull(customerTaxExemptions.validUntil),
        gte(customerTaxExemptions.validUntil, now)
      )
    ];

    if (exemptionType) {
      conditions.push(eq(customerTaxExemptions.exemptionType, exemptionType));
    }

    const [exemption] = await db.select()
      .from(customerTaxExemptions)
      .where(and(...conditions))
      .limit(1);

    return exemption || null;
  }

  /**
   * Get all verified exemptions for a user
   */
  async getUserExemptions(userId: string): Promise<CustomerTaxExemption[]> {
    return await db.select()
      .from(customerTaxExemptions)
      .where(eq(customerTaxExemptions.userId, userId))
      .orderBy(desc(customerTaxExemptions.createdAt));
  }

  /**
   * Register a new tax exemption (pending verification)
   */
  async registerExemption(data: {
    userId: string;
    exemptionType: 'senior' | 'pwd' | 'diplomatic';
    idNumber: string;
    idDocumentUrl?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    validUntil?: Date;
  }): Promise<CustomerTaxExemption> {
    const [exemption] = await db.insert(customerTaxExemptions)
      .values({
        userId: data.userId,
        exemptionType: data.exemptionType,
        idNumber: data.idNumber,
        idDocumentUrl: data.idDocumentUrl,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        validUntil: data.validUntil,
        status: 'pending'
      })
      .returning();

    return exemption;
  }

  /**
   * Admin: Verify or reject an exemption
   */
  async verifyExemption(
    exemptionId: string,
    adminId: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<CustomerTaxExemption> {
    const updateData: any = {
      verifiedBy: adminId,
      verifiedAt: new Date(),
      updatedAt: new Date()
    };

    if (approved) {
      updateData.status = 'verified';
    } else {
      updateData.status = 'rejected';
      updateData.rejectionReason = rejectionReason;
    }

    const [updated] = await db.update(customerTaxExemptions)
      .set(updateData)
      .where(eq(customerTaxExemptions.id, exemptionId))
      .returning();

    return updated;
  }

  /**
   * Get pending exemptions for admin review
   */
  async getPendingExemptions(): Promise<(CustomerTaxExemption & { user: any })[]> {
    const exemptions = await db.select({
      exemption: customerTaxExemptions,
      user: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone
      }
    })
      .from(customerTaxExemptions)
      .leftJoin(users, eq(customerTaxExemptions.userId, users.id))
      .where(eq(customerTaxExemptions.status, 'pending'))
      .orderBy(desc(customerTaxExemptions.createdAt));

    return exemptions.map(e => ({
      ...e.exemption,
      user: e.user
    }));
  }

  /**
   * Generate BIR-compliant invoice number
   */
  generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = nanoid(8).toUpperCase();
    return `BTS-${year}${month}-${random}`;
  }

  /**
   * Create tax invoice for an order
   */
  async createTaxInvoice(input: InvoiceGenerationInput): Promise<TaxInvoice> {
    const {
      orderId,
      customerId,
      vendorId,
      restaurantId,
      grossAmount,
      taxCalculation,
      exemptionId
    } = input;

    // Get customer details
    const [customer] = await db.select()
      .from(users)
      .where(eq(users.id, customerId))
      .limit(1);

    // Get vendor/restaurant details if provided
    let vendorName = '';
    let vendorTin = '';
    let vendorAddress = '';

    if (restaurantId) {
      const [restaurant] = await db.select()
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1);

      if (restaurant) {
        vendorName = restaurant.name;
        vendorTin = restaurant.taxId || '';
        const addr = restaurant.address as any;
        vendorAddress = addr ? `${addr.street || ''}, ${addr.barangay || ''}, ${addr.city || ''}` : '';
      }
    }

    const invoiceNumber = this.generateInvoiceNumber();

    const [invoice] = await db.insert(taxInvoices)
      .values({
        orderId,
        invoiceNumber,
        customerId,
        customerName: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Walk-in Customer',
        customerAddress: '',
        vendorId,
        restaurantId,
        vendorName,
        vendorTin,
        vendorAddress,
        grossAmount: grossAmount.toFixed(2),
        vatableAmount: taxCalculation.vatableAmount.toFixed(2),
        vatExemptAmount: taxCalculation.vatExemptAmount.toFixed(2),
        vatAmount: taxCalculation.vatAmount.toFixed(2),
        seniorDiscount: taxCalculation.seniorDiscount.toFixed(2),
        pwdDiscount: taxCalculation.pwdDiscount.toFixed(2),
        netAmount: taxCalculation.netAmount.toFixed(2),
        exemptionId,
        exemptionType: taxCalculation.exemptionType,
        status: 'issued',
        issuedAt: new Date()
      })
      .returning();

    return invoice;
  }

  /**
   * Get invoice by order ID
   */
  async getInvoiceByOrderId(orderId: string): Promise<TaxInvoice | null> {
    const [invoice] = await db.select()
      .from(taxInvoices)
      .where(eq(taxInvoices.orderId, orderId))
      .limit(1);

    return invoice || null;
  }

  /**
   * Generate vendor tax report for a period
   */
  async generateVendorTaxReport(
    vendorId: string,
    restaurantId: string | null,
    periodStart: Date,
    periodEnd: Date,
    reportType: 'monthly' | 'quarterly' | 'annual',
    generatedBy: string
  ): Promise<VendorTaxReport> {
    // Get all invoices for the period
    const conditions = [
      eq(taxInvoices.vendorId, vendorId),
      gte(taxInvoices.issuedAt, periodStart),
      lte(taxInvoices.issuedAt, periodEnd),
      eq(taxInvoices.status, 'issued')
    ];

    if (restaurantId) {
      conditions.push(eq(taxInvoices.restaurantId, restaurantId));
    }

    const invoices = await db.select()
      .from(taxInvoices)
      .where(and(...conditions));

    // Calculate totals
    let grossSales = 0;
    let vatableSales = 0;
    let vatExemptSales = 0;
    let vatCollected = 0;
    let seniorTransactions = 0;
    let pwdTransactions = 0;

    for (const inv of invoices) {
      grossSales += parseFloat(inv.grossAmount);
      vatableSales += parseFloat(inv.vatableAmount || '0');
      vatExemptSales += parseFloat(inv.vatExemptAmount || '0');
      vatCollected += parseFloat(inv.vatAmount || '0');

      if (inv.exemptionType === 'senior') seniorTransactions++;
      if (inv.exemptionType === 'pwd') pwdTransactions++;
    }

    // Generate report number
    const year = periodStart.getFullYear();
    const month = (periodStart.getMonth() + 1).toString().padStart(2, '0');
    const reportNumber = `TR-${year}${month}-${nanoid(6).toUpperCase()}`;

    // Calculate VAT payable (Output VAT - Input VAT)
    // Note: Input VAT would need to be tracked separately from vendor purchases
    const vatPayable = vatCollected; // Simplified - no input VAT tracking

    const [report] = await db.insert(vendorTaxReports)
      .values({
        vendorId,
        restaurantId,
        periodStart,
        periodEnd,
        reportType,
        reportNumber,
        grossSales: grossSales.toFixed(2),
        vatableSales: vatableSales.toFixed(2),
        vatExemptSales: vatExemptSales.toFixed(2),
        vatCollected: vatCollected.toFixed(2),
        vatPayable: vatPayable.toFixed(2),
        totalOrders: invoices.length,
        totalInvoices: invoices.length,
        seniorTransactions,
        pwdTransactions,
        status: 'generated',
        generatedBy,
        generatedAt: new Date()
      })
      .returning();

    return report;
  }

  /**
   * Get vendor tax reports
   */
  async getVendorTaxReports(
    vendorId: string,
    restaurantId?: string,
    limit: number = 12
  ): Promise<VendorTaxReport[]> {
    const conditions = [eq(vendorTaxReports.vendorId, vendorId)];

    if (restaurantId) {
      conditions.push(eq(vendorTaxReports.restaurantId, restaurantId));
    }

    return await db.select()
      .from(vendorTaxReports)
      .where(and(...conditions))
      .orderBy(desc(vendorTaxReports.periodStart))
      .limit(limit);
  }

  /**
   * Export tax report to CSV format
   */
  async exportReportToCSV(reportId: string): Promise<string> {
    const [report] = await db.select()
      .from(vendorTaxReports)
      .where(eq(vendorTaxReports.id, reportId))
      .limit(1);

    if (!report) {
      throw new Error('Report not found');
    }

    // Generate CSV content
    const headers = [
      'Report Number',
      'Period Start',
      'Period End',
      'Report Type',
      'Gross Sales',
      'Vatable Sales',
      'VAT Exempt Sales',
      'VAT Collected',
      'VAT Payable',
      'Total Orders',
      'Senior Transactions',
      'PWD Transactions',
      'Status',
      'Generated At'
    ];

    const values = [
      report.reportNumber || '',
      report.periodStart.toISOString().split('T')[0],
      report.periodEnd.toISOString().split('T')[0],
      report.reportType,
      report.grossSales,
      report.vatableSales || '0',
      report.vatExemptSales || '0',
      report.vatCollected || '0',
      report.vatPayable || '0',
      report.totalOrders?.toString() || '0',
      report.seniorTransactions?.toString() || '0',
      report.pwdTransactions?.toString() || '0',
      report.status || 'generated',
      report.generatedAt?.toISOString() || ''
    ];

    const csv = [
      headers.join(','),
      values.map(v => `"${v}"`).join(',')
    ].join('\n');

    // Update report with export info
    await db.update(vendorTaxReports)
      .set({
        exportedAt: new Date(),
        exportFormat: 'csv',
        updatedAt: new Date()
      })
      .where(eq(vendorTaxReports.id, reportId));

    return csv;
  }

  /**
   * Get active tax rates
   */
  async getActiveTaxRates(): Promise<typeof taxRates.$inferSelect[]> {
    const now = new Date();

    return await db.select()
      .from(taxRates)
      .where(
        and(
          eq(taxRates.isActive, true),
          lte(taxRates.effectiveDate, now),
          or(
            isNull(taxRates.expiryDate),
            gte(taxRates.expiryDate, now)
          )
        )
      );
  }
}

// Export singleton instance
export const taxService = new TaxService();
export default taxService;
