import { test, expect } from '@playwright/test';

/**
 * Verify the Google sign-in button actually triggers the Better Auth
 * social-sign-in flow when clicked. Passes if clicking results in either
 * a same-origin request to /api/auth/sign-in/social OR a Google accounts
 * navigation (both mean the button wired up correctly).
 */
test('Google sign-in button fires auth request on click', async ({ page }) => {
  const authCalls: string[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (/\/api\/auth\/sign-in\/social|accounts\.google\.com/.test(url)) {
      authCalls.push(url);
    }
  });

  await page.goto('/auth');
  const btn = page.getByRole('button', { name: /continue with google/i });
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();

  // Click + wait briefly for request fan-out.
  await Promise.race([
    btn.click(),
    page.waitForTimeout(3_000),
  ]);
  await page.waitForTimeout(1_500);

  expect(authCalls.length).toBeGreaterThan(0);
});

test('Nothing visually overlaps the sign-in button', async ({ page }) => {
  await page.goto('/auth');
  const btn = page.getByRole('button', { name: /continue with google/i });
  const box = await btn.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  // Probe top-level element at the button's center.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const tag = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x as number, y as number);
    return el?.tagName + (el?.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : '');
  }, [cx, cy]);
  // Should resolve to the button itself or its inner svg/span — NOT a full-screen overlay.
  expect(tag?.toLowerCase()).toMatch(/button|svg|span|path/);
});
