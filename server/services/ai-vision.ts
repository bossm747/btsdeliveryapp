import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import { LocalStorageService } from "./local-storage";

// ============================================================================
// AI Vision Service - Analyze images and extract menu data
// ============================================================================

const openRouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.PUBLIC_APP_URL || "https://btsdelivery.com",
        "X-Title": "BTS Delivery AI Vision",
      },
    })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Vision-capable models
const VISION_MODELS = {
  primary: "google/gemini-2.0-flash-exp:free", // Free vision model
  fallback: "google/gemini-flash-1.5-8b", // Fallback vision model
};

export interface MenuItemExtracted {
  name: string;
  description?: string;
  price: number;
  category?: string;
  image?: string;
}

export interface MenuAnalysisResult {
  success: boolean;
  items: MenuItemExtracted[];
  categories: string[];
  rawText?: string;
  confidence: number;
  error?: string;
}

export interface ImageAnalysisResult {
  success: boolean;
  description: string;
  objects: string[];
  text?: string;
  confidence: number;
  error?: string;
}

/**
 * Analyze an image using AI vision
 */
export async function analyzeImage(
  imageData: Buffer | string, // Buffer or base64 string
  prompt: string = "Describe this image in detail."
): Promise<ImageAnalysisResult> {
  try {
    // Convert buffer to base64 if needed
    const base64Image =
      typeof imageData === "string"
        ? imageData.replace(/^data:image\/\w+;base64,/, "")
        : imageData.toString("base64");

    // Try OpenRouter first
    if (openRouter) {
      try {
        const response = await openRouter.chat.completions.create({
          model: VISION_MODELS.primary,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
        });

        const content = response.choices[0]?.message?.content || "";

        return {
          success: true,
          description: content,
          objects: extractObjects(content),
          text: extractText(content),
          confidence: 0.9,
        };
      } catch (error: any) {
        console.error("[AI Vision] OpenRouter error:", error.message);
      }
    }

    // Fallback to Gemini
    if (gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        });

        const content = response.text || "";

        return {
          success: true,
          description: content,
          objects: extractObjects(content),
          text: extractText(content),
          confidence: 0.85,
        };
      } catch (error: any) {
        console.error("[AI Vision] Gemini error:", error.message);
      }
    }

    return {
      success: false,
      description: "",
      objects: [],
      confidence: 0,
      error: "No vision AI provider available",
    };
  } catch (error: any) {
    console.error("[AI Vision] Analysis error:", error);
    return {
      success: false,
      description: "",
      objects: [],
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Analyze a menu image and extract menu items
 */
export async function analyzeMenuImage(
  imageData: Buffer | string
): Promise<MenuAnalysisResult> {
  const prompt = `Analyze this menu image and extract all menu items. For each item, identify:
1. Item name
2. Description (if visible)
3. Price (in PHP, just the number)
4. Category (e.g., Appetizers, Main Course, Beverages, Desserts)

Return the data in JSON format:
{
  "items": [
    {"name": "Item Name", "description": "Description if any", "price": 100, "category": "Category"},
    ...
  ],
  "categories": ["Category1", "Category2", ...],
  "rawText": "Any other text visible on the menu"
}

Important:
- Extract ALL visible menu items
- If price is not visible, estimate based on typical Filipino restaurant prices
- Categories should be in English
- Price should be a number only (no currency symbol)
- If the image is not a menu, return {"items": [], "categories": [], "error": "Not a menu image"}`;

  try {
    const base64Image =
      typeof imageData === "string"
        ? imageData.replace(/^data:image\/\w+;base64,/, "")
        : imageData.toString("base64");

    let jsonResponse: any = null;

    // Try OpenRouter first
    if (openRouter) {
      try {
        const response = await openRouter.chat.completions.create({
          model: VISION_MODELS.primary,
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
          max_tokens: 4000,
        });

        const content = response.choices[0]?.message?.content || "";
        jsonResponse = parseJsonResponse(content);
      } catch (error: any) {
        console.error("[AI Vision] Menu analysis OpenRouter error:", error.message);
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
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        });

        const content = response.text || "";
        jsonResponse = parseJsonResponse(content);
      } catch (error: any) {
        console.error("[AI Vision] Menu analysis Gemini error:", error.message);
      }
    }

    if (!jsonResponse) {
      return {
        success: false,
        items: [],
        categories: [],
        confidence: 0,
        error: "Failed to analyze menu image",
      };
    }

    return {
      success: true,
      items: jsonResponse.items || [],
      categories: jsonResponse.categories || [],
      rawText: jsonResponse.rawText,
      confidence: jsonResponse.items?.length > 0 ? 0.85 : 0.5,
    };
  } catch (error: any) {
    console.error("[AI Vision] Menu analysis error:", error);
    return {
      success: false,
      items: [],
      categories: [],
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Create menu items from analyzed menu data and save to database
 */
export async function createMenuFromAnalysis(
  restaurantId: string,
  analysis: MenuAnalysisResult,
  generateImages: boolean = false
): Promise<{
  success: boolean;
  created: number;
  items: any[];
  error?: string;
}> {
  try {
    if (!analysis.success || analysis.items.length === 0) {
      return {
        success: false,
        created: 0,
        items: [],
        error: "No menu items to create",
      };
    }

    const createdItems: any[] = [];

    // Get or create categories
    const categoryMap = new Map<string, string>();
    const existingCategories = await storage.getMenuCategories(restaurantId);

    for (const categoryName of analysis.categories) {
      const existing = existingCategories.find(
        (c: any) => c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (existing) {
        categoryMap.set(categoryName, existing.id);
      } else {
        const newCategory = await storage.createMenuCategory({
          restaurantId,
          name: categoryName,
          displayOrder: categoryMap.size + 1,
        });
        categoryMap.set(categoryName, newCategory.id);
      }
    }

    // Create menu items
    for (const item of analysis.items) {
      try {
        // Get category ID
        let categoryId = categoryMap.get(item.category || "");
        if (!categoryId) {
          // Use first category or create "Other"
          categoryId = categoryMap.values().next().value;
          if (!categoryId) {
            const otherCategory = await storage.createMenuCategory({
              restaurantId,
              name: "Other",
              displayOrder: 99,
            });
            categoryId = otherCategory.id;
            categoryMap.set("Other", categoryId);
          }
        }

        // Create menu item
        const menuItem = await storage.createMenuItem({
          restaurantId,
          categoryId,
          name: item.name,
          description: item.description || `Delicious ${item.name} from our kitchen.`,
          price: String(item.price),
          isAvailable: true,
          stockQuantity: 100,
        });

        createdItems.push(menuItem);
      } catch (error: any) {
        console.error(`[AI Vision] Error creating menu item ${item.name}:`, error.message);
      }
    }

    return {
      success: true,
      created: createdItems.length,
      items: createdItems,
    };
  } catch (error: any) {
    console.error("[AI Vision] Error creating menu from analysis:", error);
    return {
      success: false,
      created: 0,
      items: [],
      error: error.message,
    };
  }
}

/**
 * Analyze a document (receipt, invoice, etc.)
 */
export async function analyzeDocument(
  documentData: Buffer | string,
  documentType: "receipt" | "invoice" | "menu" | "general" = "general"
): Promise<ImageAnalysisResult> {
  const prompts: Record<string, string> = {
    receipt:
      "Analyze this receipt image. Extract: store name, date, items purchased, prices, total amount, and payment method. Format as structured data.",
    invoice:
      "Analyze this invoice image. Extract: vendor name, invoice number, date, line items with quantities and prices, subtotal, tax, and total.",
    menu: "Analyze this menu. Extract all menu items with names, descriptions, prices, and categories.",
    general:
      "Analyze this document image. Extract all relevant text and data, organizing it in a structured format.",
  };

  return await analyzeImage(documentData, prompts[documentType]);
}

// Helper functions
function parseJsonResponse(content: string): any {
  try {
    // Clean up markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim());
  } catch {
    return null;
  }
}

function extractObjects(text: string): string[] {
  // Simple extraction of nouns/objects from description
  const objects: string[] = [];
  const patterns = [
    /(?:shows?|contains?|displays?|features?|includes?)\s+(?:a|an|the|some)?\s*([^,.]+)/gi,
    /(?:there\s+(?:is|are))\s+(?:a|an|the|some)?\s*([^,.]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        objects.push(match[1].trim());
      }
    }
  }

  return Array.from(new Set(objects)).slice(0, 10);
}

function extractText(content: string): string | undefined {
  // Extract any quoted text or text that appears to be read from the image
  const textMatches = content.match(/"([^"]+)"/g);
  if (textMatches && textMatches.length > 0) {
    return textMatches.map((t) => t.replace(/"/g, "")).join(", ");
  }
  return undefined;
}
