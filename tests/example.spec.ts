import { test, expect } from '@playwright/test';

test('app loads with finite-time title', async ({ page }) => {
  await page.goto('http://localhost:8080');
  // Title updates live to include countdown; check the base word lives there.
  await expect(page).toHaveTitle(/Today/i);
});

test('life page renders', async ({ page }) => {
  await page.goto('http://localhost:8080/life');
  await expect(page.locator('text=/Your Life|How many weeks/i').first()).toBeVisible();
});

