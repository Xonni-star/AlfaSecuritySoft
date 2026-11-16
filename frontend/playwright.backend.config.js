import { defineConfig } from '@playwright/test';
import fixtureConfig from './playwright.config.js';

export default defineConfig({
  ...fixtureConfig,
  testMatch: 'authenticated-guardbook.spec.js',
  webServer: [
    {
      command: 'npm run dev --prefix backend',
      url: 'http://127.0.0.1:4181/api/v1/health',
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      ...fixtureConfig.webServer,
      env: { E2E_BACKEND_URL: 'http://127.0.0.1:4181', NODE_ENV: 'production' }
    }
  ]
});
