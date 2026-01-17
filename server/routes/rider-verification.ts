// Rider Verification API Routes for BTS Delivery Platform
// Handles document upload, verification status, and admin verification workflows

import { Router } from 'express';
import { authenticateToken, requireAdmin, requireRole, auditLog } from '../routes.js';
import { storage } from '../storage.js';
import { db } from '../db.js';
import { z } from 'zod';
import { eq, and, desc, inArray } from 'drizzle-orm';
import {
  riders,
  users,
  riderDocuments,
  riderVerificationStatus,
  type RiderDocument,
  type RiderVerificationStatus
} from '@shared/schema';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Validation schema for document upload
const documentUploadSchema = z.object({
  docType: z.enum([
    'government_id',
    'drivers_license',
    'vehicle_registration',
    'vehicle_insurance',
    'nbi_clearance',
    'barangay_clearance',
    'selfie_with_id',
    'profile_photo'
  ]),
  documentUrl: z.string().url("Invalid document URL"),
  documentName: z.string().optional(),
  documentNumber: z.string().optional(),
  issueDate: z.string().datetime().optional(),
  expiryDate: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
});

const verifyDocumentSchema = z.object({
  documentId: z.string().uuid("Invalid document ID"),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional()
});

const completeVerificationSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend']),
  backgroundCheckStatus: z.enum(['not_started', 'in_progress', 'passed', 'failed', 'pending']).optional(),
  backgroundCheckNotes: z.string().optional(),
  adminNotes: z.string().optional(),
  requiresReVerification: z.boolean().optional(),
  reVerificationReason: z.string().optional(),
  nextReviewDate: z.string().datetime().optional()
});

const updateBackgroundCheckSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'passed', 'failed', 'pending']),
  notes: z.string().optional()
});

// =============================================================================
// RIDER ENDPOINTS
// =============================================================================

// POST /api/rider/documents/upload - Rider uploads verification documents
router.post('/documents/upload', authenticateToken, requireRole(['rider']), async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Validate request body
    const validationResult = documentUploadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid document data",
        errors: validationResult.error.errors
      });
    }

    const { docType, documentUrl, documentName, documentNumber, issueDate, expiryDate, metadata } = validationResult.data;

    // Get rider record for this user
    const [rider] = await db.select().from(riders).where(eq(riders.userId, userId)).limit(1);

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found. Please complete rider registration first." });
    }

    // Check if document of this type already exists and is pending/approved
    const [existingDoc] = await db
      .select()
      .from(riderDocuments)
      .where(
        and(
          eq(riderDocuments.riderId, rider.id),
          eq(riderDocuments.docType, docType),
          inArray(riderDocuments.status, ['pending', 'under_review', 'approved'])
        )
      )
      .limit(1);

    if (existingDoc) {
      // If existing document is approved, reject new upload unless it's expired
      if (existingDoc.status === 'approved') {
        const isExpired = existingDoc.expiryDate && new Date(existingDoc.expiryDate) < new Date();
        if (!isExpired) {
          return res.status(400).json({
            message: `A valid ${docType.replace('_', ' ')} document is already on file. You can only upload a new one when the current document expires.`,
            existingDocument: {
              id: existingDoc.id,
              status: existingDoc.status,
              expiryDate: existingDoc.expiryDate
            }
          });
        }
        // Mark existing as expired
        await db
          .update(riderDocuments)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(riderDocuments.id, existingDoc.id));
      } else {
        // For pending/under_review, update the existing document
        const [updatedDoc] = await db
          .update(riderDocuments)
          .set({
            documentUrl,
            documentName: documentName || existingDoc.documentName,
            documentNumber: documentNumber || existingDoc.documentNumber,
            issueDate: issueDate ? new Date(issueDate) : existingDoc.issueDate,
            expiryDate: expiryDate ? new Date(expiryDate) : existingDoc.expiryDate,
            metadata: metadata || existingDoc.metadata,
            status: 'pending',
            rejectionReason: null,
            updatedAt: new Date()
          })
          .where(eq(riderDocuments.id, existingDoc.id))
          .returning();

        // Update verification status to in_progress if not already
        await updateRiderVerificationProgress(rider.id);

        return res.json({
          message: "Document updated successfully",
          document: updatedDoc
        });
      }
    }

    // Create new document record
    const [newDocument] = await db
      .insert(riderDocuments)
      .values({
        riderId: rider.id,
        docType,
        documentUrl,
        documentName,
        documentNumber,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'pending',
        metadata
      })
      .returning();

    // Update or create verification status record
    await updateRiderVerificationProgress(rider.id);

    res.status(201).json({
      message: "Document uploaded successfully",
      document: newDocument
    });

  } catch (error) {
    console.error("Error uploading rider document:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

// GET /api/rider/verification/status - Check verification status
router.get('/verification/status', authenticateToken, requireRole(['rider']), async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Get rider record
    const [rider] = await db.select().from(riders).where(eq(riders.userId, userId)).limit(1);

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    // Get verification status
    const [verificationStatusRecord] = await db
      .select()
      .from(riderVerificationStatus)
      .where(eq(riderVerificationStatus.riderId, rider.id))
      .limit(1);

    // Get all documents for this rider
    const documents = await db
      .select()
      .from(riderDocuments)
      .where(eq(riderDocuments.riderId, rider.id))
      .orderBy(desc(riderDocuments.createdAt));

    // Group documents by type and get latest status for each
    const documentsByType: Record<string, RiderDocument> = {};
    documents.forEach(doc => {
      if (!documentsByType[doc.docType] ||
          new Date(doc.createdAt!) > new Date(documentsByType[doc.docType].createdAt!)) {
        documentsByType[doc.docType] = doc;
      }
    });

    // Calculate document completion progress
    const requiredDocs = [
      'government_id',
      'drivers_license',
      'vehicle_registration',
      'profile_photo'
    ];
    const optionalDocs = [
      'vehicle_insurance',
      'nbi_clearance',
      'barangay_clearance',
      'selfie_with_id'
    ];

    const requiredDocsSubmitted = requiredDocs.filter(type => documentsByType[type]).length;
    const requiredDocsApproved = requiredDocs.filter(type =>
      documentsByType[type]?.status === 'approved'
    ).length;

    const completionPercentage = Math.round((requiredDocsApproved / requiredDocs.length) * 100);

    res.json({
      riderId: rider.id,
      riderUserId: rider.userId,
      isVerified: rider.isVerified,
      verificationStatus: verificationStatusRecord || {
        overallStatus: 'not_started',
        idVerified: false,
        licenseVerified: false,
        vehicleVerified: false,
        insuranceVerified: false,
        backgroundCheckStatus: 'not_started'
      },
      documents: {
        all: documents,
        byType: documentsByType
      },
      progress: {
        requiredDocuments: requiredDocs.map(type => ({
          type,
          label: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          required: true,
          submitted: !!documentsByType[type],
          status: documentsByType[type]?.status || 'not_submitted'
        })),
        optionalDocuments: optionalDocs.map(type => ({
          type,
          label: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          required: false,
          submitted: !!documentsByType[type],
          status: documentsByType[type]?.status || 'not_submitted'
        })),
        requiredSubmitted: requiredDocsSubmitted,
        requiredApproved: requiredDocsApproved,
        totalRequired: requiredDocs.length,
        completionPercentage
      },
      nextSteps: getNextVerificationSteps(documentsByType, verificationStatusRecord)
    });

  } catch (error) {
    console.error("Error fetching verification status:", error);
    res.status(500).json({ message: "Failed to fetch verification status" });
  }
});

// GET /api/rider/documents - Get all documents for the authenticated rider
router.get('/documents', authenticateToken, requireRole(['rider']), async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [rider] = await db.select().from(riders).where(eq(riders.userId, userId)).limit(1);

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    const documents = await db
      .select()
      .from(riderDocuments)
      .where(eq(riderDocuments.riderId, rider.id))
      .orderBy(desc(riderDocuments.createdAt));

    res.json(documents);

  } catch (error) {
    console.error("Error fetching rider documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

// POST /api/admin/riders/:id/verify-document - Admin verifies a specific document
router.post('/admin/:id/verify-document', authenticateToken, requireAdmin, auditLog('verify_document', 'rider_documents'), async (req: any, res) => {
  try {
    const { id: riderId } = req.params;
    const adminUserId = req.user.id;

    // Validate request body
    const validationResult = verifyDocumentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }

    const { documentId, action, rejectionReason } = validationResult.data;

    // Verify the rider exists
    const [rider] = await db.select().from(riders).where(eq(riders.id, riderId)).limit(1);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Verify the document exists and belongs to this rider
    const [document] = await db
      .select()
      .from(riderDocuments)
      .where(
        and(
          eq(riderDocuments.id, documentId),
          eq(riderDocuments.riderId, riderId)
        )
      )
      .limit(1);

    if (!document) {
      return res.status(404).json({ message: "Document not found for this rider" });
    }

    // Check if document is in a state that can be verified
    if (!['pending', 'under_review'].includes(document.status)) {
      return res.status(400).json({
        message: `Cannot verify document with status '${document.status}'. Only pending or under_review documents can be verified.`
      });
    }

    // Require rejection reason if rejecting
    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required when rejecting a document" });
    }

    // Update document status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const [updatedDocument] = await db
      .update(riderDocuments)
      .set({
        status: newStatus,
        rejectionReason: action === 'reject' ? rejectionReason : null,
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(riderDocuments.id, documentId))
      .returning();

    // Update verification flags based on document type
    await updateVerificationFlagsFromDocument(riderId, document.docType, action === 'approve');

    // Recalculate overall verification status
    await updateRiderVerificationProgress(riderId);

    res.json({
      message: `Document ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      document: updatedDocument
    });

  } catch (error) {
    console.error("Error verifying rider document:", error);
    res.status(500).json({ message: "Failed to verify document" });
  }
});

// GET /api/admin/riders/:id/documents - Get all documents for a specific rider (admin view)
router.get('/admin/:id/documents', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id: riderId } = req.params;

    // Verify the rider exists
    const [rider] = await db.select().from(riders).where(eq(riders.id, riderId)).limit(1);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Get rider user info
    const [riderUser] = await db.select().from(users).where(eq(users.id, rider.userId)).limit(1);

    // Get all documents
    const documents = await db
      .select({
        document: riderDocuments,
        verifier: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(riderDocuments)
      .leftJoin(users, eq(riderDocuments.verifiedBy, users.id))
      .where(eq(riderDocuments.riderId, riderId))
      .orderBy(desc(riderDocuments.createdAt));

    // Get verification status
    const [verificationStatusRecord] = await db
      .select()
      .from(riderVerificationStatus)
      .where(eq(riderVerificationStatus.riderId, riderId))
      .limit(1);

    res.json({
      rider: {
        id: rider.id,
        userId: rider.userId,
        vehicleType: rider.vehicleType,
        licenseNumber: rider.licenseNumber,
        vehiclePlate: rider.vehiclePlate,
        isVerified: rider.isVerified,
        user: riderUser ? {
          email: riderUser.email,
          firstName: riderUser.firstName,
          lastName: riderUser.lastName,
          phone: riderUser.phone
        } : null
      },
      verificationStatus: verificationStatusRecord || null,
      documents: documents.map(d => ({
        ...d.document,
        verifier: d.verifier?.id ? d.verifier : null
      }))
    });

  } catch (error) {
    console.error("Error fetching rider documents for admin:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// GET /api/admin/riders/:id/verification - Get verification status for a specific rider (admin view)
router.get('/admin/:id/verification', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id: riderId } = req.params;

    // Verify the rider exists
    const [rider] = await db.select().from(riders).where(eq(riders.id, riderId)).limit(1);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Get verification status
    const [verificationStatusRecord] = await db
      .select()
      .from(riderVerificationStatus)
      .where(eq(riderVerificationStatus.riderId, riderId))
      .limit(1);

    // Get all documents
    const documents = await db
      .select()
      .from(riderDocuments)
      .where(eq(riderDocuments.riderId, riderId))
      .orderBy(desc(riderDocuments.createdAt));

    res.json({
      riderId,
      isVerified: rider.isVerified,
      verificationStatus: verificationStatusRecord || {
        overallStatus: 'not_started',
        idVerified: false,
        licenseVerified: false,
        vehicleVerified: false,
        insuranceVerified: false,
        backgroundCheckStatus: 'not_started'
      },
      documents: documents
    });

  } catch (error) {
    console.error("Error fetching verification status for admin:", error);
    res.status(500).json({ message: "Failed to fetch verification status" });
  }
});

// POST /api/admin/riders/:id/complete-verification - Admin completes full verification
router.post('/admin/:id/complete-verification', authenticateToken, requireAdmin, auditLog('complete_verification', 'riders'), async (req: any, res) => {
  try {
    const { id: riderId } = req.params;
    const adminUserId = req.user.id;

    // Validate request body
    const validationResult = completeVerificationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }

    const {
      action,
      backgroundCheckStatus,
      backgroundCheckNotes,
      adminNotes,
      requiresReVerification,
      reVerificationReason,
      nextReviewDate
    } = validationResult.data;

    // Verify the rider exists
    const [rider] = await db.select().from(riders).where(eq(riders.id, riderId)).limit(1);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Check if all required documents are approved before final approval
    if (action === 'approve') {
      const documents = await db
        .select()
        .from(riderDocuments)
        .where(eq(riderDocuments.riderId, riderId));

      const requiredDocs = ['government_id', 'drivers_license', 'vehicle_registration', 'profile_photo'];
      const approvedDocs = documents.filter(d => d.status === 'approved').map(d => d.docType);
      const missingDocs = requiredDocs.filter(type => !approvedDocs.includes(type));

      if (missingDocs.length > 0) {
        return res.status(400).json({
          message: "Cannot complete verification. The following required documents are not approved:",
          missingDocuments: missingDocs.map(type => type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
        });
      }

      // Check background check status if provided
      if (backgroundCheckStatus && backgroundCheckStatus === 'failed') {
        return res.status(400).json({
          message: "Cannot approve rider with failed background check"
        });
      }
    }

    // Determine overall status based on action
    let overallStatus: string;
    switch (action) {
      case 'approve':
        overallStatus = 'verified';
        break;
      case 'reject':
        overallStatus = 'rejected';
        break;
      case 'suspend':
        overallStatus = 'suspended';
        break;
      default:
        overallStatus = 'pending_review';
    }

    // Update or create verification status
    const [existingStatus] = await db
      .select()
      .from(riderVerificationStatus)
      .where(eq(riderVerificationStatus.riderId, riderId))
      .limit(1);

    const verificationData = {
      overallStatus,
      backgroundCheckStatus: backgroundCheckStatus || existingStatus?.backgroundCheckStatus || 'not_started',
      backgroundCheckDate: backgroundCheckStatus ? new Date() : existingStatus?.backgroundCheckDate,
      backgroundCheckNotes: backgroundCheckNotes || existingStatus?.backgroundCheckNotes,
      verificationCompletedAt: action === 'approve' ? new Date() : null,
      verificationCompletedBy: action === 'approve' ? adminUserId : null,
      adminNotes: adminNotes || existingStatus?.adminNotes,
      requiresReVerification: requiresReVerification ?? existingStatus?.requiresReVerification ?? false,
      reVerificationReason: reVerificationReason || existingStatus?.reVerificationReason,
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : existingStatus?.nextReviewDate,
      updatedAt: new Date()
    };

    let updatedStatus;
    if (existingStatus) {
      [updatedStatus] = await db
        .update(riderVerificationStatus)
        .set(verificationData)
        .where(eq(riderVerificationStatus.riderId, riderId))
        .returning();
    } else {
      [updatedStatus] = await db
        .insert(riderVerificationStatus)
        .values({
          riderId,
          ...verificationData,
          verificationStartedAt: new Date()
        })
        .returning();
    }

    // Update rider's isVerified flag
    const [updatedRider] = await db
      .update(riders)
      .set({
        isVerified: action === 'approve',
        updatedAt: new Date()
      })
      .where(eq(riders.id, riderId))
      .returning();

    res.json({
      message: `Rider verification ${action === 'approve' ? 'completed' : action === 'reject' ? 'rejected' : 'suspended'} successfully`,
      rider: {
        id: updatedRider.id,
        isVerified: updatedRider.isVerified
      },
      verificationStatus: updatedStatus
    });

  } catch (error) {
    console.error("Error completing rider verification:", error);
    res.status(500).json({ message: "Failed to complete verification" });
  }
});

// POST /api/admin/riders/:id/update-background-check - Admin updates background check status
router.post('/admin/:id/update-background-check', authenticateToken, requireAdmin, auditLog('update_background_check', 'riders'), async (req: any, res) => {
  try {
    const { id: riderId } = req.params;

    const validationResult = updateBackgroundCheckSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }

    const { status, notes } = validationResult.data;

    // Verify the rider exists
    const [rider] = await db.select().from(riders).where(eq(riders.id, riderId)).limit(1);
    if (!rider) {
      return res.status(404).json({ message: "Rider not found" });
    }

    // Update verification status
    const [existingStatus] = await db
      .select()
      .from(riderVerificationStatus)
      .where(eq(riderVerificationStatus.riderId, riderId))
      .limit(1);

    let updatedStatus;
    if (existingStatus) {
      [updatedStatus] = await db
        .update(riderVerificationStatus)
        .set({
          backgroundCheckStatus: status,
          backgroundCheckDate: new Date(),
          backgroundCheckNotes: notes || existingStatus.backgroundCheckNotes,
          updatedAt: new Date()
        })
        .where(eq(riderVerificationStatus.riderId, riderId))
        .returning();
    } else {
      [updatedStatus] = await db
        .insert(riderVerificationStatus)
        .values({
          riderId,
          backgroundCheckStatus: status,
          backgroundCheckDate: new Date(),
          backgroundCheckNotes: notes,
          overallStatus: 'in_progress',
          verificationStartedAt: new Date()
        })
        .returning();
    }

    res.json({
      message: "Background check status updated successfully",
      verificationStatus: updatedStatus
    });

  } catch (error) {
    console.error("Error updating background check status:", error);
    res.status(500).json({ message: "Failed to update background check status" });
  }
});

// GET /api/admin/riders/pending-verification - Get all riders pending verification
router.get('/admin/pending-verification', authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get all riders with their verification status
    const allRiders = await db
      .select({
        rider: riders,
        user: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone
        },
        verification: riderVerificationStatus
      })
      .from(riders)
      .leftJoin(users, eq(riders.userId, users.id))
      .leftJoin(riderVerificationStatus, eq(riders.id, riderVerificationStatus.riderId))
      .orderBy(desc(riders.createdAt));

    // Filter based on status if provided
    let filteredRiders = allRiders;
    if (status) {
      const statusFilter = status as string;
      if (statusFilter === 'unverified') {
        filteredRiders = allRiders.filter(r => !r.rider.isVerified);
      } else if (statusFilter === 'pending') {
        filteredRiders = allRiders.filter(r =>
          r.verification?.overallStatus === 'pending_review' ||
          r.verification?.overallStatus === 'in_progress'
        );
      } else if (statusFilter === 'verified') {
        filteredRiders = allRiders.filter(r => r.rider.isVerified);
      }
    } else {
      // Default: show riders pending verification
      filteredRiders = allRiders.filter(r =>
        !r.rider.isVerified &&
        (r.verification?.overallStatus === 'pending_review' ||
          r.verification?.overallStatus === 'in_progress' ||
          !r.verification)
      );
    }

    // Get document counts for each rider
    const ridersWithDocCounts = await Promise.all(
      filteredRiders.slice(offset, offset + limitNum).map(async (r) => {
        const docs = await db
          .select()
          .from(riderDocuments)
          .where(eq(riderDocuments.riderId, r.rider.id));

        const pendingDocs = docs.filter(d => d.status === 'pending' || d.status === 'under_review').length;
        const approvedDocs = docs.filter(d => d.status === 'approved').length;
        const rejectedDocs = docs.filter(d => d.status === 'rejected').length;

        return {
          rider: {
            id: r.rider.id,
            userId: r.rider.userId,
            vehicleType: r.rider.vehicleType,
            isVerified: r.rider.isVerified,
            createdAt: r.rider.createdAt
          },
          user: r.user,
          verification: r.verification || {
            overallStatus: 'not_started',
            backgroundCheckStatus: 'not_started'
          },
          documentStats: {
            total: docs.length,
            pending: pendingDocs,
            approved: approvedDocs,
            rejected: rejectedDocs
          }
        };
      })
    );

    res.json({
      riders: ridersWithDocCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredRiders.length,
        totalPages: Math.ceil(filteredRiders.length / limitNum)
      }
    });

  } catch (error) {
    console.error("Error fetching pending verification riders:", error);
    res.status(500).json({ message: "Failed to fetch riders pending verification" });
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Helper function to update verification flags based on document type
async function updateVerificationFlagsFromDocument(riderId: string, docType: string, isApproved: boolean) {
  const flagUpdates: Partial<{
    idVerified: boolean;
    licenseVerified: boolean;
    vehicleVerified: boolean;
    insuranceVerified: boolean;
  }> = {};

  switch (docType) {
    case 'government_id':
    case 'selfie_with_id':
      flagUpdates.idVerified = isApproved;
      break;
    case 'drivers_license':
      flagUpdates.licenseVerified = isApproved;
      break;
    case 'vehicle_registration':
      flagUpdates.vehicleVerified = isApproved;
      break;
    case 'vehicle_insurance':
      flagUpdates.insuranceVerified = isApproved;
      break;
  }

  if (Object.keys(flagUpdates).length > 0) {
    const [existing] = await db
      .select()
      .from(riderVerificationStatus)
      .where(eq(riderVerificationStatus.riderId, riderId))
      .limit(1);

    if (existing) {
      await db
        .update(riderVerificationStatus)
        .set({ ...flagUpdates, updatedAt: new Date() })
        .where(eq(riderVerificationStatus.riderId, riderId));
    }
  }
}

// Helper function to update rider verification progress
async function updateRiderVerificationProgress(riderId: string) {
  // Get all documents for this rider
  const documents = await db
    .select()
    .from(riderDocuments)
    .where(eq(riderDocuments.riderId, riderId));

  const requiredDocs = ['government_id', 'drivers_license', 'vehicle_registration', 'profile_photo'];
  const submittedDocs = documents.map(d => d.docType);
  const approvedDocs = documents.filter(d => d.status === 'approved').map(d => d.docType);

  // Determine overall status
  let overallStatus = 'not_started';
  if (submittedDocs.length > 0) {
    overallStatus = 'in_progress';
  }
  if (requiredDocs.every(type => submittedDocs.includes(type))) {
    overallStatus = 'pending_review';
  }
  // Note: 'verified', 'rejected', 'suspended' statuses are set manually by admin

  // Update or create verification status
  const [existing] = await db
    .select()
    .from(riderVerificationStatus)
    .where(eq(riderVerificationStatus.riderId, riderId))
    .limit(1);

  const verificationData = {
    idVerified: approvedDocs.includes('government_id') || approvedDocs.includes('selfie_with_id'),
    licenseVerified: approvedDocs.includes('drivers_license'),
    vehicleVerified: approvedDocs.includes('vehicle_registration'),
    insuranceVerified: approvedDocs.includes('vehicle_insurance'),
    updatedAt: new Date()
  };

  if (existing) {
    // Only update overallStatus if it's not already in a final state
    const finalStates = ['verified', 'rejected', 'suspended'];
    if (!finalStates.includes(existing.overallStatus)) {
      await db
        .update(riderVerificationStatus)
        .set({ ...verificationData, overallStatus })
        .where(eq(riderVerificationStatus.riderId, riderId));
    } else {
      await db
        .update(riderVerificationStatus)
        .set(verificationData)
        .where(eq(riderVerificationStatus.riderId, riderId));
    }
  } else {
    await db
      .insert(riderVerificationStatus)
      .values({
        riderId,
        ...verificationData,
        overallStatus,
        verificationStartedAt: new Date()
      });
  }
}

// Helper function to determine next verification steps
function getNextVerificationSteps(
  documentsByType: Record<string, RiderDocument>,
  verificationStatusRecord: RiderVerificationStatus | null
): string[] {
  const steps: string[] = [];

  const requiredDocs = [
    { type: 'government_id', label: 'Government ID (e.g., SSS, Passport, National ID)' },
    { type: 'drivers_license', label: "Driver's License" },
    { type: 'vehicle_registration', label: 'Vehicle Registration (OR/CR)' },
    { type: 'profile_photo', label: 'Profile Photo' }
  ];

  for (const doc of requiredDocs) {
    if (!documentsByType[doc.type]) {
      steps.push(`Upload your ${doc.label}`);
    } else if (documentsByType[doc.type].status === 'rejected') {
      steps.push(`Re-upload your ${doc.label} (rejected: ${documentsByType[doc.type].rejectionReason || 'No reason provided'})`);
    } else if (documentsByType[doc.type].status === 'pending') {
      steps.push(`Waiting for ${doc.label} verification`);
    }
  }

  if (verificationStatusRecord?.backgroundCheckStatus === 'not_started' ||
      verificationStatusRecord?.backgroundCheckStatus === 'pending') {
    steps.push('Background check in progress - please wait for completion');
  } else if (verificationStatusRecord?.backgroundCheckStatus === 'failed') {
    steps.push('Background check failed - please contact support');
  }

  if (steps.length === 0 && verificationStatusRecord?.overallStatus !== 'verified') {
    steps.push('All documents submitted - awaiting final approval');
  }

  return steps;
}

export default router;
