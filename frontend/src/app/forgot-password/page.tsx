'use client';

// あってもいいけど操作不要ページ
import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dog, Mail, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const user = useAuth(); // 認証情報を取得

  console.log('[ForgotPasswordPage] User:', user.currentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ここでパスワードリセットメールを送信する処理を行います
    if (email) {
      setIsSubmitted(true);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      <div className="w-full max-w-md px-4">
        <Card className="w-full shadow-lg">
          <CardHeader className="flex flex-col items-center space-y-2 pb-2">
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
              <Dog className="h-10 w-10 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-center">
              パスワードをリセット
            </h1>
            <p className="text-center text-muted-foreground">
              登録したメールアドレスを入力してください
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
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
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={!email}
                >
                  リセットリンクを送信
                </Button>
              </form>
            ) : (
              <div className="py-4 text-center">
                <p className="mb-4">
                  {email} 宛にパスワードリセットのメールを送信しました。
                </p>
                <p>
                  メール内のリンクをクリックして、パスワードをリセットしてください。
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <Link href="/login">
              <Button variant="outline" className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                ログイン画面に戻る
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
