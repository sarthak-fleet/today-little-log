import { devices } from '@playwright/test';
import { definePlaywrightConfig } from '@saas-maker/test-config/playwright';

export default definePlaywrightConfig({
  testDir: './tests',
  baseURL: 'http://localhost:8080',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  extend: {
    projects: [
      // Desktop baseline.
      { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
      // Mobile-viewport project — iPhone 13 is 390px wide, the Wave 1 target.
      // today-little-log is a PWA whose primary use case is mobile.
      { name: 'mobile', use: { ...devices['iPhone 13'] } },
    ],
  },
});
