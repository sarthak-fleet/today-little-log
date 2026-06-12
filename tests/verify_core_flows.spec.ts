import { test, expect, Page } from '@playwright/test';

async function collectErrors(page: Page): Promise<string[]> {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/401|404|Unauthorized|Failed to fetch|Failed to preconnect|posthog|ERR_|net::|vite|react-refresh/i.test(t)) return;
      errs.push(`console.error: ${t}`);
    }
  });
  return errs;
}

test.describe('habits — guest lifecycle', () => {
  test('add, log, edit, delete a habit', async ({ page }) => {
    const errs = await collectErrors(page);
    await page.goto('/habits');
    await expect(page.getByRole('heading', { name: /Repetition/i })).toBeVisible();

    // Add
    await page.getByRole('button', { name: /Add Item/i }).first().click();
    await page.getByLabel(/Title/i).fill('Drink water');
    await page.getByRole('button', { name: /Create item/i }).click();
    await expect(page.getByText('Drink water')).toBeVisible();

    // Log a value
    await page.getByRole('button', { name: /^Log$/ }).click();
    await page.getByLabel(/Log value/i).fill('3');
    await page.getByRole('button', { name: /Save log/i }).click();
    await expect(page.getByText(/Today: 3/i)).toBeVisible();

    // Edit (rename)
    await page.locator('button:has(svg.lucide-pencil)').first().click();
    const titleInput = page.getByLabel(/Title/i);
    await titleInput.fill('Hydrate');
    await page.getByRole('button', { name: /Save changes/i }).click();
    await expect(page.getByText('Hydrate')).toBeVisible();

    // Delete
    await page.locator('button:has(svg.lucide-trash-2)').first().click();
    await page.getByRole('button', { name: /^Delete$/ }).click();
    await expect(page.getByText('Hydrate')).toHaveCount(0);

    expect(errs).toEqual([]);
  });
});

test.describe('scoreboard — guest interaction', () => {
  test('renders matrix and totals on home', async ({ page }) => {
    const errs = await collectErrors(page);
    await page.goto('/');
    await expect(page.getByText(/Today's scoreboard/i)).toBeVisible();
    await expect(page.getByText(/Daily matrix/i)).toBeVisible();
    expect(errs).toEqual([]);
  });
});

test.describe('time start/stop — focus block', () => {
  test('starts, persists across reload, can stop manually', async ({ page }) => {
    const errs = await collectErrors(page);
    await page.goto('/focus');
    await expect(page.getByRole('heading', { name: /One block\. One thing\./i })).toBeVisible();

    // Start a block
    await page.getByRole('button', { name: /Start a block/i }).click();
    await page.getByPlaceholder(/what's the one thing/i).fill('Wrap up the project');
    await page.getByRole('button', { name: /Start \d+m/i }).click();

    // Active block UI should appear with the task title
    await expect(page.getByText(/Wrap up the project/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();

    // Reload — session should be restored from localStorage
    await page.reload();
    await expect(page.getByText(/Wrap up the project/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();

    // Stop ends the session and returns to picker
    await page.getByRole('button', { name: /^Stop$/ }).click();
    await expect(page.getByRole('button', { name: /Start a block/i })).toBeVisible();

    expect(errs).toEqual([]);
  });
});

test('bottom nav surfaces Habits and Rituals', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page.locator('nav').getByLabel('Habits')).toBeVisible();
  await expect(page.locator('nav').getByLabel('Rituals')).toBeVisible();
  await page.locator('nav').getByLabel('Habits').click();
  await expect(page).toHaveURL(/\/habits$/);
  expect(errs).toEqual([]);
});
