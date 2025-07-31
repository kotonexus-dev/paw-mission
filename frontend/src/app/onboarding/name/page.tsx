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
import { ArrowLeft, Users, Heart } from 'lucide-react'; // lucide-reactアイコン
import { useAuth } from '@/context/AuthContext';

export default function NamePage() {
  // DB：care_settingsテーブルに対応
  const router = useRouter(); // Next.jsのフックページ遷移などに使う
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [dogName, setdogName] = useState(''); // 親名前、子ども名前、ペット名前未入力
  const user = useAuth(); // 認証情報を取得

  console.log('[NamePage] User:', user.currentUser);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parentName.trim() && childName.trim() && dogName.trim()) {
      // 家族情報を保存
      const familyData = {
        parentName: parentName.trim(),
        childName: childName.trim(),
        dogName: dogName.trim(),
      };
      localStorage.setItem('familyInfo', JSON.stringify(familyData));
      console.log('[NamePage] Saving family info:', familyData);

      router.push('/onboarding/first-settings'); // 次のページへ遷移
    }
  };

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <Card className="bg-white w-full max-w-xs shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-2 pb-2">
          <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Users className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-center">ご家族の情報</h1>
          <Progress value={60} className="w-full" />
          <p className="text-center text-base text-muted-foreground">
            ステップ 2/4
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="parentName"
                className="text-base flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                お父さんお母さんの名前
              </Label>
              <Input
                id="parentName"
                placeholder="山田 太郎"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="childName"
                className="text-base flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                お子さんの名前
              </Label>
              <Input
                id="childName"
                placeholder="山田 花子"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="dogName"
                className="text-base flex items-center gap-2"
              >
                <Heart className="h-4 w-4 text-red-500" />
                ペットの名前
              </Label>
              <Input
                id="dogName"
                placeholder="ポチ"
                value={dogName}
                onChange={(e) => setdogName(e.target.value)}
                required
                className="text-base"
              />
              <p className="text-sm text-muted-foreground">
                わんちゃんの名前を入力してください
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                ご入力いただいた情報はアプリ内でのみ使用され、わんちゃんとの楽しい時間をパーソナライズするために活用されます。
              </p>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding/login')}
            className="w-1/3 text-sm py-3"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <Button
            className="w-2/3 ml-2 bg-orange-500 hover:bg-orange-600 text-sm py-3"
            onClick={handleSubmit}
            disabled={
              !parentName.trim() || !childName.trim() || !dogName.trim()
            }
          >
            次へ
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
