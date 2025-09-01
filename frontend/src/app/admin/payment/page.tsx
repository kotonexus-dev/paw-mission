'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Crown, MessageCircle, Heart } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();

  const features = [
    {
      icon: MessageCircle,
      title: 'わんことおはなし機能',
      description:
        'AIを使ってわんちゃんと楽しく会話ができます。わんちゃんの気持ちがもっとわかるようになります！',
      color: 'text-blue-500',
    },
    {
      icon: Heart,
      title: '保護犬・保護猫支援',
      description:
        '料金の一部が保護犬・保護猫団体に寄付されます。あなたのお世話が困っている動物たちの支援につながります。',
      color: 'text-red-500',
    },
  ];

  // 決済ボタンを押したときのハンドラー
  const handleCheckout = async () => {
    setLoading(true);
    try {
      const token = await currentUser?.getIdToken(); // FirebaseのIDトークンを取得

      if (!token) {
        // console.error(
        //   'Firebaseトークンが取得できません。ログイン状態を確認してください。'
        // );
        return;
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            firebase_uid: currentUser?.uid,
          }),
        }
      );
      const data = await res.json();

      if (!res.ok) {
        // サーバーがエラー返したとき
        toast.error(data.error || data.detail || '決済できませんでした。');
        return;
      }

      if (data.url) {
        // StripeのCheckoutセッションURLにリダイレクト
        window.location.href = data.url;
      } else {
        // URLが取得できなかった場合のエラーハンドリング
        // console.error('決済ページURLの取得に失敗しました。');
      }
    } catch (error) {
      // console.error('決済ページへの遷移中にエラーが発生しました。', error);
    } finally {
      setLoading(false);
    }
  };

  // 認証ローディング中は早期リターン
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-orange-600">認証確認中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合は welcome に遷移して早期リターン
  if (!currentUser) {
    router.push('/onboarding/welcome');
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-4 py-6">
      <div className="w-full max-w-xs">
        {/* プレミアムプラン紹介カード */}
        <Card className="mb-6 shadow-lg border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader className="pb-3 text-center">
            <div className="flex items-center justify-center mb-2">
              <Crown className="h-8 w-8 text-yellow-500 mr-2" />
              <h2 className="text-xl font-bold text-orange-800">
                わん🐾みっしょん
              </h2>
            </div>
            <h3 className="text-xl font-bold text-orange-800">
              プレミアムプラン
            </h3>
            <div className="mt-3">
              <span className="text-3xl font-bold text-orange-800">¥300</span>
              <span className="text-sm text-orange-600"> / 1回買い切り</span>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-orange-200"
                  >
                    <Icon
                      className={`h-6 w-6 ${feature.color} mt-0.5 flex-shrink-0`}
                    />
                    <div>
                      <h3 className="font-medium text-orange-800 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-orange-700">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 決済ボタン */}
            <div className="mt-6">
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? '処理中...' : '決済ページへ進む'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 戻るボタン */}
        <Button
          variant="outline"
          className="w-full border-orange-200 hover:bg-orange-50 text-orange-800"
          onClick={() => router.push('/admin')}
        >
          管理者画面に戻る
        </Button>
      </div>
    </div>
  );
}
