import Stripe from "stripe";

export interface PaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<any>;
  confirmPayment(paymentIntentId: string): Promise<any>;
  refund(paymentIntentId: string, amount?: number): Promise<any>;
  getPaymentStatus(paymentIntentId: string): Promise<string>;
}

// Stripe Integration
export class StripeProvider implements PaymentProvider {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });
  }

  async createPaymentIntent(amount: number, currency: string = "php", metadata?: any) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
    });
    return paymentIntent;
  }

  async confirmPayment(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  }

  async refund(paymentIntentId: string, amount?: number) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
    return refund;
  }

  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status;
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