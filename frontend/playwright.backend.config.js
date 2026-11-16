import { defineConfig } from '@playwright/test';
import fixtureConfig from './playwright.config.js';

export default defineConfig({
  ...fixtureConfig,
  testMatch: 'authenticated-guardbook.spec.js',
  webServer: [
    {
      command: 'node e2e/start-backend.cjs',
      url: 'http://127.0.0.1:4181/api/v1/health',
      reuseExistingServer: false,
      timeout: 120_000
    },
    {
      ...fixtureConfig.webServer,
      env: { ...fixtureConfig.webServer.env, E2E_BACKEND_URL: 'http://127.0.0.1:4181' }
    }
  ]
});
