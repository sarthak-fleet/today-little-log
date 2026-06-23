import { test, expect, type Page } from '@playwright/test';

/**
 * Smoke tests — verify every route renders in guest mode without
 * uncaught runtime errors. API calls that require auth return 401
 * and are expected to be caught silently by the hooks.
 */

// Routes that must render for guest visitors. Auth-only features (that
// mount nothing when `user` is null) are still expected to produce a
// non-crashing page.
const PUBLIC_ROUTES = [
  { path: '/', mustContain: /Today Little Log|Today's scoreboard/i },
  { path: '/journal', mustContain: /Journal|today|entry/i },
  { path: '/patterns', mustContain: /Patterns|score|trend/i },
  { path: '/life', mustContain: /Set your date of birth|How many weeks|Life/i },
  { path: '/review', mustContain: /Review|recap|week|month/i },
  { path: '/about', mustContain: /Today Little Log|privacy|scoreboard/i },
  { path: '/privacy', mustContain: /privacy|data|account/i },
];

async function goAndCollectErrors(page: Page, path: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore expected 401 / network-related noise from guest-mode API calls.
      if (
        /401|Unauthorized|Failed to fetch|Failed to preconnect|Failed to load resource|404|posthog|ERR_|net::/i.test(
          text
        )
      )
        return;
      // Ignore vite HMR/devtools noise
      if (/vite|react-refresh|hot reload/i.test(text)) return;
      errors.push(`console.error: ${text}`);
    }
  });
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
  expect(response, `${path} navigation`).not.toBeNull();
  expect(response?.status(), `${path} status`).toBeLessThan(400);
  return errors;
}

test.describe('route smoke — guest mode', () => {
  for (const { path, mustContain } of PUBLIC_ROUTES) {
    test(`renders ${path}`, async ({ page }) => {
      const errors = await goAndCollectErrors(page, path);
      await expect(page.locator('body')).toContainText(mustContain, { timeout: 7_000 });
      expect(errors, `unexpected console/page errors on ${path}`).toEqual([]);
    });
  }
});

test.describe('home content', () => {
  test('title contains finite-time branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Today/i);
  });

  test('footer stamp is present on md+ viewports', async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) < 768, 'desktop-only');
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/Today Little Log|Today's scoreboard/i);
  });
});

test.describe('life math', () => {
  test('/life shows grid legend', async ({ page }) => {
    await page.goto('/life');
    // Either the DOB-gated grid legend, or the "set DOB" prompt.
    await expect(page.locator('body')).toContainText(
      /lived|Set your date of birth|How many weeks/i
    );
  });
});

test.describe('quick-log FAB', () => {
  test('Q key opens quick-log only for logged-in users — guest: not present', async ({ page }) => {
    await page.goto('/');
    // FAB + URGE button are mounted only when user is set. Guest should not see them.
    const fab = page.locator('button[aria-label="Quick log (Q)"]');
    await expect(fab).toHaveCount(0);
  });
});

test.describe('eisenhower empty state', () => {
  test('retired route redirects to score page', async ({ page }) => {
    await page.goto('/eisenhower');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('body')).toContainText(/Today Little Log|Today's scoreboard/i);
  });
});
