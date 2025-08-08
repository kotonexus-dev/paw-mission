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
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Dog,
  Loader2,
  Heart,
} from 'lucide-react'; // lucide-reactアイコン
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Firebase初期化モジュールを作成しておく
// import { useAuth } from '@/context/AuthContext';

// ローディング状態のタイプ定義
type LoadingStep = 'idle' | 'firebase' | 'token' | 'database' | 'redirect';

export default function OnboardingLoginPage() {
  // DB：usersテーブルに対応
  const router = useRouter(); // Next.jsのフックページ遷移などに使う
  const [email, setEmail] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [password, setPassword] = useState('');
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle'); // ローディング状態管理
  const [error, setError] = useState(''); // エラーメッセージ表示用
  // const user = useAuth();

  // console.log('[OnboardingLoginPage] User:', user.currentUser);

  // ローディングステップのテキスト取得
  const getLoadingText = (step: LoadingStep) => {
    switch (step) {
      case 'firebase':
        return 'アカウント作成中...';
      case 'token':
        return '認証情報取得中...';
      case 'database':
        return 'ユーザー情報保存中...';
      case 'redirect':
        return 'loading...';
      default:
        return '';
    }
  };

  // ローディング進捗計算
  const getLoadingProgress = (step: LoadingStep) => {
    switch (step) {
      case 'firebase':
        return 25;
      case 'token':
        return 50;
      case 'database':
        return 75;
      case 'redirect':
        return 100;
      default:
        return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // エラーをリセット

    // email または password が未入力、または password が6文字未満ならエラー
    if (!email || password.length !== 6) {
      setError('メールアドレスと6桁のパスワードを正しく入力してください');
      return;
    }

    try {
      if (isNewUser) {
        // ステップ1: Firebase Auth に新規ユーザー登録
        setLoadingStep('firebase');
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const firebaseUID = userCredential.user.uid;

        // ステップ2: IDトークン取得
        setLoadingStep('token');
        const idToken = await userCredential.user.getIdToken();

        // ステップ3: ユーザー情報をdbに登録
        setLoadingStep('database');
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              firebase_uid: firebaseUID,
              email,
              current_plan: 'free',
              is_verified: true,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('ユーザー登録に失敗しました');
        }

        // ステップ4: 画面遷移
        setLoadingStep('redirect');
        await new Promise((resolve) => {
          setTimeout(resolve, 300); // ユーザーが完了状態を確認できるよう短時間待機
        });
        router.push('/onboarding/name');
      } else {
        // ステップ1: Firebase Auth ログイン処理
        setLoadingStep('firebase');
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // ステップ2: IDトークン取得
        setLoadingStep('token');
        const idToken = await userCredential.user.getIdToken();

        // ステップ3: バックエンドでユーザー存在チェック
        setLoadingStep('database');
        const userCheckResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!userCheckResponse.ok) {
          if (userCheckResponse.status === 404) {
            // ユーザーがデータベースに存在しない場合
            setError('アカウントが見つかりません。新規登録を行ってください。');
            // Firebase からログアウト
            await signOut(auth);
            setLoadingStep('idle'); // ローディング状態をリセット
            return;
          }
          // その他のエラー
          throw new Error('ユーザー情報の取得に失敗しました');
        }

        // ステップ4: ダッシュボードへ遷移
        setLoadingStep('redirect');
        await new Promise((resolve) => {
          setTimeout(resolve, 300);
        });
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(`エラー: ${err.message}`);
      // console.error('Firebase Auth / DB登録失敗:', err);
      setLoadingStep('idle'); // エラー時はローディング状態をリセット
    }
  };

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <Card className="w-full max-w-xs shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-2 pb-2">
          <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Dog className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-center">わん🐾みっしょん</h1>
          <Progress value={40} className="w-full" />
          <p className="text-center text-base text-muted-foreground">
            ステップ 1/4
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          {/* ユーザータイプ選択 */}
          <div className="relative mb-6 bg-orange-50 rounded-lg p-1 overflow-hidden border border-orange-200">
            {/* 下部の黒線 */}
            <div
              className={`absolute bottom-0 left-0 h-1 w-1/2 bg-orange-800 rounded-b-md transition-transform duration-300 ${
                isNewUser ? 'translate-x-0' : 'translate-x-full'
              }`}
            />
            <div className="flex">
              <Button
                variant="ghost"
                className={`flex-1 text-sm z-10 relative py-2 px-4 ${
                  isNewUser ? 'text-black' : 'text-muted-foreground'
                }`}
                onClick={() => setIsNewUser(true)}
                disabled={loadingStep !== 'idle'}
              >
                新規登録
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 text-sm z-10 relative py-2 px-4 ${
                  !isNewUser ? 'text-black' : 'text-muted-foreground'
                }`}
                onClick={() => setIsNewUser(false)}
                disabled={loadingStep !== 'idle'}
              >
                ログイン
              </Button>
            </div>
          </div>

          {/* ローディング進捗表示 - dashboardスタイルに合わせたデザイン */}
          {loadingStep !== 'idle' && (
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
                {getLoadingText(loadingStep)}
              </h2>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${getLoadingProgress(loadingStep)}%` }}
                />
              </div>

              <p className="text-sm text-orange-600 font-medium mb-4">
                {getLoadingProgress(loadingStep)}% 完了
              </p>

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
                htmlFor="email"
                className="text-base flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                メールアドレス
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loadingStep !== 'idle'}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-base flex items-center gap-2"
              >
                <Lock className="h-4 w-4" />
                パスワード(6桁)
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPin ? 'text' : 'password'}
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPassword(value);
                  }}
                  required
                  disabled={loadingStep !== 'idle'}
                  className="pr-10 text-center text-2xl tracking-widest"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPin(!showPin)}
                  disabled={loadingStep !== 'idle'}
                  aria-label={showPin ? 'PINを隠す' : 'PINを表示'}
                >
                  {showPin ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {isNewUser && (
                <p className="text-sm text-muted-foreground">
                  覚えやすい6桁の数字を設定してください
                </p>
              )}
            </div>

            {!isNewUser && (
              <div className="text-right">
                <Button
                  variant="link"
                  className="text-sm text-orange-600 hover:text-orange-700 p-0"
                  disabled={loadingStep !== 'idle'}
                >
                  パスワードをお忘れですか？
                </Button>
              </div>
            )}

            {/* エラーメッセージ表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-base py-3"
              disabled={
                !email || password.length !== 6 || loadingStep !== 'idle'
              }
            >
              {loadingStep !== 'idle' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {loadingStep !== 'idle'
                ? getLoadingText(loadingStep)
                : isNewUser
                  ? '新規登録して続ける'
                  : 'ログインして続ける'}
            </Button>
          </form>

          {isNewUser && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                新規登録の場合、次のステップでご家族の情報を入力していただきます。
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding/welcome')}
            className="w-1/3 text-sm py-3"
            disabled={loadingStep !== 'idle'}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <div className="w-2/3 ml-2 text-center">
            <p className="text-xs text-muted-foreground">
              続行することで
              <Button variant="link" className="text-xs p-0 h-auto">
                利用規約
              </Button>
              に同意したものとみなします
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
