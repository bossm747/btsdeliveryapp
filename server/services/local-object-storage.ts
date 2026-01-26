import fs from "fs/promises";
import { createReadStream, existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import { Response } from "express";

// Local object storage service that mimics S3-style operations
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const UPLOAD_TOKEN_SECRET = process.env.JWT_SECRET || "bts-delivery-upload-secret";
const TOKEN_EXPIRY_SECONDS = 900; // 15 minutes

// Ensure upload directories exist
function ensureDirectoriesSync() {
  const dirs = [
    UPLOAD_DIR,
    path.join(UPLOAD_DIR, "images"),
    path.join(UPLOAD_DIR, "images/restaurants"),
    path.join(UPLOAD_DIR, "images/menu"),
    path.join(UPLOAD_DIR, "images/users"),
    path.join(UPLOAD_DIR, "images/ai-uploads"),
    path.join(UPLOAD_DIR, "images/ai-generated"),
    path.join(UPLOAD_DIR, "images/delivery-proofs"),
    path.join(UPLOAD_DIR, "documents"),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

// Initialize directories on module load
ensureDirectoriesSync();

export interface UploadToken {
  token: string;
  objectPath: string;
  expiresAt: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  filename?: string;
  error?: string;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/**
 * Local Object Storage Service
 * Provides S3-like functionality for local file storage
 */
export class LocalObjectStorageService {
  private static pendingUploads: Map<string, { objectPath: string; expiresAt: number }> = new Map();

  /**
   * Generate a signed upload URL (actually a token-based endpoint)
   * Returns a URL that can be used with PUT to upload a file
   */
  static generateUploadURL(
    category: "restaurants" | "menu" | "users" | "ai-uploads" | "ai-generated" | "delivery-proofs" | "documents" = "ai-uploads",
    entityId?: string
  ): { uploadURL: string; objectPath: string } {
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    const expiresAt = timestamp + TOKEN_EXPIRY_SECONDS * 1000;

    // Generate object path
    let objectPath: string;
    if (entityId) {
      objectPath = `images/${category}/${entityId}/${timestamp}-${uuid.slice(0, 8)}`;
    } else {
      objectPath = `images/${category}/${timestamp}-${uuid.slice(0, 8)}`;
    }

    // Generate token (signed hash of the path + expiry)
    const tokenData = `${objectPath}:${expiresAt}:${UPLOAD_TOKEN_SECRET}`;
    const token = crypto.createHash("sha256").update(tokenData).digest("hex");

    // Store pending upload
    this.pendingUploads.set(token, { objectPath, expiresAt });

    // Clean up expired tokens periodically
    this.cleanupExpiredTokens();

    // Return the upload URL pointing to our local endpoint
    const baseUrl = process.env.PUBLIC_APP_URL || "";
    const uploadURL = `${baseUrl}/api/upload/${token}`;

    return { uploadURL, objectPath };
  }

  /**
   * Validate an upload token and return the object path
   */
  static validateUploadToken(token: string): string | null {
    const pending = this.pendingUploads.get(token);
    if (!pending) {
      return null;
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingUploads.delete(token);
      return null;
    }

    return pending.objectPath;
  }

  /**
   * Complete an upload - save the file and clean up the token
   */
  static async completeUpload(
    token: string,
    buffer: Buffer,
    contentType: string
  ): Promise<UploadResult> {
    const objectPath = this.validateUploadToken(token);
    if (!objectPath) {
      return { success: false, error: "Invalid or expired upload token" };
    }

    try {
      // Determine file extension from content type
      const extMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "application/pdf": ".pdf",
      };
      const ext = extMap[contentType] || ".bin";
      const fullPath = path.join(UPLOAD_DIR, `${objectPath}${ext}`);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });

      // Save file
      await fs.writeFile(fullPath, buffer);

      // Remove the token
      this.pendingUploads.delete(token);

      // Return the URL path
      const url = `/uploads/${objectPath}${ext}`;

      return {
        success: true,
        url,
        path: fullPath,
        filename: path.basename(fullPath),
      };
    } catch (error: any) {
      console.error("[LocalObjectStorage] Error completing upload:", error);
      return {
        success: false,
        error: error.message || "Failed to save file",
      };
    }
  }

  /**
   * Save a file directly (without token)
   * @param buffer - File buffer to save
   * @param originalFilename - Original filename (used for extension)
   * @param category - Storage category
   * @param entityId - Entity ID for subfolder
   * @param customName - Optional custom name for the file (without extension)
   */
  static async saveFile(
    buffer: Buffer,
    originalFilename: string,
    category: "restaurants" | "menu" | "users" | "ai-uploads" | "ai-generated" | "delivery-proofs" | "documents" = "ai-uploads",
    entityId?: string,
    customName?: string
  ): Promise<UploadResult> {
    try {
      const ext = path.extname(originalFilename).toLowerCase() || ".bin";
      const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
      const timestamp = Date.now();

      let filename: string;
      let subdir: string;

      if (customName) {
        // Use custom name with extension and a short unique suffix
        const safeName = customName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
        filename = `${safeName}-${hash.slice(0, 4)}${ext}`;
        subdir = entityId ? `images/${category}/${entityId}` : `images/${category}`;
      } else if (entityId) {
        filename = `${timestamp}-${hash}${ext}`;
        subdir = `images/${category}/${entityId}`;
      } else {
        filename = `${timestamp}-${hash}${ext}`;
        subdir = `images/${category}`;
      }

      const fullPath = path.join(UPLOAD_DIR, subdir, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Save file
      await fs.writeFile(fullPath, buffer);

      // Return URL path
      const url = `/uploads/${subdir}/${filename}`;

      return {
        success: true,
        url,
        path: fullPath,
        filename,
      };
    } catch (error: any) {
      console.error("[LocalObjectStorage] Error saving file:", error);
      return {
        success: false,
        error: error.message || "Failed to save file",
      };
    }
  }

  /**
   * Save a base64 encoded image
   */
  static async saveBase64Image(
    base64Data: string,
    category: "restaurants" | "menu" | "users" | "ai-uploads" | "ai-generated" | "delivery-proofs" = "ai-uploads",
    entityId?: string
  ): Promise<UploadResult> {
    try {
      // Remove data URL prefix if present
      let base64String = base64Data;
      let ext = ".png";

      if (base64Data.startsWith("data:")) {
        const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          ext = `.${matches[1] === "jpeg" ? "jpg" : matches[1]}`;
          base64String = matches[2];
        } else {
          base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
        }
      }

      const buffer = Buffer.from(base64String, "base64");
      return await this.saveFile(buffer, `image${ext}`, category, entityId);
    } catch (error: any) {
      console.error("[LocalObjectStorage] Error saving base64 image:", error);
      return {
        success: false,
        error: error.message || "Failed to save image",
      };
    }
  }

  /**
   * Save image from URL
   * @param imageUrl - URL to download image from
   * @param category - Storage category
   * @param entityId - Entity ID for subfolder
   * @param customName - Optional custom name for the file (without extension)
   */
  static async saveImageFromUrl(
    imageUrl: string,
    category: "restaurants" | "menu" | "users" | "ai-uploads" | "ai-generated" | "delivery-proofs" | "documents" = "ai-uploads",
    entityId?: string,
    customName?: string
  ): Promise<UploadResult> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await response.arrayBuffer());

      const extMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
      };
      const ext = extMap[contentType] || ".jpg";

      return await this.saveFile(buffer, `downloaded${ext}`, category, entityId, customName);
    } catch (error: any) {
      console.error("[LocalObjectStorage] Error saving image from URL:", error);
      return {
        success: false,
        error: error.message || "Failed to save image from URL",
      };
    }
  }

  /**
   * Get a file and stream it to response
   */
  static async downloadObject(
    objectPath: string,
    res: Response,
    cacheTtlSec: number = 3600
  ): Promise<void> {
    // Remove /uploads prefix if present
    let filePath = objectPath;
    if (filePath.startsWith("/uploads/")) {
      filePath = filePath.slice(9);
    } else if (filePath.startsWith("/objects/")) {
      filePath = filePath.slice(9);
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);

    try {
      const stat = await fs.stat(fullPath);

      // Determine content type
      const ext = path.extname(fullPath).toLowerCase();
      const contentTypes: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".svg": "image/svg+xml",
      };
      const contentType = contentTypes[ext] || "application/octet-stream";

      res.set({
        "Content-Type": contentType,
        "Content-Length": stat.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      const stream = createReadStream(fullPath);
      stream.on("error", (err) => {
        console.error("[LocalObjectStorage] Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new ObjectNotFoundError();
      }
      throw error;
    }
  }

  /**
   * Check if a file exists
   */
  static async fileExists(objectPath: string): Promise<boolean> {
    let filePath = objectPath;
    if (filePath.startsWith("/uploads/")) {
      filePath = filePath.slice(9);
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);

    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(objectPath: string): Promise<boolean> {
    let filePath = objectPath;
    if (filePath.startsWith("/uploads/")) {
      filePath = filePath.slice(9);
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);

    try {
      await fs.unlink(fullPath);
      return true;
    } catch (error) {
      console.error("[LocalObjectStorage] Error deleting file:", error);
      return false;
    }
  }

  /**
   * Get file as buffer
   */
  static async getFile(objectPath: string): Promise<Buffer | null> {
    let filePath = objectPath;
    if (filePath.startsWith("/uploads/")) {
      filePath = filePath.slice(9);
    }

    const fullPath = path.join(UPLOAD_DIR, filePath);

    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      console.error("[LocalObjectStorage] Error reading file:", error);
      return null;
    }
  }

  /**
   * Clean up expired upload tokens
   */
  private static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.pendingUploads.entries()) {
      if (now > data.expiresAt) {
        this.pendingUploads.delete(token);
      }
    }
  }

  /**
   * Upload restaurant image
   */
  static async uploadRestaurantImage(imageData: Buffer, restaurantId: string): Promise<string> {
    const result = await this.saveFile(imageData, "image.jpg", "restaurants", restaurantId);
    return result.url || `/uploads/images/restaurants/${restaurantId}/default.jpg`;
  }

  /**
   * Upload user profile image
   */
  static async uploadUserProfileImage(imageData: Buffer, userId: string): Promise<string> {
    const result = await this.saveFile(imageData, "image.jpg", "users", userId);
    return result.url || `/uploads/images/users/${userId}/default.jpg`;
  }

  /**
   * Upload menu item image
   */
  static async uploadMenuItemImage(imageData: Buffer, menuItemId: string): Promise<string> {
    const result = await this.saveFile(imageData, "image.jpg", "menu", menuItemId);
    return result.url || `/uploads/images/menu/${menuItemId}/default.jpg`;
  }

  /**
   * Upload delivery proof
   */
  static async uploadDeliveryProof(imageData: Buffer, orderId: string): Promise<string> {
    const result = await this.saveFile(imageData, "proof.jpg", "delivery-proofs", orderId);
    return result.url || `/uploads/images/delivery-proofs/${orderId}/proof.jpg`;
  }

  /**
   * Upload AI generated image
   */
  static async uploadAIGeneratedImage(imageData: Buffer, name: string): Promise<string> {
    const result = await this.saveFile(imageData, `${name}.jpg`, "ai-generated");
    return result.url || `/uploads/images/ai-generated/${name}.jpg`;
  }
}
