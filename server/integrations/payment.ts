// Temporarily import Stripe with try-catch to handle module issues
let Stripe: any;
try {
  Stripe = (await import("stripe")).default;
} catch (error) {
  console.warn("Stripe module not available:", error.message);
  // Create a mock Stripe class for development
  Stripe = class MockStripe {
    constructor() {}
    paymentIntents = { create: () => {}, retrieve: () => {}, confirm: () => {} };
    customers = { create: () => {}, retrieve: () => {}, update: () => {} };
    paymentMethods = { attach: () => {}, list: () => {}, detach: () => {} };
    refunds = { create: () => {} };
    setupIntents = { create: () => {} };
    webhooks = { constructEvent: () => {} };
  };
}

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<any>;
  confirmPayment(paymentIntentId: string, paymentMethodId?: string): Promise<any>;
  refund(paymentIntentId: string, amount?: number, reason?: string): Promise<any>;
  getPaymentStatus(paymentIntentId: string): Promise<string>;
  
  // Enhanced methods for comprehensive payment management
  createCustomer?(customerData: any): Promise<any>;
  getCustomer?(customerId: string): Promise<any>;
  updateCustomer?(customerId: string, updates: any): Promise<any>;
  
  savePaymentMethod?(customerId: string, paymentMethodId: string): Promise<any>;
  listPaymentMethods?(customerId: string): Promise<any>;
  detachPaymentMethod?(paymentMethodId: string): Promise<any>;
  
  verifyWebhookSignature?(payload: any, signature: string, secret: string): boolean;
  constructWebhookEvent?(payload: any, signature: string, secret: string): any;
}

// Stripe Integration - Enhanced with comprehensive payment management
export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;
  private webhookSecret: string | undefined;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  async createPaymentIntent(amount: number, currency: string = "php", metadata?: any) {
    try {
      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
        // Philippines-specific configuration
        payment_method_options: {
          card: {
            setup_future_usage: "off_session", // Allow saving for future use
          },
        },
      };

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);
      
      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment intent creation failed: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string, paymentMethodId?: string) {
    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        payment_method: paymentMethodId,
        return_url: process.env.FRONTEND_URL + '/payment/result',
      };

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId, 
        confirmParams
      );
      
      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } catch (error: any) {
      throw new Error(`Stripe payment confirmation failed: ${error.message}`);
    }
  }

  async refund(paymentIntentId: string, amount?: number, reason?: string) {
    try {
      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        reason: reason as Stripe.RefundCreateParams.Reason || 'requested_by_customer',
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);
      
      return {
        id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        payment_intent: refund.payment_intent,
      };
    } catch (error: any) {
      throw new Error(`Stripe refund failed: ${error.message}`);
    }
  }

  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status;
    } catch (error: any) {
      throw new Error(`Failed to get payment status: ${error.message}`);
    }
  }

  // Enhanced customer management methods
  async createCustomer(customerData: any) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: `${customerData.firstName} ${customerData.lastName}`.trim(),
        phone: customerData.phone,
        metadata: {
          userId: customerData.userId,
          ...customerData.metadata,
        },
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to create Stripe customer: ${error.message}`);
    }
  }

  async getCustomer(customerId: string) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      
      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to get Stripe customer: ${error.message}`);
    }
  }

  async updateCustomer(customerId: string, updates: any) {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        email: updates.email,
        name: updates.name,
        phone: updates.phone,
        metadata: updates.metadata,
      });

      return {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        phone: customer.phone,
        metadata: customer.metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to update Stripe customer: ${error.message}`);
    }
  }

  // Payment method management
  async savePaymentMethod(customerId: string, paymentMethodId: string) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
        } : undefined,
        customer: paymentMethod.customer,
      };
    } catch (error: any) {
      throw new Error(`Failed to save payment method: ${error.message}`);
    }
  }

  async listPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : undefined,
        created: pm.created,
      }));
    } catch (error: any) {
      throw new Error(`Failed to list payment methods: ${error.message}`);
    }
  }

  async detachPaymentMethod(paymentMethodId: string) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      
      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        customer: paymentMethod.customer,
      };
    } catch (error: any) {
      throw new Error(`Failed to detach payment method: ${error.message}`);
    }
  }

  // Webhook handling
  verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
    try {
      if (!secret) {
        throw new Error('Webhook secret not configured');
      }
      
      this.stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  constructWebhookEvent(payload: any, signature: string, secret: string) {
    try {
      if (!secret) {
        throw new Error('Webhook secret not configured');
      }
      
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      
      return {
        id: event.id,
        type: event.type,
        data: event.data,
        created: event.created,
        livemode: event.livemode,
      };
    } catch (error: any) {
      throw new Error(`Failed to construct webhook event: ${error.message}`);
    }
  }

  // Additional utility methods for Philippines market
  async createSetupIntent(customerId: string, metadata?: any) {
    try {
      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata,
        usage: 'off_session',
      });

      return {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        status: setupIntent.status,
        customer: setupIntent.customer,
      };
    } catch (error: any) {
      throw new Error(`Failed to create setup intent: ${error.message}`);
    }
  }

  async getPaymentMethodDetails(paymentMethodId: string) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      
      return {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year,
          funding: paymentMethod.card.funding,
          country: paymentMethod.card.country,
        } : undefined,
        customer: paymentMethod.customer,
        created: paymentMethod.created,
      };
    } catch (error: any) {
      throw new Error(`Failed to get payment method details: ${error.message}`);
    }
  }
}

// GCash Integration (via PayMongo API)
export class GCashProvider implements PaymentProvider {
  private apiKey: string;
  private baseUrl = "https://api.paymongo.com/v1";

  constructor() {
    if (!process.env.PAYMONGO_SECRET_KEY) {
      throw new Error("PAYMONGO_SECRET_KEY is required for GCash payments");
    }
    this.apiKey = process.env.PAYMONGO_SECRET_KEY;
  }

  async createPaymentIntent(amount: number, currency: string = "PHP", metadata?: any) {
    const response = await fetch(`${this.baseUrl}/payment_intents`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            payment_method_allowed: ["gcash"],
            payment_method_options: {
              gcash: {
                capture_type: "automatic"
              }
            },
            currency,
            metadata,
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`GCash payment intent creation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async confirmPayment(paymentIntentId: string) {
    const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}/attach`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`GCash payment confirmation failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async refund(paymentIntentId: string, amount?: number) {
    const response = await fetch(`${this.baseUrl}/refunds`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            payment_id: paymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined,
            reason: "requested_by_customer",
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`GCash refund failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
      headers: {
        "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment status: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.attributes.status;
  }
}

// Maya Integration (similar to GCash via PayMongo)
export class MayaProvider extends GCashProvider {
  async createPaymentIntent(amount: number, currency: string = "PHP", metadata?: any) {
    const response = await fetch(`${this.baseUrl}/payment_intents`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100),
            payment_method_allowed: ["paymaya"],
            currency,
            metadata,
          }
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Maya payment intent creation failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Payment Factory
export class PaymentService {
  private providers: Map<string, PaymentProvider> = new Map();

  constructor() {
    // Initialize available payment providers
    if (process.env.STRIPE_SECRET_KEY) {
      this.providers.set("card", new StripeProvider());
    }
    if (process.env.PAYMONGO_SECRET_KEY) {
      this.providers.set("gcash", new GCashProvider());
      this.providers.set("maya", new MayaProvider());
    }
  }

  getProvider(method: string): PaymentProvider | undefined {
    return this.providers.get(method);
  }

  async processPayment(
    method: string, 
    amount: number, 
    currency: string = "PHP",
    metadata?: any
  ) {
    const provider = this.getProvider(method);
    if (!provider) {
      throw new Error(`Payment method ${method} not available`);
    }

    return await provider.createPaymentIntent(amount, currency, metadata);
  }

  async confirmPayment(method: string, paymentIntentId: string) {
    const provider = this.getProvider(method);
    if (!provider) {
      throw new Error(`Payment method ${method} not available`);
    }

    return await provider.confirmPayment(paymentIntentId);
  }

  async refundPayment(method: string, paymentIntentId: string, amount?: number) {
    const provider = this.getProvider(method);
    if (!provider) {
      throw new Error(`Payment method ${method} not available`);
    }

    return await provider.refund(paymentIntentId, amount);
  }
}

export const paymentService = new PaymentService();