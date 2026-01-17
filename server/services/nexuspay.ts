import * as crypto from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

interface NexusPayConfig {
  baseUrl: string;
  username: string;
  password: string;
  merchantId: string;  // 16 bytes - used as IV for AES-128-CBC
  merchantKey: string; // 16 bytes - used as secret key for AES-128-CBC
}

// Cache for config to avoid repeated lookups
let configCache: { config: NexusPayConfig | null; timestamp: number } | null = null;
const CONFIG_CACHE_TTL = 30000; // 30 seconds

function getConfig(): NexusPayConfig | null {
  // Check cache first
  if (configCache && Date.now() - configCache.timestamp < CONFIG_CACHE_TTL) {
    return configCache.config;
  }

  // Note: NEXUSPAY_BASE_URL should be 'https://nexuspay.cloud/api' (includes /api)
  const baseUrl = process.env.NEXUSPAY_BASE_URL || 'https://nexuspay.cloud/api';
  const username = process.env.NEXUSPAY_USERNAME || '';
  const password = process.env.NEXUSPAY_PASSWORD || '';
  const merchantId = process.env.NEXUSPAY_MERCHANT_ID || '';
  // Support both NEXUSPAY_KEY and NEXUSPAY_MERCHANT_KEY
  const merchantKey = process.env.NEXUSPAY_KEY || process.env.NEXUSPAY_MERCHANT_KEY || '';

  if (!username || !password || !merchantId || !merchantKey) {
    console.error('[NexusPay] Configuration incomplete - missing:', {
      username: !username,
      password: !password,
      merchantId: !merchantId,
      merchantKey: !merchantKey
    });
    configCache = { config: null, timestamp: Date.now() };
    return null;
  }

  const config = { baseUrl, username, password, merchantId, merchantKey };
  configCache = { config, timestamp: Date.now() };
  return config;
}

// Clear config cache (call when settings are updated)
export function clearNexusPayConfigCache(): void {
  configCache = null;
}

// ============================================================================
// Session & Authentication Types
// ============================================================================

interface CSRFSession {
  csrfToken: string;
  sessionCookie: string; // PHPSESSID cookie
}

interface AuthSession {
  token: string;
  sessionCookie: string; // Combined cookies (PHPSESSID + api_key)
}

interface PaymentResponse {
  status: string;
  link?: string;
  transactionId?: string;
  message?: string;
  qrphraw?: string;
}

interface PayoutResponse {
  status: string;
  payoutlink?: string;
  transactionId?: string;
  message?: string;
}

interface WebhookPayload {
  transactionId?: string;
  transaction_id?: string;
  status?: string;
  transaction_status?: string;
  amount?: string | number;
  total_amount?: string | number;
  reference?: string;
  reference_number?: string;
}

// ============================================================================
// CSRF & Authentication Flow (PayVerse Pattern)
// ============================================================================

/**
 * Step 1: Get CSRF token and session cookie from NexusPay
 * This is required before making the login request
 */
async function getCSRFSession(baseUrl: string): Promise<CSRFSession | null> {
  try {
    // baseUrl already includes /api (e.g., https://nexuspay.cloud/api)
    console.log(`[NexusPay] Step 1: Getting CSRF token from ${baseUrl}/csrf_token`);

    const response = await fetch(`${baseUrl}/csrf_token`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BTSDelivery/1.0'
      }
    });

    console.log(`[NexusPay] CSRF response status: ${response.status}`);

    // Extract session cookie (PHPSESSID) - this is required for the login request
    let sessionCookie = '';
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      console.log('[NexusPay] Cookies received:', cookies.substring(0, 150));
      const phpSessionMatch = cookies.match(/PHPSESSID=([^;]+)/);
      if (phpSessionMatch) {
        sessionCookie = `PHPSESSID=${phpSessionMatch[1]}`;
        console.log('[NexusPay] Session cookie extracted');
      }
    }

    if (!sessionCookie) {
      console.error('[NexusPay] No PHPSESSID cookie received');
      return null;
    }

    // Extract CSRF token from response body
    const text = await response.text();
    console.log('[NexusPay] CSRF response body:', text.substring(0, 200));

    let csrfToken = '';
    if (text) {
      try {
        const data = JSON.parse(text);
        csrfToken = data.csrf_token || data.csrfToken || data.token || '';
        if (csrfToken) {
          console.log('[NexusPay] CSRF token extracted from JSON');
        }
      } catch {
        console.error('[NexusPay] Failed to parse CSRF response as JSON');
      }
    }

    if (!csrfToken) {
      console.error('[NexusPay] No CSRF token in response body');
      return null;
    }

    console.log('[NexusPay] CSRF session obtained successfully');
    return { csrfToken, sessionCookie };
  } catch (error) {
    console.error('[NexusPay] Failed to get CSRF session:', error);
    return null;
  }
}

/**
 * Step 2: Login to get auth token using CSRF token and session cookie
 */
async function getFreshAuthSession(): Promise<AuthSession | null> {
  const config = getConfig();
  if (!config) {
    console.error('[NexusPay] Cannot login - configuration missing');
    return null;
  }

  try {
    // Get CSRF session (token + session cookie)
    const csrfSession = await getCSRFSession(config.baseUrl);

    if (!csrfSession) {
      console.error('[NexusPay] CSRF session request failed');
      return null;
    }

    console.log('[NexusPay] Step 2: Logging in to get fresh auth token');

    // Include the session cookie with the CSRF token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'BTSDelivery/1.0',
      'X-CSRF-TOKEN': csrfSession.csrfToken,
      'Cookie': csrfSession.sessionCookie
    };

    const loginBody = {
      username: config.username,
      password: config.password
    };

    console.log(`[NexusPay] Login request to ${config.baseUrl}/create/login`);
    console.log(`[NexusPay] Using session cookie: ${csrfSession.sessionCookie.substring(0, 30)}...`);

    const response = await fetch(`${config.baseUrl}/create/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify(loginBody)
    });

    console.log(`[NexusPay] Login response status: ${response.status}`);

    // Capture any additional cookies from login response
    let allCookies = csrfSession.sessionCookie;
    const loginCookies = response.headers.get('set-cookie');
    if (loginCookies) {
      console.log('[NexusPay] Login cookies received:', loginCookies.substring(0, 150));
      // Parse all cookies and merge with session cookie
      const cookieMatches = loginCookies.match(/([^=;\s]+)=([^;]+)/g);
      if (cookieMatches) {
        for (const cookie of cookieMatches) {
          if (!allCookies.includes(cookie.split('=')[0])) {
            allCookies += `; ${cookie}`;
          }
        }
      }
    }
    console.log('[NexusPay] Combined cookies:', allCookies.substring(0, 80));

    const text = await response.text();
    console.log('[NexusPay] Login response:', text.substring(0, 500));

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('[NexusPay] Failed to parse login response as JSON:', text.substring(0, 200));
      return null;
    }

    if (data.status === 'success' && data.data?.token) {
      console.log('[NexusPay] Login successful, got fresh token');
      // Add token as api_key cookie as well (in case NexusPay expects it there)
      const cookiesWithApiKey = `${allCookies}; api_key=${data.data.token}`;
      return {
        token: data.data.token,
        sessionCookie: cookiesWithApiKey
      };
    }

    console.error('[NexusPay] Login failed:', data.message || 'Unknown error');
    return null;
  } catch (error) {
    console.error('[NexusPay] Login error:', error);
    return null;
  }
}

// Backward compatible function that returns just the token
async function getFreshAuthToken(): Promise<string | null> {
  const session = await getFreshAuthSession();
  return session?.token || null;
}

// ============================================================================
// AES-128-CBC Encryption (PayVerse Pattern)
// ============================================================================

/**
 * Encrypt payload for payout using AES-128-CBC
 * - Key: merchantKey (16 bytes)
 * - IV: merchantId (16 bytes)
 * - Padding: PKCS5Padding (handled automatically by Node.js crypto)
 */
function encryptPayload(payload: object, config: NexusPayConfig): string {
  const keyBuffer = Buffer.from(config.merchantKey, 'utf8');
  const ivBuffer = Buffer.from(config.merchantId, 'utf8');

  // Validate key and IV lengths for AES-128
  if (keyBuffer.length !== 16) {
    console.error(`[NexusPay] Key length must be 16 bytes for AES-128, got ${keyBuffer.length}`);
    throw new Error('Invalid merchant key length - must be exactly 16 characters');
  }
  if (ivBuffer.length !== 16) {
    console.error(`[NexusPay] IV length must be 16 bytes, got ${ivBuffer.length}`);
    throw new Error('Invalid merchant ID length - must be exactly 16 characters');
  }

  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
  const jsonPayload = JSON.stringify(payload);

  let encrypted = cipher.update(jsonPayload, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  console.log('[NexusPay] Payload encrypted with AES-128-CBC successfully');
  return encrypted;
}

// ============================================================================
// NexusPay Service Class
// ============================================================================

export class NexusPayService {
  private authSession: AuthSession | null = null;
  private tokenExpiresAt: Date | null = null;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // milliseconds

  constructor() {
    const config = getConfig();
    if (!config) {
      console.warn('[NexusPay] Configuration not complete - service will not work until configured');
    }
  }

  // ============================================================================
  // Authentication Management
  // ============================================================================

  /**
   * Ensure we have a valid auth session, refreshing if needed
   */
  private async ensureAuthenticated(): Promise<AuthSession> {
    // Check if current session is still valid (1 hour expiry)
    if (this.authSession && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.authSession;
    }

    // Get fresh session
    const session = await getFreshAuthSession();
    if (!session) {
      throw new Error('Failed to authenticate with NexusPay');
    }

    this.authSession = session;
    this.tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return session;
  }

  /**
   * Check if NexusPay is configured and authenticated
   */
  async getStatus(): Promise<{ configured: boolean; authenticated: boolean; message: string }> {
    const config = getConfig();
    if (!config) {
      return {
        configured: false,
        authenticated: false,
        message: 'NexusPay is not configured - missing credentials'
      };
    }

    try {
      const session = await getFreshAuthSession();
      return {
        configured: true,
        authenticated: !!session,
        message: session ? 'NexusPay is ready' : 'Authentication failed - check logs'
      };
    } catch (error: any) {
      return {
        configured: true,
        authenticated: false,
        message: `Authentication error: ${error.message}`
      };
    }
  }

  // ============================================================================
  // Retry Mechanism
  // ============================================================================

  private async retryRequest<T>(requestFn: () => Promise<T>, retries = this.maxRetries): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (retries > 0 && this.isRetryableError(error)) {
        console.log(`[NexusPay] Request failed, retrying... (${this.maxRetries - retries + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay);
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    return error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT' ||
           (error.response && error.response.status >= 500);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Validation
  // ============================================================================

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

  // ============================================================================
  // Cash-In (Receive Payment)
  // ============================================================================

  /**
   * Create cash-in payment request
   * Returns a payment link that customer can use to pay via GCash/Maya/etc
   */
  async createCashInPayment(
    amount: number,
    webhookUrl: string,
    redirectUrl: string,
    paymentMethodCode?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentResponse> {
    // NexusPay requires minimum ₱100 for cash-in
    if (amount < 100) {
      throw new Error('Minimum amount for cash-in is ₱100');
    }

    this.validatePaymentData(amount, paymentMethodCode);

    return this.retryRequest(async () => {
      const session = await this.ensureAuthenticated();
      const config = getConfig();
      if (!config) {
        throw new Error('NexusPay not configured');
      }

      const paymentData: any = {
        amount: parseFloat(amount.toFixed(2)),
        webhook: webhookUrl,
        redirectUrl: redirectUrl,
        metadata: metadata || {},
      };

      if (paymentMethodCode) {
        paymentData.paymentMethod = paymentMethodCode;
      }

      console.log(`[NexusPay] Creating cash-in for ₱${amount}`);
      console.log(`[NexusPay] Webhook: ${webhookUrl}`);
      console.log(`[NexusPay] Redirect: ${redirectUrl}`);

      const response = await fetch(`${config.baseUrl}/pay_cashin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Cookie': session.sessionCookie,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BTSDelivery/1.0'
        },
        body: JSON.stringify(paymentData),
      });

      console.log(`[NexusPay] Cash-in response status: ${response.status}`);

      const text = await response.text();
      console.log('[NexusPay] Cash-in response:', text.substring(0, 500));

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from payment gateway');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from payment gateway');
      }

      if (data.status === 'success' && data.link) {
        console.log(`[NexusPay] Cash-in created successfully: ${data.transactionId}`);
        return {
          status: 'success',
          link: data.link,
          transactionId: data.transactionId,
          message: data.message || 'Scan QR code to complete payment',
          qrphraw: data.qrphraw || null,
        };
      }

      throw new Error(data.message || 'Payment creation failed');
    });
  }

  /**
   * Check status of a cash-in transaction
   */
  async getCashInStatus(transactionId: string): Promise<{
    success: boolean;
    status: string;
    referenceNumber?: string;
    amount?: number;
    message?: string;
  }> {
    const session = await this.ensureAuthenticated();
    const config = getConfig();
    if (!config) {
      throw new Error('NexusPay not configured');
    }

    console.log(`[NexusPay] Checking cash-in status for: ${transactionId}`);

    const response = await fetch(`${config.baseUrl}/cashin_transactions_status/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Cookie': session.sessionCookie,
        'Accept': 'application/json',
        'User-Agent': 'BTSDelivery/1.0'
      }
    });

    const text = await response.text();
    console.log('[NexusPay] Cash-in status response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid response from payment gateway');
    }

    const txStatus = (data.transaction_status || data.transaction_state || data.status || '').toString().toLowerCase();
    const successStatuses = ['success', 'successful', 'completed', 'paid'];
    const isSuccess = successStatuses.includes(txStatus);

    return {
      success: isSuccess,
      status: txStatus,
      referenceNumber: data.reference_number,
      amount: data.total_amount ? parseFloat(data.total_amount) : undefined,
      message: data.message
    };
  }

  // ============================================================================
  // Cash-Out (Payout to E-Wallet)
  // ============================================================================

  /**
   * Create payout to e-wallet (GCash, Maya, etc)
   * Uses AES-128-CBC encryption with merchantId as IV and merchantKey as key
   */
  async createPayout(
    code: string,
    accountNumber: string,
    name: string,
    amount: number
  ): Promise<PayoutResponse> {
    if (amount < 1) {
      throw new Error('Minimum payout amount is ₱1');
    }

    return this.retryRequest(async () => {
      const session = await this.ensureAuthenticated();
      const config = getConfig();
      if (!config) {
        throw new Error('NexusPay not configured');
      }

      // Payload for encryption - per NexusPay docs, amount must be STRING
      const payloadToEncrypt = {
        code: code,
        account_number: accountNumber.replace(/\s/g, ''),
        name: name,
        amount: String(amount) // MUST be string per NexusPay docs
      };

      // Generate unique transaction ID for this payout
      const merchantPaymentTxId = `BTS${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      console.log(`[NexusPay] Creating payout to ${accountNumber}`);
      console.log(`[NexusPay] Payload (pre-encrypt):`, JSON.stringify(payloadToEncrypt));

      let encryptedData: string;
      try {
        encryptedData = encryptPayload(payloadToEncrypt, config);
      } catch (error: any) {
        throw new Error(`Encryption failed: ${error.message}`);
      }

      // Use encrypted payload in X-data header per NexusPay API v2 docs
      console.log(`[NexusPay] Sending request with Bearer token, X-data encrypted, X-code: ${code}`);

      const response = await fetch(`${config.baseUrl}/create_pay_out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Cookie': session.sessionCookie,
          'X-data': encryptedData,
          'X-code': code,
          'merchant_payment_transaction_id': merchantPaymentTxId,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`[NexusPay] Payout response status: ${response.status}`);

      const text = await response.text();
      console.log('[NexusPay] Payout response:', text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid response from payment gateway');
      }

      // Check for successful response with payoutlink (per NexusPay API v2 docs)
      if (data.status === 'successful' && data.payoutlink) {
        console.log(`[NexusPay] Payout link received: ${data.payoutlink}`);

        // Call the payoutlink to complete the payout
        console.log('[NexusPay] Calling payoutlink to process payout');
        const payoutResponse = await fetch(data.payoutlink, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'Cookie': session.sessionCookie,
            'Accept': 'application/json'
          }
        });

        console.log(`[NexusPay] Payoutlink response status: ${payoutResponse.status}`);
        const payoutText = await payoutResponse.text();
        console.log('[NexusPay] Payoutlink response:', payoutText);

        let payoutData;
        try {
          payoutData = JSON.parse(payoutText);
        } catch {
          console.error('[NexusPay] Invalid payoutlink response');
          payoutData = { status: 'pending' };
        }

        if (payoutData.status === 'success' && payoutData.data?.transaction_id) {
          console.log(`[NexusPay] Payout SUCCESS: ${payoutData.data.transaction_id}`);
          return {
            status: 'success',
            transactionId: payoutData.data.transaction_id,
            message: payoutData.message || 'Payout successful'
          };
        } else if (payoutData.status === 'error') {
          throw new Error(payoutData.message || 'Payout failed at gateway');
        }

        // Payout initiated but status unclear
        return {
          status: 'processing',
          transactionId: merchantPaymentTxId,
          message: 'Payout is being processed'
        };
      }

      // Legacy check for direct success response
      if (data.transactionId && (data.status === 'processing' || data.status === 'success' || data.status === 'successful')) {
        return {
          status: data.status,
          transactionId: data.transactionId,
          message: data.message
        };
      }

      throw new Error(data.message || 'Payout creation failed');
    });
  }

  /**
   * Check payout status
   */
  async getPayoutStatus(transactionId: string): Promise<{
    success: boolean;
    transactionId?: string;
    gateway?: string;
    message?: string;
  }> {
    const config = getConfig();
    if (!config) {
      throw new Error('NexusPay not configured');
    }

    console.log(`[NexusPay] Checking payout status for: ${transactionId}`);

    const response = await fetch(`${config.baseUrl}/payoutstatus/${transactionId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BTSDelivery/1.0'
      }
    });

    const text = await response.text();
    console.log('[NexusPay] Payout status response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid response from payment gateway');
    }

    return {
      success: data.status === 'success',
      transactionId: data.data?.transaction_id,
      gateway: data.data?.payout_gateway,
      message: data.message
    };
  }

  /**
   * Get transaction details (alias for getCashInStatus for backward compatibility)
   */
  async getTransactionDetails(transactionId: string): Promise<any> {
    return this.retryRequest(async () => {
      const session = await this.ensureAuthenticated();
      const config = getConfig();
      if (!config) {
        throw new Error('NexusPay not configured');
      }

      const response = await fetch(`${config.baseUrl}/cashin_transactions_status/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Cookie': session.sessionCookie,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get transaction details: ${response.statusText}`);
      }

      return await response.json();
    });
  }

  /**
   * Get account balance (for compatibility)
   */
  async getAccountBalance(): Promise<{ balance: number; currency: string }> {
    const result = await this.getMerchantBalance();
    return {
      balance: result.walletBalance || 0,
      currency: 'PHP',
    };
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  /**
   * Process batch payouts for riders/vendors
   */
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

      // Small delay between payouts to avoid rate limiting
      await this.sleep(500);
    }

    return results;
  }

  // ============================================================================
  // Account Info
  // ============================================================================

  /**
   * Get merchant wallet balance (admin only)
   */
  async getMerchantBalance(): Promise<{
    success: boolean;
    walletBalance?: number;
    walletBalanceFormatted?: string;
    message?: string;
  }> {
    const session = await this.ensureAuthenticated();
    const config = getConfig();
    if (!config) {
      throw new Error('NexusPay not configured');
    }

    const response = await fetch(`${config.baseUrl}/user/info`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,
        'Cookie': session.sessionCookie,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const balance = parseFloat(data.data.wallet_funds || '0');
      return {
        success: true,
        walletBalance: balance,
        walletBalanceFormatted: `₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
        message: 'Balance retrieved successfully'
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to retrieve balance'
    };
  }

  // ============================================================================
  // Webhook Handling
  // ============================================================================

  /**
   * Verify webhook signature (HMAC-SHA256)
   */
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
      console.error('[NexusPay] Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: WebhookPayload): {
    transactionId: string | null;
    status: string;
    amount: number;
    referenceNumber: string | null;
    isSuccessful: boolean;
  } {
    const txId = body.transactionId || body.transaction_id || null;
    const rawAmount = body.amount || body.total_amount;
    const txStatus = (body.transaction_status || body.status || '').toString().toLowerCase();
    const refNumber = (body.reference || body.reference_number || null) as string | null;

    let amount = 0;
    if (rawAmount !== undefined && rawAmount !== null) {
      amount = parseFloat(String(rawAmount));
      if (isNaN(amount) || amount <= 0) {
        amount = 0;
      }
    }

    const successStatuses = ['success', 'successful', 'completed', 'paid'];
    const isSuccessful = successStatuses.includes(txStatus) && !!txId && amount > 0;

    return {
      transactionId: txId,
      status: txStatus,
      amount,
      referenceNumber: refNumber,
      isSuccessful
    };
  }

  // ============================================================================
  // Payment Methods Info
  // ============================================================================

  /**
   * Get available payment methods with their details
   */
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
      METROBANK: 'Metrobank - Major commercial bank',
      PNB: 'Philippine National Bank',
      LANDBANK: 'Land Bank of the Philippines',
      SECURITY_BANK: 'Security Bank Corporation',
      SHOPEEPAY: 'ShopeePay - E-wallet for online shopping',
    };

    return descriptions[method] || `${method.replace(/_/g, ' ')} payment method`;
  }
}

// ============================================================================
// Payment Gateway Codes - Comprehensive Filipino Payment Methods
// ============================================================================

export const NEXUSPAY_CODES = {
  // E-wallets
  GCASH: '0093',
  MAYA: '0483',
  MAYA_BANK: '7031',
  GRABPAY: '7003',
  SHOPEEPAY: '7017',
  PAYMAYA: '0483', // Alternative code for Maya

  // Online Banking - Major Banks
  BPI: '0010',
  BDO: '0001',
  UNIONBANK: '0006',
  METROBANK: '0033',
  PNB: '0011',
  LANDBANK: '0035',
  DBP: '0016',
  RCBC: '0067',
  SECURITY_BANK: '0069',

  // Online Banking - Other Banks
  CHINABANK: '0034',
  EASTWEST: '0074',
  MAYBANK: '0072',
  PSBANK: '0108',

  // International
  UNIONPAY: '7014',
  ALIPAY: '7015',
  WECHAT: '7016',

  // Retail and OTC (Over-the-Counter)
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

// Provider codes for e-wallet payouts (commonly used for rider/vendor payouts)
export const PAYOUT_PROVIDER_CODES: Record<string, string> = {
  gcash: '0093',
  maya: '0483',
  mayabank: '7031',
  grabpay: '7003',
};

// ============================================================================
// Singleton Instance
// ============================================================================

export const nexusPayService = new NexusPayService();
