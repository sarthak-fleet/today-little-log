import { test, expect } from '@playwright/test';

test.use({ baseURL: 'https://today-little-log.pages.dev' });

test('prod /auth — button present, click fires auth flow', async ({ page }) => {
  const authHits: Array<{ status: number; url: string }> = [];
  page.on('response', (r) => {
    const u = r.url();
    if (/api\/auth|accounts\.google|oauth2/.test(u)) authHits.push({ status: r.status(), url: u });
  });

  const nav = await page.goto('/auth', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  expect(nav?.status(), 'initial GET /auth status').toBeLessThan(400);

  // Guard against Vercel bot challenge (rare via real chromium but possible).
  const title = await page.title();
  expect(title, `page title: ${title}`).toMatch(/Today/i);

  const btn = page.getByRole('button', { name: /continue with google/i });
  await expect(btn, 'Google sign-in button visible').toBeVisible({ timeout: 10_000 });
  await expect(btn).toBeEnabled();

  // Nothing must overlap the button — elementFromPoint at its center must be the button.
  const box = await btn.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    const tag = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x as number, y as number);
      return el?.tagName.toLowerCase();
    }, [box.x + box.width / 2, box.y + box.height / 2]);
    expect(['button', 'svg', 'path', 'span'], `element at button center = ${tag}`).toContain(tag);
  }

  // Click — OAuth will navigate or fail at Google. We just need the first
  // auth-related request to fire.
  await btn.click().catch(() => {});
  await page.waitForTimeout(4_000);

  expect(authHits.length, 'auth-related network hits').toBeGreaterThan(0);
  console.log('AUTH HITS:', JSON.stringify(authHits, null, 2));
});
