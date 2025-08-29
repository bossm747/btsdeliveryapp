import { Twilio } from 'twilio';

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<boolean>;
  sendOTP(to: string, code: string): Promise<boolean>;
  verifyOTP(to: string, code: string): Promise<boolean>;
}

// Twilio SMS Provider
export class TwilioProvider implements SMSProvider {
  private client: Twilio;
  private fromNumber: string;
  private otpCache: Map<string, { code: string; expiry: number }> = new Map();

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio credentials are required");
    }
    
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      // Format Philippine number
      const formattedNumber = this.formatPhilippineNumber(to);
      
      await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber,
      });
      
      return true;
    } catch (error) {
      console.error("Failed to send SMS:", error);
      return false;
    }
  }

  async sendOTP(to: string, code: string): Promise<boolean> {
    const message = `Your BTS Delivery verification code is: ${code}. Valid for 5 minutes. Never share this code.`;
    
    // Store OTP with 5-minute expiry
    this.otpCache.set(to, {
      code,
      expiry: Date.now() + 5 * 60 * 1000,
    });

    return await this.sendSMS(to, message);
  }

  async verifyOTP(to: string, code: string): Promise<boolean> {
    const cached = this.otpCache.get(to);
    
    if (!cached) {
      return false;
    }

    if (Date.now() > cached.expiry) {
      this.otpCache.delete(to);
      return false;
    }

    if (cached.code === code) {
      this.otpCache.delete(to);
      return true;
    }

    return false;
  }

  private formatPhilippineNumber(number: string): string {
    // Remove all non-numeric characters
    let cleaned = number.replace(/\D/g, '');
    
    // Handle Philippine numbers
    if (cleaned.startsWith('0')) {
      // Local format: 09171234567 -> +639171234567
      cleaned = '63' + cleaned.substring(1);
    } else if (!cleaned.startsWith('63')) {
      // Assume it's missing country code
      cleaned = '63' + cleaned;
    }
    
    return '+' + cleaned;
  }
}

// Semaphore SMS Provider (Local Philippine provider)
export class SemaphoreProvider implements SMSProvider {
  private apiKey: string;
  private baseUrl = "https://api.semaphore.co/api/v4";
  private otpCache: Map<string, { code: string; expiry: number }> = new Map();

  constructor() {
    if (!process.env.SEMAPHORE_API_KEY) {
      throw new Error("SEMAPHORE_API_KEY is required");
    }
    this.apiKey = process.env.SEMAPHORE_API_KEY;
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    try {
      const formattedNumber = this.formatPhilippineNumber(to);
      
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apikey: this.apiKey,
          number: formattedNumber,
          message: message,
          sendername: "BTS", // Needs to be registered with Semaphore
        }),
      });

      if (!response.ok) {
        throw new Error(`SMS send failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Failed to send SMS via Semaphore:", error);
      return false;
    }
  }

  async sendOTP(to: string, code: string): Promise<boolean> {
    const message = `Your BTS Delivery code: ${code}. Valid for 5 mins. Don't share.`;
    
    this.otpCache.set(to, {
      code,
      expiry: Date.now() + 5 * 60 * 1000,
    });

    return await this.sendSMS(to, message);
  }

  async verifyOTP(to: string, code: string): Promise<boolean> {
    const cached = this.otpCache.get(to);
    
    if (!cached) {
      return false;
    }

    if (Date.now() > cached.expiry) {
      this.otpCache.delete(to);
      return false;
    }

    if (cached.code === code) {
      this.otpCache.delete(to);
      return true;
    }

    return false;
  }

  private formatPhilippineNumber(number: string): string {
    let cleaned = number.replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    } else if (cleaned.startsWith('63')) {
      cleaned = cleaned.substring(2);
    }
    
    return cleaned; // Semaphore expects format: 9171234567
  }
}

// SMS Service
export class SMSService {
  private provider: SMSProvider;

  constructor() {
    // Use Twilio if available, otherwise Semaphore
    if (process.env.TWILIO_ACCOUNT_SID) {
      this.provider = new TwilioProvider();
    } else if (process.env.SEMAPHORE_API_KEY) {
      this.provider = new SemaphoreProvider();
    } else {
      console.warn("No SMS provider configured");
      // Fallback to console logging for development
      this.provider = {
        async sendSMS(to: string, message: string) {
          console.log(`SMS to ${to}: ${message}`);
          return true;
        },
        async sendOTP(to: string, code: string) {
          console.log(`OTP for ${to}: ${code}`);
          return true;
        },
        async verifyOTP(to: string, code: string) {
          console.log(`Verifying OTP for ${to}: ${code}`);
          return true; // Always verify in dev mode
        }
      };
    }
  }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOTP(phoneNumber: string): Promise<string | null> {
    const otp = this.generateOTP();
    const sent = await this.provider.sendOTP(phoneNumber, otp);
    return sent ? otp : null;
  }

  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    return await this.provider.verifyOTP(phoneNumber, code);
  }

  async sendNotification(phoneNumber: string, message: string): Promise<boolean> {
    return await this.provider.sendSMS(phoneNumber, message);
  }

  // Order notifications
  async notifyOrderConfirmed(phoneNumber: string, orderNumber: string) {
    const message = `BTS Delivery: Order #${orderNumber} confirmed! Preparing your order now. Track: btsdelivery.com/track/${orderNumber}`;
    return await this.sendNotification(phoneNumber, message);
  }

  async notifyOrderReady(phoneNumber: string, orderNumber: string) {
    const message = `BTS Delivery: Order #${orderNumber} is ready! Rider is on the way to pick up. Est. delivery in 30 mins.`;
    return await this.sendNotification(phoneNumber, message);
  }

  async notifyOrderDelivered(phoneNumber: string, orderNumber: string) {
    const message = `BTS Delivery: Order #${orderNumber} delivered! Thank you for choosing BTS. Rate your experience: btsdelivery.com/rate/${orderNumber}`;
    return await this.sendNotification(phoneNumber, message);
  }

  async notifyRiderAssigned(phoneNumber: string, orderNumber: string, riderName: string, riderPhone: string) {
    const message = `BTS Delivery: ${riderName} is delivering Order #${orderNumber}. Contact: ${riderPhone}`;
    return await this.sendNotification(phoneNumber, message);
  }
}

export const smsService = new SMSService();