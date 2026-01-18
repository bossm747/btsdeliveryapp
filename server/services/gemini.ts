import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// ============================================================================
// AI Provider Configuration - OpenRouter (primary) + Gemini (fallback)
// ============================================================================

// OpenRouter - Access to many AI providers (OpenAI, Anthropic, Google, Meta, etc.)
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
const OPENROUTER_MODELS = {
  fast: "google/gemini-3-flash-preview",           // Fast Google model
  smart: "xiaomi/mimo-v2-flash:free",              // Free Xiaomi model
  capable: "openai/gpt-oss-120b",                  // Capable OpenAI model
  image: "google/gemini-2.5-flash-image",          // Image generation
  fallback: "meta-llama/llama-3.2-3b-instruct:free" // Free fallback
};

// Log which AI providers are available
console.log(`[AI Service] Providers: OpenRouter=${!!openRouter}, Gemini=${!!gemini}`);

// ============================================================================
// Unified AI Generation Function
// ============================================================================

async function generateAIContent(prompt: string, options?: {
  jsonMode?: boolean;
  model?: keyof typeof OPENROUTER_MODELS;
}): Promise<string> {
  const { jsonMode = false, model = "fast" } = options || {};

  // Try OpenRouter first (multi-provider access)
  if (openRouter) {
    try {
      const response = await openRouter.chat.completions.create({
        model: OPENROUTER_MODELS[model],
        messages: [
          {
            role: "system",
            content: jsonMode
              ? "You are a helpful AI assistant. You MUST respond with valid JSON only. No markdown, no code blocks, no explanations - just pure JSON."
              : "You are a helpful AI assistant for BTS Delivery, a food delivery service in Batangas, Philippines."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
        // Note: response_format not used as not all models support it
      });

      const result = response.choices[0]?.message?.content || "";
      return result;
    } catch (error: any) {
      console.error("[AI Service] OpenRouter error:", error.message);
      // Fall through to Gemini
    }
  }

  // Try Gemini as fallback
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: jsonMode ? { responseMimeType: "application/json" } : undefined
      });

      return response.text || "";
    } catch (error: any) {
      console.error("[AI Service] Gemini error:", error.message);
    }
  }

  throw new Error("No AI provider available");
}

// Helper to parse JSON safely
function safeParseJSON<T>(text: string, fallback: T): T {
  try {
    // Clean up potential markdown code blocks
    let cleaned = text.trim();
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
    return fallback;
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface RecommendationRequest {
  customerId: string;
  orderHistory: Array<{
    restaurantName: string;
    items: string[];
    totalAmount: number;
    orderTime: Date;
  }>;
  currentTime: Date;
  location: { lat: number; lng: number };
}

export interface DeliveryPrediction {
  estimatedMinutes: number;
  confidence: number;
  factors: string[];
}

export interface SentimentAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  score: number;
  keywords: string[];
  suggestions?: string[];
}

// ============================================================================
// AI Service Functions
// ============================================================================

// Get personalized restaurant and food recommendations
export async function getPersonalizedRecommendations(request: RecommendationRequest): Promise<{
  restaurants: Array<{ name: string; reason: string; matchScore: number }>;
  dishes: Array<{ name: string; restaurant: string; reason: string }>;
  timeBasedSuggestion?: string;
}> {
  const prompt = `You are an AI assistant for a food delivery platform in Batangas, Philippines.
Based on this customer's order history, provide personalized recommendations.

Customer Order History:
${request.orderHistory.map(order =>
  `- ${order.restaurantName}: ${order.items.join(", ")} (₱${order.totalAmount}) at ${order.orderTime}`
).join("\n")}

Current Time: ${request.currentTime}
Location: Batangas area

Provide recommendations in JSON format:
{
  "restaurants": [{"name": "", "reason": "", "matchScore": 0-100}],
  "dishes": [{"name": "", "restaurant": "", "reason": ""}],
  "timeBasedSuggestion": "suggestion based on current time"
}

Consider Filipino food preferences, meal timing (breakfast/lunch/merienda/dinner), and local Batangas specialties.`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    return safeParseJSON(result, {
      restaurants: [],
      dishes: [],
      timeBasedSuggestion: "Try our popular restaurants!"
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return {
      restaurants: [],
      dishes: [],
      timeBasedSuggestion: "Try our popular restaurants!"
    };
  }
}

// Predict delivery time based on various factors
export async function predictDeliveryTime(
  distance: number,
  orderItems: number,
  restaurantPrepTime: number,
  currentTraffic: "low" | "medium" | "high",
  weatherCondition: "clear" | "rain" | "heavy_rain",
  timeOfDay: string
): Promise<DeliveryPrediction> {
  const prompt = `Predict delivery time for a food order in Batangas with these conditions:
- Distance: ${distance} km
- Number of items: ${orderItems}
- Restaurant prep time: ${restaurantPrepTime} minutes average
- Current traffic: ${currentTraffic}
- Weather: ${weatherCondition}
- Time: ${timeOfDay}

Consider local Batangas traffic patterns, weather impact on motorcycle delivery, and typical preparation times.

Respond in JSON format:
{
  "estimatedMinutes": number,
  "confidence": 0-100,
  "factors": ["list of main factors affecting time"]
}`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    return safeParseJSON(result, {
      estimatedMinutes: Math.round(15 + (distance * 5) + restaurantPrepTime),
      confidence: 50,
      factors: ["Standard estimate"]
    });
  } catch (error) {
    console.error("Error predicting delivery time:", error);
    const baseTime = 15 + (distance * 5) + restaurantPrepTime;
    return {
      estimatedMinutes: Math.round(baseTime),
      confidence: 50,
      factors: ["Standard estimate"]
    };
  }
}

// Analyze customer review sentiment
export async function analyzeReviewSentiment(reviewText: string): Promise<SentimentAnalysis> {
  const prompt = `Analyze the sentiment of this food delivery review in the context of Filipino customer feedback:

Review: "${reviewText}"

Provide analysis in JSON format:
{
  "sentiment": "positive/neutral/negative",
  "score": 0-100,
  "keywords": ["key phrases from review"],
  "suggestions": ["actionable improvements if negative"]
}

Consider Filipino communication style and common food delivery concerns.`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    return safeParseJSON(result, {
      sentiment: "neutral" as const,
      score: 50,
      keywords: [],
      suggestions: []
    });
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return {
      sentiment: "neutral",
      score: 50,
      keywords: [],
      suggestions: []
    };
  }
}

// AI-powered customer support chatbot
export async function processCustomerQuery(
  query: string,
  context?: {
    orderId?: string;
    orderStatus?: string;
    customerName?: string;
  }
): Promise<{
  response: string;
  suggestedActions?: string[];
  requiresHumanSupport: boolean;
}> {
  const prompt = `You are a helpful customer support AI for BTS Delivery, a food delivery service in Batangas, Philippines.
Respond to this customer query in a friendly, helpful manner using simple Tagalog-English mix (Taglish) that's common in the Philippines.

Customer Query: "${query}"
${context ? `
Context:
- Order ID: ${context.orderId || "N/A"}
- Order Status: ${context.orderStatus || "N/A"}
- Customer: ${context.customerName || "Customer"}
` : ""}

Provide response in JSON format:
{
  "response": "your helpful response in Taglish",
  "suggestedActions": ["list of actions customer can take"],
  "requiresHumanSupport": true/false
}

Be empathetic, solution-oriented, and use common Filipino expressions like "po", "opo", "salamat".`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    return safeParseJSON(result, {
      response: "Pasensya na po, may technical difficulty kami ngayon. Please try again or contact our support team.",
      suggestedActions: ["Try refreshing the page", "Contact support directly"],
      requiresHumanSupport: true
    });
  } catch (error) {
    console.error("Error processing customer query:", error);
    return {
      response: "Pasensya na po, may technical difficulty kami ngayon. Please try again or contact our support team.",
      suggestedActions: ["Try refreshing the page", "Contact support directly"],
      requiresHumanSupport: true
    };
  }
}

// Optimize delivery route for riders
export async function optimizeDeliveryRoute(
  pickupLocations: Array<{ id: string; lat: number; lng: number; name: string }>,
  deliveryLocations: Array<{ id: string; lat: number; lng: number; address: string }>,
  riderLocation: { lat: number; lng: number }
): Promise<{
  optimizedRoute: Array<{ type: "pickup" | "delivery"; id: string; sequence: number }>;
  estimatedTotalTime: number;
  estimatedDistance: number;
  efficiency: number;
}> {
  const prompt = `Optimize delivery route for a rider in Batangas with multiple pickups and deliveries.

Rider Location: ${JSON.stringify(riderLocation)}
Pickup Locations: ${JSON.stringify(pickupLocations)}
Delivery Locations: ${JSON.stringify(deliveryLocations)}

Consider:
- Minimize total distance
- Pickup must happen before delivery for same order
- Batangas road conditions and traffic patterns
- Efficiency for motorcycle delivery

Provide optimized route in JSON format:
{
  "optimizedRoute": [{"type": "pickup/delivery", "id": "", "sequence": 1}],
  "estimatedTotalTime": minutes,
  "estimatedDistance": km,
  "efficiency": 0-100
}`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    return safeParseJSON(result, {
      optimizedRoute: [
        ...pickupLocations.map((p, i) => ({ type: "pickup" as const, id: p.id, sequence: i + 1 })),
        ...deliveryLocations.map((d, i) => ({ type: "delivery" as const, id: d.id, sequence: pickupLocations.length + i + 1 }))
      ],
      estimatedTotalTime: 45,
      estimatedDistance: 10,
      efficiency: 70
    });
  } catch (error) {
    console.error("Error optimizing route:", error);
    const route = [
      ...pickupLocations.map((p, i) => ({ type: "pickup" as const, id: p.id, sequence: i + 1 })),
      ...deliveryLocations.map((d, i) => ({ type: "delivery" as const, id: d.id, sequence: pickupLocations.length + i + 1 }))
    ];
    return {
      optimizedRoute: route,
      estimatedTotalTime: 45,
      estimatedDistance: 10,
      efficiency: 70
    };
  }
}

// Predict demand for restaurants
export async function predictDemandForecast(
  restaurantId: string,
  historicalData: Array<{
    date: Date;
    dayOfWeek: string;
    orderCount: number;
    totalRevenue: number;
    weather: string;
    hasPromo: boolean;
  }>,
  upcomingDays: number = 7
): Promise<{
  forecast: Array<{
    date: string;
    expectedOrders: number;
    confidenceLevel: number;
    recommendations: string[];
  }>;
  peakHours: string[];
  stockingSuggestions: string[];
}> {
  const prompt = `Forecast demand for a restaurant in Batangas based on historical data.

Historical Data (last 30 days):
${historicalData.slice(-30).map(d =>
  `${d.date}: ${d.dayOfWeek}, ${d.orderCount} orders, ₱${d.totalRevenue}, Weather: ${d.weather}, Promo: ${d.hasPromo}`
).join("\n")}

Forecast demand for the next ${upcomingDays} days considering:
- Filipino dining patterns (breakfast, lunch, merienda, dinner)
- Weekend vs weekday trends
- Weather impact on delivery orders
- Local events and holidays in Batangas
- Payday cycles (15th and 30th)

Provide forecast in JSON format:
{
  "forecast": [{"date": "YYYY-MM-DD", "expectedOrders": number, "confidenceLevel": 0-100, "recommendations": []}],
  "peakHours": ["time ranges"],
  "stockingSuggestions": ["inventory recommendations"]
}`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    const avgOrders = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.orderCount, 0) / historicalData.length
      : 10;

    return safeParseJSON(result, {
      forecast: Array.from({ length: upcomingDays }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        expectedOrders: Math.round(avgOrders),
        confidenceLevel: 60,
        recommendations: ["Maintain standard inventory levels"]
      })),
      peakHours: ["11:30 AM - 1:00 PM", "6:00 PM - 8:00 PM"],
      stockingSuggestions: ["Stock popular items based on historical demand"]
    });
  } catch (error) {
    console.error("Error predicting demand:", error);
    const avgOrders = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.orderCount, 0) / historicalData.length
      : 10;
    return {
      forecast: Array.from({ length: upcomingDays }, (_, i) => ({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        expectedOrders: Math.round(avgOrders),
        confidenceLevel: 60,
        recommendations: ["Maintain standard inventory levels"]
      })),
      peakHours: ["11:30 AM - 1:00 PM", "6:00 PM - 8:00 PM"],
      stockingSuggestions: ["Stock popular items based on historical demand"]
    };
  }
}

// Generate smart promotional content
export async function generatePromoContent(
  restaurantName: string,
  cuisine: string,
  targetAudience: string,
  promoType: "discount" | "bundle" | "new_item" | "seasonal",
  context?: string
): Promise<{
  tagline: string;
  description: string;
  socialMediaPost: string;
  smsMessage: string;
  terms: string[];
}> {
  const prompt = `Create promotional content for a restaurant in Batangas, Philippines.

Restaurant: ${restaurantName}
Cuisine: ${cuisine}
Target Audience: ${targetAudience}
Promo Type: ${promoType}
${context ? `Additional Context: ${context}` : ""}

Create engaging content in Taglish (Tagalog-English mix) that appeals to Filipino customers.

Provide in JSON format:
{
  "tagline": "catchy tagline",
  "description": "detailed promo description",
  "socialMediaPost": "Facebook/Instagram post with emojis",
  "smsMessage": "160 character SMS",
  "terms": ["promo terms and conditions"]
}`;

  try {
    const result = await generateAIContent(prompt, { jsonMode: true });
    return safeParseJSON(result, {
      tagline: "Special Promo Alert!",
      description: "Enjoy our special offer today!",
      socialMediaPost: "🎉 Special promo available now! Order via BTS Delivery!",
      smsMessage: "Special promo at " + restaurantName + "! Order now via BTS Delivery.",
      terms: ["Valid for limited time only", "Terms and conditions apply"]
    });
  } catch (error) {
    console.error("Error generating promo content:", error);
    return {
      tagline: "Special Promo Alert!",
      description: "Enjoy our special offer today!",
      socialMediaPost: "🎉 Special promo available now! Order via BTS Delivery!",
      smsMessage: "Special promo at " + restaurantName + "! Order now via BTS Delivery.",
      terms: ["Valid for limited time only", "Terms and conditions apply"]
    };
  }
}
