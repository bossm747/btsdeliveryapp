import crypto from 'crypto';

interface NexusPayConfig {
  baseUrl: string;
  username: string;
  password: string;
  apiId?: string;
  apiKey?: string;
}

interface PaymentResponse {
  status: string;
  link?: string;
  transactionId?: string;
  message?: string;
}

interface PayoutResponse {
  status: string;
  payoutlink?: string;
  message?: string;
}

export class NexusPayService {
  private config: NexusPayConfig;
  private authToken: string | null = null;
  private csrfToken: string | null = null;

  constructor() {
    this.config = {
      baseUrl: 'https://nexuspay.cloud/api',
      username: process.env.NEXUSPAY_USERNAME || '',
      password: process.env.NEXUSPAY_PASSWORD || '',
      apiId: process.env.NEXUSPAY_API_ID,
      apiKey: process.env.NEXUSPAY_API_KEY,
    };
  }

  // Get CSRF token
  private async getCsrfToken(): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseUrl}/csrf_token`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Extract CSRF token from headers or cookies
      const csrfToken = response.headers.get('x-csrf-token') || 
                       response.headers.get('csrf-token') ||
                       crypto.randomBytes(32).toString('hex');
      
      this.csrfToken = csrfToken;
      return csrfToken;
    } catch (error) {
      console.error('Error getting CSRF token:', error);
      throw new Error('Failed to get CSRF token');
    }
  }

  // Login to get auth token
  async authenticate(): Promise<string> {
    try {
      if (!this.csrfToken) {
        await this.getCsrfToken();
      }

      const response = await fetch(`${this.config.baseUrl}/create/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': this.csrfToken!,
        },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success' && data.data?.token) {
        this.authToken = data.data.token;
        return this.authToken;
      }

      throw new Error(data.message || 'Authentication failed');
    } catch (error) {
      console.error('NexusPay authentication error:', error);
      throw error;
    }
  }

  // Create cash-in payment with QR code
  async createCashInPayment(
    amount: number,
    webhookUrl: string,
    redirectUrl: string
  ): Promise<PaymentResponse> {
    try {
      // Ensure we have auth token
      if (!this.authToken) {
        await this.authenticate();
      }

      const response = await fetch(`${this.config.baseUrl}/pay_cashin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({
          amount: amount,
          webhook: webhookUrl,
          redirectUrl: redirectUrl,
        }),
      });

      const data = await response.json();
      
      if (data.status === 'status' || data.status === 'success') {
        return {
          status: 'success',
          link: data.link,
          transactionId: data.transactionId,
        };
      }

      throw new Error(data.message || 'Payment creation failed');
    } catch (error) {
      console.error('NexusPay payment error:', error);
      throw error;
    }
  }

  // Encrypt payload for payout
  private encryptPayload(data: any): string {
    if (!this.config.apiId || !this.config.apiKey) {
      throw new Error('API ID and API Key required for payout');
    }

    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.config.apiKey, 'hex');
    const iv = Buffer.from(this.config.apiId, 'hex').slice(0, 16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted;
  }

  // Create payout/cash-out
  async createPayout(
    code: string,
    accountNumber: string,
    name: string,
    amount: number
  ): Promise<PayoutResponse> {
    try {
      // Ensure we have auth token
      if (!this.authToken) {
        await this.authenticate();
      }

      const payloadData = {
        code: code,
        account_number: accountNumber,
        name: name,
        amount: amount,
      };

      const encryptedData = this.encryptPayload(payloadData);

      const response = await fetch(`${this.config.baseUrl}/create_pay_out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-data': encryptedData,
          'X-code': code,
        },
      });

      const data = await response.json();
      
      if (data.status === 'successful' || data.status === 'success') {
        return {
          status: 'success',
          payoutlink: data.payoutlink,
        };
      }

      throw new Error(data.message || 'Payout creation failed');
    } catch (error) {
      console.error('NexusPay payout error:', error);
      throw error;
    }
  }

  // Check payment status
  async getPaymentStatus(transactionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/payoutstatus/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  }

  // Get payout details
  async getPayoutDetails(payoutId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/payout/${payoutId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting payout details:', error);
      throw error;
    }
  }
}

// Payment gateway codes
export const NEXUSPAY_CODES = {
  GCASH: '0093',
  MAYA: '0483',
  MAYA_BANK: '7031',
  GRABPAY: '7003',
} as const;

// Singleton instance
export const nexusPayService = new NexusPayService();