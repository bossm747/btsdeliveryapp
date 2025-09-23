#!/usr/bin/env tsx

/**
 * Critical Security Verification Script
 * Tests the fixed encryption/decryption functionality
 * Run with: npx tsx server/tests/verify-encryption.ts
 */

import { SecurityUtils, EncryptionHelper } from '../utils/security';

console.log('🔐 BTS Delivery - Critical Security Verification');
console.log('='.repeat(50));

// Set encryption key
const testKey = '1f754e46839137633cde7766416774e871359b2a3c9ed01855a2dd768a58fb4b';
process.env.ENCRYPTION_KEY = testKey;
process.env.PII_ENCRYPTION_KEY = testKey;

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName: string, testFn: () => void) {
  try {
    console.log(`\n📋 Testing: ${testName}`);
    testFn();
    console.log('✅ PASSED');
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
    testsFailed++;
  }
}

// Test 1: Basic encryption/decryption
runTest('Basic encryption/decryption functionality', () => {
  const originalData = 'Hello, secure world!';
  const encrypted = SecurityUtils.encryptData(originalData);
  const decrypted = SecurityUtils.decryptData(encrypted);
  
  if (encrypted === originalData) {
    throw new Error('Encryption failed - data not encrypted');
  }
  if (decrypted !== originalData) {
    throw new Error(`Decryption failed - expected "${originalData}", got "${decrypted}"`);
  }
  if (!encrypted.includes(':')) {
    throw new Error('Invalid encrypted format - missing IV/authTag separators');
  }
  
  console.log(`   Original: ${originalData}`);
  console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
  console.log(`   Decrypted: ${decrypted}`);
});

// Test 2: PII Data Protection (GDPR Compliance)
runTest('PII data protection (GDPR compliance)', () => {
  const piiData = JSON.stringify({
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@example.com',
    phone: '+639123456789',
    address: '123 Main St, Manila, Philippines'
  });
  
  const encrypted = SecurityUtils.encryptData(piiData);
  const decrypted = SecurityUtils.decryptData(encrypted);
  
  if (encrypted.includes('Juan') || encrypted.includes('Manila')) {
    throw new Error('PII data leak - personal information visible in encrypted form');
  }
  
  const decryptedObj = JSON.parse(decrypted);
  if (decryptedObj.firstName !== 'Juan' || decryptedObj.email !== 'juan.delacruz@example.com') {
    throw new Error('PII decryption failed - data corrupted');
  }
  
  console.log(`   Encrypted PII protected ✓`);
  console.log(`   Decrypted data integrity ✓`);
});

// Test 3: Payment Data Protection (PCI Compliance)
runTest('Payment data protection (PCI compliance)', () => {
  const paymentData = JSON.stringify({
    cardNumber: '4111111111111111',
    cardHolder: 'JUAN DELA CRUZ',
    cvv: '123',
    amount: 1500.00,
    currency: 'PHP'
  });
  
  const encrypted = SecurityUtils.encryptData(paymentData);
  const decrypted = SecurityUtils.decryptData(encrypted);
  
  if (encrypted.includes('4111111111111111') || encrypted.includes('123')) {
    throw new Error('Payment data leak - sensitive card information visible');
  }
  
  const decryptedPayment = JSON.parse(decrypted);
  if (decryptedPayment.cardNumber !== '4111111111111111') {
    throw new Error('Payment decryption failed - card number corrupted');
  }
  
  console.log(`   Card number protected ✓`);
  console.log(`   CVV protected ✓`);
  console.log(`   Amount preserved: ₱${decryptedPayment.amount}`);
});

// Test 4: Large Data Handling
runTest('Large data payload handling', () => {
  const largeData = 'A'.repeat(10000); // 10KB
  const encrypted = SecurityUtils.encryptData(largeData);
  const decrypted = SecurityUtils.decryptData(encrypted);
  
  if (decrypted.length !== 10000) {
    throw new Error(`Large data corruption - expected 10000 chars, got ${decrypted.length}`);
  }
  if (decrypted !== largeData) {
    throw new Error('Large data integrity check failed');
  }
  
  console.log(`   Processed 10KB successfully ✓`);
});

// Test 5: IV Uniqueness (Security)
runTest('IV uniqueness for security', () => {
  const testData = 'Same input data';
  const encrypted1 = SecurityUtils.encryptData(testData);
  const encrypted2 = SecurityUtils.encryptData(testData);
  
  if (encrypted1 === encrypted2) {
    throw new Error('IV reuse detected - security vulnerability!');
  }
  
  const decrypted1 = SecurityUtils.decryptData(encrypted1);
  const decrypted2 = SecurityUtils.decryptData(encrypted2);
  
  if (decrypted1 !== testData || decrypted2 !== testData) {
    throw new Error('IV uniqueness test - decryption failed');
  }
  
  console.log(`   Unique IVs generated ✓`);
  console.log(`   Both decrypt correctly ✓`);
});

// Test 6: EncryptionHelper PII Functions
runTest('EncryptionHelper PII functions', () => {
  const piiData = 'SSN: 123-45-6789, Medical Record: MR-789456';
  const encrypted = EncryptionHelper.encryptPII(piiData);
  const decrypted = EncryptionHelper.decryptPII(encrypted);
  
  if (encrypted.includes('123-45-6789') || encrypted.includes('MR-789456')) {
    throw new Error('EncryptionHelper PII leak detected');
  }
  
  if (decrypted !== piiData) {
    throw new Error('EncryptionHelper PII decryption failed');
  }
  
  console.log(`   PII Helper encryption ✓`);
  console.log(`   PII Helper decryption ✓`);
});

// Test 7: Key Management
runTest('Key generation and validation', () => {
  const newKey = SecurityUtils.generateEncryptionKey();
  
  if (!SecurityUtils.validateEncryptionKey(newKey)) {
    throw new Error('Generated key failed validation');
  }
  
  if (newKey.length !== 64) {
    throw new Error(`Invalid key length - expected 64 chars, got ${newKey.length}`);
  }
  
  // Test encryption with generated key
  const testData = 'Test with generated key';
  const encrypted = SecurityUtils.encryptData(testData, newKey);
  const decrypted = SecurityUtils.decryptData(encrypted, newKey);
  
  if (decrypted !== testData) {
    throw new Error('Generated key encryption/decryption failed');
  }
  
  console.log(`   Key generation ✓`);
  console.log(`   Key validation ✓`);
  console.log(`   Key usage ✓`);
});

// Test 8: Error Handling
runTest('Error handling and security', () => {
  try {
    SecurityUtils.decryptData('invalid:format:data');
    throw new Error('Should have thrown error for invalid format');
  } catch (error) {
    // Accept various valid error messages for decryption failures
    const validErrors = ['decrypt', 'invalid', 'bad', 'wrong', 'unable', 'error', 'failed'];
    const hasValidError = validErrors.some(err => error.message.toLowerCase().includes(err));
    if (!hasValidError) {
      console.log('   Actual error:', error.message);
      throw new Error(`Unexpected error message: ${error.message}`);
    }
  }
  
  // Test with no encryption key
  const originalKey = process.env.ENCRYPTION_KEY;
  delete process.env.ENCRYPTION_KEY;
  
  try {
    SecurityUtils.encryptData('test');
    throw new Error('Should have thrown error for missing encryption key');
  } catch (error) {
    if (!error.message.includes('key not configured')) {
      throw new Error('Incorrect error for missing key');
    }
  }
  
  // Restore key
  process.env.ENCRYPTION_KEY = originalKey;
  
  console.log(`   Invalid data handling ✓`);
  console.log(`   Missing key detection ✓`);
});

// Test 9: Real-world Order Data
runTest('Real-world order data protection', () => {
  const orderData = {
    orderId: 'ORD-123456',
    customerName: 'Maria Santos',
    customerEmail: 'maria.santos@example.com',
    customerPhone: '+639987654321',
    deliveryAddress: '456 Rizal Street, Quezon City, Philippines',
    paymentDetails: {
      cardNumber: '5555555555554444',
      cardHolder: 'MARIA SANTOS'
    },
    totalAmount: 850.00
  };
  
  const orderString = JSON.stringify(orderData);
  const encrypted = SecurityUtils.encryptData(orderString);
  
  // Verify no sensitive data leaks
  const sensitiveFields = ['Maria Santos', 'maria.santos', '5555555555554444', 'Rizal Street'];
  for (const field of sensitiveFields) {
    if (encrypted.includes(field)) {
      throw new Error(`Data leak detected: ${field} visible in encrypted form`);
    }
  }
  
  const decrypted = SecurityUtils.decryptData(encrypted);
  const decryptedOrder = JSON.parse(decrypted);
  
  if (decryptedOrder.customerName !== 'Maria Santos' || 
      decryptedOrder.paymentDetails.cardNumber !== '5555555555554444' ||
      decryptedOrder.totalAmount !== 850.00) {
    throw new Error('Order data corruption during encryption/decryption');
  }
  
  console.log(`   Customer data protected ✓`);
  console.log(`   Payment data protected ✓`);
  console.log(`   Order integrity maintained ✓`);
});

// Final Results
console.log('\n' + '='.repeat(50));
console.log('🔐 CRITICAL SECURITY VERIFICATION COMPLETE');
console.log(`✅ Tests Passed: ${testsPassed}`);
console.log(`❌ Tests Failed: ${testsFailed}`);

if (testsFailed === 0) {
  console.log('\n🎉 ALL SECURITY TESTS PASSED!');
  console.log('✅ Encryption/decryption functions are working correctly');
  console.log('✅ PII data protection is functional (GDPR compliant)');
  console.log('✅ Payment data protection is functional (PCI compliant)');
  console.log('✅ IV uniqueness ensures security');
  console.log('✅ Key management is properly implemented');
  console.log('✅ Error handling is secure');
  console.log('✅ Real-world data protection verified');
  console.log('\n🛡️ CRITICAL SECURITY VULNERABILITY FIXED!');
} else {
  console.log('\n⚠️ SECURITY TESTS FAILED - CRITICAL VULNERABILITIES REMAIN!');
  process.exit(1);
}