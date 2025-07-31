'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dog } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoadingScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const user = useAuth(); // 認証情報を取得

  console.log('[LoadingScreen] User:', user.currentUser);

  useEffect(() => {
    // ローディングの進行状況を更新
    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prevProgress + 5;
      });
    }, 200);

    // 一定時間後に次の画面に遷移
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <div className="w-full max-w-xs text-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-orange-100 flex items-center justify-center">
              <Dog className="h-20 w-20 text-orange-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-orange-300 border-t-orange-500 animate-spin" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">
          お家にわんちゃんがやってきます〜
        </h1>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
          <div
            className="bg-orange-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-base text-orange-600 font-medium animate-pulse">
          LOADING...
        </p>

        <div className="mt-8 flex justify-center space-x-2">
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
