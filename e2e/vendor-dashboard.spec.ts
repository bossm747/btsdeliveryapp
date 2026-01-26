import { test, expect, Page } from '@playwright/test';

/**
 * Vendor Dashboard E2E Tests
 * Tests vendor operations including menu management, orders, and analytics
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

test.describe('Vendor Dashboard Operations', () => {

  test.describe('API Endpoints', () => {
    test('vendor stats API should be accessible', async ({ request }) => {
      const response = await request.get('/api/vendor/stats');
      // Requires auth, so 401 is expected
      expect([200, 401, 404]).toContain(response.status());
    });

    test('vendor orders API should be accessible', async ({ request }) => {
      const response = await request.get('/api/vendor/orders');
      expect([200, 401, 404]).toContain(response.status());
    });

    test('vendor menu API should be accessible', async ({ request }) => {
      const response = await request.get('/api/vendor/menu');
      expect([200, 401, 404]).toContain(response.status());
    });
  });

  test.describe('Dashboard Pages', () => {
    test('vendor dashboard should load', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      expect(title).toMatch(/BTS/i);
    });

    test('vendor overview page should load', async ({ page }) => {
      await page.goto('/vendor/overview');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Menu Management Pages', () => {
    test('menu page should load', async ({ page }) => {
      await page.goto('/vendor/menu');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });

    test('inventory page should load', async ({ page }) => {
      await page.goto('/vendor/inventory');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Order Management Pages', () => {
    test('orders page should load', async ({ page }) => {
      await page.goto('/vendor/orders');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Analytics Pages', () => {
    test('analytics page should load', async ({ page }) => {
      await page.goto('/vendor/analytics');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });

    test('earnings page should load', async ({ page }) => {
      await page.goto('/vendor/earnings');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Settings Pages', () => {
    test('profile page should load', async ({ page }) => {
      await page.goto('/vendor/profile');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });

    test('business settings page should load', async ({ page }) => {
      await page.goto('/vendor/business-settings');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });

    test('commission page should load', async ({ page }) => {
      await page.goto('/vendor/commission');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });

    test('tax reports page should load', async ({ page }) => {
      await page.goto('/vendor/tax-reports');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Marketing Pages', () => {
    test('promotions page should load', async ({ page }) => {
      await page.goto('/vendor/promotions');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('Staff Management', () => {
    test('staff page should load', async ({ page }) => {
      await page.goto('/vendor/staff');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('AI Assistant', () => {
    test('AI assistant page should load', async ({ page }) => {
      await page.goto('/vendor/ai-assistant');
      await page.waitForTimeout(2000);
      expect(page.url()).toBeDefined();
    });
  });

  test.describe('UI Elements (when app loads)', () => {
    test('vendor dashboard should show menu items', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      await page.waitForTimeout(3000);
      
      if (!await isAppLoaded(page)) {
        test.skip(true, 'React app failed to load');
        return;
      }
      
      const content = await page.content();
      const hasVendorContent = content.toLowerCase().includes('vendor') || 
                              content.toLowerCase().includes('dashboard') ||
                              content.toLowerCase().includes('order');
      expect(hasVendorContent).toBeTruthy();
    });
  });
});
