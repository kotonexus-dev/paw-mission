'use client';

import * as React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes';

export default function ThemeProvider({
  children,
  attribute,
  defaultTheme,
  enableSystem,
}: ThemeProviderProps) {
  // サーバとクライアントのエラー不一致を避けるため、マウント後にテーマを適用
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // サーバーサイドレンダリング時とクライアントの初回レンダリング時は
    // テーマ設定なしで子コンポーネントを返す
    return children;
  }

  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
    >
      {children}
    </NextThemesProvider>
  );
}
