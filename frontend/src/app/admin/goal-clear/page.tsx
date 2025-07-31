'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function GoalClearPage() {
  const router = useRouter();
  const [showAnimation, setShowAnimation] = useState(false);
  const user = useAuth(); // 認証情報を取得

  console.log('[GoalClearPage] User:', user.currentUser);

  useEffect(() => {
    setShowAnimation(true);

    // 10秒後に自動でダッシュボードに戻る
    const timeout = setTimeout(() => {
      router.push('/dashboard');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <div className="w-full max-w-xs text-center">
        {/* アニメーション効果 */}
        <div className="relative mb-8">
          {showAnimation && (
            <>
              {[
                { id: 'sparkle-1', top: 20, left: 10, delay: 0 },
                { id: 'sparkle-2', top: 35, left: 25, delay: 0.3 },
                { id: 'sparkle-3', top: 50, left: 40, delay: 0.6 },
                { id: 'sparkle-4', top: 65, left: 55, delay: 0.9 },
                { id: 'sparkle-5', top: 80, left: 70, delay: 1.2 },
                { id: 'sparkle-6', top: 95, left: 85, delay: 1.5 },
              ].map((sparkle) => (
                <Sparkles
                  key={sparkle.id}
                  className="absolute h-8 w-8 text-yellow-400 animate-pulse"
                  style={{
                    top: `${sparkle.top}%`,
                    left: `${sparkle.left}%`,
                    animationDelay: `${sparkle.delay}s`,
                  }}
                />
              ))}
            </>
          )}

          <div
            className={`transform transition-all duration-1000 ${showAnimation ? 'scale-110 rotate-12' : 'scale-100'}`}
          >
            <Trophy className="h-24 w-24 text-yellow-500 mx-auto mb-4" />
          </div>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            <div className="space-y-4">
              <div className="flex justify-center space-x-1 mb-4">
                {[
                  { id: 'star-1' },
                  { id: 'star-2' },
                  { id: 'star-3' },
                  { id: 'star-4' },
                  { id: 'star-5' },
                ].map((star) => (
                  <Star
                    key={star.id}
                    className="h-6 w-6 text-yellow-400 fill-current"
                  />
                ))}
              </div>

              <h1 className="text-3xl font-bold text-orange-800 mb-2">
                🎉 目標クリア！ 🎉
              </h1>

              <p className="text-lg text-gray-700 mb-4">
                おめでとうございます！
                <br />
                目標を達成しました！
              </p>

              <div className="bg-orange-100 rounded-lg p-4 mb-6">
                <p className="text-sm text-orange-800">
                  わんちゃんもとても喜んでいます！
                  <br />
                  ここまで本当によくがんばりました！
                  <br />
                  これから家族みんなで、わんちゃんを本当に迎えるかどうか話し合ってみましょう。
                </p>
              </div>

              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-full text-lg font-bold"
                onClick={() => router.push('/dashboard')}
              >
                お世話つづける
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-gray-600 mt-4">
          10秒後に自動的に戻ります...
        </p>
      </div>
    </div>
  );
}
