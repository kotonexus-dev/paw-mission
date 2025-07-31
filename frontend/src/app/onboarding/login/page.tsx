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
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Dog } from 'lucide-react'; // lucide-reactアイコン
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Firebase初期化モジュールを作成しておく
import { useAuth } from '@/context/AuthContext';

export default function OnboardingLoginPage() {
  // DB：usersテーブルに対応
  const router = useRouter(); // Next.jsのフックページ遷移などに使う
  const [email, setEmail] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [password, setPassword] = useState('');
  const user = useAuth(); // 認証情報を取得

  console.log('[OnboardingLoginPage] User:', user.currentUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // email または password が未入力、または password が6文字未満ならエラー
    if (!email || password.length !== 6) {
      alert('メールアドレスと6桁のパスワードを正しく入力してください');
      return;
    }

    try {
      if (isNewUser) {
        // Firebase Auth に新規ユーザー登録
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const firebaseUID = userCredential.user.uid;

        // IDトークン取得
        const idToken = await userCredential.user.getIdToken();

        // ユーザー情報をdbに登録
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
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
        });

        // ✅ ご家族情報入力画面へ
        router.push('/onboarding/name');
      } else {
        // ✅ Firebase Auth ログイン処理
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // IDトークン取得
        const idToken = await userCredential.user.getIdToken();

        // バックエンドでユーザー存在チェック
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
            alert('アカウントが見つかりません。新規登録を行ってください。');
            // Firebase からログアウト
            await signOut(auth);
            return;
          }
          // その他のエラー
          throw new Error('ユーザー情報の取得に失敗しました');
        }

        // ✅ ユーザー存在確認後、ダッシュボードへ
        router.push('/dashboard');
      }
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
      console.error('Firebase Auth / DB登録失敗:', error);
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
              >
                新規登録
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 text-sm z-10 relative py-2 px-4 ${
                  !isNewUser ? 'text-black' : 'text-muted-foreground'
                }`}
                onClick={() => setIsNewUser(false)}
              >
                ログイン
              </Button>
            </div>
          </div>

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
                >
                  パスワードをお忘れですか？
                </Button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-base py-3"
              disabled={!email || password.length !== 6}
            >
              {isNewUser ? '新規登録して続ける' : 'ログインして続ける'}
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
