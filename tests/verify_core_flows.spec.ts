import { test, expect, Page } from '@playwright/test';

async function collectErrors(page: Page): Promise<string[]> {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/401|404|Unauthorized|Failed to fetch|ERR_|net::|vite|react-refresh/i.test(t)) return;
      errs.push(`console.error: ${t}`);
    }
  });
  return errs;
}

test('/habits guest flow — page renders, can add a habit', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/habits');
  await expect(page.getByRole('heading', { name: /Repetition/i })).toBeVisible();
  await expect(page.getByText(/Daily ritual items/i)).toBeVisible();

  // Add a habit
  await page.getByRole('button', { name: /Add Item/i }).first().click();
  await page.getByLabel(/Title/i).fill('Drink water');
  await page.getByRole('button', { name: /Create item/i }).click();

  // Habit should appear in the list
  await expect(page.getByText('Drink water')).toBeVisible();

  // Log a value
  await page.getByRole('button', { name: /^Log$/ }).click();
  await page.getByLabel(/Log value/i).fill('3');
  await page.getByRole('button', { name: /Save log/i }).click();

  // Progress should show 3
  await expect(page.getByText(/Today: 3/i)).toBeVisible();

  expect(errs).toEqual([]);
});

test('/rituals guest — page renders without crashing', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/rituals');
  await expect(page.getByRole('heading', { name: /One daily ritual log/i })).toBeVisible();
  expect(errs).toEqual([]);
});

test('/focus guest — page renders without crashing', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/focus');
  await expect(page.getByRole('heading', { name: /One block\. One thing\./i })).toBeVisible();
  expect(errs).toEqual([]);
});

test('bottom nav contains Habits and Rituals links', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');
  // Set mobile viewport so bottom nav is visible
  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.locator('nav').getByLabel('Habits')).toBeVisible();
  await expect(page.locator('nav').getByLabel('Rituals')).toBeVisible();
  // Click habits
  await page.locator('nav').getByLabel('Habits').click();
  await expect(page).toHaveURL(/\/habits$/);
  expect(errs).toEqual([]);
});
