import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'offline-guardbook.spec.js',
  fullyParallel: false,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run build && node e2e/test-server.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
