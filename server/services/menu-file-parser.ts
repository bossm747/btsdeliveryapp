/**
 * Menu File Parser Service
 *
 * Analyzes uploaded files (images, PDFs, CSVs, spreadsheets) to extract menu items
 * and generates detailed descriptions, prompts, and optionally images using AI.
 *
 * Supported formats:
 * - Images: JPG, PNG, WebP (menu photos analyzed with AI vision)
 * - PDFs: Menu PDFs extracted and parsed
 * - CSV/TSV: Structured menu data
 * - Excel: .xlsx, .xls spreadsheets
 */

import * as fs from "fs/promises";
import * as path from "path";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { generateMenuItemImage } from "../ai-services";

// ============================================================================
// AI Clients
// ============================================================================

const openRouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.PUBLIC_APP_URL || "https://btsdelivery.com",
        "X-Title": "BTS Delivery Menu Parser",
      },
    })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const VISION_MODEL = "google/gemini-2.0-flash-exp:free";
const TEXT_MODEL = "google/gemini-3-flash-preview";

// ============================================================================
// Types
// ============================================================================

export interface ParsedMenuItem {
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  category?: string;
  tags?: string[];
  allergens?: string[];
  ingredients?: string[];
  preparationTime?: number;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isBestseller?: boolean;
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  originalText?: string; // Raw text from source
}

export interface MenuParseResult {
  success: boolean;
  items: ParsedMenuItem[];
  categories: string[];
  restaurantInfo?: {
    name?: string;
    cuisine?: string;
    description?: string;
  };
  metadata: {
    sourceType: "image" | "pdf" | "csv" | "excel";
    fileName?: string;
    totalItems: number;
    confidence: number;
    processingTime: number;
  };
  error?: string;
}

export interface MenuItemWithImage extends ParsedMenuItem {
  imageUrl?: string;
  imagePrompt?: string;
}

export interface MenuCreationResult {
  success: boolean;
  created: number;
  failed: number;
  items: any[];
  errors: string[];
}

// ============================================================================
// Main Parser Functions
// ============================================================================

/**
 * Parse a menu file (auto-detects format)
 */
export async function parseMenuFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<MenuParseResult> {
  const startTime = Date.now();
  const ext = path.extname(fileName).toLowerCase();
  const mime = mimeType || getMimeType(ext);

  console.log(`[MenuParser] Parsing file: ${fileName} (${mime})`);

  try {
    let result: MenuParseResult;

    if (isImageFile(ext, mime)) {
      result = await parseMenuImage(fileBuffer);
    } else if (isPdfFile(ext, mime)) {
      result = await parseMenuPdf(fileBuffer);
    } else if (isCsvFile(ext, mime)) {
      result = await parseMenuCsv(fileBuffer.toString("utf-8"));
    } else if (isExcelFile(ext, mime)) {
      result = await parseMenuExcel(fileBuffer);
    } else {
      return {
        success: false,
        items: [],
        categories: [],
        metadata: {
          sourceType: "csv",
          fileName,
          totalItems: 0,
          confidence: 0,
          processingTime: Date.now() - startTime,
        },
        error: `Unsupported file format: ${ext}`,
      };
    }

    result.metadata.fileName = fileName;
    result.metadata.processingTime = Date.now() - startTime;

    console.log(`[MenuParser] Parsed ${result.items.length} items in ${result.metadata.processingTime}ms`);

    return result;
  } catch (error: any) {
    console.error("[MenuParser] Error:", error);
    return {
      success: false,
      items: [],
      categories: [],
      metadata: {
        sourceType: "csv",
        fileName,
        totalItems: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
      },
      error: error.message,
    };
  }
}

/**
 * Parse menu from image using AI vision
 */
async function parseMenuImage(imageBuffer: Buffer): Promise<MenuParseResult> {
  const base64Image = imageBuffer.toString("base64");

  const prompt = `You are analyzing a menu image for a food delivery app. Extract ALL menu items visible.

For each item, extract:
- name: The exact name of the dish
- description: Full description if visible, or generate a short appetizing description based on the dish name
- price: Price in PHP (just the number, estimate if not visible: small items 50-100, mains 100-250, premium 250-500)
- category: Category like "Appetizers", "Main Course", "Rice Meals", "Noodles", "Beverages", "Desserts", etc.
- tags: Array of tags like ["spicy", "bestseller", "new", "vegetarian", "healthy", "comfort", "grilled", "fried"]
- isSpicy: true if dish appears spicy
- isVegetarian: true if vegetarian
- isBestseller: true if marked as popular/bestseller
- ingredients: Array of main ingredients if identifiable

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "name": "Chicken Adobo",
      "description": "Classic Filipino braised chicken in soy sauce and vinegar",
      "price": 150,
      "category": "Main Course",
      "tags": ["bestseller", "comfort"],
      "isSpicy": false,
      "isVegetarian": false,
      "isBestseller": true,
      "ingredients": ["chicken", "soy sauce", "vinegar", "garlic", "bay leaves"]
    }
  ],
  "categories": ["Main Course", "Beverages"],
  "restaurantInfo": {
    "name": "Restaurant name if visible",
    "cuisine": "Filipino/Fast Food/etc"
  }
}

Extract EVERY item visible. If it's not a menu image, return {"items": [], "error": "Not a menu image"}.`;

  try {
    let jsonResponse: any = null;

    // Try OpenRouter first
    if (openRouter) {
      try {
        const response = await openRouter.chat.completions.create({
          model: VISION_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
          max_tokens: 8000,
        });

        const content = response.choices[0]?.message?.content || "";
        jsonResponse = parseJsonFromText(content);
      } catch (error: any) {
        console.error("[MenuParser] OpenRouter vision error:", error.message);
      }
    }

    // Fallback to Gemini
    if (!jsonResponse && gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } },
              ],
            },
          ],
        });

        const content = response.text || "";
        jsonResponse = parseJsonFromText(content);
      } catch (error: any) {
        console.error("[MenuParser] Gemini vision error:", error.message);
      }
    }

    if (!jsonResponse || jsonResponse.error) {
      return {
        success: false,
        items: [],
        categories: [],
        metadata: {
          sourceType: "image",
          totalItems: 0,
          confidence: 0,
          processingTime: 0,
        },
        error: jsonResponse?.error || "Failed to parse menu image",
      };
    }

    const items = (jsonResponse.items || []).map(normalizeMenuItem);

    return {
      success: true,
      items,
      categories: jsonResponse.categories || extractCategories(items),
      restaurantInfo: jsonResponse.restaurantInfo,
      metadata: {
        sourceType: "image",
        totalItems: items.length,
        confidence: items.length > 0 ? 0.85 : 0.3,
        processingTime: 0,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      items: [],
      categories: [],
      metadata: {
        sourceType: "image",
        totalItems: 0,
        confidence: 0,
        processingTime: 0,
      },
      error: error.message,
    };
  }
}

/**
 * Parse menu from PDF
 */
async function parseMenuPdf(pdfBuffer: Buffer): Promise<MenuParseResult> {
  // Extract text from PDF using pdf-parse or similar
  // For now, we'll use AI to analyze PDF as image pages

  const base64Pdf = pdfBuffer.toString("base64");

  // Try to extract text first (if it's a text-based PDF)
  let extractedText = "";

  try {
    // Simple text extraction attempt (works for text-based PDFs)
    const pdfString = pdfBuffer.toString("utf-8");
    const textMatches = pdfString.match(/\/Contents\s*\((.*?)\)/gs);
    if (textMatches) {
      extractedText = textMatches.join(" ").replace(/\/Contents\s*\(/g, "").replace(/\)/g, "");
    }
  } catch {
    // PDF is likely image-based
  }

  if (extractedText.length > 100) {
    // Text-based PDF - parse the text
    return await parseMenuFromText(extractedText, "pdf");
  }

  // Image-based PDF - treat as image
  // Note: In production, you'd want to use pdf.js or similar to extract pages as images
  const prompt = `Analyze this PDF document which appears to be a menu. Extract all menu items.

For each item extract: name, description, price (PHP number only), category, tags, dietary info.

Return JSON:
{
  "items": [{"name": "", "description": "", "price": 0, "category": "", "tags": [], "isSpicy": false, "isVegetarian": false}],
  "categories": [],
  "restaurantInfo": {"name": "", "cuisine": ""}
}`;

  try {
    if (openRouter) {
      const response = await openRouter.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64Pdf}` },
              },
            ],
          },
        ],
        max_tokens: 8000,
      });

      const content = response.choices[0]?.message?.content || "";
      const jsonResponse = parseJsonFromText(content);

      if (jsonResponse && !jsonResponse.error) {
        const items = (jsonResponse.items || []).map(normalizeMenuItem);
        return {
          success: true,
          items,
          categories: jsonResponse.categories || extractCategories(items),
          restaurantInfo: jsonResponse.restaurantInfo,
          metadata: {
            sourceType: "pdf",
            totalItems: items.length,
            confidence: 0.75,
            processingTime: 0,
          },
        };
      }
    }
  } catch (error: any) {
    console.error("[MenuParser] PDF parsing error:", error.message);
  }

  return {
    success: false,
    items: [],
    categories: [],
    metadata: {
      sourceType: "pdf",
      totalItems: 0,
      confidence: 0,
      processingTime: 0,
    },
    error: "Failed to parse PDF menu",
  };
}

/**
 * Parse menu from CSV/TSV text
 */
async function parseMenuCsv(csvText: string): Promise<MenuParseResult> {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return {
      success: false,
      items: [],
      categories: [],
      metadata: { sourceType: "csv", totalItems: 0, confidence: 0, processingTime: 0 },
      error: "CSV file is empty or has no data rows",
    };
  }

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  // Parse header
  const headers = parseCSVLine(firstLine, delimiter).map((h) =>
    h.toLowerCase().trim().replace(/['"]/g, "")
  );

  // Map common header variations
  const headerMap: Record<string, string> = {
    name: "name",
    item: "name",
    "item name": "name",
    "menu item": "name",
    dish: "name",
    product: "name",
    description: "description",
    desc: "description",
    details: "description",
    price: "price",
    cost: "price",
    amount: "price",
    category: "category",
    cat: "category",
    type: "category",
    group: "category",
    tags: "tags",
    labels: "tags",
    spicy: "isSpicy",
    vegetarian: "isVegetarian",
    vegan: "isVegan",
    bestseller: "isBestseller",
    popular: "isBestseller",
    ingredients: "ingredients",
    allergens: "allergens",
    "prep time": "preparationTime",
    "preparation time": "preparationTime",
  };

  // Find column indices
  const columnIndices: Record<string, number> = {};
  headers.forEach((header, index) => {
    const mapped = headerMap[header];
    if (mapped) {
      columnIndices[mapped] = index;
    }
  });

  // Must have at least name column
  if (columnIndices.name === undefined) {
    // Try to auto-detect: first column is usually name, second is description/price
    columnIndices.name = 0;
    if (headers.length > 1) {
      // Check if second column looks like prices
      const secondColSample = lines[1] ? parseCSVLine(lines[1], delimiter)[1] : "";
      if (/^\d+(\.\d+)?$/.test(secondColSample?.trim() || "")) {
        columnIndices.price = 1;
      } else {
        columnIndices.description = 1;
        if (headers.length > 2) columnIndices.price = 2;
      }
    }
  }

  const items: ParsedMenuItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line, delimiter);
    const item: ParsedMenuItem = {
      name: values[columnIndices.name]?.trim().replace(/^["']|["']$/g, "") || "",
      description: columnIndices.description !== undefined
        ? values[columnIndices.description]?.trim().replace(/^["']|["']$/g, "")
        : undefined,
      price: columnIndices.price !== undefined
        ? parsePrice(values[columnIndices.price])
        : 0,
      category: columnIndices.category !== undefined
        ? values[columnIndices.category]?.trim().replace(/^["']|["']$/g, "")
        : undefined,
      tags: columnIndices.tags !== undefined
        ? parseTags(values[columnIndices.tags])
        : undefined,
      isSpicy: columnIndices.isSpicy !== undefined
        ? parseBoolean(values[columnIndices.isSpicy])
        : undefined,
      isVegetarian: columnIndices.isVegetarian !== undefined
        ? parseBoolean(values[columnIndices.isVegetarian])
        : undefined,
      isVegan: columnIndices.isVegan !== undefined
        ? parseBoolean(values[columnIndices.isVegan])
        : undefined,
      isBestseller: columnIndices.isBestseller !== undefined
        ? parseBoolean(values[columnIndices.isBestseller])
        : undefined,
      ingredients: columnIndices.ingredients !== undefined
        ? parseTags(values[columnIndices.ingredients])
        : undefined,
      allergens: columnIndices.allergens !== undefined
        ? parseTags(values[columnIndices.allergens])
        : undefined,
      preparationTime: columnIndices.preparationTime !== undefined
        ? parseInt(values[columnIndices.preparationTime]) || undefined
        : undefined,
    };

    if (item.name) {
      items.push(normalizeMenuItem(item));
    }
  }

  return {
    success: items.length > 0,
    items,
    categories: extractCategories(items),
    metadata: {
      sourceType: "csv",
      totalItems: items.length,
      confidence: items.length > 0 ? 0.95 : 0,
      processingTime: 0,
    },
  };
}

/**
 * Parse menu from Excel file
 */
async function parseMenuExcel(excelBuffer: Buffer): Promise<MenuParseResult> {
  // For Excel parsing, we'd typically use xlsx library
  // For now, convert to CSV-like format or use AI

  try {
    // Try to dynamically import xlsx
    const xlsx = await import("xlsx").catch(() => null);

    if (xlsx) {
      const workbook = xlsx.read(excelBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const csvData = xlsx.utils.sheet_to_csv(worksheet);

      return await parseMenuCsv(csvData);
    }
  } catch (error: any) {
    console.error("[MenuParser] Excel parsing error:", error.message);
  }

  // Fallback: try to parse as text/use AI
  return {
    success: false,
    items: [],
    categories: [],
    metadata: {
      sourceType: "excel",
      totalItems: 0,
      confidence: 0,
      processingTime: 0,
    },
    error: "Excel parsing requires xlsx library. Install with: npm install xlsx",
  };
}

/**
 * Parse menu from plain text using AI
 */
async function parseMenuFromText(text: string, sourceType: "pdf" | "csv"): Promise<MenuParseResult> {
  const prompt = `Parse this menu text and extract all menu items.

TEXT:
${text.substring(0, 10000)}

For each item extract: name, description, price (PHP number), category, tags, dietary info.

Return JSON:
{
  "items": [{"name": "", "description": "", "price": 0, "category": "", "tags": []}],
  "categories": []
}`;

  try {
    if (openRouter) {
      const response = await openRouter.chat.completions.create({
        model: TEXT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 8000,
      });

      const content = response.choices[0]?.message?.content || "";
      const jsonResponse = parseJsonFromText(content);

      if (jsonResponse) {
        const items = (jsonResponse.items || []).map(normalizeMenuItem);
        return {
          success: items.length > 0,
          items,
          categories: jsonResponse.categories || extractCategories(items),
          metadata: {
            sourceType,
            totalItems: items.length,
            confidence: 0.8,
            processingTime: 0,
          },
        };
      }
    }
  } catch (error: any) {
    console.error("[MenuParser] Text parsing error:", error.message);
  }

  return {
    success: false,
    items: [],
    categories: [],
    metadata: { sourceType, totalItems: 0, confidence: 0, processingTime: 0 },
    error: "Failed to parse menu text",
  };
}

// ============================================================================
// Description & Prompt Generation
// ============================================================================

/**
 * Generate detailed descriptions for menu items using AI
 */
export async function enrichMenuItems(
  items: ParsedMenuItem[],
  restaurantInfo?: { name?: string; cuisine?: string }
): Promise<ParsedMenuItem[]> {
  const itemsNeedingDescription = items.filter(
    (item) => !item.description || item.description.length < 20
  );

  if (itemsNeedingDescription.length === 0) {
    return items;
  }

  const cuisine = restaurantInfo?.cuisine || "Filipino";

  const prompt = `Generate appetizing menu descriptions for these food items from a ${cuisine} restaurant.

Items needing descriptions:
${itemsNeedingDescription.map((item, i) => `${i + 1}. ${item.name} (${item.category || "General"}) - Price: ₱${item.price}`).join("\n")}

For each item, generate:
1. A compelling description (1-2 sentences, max 100 chars)
2. Suggested tags (from: spicy, mild, vegetarian, vegan, seafood, grilled, fried, healthy, comfort, bestseller, premium, new)
3. Likely allergens (from: nuts, dairy, gluten, shellfish, eggs, soy, fish)
4. Estimated prep time in minutes

Return JSON array matching the order:
[
  {
    "description": "Tender grilled chicken marinated in traditional spices...",
    "tags": ["grilled", "bestseller"],
    "allergens": [],
    "preparationTime": 15
  }
]`;

  try {
    if (openRouter) {
      const response = await openRouter.chat.completions.create({
        model: TEXT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || "";
      const enrichments = parseJsonFromText(content);

      if (Array.isArray(enrichments)) {
        let enrichIndex = 0;
        return items.map((item) => {
          if (!item.description || item.description.length < 20) {
            const enrichment = enrichments[enrichIndex++];
            if (enrichment) {
              return {
                ...item,
                description: enrichment.description || item.description,
                tags: enrichment.tags || item.tags,
                allergens: enrichment.allergens || item.allergens,
                preparationTime: enrichment.preparationTime || item.preparationTime,
              };
            }
          }
          return item;
        });
      }
    }
  } catch (error: any) {
    console.error("[MenuParser] Enrichment error:", error.message);
  }

  return items;
}

/**
 * Generate image prompts for menu items
 */
export function generateImagePrompts(
  items: ParsedMenuItem[],
  cuisine?: string
): MenuItemWithImage[] {
  return items.map((item) => {
    const parts: string[] = [];

    // Base dish
    parts.push(`Professional food photography of ${item.name}.`);

    // Description
    if (item.description) {
      parts.push(item.description);
    }

    // Cuisine style
    if (cuisine) {
      parts.push(`${cuisine} cuisine style.`);
    }

    // Tags
    if (item.tags && item.tags.length > 0) {
      const tagHints: Record<string, string> = {
        spicy: "with visible red chili garnish",
        vegetarian: "fresh colorful vegetables",
        vegan: "plant-based, vibrant greens",
        grilled: "visible grill marks, smoky char",
        fried: "crispy golden-brown texture",
        healthy: "fresh, light presentation",
        comfort: "hearty homestyle serving",
        bestseller: "premium signature presentation",
        seafood: "fresh seafood garnish",
        premium: "fine-dining quality plating",
      };

      const hints = item.tags
        .map((tag) => tagHints[tag.toLowerCase()])
        .filter(Boolean);
      if (hints.length > 0) {
        parts.push(hints.join(", ") + ".");
      }
    }

    // Photography style
    parts.push(
      "Extremely appetizing, high-quality, well-lit, on a clean ceramic plate. " +
      "Restaurant-quality plating. Shallow depth of field, warm lighting. " +
      "NO text, NO watermarks, NO logos."
    );

    return {
      ...item,
      imagePrompt: parts.join(" "),
    };
  });
}

// ============================================================================
// Database Integration
// ============================================================================

/**
 * Create menu items in the database from parsed data
 */
export async function createMenuItemsFromParsed(
  restaurantId: string,
  items: ParsedMenuItem[],
  options: {
    generateImages?: boolean;
    enrichDescriptions?: boolean;
    createCategories?: boolean;
  } = {}
): Promise<MenuCreationResult> {
  const { generateImages = false, enrichDescriptions = true, createCategories = true } = options;

  const result: MenuCreationResult = {
    success: true,
    created: 0,
    failed: 0,
    items: [],
    errors: [],
  };

  try {
    // Enrich items if needed
    let processedItems = items;
    if (enrichDescriptions) {
      processedItems = await enrichMenuItems(items);
    }

    // Generate image prompts
    const itemsWithPrompts = generateImagePrompts(processedItems);

    // Get or create categories
    const categoryMap = new Map<string, string>();

    if (createCategories) {
      const existingCategories = await storage.getMenuCategories(restaurantId);
      existingCategories.forEach((cat: any) => {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      });

      // Create missing categories
      const uniqueCategories = [...new Set(items.map((i) => i.category).filter(Boolean))];
      for (const categoryName of uniqueCategories) {
        if (!categoryMap.has(categoryName!.toLowerCase())) {
          try {
            const newCategory = await storage.createMenuCategory({
              restaurantId,
              name: categoryName!,
              displayOrder: categoryMap.size + 1,
            });
            categoryMap.set(categoryName!.toLowerCase(), newCategory.id);
          } catch (error: any) {
            console.error(`[MenuParser] Failed to create category ${categoryName}:`, error.message);
          }
        }
      }
    }

    // Create menu items
    for (const item of itemsWithPrompts) {
      try {
        const categoryId = item.category
          ? categoryMap.get(item.category.toLowerCase())
          : undefined;

        // Create the menu item
        const menuItem = await storage.createMenuItem({
          restaurantId,
          categoryId,
          name: item.name,
          description: item.description || `Delicious ${item.name} prepared fresh.`,
          shortDescription: item.shortDescription,
          price: String(item.price || 0),
          isAvailable: true,
          preparationTime: item.preparationTime || 15,
          tags: item.tags,
          allergens: item.allergens,
          nutritionalInfo: item.nutritionalInfo,
        });

        // Generate image if requested
        if (generateImages && menuItem.id) {
          try {
            console.log(`[MenuParser] Generating image for: ${item.name}`);
            const imageUrl = await generateMenuItemImage(
              item.name,
              item.imagePrompt || item.description || "",
              menuItem.id
            );

            // Update menu item with image
            await storage.updateMenuItem(menuItem.id, { imageUrl });
            menuItem.imageUrl = imageUrl;
          } catch (imgError: any) {
            console.error(`[MenuParser] Image generation failed for ${item.name}:`, imgError.message);
          }
        }

        result.items.push(menuItem);
        result.created++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`Failed to create "${item.name}": ${error.message}`);
      }
    }

    result.success = result.created > 0;
  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

function isImageFile(ext: string, mime: string): boolean {
  return (
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext) ||
    mime.startsWith("image/")
  );
}

function isPdfFile(ext: string, mime: string): boolean {
  return ext === ".pdf" || mime === "application/pdf";
}

function isCsvFile(ext: string, mime: string): boolean {
  return (
    [".csv", ".tsv"].includes(ext) ||
    mime.includes("csv") ||
    mime.includes("tab-separated")
  );
}

function isExcelFile(ext: string, mime: string): boolean {
  return (
    [".xlsx", ".xls"].includes(ext) ||
    mime.includes("spreadsheet") ||
    mime.includes("excel")
  );
}

function parseJsonFromText(text: string): any {
  try {
    let cleaned = text.trim();
    // Remove markdown code blocks
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  } catch {
    // Try to find JSON in the text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parsePrice(value: string | undefined): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseTags(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[,;|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return ["true", "yes", "1", "y", "x", "✓", "✔"].includes(v);
}

function normalizeMenuItem(item: any): ParsedMenuItem {
  return {
    name: String(item.name || "").trim(),
    description: item.description?.trim(),
    shortDescription: item.shortDescription?.trim() || item.description?.substring(0, 100)?.trim(),
    price: typeof item.price === "number" ? item.price : parsePrice(String(item.price)),
    category: item.category?.trim(),
    tags: Array.isArray(item.tags) ? item.tags.map((t: string) => t.toLowerCase()) : undefined,
    allergens: Array.isArray(item.allergens) ? item.allergens : undefined,
    ingredients: Array.isArray(item.ingredients) ? item.ingredients : undefined,
    preparationTime: item.preparationTime || item.prepTime,
    isSpicy: item.isSpicy || item.spicy,
    isVegetarian: item.isVegetarian || item.vegetarian,
    isVegan: item.isVegan || item.vegan,
    isBestseller: item.isBestseller || item.bestseller || item.popular,
    nutritionalInfo: item.nutritionalInfo,
    originalText: item.originalText,
  };
}

function extractCategories(items: ParsedMenuItem[]): string[] {
  const categories = new Set<string>();
  items.forEach((item) => {
    if (item.category) {
      categories.add(item.category);
    }
  });
  return Array.from(categories);
}
