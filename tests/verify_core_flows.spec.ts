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
    await expect(page.getByText(/Habits, rituals & everything/i)).toBeVisible();
    expect(errs).toEqual([]);
  });
});

test.describe('timer — focus block', () => {
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

test('bottom nav has Score, Journal, Timer, Life', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  const nav = page.locator('nav').last();
  await expect(nav.getByLabel('Score')).toBeVisible();
  await expect(nav.getByLabel('Journal')).toBeVisible();
  await expect(nav.getByLabel('Timer')).toBeVisible();
  await expect(nav.getByLabel('Life')).toBeVisible();
  await nav.getByLabel('Timer').click();
  await expect(page).toHaveURL(/\/focus$/);
  expect(errs).toEqual([]);
});

test('/journal embeds Habits but not Timer', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/journal');
  await expect(page.getByText(/Daily ritual items/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Start a block/i })).toHaveCount(0);
  expect(errs).toEqual([]);
});

test('score matrix surfaces editability + the "habits + rituals + everything" framing', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');
  await expect(page.getByText(/Habits, rituals & everything/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Add row/i })).toBeVisible();
  await page.getByRole('button', { name: /Add row/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel(/Title/i).fill('Read 30 min');
  await page.getByRole('button', { name: /^Add row$/ }).click();
  await expect(page.getByText('Read 30 min')).toBeVisible();
  expect(errs).toEqual([]);
});

test('publish CTA is shown but disabled in guest mode', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');

  // Add a row so the publish banner appears.
  await page.getByRole('button', { name: /Add row/i }).click();
  await page.getByLabel(/Title/i).fill('Meditation');
  await page.getByRole('button', { name: /^Add row$/ }).click();
  await expect(page.getByText('Meditation')).toBeVisible();

  // Banner copy points the guest at signing in.
  await expect(page.getByText(/Publishing is enabled when you sign in/i)).toBeVisible();
  const publishBtn = page.getByRole('button', { name: /Publish for the month/i });
  await expect(publishBtn).toBeVisible();
  await expect(publishBtn).toBeDisabled();

  expect(errs).toEqual([]);
});

test('/rituals redirects to /habits', async ({ page }) => {
  await page.goto('/rituals');
  await expect(page).toHaveURL(/\/habits$/);
});
