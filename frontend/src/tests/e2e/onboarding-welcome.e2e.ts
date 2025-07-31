'use client';

import { test, expect } from '@playwright/test';

test.describe('オンボーディングページの動作確認', () => {
  test('「始める」ボタンが表示されていること', async ({ page }) => {
    await page.goto('http://localhost:3000/onboarding/welcome');
    await expect(page.getByRole('button', { name: '始める' })).toBeVisible();
  });

  test('「始める」ボタンをクリックすると新規登録画面に遷移する', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/onboarding/welcome');

    const startButton = page.getByRole('button', { name: '始める' });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // URLは固定されているので、こちらでも可
    await expect(page).toHaveURL('http://localhost:3000/onboarding/login');

    // 新規登録画面で「新規登録して続ける」ボタンが表示されていることを確認
    await expect(
      page.getByRole('button', { name: '新規登録して続ける', exact: true })
    ).toBeVisible();
  });
});
