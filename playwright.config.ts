import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: 'node apps/web/.next/standalone/apps/web/server.js',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: '3100',
      HOSTNAME: '127.0.0.1',
      LOCAL_DATA_DIR: resolve('.local-data', `e2e-${Date.now()}`),
      GROQ_API_KEY: '',
      DATABASE_URL: '',
      APP_ORIGIN: '',
      RENDER_EXTERNAL_URL: '',
      VERCEL: '',
      VERCEL_URL: '',
      REVIEW_ADMIN_TOKEN: 'test-review-token-only-for-ephemeral-e2e-42',
    },
  },
});
