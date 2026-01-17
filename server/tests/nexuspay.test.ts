/**
 * NexusPay Integration Tests
 *
 * Tests the NexusPay payment gateway configuration and API integration.
 * Run with: npx tsx server/tests/nexuspay.test.ts
 */

import * as crypto from 'crypto';
import 'dotenv/config';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bold + colors.cyan);
  console.log('='.repeat(60));
}

function logResult(name: string, passed: boolean, details?: string) {
  const status = passed
    ? `${colors.green}✓ PASS${colors.reset}`
    : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`  ${status} ${name}`);
  if (details) {
    console.log(`       ${colors.yellow}${details}${colors.reset}`);
  }
}

// Test results tracking
const results: { name: string; passed: boolean; details?: string }[] = [];

function recordResult(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  logResult(name, passed, details);
}

// ============================================================================
// Test 1: Environment Configuration
// ============================================================================
async function testConfiguration() {
  logSection('Test 1: Environment Configuration');

  const requiredVars = [
    'NEXUSPAY_BASE_URL',
    'NEXUSPAY_USERNAME',
    'NEXUSPAY_PASSWORD',
    'NEXUSPAY_MERCHANT_ID',
    'NEXUSPAY_KEY',
  ];

  let allPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const present = !!value;
    if (!present) allPresent = false;

    // Mask sensitive values
    let displayValue = 'NOT SET';
    if (value) {
      if (varName.includes('PASSWORD') || varName.includes('KEY')) {
        displayValue = value.substring(0, 4) + '****' + value.substring(value.length - 2);
      } else {
        displayValue = value;
      }
    }

    recordResult(
      `${varName}`,
      present,
      present ? `Value: ${displayValue}` : 'Missing!'
    );
  }

  // Validate MERCHANT_ID length (must be 16 bytes for AES-128 IV)
  const merchantId = process.env.NEXUSPAY_MERCHANT_ID || '';
  const idLengthValid = merchantId.length === 16;
  recordResult(
    'MERCHANT_ID length (16 bytes for AES-128 IV)',
    idLengthValid,
    `Length: ${merchantId.length} bytes`
  );

  // Validate KEY length (must be 16 bytes for AES-128 key)
  const merchantKey = process.env.NEXUSPAY_KEY || '';
  const keyLengthValid = merchantKey.length === 16;
  recordResult(
    'NEXUSPAY_KEY length (16 bytes for AES-128 key)',
    keyLengthValid,
    `Length: ${merchantKey.length} bytes`
  );

  return allPresent && idLengthValid && keyLengthValid;
}

// ============================================================================
// Test 2: AES-128-CBC Encryption
// ============================================================================
async function testEncryption() {
  logSection('Test 2: AES-128-CBC Encryption');

  const merchantId = process.env.NEXUSPAY_MERCHANT_ID || '';
  const merchantKey = process.env.NEXUSPAY_KEY || '';

  if (merchantId.length !== 16 || merchantKey.length !== 16) {
    recordResult('Encryption test', false, 'Invalid key/IV length');
    return false;
  }

  try {
    // Test payload (similar to payout request)
    const testPayload = {
      code: '0093', // GCash
      account_number: '09123456789',
      name: 'Test User',
      amount: '100'
    };

    const keyBuffer = Buffer.from(merchantKey, 'utf8');
    const ivBuffer = Buffer.from(merchantId, 'utf8');

    const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
    let encrypted = cipher.update(JSON.stringify(testPayload), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    recordResult(
      'Encrypt payload with AES-128-CBC',
      encrypted.length > 0,
      `Encrypted length: ${encrypted.length} chars`
    );

    // Test decryption to verify
    const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const decryptedPayload = JSON.parse(decrypted);
    const decryptionValid = decryptedPayload.account_number === testPayload.account_number;

    recordResult(
      'Decrypt and verify payload',
      decryptionValid,
      decryptionValid ? 'Decryption successful' : 'Decryption mismatch'
    );

    return true;
  } catch (error: any) {
    recordResult('Encryption test', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 3: CSRF Token Endpoint
// ============================================================================
async function testCSRFEndpoint() {
  logSection('Test 3: CSRF Token Endpoint');

  const baseUrl = process.env.NEXUSPAY_BASE_URL || 'https://nexuspay.cloud/api';

  try {
    log(`  Fetching CSRF token from ${baseUrl}/csrf_token...`, colors.blue);

    const response = await fetch(`${baseUrl}/csrf_token`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BTSDelivery/1.0-Test'
      }
    });

    recordResult(
      'CSRF endpoint reachable',
      response.ok,
      `Status: ${response.status} ${response.statusText}`
    );

    // Check for PHPSESSID cookie
    const cookies = response.headers.get('set-cookie');
    const hasSessionCookie = cookies?.includes('PHPSESSID');
    recordResult(
      'PHPSESSID cookie received',
      !!hasSessionCookie,
      hasSessionCookie ? 'Session cookie present' : 'No session cookie'
    );

    // Parse CSRF token from response
    const text = await response.text();
    let csrfToken = '';
    try {
      const data = JSON.parse(text);
      csrfToken = data.csrf_token || data.csrfToken || data.token || '';
    } catch {
      // Response might not be JSON
    }

    recordResult(
      'CSRF token in response',
      !!csrfToken,
      csrfToken ? `Token: ${csrfToken.substring(0, 20)}...` : 'No token found'
    );

    return response.ok && hasSessionCookie && csrfToken;
  } catch (error: any) {
    recordResult('CSRF endpoint test', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 4: Authentication Flow
// ============================================================================
async function testAuthentication() {
  logSection('Test 4: Authentication Flow');

  const baseUrl = process.env.NEXUSPAY_BASE_URL || 'https://nexuspay.cloud/api';
  const username = process.env.NEXUSPAY_USERNAME || '';
  const password = process.env.NEXUSPAY_PASSWORD || '';

  if (!username || !password) {
    recordResult('Authentication test', false, 'Missing credentials');
    return false;
  }

  try {
    // Step 1: Get CSRF token and session cookie
    log('  Step 1: Getting CSRF session...', colors.blue);

    const csrfResponse = await fetch(`${baseUrl}/csrf_token`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BTSDelivery/1.0-Test'
      }
    });

    const cookies = csrfResponse.headers.get('set-cookie');
    const phpSessionMatch = cookies?.match(/PHPSESSID=([^;]+)/);
    const sessionCookie = phpSessionMatch ? `PHPSESSID=${phpSessionMatch[1]}` : '';

    const csrfText = await csrfResponse.text();
    let csrfToken = '';
    try {
      const data = JSON.parse(csrfText);
      csrfToken = data.csrf_token || data.csrfToken || data.token || '';
    } catch {}

    if (!sessionCookie || !csrfToken) {
      recordResult('Get CSRF session', false, 'Missing session cookie or CSRF token');
      return false;
    }

    recordResult('Get CSRF session', true, 'Session and token obtained');

    // Step 2: Login with credentials
    log('  Step 2: Authenticating with NexusPay...', colors.blue);

    const loginResponse = await fetch(`${baseUrl}/create/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'BTSDelivery/1.0-Test',
        'X-CSRF-TOKEN': csrfToken,
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ username, password })
    });

    const loginText = await loginResponse.text();
    log(`  Response status: ${loginResponse.status}`, colors.yellow);

    let loginData;
    try {
      loginData = JSON.parse(loginText);
    } catch {
      recordResult('Parse login response', false, 'Invalid JSON response');
      return false;
    }

    const authSuccess = loginData.status === 'success' && loginData.data?.token;
    recordResult(
      'Login authentication',
      authSuccess,
      authSuccess
        ? `Token received: ${loginData.data.token.substring(0, 20)}...`
        : `Error: ${loginData.message || 'Unknown error'}`
    );

    if (authSuccess) {
      // Step 3: Test authenticated endpoint (get user info)
      log('  Step 3: Testing authenticated endpoint...', colors.blue);

      const token = loginData.data.token;
      const allCookies = `${sessionCookie}; api_key=${token}`;

      const userInfoResponse = await fetch(`${baseUrl}/user/info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': allCookies,
          'Accept': 'application/json'
        }
      });

      const userInfoText = await userInfoResponse.text();
      let userInfoData;
      try {
        userInfoData = JSON.parse(userInfoText);
      } catch {}

      const userInfoSuccess = userInfoData?.status === 'success';
      recordResult(
        'Authenticated API call (user/info)',
        userInfoSuccess,
        userInfoSuccess
          ? `Username: ${userInfoData.data?.username || 'N/A'}`
          : 'Failed to get user info'
      );

      if (userInfoSuccess && userInfoData.data?.wallet_funds !== undefined) {
        const balance = parseFloat(userInfoData.data.wallet_funds || '0');
        log(`  ${colors.green}Wallet Balance: ₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}${colors.reset}`, colors.green);
      }
    }

    return authSuccess;
  } catch (error: any) {
    recordResult('Authentication test', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 5: Service Class Integration
// ============================================================================
async function testServiceClass() {
  logSection('Test 5: NexusPay Service Class');

  try {
    // Import the service
    const { nexusPayService, NEXUSPAY_CODES, PAYMENT_CATEGORIES } = await import('../services/nexuspay');

    // Test getStatus
    log('  Testing nexusPayService.getStatus()...', colors.blue);
    const status = await nexusPayService.getStatus();

    recordResult(
      'Service getStatus()',
      status.configured,
      `Configured: ${status.configured}, Authenticated: ${status.authenticated}`
    );

    // Test getAvailablePaymentMethods
    const methods = nexusPayService.getAvailablePaymentMethods();
    recordResult(
      'Service getAvailablePaymentMethods()',
      methods.length > 0,
      `${methods.length} payment methods available`
    );

    // Verify payment codes
    const hasGcash = NEXUSPAY_CODES.GCASH === '0093';
    const hasMaya = NEXUSPAY_CODES.MAYA === '0483';
    recordResult(
      'Payment codes configured',
      hasGcash && hasMaya,
      `GCash: ${NEXUSPAY_CODES.GCASH}, Maya: ${NEXUSPAY_CODES.MAYA}`
    );

    // Verify payment categories
    const hasEwallet = PAYMENT_CATEGORIES.EWALLET.includes('GCASH');
    const hasOnlineBanking = PAYMENT_CATEGORIES.ONLINE_BANKING.includes('BPI');
    recordResult(
      'Payment categories configured',
      hasEwallet && hasOnlineBanking,
      `E-wallets: ${PAYMENT_CATEGORIES.EWALLET.length}, Banks: ${PAYMENT_CATEGORIES.ONLINE_BANKING.length}`
    );

    return status.configured;
  } catch (error: any) {
    recordResult('Service class test', false, error.message);
    return false;
  }
}

// ============================================================================
// Test 6: Cash-In Request Format (Dry Run)
// ============================================================================
async function testCashInFormat() {
  logSection('Test 6: Cash-In Request Format (Dry Run)');

  try {
    const { nexusPayService } = await import('../services/nexuspay');

    // We won't actually create a payment, just verify the service can be called
    // with proper parameters

    const testParams = {
      amount: 100,
      webhookUrl: 'https://example.com/webhook',
      redirectUrl: 'https://example.com/redirect',
    };

    log('  Test parameters:', colors.blue);
    log(`    Amount: ₱${testParams.amount}`, colors.yellow);
    log(`    Webhook: ${testParams.webhookUrl}`, colors.yellow);
    log(`    Redirect: ${testParams.redirectUrl}`, colors.yellow);

    // Verify minimum amount validation
    try {
      await nexusPayService.createCashInPayment(50, testParams.webhookUrl, testParams.redirectUrl);
      recordResult('Minimum amount validation', false, 'Should reject amounts < 100');
    } catch (error: any) {
      const isValidationError = error.message.includes('Minimum amount');
      recordResult(
        'Minimum amount validation (₱100)',
        isValidationError,
        isValidationError ? 'Correctly rejects < ₱100' : error.message
      );
    }

    // Verify maximum amount validation
    try {
      await nexusPayService.createCashInPayment(600000, testParams.webhookUrl, testParams.redirectUrl);
      recordResult('Maximum amount validation', false, 'Should reject amounts > 500000');
    } catch (error: any) {
      const isValidationError = error.message.includes('maximum limit');
      recordResult(
        'Maximum amount validation (₱500,000)',
        isValidationError,
        isValidationError ? 'Correctly rejects > ₱500,000' : error.message
      );
    }

    recordResult('Cash-in format validation', true, 'All validations pass');
    return true;
  } catch (error: any) {
    recordResult('Cash-in format test', false, error.message);
    return false;
  }
}

// ============================================================================
// Run All Tests
// ============================================================================
async function runAllTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║         NexusPay Integration Test Suite                  ║', colors.cyan);
  log('║         BTS Delivery App                                 ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════╝', colors.cyan);

  const startTime = Date.now();

  // Run tests
  await testConfiguration();
  await testEncryption();
  await testCSRFEndpoint();
  await testAuthentication();
  await testServiceClass();
  await testCashInFormat();

  // Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logSection('Test Summary');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total Tests: ${total}`);
  log(`  Passed: ${passed}`, colors.green);
  if (failed > 0) {
    log(`  Failed: ${failed}`, colors.red);
  }
  console.log(`  Duration: ${duration}s\n`);

  if (failed === 0) {
    log('  ✓ All tests passed! NexusPay is correctly configured.', colors.green);
  } else {
    log('  ✗ Some tests failed. Please check the configuration.', colors.red);
    console.log('\n  Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      log(`    - ${r.name}: ${r.details || 'No details'}`, colors.red);
    });
  }

  console.log('\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
