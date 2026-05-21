import { expect, test } from '@playwright/test';

/**
 * Mobile-viewport checks — runs under the `mobile` Playwright project
 * (iPhone 13 = 390px wide). today-little-log is a PWA whose primary use case
 * is mobile, so every primary surface must be usable one-handed at 390px:
 * no horizontal scroll, the bottom nav reachable.
 *
 * Skipped on the `desktop` project — these assertions are mobile-specific.
 */

const PRIMARY_ROUTES = ['/', '/journal', '/patterns', '/life', '/review'];

test.describe('mobile viewport — 390px', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 1280) > 600,
    'mobile-only checks',
  );

  for (const path of PRIMARY_ROUTES) {
    test(`no horizontal scroll on ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        // Allow a 1px rounding tolerance.
        return doc.scrollWidth - doc.clientWidth;
      });
      expect(overflow, `${path} should not scroll horizontally`).toBeLessThanOrEqual(1);
    });
  }

  test('bottom navigation is visible and reachable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible();
    await page.waitForTimeout(300);

    // Every bottom-nav button must meet the 44px touch-target floor.
    // Measure via getBoundingClientRect in-page — consistent for a
    // position:fixed element regardless of document scroll height.
    const sizes = await nav.locator('button').evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height };
      }),
    );
    expect(sizes.length).toBeGreaterThan(0);
    sizes.forEach((size, i) => {
      expect(size.height, `bottom-nav button ${i} height`).toBeGreaterThanOrEqual(44);
      expect(size.width, `bottom-nav button ${i} width`).toBeGreaterThanOrEqual(44);
    });
  });

  test('bottom nav navigates between primary surfaces', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.locator('nav.fixed.bottom-0');
    await nav.getByText('Journal').click();
    await expect(page).toHaveURL(/\/journal$/);
    await nav.getByText('Score').click();
    await expect(page).toHaveURL(/\/$/);
  });
});
