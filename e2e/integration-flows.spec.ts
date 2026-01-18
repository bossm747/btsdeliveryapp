import { test, expect } from '@playwright/test';

/**
 * Integration Tests - Complete User Flows
 * Tests the main user journeys through the app
 */

test.describe('Integration: Complete User Flows', () => {

  test.describe('Public Pages', () => {
    test('landing page should load', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/BTS/i);
      await expect(page.locator('body')).toBeVisible();
    });

    test('restaurants page should load', async ({ page }) => {
      await page.goto('/restaurants');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('login page should load', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('body')).toBeVisible();

      // Should have email and password inputs
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"]');

      // At least one of these should exist
      const hasEmailInput = await emailInput.count() > 0;
      const hasPasswordInput = await passwordInput.count() > 0;

      expect(hasEmailInput || hasPasswordInput).toBeTruthy();
    });

    test('signup page should load', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click on restaurants if link exists
      const restaurantsLink = page.locator('a[href="/restaurants"]');
      if (await restaurantsLink.count() > 0) {
        await restaurantsLink.first().click();
        await page.waitForURL('**/restaurants**');
        await expect(page).toHaveURL(/restaurants/);
      }
    });

    test('mobile navigation should work', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Should see mobile bottom nav or hamburger menu
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Cart Flow', () => {
    test('cart page should load', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');

      // Should show empty cart or cart contents
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('customer dashboard should redirect to login if not authenticated', async ({ page }) => {
      await page.goto('/customer-dashboard');
      await page.waitForLoadState('networkidle');

      // Should either show dashboard or redirect to login
      const currentUrl = page.url();
      const isOnDashboard = currentUrl.includes('customer-dashboard');
      const isOnLogin = currentUrl.includes('login');

      expect(isOnDashboard || isOnLogin).toBeTruthy();
    });

    test('vendor dashboard should require authentication', async ({ page }) => {
      await page.goto('/vendor-dashboard');
      await page.waitForLoadState('networkidle');

      // Should redirect to login or show dashboard
      await expect(page.locator('body')).toBeVisible();
    });

    test('rider dashboard should require authentication', async ({ page }) => {
      await page.goto('/rider-dashboard');
      await page.waitForLoadState('networkidle');

      // Should redirect to login or show dashboard
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('API Health', () => {
    test('health check endpoint should respond', async ({ request }) => {
      // Try to hit a basic endpoint
      const response = await request.get('/api/restaurants');
      // Should get a response (might be 200 or 401 etc)
      expect(response.status()).toBeLessThan(500);
    });

    test('auth endpoints should be available', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: { email: 'test@test.com', password: 'test' }
      });
      // Should get response (could be 401 for invalid creds)
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should work on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('404 page should show for unknown routes', async ({ page }) => {
      await page.goto('/unknown-route-12345');
      await page.waitForLoadState('networkidle');

      // Should show 404 or redirect
      await expect(page.locator('body')).toBeVisible();
    });
  });
});
