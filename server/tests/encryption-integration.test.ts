import { describe, it, expect, beforeAll } from '@jest/globals';
import { SecurityUtils, EncryptionHelper } from '../utils/security';

describe('Encryption Integration Tests - Critical Security Verification', () => {
  let testEncryptionKey: string;
  
  beforeAll(() => {
    // Generate a test key for integration tests
    testEncryptionKey = SecurityUtils.generateEncryptionKey();
    
    // Set test environment variable
    process.env.ENCRYPTION_KEY = testEncryptionKey;
    process.env.PII_ENCRYPTION_KEY = testEncryptionKey;
  });

  describe('SecurityUtils Encryption/Decryption', () => {
    it('should encrypt and decrypt simple text data correctly', () => {
      const originalData = 'Hello, secure world!';
      
      const encrypted = SecurityUtils.encryptData(originalData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(originalData);
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:encrypted format
      
      const decrypted = SecurityUtils.decryptData(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should encrypt and decrypt PII data (GDPR compliance test)', () => {
      const piiData = JSON.stringify({
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        email: 'juan.delacruz@example.com',
        phone: '+639123456789',
        address: '123 Main St, Manila, Philippines',
        birthDate: '1990-01-15'
      });
      
      const encrypted = SecurityUtils.encryptData(piiData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('Juan');
      expect(encrypted).not.toContain('delacruz');
      expect(encrypted).not.toContain('Manila');
      
      const decrypted = SecurityUtils.decryptData(encrypted);
      const parsedData = JSON.parse(decrypted);
      expect(parsedData.firstName).toBe('Juan');
      expect(parsedData.email).toBe('juan.delacruz@example.com');
      expect(parsedData.phone).toBe('+639123456789');
    });

    it('should encrypt and decrypt payment information (PCI compliance test)', () => {
      const paymentData = JSON.stringify({
        cardNumber: '4111111111111111',
        cardHolder: 'JUAN DELA CRUZ',
        expiryMonth: '12',
        expiryYear: '2025',
        cvv: '123',
        amount: 1500.00,
        currency: 'PHP'
      });
      
      const encrypted = SecurityUtils.encryptData(paymentData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('4111111111111111');
      expect(encrypted).not.toContain('JUAN DELA CRUZ');
      expect(encrypted).not.toContain('123');
      
      const decrypted = SecurityUtils.decryptData(encrypted);
      const parsedData = JSON.parse(decrypted);
      expect(parsedData.cardNumber).toBe('4111111111111111');
      expect(parsedData.cardHolder).toBe('JUAN DELA CRUZ');
      expect(parsedData.amount).toBe(1500.00);
    });

    it('should handle large data payloads', () => {
      const largeData = 'A'.repeat(10000); // 10KB of data
      
      const encrypted = SecurityUtils.encryptData(largeData);
      expect(encrypted).toBeDefined();
      
      const decrypted = SecurityUtils.decryptData(encrypted);
      expect(decrypted).toBe(largeData);
      expect(decrypted.length).toBe(10000);
    });

    it('should produce different encrypted outputs for same data (IV uniqueness)', () => {
      const data = 'Test data for IV uniqueness';
      
      const encrypted1 = SecurityUtils.encryptData(data);
      const encrypted2 = SecurityUtils.encryptData(data);
      
      expect(encrypted1).not.toBe(encrypted2); // IVs should be different
      
      const decrypted1 = SecurityUtils.decryptData(encrypted1);
      const decrypted2 = SecurityUtils.decryptData(encrypted2);
      
      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });

    it('should fail gracefully with invalid encrypted data', () => {
      expect(() => {
        SecurityUtils.decryptData('invalid:data:format');
      }).toThrow();

      expect(() => {
        SecurityUtils.decryptData('not-enough-parts');
      }).toThrow('Invalid encrypted data format');
    });

    it('should work with custom encryption keys', () => {
      const customKey = SecurityUtils.generateEncryptionKey();
      const data = 'Test with custom key';
      
      const encrypted = SecurityUtils.encryptData(data, customKey);
      const decrypted = SecurityUtils.decryptData(encrypted, customKey);
      
      expect(decrypted).toBe(data);
    });

    it('should fail when decrypting with wrong key', () => {
      const key1 = SecurityUtils.generateEncryptionKey();
      const key2 = SecurityUtils.generateEncryptionKey();
      
      const data = 'Secret data';
      const encrypted = SecurityUtils.encryptData(data, key1);
      
      expect(() => {
        SecurityUtils.decryptData(encrypted, key2);
      }).toThrow();
    });
  });

  describe('EncryptionHelper PII Protection', () => {
    it('should encrypt and decrypt PII data correctly', () => {
      const piiData = 'SSN: 123-45-6789, DOB: 1985-03-15';
      
      const encrypted = EncryptionHelper.encryptPII(piiData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('123-45-6789');
      expect(encrypted).not.toContain('1985-03-15');
      
      const decrypted = EncryptionHelper.decryptPII(encrypted);
      expect(decrypted).toBe(piiData);
    });

    it('should work with JSON PII data structures', () => {
      const piiObject = {
        socialSecurityNumber: '123-45-6789',
        taxId: 'TIN-123456789',
        medicalRecord: 'Patient ID: MR123456',
        financialInfo: 'Account: 1234567890'
      };
      
      const piiString = JSON.stringify(piiObject);
      const encrypted = EncryptionHelper.encryptPII(piiString);
      const decrypted = EncryptionHelper.decryptPII(encrypted);
      
      const decryptedObject = JSON.parse(decrypted);
      expect(decryptedObject.socialSecurityNumber).toBe('123-45-6789');
      expect(decryptedObject.taxId).toBe('TIN-123456789');
    });
  });

  describe('Key Management and Validation', () => {
    it('should generate valid encryption keys', () => {
      const key = SecurityUtils.generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes as hex string
      expect(SecurityUtils.validateEncryptionKey(key)).toBe(true);
    });

    it('should validate encryption key formats correctly', () => {
      // Valid hex key (64 characters)
      expect(SecurityUtils.validateEncryptionKey('a'.repeat(64))).toBe(true);
      
      // Valid 32-byte string key
      expect(SecurityUtils.validateEncryptionKey('a'.repeat(32))).toBe(true);
      
      // Invalid keys
      expect(SecurityUtils.validateEncryptionKey('')).toBe(false);
      expect(SecurityUtils.validateEncryptionKey('short')).toBe(false);
      expect(SecurityUtils.validateEncryptionKey(null as any)).toBe(false);
      expect(SecurityUtils.validateEncryptionKey(undefined as any)).toBe(false);
    });

    it('should throw error when no encryption key is configured', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      
      expect(() => {
        SecurityUtils.encryptData('test data');
      }).toThrow('Encryption key not configured');
      
      expect(() => {
        SecurityUtils.decryptData('test:data:format');
      }).toThrow('Encryption key not configured');
      
      // Restore key
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Performance and Security Tests', () => {
    it('should encrypt and decrypt data within reasonable time limits', () => {
      const data = 'Performance test data';
      const startTime = Date.now();
      
      const encrypted = SecurityUtils.encryptData(data);
      const decrypted = SecurityUtils.decryptData(encrypted);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(decrypted).toBe(data);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle concurrent encryption/decryption operations', async () => {
      const data = 'Concurrent test data';
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve().then(() => {
          const encrypted = SecurityUtils.encryptData(`${data} ${i}`);
          return SecurityUtils.decryptData(encrypted);
        }));
      }
      
      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result).toBe(`${data} ${index}`);
      });
    });
  });

  describe('Real-world Data Protection Scenarios', () => {
    it('should protect customer order data', () => {
      const orderData = {
        orderId: 'ORD-123456',
        customerId: 'CUST-789012',
        customerName: 'Maria Santos',
        customerEmail: 'maria.santos@example.com',
        customerPhone: '+639987654321',
        deliveryAddress: '456 Rizal Street, Quezon City, Philippines',
        paymentMethod: 'credit_card',
        paymentDetails: {
          cardNumber: '5555555555554444',
          cardHolder: 'MARIA SANTOS',
          expiryMonth: '08',
          expiryYear: '2026'
        },
        totalAmount: 850.00,
        items: [
          { name: 'Chicken Adobo', price: 200.00, quantity: 2 },
          { name: 'Beef Sinigang', price: 250.00, quantity: 1 },
          { name: 'Rice', price: 50.00, quantity: 4 }
        ]
      };
      
      const orderString = JSON.stringify(orderData);
      const encrypted = SecurityUtils.encryptData(orderString);
      
      // Verify sensitive data is not visible in encrypted form
      expect(encrypted).not.toContain('Maria Santos');
      expect(encrypted).not.toContain('maria.santos@example.com');
      expect(encrypted).not.toContain('5555555555554444');
      expect(encrypted).not.toContain('Rizal Street');
      
      const decrypted = SecurityUtils.decryptData(encrypted);
      const decryptedOrder = JSON.parse(decrypted);
      
      expect(decryptedOrder.customerName).toBe('Maria Santos');
      expect(decryptedOrder.customerEmail).toBe('maria.santos@example.com');
      expect(decryptedOrder.paymentDetails.cardNumber).toBe('5555555555554444');
      expect(decryptedOrder.totalAmount).toBe(850.00);
    });

    it('should protect rider location and personal data', () => {
      const riderData = {
        riderId: 'RIDER-456789',
        name: 'Jose Rodriguez',
        email: 'jose.rodriguez@btsontheroad.com',
        phone: '+639123123123',
        licenseNumber: 'N01-12-345678',
        vehicleRegistration: 'ABC-1234',
        currentLocation: {
          latitude: 14.5995,
          longitude: 120.9842,
          address: '123 EDSA, Mandaluyong City'
        },
        bankAccount: {
          accountNumber: '1234567890123456',
          bankName: 'BDO Unibank',
          accountHolder: 'JOSE RODRIGUEZ'
        },
        emergencyContact: {
          name: 'Carmen Rodriguez',
          phone: '+639456456456',
          relationship: 'Spouse'
        }
      };
      
      const riderString = JSON.stringify(riderData);
      const encrypted = SecurityUtils.encryptData(riderString);
      
      // Verify PII is protected
      expect(encrypted).not.toContain('Jose Rodriguez');
      expect(encrypted).not.toContain('N01-12-345678');
      expect(encrypted).not.toContain('1234567890123456');
      expect(encrypted).not.toContain('14.5995');
      
      const decrypted = SecurityUtils.decryptData(encrypted);
      const decryptedRider = JSON.parse(decrypted);
      
      expect(decryptedRider.name).toBe('Jose Rodriguez');
      expect(decryptedRider.licenseNumber).toBe('N01-12-345678');
      expect(decryptedRider.currentLocation.latitude).toBe(14.5995);
      expect(decryptedRider.bankAccount.accountNumber).toBe('1234567890123456');
    });
  });
});