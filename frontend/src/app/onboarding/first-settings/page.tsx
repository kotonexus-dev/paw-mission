'use client';

import { useState, useEffect } from 'react';
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
  Calendar,
  Coffee,
  Utensils,
  Footprints,
} from 'lucide-react'; // lucide-reactアイコン
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';

export default function CareSettingsPage() {
  // DB：care_settingテーブルに対応
  // あさごはん、夕ご飯、散歩時間など設定用
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [morningMealTime, setMorningMealTime] = useState('');
  const [eveningMealTime, setEveningMealTime] = useState('');
  const [walkTime, setWalkTime] = useState('');
  const [error, setError] = useState('');
  const user = useAuth(); // 認証情報を取得

  console.log('[CareSettingsPage] User:', user.currentUser);

  // 今日の日付（YYYY-MM-DD形式、最小日付用）
  // クライアント側でのみ日付を設定
  const [today, setToday] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 日本時間の今日の日付を取得（UTC+9）
    const now = new Date();
    const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayJST = jstDate.toISOString().split('T')[0];
    setToday(todayJST);
    console.log('[CareSettingsPage] JST今日の日付:', todayJST);
  }, []);

  // 指定した時間範囲で30分刻みの時間リストを生成する関数
  // 例: generateTimeOptions(6, 10) => ["6:00", "6:30", ..., "10:30"]
  const generateTimeOptions = (startHour: number, endHour: number) => {
    const options: string[] = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
      options.push(`${hour}:00`);
      options.push(`${hour}:30`);
    }
    return options;
  };

  // 各時間帯ごとの選択肢（プロダクト要件に合わせて調整可）
  const morningMealOptions = generateTimeOptions(6, 10); // 6:00～10:30
  const eveningMealOptions = generateTimeOptions(17, 22); // 17:00～22:30
  const walkTimeOptions = generateTimeOptions(6, 21); // 6:00～21:30

  // フォーム送信時のバリデーション・保存
  const handleSubmit = () => {
    if (!startDate) {
      setError('お世話スタート日を選択してください');
      return;
    }
    if (!endDate) {
      setError('お世話終了日を選択してください');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('終了日はスタート日より後の日付を選択してください');
      return;
    }
    if (!morningMealTime) {
      setError('朝ごはんの時間を選択してください');
      return;
    }
    if (!eveningMealTime) {
      setError('夕ご飯の時間を選択してください');
      return;
    }
    if (!walkTime) {
      setError('お散歩時間を選択してください');
      return;
    }

    // お世話設定をローカルストレージに保存
    const careSettings = {
      care_start_date: startDate,
      care_end_date: endDate,
      morning_meal_time: morningMealTime,
      night_meal_time: eveningMealTime, // ← night_meal_time に統一
      walk_time: walkTime,
    };
    localStorage.setItem('careSettings', JSON.stringify(careSettings));
    localStorage.setItem('lastCareTime', new Date().toISOString());
    console.log('[CareSettingsPage] Saved care settings:', careSettings);

    // 次の画面へ遷移
    router.push('/onboarding/admin-pin');
  };

  // フォーム全項目が埋まっているか
  const isFormComplete =
    startDate && endDate && morningMealTime && eveningMealTime && walkTime;

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-6 py-8">
      <Card className="w-full max-w-xs shadow-lg">
        <CardHeader className="flex flex-col items-center space-y-2 pb-2">
          <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Calendar className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-center">お世話設定</h1>
          <Progress value={80} className="w-full" />
          <p className="text-center text-base text-muted-foreground">
            ステップ 3/4
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* お世話期間設定 */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-center">
                📅 お世話期間
              </h3>
              <div className="space-y-2">
                <Label
                  htmlFor="startDate"
                  className="text-sm flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-green-500" />
                  お世話スタート日
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  min={mounted ? today : undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setError('');
                  }}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="endDate"
                  className="text-sm flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4 text-red-500" />
                  お世話終了日
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  min={startDate || (mounted ? today : undefined)}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setError('');
                  }}
                  className="text-base"
                />
              </div>
            </div>

            {/* お世話時間設定 */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-center">
                ⏰ お世話時間
              </h3>

              {/* 朝ごはんの時間 */}
              <div className="space-y-2">
                <Label
                  htmlFor="morningMeal"
                  className="text-sm flex items-center gap-2"
                >
                  <Coffee className="h-4 w-4 text-yellow-600" />
                  朝ごはんの時間
                </Label>
                <Select
                  value={morningMealTime}
                  onValueChange={(value) => {
                    setMorningMealTime(value);
                    setError('');
                  }}
                >
                  <SelectTrigger
                    id="morningMeal"
                    className="text-base bg-white"
                  >
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg rounded-md border border-black">
                    {morningMealOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 夕ご飯の時間 */}
              <div className="space-y-2">
                <Label
                  htmlFor="eveningMeal"
                  className="text-sm flex items-center gap-2"
                >
                  <Utensils className="h-4 w-4 text-orange-600" />
                  夕ご飯の時間
                </Label>
                <Select
                  value={eveningMealTime}
                  onValueChange={(value) => {
                    setEveningMealTime(value);
                    setError('');
                  }}
                >
                  <SelectTrigger
                    id="eveningMeal"
                    className="text-base bg-white"
                  >
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg rounded-md border border-black">
                    {eveningMealOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* お散歩時間 */}
              <div className="space-y-2">
                <Label
                  htmlFor="walkTime"
                  className="text-sm flex items-center gap-2"
                >
                  <Footprints className="h-4 w-4 text-blue-600" />
                  お散歩時間
                </Label>
                <Select
                  value={walkTime}
                  onValueChange={(value) => {
                    setWalkTime(value);
                    setError('');
                  }}
                >
                  <SelectTrigger id="walkTime" className="text-base bg-white">
                    <SelectValue placeholder="時間を選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-white shadow-lg rounded-md border border-black">
                    {walkTimeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 完了メッセージ */}
            {/* {isFormComplete && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 text-center">
                  設定完了！わんちゃんとの楽しい時間が始まります
                </p>
              </div>
            )} */}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/onboarding/name')}
            className="w-1/3 text-sm py-3"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <Button
            className="w-2/3 ml-2 bg-orange-500 hover:bg-orange-600 text-sm py-3"
            onClick={handleSubmit}
            disabled={!isFormComplete}
          >
            次へ
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
