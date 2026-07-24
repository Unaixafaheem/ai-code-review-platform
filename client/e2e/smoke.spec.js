import { test, expect } from '@playwright/test';

test('login page shows auth form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
    timeout: 15000,
  });
});

test('register page shows auth form', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
    timeout: 15000,
  });
});
