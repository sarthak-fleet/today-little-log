import { test, expect } from '@playwright/test';

test('journal daily entry flow — guest', async ({ page }) => {
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: /what did you do today/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /save entry/i })).toBeDisabled();

  const textareas = page.locator('textarea');
  await textareas.nth(0).fill('Morning run and good sleep');
  await textareas.nth(1).fill('Hit protein target');
  await expect(page.getByRole('button', { name: /save entry/i })).toBeEnabled();
  await page.getByRole('button', { name: /save entry/i }).click();
  await expect(page.getByRole('button', { name: /^edit$/i })).toBeVisible({ timeout: 5000 });

  await page.getByRole('button', { name: /calendar/i }).click();
  await expect(page.getByRole('heading', { name: /calendar view/i })).toBeVisible();
  await expect(
    page.locator('p.text-journal-ink').filter({ hasText: 'Morning run and good sleep' })
  ).toBeVisible();
});

test('review page renders recap surfaces', async ({ page }) => {
  await page.goto('/review');
  await expect(page.getByText(/week recap/i)).toBeVisible();
  await expect(page.getByText(/next-week planning/i)).toBeVisible();
  await expect(page.getByText(/weekly \+ monthly journal/i)).toBeVisible();
});
