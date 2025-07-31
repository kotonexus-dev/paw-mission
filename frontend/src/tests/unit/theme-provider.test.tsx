'use client';

import { render, screen } from '@testing-library/react';

import ThemeProvider from '@/components/theme-provider';

describe('ThemeProvider', () => {
  it('子要素を正しく描画する', () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <div>テスト用の子要素</div>
      </ThemeProvider>
    );

    // `toBeInTheDocument()` は使わず、null でないことだけ確認
    const el = screen.queryByText('テスト用の子要素');
    expect(el).not.toBeNull();
  });
});
