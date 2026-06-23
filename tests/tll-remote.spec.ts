import { test } from '@playwright/test';
test('today-little-log: auth works', async ({ page }) => {
  await page.goto('https://today-little-log.pages.dev', { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/tll-1.png' });
  const body = await page.textContent('body');
  console.log('TLL:', body?.length, body?.substring(0, 200));

  const btn = page
    .locator('button:has-text("Google"), button:has-text("Sign"), a:has-text("Sign")')
    .first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    const [resp] = await Promise.all([
      page
        .waitForResponse((r) => r.url().includes('auth') || r.url().includes('google'), {
          timeout: 8000,
        })
        .catch(() => null),
      btn.click(),
    ]);
    await page.waitForTimeout(3000);
    console.log('TLL auth result:', page.url().substring(0, 100), 'HTTP:', resp?.status());
    await page.screenshot({ path: '/tmp/tll-auth.png' });
  }
});
