#!/usr/bin/env tsx

/**
 * Security Utilities Regression Test
 * Ensures all security functions work correctly after encryption fixes
 */

import { SecurityUtils } from '../utils/security';

console.log('🛡️ BTS Delivery - Security Utilities Regression Test');
console.log('='.repeat(55));

// Set up environment
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.ENCRYPTION_KEY = '1f754e46839137633cde7766416774e871359b2a3c9ed01855a2dd768a58fb4b';

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName: string, testFn: () => void | Promise<void>) {
  return new Promise<void>(async (resolve) => {
    try {
      console.log(`\n📋 Testing: ${testName}`);
      await testFn();
      console.log('✅ PASSED');
      testsPassed++;
      resolve();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ FAILED: ${message}`);
      testsFailed++;
      resolve();
    }
  });
}

async function runAllTests() {
  // Test 1: Token Generation
  await runTest('Secure token generation', () => {
    const token = SecurityUtils.generateSecureToken();
    if (!token || token.length !== 64) { // 32 bytes as hex
      throw new Error(`Invalid token length: expected 64, got ${token.length}`);
    }
    
    const token16 = SecurityUtils.generateSecureToken(16);
    if (token16.length !== 32) { // 16 bytes as hex
      throw new Error('Custom length token generation failed');
    }
    
    console.log(`   Generated tokens of correct lengths ✓`);
  });

  // Test 2: Secure Number Generation
  await runTest('Secure number generation', () => {
    const num = SecurityUtils.generateSecureNumber();
    if (num < 100000 || num > 999999) {
      throw new Error(`Number out of range: ${num}`);
    }
    
    const customNum = SecurityUtils.generateSecureNumber(1, 10);
    if (customNum < 1 || customNum > 10) {
      throw new Error(`Custom range number failed: ${customNum}`);
    }
    
    console.log(`   Generated numbers within ranges ✓`);
  });

  // Test 3: Password Hashing
  await runTest('Password hashing and verification', async () => {
    const password = 'TestPassword123!';
    const hash = await SecurityUtils.hashPassword(password);
    
    if (!hash || hash.length < 50) {
      throw new Error('Password hash too short');
    }
    
    const isValid = await SecurityUtils.verifyPassword(password, hash);
    if (!isValid) {
      throw new Error('Password verification failed');
    }
    
    const isInvalid = await SecurityUtils.verifyPassword('WrongPassword', hash);
    if (isInvalid) {
      throw new Error('Password verification should have failed');
    }
    
    console.log(`   Password hashing ✓`);
    console.log(`   Password verification ✓`);
  });

  // Test 4: JWT Generation and Verification
  await runTest('JWT token management', () => {
    const payload = { userId: 123, role: 'customer' };
    
    const token = SecurityUtils.generateJWT(payload);
    if (!token || typeof token !== 'string') {
      throw new Error('JWT generation failed');
    }
    
    const decoded = SecurityUtils.verifyJWT(token);
    if (!decoded || decoded.userId !== 123 || decoded.role !== 'customer') {
      throw new Error('JWT verification failed');
    }
    
    console.log(`   JWT generation ✓`);
    console.log(`   JWT verification ✓`);
  });

  // Test 5: Data Hashing
  await runTest('Data hashing (one-way)', () => {
    const data = 'sensitive data to hash';
    const hash = SecurityUtils.hashData(data);
    
    if (!hash || hash.length !== 64) { // SHA256 hex output
      throw new Error('Data hashing failed');
    }
    
    // Same data should produce same hash with same salt
    const salt = 'test-salt';
    const hash1 = SecurityUtils.hashData(data, salt);
    const hash2 = SecurityUtils.hashData(data, salt);
    
    if (hash1 !== hash2) {
      throw new Error('Consistent hashing failed');
    }
    
    console.log(`   Data hashing ✓`);
    console.log(`   Consistent salt hashing ✓`);
  });

  // Test 6: HMAC Functions
  await runTest('HMAC signature generation and verification', () => {
    const data = 'data to sign';
    const secret = 'hmac-secret-key';
    
    const signature = SecurityUtils.generateHMAC(data, secret);
    if (!signature || signature.length !== 64) {
      throw new Error('HMAC generation failed');
    }
    
    const isValid = SecurityUtils.verifyHMAC(data, signature, secret);
    if (!isValid) {
      throw new Error('HMAC verification failed');
    }
    
    const isInvalid = SecurityUtils.verifyHMAC('tampered data', signature, secret);
    if (isInvalid) {
      throw new Error('HMAC should have failed for tampered data');
    }
    
    console.log(`   HMAC generation ✓`);
    console.log(`   HMAC verification ✓`);
  });

  // Test 7: Data Masking
  await runTest('Sensitive data masking', () => {
    const sensitiveData = {
      password: 'secretpassword123',
      token: 'bearer-token-123456',
      creditCard: '4111111111111111',
      normalField: 'normal data'
    };
    
    const masked = SecurityUtils.maskSensitiveData(sensitiveData);
    
    if (masked.password === 'secretpassword123') {
      throw new Error('Password not masked');
    }
    if (!masked.password.includes('123')) {
      throw new Error('Password masking incorrect');
    }
    if (masked.normalField !== 'normal data') {
      throw new Error('Normal field should not be masked');
    }
    
    console.log(`   Sensitive fields masked ✓`);
    console.log(`   Normal fields preserved ✓`);
  });

  // Test 8: Credit Card Masking
  await runTest('Credit card masking (PCI compliance)', () => {
    const cardNumber = '4111111111111111';
    const masked = SecurityUtils.maskCreditCard(cardNumber);
    
    if (!masked.endsWith('1111')) {
      throw new Error('Card masking should preserve last 4 digits');
    }
    if (masked.includes('41111111')) {
      throw new Error('Card masking should hide first digits');
    }
    
    const invalidCard = SecurityUtils.maskCreditCard('123');
    if (invalidCard !== '[INVALID]') {
      throw new Error('Invalid card handling failed');
    }
    
    console.log(`   Card number masking ✓`);
    console.log(`   Invalid card handling ✓`);
  });

  // Test 9: Session Management
  await runTest('Session ID generation', () => {
    const sessionId = SecurityUtils.generateSessionId();
    
    if (!sessionId || sessionId.length !== 64) {
      throw new Error('Session ID generation failed');
    }
    
    const sessionId2 = SecurityUtils.generateSessionId();
    if (sessionId === sessionId2) {
      throw new Error('Session IDs should be unique');
    }
    
    console.log(`   Session ID generation ✓`);
    console.log(`   Session ID uniqueness ✓`);
  });

  // Test 10: API Key Management
  await runTest('API key generation and validation', () => {
    const apiKey = SecurityUtils.generateApiKey();
    
    if (!apiKey.startsWith('bts_')) {
      throw new Error('API key prefix missing');
    }
    
    const isValid = SecurityUtils.verifyApiKey(apiKey);
    if (!isValid) {
      throw new Error('Generated API key failed validation');
    }
    
    const isValidFormat = SecurityUtils.isValidApiKey(apiKey.split('_')[1]);
    if (!isValidFormat) {
      throw new Error('API key format validation failed');
    }
    
    console.log(`   API key generation ✓`);
    console.log(`   API key validation ✓`);
  });

  // Test 11: Security Headers
  await runTest('Security headers generation', () => {
    const headers = SecurityUtils.generateSecurityHeaders();
    
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }
    
    if (!headers['Content-Security-Policy'].includes("default-src 'self'")) {
      throw new Error('CSP header incorrect');
    }
    
    console.log(`   All security headers present ✓`);
    console.log(`   CSP configuration correct ✓`);
  });

  // Test 12: GDPR Data Anonymization
  await runTest('GDPR data anonymization', () => {
    const personalData = {
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      address: '123 Main St',
      businessData: 'not personal'
    };
    
    const anonymized = SecurityUtils.anonymizePersonalData(personalData);
    
    if (anonymized.email !== '[ANONYMIZED]') {
      throw new Error('Email not anonymized');
    }
    if (anonymized.firstName !== '[ANONYMIZED]') {
      throw new Error('First name not anonymized');
    }
    if (anonymized.businessData !== 'not personal') {
      throw new Error('Non-personal data should be preserved');
    }
    
    console.log(`   Personal data anonymized ✓`);
    console.log(`   Business data preserved ✓`);
  });

  // Test 13: Suspicious Activity Detection
  await runTest('Suspicious activity detection', () => {
    const cleanRequest = { data: 'normal request data' };
    const cleanResult = SecurityUtils.detectSuspiciousActivity(cleanRequest);
    
    if (cleanResult.isSuspicious) {
      throw new Error('Clean request flagged as suspicious');
    }
    
    const suspiciousRequest = { data: "'; DROP TABLE users; --" };
    const suspiciousResult = SecurityUtils.detectSuspiciousActivity(suspiciousRequest);
    
    if (!suspiciousResult.isSuspicious) {
      throw new Error('SQL injection not detected');
    }
    
    console.log(`   Clean requests pass ✓`);
    console.log(`   Suspicious patterns detected ✓`);
  });

  // Final Results
  console.log('\n' + '='.repeat(55));
  console.log('🛡️ SECURITY UTILITIES REGRESSION TEST COMPLETE');
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);

  if (testsFailed === 0) {
    console.log('\n🎉 ALL SECURITY UTILITIES WORKING CORRECTLY!');
    console.log('✅ No regressions detected after encryption fixes');
    console.log('✅ All authentication functions working');
    console.log('✅ All data protection functions working');
    console.log('✅ All security validation functions working');
    console.log('✅ All compliance features working');
    console.log('\n🛡️ SECURITY SYSTEM FULLY OPERATIONAL!');
  } else {
    console.log('\n⚠️ SOME SECURITY UTILITIES HAVE ISSUES!');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(console.error);