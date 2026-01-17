import { Express } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { emailService } from "./integrations/email";
import {
  users,
  userSessions,
  restaurants,
  vendorKycDocuments,
  vendorBankAccounts,
  vendorOnboardingStatus,
  type VendorKycDocument,
} from "@shared/schema";

// JWT secret - loaded from environment variables
const JWT_SECRET = process.env.JWT_SECRET!;

// Validation schemas for vendor registration and KYC
const vendorRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.enum(['restaurant', 'food_stall', 'catering', 'bakery', 'grocery', 'convenience_store', 'other']),
  businessAddress: z.object({
    street: z.string().min(1),
    barangay: z.string().optional(),
    city: z.string().min(1),
    province: z.string().min(1),
    zipCode: z.string().optional()
  }),
  businessCategory: z.string().optional(),
  businessDescription: z.string().optional()
});

const kycDocumentUploadSchema = z.object({
  docType: z.enum([
    'business_permit',
    'dti_registration',
    'sec_registration',
    'bir_registration',
    'mayors_permit',
    'sanitary_permit',
    'food_handler_certificate',
    'valid_id',
    'proof_of_address',
    'other'
  ]),
  documentUrl: z.string().url("Valid document URL is required"),
  documentName: z.string().optional(),
  expiryDate: z.string().optional()
});

const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  bankCode: z.string().optional(),
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountType: z.enum(['savings', 'checking']).default('savings'),
  branchName: z.string().optional(),
  branchCode: z.string().optional(),
  isDefault: z.boolean().optional()
});

export function registerVendorKycRoutes(
  app: Express,
  authenticateToken: any,
  requireAdmin: any,
  auditLog: (action: string, resource: string) => any
) {
  // POST /api/vendor/register - Initial vendor registration
  app.post("/api/vendor/register", async (req, res) => {
    try {
      const validatedData = vendorRegistrationSchema.parse(req.body);

      // Check if user already exists
      const [existingUser] = await db.select()
        .from(users)
        .where(eq(users.email, validatedData.email));

      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(validatedData.password, 10);

      // Create user with vendor role
      const [newUser] = await db.insert(users).values({
        email: validatedData.email,
        phone: validatedData.phone,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: "vendor",
        passwordHash,
        status: "pending",
        onboardingStep: "kyc_documents"
      }).returning();

      // Create restaurant/business profile
      const [newRestaurant] = await db.insert(restaurants).values({
        ownerId: newUser.id,
        name: validatedData.businessName,
        description: validatedData.businessDescription || "",
        category: validatedData.businessCategory || validatedData.businessType,
        address: validatedData.businessAddress,
        isActive: false,
        isAcceptingOrders: false
      }).returning();

      // Determine required documents based on business type
      const requiredDocs = ['valid_id', 'business_permit', 'bir_registration'];
      if (['restaurant', 'food_stall', 'catering', 'bakery'].includes(validatedData.businessType)) {
        requiredDocs.push('sanitary_permit', 'food_handler_certificate');
      }

      // Create vendor onboarding status
      await db.insert(vendorOnboardingStatus).values({
        vendorId: newUser.id,
        kycStatus: "not_started",
        requiredDocuments: requiredDocs,
        submittedDocuments: [],
        restaurantId: newRestaurant.id,
        onboardingStep: "kyc_documents"
      });

      // Generate verification token
      const verificationToken = nanoid(64);
      await storage.createEmailVerificationToken({
        userId: newUser.id,
        token: verificationToken,
        email: validatedData.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      // Send verification email
      try {
        await emailService.sendEmailVerification(
          validatedData.email,
          `${validatedData.firstName} ${validatedData.lastName}`,
          verificationToken
        );
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
      }

      // Create session token
      const sessionToken = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
      const refreshToken = jwt.sign({ userId: newUser.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });

      await db.insert(userSessions).values({
        userId: newUser.id,
        sessionToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        deviceInfo: { userAgent: req.headers['user-agent'], ip: req.ip }
      });

      const { passwordHash: _, ...userResponse } = newUser;

      res.status(201).json({
        message: "Vendor registration successful. Please verify your email and complete KYC.",
        user: userResponse,
        restaurant: newRestaurant,
        onboardingStatus: { currentStep: "kyc_documents", kycStatus: "not_started", requiredDocuments: requiredDocs },
        token: sessionToken,
        requiresEmailVerification: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Vendor registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/vendor/kyc/upload-documents - Upload KYC documents
  app.post("/api/vendor/kyc/upload-documents", authenticateToken, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Authentication required" });
      if (req.user.role !== 'vendor') return res.status(403).json({ message: "Only vendors can upload KYC documents" });

      const validatedData = kycDocumentUploadSchema.parse(req.body);

      const [vendorOnboardingRecord] = await db.select()
        .from(vendorOnboardingStatus)
        .where(eq(vendorOnboardingStatus.vendorId, req.user.id));

      if (!vendorOnboardingRecord) {
        return res.status(404).json({ message: "Onboarding status not found. Please register first." });
      }

      const [existingDoc] = await db.select()
        .from(vendorKycDocuments)
        .where(and(eq(vendorKycDocuments.vendorId, req.user.id), eq(vendorKycDocuments.docType, validatedData.docType)));

      let document: VendorKycDocument;

      if (existingDoc) {
        const [updated] = await db.update(vendorKycDocuments)
          .set({
            documentUrl: validatedData.documentUrl,
            documentName: validatedData.documentName,
            expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
            status: "pending",
            rejectionReason: null,
            verifiedAt: null,
            verifiedBy: null,
            updatedAt: new Date()
          })
          .where(eq(vendorKycDocuments.id, existingDoc.id))
          .returning();
        document = updated;
      } else {
        const [created] = await db.insert(vendorKycDocuments).values({
          vendorId: req.user.id,
          docType: validatedData.docType,
          documentUrl: validatedData.documentUrl,
          documentName: validatedData.documentName,
          expiryDate: validatedData.expiryDate ? new Date(validatedData.expiryDate) : null,
          status: "pending"
        }).returning();
        document = created;
      }

      const submittedDocs = (vendorOnboardingRecord.submittedDocuments as string[]) || [];
      if (!submittedDocs.includes(validatedData.docType)) submittedDocs.push(validatedData.docType);

      const requiredDocs = (vendorOnboardingRecord.requiredDocuments as string[]) || [];
      const allDocsSubmitted = requiredDocs.every(doc => submittedDocs.includes(doc));

      await db.update(vendorOnboardingStatus)
        .set({
          submittedDocuments: submittedDocs,
          kycStatus: allDocsSubmitted ? "pending_review" : "in_progress",
          kycSubmittedAt: allDocsSubmitted ? new Date() : vendorOnboardingRecord.kycSubmittedAt,
          onboardingStep: allDocsSubmitted ? "review" : "kyc_documents",
          updatedAt: new Date()
        })
        .where(eq(vendorOnboardingStatus.vendorId, req.user.id));

      res.json({
        message: "Document uploaded successfully",
        document,
        progress: { submittedDocuments: submittedDocs, requiredDocuments: requiredDocs, allDocsSubmitted, kycStatus: allDocsSubmitted ? "pending_review" : "in_progress" }
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      console.error("KYC document upload error:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // GET /api/vendor/kyc/status - Check KYC approval status
  app.get("/api/vendor/kyc/status", authenticateToken, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Authentication required" });
      if (req.user.role !== 'vendor') return res.status(403).json({ message: "Only vendors can check KYC status" });

      const [vendorOnboardingRecord] = await db.select()
        .from(vendorOnboardingStatus)
        .where(eq(vendorOnboardingStatus.vendorId, req.user.id));

      if (!vendorOnboardingRecord) return res.status(404).json({ message: "Onboarding status not found" });

      const documents = await db.select().from(vendorKycDocuments).where(eq(vendorKycDocuments.vendorId, req.user.id));
      const bankAccounts = await db.select().from(vendorBankAccounts).where(eq(vendorBankAccounts.vendorId, req.user.id));

      let restaurant = null;
      if (vendorOnboardingRecord.restaurantId) {
        restaurant = await storage.getRestaurant(vendorOnboardingRecord.restaurantId);
      }

      res.json({
        onboardingStatus: {
          currentStep: vendorOnboardingRecord.onboardingStep,
          kycStatus: vendorOnboardingRecord.kycStatus,
          kycSubmittedAt: vendorOnboardingRecord.kycSubmittedAt,
          kycReviewedAt: vendorOnboardingRecord.kycReviewedAt,
          kycRejectionReason: vendorOnboardingRecord.kycRejectionReason,
          requiredDocuments: vendorOnboardingRecord.requiredDocuments,
          submittedDocuments: vendorOnboardingRecord.submittedDocuments,
          bankAccountAdded: vendorOnboardingRecord.bankAccountAdded,
          bankAccountVerified: vendorOnboardingRecord.bankAccountVerified,
          businessProfileComplete: vendorOnboardingRecord.businessProfileComplete,
          isOnboardingComplete: vendorOnboardingRecord.isOnboardingComplete,
          onboardingCompletedAt: vendorOnboardingRecord.onboardingCompletedAt
        },
        documents: documents.map(doc => ({
          id: doc.id, docType: doc.docType, documentName: doc.documentName, status: doc.status,
          rejectionReason: doc.rejectionReason, expiryDate: doc.expiryDate, verifiedAt: doc.verifiedAt,
          createdAt: doc.createdAt, updatedAt: doc.updatedAt
        })),
        bankAccounts: bankAccounts.map(account => ({
          id: account.id, bankName: account.bankName, accountName: account.accountName,
          accountNumber: account.accountNumber.slice(-4).padStart(account.accountNumber.length, '*'),
          accountType: account.accountType, isVerified: account.isVerified, isDefault: account.isDefault,
          createdAt: account.createdAt
        })),
        restaurant: restaurant ? { id: restaurant.id, name: restaurant.name, isActive: restaurant.isActive, isAcceptingOrders: restaurant.isAcceptingOrders } : null
      });
    } catch (error) {
      console.error("Error fetching KYC status:", error);
      res.status(500).json({ message: "Failed to fetch KYC status" });
    }
  });

  // POST /api/vendor/kyc/bank-account - Add bank account
  app.post("/api/vendor/kyc/bank-account", authenticateToken, async (req: any, res: any) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Authentication required" });
      if (req.user.role !== 'vendor') return res.status(403).json({ message: "Only vendors can add bank accounts" });

      const validatedData = bankAccountSchema.parse(req.body);

      if (validatedData.isDefault) {
        await db.update(vendorBankAccounts).set({ isDefault: false }).where(eq(vendorBankAccounts.vendorId, req.user.id));
      }

      const [bankAccount] = await db.insert(vendorBankAccounts).values({
        vendorId: req.user.id,
        bankName: validatedData.bankName,
        bankCode: validatedData.bankCode,
        accountName: validatedData.accountName,
        accountNumber: validatedData.accountNumber,
        accountType: validatedData.accountType,
        branchName: validatedData.branchName,
        branchCode: validatedData.branchCode,
        isDefault: validatedData.isDefault || false,
        isVerified: false
      }).returning();

      await db.update(vendorOnboardingStatus).set({ bankAccountAdded: true, updatedAt: new Date() }).where(eq(vendorOnboardingStatus.vendorId, req.user.id));

      res.status(201).json({
        message: "Bank account added successfully",
        bankAccount: {
          id: bankAccount.id, bankName: bankAccount.bankName, accountName: bankAccount.accountName,
          accountNumber: bankAccount.accountNumber.slice(-4).padStart(bankAccount.accountNumber.length, '*'),
          accountType: bankAccount.accountType, isDefault: bankAccount.isDefault, isVerified: bankAccount.isVerified
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      console.error("Error adding bank account:", error);
      res.status(500).json({ message: "Failed to add bank account" });
    }
  });

  // POST /api/admin/vendor/:id/approve - Admin approval of vendor
  app.post("/api/admin/vendor/:id/approve", authenticateToken, requireAdmin, auditLog('approve_vendor', 'vendors'), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;

      const [vendor] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'vendor')));
      if (!vendor) return res.status(404).json({ message: "Vendor not found" });

      const [vendorOnboardingRecord] = await db.select().from(vendorOnboardingStatus).where(eq(vendorOnboardingStatus.vendorId, id));
      if (!vendorOnboardingRecord) return res.status(404).json({ message: "Vendor onboarding status not found" });

      await db.update(vendorKycDocuments)
        .set({ status: "approved", verifiedAt: new Date(), verifiedBy: req.user!.id, updatedAt: new Date() })
        .where(and(eq(vendorKycDocuments.vendorId, id), eq(vendorKycDocuments.status, "pending")));

      await db.update(vendorOnboardingStatus)
        .set({
          kycStatus: "approved", kycReviewedAt: new Date(), kycReviewedBy: req.user!.id, kycRejectionReason: null,
          onboardingStep: "completed", isOnboardingComplete: true, onboardingCompletedAt: new Date(),
          adminNotes: adminNotes || vendorOnboardingRecord.adminNotes, bankAccountVerified: true,
          businessProfileComplete: true, updatedAt: new Date()
        })
        .where(eq(vendorOnboardingStatus.vendorId, id));

      await db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, id));

      if (vendorOnboardingRecord.restaurantId) {
        await db.update(restaurants).set({ isActive: true, isAcceptingOrders: true, updatedAt: new Date() })
          .where(eq(restaurants.id, vendorOnboardingRecord.restaurantId));
      }

      await db.update(vendorBankAccounts)
        .set({ isVerified: true, verifiedAt: new Date(), verifiedBy: req.user!.id, updatedAt: new Date() })
        .where(eq(vendorBankAccounts.vendorId, id));

      try {
        // Send welcome email which is similar to approval notification
        await emailService.sendWelcomeEmail(vendor.email, `${vendor.firstName} ${vendor.lastName}`);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
      }

      res.json({
        message: "Vendor approved successfully",
        vendor: { id: vendor.id, email: vendor.email, firstName: vendor.firstName, lastName: vendor.lastName, status: "active" },
        kycStatus: "approved",
        isOnboardingComplete: true
      });
    } catch (error) {
      console.error("Error approving vendor:", error);
      res.status(500).json({ message: "Failed to approve vendor" });
    }
  });

  // POST /api/admin/vendor/:id/reject - Admin rejection of vendor
  app.post("/api/admin/vendor/:id/reject", authenticateToken, requireAdmin, auditLog('reject_vendor', 'vendors'), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { rejectionReason, rejectedDocuments, adminNotes } = req.body;

      if (!rejectionReason) return res.status(400).json({ message: "Rejection reason is required" });

      const [vendor] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'vendor')));
      if (!vendor) return res.status(404).json({ message: "Vendor not found" });

      const [vendorOnboardingRecord] = await db.select().from(vendorOnboardingStatus).where(eq(vendorOnboardingStatus.vendorId, id));
      if (!vendorOnboardingRecord) return res.status(404).json({ message: "Vendor onboarding status not found" });

      if (rejectedDocuments && Array.isArray(rejectedDocuments)) {
        for (const docRejection of rejectedDocuments) {
          await db.update(vendorKycDocuments)
            .set({ status: "rejected", rejectionReason: docRejection.reason, verifiedAt: new Date(), verifiedBy: req.user!.id, updatedAt: new Date() })
            .where(and(eq(vendorKycDocuments.vendorId, id), eq(vendorKycDocuments.docType, docRejection.docType)));
        }
      } else {
        await db.update(vendorKycDocuments)
          .set({ status: "rejected", rejectionReason: rejectionReason, verifiedAt: new Date(), verifiedBy: req.user!.id, updatedAt: new Date() })
          .where(and(eq(vendorKycDocuments.vendorId, id), eq(vendorKycDocuments.status, "pending")));
      }

      await db.update(vendorOnboardingStatus)
        .set({
          kycStatus: "rejected", kycReviewedAt: new Date(), kycReviewedBy: req.user!.id, kycRejectionReason: rejectionReason,
          onboardingStep: "kyc_documents", adminNotes: adminNotes || vendorOnboardingRecord.adminNotes, updatedAt: new Date()
        })
        .where(eq(vendorOnboardingStatus.vendorId, id));

      await db.update(users).set({ status: "pending", updatedAt: new Date() }).where(eq(users.id, id));

      // Note: For rejection emails, use a generic notification pattern
      // The vendor will see the rejection reason in their dashboard
      console.log(`Vendor rejection notification: ${vendor.email} - Reason: ${rejectionReason}`);

      res.json({
        message: "Vendor application rejected",
        vendor: { id: vendor.id, email: vendor.email, firstName: vendor.firstName, lastName: vendor.lastName, status: "pending" },
        kycStatus: "rejected",
        rejectionReason
      });
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      res.status(500).json({ message: "Failed to reject vendor" });
    }
  });

  // GET /api/admin/vendors/pending - Get all pending vendor applications
  app.get("/api/admin/vendors/pending", authenticateToken, requireAdmin, async (req: any, res: any) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const pendingVendors = await db.select({ user: users, onboarding: vendorOnboardingStatus })
        .from(vendorOnboardingStatus)
        .innerJoin(users, eq(users.id, vendorOnboardingStatus.vendorId))
        .where(eq(vendorOnboardingStatus.kycStatus, 'pending_review'))
        .orderBy(desc(vendorOnboardingStatus.kycSubmittedAt))
        .limit(Number(limit))
        .offset(offset);

      const [{ count }] = await db.select({ count: sql`count(*)` })
        .from(vendorOnboardingStatus)
        .where(eq(vendorOnboardingStatus.kycStatus, 'pending_review'));

      const vendorsWithDocs = await Promise.all(
        pendingVendors.map(async ({ user, onboarding }) => {
          const documents = await db.select().from(vendorKycDocuments).where(eq(vendorKycDocuments.vendorId, user.id));
          let restaurant = null;
          if (onboarding.restaurantId) restaurant = await storage.getRestaurant(onboarding.restaurantId);

          return {
            vendor: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, status: user.status, createdAt: user.createdAt },
            onboarding: { kycStatus: onboarding.kycStatus, kycSubmittedAt: onboarding.kycSubmittedAt, requiredDocuments: onboarding.requiredDocuments, submittedDocuments: onboarding.submittedDocuments, bankAccountAdded: onboarding.bankAccountAdded },
            documents: documents.map(doc => ({ id: doc.id, docType: doc.docType, documentUrl: doc.documentUrl, documentName: doc.documentName, status: doc.status, expiryDate: doc.expiryDate, createdAt: doc.createdAt })),
            restaurant: restaurant ? { id: restaurant.id, name: restaurant.name, category: restaurant.category, address: restaurant.address } : null
          };
        })
      );

      res.json({ vendors: vendorsWithDocs, pagination: { page: Number(page), limit: Number(limit), total: Number(count), totalPages: Math.ceil(Number(count) / Number(limit)) } });
    } catch (error) {
      console.error("Error fetching pending vendors:", error);
      res.status(500).json({ message: "Failed to fetch pending vendors" });
    }
  });

  // GET /api/admin/vendor/:id - Get detailed vendor information
  app.get("/api/admin/vendor/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;

      const [vendor] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, 'vendor')));
      if (!vendor) return res.status(404).json({ message: "Vendor not found" });

      const [vendorOnboardingRecord] = await db.select().from(vendorOnboardingStatus).where(eq(vendorOnboardingStatus.vendorId, id));
      const documents = await db.select().from(vendorKycDocuments).where(eq(vendorKycDocuments.vendorId, id));
      const bankAccounts = await db.select().from(vendorBankAccounts).where(eq(vendorBankAccounts.vendorId, id));

      let restaurant = null;
      if (vendorOnboardingRecord?.restaurantId) restaurant = await storage.getRestaurant(vendorOnboardingRecord.restaurantId);

      res.json({
        vendor: { id: vendor.id, email: vendor.email, firstName: vendor.firstName, lastName: vendor.lastName, phone: vendor.phone, status: vendor.status, createdAt: vendor.createdAt, updatedAt: vendor.updatedAt },
        onboarding: vendorOnboardingRecord || null,
        documents,
        bankAccounts: bankAccounts.map(account => ({ ...account, accountNumber: account.accountNumber.slice(-4).padStart(account.accountNumber.length, '*') })),
        restaurant
      });
    } catch (error) {
      console.error("Error fetching vendor details:", error);
      res.status(500).json({ message: "Failed to fetch vendor details" });
    }
  });
}
