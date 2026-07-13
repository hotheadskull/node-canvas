import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:1421',
  },
  webServer: {
    command: 'npm run dev -w app',
    port: 1421,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
