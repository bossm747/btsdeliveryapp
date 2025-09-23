import * as fs from "fs";
import { GoogleGenAI, Modality } from "@google/genai";
import OpenAI from "openai";

// AI Service Integration - Gemini & OpenAI for BTS Delivery Vendor Dashboard
// Using Gemini 2.5 Flash for text generation and OpenAI for image generation

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    
    Don't use overly fancy words. Make it sound delicious and approachable.`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "A delicious dish prepared with care using fresh ingredients.";
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
    
    Example style: "Manila Bay Seafood brings authentic Filipino coastal flavors to your doorstep in Batangas Province. Our skilled chefs prepare fresh seafood dishes using traditional recipes and premium ingredients, ensuring every meal is a delightful experience. From classic adobong pusit to innovative seafood pasta, we're committed to delivering restaurant-quality meals that satisfy your cravings."`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || `${businessName} - Serving authentic ${cuisineType} cuisine in Batangas Province with fresh ingredients and exceptional flavors.`;
  } catch (error) {
    console.error('Error generating business description:', error);
    return `${businessName} - Serving authentic ${cuisineType} cuisine in Batangas Province with fresh ingredients and exceptional flavors.`;
  }
}

// ============================================================================
// IMAGE GENERATION SERVICES
// ============================================================================

export async function generateMenuItemImage(itemName: string, description: string): Promise<string> {
  try {
    const prompt = `Professional food photography of ${itemName}. ${description}. 
    High-quality, well-lit, appetizing presentation on a clean white plate. 
    Restaurant-quality plating with garnish. Warm lighting, shallow depth of field. 
    No text, watermarks, or logos. Commercial food photography style.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
    });

    if (!response.data?.[0]?.url) {
      throw new Error('No image URL returned from OpenAI');
    }
    return response.data[0].url;
  } catch (error) {
    console.error('Error generating menu item image:', error);
    throw error;
  }
}

export async function generatePromotionalBanner(businessName: string, promotion: string, colors: string[] = ["#ff6b35", "#ffffff"]): Promise<string> {
  try {
    const colorScheme = colors.join(' and ');
    const prompt = `Create a modern, eye-catching promotional banner for "${businessName}" restaurant. 
    Promotion: "${promotion}". 
    Use ${colorScheme} color scheme. 
    Professional design with clear text hierarchy, appetizing food elements. 
    Social media ready, horizontal layout. Clean, modern typography.
    No actual food photos, just design elements and graphics.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024",
      quality: "hd",
    });

    if (!response.data?.[0]?.url) {
      throw new Error('No image URL returned from OpenAI');
    }
    return response.data[0].url;
  } catch (error) {
    console.error('Error generating promotional banner:', error);
    throw error;
  }
}

// ============================================================================
// ANALYTICS & INSIGHTS SERVICES
// ============================================================================

export async function analyzeSalesData(salesData: any[], period: string): Promise<{
  insights: string;
  recommendations: string[];
  trends: string;
}> {
  try {
    const dataJson = JSON.stringify(salesData.slice(0, 50)); // Limit data size
    const prompt = `Analyze this restaurant sales data for ${period} and provide actionable business insights:
    
    ${dataJson}
    
    Provide analysis in JSON format with these fields:
    - insights: Key observations about sales performance (2-3 sentences)
    - recommendations: Array of 3-5 specific actionable recommendations 
    - trends: Notable patterns or trends (1-2 sentences)
    
    Focus on practical advice for restaurant operations, menu optimization, and revenue growth.`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            insights: { type: "string" },
            recommendations: { type: "array", items: { type: "string" } },
            trends: { type: "string" },
          },
          required: ["insights", "recommendations", "trends"],
        },
      },
      contents: prompt,
    });

    return JSON.parse(response.text || '{"insights": "Analysis unavailable", "recommendations": [], "trends": "No trends identified"}');
  } catch (error) {
    console.error('Error analyzing sales data:', error);
    return {
      insights: "Unable to analyze sales data at this time.",
      recommendations: ["Monitor daily sales patterns", "Review popular menu items", "Check delivery times"],
      trends: "Analysis temporarily unavailable."
    };
  }
}

export async function generatePricingRecommendations(menuItem: any, competitorPrices: number[], marketData: any): Promise<{
  recommendedPrice: number;
  reasoning: string;
  priceRange: { min: number; max: number };
}> {
  try {
    const avgCompetitorPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
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

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            recommendedPrice: { type: "number" },
            reasoning: { type: "string" },
            priceRange: {
              type: "object",
              properties: {
                min: { type: "number" },
                max: { type: "number" }
              }
            }
          },
          required: ["recommendedPrice", "reasoning", "priceRange"],
        },
      },
      contents: prompt,
    });

    return JSON.parse(response.text || '{"recommendedPrice": 0, "reasoning": "Analysis unavailable", "priceRange": {"min": 0, "max": 0}}');
  } catch (error) {
    console.error('Error generating pricing recommendations:', error);
    return {
      recommendedPrice: menuItem.price,
      reasoning: "Unable to analyze pricing at this time.",
      priceRange: { min: menuItem.price * 0.9, max: menuItem.price * 1.1 }
    };
  }
}

// ============================================================================
// MARKETING & CUSTOMER SERVICE
// ============================================================================

export async function generateSocialMediaPost(businessName: string, postType: 'new_item' | 'promotion' | 'general', content: any): Promise<{
  caption: string;
  hashtags: string[];
  callToAction: string;
}> {
  try {
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

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            caption: { type: "string" },
            hashtags: { type: "array", items: { type: "string" } },
            callToAction: { type: "string" }
          },
          required: ["caption", "hashtags", "callToAction"],
        },
      },
      contents: prompt,
    });

    return JSON.parse(response.text || '{"caption": "Great food awaits!", "hashtags": ["fooddelivery", "batangas"], "callToAction": "Order now!"}');
  } catch (error) {
    console.error('Error generating social media post:', error);
    return {
      caption: `Delicious food from ${businessName} is just a tap away!`,
      hashtags: ["fooddelivery", "batangas", "restaurant", "delicious"],
      callToAction: "Order now and satisfy your cravings!"
    };
  }
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
    
    Don't be overly formal or generic. Make it sound genuine and caring.`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Thank you for your feedback! We appreciate your business and look forward to serving you again.";
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
  try {
    const dataJson = JSON.stringify(historicalData.slice(-100)); // Last 100 records
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

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  predictedQuantity: { type: "number" }
                }
              }
            },
            confidence: { type: "number" },
            factors: { type: "array", items: { type: "string" } }
          },
          required: ["predictions", "confidence", "factors"],
        },
      },
      contents: prompt,
    });

    return JSON.parse(response.text || '{"predictions": [], "confidence": 0, "factors": []}');
  } catch (error) {
    console.error('Error predicting demand:', error);
    return {
      predictions: [],
      confidence: 0,
      factors: ["Historical data insufficient"]
    };
  }
}