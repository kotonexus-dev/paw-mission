'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    // 認証状態の読み込み中は何もしない
    if (loading) {
      return;
    }

    // ログイン済みの場合はダッシュボードへ
    if (currentUser) {
      console.log('[Home] ログイン済みユーザー - ダッシュボードにリダイレクト');
      router.push('/dashboard');
    } else {
      // 未ログインの場合はオンボーディングへ
      console.log('[Home] 未ログインユーザー - オンボーディングにリダイレクト');
    router.push('/onboarding/welcome');
    }
  }, [currentUser, loading, router]);

  // 認証状態の確認中は読み込み表示
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-medium">読み込み中...</div>
      </div>
    );
  }

  // リダイレクト処理中
  return null;
}
