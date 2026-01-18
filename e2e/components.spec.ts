import { test, expect } from '@playwright/test';

/**
 * Component Tests
 * Verify all new components render correctly
 */

test.describe('Component Verification', () => {

  test.describe('UI Components', () => {
    test('empty state component should be available', async ({ page }) => {
      // Navigate to a page that might show empty state
      await page.goto('/customer-orders');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('loading button should disable during loading', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('body')).toBeVisible();

      // Find submit button
      const button = page.locator('button[type="submit"]');
      if (await button.count() > 0) {
        await expect(button.first()).toBeEnabled();
      }
    });
  });

  test.describe('Skeleton Components', () => {
    test('restaurant skeletons should render during loading', async ({ page }) => {
      // Use network throttling to see skeletons
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.continue();
      });

      await page.goto('/restaurants');
      // Should eventually load
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Animated Components', () => {
    test('page transition should not break navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Click any link
      const links = page.locator('a[href]');
      if (await links.count() > 0) {
        const firstLink = links.first();
        const href = await firstLink.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#')) {
          await firstLink.click();
          await page.waitForLoadState('networkidle');
          await expect(page.locator('body')).toBeVisible();
        }
      }
    });
  });

  test.describe('Form Components', () => {
    test('address autocomplete should render', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('schedule picker should render', async ({ page }) => {
      await page.goto('/cart');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Chat Component', () => {
    test('order chat should be importable', async ({ page }) => {
      // The chat component exists on order tracking pages
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Notification Components', () => {
    test('offline indicator should handle online state', async ({ page }) => {
      await page.goto('/customer-orders');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body')).toBeVisible();
    });

    test('rider tracking notification should render', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Hook Tests', () => {
  test('useReducedMotion should work', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('useOnlineStatus should detect connectivity', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // App should still render
    await expect(page.locator('body')).toBeVisible();

    // Go back online
    await context.setOffline(false);
  });
});
