'use client';

import { test, expect } from '@playwright/test';

test('認証されていないユーザーは /admin にアクセスできず404が表示される', async ({
  page,
}) => {
  // 未ログイン状態で /admin にアクセス
  await page.goto('http://localhost:3000/admin');

  // 404エラーメッセージが表示されることを確認（文言はあなたの実装に合わせてください）
  await expect(page.getByText('404')).toBeVisible();

  // 任意：特定の説明文が表示されるか確認
  await expect(page.getByText(/ページが見つかりません/)).toBeVisible();
});
