'use client';

import { test, expect } from '@playwright/test';

test.describe('デバッグテストページの朝ごはんボタン', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前に毎回ページにアクセス
    await page.goto('http://localhost:3000/debug-test');
  });

  test('ボタンが表示される', async ({ page }) => {
    // 見出しが表示されているか
    await expect(
      page.getByRole('heading', { name: 'デバッグテストページ' })
    ).toBeVisible();

    // ボタンの表示確認
    await expect(
      page.getByRole('button', { name: 'あさごはん' })
    ).toBeVisible();
  });

  test('ボタンが有効化され、クリックで完了メッセージが表示される', async ({
    page,
  }) => {
    const button = page.getByRole('button', { name: 'あさごはん' });

    // ボタンが有効か
    await expect(button).toBeEnabled();

    // ボタンクリック → メッセージ確認
    await button.click();
    await expect(page.getByText('🍚 あさごはん完了！')).toBeVisible();
  });
});
