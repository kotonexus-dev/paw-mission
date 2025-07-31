// src/tests/e2e/onboarding-welcome-with-coverage.test.ts
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('カバレッジ収集付き：始めるボタン表示と遷移テスト', async ({ page }) => {
  // JSカバレッジ収集を開始
  await page.coverage.startJSCoverage();

  // 実際のテスト処理
  await page.goto('http://localhost:3000/onboarding/welcome');
  await expect(page.getByRole('button', { name: '始める' })).toBeVisible();
  await page.getByRole('button', { name: '始める' }).click();

  // JSカバレッジ収集を停止
  const coverage = await page.coverage.stopJSCoverage();

  // coverage/tmp に保存
  fs.mkdirSync('coverage/tmp', { recursive: true });
  for (const entry of coverage) {
    const filename = path.basename(entry.url).split('?')[0] || 'index.js';
    fs.writeFileSync(`coverage/tmp/${filename}.v8.json`, JSON.stringify(entry));
  }
});
