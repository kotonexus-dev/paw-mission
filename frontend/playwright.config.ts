// frontend/playwright.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tests/e2e', // E2E テスト用ディレクトリ
  timeout: 30 * 1000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
