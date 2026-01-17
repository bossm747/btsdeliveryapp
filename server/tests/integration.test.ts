/**
 * BTS Delivery App - Integration Test Suite
 *
 * Verifies all external service configurations and integrations.
 * Run with: npx tsx server/tests/integration.test.ts
 */

import 'dotenv/config';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '─'.repeat(60));
  log(`  ${title}`, colors.bold + colors.cyan);
  console.log('─'.repeat(60));
}

function logResult(name: string, status: 'pass' | 'fail' | 'warn' | 'skip', details?: string) {
  const icons = {
    pass: `${colors.green}✓${colors.reset}`,
    fail: `${colors.red}✗${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    skip: `${colors.dim}○${colors.reset}`,
  };
  console.log(`  ${icons[status]} ${name}`);
  if (details) {
    console.log(`    ${colors.dim}${details}${colors.reset}`);
  }
}

interface TestResult {
  service: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
}

const results: TestResult[] = [];

// ============================================================================
// Test: Environment Variables
// ============================================================================
async function testEnvironment() {
  logSection('Environment Configuration');

  const envVars = {
    'DATABASE_URL': { required: true, sensitive: true },
    'JWT_SECRET': { required: true, sensitive: true },
    'NEXUSPAY_USERNAME': { required: false, sensitive: false },
    'NEXUSPAY_PASSWORD': { required: false, sensitive: true },
    'NEXUSPAY_MERCHANT_ID': { required: false, sensitive: false },
    'NEXUSPAY_KEY': { required: false, sensitive: true },
    'GOOGLE_MAPS_API_KEY': { required: false, sensitive: true },
    'GEMINI_API_KEY': { required: false, sensitive: true },
    'SENDGRID_API_KEY': { required: false, sensitive: true },
  };

  for (const [key, config] of Object.entries(envVars)) {
    const value = process.env[key];
    const hasValue = !!value;

    if (config.required && !hasValue) {
      logResult(key, 'fail', 'Required but not set');
      results.push({ service: 'Environment', status: 'fail', message: `${key} is required` });
    } else if (hasValue) {
      const display = config.sensitive
        ? `${value!.substring(0, 4)}****${value!.substring(value!.length - 2)}`
        : value;
      logResult(key, 'pass', display);
    } else {
      logResult(key, 'skip', 'Not configured (optional)');
    }
  }
}

// ============================================================================
// Test: NexusPay Integration
// ============================================================================
async function testNexusPay() {
  logSection('NexusPay Payment Gateway');

  const username = process.env.NEXUSPAY_USERNAME;
  const password = process.env.NEXUSPAY_PASSWORD;
  const merchantId = process.env.NEXUSPAY_MERCHANT_ID;
  const merchantKey = process.env.NEXUSPAY_KEY;

  if (!username || !password || !merchantId || !merchantKey) {
    logResult('NexusPay', 'skip', 'Not configured');
    results.push({ service: 'NexusPay', status: 'skip', message: 'Not configured' });
    return;
  }

  try {
    // Test CSRF endpoint
    const baseUrl = process.env.NEXUSPAY_BASE_URL || 'https://nexuspay.cloud/api';
    const csrfResponse = await fetch(`${baseUrl}/csrf_token`);

    if (!csrfResponse.ok) {
      logResult('CSRF Endpoint', 'fail', `Status: ${csrfResponse.status}`);
      results.push({ service: 'NexusPay', status: 'fail', message: 'CSRF endpoint failed' });
      return;
    }

    logResult('CSRF Endpoint', 'pass', 'Reachable');

    // Test authentication
    const cookies = csrfResponse.headers.get('set-cookie');
    const phpSessionMatch = cookies?.match(/PHPSESSID=([^;]+)/);
    const sessionCookie = phpSessionMatch ? `PHPSESSID=${phpSessionMatch[1]}` : '';

    const csrfText = await csrfResponse.text();
    const csrfData = JSON.parse(csrfText);
    const csrfToken = csrfData.csrf_token || '';

    const loginResponse = await fetch(`${baseUrl}/create/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ username, password })
    });

    const loginData = await loginResponse.json();

    if (loginData.status === 'success' && loginData.data?.token) {
      logResult('Authentication', 'pass', `User: ${username}`);

      // Get balance
      const token = loginData.data.token;
      const allCookies = `${sessionCookie}; api_key=${token}`;

      const balanceResponse = await fetch(`${baseUrl}/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': allCookies
        }
      });

      const balanceData = await balanceResponse.json();
      if (balanceData.status === 'success') {
        const balance = parseFloat(balanceData.data?.wallet_funds || '0');
        logResult('Wallet Balance', 'pass', `₱${balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
      }

      results.push({ service: 'NexusPay', status: 'pass', message: 'Fully operational' });
    } else {
      logResult('Authentication', 'fail', loginData.message || 'Login failed');
      results.push({ service: 'NexusPay', status: 'fail', message: 'Authentication failed' });
    }
  } catch (error: any) {
    logResult('NexusPay', 'fail', error.message);
    results.push({ service: 'NexusPay', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Google Maps Integration
// ============================================================================
async function testGoogleMaps() {
  logSection('Google Maps API');

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    logResult('Google Maps', 'skip', 'Not configured - using mock data');
    results.push({ service: 'Google Maps', status: 'skip', message: 'Using mock data for Batangas' });
    return;
  }

  try {
    // Test Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Batangas+City&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status === 'OK') {
      logResult('Geocoding API', 'pass', 'Working');
      results.push({ service: 'Google Maps', status: 'pass', message: 'Fully operational' });
    } else if (geocodeData.status === 'REQUEST_DENIED') {
      if (geocodeData.error_message?.includes('billing')) {
        logResult('Geocoding API', 'warn', 'Billing not enabled - using mock data');
        results.push({ service: 'Google Maps', status: 'warn', message: 'Needs billing enabled' });
      } else if (geocodeData.error_message?.includes('not activated')) {
        logResult('Geocoding API', 'warn', 'API not activated - using mock data');
        results.push({ service: 'Google Maps', status: 'warn', message: 'API needs activation' });
      } else {
        logResult('Geocoding API', 'warn', geocodeData.error_message || 'Access denied');
        results.push({ service: 'Google Maps', status: 'warn', message: 'Access denied' });
      }
    } else {
      logResult('Geocoding API', 'fail', `Status: ${geocodeData.status}`);
      results.push({ service: 'Google Maps', status: 'fail', message: geocodeData.status });
    }

    // Test mock data fallback
    const { mapsService } = await import('../integrations/maps');
    const mockResult = await mapsService.geocodeAddress('Batangas City');
    if (mockResult) {
      logResult('Mock Data Fallback', 'pass', `${mockResult.lat.toFixed(4)}, ${mockResult.lng.toFixed(4)}`);
    }
  } catch (error: any) {
    logResult('Google Maps', 'fail', error.message);
    results.push({ service: 'Google Maps', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Maps Service (Mock Data)
// ============================================================================
async function testMapsService() {
  logSection('Maps Service (Batangas Coverage)');

  try {
    const { mapsService } = await import('../integrations/maps');

    // Test geocoding for various Batangas locations
    const locations = ['Batangas City', 'Lipa', 'Tanauan', 'Nasugbu', 'Lemery'];

    for (const location of locations) {
      const result = await mapsService.geocodeAddress(location);
      if (result) {
        logResult(location, 'pass', `${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
      } else {
        logResult(location, 'warn', 'Not found');
      }
    }

    // Test route calculation
    const origin = { lat: 13.7565, lng: 121.0583 }; // Batangas City
    const dest = { lat: 13.9411, lng: 121.1625 };   // Lipa City
    const route = await mapsService.calculateRoute(origin, dest);

    if (route) {
      const distKm = (route.distance / 1000).toFixed(1);
      const timeMin = Math.round(route.duration / 60);
      logResult('Route Calculation', 'pass', `${distKm} km, ~${timeMin} min`);
    }

    // Test delivery fee calculation
    const fee = mapsService.calculateDeliveryFee(10000); // 10km
    logResult('Delivery Fee (10km)', 'pass', `₱${fee}`);

    results.push({ service: 'Maps Service', status: 'pass', message: 'Mock data working' });
  } catch (error: any) {
    logResult('Maps Service', 'fail', error.message);
    results.push({ service: 'Maps Service', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Test: Encryption (AES-128-CBC)
// ============================================================================
async function testEncryption() {
  logSection('Encryption (AES-128-CBC)');

  const merchantId = process.env.NEXUSPAY_MERCHANT_ID;
  const merchantKey = process.env.NEXUSPAY_KEY;

  if (!merchantId || !merchantKey) {
    logResult('Encryption', 'skip', 'NexusPay not configured');
    return;
  }

  if (merchantId.length !== 16 || merchantKey.length !== 16) {
    logResult('Key Length', 'fail', 'Must be 16 bytes for AES-128');
    results.push({ service: 'Encryption', status: 'fail', message: 'Invalid key length' });
    return;
  }

  try {
    const crypto = await import('crypto');

    const testPayload = { test: 'data', amount: '100' };
    const keyBuffer = Buffer.from(merchantKey, 'utf8');
    const ivBuffer = Buffer.from(merchantId, 'utf8');

    const cipher = crypto.createCipheriv('aes-128-cbc', keyBuffer, ivBuffer);
    let encrypted = cipher.update(JSON.stringify(testPayload), 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const decryptedPayload = JSON.parse(decrypted);

    if (decryptedPayload.test === testPayload.test) {
      logResult('Encrypt/Decrypt', 'pass', 'Working correctly');
      results.push({ service: 'Encryption', status: 'pass', message: 'AES-128-CBC working' });
    } else {
      logResult('Encrypt/Decrypt', 'fail', 'Data mismatch');
      results.push({ service: 'Encryption', status: 'fail', message: 'Data mismatch' });
    }
  } catch (error: any) {
    logResult('Encryption', 'fail', error.message);
    results.push({ service: 'Encryption', status: 'fail', message: error.message });
  }
}

// ============================================================================
// Summary
// ============================================================================
function printSummary() {
  console.log('\n' + '═'.repeat(60));
  log('  INTEGRATION TEST SUMMARY', colors.bold + colors.cyan);
  console.log('═'.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const skipped = results.filter(r => r.status === 'skip').length;

  // Service status table
  console.log('  Service Status:');
  console.log('  ' + '─'.repeat(50));

  for (const result of results) {
    const statusColors = {
      pass: colors.green,
      fail: colors.red,
      warn: colors.yellow,
      skip: colors.dim,
    };
    const statusText = {
      pass: 'READY',
      fail: 'FAILED',
      warn: 'PARTIAL',
      skip: 'SKIPPED',
    };

    console.log(`  ${result.service.padEnd(20)} ${statusColors[result.status]}${statusText[result.status].padEnd(10)}${colors.reset} ${result.message}`);
  }

  console.log('  ' + '─'.repeat(50));
  console.log(`\n  ${colors.green}Passed: ${passed}${colors.reset}  ${colors.yellow}Warnings: ${warned}${colors.reset}  ${colors.red}Failed: ${failed}${colors.reset}  ${colors.dim}Skipped: ${skipped}${colors.reset}`);

  // Overall status
  if (failed === 0) {
    log('\n  ✓ All critical services are configured correctly!', colors.green);
  } else {
    log('\n  ✗ Some services need attention.', colors.red);
  }

  // Recommendations
  if (warned > 0 || skipped > 0) {
    console.log('\n  Recommendations:');

    const googleMapsResult = results.find(r => r.service === 'Google Maps');
    if (googleMapsResult?.status === 'warn') {
      log('  • Enable billing on Google Cloud to use Google Maps APIs', colors.yellow);
      log('    Visit: https://console.cloud.google.com/billing', colors.blue);
    }

    if (!process.env.GEMINI_API_KEY) {
      log('  • Add GEMINI_API_KEY to enable AI features', colors.yellow);
    }
  }

  console.log('\n');
}

// ============================================================================
// Run All Tests
// ============================================================================
async function runAllTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       BTS Delivery App - Integration Tests               ║', colors.cyan);
  log('║       Verifying External Service Configurations          ║', colors.cyan);
  log('╚══════════════════════════════════════════════════════════╝', colors.cyan);

  await testEnvironment();
  await testNexusPay();
  await testGoogleMaps();
  await testMapsService();
  await testEncryption();

  printSummary();

  // Exit with appropriate code
  const failed = results.filter(r => r.status === 'fail').length;
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
