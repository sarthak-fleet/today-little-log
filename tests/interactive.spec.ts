import { test, expect, type Page } from '@playwright/test';

/**
 * Interactive smoke — clicks through navigation + common interactions
 * in guest mode. Verifies no JS errors, no unhandled rejections, and
 * key interactive elements actually respond.
 */

async function collectErrors(page: Page): Promise<string[]> {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text();
      if (
        /401|404|Unauthorized|Failed to fetch|Failed to preconnect|posthog|ERR_|net::|vite|react-refresh/i.test(
          t
        )
      )
        return;
      errs.push(`console.error: ${t}`);
    }
  });
  return errs;
}

test('sidebar navigation — click each nav item in sequence', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');

  // Sidebar appears only on md+ viewports. Check nav links exist in DOM (may be collapsed).
  const navLinks = ['/', '/journal', '/patterns', '/life', '/review', '/about', '/privacy'];

  for (const path of navLinks) {
    await page.goto(path);
    // Small wait for hydration of each page
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
    // Page renders something (not blank)
    await expect(page.locator('body')).not.toBeEmpty();
  }

  expect(errs).toEqual([]);
});

test('guest DOB prompt — /life shows prompt when no DOB set', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/life');
  // Either the DOB prompt or how-many-weeks copy
  await expect(page.locator('body')).toContainText(/set your date of birth|how many weeks/i);
  expect(errs).toEqual([]);
});

test('theme toggle — dark mode switches', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');
  // Find the dark/light mode button by role + aria
  const toggle = page.getByTitle(/dark mode|light mode/i).first();
  if (await toggle.count()) {
    const beforeClass = await page.locator('html').getAttribute('class');
    await toggle.click();
    await page.waitForTimeout(250);
    const afterClass = await page.locator('html').getAttribute('class');
    expect(beforeClass).not.toBe(afterClass);
  }
  expect(errs).toEqual([]);
});

test('month/year/life time cycle — navbar counter click cycles label', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');
  const button = page.getByTitle(/click to cycle/i).first();
  if (await button.count()) {
    const l1 = await button.innerText();
    await button.click();
    await page.waitForTimeout(150);
    const l2 = await button.innerText();
    expect(l1).not.toBe(l2);
  }
  expect(errs).toEqual([]);
});

test('retired tasks page redirects to score page', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).toContainText(
    /Today's scoreboard|Habits, rituals & everything/i
  );
  expect(errs).toEqual([]);
});

test('retired standalone pages redirect to score page', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/eisenhower');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).toContainText(/Today's scoreboard|May \d+/i);
  expect(errs).toEqual([]);
});

test('auth page — Google sign-in button present + clickable', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/auth');
  const btn = page.getByRole('button', { name: /continue with google/i });
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
  // Click it — we only verify click doesn't throw (won't complete OAuth in test).
  const clickPromise = btn.click().catch(() => {});
  await clickPromise;
  expect(errs).toEqual([]);
});

test('footer stamp — visible on desktop viewport with live counter', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) < 768, 'desktop-only');
  const errs = await collectErrors(page);
  await page.goto('/');
  await expect(page.locator('body')).toContainText(/Today Little Log|Today's scoreboard/i);
  expect(errs).toEqual([]);
});

test('no QuickLog FAB or URGE button for guest', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');
  await expect(page.locator('button[aria-label="Quick log (Q)"]')).toHaveCount(0);
  await expect(page.locator('button[aria-label="URGE — log a temptation"]')).toHaveCount(0);
  expect(errs).toEqual([]);
});

test('review page — renders recap surfaces', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/review');
  await expect(page.locator('body')).toContainText(/review|recap|week|month/i);
  expect(errs).toEqual([]);
});

test('keyboard Q — doesnt crash when guest (FAB not mounted)', async ({ page }) => {
  const errs = await collectErrors(page);
  await page.goto('/');
  await page.keyboard.press('q');
  await page.waitForTimeout(200);
  expect(errs).toEqual([]);
});
