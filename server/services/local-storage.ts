import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Local file storage service for VPS deployment
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Ensure upload directories exist
async function ensureDirectories() {
  const dirs = [
    UPLOAD_DIR,
    path.join(UPLOAD_DIR, "images"),
    path.join(UPLOAD_DIR, "images/restaurants"),
    path.join(UPLOAD_DIR, "images/menu"),
    path.join(UPLOAD_DIR, "images/users"),
    path.join(UPLOAD_DIR, "images/ai-uploads"),
    path.join(UPLOAD_DIR, "documents"),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err: any) {
      if (err.code !== "EEXIST") throw err;
    }
  }
}

// Initialize directories on module load
ensureDirectories().catch(console.error);

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  filename?: string;
  error?: string;
}

export class LocalStorageService {
  /**
   * Save an uploaded file to local storage
   */
  static async saveFile(
    buffer: Buffer,
    originalFilename: string,
    category: "restaurants" | "menu" | "users" | "ai-uploads" | "documents" = "ai-uploads"
  ): Promise<UploadResult> {
    try {
      await ensureDirectories();

      // Generate unique filename
      const ext = path.extname(originalFilename).toLowerCase();
      const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
      const timestamp = Date.now();
      const filename = `${timestamp}-${hash}${ext}`;

      // Determine subdirectory based on file type
      const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
      const subdir = isImage ? `images/${category}` : "documents";
      const filePath = path.join(UPLOAD_DIR, subdir, filename);

      // Save file
      await fs.writeFile(filePath, buffer);

      // Return URL path (relative to static serving)
      const url = `/uploads/${subdir}/${filename}`;

      return {
        success: true,
        url,
        path: filePath,
        filename,
      };
    } catch (error: any) {
      console.error("[LocalStorage] Error saving file:", error);
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
    category: "restaurants" | "menu" | "users" | "ai-uploads" = "ai-uploads",
    extension: string = "png"
  ): Promise<UploadResult> {
    try {
      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64String, "base64");

      const filename = `image.${extension}`;
      return await this.saveFile(buffer, filename, category);
    } catch (error: any) {
      console.error("[LocalStorage] Error saving base64 image:", error);
      return {
        success: false,
        error: error.message || "Failed to save image",
      };
    }
  }

  /**
   * Save image from URL
   */
  static async saveImageFromUrl(
    imageUrl: string,
    category: "restaurants" | "menu" | "users" | "ai-uploads" = "ai-uploads"
  ): Promise<UploadResult> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const buffer = Buffer.from(await response.arrayBuffer());

      // Determine extension from content type
      const extMap: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
      };
      const ext = extMap[contentType] || ".jpg";
      const filename = `downloaded${ext}`;

      return await this.saveFile(buffer, filename, category);
    } catch (error: any) {
      console.error("[LocalStorage] Error saving image from URL:", error);
      return {
        success: false,
        error: error.message || "Failed to save image from URL",
      };
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error("[LocalStorage] Error deleting file:", error);
      return false;
    }
  }

  /**
   * Get file as buffer
   */
  static async getFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      console.error("[LocalStorage] Error reading file:", error);
      return null;
    }
  }

  /**
   * Get file as base64
   */
  static async getFileAsBase64(filePath: string): Promise<string | null> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.toString("base64");
    } catch (error) {
      console.error("[LocalStorage] Error reading file as base64:", error);
      return null;
    }
  }
}
