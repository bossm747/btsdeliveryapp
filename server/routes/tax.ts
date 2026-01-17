/**
 * Tax Compliance API Routes
 *
 * Philippine BIR-compliant tax management endpoints
 */

import { Router } from "express";
import { db } from "../db";
import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import {
  taxRates,
  customerTaxExemptions,
  taxInvoices,
  vendorTaxReports,
  orders,
  users,
  restaurants,
  insertCustomerTaxExemptionSchema,
  TAX_EXEMPTION_TYPES,
  TAX_REPORT_TYPES
} from "@shared/schema";
import { taxService, PH_TAX_CONSTANTS } from "../services/tax-service";

const router = Router();

// ============= TAX CALCULATION ENDPOINTS =============

/**
 * POST /api/tax/calculate
 * Calculate taxes for an order
 */
router.post("/tax/calculate", async (req: any, res) => {
  try {
    const schema = z.object({
      subtotal: z.number().min(0),
      deliveryFee: z.number().min(0).optional().default(0),
      serviceFee: z.number().min(0).optional().default(0),
      exemptionType: z.enum(['senior', 'pwd', 'diplomatic']).nullable().optional(),
      customerId: z.string().uuid().optional(),
      isVatRegistered: z.boolean().optional().default(true)
    });

    const data = schema.parse(req.body);

    const result = await taxService.calculateOrderTax({
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      serviceFee: data.serviceFee,
      exemptionType: data.exemptionType,
      customerId: data.customerId || req.user?.id,
      isVatRegistered: data.isVatRegistered
    });

    res.json({
      success: true,
      calculation: result,
      constants: {
        vatRate: PH_TAX_CONSTANTS.VAT_RATE,
        seniorPwdDiscountRate: PH_TAX_CONSTANTS.SENIOR_PWD_DISCOUNT_RATE
      }
    });

  } catch (error: any) {
    console.error("Error calculating tax:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to calculate taxes"
    });
  }
});

/**
 * GET /api/tax/rates
 * Get active tax rates
 */
router.get("/tax/rates", async (req: any, res) => {
  try {
    const rates = await taxService.getActiveTaxRates();

    res.json({
      success: true,
      rates,
      constants: {
        vatRate: PH_TAX_CONSTANTS.VAT_RATE,
        seniorPwdDiscountRate: PH_TAX_CONSTANTS.SENIOR_PWD_DISCOUNT_RATE,
        withholdingRateGoods: PH_TAX_CONSTANTS.WITHHOLDING_RATE_GOODS,
        withholdingRateServices: PH_TAX_CONSTANTS.WITHHOLDING_RATE_SERVICES,
        withholdingMinimumAmount: PH_TAX_CONSTANTS.WITHHOLDING_MINIMUM_AMOUNT
      }
    });

  } catch (error: any) {
    console.error("Error fetching tax rates:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tax rates"
    });
  }
});

// ============= CUSTOMER TAX EXEMPTION ENDPOINTS =============

/**
 * GET /api/customer/tax-exemption
 * Get user's tax exemption status
 */
router.get("/customer/tax-exemption", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const exemptions = await taxService.getUserExemptions(req.user.id);

    // Find active verified exemption
    const activeExemption = exemptions.find(e =>
      e.status === 'verified' &&
      (!e.validUntil || new Date(e.validUntil) > new Date())
    );

    res.json({
      success: true,
      hasExemption: !!activeExemption,
      activeExemption: activeExemption || null,
      allExemptions: exemptions,
      exemptionTypes: TAX_EXEMPTION_TYPES
    });

  } catch (error: any) {
    console.error("Error fetching tax exemption:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tax exemption status"
    });
  }
});

/**
 * POST /api/customer/tax-exemption
 * Register a new tax exemption (requires admin verification)
 */
router.post("/customer/tax-exemption", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const schema = z.object({
      exemptionType: z.enum(['senior', 'pwd', 'diplomatic']),
      idNumber: z.string().min(1, "ID number is required"),
      idDocumentUrl: z.string().url().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      dateOfBirth: z.string().datetime().optional(),
      validUntil: z.string().datetime().optional()
    });

    const data = schema.parse(req.body);

    // Check if user already has a pending or verified exemption of this type
    const existingExemptions = await taxService.getUserExemptions(req.user.id);
    const existing = existingExemptions.find(e =>
      e.exemptionType === data.exemptionType &&
      (e.status === 'pending' || e.status === 'verified')
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existing.status} ${data.exemptionType} exemption application`
      });
    }

    const exemption = await taxService.registerExemption({
      userId: req.user.id,
      exemptionType: data.exemptionType,
      idNumber: data.idNumber,
      idDocumentUrl: data.idDocumentUrl,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined
    });

    res.status(201).json({
      success: true,
      message: "Tax exemption application submitted for verification",
      exemption
    });

  } catch (error: any) {
    console.error("Error registering tax exemption:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to register tax exemption"
    });
  }
});

// ============= VENDOR TAX REPORT ENDPOINTS =============

/**
 * GET /api/vendor/tax-reports
 * Get vendor tax reports
 */
router.get("/vendor/tax-reports", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Get vendor's restaurant
    const [restaurant] = await db.select()
      .from(restaurants)
      .where(eq(restaurants.ownerId, req.user.id))
      .limit(1);

    const reports = await taxService.getVendorTaxReports(
      req.user.id,
      restaurant?.id
    );

    // Calculate summary
    let totalGrossSales = 0;
    let totalVatCollected = 0;
    let totalSeniorTransactions = 0;
    let totalPwdTransactions = 0;

    reports.forEach(r => {
      totalGrossSales += parseFloat(r.grossSales);
      totalVatCollected += parseFloat(r.vatCollected || '0');
      totalSeniorTransactions += r.seniorTransactions || 0;
      totalPwdTransactions += r.pwdTransactions || 0;
    });

    res.json({
      success: true,
      reports,
      summary: {
        totalGrossSales,
        totalVatCollected,
        totalSeniorTransactions,
        totalPwdTransactions,
        reportCount: reports.length
      },
      reportTypes: TAX_REPORT_TYPES
    });

  } catch (error: any) {
    console.error("Error fetching vendor tax reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tax reports"
    });
  }
});

/**
 * GET /api/vendor/tax-reports/:id
 * Get single tax report details
 */
router.get("/vendor/tax-reports/:id", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const [report] = await db.select()
      .from(vendorTaxReports)
      .where(
        and(
          eq(vendorTaxReports.id, req.params.id),
          eq(vendorTaxReports.vendorId, req.user.id)
        )
      )
      .limit(1);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    res.json({
      success: true,
      report
    });

  } catch (error: any) {
    console.error("Error fetching tax report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tax report"
    });
  }
});

/**
 * GET /api/vendor/tax-reports/:id/export
 * Export tax report to CSV
 */
router.get("/vendor/tax-reports/:id/export", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    // Verify ownership
    const [report] = await db.select()
      .from(vendorTaxReports)
      .where(
        and(
          eq(vendorTaxReports.id, req.params.id),
          eq(vendorTaxReports.vendorId, req.user.id)
        )
      )
      .limit(1);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    const csv = await taxService.exportReportToCSV(req.params.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tax-report-${report.reportNumber}.csv"`);
    res.send(csv);

  } catch (error: any) {
    console.error("Error exporting tax report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export tax report"
    });
  }
});

// ============= ADMIN TAX MANAGEMENT ENDPOINTS =============

/**
 * GET /api/admin/tax-exemptions/pending
 * List pending tax exemption verifications
 */
router.get("/admin/tax-exemptions/pending", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const pendingExemptions = await taxService.getPendingExemptions();

    res.json({
      success: true,
      exemptions: pendingExemptions,
      count: pendingExemptions.length
    });

  } catch (error: any) {
    console.error("Error fetching pending exemptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending exemptions"
    });
  }
});

/**
 * GET /api/admin/tax-exemptions
 * List all tax exemptions with filters
 */
router.get("/admin/tax-exemptions", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const { status, type, limit = 50, offset = 0 } = req.query;

    const conditions = [];

    if (status) {
      conditions.push(eq(customerTaxExemptions.status, status as string));
    }
    if (type) {
      conditions.push(eq(customerTaxExemptions.exemptionType, type as string));
    }

    const query = db.select({
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
      .orderBy(desc(customerTaxExemptions.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    if (conditions.length > 0) {
      const exemptions = await query.where(and(...conditions));
      res.json({
        success: true,
        exemptions: exemptions.map(e => ({ ...e.exemption, user: e.user }))
      });
    } else {
      const exemptions = await query;
      res.json({
        success: true,
        exemptions: exemptions.map(e => ({ ...e.exemption, user: e.user }))
      });
    }

  } catch (error: any) {
    console.error("Error fetching exemptions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exemptions"
    });
  }
});

/**
 * POST /api/admin/tax-exemptions/:id/verify
 * Verify or reject a tax exemption
 */
router.post("/admin/tax-exemptions/:id/verify", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const schema = z.object({
      approved: z.boolean(),
      rejectionReason: z.string().optional()
    });

    const data = schema.parse(req.body);

    if (!data.approved && !data.rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required when rejecting an exemption"
      });
    }

    const exemption = await taxService.verifyExemption(
      req.params.id,
      req.user.id,
      data.approved,
      data.rejectionReason
    );

    res.json({
      success: true,
      message: data.approved ? "Exemption verified successfully" : "Exemption rejected",
      exemption
    });

  } catch (error: any) {
    console.error("Error verifying exemption:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to verify exemption"
    });
  }
});

/**
 * POST /api/admin/tax-reports/generate
 * Generate tax reports for vendors
 */
router.post("/admin/tax-reports/generate", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const schema = z.object({
      vendorId: z.string().uuid().optional(),
      restaurantId: z.string().uuid().optional(),
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
      reportType: z.enum(['monthly', 'quarterly', 'annual'])
    });

    const data = schema.parse(req.body);

    // If no specific vendor, generate for all vendors
    if (!data.vendorId) {
      const allVendors = await db.select()
        .from(users)
        .where(eq(users.role, 'vendor'));

      const reports = [];
      for (const vendor of allVendors) {
        // Get vendor's restaurant
        const [restaurant] = await db.select()
          .from(restaurants)
          .where(eq(restaurants.ownerId, vendor.id))
          .limit(1);

        if (restaurant) {
          const report = await taxService.generateVendorTaxReport(
            vendor.id,
            restaurant.id,
            new Date(data.periodStart),
            new Date(data.periodEnd),
            data.reportType,
            req.user.id
          );
          reports.push(report);
        }
      }

      return res.json({
        success: true,
        message: `Generated ${reports.length} tax reports`,
        reports
      });
    }

    // Generate for specific vendor
    const report = await taxService.generateVendorTaxReport(
      data.vendorId,
      data.restaurantId || null,
      new Date(data.periodStart),
      new Date(data.periodEnd),
      data.reportType,
      req.user.id
    );

    res.json({
      success: true,
      message: "Tax report generated successfully",
      report
    });

  } catch (error: any) {
    console.error("Error generating tax report:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to generate tax report"
    });
  }
});

/**
 * GET /api/admin/tax-reports
 * Get all tax reports (admin view)
 */
router.get("/admin/tax-reports", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const { reportType, status, limit = 50, offset = 0 } = req.query;

    const conditions = [];

    if (reportType) {
      conditions.push(eq(vendorTaxReports.reportType, reportType as string));
    }
    if (status) {
      conditions.push(eq(vendorTaxReports.status, status as string));
    }

    const query = db.select({
      report: vendorTaxReports,
      vendor: {
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName
      },
      restaurant: {
        id: restaurants.id,
        name: restaurants.name
      }
    })
      .from(vendorTaxReports)
      .leftJoin(users, eq(vendorTaxReports.vendorId, users.id))
      .leftJoin(restaurants, eq(vendorTaxReports.restaurantId, restaurants.id))
      .orderBy(desc(vendorTaxReports.periodStart))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    if (conditions.length > 0) {
      const reports = await query.where(and(...conditions));
      res.json({
        success: true,
        reports: reports.map(r => ({ ...r.report, vendor: r.vendor, restaurant: r.restaurant }))
      });
    } else {
      const reports = await query;
      res.json({
        success: true,
        reports: reports.map(r => ({ ...r.report, vendor: r.vendor, restaurant: r.restaurant }))
      });
    }

  } catch (error: any) {
    console.error("Error fetching admin tax reports:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tax reports"
    });
  }
});

/**
 * GET /api/admin/tax-reports/:id/export
 * Export any tax report (admin)
 */
router.get("/admin/tax-reports/:id/export", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const [report] = await db.select()
      .from(vendorTaxReports)
      .where(eq(vendorTaxReports.id, req.params.id))
      .limit(1);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    const csv = await taxService.exportReportToCSV(req.params.id);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="tax-report-${report.reportNumber}.csv"`);
    res.send(csv);

  } catch (error: any) {
    console.error("Error exporting tax report:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export tax report"
    });
  }
});

/**
 * POST /api/admin/tax-rates
 * Create a new tax rate
 */
router.post("/admin/tax-rates", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      rate: z.number().min(0).max(1),
      type: z.enum(['vat', 'withholding', 'service']),
      applicableToVendors: z.boolean().optional().default(true),
      applicableToCustomers: z.boolean().optional().default(true),
      minimumAmount: z.number().optional(),
      effectiveDate: z.string().datetime(),
      expiryDate: z.string().datetime().optional()
    });

    const data = schema.parse(req.body);

    const [rate] = await db.insert(taxRates)
      .values({
        name: data.name,
        description: data.description,
        rate: data.rate.toFixed(4),
        type: data.type,
        applicableToVendors: data.applicableToVendors,
        applicableToCustomers: data.applicableToCustomers,
        minimumAmount: data.minimumAmount?.toFixed(2),
        effectiveDate: new Date(data.effectiveDate),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        createdBy: req.user.id,
        isActive: true
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Tax rate created successfully",
      rate
    });

  } catch (error: any) {
    console.error("Error creating tax rate:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create tax rate"
    });
  }
});

/**
 * PATCH /api/admin/tax-rates/:id
 * Update a tax rate
 */
router.patch("/admin/tax-rates/:id", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    const schema = z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      rate: z.number().min(0).max(1).optional(),
      isActive: z.boolean().optional(),
      expiryDate: z.string().datetime().optional()
    });

    const data = schema.parse(req.body);

    const updateData: any = { updatedAt: new Date() };
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.rate !== undefined) updateData.rate = data.rate.toFixed(4);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);

    const [rate] = await db.update(taxRates)
      .set(updateData)
      .where(eq(taxRates.id, req.params.id))
      .returning();

    res.json({
      success: true,
      message: "Tax rate updated successfully",
      rate
    });

  } catch (error: any) {
    console.error("Error updating tax rate:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to update tax rate"
    });
  }
});

export default router;
