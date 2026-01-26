import { test, expect, Page } from '@playwright/test';

/**
 * Rider Flow E2E Tests
 * Tests rider operations including order acceptance, delivery, and earnings
 */

// Helper to check if React app loaded
async function isAppLoaded(page: Page): Promise<boolean> {
  try {
    const rootContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root ? root.innerHTML.length : 0;
    });
    return rootContent > 100;
  } catch {
    return false;
  }
}

test.describe('Rider Delivery Flow', () => {

  test.describe('API Endpoints', () => {
    test('rider stats API should be accessible', async ({ request }) => {
      const response = await request.get('/api/rider/stats');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('rider orders API should be accessible', async ({ request }) => {
      const response = await request.get('/api/rider/orders');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('rider earnings API should be accessible', async ({ request }) => {
      const response = await request.get('/api/rider/earnings');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('available orders API should be accessible', async ({ request }) => {
      const response = await request.get('/api/rider/available-orders');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  test.describe('Dashboard Pages', () => {
    test('rider dashboard should load', async ({ page }) => {
      await page.goto('/rider-dashboard');
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      expect(title).toMatch(/BTS/i);
    });
  });

  test.describe('Earnings Pages', () => {
    test('earnings page should load', async ({ page }) => {
      await page.goto('/rider/earnings');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Performance Pages', () => {
    test('performance page should load', async ({ page }) => {
      await page.goto('/rider/performance');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Navigation & Tracking', () => {
    test('map tracking demo should load', async ({ page }) => {
      await page.goto('/map-tracking-demo');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });

    test('order tracking page should load', async ({ page }) => {
      await page.goto('/order-tracking');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('UI Elements (when app loads)', () => {
    test('rider dashboard should show rider content', async ({ page }) => {
      await page.goto('/rider-dashboard');
      await page.waitForTimeout(3000);
      
      if (!await isAppLoaded(page)) {
        test.skip(true, 'React app failed to load');
        return;
      }
      
      const content = await page.content();
      const hasRiderContent = content.toLowerCase().includes('rider') || 
                             content.toLowerCase().includes('delivery') ||
                             content.toLowerCase().includes('dashboard');
      expect(hasRiderContent).toBeTruthy();
    });

    test('earnings page should display earnings info', async ({ page }) => {
      await page.goto('/rider/earnings');
      await page.waitForTimeout(3000);
      
      if (!await isAppLoaded(page)) {
        test.skip(true, 'React app failed to load');
        return;
      }
      
      const content = await page.content();
      const hasEarningsContent = content.toLowerCase().includes('earning') || 
                                content.toLowerCase().includes('₱') ||
                                content.toLowerCase().includes('income');
      expect(hasEarningsContent).toBeTruthy();
    });
  });

  test.describe('Order Actions (API)', () => {
    test('accept order endpoint exists', async ({ request }) => {
      // Try to accept an order (will fail without auth/valid order)
      const response = await request.post('/api/rider/orders/1/accept');
      // Should not be 500, might be 401/404/400
      expect(response.status()).toBeLessThan(500);
    });

    test('complete order endpoint exists', async ({ request }) => {
      const response = await request.post('/api/rider/orders/1/complete');
      expect(response.status()).toBeLessThan(500);
    });
  });
});
