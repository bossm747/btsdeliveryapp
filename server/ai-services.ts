import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";
import OpenAI from "openai";
import Replicate from "replicate";
import { LocalObjectStorageService } from "./services/local-object-storage";

// ============================================================================
// AI Provider Configuration - Replicate (images) + OpenRouter + Gemini (fallback)
// ============================================================================

// Replicate - Image generation with z-image-turbo model
const replicate = process.env.REPLICATE_API_TOKEN
  ? new Replicate({ auth: process.env.REPLICATE_API_TOKEN })
  : null;

// OpenRouter - Access to many AI providers
const openRouter = process.env.OPENROUTER_API_KEY ? new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.PUBLIC_APP_URL || "https://btsdelivery.com",
    "X-Title": "BTS Delivery Platform"
  }
}) : null;

// Gemini - Google's AI (fallback)
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// Available models
const MODELS = {
  text: "google/gemini-3-flash-preview",        // Text generation
  smart: "xiaomi/mimo-v2-flash:free",           // Free smart model
  capable: "openai/gpt-oss-120b",               // Capable model
  image: "prunaai/z-image-turbo",               // Replicate image generation (fast, high quality)
  vision: "google/gemini-2.5-flash-image",      // Vision/image analysis
  fallback: "meta-llama/llama-3.2-3b-instruct:free" // Free fallback
};

// Unified AI text generation function
async function generateText(prompt: string): Promise<string> {
  // Try OpenRouter first
  if (openRouter) {
    try {
      const response = await openRouter.chat.completions.create({
        model: MODELS.text,
        messages: [
          { role: "system", content: "You are a helpful AI assistant for BTS Delivery, a food delivery service in Batangas, Philippines." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      return response.choices[0]?.message?.content || "";
    } catch (error: any) {
      console.error("[AI Service] OpenRouter error:", error.message);
    }
  }

  // Fallback to Gemini
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      return response.text || "";
    } catch (error: any) {
      console.error("[AI Service] Gemini error:", error.message);
    }
  }

  throw new Error("No AI provider available");
}

// Unified AI JSON generation function
async function generateJSON<T>(prompt: string, fallback: T): Promise<T> {
  const jsonPrompt = prompt + "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no code blocks, no explanations.";

  try {
    const result = await generateText(jsonPrompt);
    // Clean up potential markdown
    let cleaned = result.trim();
    if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
    if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  } catch {
    return fallback;
  }
}

// ============================================================================
// MENU CONTENT GENERATION SERVICES
// ============================================================================

export async function generateMenuItemDescription(itemName: string, category: string, ingredients?: string[]): Promise<string> {
  try {
    const ingredientsText = ingredients ? ` with ingredients: ${ingredients.join(', ')}` : '';
    const prompt = `Create an appetizing, professional menu description for "${itemName}" in the ${category} category${ingredientsText}.

    Make it 1-2 sentences that highlight the dish's appeal, cooking method, and key flavors.
    Use enticing language that makes customers want to order it. Keep it concise but compelling.

    Examples of good descriptions:
    - "Tender grilled chicken breast marinated in aromatic herbs, served with garlic mashed potatoes and seasonal vegetables"
    - "Crispy golden fries seasoned with our signature spice blend, perfect for sharing or as a satisfying side"

    Don't use overly fancy words. Make it sound delicious and approachable.

    Return ONLY the description text, nothing else.`;

    return await generateText(prompt) || "A delicious dish prepared with care using fresh ingredients.";
  } catch (error) {
    console.error('Error generating menu description:', error);
    return "A delicious dish prepared with care using fresh ingredients.";
  }
}

export async function generateBusinessDescription(businessName: string, cuisineType: string, specialties: string[]): Promise<string> {
  try {
    const prompt = `Create a compelling, SEO-optimized business description for "${businessName}", a ${cuisineType} restaurant.

    Key specialties: ${specialties.join(', ')}

    Requirements:
    - 2-3 sentences
    - Professional but warm tone
    - Include cuisine type and location appeal (Batangas Province)
    - Mention quality, freshness, and customer experience
    - SEO-friendly for food delivery platforms

    Return ONLY the description text, nothing else.`;

    return await generateText(prompt) || `${businessName} - Serving authentic ${cuisineType} cuisine in Batangas Province with fresh ingredients and exceptional flavors.`;
  } catch (error) {
    console.error('Error generating business description:', error);
    return `${businessName} - Serving authentic ${cuisineType} cuisine in Batangas Province with fresh ingredients and exceptional flavors.`;
  }
}

// ============================================================================
// IMAGE GENERATION SERVICES
// ============================================================================

/**
 * Generate menu item image using AI
 * Uses Replicate z-image-turbo (primary), then Gemini, then Unsplash fallback
 * Saves the image locally and returns a URL path
 */
export async function generateMenuItemImage(itemName: string, description: string, menuItemId?: string): Promise<string> {
  const prompt = `Professional food photography of ${itemName}. ${description}.
Extremely appetizing, high-quality, well-lit, on a clean ceramic plate with beautiful presentation.
Restaurant-quality plating. Filipino/Asian cuisine style. Shallow depth of field, warm natural lighting.
Top-down or 45-degree angle shot. Fresh ingredients visible. NO text, NO watermarks, NO logos.`;

  const safeName = itemName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = menuItemId
    ? `${safeName}-${Date.now()}.jpg`
    : `${safeName}.jpg`;

  console.log(`[AI] Generating image for menu item: ${itemName}`);

  // Try Replicate z-image-turbo first (fast, high quality)
  if (replicate) {
    try {
      console.log(`[AI] Using Replicate z-image-turbo...`);

      const output = await replicate.run("prunaai/z-image-turbo", {
        input: {
          prompt: prompt,
          height: 768,
          width: 768,
        }
      }) as any;

      // Handle the output - it's a ReadableStream with a url() method that returns a URL object
      let imageUrl: string | null = null;

      if (output && typeof output.url === 'function') {
        // Call url() to get URL object, then get href
        const urlObj = output.url();
        imageUrl = urlObj?.href || null;
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === 'string') {
          imageUrl = first;
        } else if (first && typeof first.url === 'function') {
          const urlObj = first.url();
          imageUrl = urlObj?.href || null;
        }
      }

      if (imageUrl) {
        console.log(`[AI] Replicate generated image URL: ${imageUrl}`);

        // Save the image locally with a descriptive name
        const result = await LocalObjectStorageService.saveImageFromUrl(
          imageUrl,
          "menu",
          menuItemId,
          safeName // Use item name as custom filename
        );

        if (result.success && result.url) {
          console.log(`[AI] Saved Replicate image: ${result.url}`);
          return result.url;
        }
      }

      console.log(`[AI] Replicate: No valid URL in output`);
    } catch (error: any) {
      console.error(`[AI] Replicate failed:`, error.message);
    }
  }

  // Fallback to Gemini native image generation
  if (gemini) {
    try {
      console.log(`[AI] Trying Gemini native image generation...`);

      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const content = candidates[0].content;
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const imageBuffer = Buffer.from(part.inlineData.data, "base64");
              const result = await LocalObjectStorageService.saveFile(
                imageBuffer,
                filename,
                "menu",
                menuItemId,
                safeName // Use item name as custom filename
              );

              if (result.success && result.url) {
                console.log(`[AI] Generated Gemini menu item image: ${result.url}`);
                return result.url;
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[AI] Gemini image generation failed:', error.message);
    }
  }

  // Final fallback: Use Unsplash food images
  console.log(`[AI] Using Unsplash fallback for: ${itemName}`);
  try {
    const unsplashUrl = getUnsplashFoodImageUrl(itemName);
    const result = await LocalObjectStorageService.saveImageFromUrl(
      unsplashUrl,
      "menu",
      menuItemId,
      safeName // Use item name as custom filename
    );
    if (result.success && result.url) {
      console.log(`[AI] Saved Unsplash food image: ${result.url}`);
      return result.url;
    }
  } catch (error: any) {
    console.error('[AI] Unsplash fallback failed:', error.message);
  }

  // Return placeholder if all methods fail
  return `https://placehold.co/400x400/ff6b35/ffffff?text=${encodeURIComponent(itemName)}`;
}

/**
 * Get a high-quality Unsplash food image URL based on item name
 */
function getUnsplashFoodImageUrl(itemName: string): string {
  const itemLower = itemName.toLowerCase();

  // Map common food items to specific Unsplash images
  const foodImages: Record<string, string[]> = {
    'chicken': [
      'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1608039829572-f73dc027b45b?w=600&h=600&fit=crop',
    ],
    'burger': [
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&h=600&fit=crop',
    ],
    'fries': [
      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1630384060421-cb20acd7d6fc?w=600&h=600&fit=crop',
    ],
    'rice': [
      'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&h=600&fit=crop',
    ],
    'noodle': [
      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&h=600&fit=crop',
    ],
    'pizza': [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=600&fit=crop',
    ],
    'spaghetti': [
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=600&fit=crop',
    ],
    'soup': [
      'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=600&h=600&fit=crop',
    ],
    'dessert': [
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=600&fit=crop',
    ],
    'coffee': [
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop',
    ],
    'drink': [
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&h=600&fit=crop',
    ],
    'salad': [
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=600&fit=crop',
    ],
    'fish': [
      'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=600&h=600&fit=crop',
    ],
    'pork': [
      'https://images.unsplash.com/photo-1598514983318-2f64f8f4796c?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=600&fit=crop',
    ],
    'beef': [
      'https://images.unsplash.com/photo-1558030006-450675393462?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=600&h=600&fit=crop',
    ],
  };

  // Default food images
  const defaultImages = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600&h=600&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=600&fit=crop',
  ];

  // Find matching category
  for (const [keyword, images] of Object.entries(foodImages)) {
    if (itemLower.includes(keyword)) {
      return images[Math.floor(Math.random() * images.length)];
    }
  }

  // Return random default image
  return defaultImages[Math.floor(Math.random() * defaultImages.length)];
}

/**
 * Generate promotional banner using AI
 * Saves the image locally and returns a URL path
 */
export async function generatePromotionalBanner(businessName: string, promotion: string, colors: string[] = ["#ff6b35", "#ffffff"]): Promise<string> {
  const prompt = `Create a modern promotional banner for "${businessName}" restaurant. Promotion: "${promotion}". Colors: ${colors.join(' and ')}. Social media ready, horizontal layout, Filipino food delivery style.`;

  // Try Gemini image generation first
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const content = candidates[0].content;
        if (content && content.parts) {
          for (const part of content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const imageBuffer = Buffer.from(part.inlineData.data, "base64");
              const result = await LocalObjectStorageService.saveFile(
                imageBuffer,
                `banner-${businessName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`,
                "ai-generated"
              );

              if (result.success && result.url) {
                console.log(`[AI] Generated promotional banner: ${result.url}`);
                return result.url;
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[AI] Error generating banner via Gemini:', error.message);
    }
  }

  // Try OpenRouter as fallback
  if (openRouter) {
    try {
      const response = await openRouter.chat.completions.create({
        model: MODELS.image,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.startsWith('http')) {
        const result = await LocalObjectStorageService.saveImageFromUrl(content, "ai-generated");
        if (result.success && result.url) {
          return result.url;
        }
        return content;
      }
    } catch (error: any) {
      console.error('[AI] Error generating banner via OpenRouter:', error.message);
    }
  }

  return `https://placehold.co/1200x400/ff6b35/ffffff?text=${encodeURIComponent(promotion)}`;
}

/**
 * Generate restaurant cover image using AI
 * Creates a professional, realistic cover photo for a restaurant
 * Uses Replicate z-image-turbo (primary), then Gemini, then Unsplash fallback
 * Saves the image locally to /uploads/images/restaurants/ and returns a URL path
 */
export async function generateRestaurantCoverImage(
  restaurantName: string,
  category: string,
  description?: string,
  restaurantId?: string
): Promise<string> {
  // Build a detailed prompt for realistic restaurant imagery
  const cuisineStyle = getCuisineStyle(category);
  const prompt = `Professional restaurant cover photo for "${restaurantName}".
${cuisineStyle}
${description ? `Theme: ${description}` : ''}
Ultra-realistic photograph quality, wide banner format (16:9 aspect ratio).
Inviting restaurant scene with warm lighting, appetizing ${category} cuisine dishes.
Professional food photography with shallow depth of field, clean modern interior.
Vibrant colors, high-end restaurant ambiance with Filipino touches.
NO text, logos, or watermarks.`;

  console.log(`[AI] Generating cover image for restaurant: ${restaurantName} (${category})`);

  const safeName = restaurantName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = restaurantId
    ? `${safeName}-cover-${Date.now()}.jpg`
    : `${safeName}-cover.jpg`;

  // Try Replicate z-image-turbo first (fast, high quality)
  if (replicate) {
    try {
      console.log(`[AI] Using Replicate z-image-turbo...`);

      const output = await replicate.run("prunaai/z-image-turbo", {
        input: {
          prompt: prompt,
          height: 576,  // Must be divisible by 16
          width: 1024,  // Must be divisible by 16
        }
      }) as any;

      // Handle the output - it's a ReadableStream with a url() method that returns a URL object
      let imageUrl: string | null = null;

      if (output && typeof output.url === 'function') {
        const urlObj = output.url();
        imageUrl = urlObj?.href || null;
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === 'string') {
          imageUrl = first;
        } else if (first && typeof first.url === 'function') {
          const urlObj = first.url();
          imageUrl = urlObj?.href || null;
        }
      }

      if (imageUrl) {
        console.log(`[AI] Replicate generated image URL: ${imageUrl}`);

        // Save the image locally with descriptive name
        const result = await LocalObjectStorageService.saveImageFromUrl(
          imageUrl,
          "restaurants",
          restaurantId,
          `${safeName}-cover` // Use restaurant name as custom filename
        );

        if (result.success && result.url) {
          console.log(`[AI] Saved Replicate cover image: ${result.url}`);
          return result.url;
        }
      }

      console.log(`[AI] Replicate: No valid URL in output`);
    } catch (error: any) {
      console.error(`[AI] Replicate failed:`, error.message);
    }
  }

  // Fallback to Gemini native image generation
  if (gemini) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI] Gemini native attempt ${attempt}/${maxRetries}...`);

        const response = await gemini.models.generateContent({
          model: "gemini-2.0-flash-exp-image-generation",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          const content = candidates[0].content;
          if (content && content.parts) {
            for (const part of content.parts) {
              if (part.inlineData && part.inlineData.data) {
                // Save the generated image locally to restaurants folder
                const imageBuffer = Buffer.from(part.inlineData.data, "base64");

                const result = await LocalObjectStorageService.saveFile(
                  imageBuffer,
                  filename,
                  "restaurants",
                  restaurantId,
                  `${safeName}-cover` // Use restaurant name as custom filename
                );

                if (result.success && result.url) {
                  console.log(`[AI] Generated restaurant cover image: ${result.url}`);
                  return result.url;
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error(`[AI] Gemini attempt ${attempt} failed:`, error.message);

        // Check if it's a rate limit error
        if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
          // Extract retry delay if available
          const retryMatch = error.message?.match(/retry.*?(\d+)/i);
          const retryDelay = retryMatch ? parseInt(retryMatch[1]) * 1000 : 60000;

          if (attempt < maxRetries) {
            console.log(`[AI] Rate limited. Waiting ${retryDelay/1000}s before retry...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        } else {
          break; // Don't retry on non-rate-limit errors
        }
      }
    }
  }

  // Fallback: Use high-quality stock photos from Unsplash based on category
  console.log(`[AI] Using Unsplash fallback for: ${restaurantName}`);
  try {
    const unsplashUrl = getUnsplashImageUrl(category);
    const result = await LocalObjectStorageService.saveImageFromUrl(
      unsplashUrl,
      "restaurants",
      restaurantId,
      `${safeName}-cover` // Use restaurant name as custom filename
    );
    if (result.success && result.url) {
      console.log(`[AI] Saved Unsplash cover image: ${result.url}`);
      return result.url;
    }
  } catch (error: any) {
    console.error('[AI] Unsplash fallback failed:', error.message);
  }

  // Final fallback: Return placeholder
  const encodedName = encodeURIComponent(restaurantName);
  return `https://placehold.co/1200x600/004225/ffffff?text=${encodedName}`;
}

/**
 * Get a high-quality Unsplash image URL based on restaurant category
 */
function getUnsplashImageUrl(category: string): string {
  // Map categories to Unsplash search terms and curated photo IDs
  const categoryImages: Record<string, string[]> = {
    'Filipino': [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop', // Food spread
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=600&fit=crop', // Asian food
      'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=600&fit=crop', // Restaurant food
    ],
    'Fast Food': [
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1200&h=600&fit=crop', // Burger
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&h=600&fit=crop', // Burger delicious
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&h=600&fit=crop', // Fast food
    ],
    'Chinese': [
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1200&h=600&fit=crop', // Chinese food
      'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&h=600&fit=crop', // Dim sum
      'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=1200&h=600&fit=crop', // Noodles
    ],
    'Japanese': [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&h=600&fit=crop', // Sushi
      'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=1200&h=600&fit=crop', // Ramen
      'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&h=600&fit=crop', // Japanese food
    ],
    'Korean': [
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1200&h=600&fit=crop', // Korean BBQ
      'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1200&h=600&fit=crop', // Korean food
      'https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=1200&h=600&fit=crop', // Bibimbap
    ],
    'Italian': [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=600&fit=crop', // Pizza
      'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&h=600&fit=crop', // Pasta
      'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=1200&h=600&fit=crop', // Italian food
    ],
    'Seafood': [
      'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=1200&h=600&fit=crop', // Seafood platter
      'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?w=1200&h=600&fit=crop', // Shrimp
      'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=1200&h=600&fit=crop', // Fish
    ],
    'Cafe': [
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=600&fit=crop', // Coffee
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&h=600&fit=crop', // Cafe interior
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&h=600&fit=crop', // Cafe ambiance
    ],
    'Desserts': [
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&h=600&fit=crop', // Desserts
      'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1200&h=600&fit=crop', // Cake
      'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1200&h=600&fit=crop', // Ice cream
    ],
    'Pizza': [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=600&fit=crop', // Pizza
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&h=600&fit=crop', // Pizza slice
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&h=600&fit=crop', // Fresh pizza
    ],
    'Chicken': [
      'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=1200&h=600&fit=crop', // Fried chicken
      'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=1200&h=600&fit=crop', // Chicken wings
      'https://images.unsplash.com/photo-1608039829572-f73dc027b45b?w=1200&h=600&fit=crop', // Crispy chicken
    ],
    'Bakery': [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&h=600&fit=crop', // Bread
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=1200&h=600&fit=crop', // Pastries
      'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=1200&h=600&fit=crop', // Bakery
    ],
    'Beverages': [
      'https://images.unsplash.com/photo-1558857563-b371033873b8?w=1200&h=600&fit=crop', // Bubble tea
      'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=1200&h=600&fit=crop', // Drinks
      'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1200&h=600&fit=crop', // Refreshments
    ],
    'Street Food': [
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=600&fit=crop', // Street food
      'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=1200&h=600&fit=crop', // Night market
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop', // Food spread
    ],
  };

  // Default food images for unknown categories
  const defaultImages = [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=600&fit=crop',
  ];

  // Get images for the category or use default
  const images = categoryImages[category] || categoryImages['Filipino'] || defaultImages;

  // Return a random image from the category
  return images[Math.floor(Math.random() * images.length)];
}

/**
 * Helper function to get cuisine-specific styling hints
 */
function getCuisineStyle(category: string): string {
  const styles: Record<string, string> = {
    'Filipino': 'Traditional Filipino cuisine with dishes like adobo, sinigang, lechon. Warm, homey atmosphere with wooden accents.',
    'Fast Food': 'Modern fast-food restaurant with burgers, fries, fried chicken. Bright, clean, and energetic vibe.',
    'Chinese': 'Chinese restaurant with dim sum, noodles, stir-fry dishes. Red and gold accents, elegant presentation.',
    'Japanese': 'Japanese cuisine with sushi, ramen, tempura. Minimalist, zen-like atmosphere with clean lines.',
    'Korean': 'Korean BBQ and dishes like bibimbap, kimchi. Sizzling grills, communal dining atmosphere.',
    'Italian': 'Italian restaurant with pasta, pizza, risotto. Rustic Mediterranean ambiance with warm lighting.',
    'American': 'American diner style with burgers, steaks, comfort food. Casual, friendly atmosphere.',
    'Seafood': 'Fresh seafood restaurant with fish, shrimp, crabs. Coastal, nautical theme with blue accents.',
    'Cafe': 'Cozy cafe with coffee, pastries, light meals. Instagram-worthy aesthetic with plants and natural light.',
    'Desserts': 'Dessert shop with cakes, ice cream, sweet treats. Colorful, whimsical, inviting display.',
    'Pizza': 'Pizzeria with wood-fired pizzas, Italian ingredients. Rustic, casual dining atmosphere.',
    'Chicken': 'Fried chicken restaurant with crispy, golden chicken. Comfort food vibes, family-friendly.',
    'Bakery': 'Artisan bakery with fresh bread, pastries, cakes. Warm, aromatic, European-style.',
    'Beverages': 'Milk tea or bubble tea shop. Modern, trendy, colorful drinks on display.',
    'Street Food': 'Filipino street food with barbecue, isaw, fish balls. Vibrant, bustling night market feel.',
  };

  return styles[category] || `${category} cuisine restaurant with signature dishes. Professional, appetizing food photography.`;
}

// ============================================================================
// ANALYTICS & INSIGHTS SERVICES
// ============================================================================

export async function analyzeSalesData(salesData: any[], period: string): Promise<{
  insights: string;
  recommendations: string[];
  trends: string;
}> {
  const dataJson = JSON.stringify(salesData.slice(0, 50));
  const prompt = `Analyze this restaurant sales data for ${period} and provide actionable business insights:

    ${dataJson}

    Provide analysis in JSON format with these fields:
    - insights: Key observations about sales performance (2-3 sentences)
    - recommendations: Array of 3-5 specific actionable recommendations
    - trends: Notable patterns or trends (1-2 sentences)

    Focus on practical advice for restaurant operations, menu optimization, and revenue growth.`;

  return await generateJSON(prompt, {
    insights: "Unable to analyze sales data at this time.",
    recommendations: ["Monitor daily sales patterns", "Review popular menu items", "Check delivery times"],
    trends: "Analysis temporarily unavailable."
  });
}

export async function generatePricingRecommendations(menuItem: any, competitorPrices: number[], marketData: any): Promise<{
  recommendedPrice: number;
  reasoning: string;
  priceRange: { min: number; max: number };
}> {
  const avgCompetitorPrice = competitorPrices.length > 0
    ? competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length
    : menuItem.price;

  const prompt = `Analyze pricing for "${menuItem.name}" in the ${menuItem.category} category:

    Current price: ₱${menuItem.price}
    Competitor prices: [${competitorPrices.join(', ')}] (Average: ₱${avgCompetitorPrice})
    Cost margin target: 30-35%
    Market: Batangas Province food delivery

    Recommend optimal pricing strategy in JSON:
    - recommendedPrice: Optimal price as number
    - reasoning: Brief explanation (1-2 sentences)
    - priceRange: {min: number, max: number} for testing

    Consider local market conditions, delivery platform fees, and profit margins.`;

  return await generateJSON(prompt, {
    recommendedPrice: menuItem.price,
    reasoning: "Unable to analyze pricing at this time.",
    priceRange: { min: menuItem.price * 0.9, max: menuItem.price * 1.1 }
  });
}

// ============================================================================
// MARKETING & CUSTOMER SERVICE
// ============================================================================

export async function generateSocialMediaPost(businessName: string, postType: 'new_item' | 'promotion' | 'general', content: any): Promise<{
  caption: string;
  hashtags: string[];
  callToAction: string;
}> {
  let context = '';
  switch (postType) {
    case 'new_item':
      context = `New menu item: ${content.itemName} - ${content.description}`;
      break;
    case 'promotion':
      context = `Promotion: ${content.title} - ${content.details}`;
      break;
    case 'general':
      context = content.message || 'General business post';
      break;
  }

  const prompt = `Create an engaging social media post for "${businessName}" restaurant:

    Context: ${context}
    Platform: Facebook/Instagram style

    Generate JSON with:
    - caption: Engaging 1-2 sentence caption
    - hashtags: Array of 5-8 relevant hashtags (without # symbol)
    - callToAction: Strong call-to-action phrase

    Make it appealing for food delivery audience in Batangas Province. Use warm, inviting tone.`;

  return await generateJSON(prompt, {
    caption: `Delicious food from ${businessName} is just a tap away!`,
    hashtags: ["fooddelivery", "batangas", "restaurant", "delicious"],
    callToAction: "Order now and satisfy your cravings!"
  });
}

export async function generateReviewResponse(reviewText: string, rating: number, businessName: string): Promise<string> {
  try {
    const prompt = `Generate a professional, personalized response to this customer review for "${businessName}":

    Review: "${reviewText}"
    Rating: ${rating}/5 stars

    Requirements:
    - Professional but warm tone
    - Thank the customer
    - Address specific points if mentioned
    - Keep it 1-2 sentences
    - For negative reviews: show empathy and offer solution
    - For positive reviews: express gratitude and invite return

    Don't be overly formal or generic. Make it sound genuine and caring.

    Return ONLY the response text, nothing else.`;

    return await generateText(prompt) || "Thank you for your feedback! We appreciate your business and look forward to serving you again.";
  } catch (error) {
    console.error('Error generating review response:', error);
    return "Thank you for your feedback! We appreciate your business and look forward to serving you again.";
  }
}

// ============================================================================
// INVENTORY & OPERATIONS AI
// ============================================================================

export async function predictDemand(historicalData: any[], timeframe: '1day' | '1week' | '1month'): Promise<{
  predictions: { item: string; predictedQuantity: number }[];
  confidence: number;
  factors: string[];
}> {
  const dataJson = JSON.stringify(historicalData.slice(-100));
  const prompt = `Analyze historical order data to predict demand for ${timeframe}:

    ${dataJson}

    Consider factors like:
    - Day of week patterns
    - Seasonal trends
    - Weather impact (if applicable)
    - Previous promotional effects

    Provide JSON with:
    - predictions: Array of {item: string, predictedQuantity: number}
    - confidence: Confidence score 0-1
    - factors: Array of key factors affecting demand

    Focus on top 10 most ordered items.`;

  return await generateJSON(prompt, {
    predictions: [],
    confidence: 0,
    factors: ["Historical data insufficient"]
  });
}
