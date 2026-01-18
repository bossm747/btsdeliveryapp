import * as fs from "fs";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// ============================================================================
// AI Provider Configuration - OpenRouter (primary) + Gemini (fallback)
// ============================================================================

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

// Available models via OpenRouter
const MODELS = {
  text: "google/gemini-3-flash-preview",        // Text generation
  smart: "xiaomi/mimo-v2-flash:free",           // Free smart model
  capable: "openai/gpt-oss-120b",               // Capable model
  image: "google/gemini-2.5-flash-image",       // Image generation
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

export async function generateMenuItemImage(itemName: string, description: string): Promise<string> {
  // Try OpenRouter with image model
  if (openRouter) {
    try {
      const response = await openRouter.chat.completions.create({
        model: MODELS.image,
        messages: [
          {
            role: "user",
            content: `Generate a professional food photography image of ${itemName}. ${description}. High-quality, well-lit, appetizing presentation on a clean plate. Restaurant-quality plating.`
          }
        ],
        max_tokens: 1000
      });

      // Check if there's an image URL in the response
      const content = response.choices[0]?.message?.content;
      if (content && content.startsWith('http')) {
        return content;
      }
    } catch (error: any) {
      console.error('Error generating image via OpenRouter:', error.message);
    }
  }

  // Return placeholder if image generation fails
  return `https://placehold.co/400x400?text=${encodeURIComponent(itemName)}`;
}

export async function generatePromotionalBanner(businessName: string, promotion: string, colors: string[] = ["#ff6b35", "#ffffff"]): Promise<string> {
  // Try OpenRouter with image model
  if (openRouter) {
    try {
      const response = await openRouter.chat.completions.create({
        model: MODELS.image,
        messages: [
          {
            role: "user",
            content: `Create a modern promotional banner for "${businessName}" restaurant. Promotion: "${promotion}". Colors: ${colors.join(' and ')}. Social media ready, horizontal layout.`
          }
        ],
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (content && content.startsWith('http')) {
        return content;
      }
    } catch (error: any) {
      console.error('Error generating banner via OpenRouter:', error.message);
    }
  }

  return `https://placehold.co/1200x400?text=${encodeURIComponent(promotion)}`;
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
