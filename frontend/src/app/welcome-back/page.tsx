'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function WelcomeBackPage() {
  const router = useRouter();
  const [animationStage, setAnimationStage] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const user = useAuth(); // 認証情報を取得

  console.log('[WelcomeBackPage] User:', user.currentUser);

  useEffect(() => {
    // アニメーションのタイムライン
    const timeline = [
      { delay: 500, action: () => setAnimationStage(1) }, // わんちゃんが画面に入ってくる
      { delay: 2000, action: () => setAnimationStage(2) }, // わんちゃんが中央に到着
      { delay: 2500, action: () => setShowMessage(true) }, // メッセージ表示
      { delay: 3500, action: () => setAnimationStage(3) }, // 喜びのアニメーション
      { delay: 4500, action: () => setShowButton(true) }, // ボタン表示
    ];

    const timeouts = timeline.map(({ delay, action }) =>
      setTimeout(action, delay)
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8 overflow-hidden">
      <div className="w-full max-w-xs flex flex-col items-center text-center relative">
        {/* キラキラエフェクト */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <Sparkles
              key={i}
              className={`absolute h-6 w-6 text-yellow-400 animate-pulse ${
                animationStage >= 2 ? 'opacity-100' : 'opacity-0'
              } transition-opacity duration-1000`}
              style={{
                top: `${20 + i * 15}%`,
                left: `${10 + i * 15}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        {/* わんちゃんの画像 */}
        <div
          className={`relative w-56 h-56 mb-6 transition-all duration-2000 ease-out ${
            animationStage === 0
              ? '-translate-x-96 opacity-0'
              : animationStage === 1
                ? 'translate-x-0 opacity-100'
                : animationStage >= 3
                  ? 'animate-bounce'
                  : 'translate-x-0 opacity-100'
          }`}
        >
          <Image
            src="/images/cute-puppy.png"
            alt="戻ってきたわんちゃん"
            fill
            style={{ objectFit: 'contain' }}
            priority
          />

          {/* ハートエフェクト */}
          {animationStage >= 2 && (
            <div className="absolute -top-4 -right-4">
              <Heart className="h-8 w-8 text-red-500 fill-current animate-pulse" />
            </div>
          )}
        </div>

        {/* メッセージ */}
        <div
          className={`transition-all duration-1000 ${showMessage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <h1 className="text-3xl font-bold mb-2 text-green-800">おかえり！</h1>
          <p className="text-lg text-green-700 mb-4">
            わんちゃんが戻ってきました
          </p>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 mb-6 shadow-lg">
            <p className="text-base text-gray-700">
              あなたの反省文を読んで、わんちゃんはとても嬉しそうです。
              <br />
              これからも一緒に楽しい時間を過ごしましょう！
            </p>
          </div>
        </div>

        {/* 戻るボタン */}
        <div
          className={`transition-all duration-1000 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <Button
            className="bg-green-500 hover:bg-green-600 text-white py-6 px-8 rounded-full shadow-lg text-base font-medium transform hover:scale-105 transition-transform"
            onClick={() => router.push('/dashboard')}
          >
            一緒に遊ぼう！
          </Button>
        </div>

        {/* 足跡エフェクト */}
        <div className="absolute bottom-20 left-0 right-0 flex justify-center space-x-4 opacity-30">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 bg-green-400 rounded-full transition-opacity duration-500 ${
                animationStage >= 1 ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
