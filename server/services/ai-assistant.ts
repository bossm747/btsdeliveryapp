import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import {
  getOpenAIFunctions,
  executeFunction,
  FunctionContext,
  FunctionDefinition,
  getFunctionsForRole
} from "./ai-functions";

// ============================================================================
// BTS Delivery AI Assistant - Agent-Based Multi-Model System with Function Calling
// ============================================================================

// OpenRouter client for multi-model access
const openRouter = process.env.OPENROUTER_API_KEY ? new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.PUBLIC_APP_URL || "https://btsdelivery.com",
    "X-Title": "BTS Delivery AI Assistant"
  }
}) : null;

// Gemini fallback
const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// ============================================================================
// Agent Types & Model Assignments
// ============================================================================

type AgentType =
  | "customer_support"    // Help with orders, tracking, complaints
  | "order_assistant"     // Help place/modify orders
  | "restaurant_finder"   // Find restaurants, recommend food
  | "rider_support"       // Rider-specific queries
  | "vendor_analytics"    // Business insights, sales analysis
  | "technical_help"      // App usage, troubleshooting
  | "general"             // General queries
  | "creative"            // Marketing, content generation
  | "analytical";         // Data analysis, predictions

// Model capabilities and assignments
const AGENT_MODELS: Record<AgentType, { model: string; description: string }> = {
  customer_support: {
    model: "google/gemini-3-flash-preview",
    description: "Fast, empathetic responses for customer issues"
  },
  order_assistant: {
    model: "google/gemini-3-flash-preview",
    description: "Quick order processing and modifications"
  },
  restaurant_finder: {
    model: "xiaomi/mimo-v2-flash:free",
    description: "Smart recommendations based on preferences"
  },
  rider_support: {
    model: "google/gemini-3-flash-preview",
    description: "Efficient rider query handling"
  },
  vendor_analytics: {
    model: "openai/gpt-oss-120b",
    description: "Deep analytical insights for business"
  },
  technical_help: {
    model: "xiaomi/mimo-v2-flash:free",
    description: "Clear technical explanations"
  },
  general: {
    model: "meta-llama/llama-3.2-3b-instruct:free",
    description: "General purpose assistance"
  },
  creative: {
    model: "google/gemini-3-flash-preview",
    description: "Creative content generation"
  },
  analytical: {
    model: "openai/gpt-oss-120b",
    description: "Complex data analysis and predictions"
  }
};

// ============================================================================
// BTS Delivery Project Knowledge Base
// ============================================================================

const PROJECT_KNOWLEDGE = `
# BTS Delivery Platform Knowledge Base

## About BTS Delivery
BTS Delivery is a comprehensive multi-vendor delivery platform serving Batangas Province, Philippines.
We connect customers with multiple restaurants and vendors, offering flexible pickup and delivery options.
Our platform supports food delivery, shopping assistance (Pabili), bill payment (Pabayad), and parcel delivery services.

## Multi-Vendor Platform Features
- **Multiple Restaurant Partners**: Customers can browse and order from many restaurants in one app
- **Order from Multiple Vendors**: Cart supports items from different restaurants (separate deliveries)
- **Vendor Dashboard**: Each restaurant has its own management portal
- **Real-time Inventory**: Live stock updates across all vendors
- **Centralized Dispatch**: Admin console for order routing and rider assignment
- **Revenue Sharing**: Automated commission calculations per vendor

## Pickup vs Delivery Options
### Delivery Mode
- Door-to-door delivery by BTS riders
- Real-time GPS tracking
- Delivery fee based on distance
- Contactless delivery available
- Delivery proof photos

### Pickup Mode (Self-Pickup)
- Customer picks up order at restaurant
- No delivery fee charged
- Faster preparation (no rider wait time)
- Order ready notification via SMS/push
- QR code for pickup verification
- Time slot selection available

## Batangas Local Knowledge
### Coverage Areas (Municipalities)
Batangas City, Lipa City, Tanauan, Santo Tomas, Malvar, Bauan, San Pascual,
Rosario, San Juan, Lobo, Taysan, San Jose, Cuenca, Alitagtag, Santa Teresita,
San Nicolas, Tuy, Balayan, Calaca, Calatagan, Lemery, Nasugbu, Lian, Agoncillo,
San Luis, Taal, Laurel, Matabungkay

### Popular Local Dishes
- Bulalo (beef bone marrow soup) - Batangas specialty
- Lomi (thick noodle soup)
- Goto (beef tripe congee)
- Tapa (cured beef)
- Kapeng Barako (Batangas coffee)
- Panutsa (sugar cane candy)
- Suman (rice cake)
- Lambanog (coconut wine)

## Available Services

### 1. Food Delivery
- Order from partner restaurants across Batangas
- Real-time order tracking
- Multiple payment options (GCash, Maya, Cash on Delivery)
- Estimated delivery times based on distance and traffic
- Special instructions for orders

### 2. Pabili Service (Shopping Assistance)
- Request items from groceries, pharmacies, and stores
- Riders shop and deliver to your location
- Upload shopping lists or describe items needed
- Real-time price updates and confirmation

### 3. Pabayad Service (Bill Payment)
- Pay utility bills through our platform
- Supported: Electric, water, internet, cable
- Secure payment processing
- Receipt confirmation

### 4. Parcel Delivery
- Same-day delivery within Batangas
- Package pickup and drop-off
- Real-time tracking
- Proof of delivery photos

## User Roles

### Customers
- Browse restaurants and menus
- Place orders for food, pabili, pabayad, parcel
- Track orders in real-time
- Save favorite restaurants
- Manage delivery addresses
- View order history
- Earn loyalty points
- Leave reviews and ratings

### Vendors (Restaurant Partners)
- Manage menu items and prices
- Receive and process orders
- Track daily/weekly/monthly sales
- View analytics and insights
- Manage staff permissions
- Run promotions
- AI-powered business assistance

### Riders (Delivery Partners)
- Accept delivery assignments
- Navigate to pickup and delivery locations
- Batch multiple deliveries
- Track earnings
- Manage availability status
- Upload proof of delivery

### Administrators
- Monitor all platform operations
- Dispatch console for order management
- User management
- Restaurant approvals
- Analytics dashboard
- System configuration

## Payment Methods
- GCash (popular in Philippines)
- Maya (formerly PayMaya)
- Cash on Delivery (COD)
- BTS Wallet (platform credits)

## Delivery Coverage
- All municipalities in Batangas Province
- Delivery fees based on distance
- Express delivery option available
- Scheduled deliveries supported

## Operating Hours
- Most restaurants: 8AM - 10PM
- Pabili service: 7AM - 9PM
- Parcel delivery: 8AM - 8PM
- 24/7 customer support via AI assistant

## Loyalty Program
- Earn points on every order
- Redeem points for discounts
- Tier levels: Bronze, Silver, Gold, Platinum
- Special birthday rewards
- Referral bonuses

## Contact & Support
- In-app chat support
- AI assistant available 24/7
- Email: support@btsdelivery.com
- Response time: Usually within minutes

## Common Filipino Terms Used
- "po" / "opo" - Polite expressions
- "Salamat" - Thank you
- "Merienda" - Afternoon snack
- "Suki" - Regular customer
- "Pabili" - Please buy for me
- "Pabayad" - Please pay for me

## Batangas Dialect Guide (IMPORTANT)
The AI must speak in authentic Batangas Tagalog dialect. Key expressions:

### Unique Batangas Words & Expressions
- "Ala eh!" - Expression of emphasis/agreement (like "Of course!" or "There you go!")
- "Geh" or "Ge" - Okay/alright (instead of "sige")
- "Anung" - What (instead of "ano")
- "Ga" - Question particle unique to Batangas (e.g., "Kumain ka na ga?" = "Have you eaten?")
- "Ara" - Here/There (instead of "ayan" or "hayan")
- "Bala" - Sometimes/Perhaps
- "Teh/Ateh" - Term of endearment for women
- "Kuya/Tol" - Term of endearment for men
- "Eme" - Casual expression/filler
- "Mare/Pare" - Friend (female/male)
- "'Di ba ga?" - Isn't it? (Batangas style)
- "E di" - Then/So
- "Aba" - Expression of surprise
- "Ay sus!" - Expression of mild frustration
- "Hay naku" - Expression of concern/exasperation
- "Talaga ga?" - Really? (Batangas style)
- "Ay grabe!" - Expression of amazement
- "Ala e!" - Used for emphasis
- "Anu ga 'yan?" - What is that? (Batangas style)
- "Tara na" - Let's go
- "Kain na tayo" - Let's eat

### Batangas Sentence Patterns
- Add "ga" at end of questions: "Gusto mo ga?" (Do you want?)
- Use "ala eh" for agreement: "Ala eh, tama ka!" (Yes, you're right!)
- Combine with "po" for politeness: "Ala eh po, ganun po talaga"
- Use "geh" instead of "sige": "Geh po, order na po kayo"

### Batangas Tone & Style
- Warm and hospitable (Batangueño hospitality)
- Direct but polite
- Uses expressions of agreement frequently
- Natural mix of Tagalog and English
- Very respectful to elders (use "po" and "opo" generously)

### Example Responses in Batangas Style
- Greeting: "Magandang araw po! Ala eh, welcome sa BTS Delivery! Anung maitutulong ko sa inyo ga?"
- Confirmation: "Geh po! Na-receive na po namin ang order niyo. Ara na po, on the way na ang rider!"
- Apology: "Ay naku po, pasensya na po talaga. Ala eh, aayusin po namin 'yan agad!"
- Thank you: "Maraming salamat po! Balik-balik po kayo ha, suki na po kayo namin!"
- Question: "Gusto niyo pa po ga ng iba? Masarap din po ang Bulalo namin eh!"
`;

// ============================================================================
// Security Filters - Prevent Credential Exposure
// ============================================================================

const BLOCKED_PATTERNS = [
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /credential/i,
  /token/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /private[_-]?key/i,
  /env(ironment)?[_-]?var/i,
  /\.env/i,
  /config(uration)?[_-]?file/i,
  /admin[_-]?access/i,
  /root[_-]?access/i,
  /ssh/i,
  /server[_-]?ip/i,
  /internal[_-]?url/i,
  /webhook[_-]?url/i,
  /merchant[_-]?id/i,
  /nexuspay/i,
  /sendgrid/i,
  /twilio/i,
  /firebase/i,
  /openrouter/i,
  /gemini[_-]?key/i
];

function containsSensitiveQuery(query: string): boolean {
  return BLOCKED_PATTERNS.some(pattern => pattern.test(query));
}

function sanitizeResponse(response: string): string {
  // Remove any accidentally exposed credentials or sensitive data
  let sanitized = response;

  // Remove anything that looks like an API key
  sanitized = sanitized.replace(/[A-Za-z0-9_-]{20,}/g, (match) => {
    if (match.includes('sk-') || match.includes('AIza') || match.includes('key')) {
      return '[REDACTED]';
    }
    return match;
  });

  // Remove URLs that might be internal
  sanitized = sanitized.replace(/https?:\/\/[^\s]*localhost[^\s]*/gi, '[INTERNAL_URL]');
  sanitized = sanitized.replace(/https?:\/\/192\.168[^\s]*/gi, '[INTERNAL_URL]');
  sanitized = sanitized.replace(/https?:\/\/10\.[^\s]*/gi, '[INTERNAL_URL]');

  return sanitized;
}

// ============================================================================
// Query Classification & Agent Routing
// ============================================================================

function classifyQuery(query: string, userRole?: string): AgentType {
  const q = query.toLowerCase();

  // Customer support patterns
  if (/order.*problem|issue|complaint|refund|cancel|wrong|late|missing|help/i.test(q)) {
    return "customer_support";
  }

  // Order assistant patterns
  if (/place.*order|order.*food|want to order|how.*order|checkout|cart/i.test(q)) {
    return "order_assistant";
  }

  // Restaurant finder patterns
  if (/restaurant|food.*near|recommend|suggest|best.*eat|what.*eat|craving|menu/i.test(q)) {
    return "restaurant_finder";
  }

  // Rider support patterns
  if (/rider|delivery.*partner|earn|assignment|pickup|drop.*off|route/i.test(q) || userRole === 'rider') {
    return "rider_support";
  }

  // Vendor analytics patterns
  if (/sales|revenue|analytics|insight|report|trend|forecast|business/i.test(q) || userRole === 'vendor') {
    return "vendor_analytics";
  }

  // Technical help patterns
  if (/app|error|bug|not working|crash|login|password|account|setting/i.test(q)) {
    return "technical_help";
  }

  // Creative patterns
  if (/write|create|generate|marketing|promo|social.*media|caption|description/i.test(q)) {
    return "creative";
  }

  // Analytical patterns
  if (/analyze|predict|compare|calculate|statistic|data|performance/i.test(q)) {
    return "analytical";
  }

  return "general";
}

// ============================================================================
// Main AI Assistant Function
// ============================================================================

export interface AssistantContext {
  userId?: string;
  userRole?: 'customer' | 'vendor' | 'rider' | 'admin';
  userName?: string;
  orderId?: string;
  orderStatus?: string;
  restaurantName?: string;
  restaurantId?: string;  // For vendors
  riderId?: string;       // For riders
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  enableFunctions?: boolean;  // Enable function calling
  isLoggedIn?: boolean;  // Whether the user is authenticated
}

export interface AssistantResponse {
  response: string;
  agent: AgentType;
  model: string;
  suggestedActions?: string[];
  requiresHumanSupport: boolean;
  functionsExecuted?: Array<{
    name: string;
    success: boolean;
    result?: any;
  }>;
  metadata?: {
    confidence?: number;
    processingTime?: number;
    functionsAvailable?: number;
  };
}

export async function processAssistantQuery(
  query: string,
  context?: AssistantContext
): Promise<AssistantResponse> {
  const startTime = Date.now();
  const enableFunctions = context?.enableFunctions !== false; // Default to enabled
  const userRole = context?.userRole || 'customer';

  // Security check - block sensitive queries
  if (containsSensitiveQuery(query)) {
    return {
      response: "Hay naku po, pasensya na po talaga! Hindi ko po ma-provide ang mga confidential information tulad ng API keys, passwords, o credentials ga. Para po sa seguridad niyo, 'di available po 'yan sa akin. Ala eh, may iba pa po ba akong maitutulong sa inyo? Pwede ko po kayo tulungan sa order, tracking, o iba pang services namin!",
      agent: "general",
      model: "security-filter",
      suggestedActions: ["Tanungin ang services namin", "I-track ang order", "Mag-order ng pagkain"],
      requiresHumanSupport: false,
      metadata: { confidence: 1.0, processingTime: Date.now() - startTime }
    };
  }

  // Classify query and select agent
  const agentType = classifyQuery(query, context?.userRole);
  const { model } = AGENT_MODELS[agentType];

  // Build system prompt with project knowledge
  const systemPrompt = buildSystemPrompt(agentType, context);

  // Build user message with context
  const userMessage = buildUserMessage(query, context);

  // Get available functions for this role
  const availableFunctions = enableFunctions && context?.userId
    ? getOpenAIFunctions(userRole)
    : [];

  const functionsExecuted: Array<{ name: string; success: boolean; result?: any }> = [];

  try {
    let responseText = "";
    let messages: any[] = [
      { role: "system", content: systemPrompt + (availableFunctions.length > 0 ? buildFunctionInstructions(userRole) : "") },
      ...(context?.conversationHistory || []).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    // Try OpenRouter with function calling
    if (openRouter && context?.userId) {
      try {
        // First call with function definitions
        const response = await openRouter.chat.completions.create({
          model: model,
          messages,
          tools: availableFunctions.length > 0 ? availableFunctions : undefined,
          tool_choice: availableFunctions.length > 0 ? "auto" : undefined,
          temperature: 0.7,
          max_tokens: 2000
        });

        let choice = response.choices[0];

        // Handle function calls in a loop (max 5 iterations)
        let iterations = 0;
        while (choice?.message?.tool_calls && iterations < 5) {
          iterations++;
          const toolCalls = choice.message.tool_calls;

          // Add assistant message with tool calls
          messages.push({
            role: "assistant",
            content: choice.message.content || null,
            tool_calls: toolCalls
          });

          // Execute each function call
          for (const toolCall of toolCalls) {
            // Type assertion for OpenRouter tool call structure
            const tc = toolCall as { id: string; function: { name: string; arguments: string } };
            const functionName = tc.function.name;
            let functionArgs: any = {};

            try {
              functionArgs = JSON.parse(tc.function.arguments);
            } catch {
              functionArgs = {};
            }

            console.log(`[AI Assistant] Executing function: ${functionName}`, functionArgs);

            // Build function context
            const functionContext: FunctionContext = {
              userId: context.userId!,
              userRole: userRole as any,
              restaurantId: context.restaurantId,
              riderId: context.riderId
            };

            // Execute the function
            const result = await executeFunction(functionName, functionArgs, functionContext);

            functionsExecuted.push({
              name: functionName,
              success: result.success,
              result: result.success ? result.data : result.error
            });

            // Add function result to messages
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result)
            });
          }

          // Get next response
          const nextResponse = await openRouter.chat.completions.create({
            model: model,
            messages,
            tools: availableFunctions,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 2000
          });

          choice = nextResponse.choices[0];
        }

        responseText = choice?.message?.content || "";

      } catch (error: any) {
        console.error(`[AI Assistant] OpenRouter (${model}) error:`, error.message);

        // Try fallback model without functions
        try {
          const fallbackResponse = await openRouter.chat.completions.create({
            model: "meta-llama/llama-3.2-3b-instruct:free",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
            temperature: 0.7,
            max_tokens: 1500
          });
          responseText = fallbackResponse.choices[0]?.message?.content || "";
        } catch {
          // Fall through to Gemini
        }
      }
    } else if (openRouter) {
      // No user context, simple query without functions
      try {
        const response = await openRouter.chat.completions.create({
          model: model,
          messages,
          temperature: 0.7,
          max_tokens: 1500
        });
        responseText = response.choices[0]?.message?.content || "";
      } catch (error: any) {
        console.error(`[AI Assistant] OpenRouter (${model}) error:`, error.message);
      }
    }

    // Fallback to Gemini
    if (!responseText && gemini) {
      try {
        const response = await gemini.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `${systemPrompt}\n\nUser: ${userMessage}`
        });
        responseText = response.text || "";
      } catch (error: any) {
        console.error("[AI Assistant] Gemini error:", error.message);
      }
    }

    // If still no response, return fallback
    if (!responseText) {
      return {
        response: "Ay sus, pasensya na po talaga! May technical difficulty po kami ngayon eh. Pwede po ga kayong mag-try ulit mamaya? Ala eh, salamat po sa pasensya niyo! Pwede rin po kayong mag-contact sa human support namin.",
        agent: agentType,
        model: "fallback",
        suggestedActions: ["I-try ulit mamaya", "I-contact ang support", "Mag-browse ng restaurants"],
        requiresHumanSupport: true,
        functionsExecuted: functionsExecuted.length > 0 ? functionsExecuted : undefined,
        metadata: { confidence: 0, processingTime: Date.now() - startTime, functionsAvailable: availableFunctions.length }
      };
    }

    // Parse response (expecting JSON)
    let parsedResponse: any;
    try {
      // Clean up markdown if present
      let cleaned = responseText.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
      if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
      parsedResponse = JSON.parse(cleaned.trim());
    } catch {
      // If not JSON, use as plain text
      parsedResponse = {
        response: responseText,
        suggestedActions: [],
        requiresHumanSupport: false
      };
    }

    // Sanitize response to remove any leaked credentials
    const sanitizedResponse = sanitizeResponse(parsedResponse.response || responseText);

    return {
      response: sanitizedResponse,
      agent: agentType,
      model: model,
      suggestedActions: parsedResponse.suggestedActions || getDefaultActions(agentType),
      requiresHumanSupport: parsedResponse.requiresHumanSupport || false,
      functionsExecuted: functionsExecuted.length > 0 ? functionsExecuted : undefined,
      metadata: {
        confidence: parsedResponse.confidence || 0.8,
        processingTime: Date.now() - startTime,
        functionsAvailable: availableFunctions.length
      }
    };

  } catch (error: any) {
    console.error("[AI Assistant] Error:", error.message);
    return {
      response: "Hay naku po, pasensya na po talaga! May problema po kami ngayon eh. Geh po, pwede niyo pong i-contact ang support team namin para maayos 'to agad. Salamat po sa pag-intindi!",
      agent: agentType,
      model: "error",
      suggestedActions: ["I-contact ang support", "I-try ulit mamaya", "Browse restaurants"],
      requiresHumanSupport: true,
      functionsExecuted: functionsExecuted.length > 0 ? functionsExecuted : undefined,
      metadata: { confidence: 0, processingTime: Date.now() - startTime }
    };
  }
}

// ============================================================================
// Function Calling Instructions
// ============================================================================

function buildFunctionInstructions(userRole: string): string {
  const roleInstructions: Record<string, string> = {
    customer: `

FUNCTION CALLING CAPABILITIES:
You have access to functions that can help customers. Use them when appropriate:

- browse_restaurants: Para hanapin ang mga restaurants sa Batangas
- get_restaurant_menu: Para makita ang menu ng isang restaurant
- search_menu_items: Para mag-search ng specific na pagkain
- create_order: Para mag-order ng pagkain (CONFIRM DETAILS FIRST before ordering!)
- get_order_status: Para i-check ang status ng order
- get_customer_orders: Para makita ang order history
- cancel_order: Para i-cancel ang order (kung pwede pa)
- apply_promo_code: Para i-check kung valid ang promo code
- get_saved_addresses: Para makita ang saved addresses

IMPORTANT RULES:
1. ALWAYS confirm order details (items, quantities, address, payment) with customer BEFORE calling create_order
2. For orders, ask clarifying questions first: "Anung gusto niyo po i-order ga?", "Saang address po i-deliver?"
3. When showing menus or restaurants, format the results nicely in Taglish
4. If a function fails, explain the error politely and suggest alternatives`,

    rider: `

FUNCTION CALLING CAPABILITIES:
You have access to functions that help riders:

- get_rider_assignments: Para makita ang mga deliveries mo
- get_delivery_details: Para sa complete details ng delivery (addresses, items, customer info)
- update_delivery_status: Para i-update ang status (picked_up, on_the_way, delivered)
- get_rider_earnings: Para makita ang earnings mo
- update_rider_availability: Para mag-online o offline
- get_route_info: Para sa navigation info

IMPORTANT RULES:
1. Always provide clear, actionable information
2. When showing delivery details, include all important info (addresses, items, special instructions)
3. Help riders efficiently manage their deliveries`,

    vendor: `

FUNCTION CALLING CAPABILITIES:
You have access to functions that help vendors manage their restaurant:

- get_vendor_orders: Para makita ang mga orders sa restaurant
- update_order_status_vendor: Para i-update ang order status (confirm, preparing, ready)
- create_menu_item: Para mag-add ng bagong item sa menu (WITH AI-generated descriptions and images!)
- update_menu_item: Para i-update ang existing menu items
- create_menu_category: Para gumawa ng bagong category
- get_menu_categories: Para makita ang mga categories
- get_vendor_analytics: Para sa sales insights at analytics
- update_item_availability: Para i-toggle availability o i-update stock
- create_promotion: Para gumawa ng promo offer
- generate_menu_content: Para mag-generate ng AI content (descriptions, images, promo text)

IMPORTANT RULES:
1. When creating menu items, offer to generate appetizing descriptions and food images
2. Provide business insights in a helpful, actionable way
3. Help vendors optimize their menu and operations`
  };

  return roleInstructions[userRole] || roleInstructions.customer;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildSystemPrompt(agentType: AgentType, context?: AssistantContext): string {
  const basePrompt = `You are the BTS Delivery AI Assistant, a helpful, intelligent, and friendly virtual assistant for a multi-vendor food delivery platform based in Batangas Province, Philippines.

LANGUAGE & DIALECT (CRITICAL):
You MUST respond in authentic Batangas Tagalog dialect mixed with English (Taglish). This is not regular Tagalog - use genuine Batangas expressions:

Key Batangas expressions to use naturally:
- "Ala eh!" - for emphasis/agreement ("Ala eh po, tama po kayo!")
- "Geh/Ge" - instead of "sige" for okay ("Geh po, order na po!")
- "Ga" - question particle at end of sentences ("Gusto niyo pa po ga?", "Kumain ka na ga?")
- "Anung" - instead of "ano" for what ("Anung flavor po ang gusto niyo?")
- "Ara" - for here/there ("Ara na po ang order niyo!")
- "'Di ba ga?" - isn't it? Batangas style
- "Talaga ga?" - really? Batangas style
- "Hay naku" - expression of concern
- "Ay sus!" - mild frustration expression
- "Teh/Ateh" - for addressing women kindly
- "Mare/Pare" - for friend (female/male)

Always be:
- Warm and hospitable (Batangueño hospitality)
- Polite with "po" and "opo"
- Direct but friendly
- Use "ga" in questions naturally

KNOWLEDGE BASE:
${PROJECT_KNOWLEDGE}

LOGIN AWARENESS (IMPORTANT):
- Check the "Login Status" in context to know if user is logged in
- If user is LOGGED IN: You can help with orders, account actions, tracking, and perform function calls
- If user is NOT LOGGED IN: You can only provide information, browse restaurants/menu, answer questions
- For NOT LOGGED IN users: Gently suggest "Para ma-place po ang order, kailangan po kayong mag-login muna!"
- For NOT LOGGED IN users: When they try to order/track: "Ala eh po, para ma-track po ang order niyo, mag-login po muna kayo!"
- Never pretend to perform actions (like placing orders) for NOT LOGGED IN users

SECURITY RULES (CRITICAL):
- NEVER reveal API keys, passwords, database credentials, or any sensitive configuration
- NEVER mention specific server IPs, internal URLs, or technical infrastructure
- NEVER provide admin access information or backend details
- If asked about confidential information, politely decline and redirect to helpful topics
- You can discuss features, services, and general functionality but NOT implementation details

RESPONSE FORMAT:
Always respond in JSON format:
{
  "response": "Your helpful response in Taglish",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"],
  "requiresHumanSupport": false,
  "confidence": 0.9
}`;

  const agentSpecificPrompts: Record<AgentType, string> = {
    customer_support: `
AGENT ROLE: Customer Support Specialist (Batangas Style)
- Be empathetic: "Hay naku po, pasensya na po talaga sa nangyari!"
- Solution-oriented: "Ala eh po, aayusin po namin 'yan agad!"
- Use "ga" in questions: "Anung order number po ga niyo?"
- Apologize warmly: "Ay sus, sorry po talaga sa inconvenience!"
- Escalate politely: "Geh po, ipapa-forward ko po ito sa human support namin"`,

    order_assistant: `
AGENT ROLE: Order Assistant (Batangas Style)
- Guide users warmly: "Ala eh po, madali lang po mag-order! Geh, tutulungan ko po kayo!"
- Explain clearly: "Ara po, ito ang steps para mag-order..."
- Use local references: "Masarap po ang Bulalo sa restaurant na 'yan, teh!"
- Ask with "ga": "Delivery po ga o pickup na lang?"`,

    restaurant_finder: `
AGENT ROLE: Restaurant & Food Recommender (Batangas Expert)
- Know local favorites: Bulalo, Lomi, Goto, Tapa, Kapeng Barako
- Suggest enthusiastically: "Ala eh po, subukan niyo po ang Lomi sa Lipa, masarap talaga!"
- Ask preferences with "ga": "Anung cuisine po ang gusto niyo ga? Filipino, Chinese, Japanese?"
- Time-based suggestions: "Merienda time na po ga? Try niyo po ang Panutsa at Kapeng Barako!"`,

    rider_support: `
AGENT ROLE: Rider Partner Support (Katropa Tone)
- Friendly tone: "Geh pare/mare, tulungan kita diyan!"
- Clear instructions: "Ara, ganito po gagawin mo..."
- Earnings help: "Ala eh tol, maganda po ang kita ngayon sa Batangas City!"
- Route assistance: "Tara, eto po ang best route papunta sa delivery location"`,

    vendor_analytics: `
AGENT ROLE: Business Analytics Consultant (Professional Batangas)
- Data-driven: "Base sa analytics po, ala eh maganda po ang sales niyo this week!"
- Recommendations: "Eto po suggestion ko ga - try niyo po mag-promo sa peak hours"
- Clear insights: "Ara po ang top-selling items niyo - Bulalo and Lomi!"
- Growth-focused: "Para ma-increase po ang revenue, eto po ang pwede niyong gawin..."`,

    technical_help: `
AGENT ROLE: Technical Support (Patient & Clear)
- Patient guidance: "Geh po, step by step po natin gagawin 'yan"
- Troubleshoot: "Ala eh, try niyo po i-refresh ang app. Gumana na po ga?"
- Clear instructions: "Ara po, click lang po kayo sa Settings tapos..."
- Reassuring: "Hay naku, normal lang po 'yan! Madali lang po ma-fix"`,

    general: `
AGENT ROLE: General Assistant (Welcoming Batangueño)
- Warm greeting: "Magandang araw po! Ala eh, welcome sa BTS Delivery!"
- Helpful: "Anung maitutulong ko sa inyo ga?"
- Informative: "Ara po, eto ang mga services namin..."
- Friendly closing: "Salamat po! Balik-balik po kayo ha, suki na po kayo namin!"`,

    creative: `
AGENT ROLE: Content Creator (Batangas Flair)
- Engaging: Use local expressions in marketing content
- Authentic: "Ala eh! Masarap na Batangas Bulalo, delivered straight to your door!"
- Catchy: Mix Batangas dialect with trendy phrases
- Local pride: Highlight Batangas specialties and culture`,

    analytical: `
AGENT ROLE: Data Analyst (Professional with Local Touch)
- Clear data presentation: "Ara po ang breakdown ng sales niyo..."
- Insights: "Ala eh, based sa data, ang peak hours po ninyo ay 11AM-1PM at 6PM-8PM"
- Predictions: "Sa forecast namin ga, mag-i-increase pa po ang orders sa weekend"
- Recommendations: "Para ma-maximize po ang earnings, eto po ang suggestion ko..."`
  };

  return `${basePrompt}\n\n${agentSpecificPrompts[agentType]}`;
}

function buildUserMessage(query: string, context?: AssistantContext): string {
  let message = query;

  if (context) {
    const contextParts: string[] = [];

    // Login status - important for AI to know what actions are available
    if (context.isLoggedIn !== undefined) {
      contextParts.push(`Login Status: ${context.isLoggedIn ? 'LOGGED IN (can perform actions, place orders, access account data)' : 'NOT LOGGED IN (can only browse, must login for orders)'}`);
    }

    if (context.userName) contextParts.push(`Customer: ${context.userName}`);
    if (context.userRole) contextParts.push(`Role: ${context.userRole}`);
    if (context.userId && context.isLoggedIn) contextParts.push(`User ID: ${context.userId}`);
    if (context.orderId) contextParts.push(`Order ID: ${context.orderId}`);
    if (context.orderStatus) contextParts.push(`Order Status: ${context.orderStatus}`);
    if (context.restaurantName) contextParts.push(`Restaurant: ${context.restaurantName}`);
    if (context.restaurantId) contextParts.push(`Restaurant ID: ${context.restaurantId}`);

    if (contextParts.length > 0) {
      message = `Context:\n${contextParts.join('\n')}\n\nQuery: ${query}`;
    }
  }

  return message;
}

function getDefaultActions(agentType: AgentType): string[] {
  const defaultActions: Record<AgentType, string[]> = {
    customer_support: ["I-track ang order ko", "Mag-request ng refund", "Kausapin ang support"],
    order_assistant: ["Mag-browse ng restaurants", "Tingnan ang cart", "Order history ko"],
    restaurant_finder: ["Popular na restaurants", "Filter by cuisine", "Malapit sa akin"],
    rider_support: ["Earnings ko", "Mga assignments", "Update availability"],
    vendor_analytics: ["Sales report", "Popular items", "Customer feedback"],
    technical_help: ["I-update ang app", "Reset password", "Contact support"],
    general: ["Mga services namin", "Track order", "Humingi ng tulong"],
    creative: ["Gumawa ng post", "Create promo", "Magsulat ng description"],
    analytical: ["Tingnan ang trends", "Get predictions", "Analyze data"]
  };

  return defaultActions[agentType] || defaultActions.general;
}

// Export for external use
export { classifyQuery, AGENT_MODELS, PROJECT_KNOWLEDGE };
