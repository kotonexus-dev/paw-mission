'use client';

import type React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Heart,
} from 'lucide-react';
// import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';

// 管理者ログインページ
export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // ローディング状態管理
  const user = useAuth();

  // console.log('[AdminLoginPage] User:', user.currentUser);

  // フォーム送信時のPIN認証処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // エラーをリセット

    if (!pin) {
      setError('PINを入力してください');
      return;
    }
    if (pin.length !== 4) {
      setError('PINは4桁で入力してください');
      return;
    }

    setIsLoading(true); // ローディング開始

    try {
      if (!user.currentUser) {
        setError('ログイン情報が見つかりません');
        setIsLoading(false);
        return;
      }

      const idToken = await user.currentUser.getIdToken(); // Firebase IDトークン取得

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API_BASE_URL}/api/care_settings/verify_pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`, // 認証トークンを送信
        },
        body: JSON.stringify({ input_password: pin }),
      });

      if (!res.ok) {
        throw new Error('APIエラー');
      }

      const result = await res.json();
      if (result.verified) {
        // 認証成功 - ローディング継続して画面遷移
        await new Promise((resolve) => {
          setTimeout(resolve, 300); // ユーザーが完了状態を確認できるよう短時間待機
        });
        router.push('/admin');
      } else {
        // 認証失敗
        setAttempts((prev) => prev + 1);
        setError('PINが正しくありません');
        setPin('');
        setIsLoading(false); // ローディング終了
        // 3回失敗したらダッシュボードに戻る
        if (attempts >= 2) {
          setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        }
      }
    } catch (err) {
      // console.error('PIN認証エラー:', err);
      setError('PIN認証中にエラーが発生しました');
      setIsLoading(false); // エラー時はローディング終了
    }
  };

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <Card className="w-full max-w-xs shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-2 pb-2">
          <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Shield className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-center">管理者認証</h1>
          <p className="text-center text-base text-muted-foreground">
            PINを入力してください
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {/* ローディング進捗表示 - dashboardスタイルに合わせたデザイン */}
          {isLoading && (
            <div className="mb-6 text-center">
              <div className="mb-6 flex flex-col items-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center">
                    <Heart className="h-12 w-12 text-orange-500" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-orange-300 border-t-orange-500 animate-spin" />
                </div>
              </div>

              <h2 className="text-lg font-bold mb-4 text-center text-gray-800">
                認証中...
              </h2>

              <div className="flex justify-center space-x-2">
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="pin"
                className="text-base flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                PIN（4桁）
              </Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? 'text' : 'password'}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(value);
                    setError('');
                  }}
                  className="text-2xl pr-10 text-center tracking-widest"
                  maxLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPin(!showPin)}
                  disabled={isLoading}
                  aria-label={showPin ? 'PINを隠す' : 'PINを表示'}
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-red-600">{error}</p>
                    {attempts > 0 && attempts < 3 && (
                      <p className="text-xs text-red-500 mt-1">
                        残り試行回数: {3 - attempts}回
                      </p>
                    )}
                    {attempts >= 2 && (
                      <p className="text-xs text-red-500 mt-1">
                        試行回数を超過しました。ダッシュボードに戻ります...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-base py-3"
              disabled={!pin || pin.length !== 4 || attempts >= 3 || isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? '認証中...' : '管理者画面へ'}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-800">
                  管理者PINで認証できます。
                  管理者画面では、お世話の設定変更、統計確認、記録のリセットなどができます。
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="w-full text-sm py-3"
            disabled={attempts >= 3 || isLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ホーム画面に戻る
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
