'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Target,
  Trophy,
  FileText,
  User,
  CreditCard,
  LogOut,
  Home,
} from 'lucide-react';
import { useCareSettings } from '@/hooks/useCareSettings';
import { useCareLogs } from '@/hooks/useCareLogs';
import { useAuth } from '@/context/AuthContext';
import { getAuth, signOut } from 'firebase/auth';

export default function AdminPage() {
  // TODO_DBから取得したデータを表示するページ
  const router = useRouter();

  // 追加するhooksを呼ぶ
  // CareSettings取得
  const {
    careSettings,
    loading: settingsLoading,
    error: settingsError,
  } = useCareSettings();
  // careSettingsが取得できた後でcareLogsを呼ぶ
  const careSettingId = careSettings?.id ?? 0;
  const {
    careLog,
    loading: logsLoading,
    error: logsError,
  } = useCareLogs(careSettingId);

  // 現在の経過日数や目標日数、子どもの名前の状態管理
  const [consecutiveDays, setConsecutiveDays] = useState<number | null>(null);
  const [targetDays, setTargetDays] = useState<number>(0);
  const [childName, setChildName] = useState<string>('');
  const user = useAuth(); // 認証情報を取得

  console.log('[AdminPage] User:', user.currentUser);

  // ログアウト処理
  const handleLogout = () => {
    const auth = getAuth();
    signOut(auth)
      .then(() => {
        localStorage.clear();
        router.push('/onboarding/welcome');
      })
      .catch((error) => {
        console.error('Firebaseログアウト失敗:', error);
      });
  };

  // データを取得したらchildNameとconsecutiveDaysとtargetDaysを更新
  useEffect(() => {
    // careSettingsのデータが取得出来たら
    if (careSettings) {
      console.log(
        'adminぺージでcareSettingsのデータ取れているか:',
        careSettings
      );
      setChildName(careSettings.child_name);

      // 簡易版の連続達成日数計算
      // 開始日から今日までの経過日数を計算
      const startDate = new Date(careSettings.care_start_date);
      const today = new Date();

      // 日付の正規化（時刻を00:00:00に設定）
      startDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - startDate.getTime();
      const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // 開始日を含む

      if (careLog && careLog.care_log_id !== null) {
        // 今日のお世話記録がある場合、経過日数を連続日数とする
        // TODO: 将来的には過去の記録も確認して真の連続性をチェック
        setConsecutiveDays(daysPassed);
      } else if (daysPassed > 1) {
        // 2日目以降で今日の記録がない場合は、昨日までの日数
        setConsecutiveDays(daysPassed - 1);
      } else {
        // 初日で記録がない場合は0
        setConsecutiveDays(0);
      }

      // 目標日数を設定
      const endDate = new Date(careSettings.care_end_date);

      // 日付の正規化（時刻を00:00:00に設定）
      const normalizedStartDate = new Date(startDate);
      const normalizedEndDate = new Date(endDate);
      normalizedStartDate.setHours(0, 0, 0, 0);
      normalizedEndDate.setHours(0, 0, 0, 0);

      const targetDiffTime =
        normalizedEndDate.getTime() - normalizedStartDate.getTime();
      const targetDiffDays =
        Math.floor(targetDiffTime / (1000 * 60 * 60 * 24)) + 1; // 開始日を含む

      setTargetDays(targetDiffDays);
    }
  }, [careSettings, careLog]); // careLogも依存に追加

  // =========================
  // 目標カードだけ分岐レンダリング
  // =========================
  const renderGoalCard = () => {
    if (settingsLoading || logsLoading) {
      return (
        <Card className="mb-4 border-orange-200">
          <CardContent>
            <p className="text-center text-gray-500 py-4">読み込み中...</p>
          </CardContent>
        </Card>
      );
    }

    if (settingsError || logsError) {
      return (
        <Card className="mb-4 border-orange-200">
          <CardContent>
            <p className="text-center text-red-500 py-4">
              エラーが発生しました
            </p>
          </CardContent>
        </Card>
      );
    }

    if (!careSettings || consecutiveDays === null || childName === '') {
      return (
        <Card className="mb-4 border-orange-200">
          <CardContent>
            <p className="text-center text-gray-500 py-4">データがありません</p>
          </CardContent>
        </Card>
      );
    }

    if (!careLog || careLog.care_log_id === null) {
      return (
        <Card className="mb-4 border-orange-200">
          <CardContent>
            <p className="text-center text-orange-800 py-4">
              今日はまだお世話記録がありません
            </p>
          </CardContent>
        </Card>
      );
    }

    // ここまで来たらすべてのデータOK(careLogがあるならreturnできる)
    return (
      <Card className="mb-4 border-orange-200">
        <CardHeader className="pb-3">
          <h2 className="text-lg font-bold flex items-center">
            <Target className="mr-2 h-5 w-5 text-orange-500" />
            {consecutiveDays > 0
              ? `${childName}さん、${consecutiveDays}日達成中！`
              : `${childName}さん、今日もがんばろう！`}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
              <p className="text-center font-medium text-orange-800">
                {targetDays}日連続でお世話を達成しよう！
              </p>
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-orange-700">
                    現在の連続日数
                  </span>
                  <span className="text-sm font-bold text-orange-800">
                    {consecutiveDays}/{targetDays}日
                  </span>
                </div>
                <Progress
                  value={(consecutiveDays / targetDays) * 100}
                  className="h-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  console.log('adminページでcareLog確認:', careLog);
  console.log('adminページでcareSettings確認:', careSettings);
  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-4 py-6">
      <div className="w-full max-w-xs">
        {/* 家族会議で決めた目標 */}
        {renderGoalCard()}

        {/* ナビゲーションボタン */}
        <div className="space-y-3">
          {/* ユーザー情報 */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-4 border-orange-200 hover:bg-orange-50"
            onClick={() => router.push('/admin/user-info')}
          >
            <User className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-orange-800">ユーザー情報</span>
          </Button>

          {/* プレミアムプラン */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-4 border-orange-200 hover:bg-orange-50"
            onClick={() => router.push('/admin/payment')}
          >
            <CreditCard className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-orange-800">プレミアムプラン購入</span>
          </Button>

          {/* 反省文を見る */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-4 border-orange-200 hover:bg-orange-50"
            onClick={() => router.push('/admin/reflections')}
          >
            <FileText className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-orange-800">反省文を見る</span>
          </Button>

          {/* 目標達成！（条件付き表示） */}
          {consecutiveDays !== null &&
            targetDays > 0 &&
            consecutiveDays > 0 &&
            consecutiveDays >= targetDays && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
                <p className="text-sm text-green-700 mb-3 text-center">
                  目標達成！
                </p>
                <Button
                  className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center py-4"
                  onClick={() => router.push('/admin/goal-clear')}
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  クリアおめでとう
                </Button>
              </div>
            )}

          {/* 戻るボタン */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-4 border-orange-200 hover:bg-orange-50"
            onClick={() => router.push('/dashboard')}
          >
            <Home className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-orange-800">ホーム画面に戻る</span>
          </Button>

          {/* ログアウトボタン */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center py-4 border-orange-200 hover:bg-orange-50"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-5 w-5 text-orange-600" />
            <span className="text-orange-800">ログアウト</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
