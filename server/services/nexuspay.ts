import * as crypto from 'crypto';

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
  private tokenExpiresAt: Date | null = null;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // milliseconds

  constructor() {
    this.config = {
      baseUrl: 'https://nexuspay.cloud/api',
      username: process.env.NEXUSPAY_USERNAME || '',
      password: process.env.NEXUSPAY_PASSWORD || '',
      apiId: process.env.NEXUSPAY_API_ID,
      apiKey: process.env.NEXUSPAY_API_KEY,
    };

    if (!this.config.username || !this.config.password) {
      console.warn('NexusPay credentials not found in environment variables');
    }
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
        // Set token expiry to 1 hour from now
        this.tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
        return data.data.token;
      }

      throw new Error(data.message || 'Authentication failed');
    } catch (error) {
      console.error('NexusPay authentication error:', error);
      throw error;
    }
  }

  // Webhook signature verification for NexusPay
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload, 'utf8')
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  // Transaction inquiry for payment tracking
  async getTransactionDetails(transactionId: string): Promise<any> {
    return this.retryRequest(async () => {
      await this.ensureAuthenticated();

      const response = await fetch(`${this.config.baseUrl}/transaction/${transactionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction details: ${response.statusText}`);
      }

      return await response.json();
    });
  }

  // Get balance for account management
  async getAccountBalance(): Promise<{ balance: number; currency: string }> {
    return this.retryRequest(async () => {
      await this.ensureAuthenticated();

      const response = await fetch(`${this.config.baseUrl}/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get account balance: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        balance: parseFloat(data.balance || '0'),
        currency: data.currency || 'PHP',
      };
    });
  }

  // Retry mechanism for failed requests
  private async retryRequest(requestFn: () => Promise<any>, retries = this.maxRetries): Promise<any> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`Request failed, retrying... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    // Check if error is retryable (network issues, temporary server errors, etc.)
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           (error.response && error.response.status >= 500);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Enhanced payment validation
  private validatePaymentData(amount: number, paymentMethodCode?: string): void {
    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    
    if (amount > 500000) { // 500K PHP limit for security
      throw new Error('Payment amount exceeds maximum limit of ₱500,000');
    }

    if (paymentMethodCode && !Object.values(NEXUSPAY_CODES).includes(paymentMethodCode as any)) {
      throw new Error(`Invalid payment method code: ${paymentMethodCode}`);
    }
  }

  // Create cash-in payment with enhanced features
  async createCashInPayment(
    amount: number,
    webhookUrl: string,
    redirectUrl: string,
    paymentMethodCode?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResponse> {
    this.validatePaymentData(amount, paymentMethodCode);

    return this.retryRequest(async () => {
      // Ensure we have valid auth token
      await this.ensureAuthenticated();

      const paymentData: any = {
        amount: amount,
        webhook: webhookUrl,
        redirectUrl: redirectUrl,
        metadata: metadata || {},
      };

      // Add payment method if specified
      if (paymentMethodCode) {
        paymentData.paymentMethod = paymentMethodCode;
      }

      const response = await fetch(`${this.config.baseUrl}/pay_cashin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'X-API-Version': '2.0', // Use latest API version
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'status' || data.status === 'success') {
        return {
          status: 'success',
          link: data.link,
          transactionId: data.transactionId,
          message: data.message,
        };
      }

      throw new Error(data.message || 'Payment creation failed');
    });
  }

  // Enhanced authentication with token expiry management
  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return; // Token is still valid
    }
    
    await this.authenticate();
  }

  // Create payment for specific Filipino payment method
  async createPaymentWithMethod(
    amount: number,
    paymentMethod: keyof typeof NEXUSPAY_CODES,
    webhookUrl: string,
    redirectUrl: string,
    customerInfo?: {
      name?: string;
      email?: string;
      phone?: string;
    },
    metadata?: Record<string, any>
  ): Promise<PaymentResponse> {
    const paymentMethodCode = NEXUSPAY_CODES[paymentMethod];
    
    const enhancedMetadata = {
      paymentMethod,
      paymentMethodCode,
      customerInfo: customerInfo || {},
      ...metadata,
    };

    return this.createCashInPayment(
      amount, 
      webhookUrl, 
      redirectUrl, 
      paymentMethodCode, 
      enhancedMetadata
    );
  }

  // Batch payout processing for riders/vendors
  async processBatchPayouts(
    payouts: Array<{
      code: string;
      accountNumber: string;
      name: string;
      amount: number;
      reference?: string;
    }>
  ): Promise<Array<PayoutResponse & { reference?: string; error?: string }>> {
    const results = [];
    
    for (const payout of payouts) {
      try {
        const result = await this.createPayout(
          payout.code,
          payout.accountNumber,
          payout.name,
          payout.amount
        );
        results.push({
          ...result,
          reference: payout.reference,
        });
      } catch (error: any) {
        results.push({
          status: 'failed',
          reference: payout.reference,
          error: error.message,
        });
      }
    }
    
    return results;
  }

  // Get available payment methods with their details
  getAvailablePaymentMethods(): Array<{
    code: string;
    name: string;
    category: string;
    description: string;
  }> {
    const methods = [];
    
    for (const [category, paymentMethods] of Object.entries(PAYMENT_CATEGORIES)) {
      for (const method of paymentMethods) {
        methods.push({
          code: NEXUSPAY_CODES[method as keyof typeof NEXUSPAY_CODES],
          name: method.replace(/_/g, ' ').toUpperCase(),
          category: category.toLowerCase(),
          description: this.getPaymentMethodDescription(method),
        });
      }
    }
    
    return methods;
  }

  private getPaymentMethodDescription(method: string): string {
    const descriptions: Record<string, string> = {
      GCASH: 'GCash - Philippines\' leading mobile wallet',
      MAYA: 'Maya (formerly PayMaya) - Digital payments and financial services',
      GRABPAY: 'GrabPay - Seamless digital wallet for ride-hailing and delivery',
      BPI: 'Bank of the Philippine Islands - Online banking',
      BDO: 'Banco de Oro - Philippines\' largest bank',
      UNIONBANK: 'UnionBank - Digital banking solutions',
      SEVEN_ELEVEN: '7-Eleven - Over-the-counter payment at stores',
      CEBUANA: 'Cebuana Lhuillier - Pawnshop and remittance centers',
      // Add more descriptions as needed
    };
    
    return descriptions[method] || `${method.replace(/_/g, ' ')} payment method`;
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

// Payment gateway codes - Comprehensive Filipino payment methods
export const NEXUSPAY_CODES = {
  // E-wallets
  GCASH: '0093',
  MAYA: '0483',
  MAYA_BANK: '7031',
  GRABPAY: '7003',
  SHOPEEPAY: '7017',
  PAYMAYA: '0483', // Alternative code for Maya
  
  // Online Banking
  BPI: '0010',
  BDO: '0001',
  UNIONBANK: '0006',
  METROBANK: '0033',
  PNB: '0011',
  LANDBANK: '0035',
  DBP: '0016',
  RCBC: '0067',
  SECURITY_BANK: '0069',
  
  // Rural Banks and Others
  CHINABANK: '0034',
  EASTWEST: '0074',
  MAYBANK: '0072',
  PSBANK: '0108',
  
  // International
  UNIONPAY: '7014',
  ALIPAY: '7015',
  WECHAT: '7016',
  
  // Retail and OTC
  SEVEN_ELEVEN: '0301',
  CEBUANA: '0302',
  MLHUILLIER: '0303',
  SM_BILLS: '0304',
  ECPAY: '0305',
  BAYAD_CENTER: '0306',
  
  // Crypto (if available)
  COINS_PH: '0401',
  PDAX: '0402',
} as const;

// Payment method categories for easier management
export const PAYMENT_CATEGORIES = {
  EWALLET: ['GCASH', 'MAYA', 'GRABPAY', 'SHOPEEPAY', 'PAYMAYA'],
  ONLINE_BANKING: ['BPI', 'BDO', 'UNIONBANK', 'METROBANK', 'PNB', 'LANDBANK', 'DBP', 'RCBC', 'SECURITY_BANK'],
  RURAL_BANKS: ['CHINABANK', 'EASTWEST', 'MAYBANK', 'PSBANK'],
  INTERNATIONAL: ['UNIONPAY', 'ALIPAY', 'WECHAT'],
  OTC: ['SEVEN_ELEVEN', 'CEBUANA', 'MLHUILLIER', 'SM_BILLS', 'ECPAY', 'BAYAD_CENTER'],
  CRYPTO: ['COINS_PH', 'PDAX'],
} as const;

// Singleton instance
export const nexusPayService = new NexusPayService();