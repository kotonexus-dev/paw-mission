'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { /* Calendar, */ Heart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';

type ReflectionNote = {
  id: number;
  content: string;
  approved_by_parent: boolean;
  created_at: string;
  updated_at: string;
  care_setting_id: number;
  date: string;
};

export default function ReflectionsPage() {
  const router = useRouter();
  // const [activeTab, setActiveTab] = useState('all'); // カレンダー非表示
  const [reflectionData, setReflectionData] = useState<ReflectionNote[]>([]);
  const [isLoading, setIsLoading] = useState(true); // ローディング状態を追加
  const [isApproving, setIsApproving] = useState(false); // 承認処理中フラグ
  const [showDialog, setShowDialog] = useState(false); // ダイアログ表示フラグ
  const [dialogContent, setDialogContent] = useState({
    title: '',
    description: '',
  }); // ダイアログ内容
  const user = useAuth(); // 認証情報を取得

  console.log('[ReflectionsPage] User:', user.currentUser);

  // Firebase認証ヘッダーを取得する関数
  const getAuthHeaders = useCallback(async (): Promise<
    Record<string, string>
  > => {
    if (!user.currentUser) return {};

    try {
      const idToken = await user.currentUser.getIdToken();
      return {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.error('IDトークンの取得に失敗しました:', error);
      return {};
    }
  }, [user.currentUser]);

  useEffect(() => {
    const fetchReflectionNotes = async () => {
      // ユーザーが認証されていない場合は実行しない
      if (!user.currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const headers = await getAuthHeaders();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/reflection_notes`,
          {
            headers,
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        // データが配列でない場合は空配列を設定
        setReflectionData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('反省文の取得に失敗しました', err);
        setReflectionData([]); // エラー時は空配列を設定
      } finally {
        setIsLoading(false);
      }
    };

    fetchReflectionNotes();
  }, [user.currentUser, getAuthHeaders]);

  // お世話再チャレンジ承認ハンドラー
  const handleApproveRechallenge = async () => {
    setIsApproving(true);
    try {
      const headers = await getAuthHeaders();

      console.log('=== お世話再チャレンジ承認処理開始 ===');

      // Step 1: care_settingsを取得して日付範囲を確認
      console.log('Step 1: care_settings取得中...');
      const settingsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/care_settings/me`,
        {
          headers,
        }
      );

      if (!settingsRes.ok) {
        throw new Error(`Care settings取得失敗: ${settingsRes.status}`);
      }

      const settingsData = await settingsRes.json();
      console.log('Care settings:', settingsData);

      if (
        !settingsData ||
        !settingsData.care_start_date ||
        !settingsData.care_end_date
      ) {
        throw new Error('Care settingsに開始日・終了日が設定されていません');
      }

      const careSettingId = settingsData.id;
      const startDate = new Date(settingsData.care_start_date);
      const endDate = new Date(settingsData.care_end_date);

      console.log(
        `日付範囲: ${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`
      );

      // Step 2: 全care_logsを取得
      console.log('Step 2: care_logs一覧取得中...');
      const careLogsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/care_logs/list?care_setting_id=${careSettingId}`,
        {
          headers,
        }
      );

      if (!careLogsRes.ok) {
        throw new Error(`Care logs一覧取得失敗: ${careLogsRes.status}`);
      }

      const careLogsData = await careLogsRes.json();
      console.log('全care_logs:', careLogsData);

      // Step 3: 日付範囲内のcare_logsをフィルタリング（昨日まで）
      console.log('Step 3: 日付範囲内care_logsフィルタリング中...');

      // 昨日の日付を取得（今日の記錄は更新しない）- JST時間で計算
      const currentday = new Date();
      // 昨日 = 本日の時間 - 1日（24時間）
      const yesterdayUtc = new Date(currentday.getTime() - 24 * 60 * 60 * 1000);
      // JST時間に変換（+9時間）
      const jstYesterday = new Date(
        yesterdayUtc.getTime() + 9 * 60 * 60 * 1000
      );

      // endDateと比較するため、JST時間で昨日の日付を取得
      const yesterdayJst = new Date(
        `${jstYesterday.toISOString().split('T')[0]}T00:00:00.000Z`
      );
      const actualEndDate = yesterdayJst < endDate ? yesterdayJst : endDate;

      console.log(
        `実際の終了日: ${actualEndDate.toISOString().split('T')[0]} (今日は除外、JST基準)`
      );

      const targetCareLogs = careLogsData.care_logs.filter((log: any) => {
        const logDate = new Date(log.date);
        const isInRange = logDate >= startDate && logDate <= actualEndDate;

        console.log(
          `ログ日付: ${log.date}, 開始日以降: ${logDate >= startDate}, 終了日以前: ${logDate <= actualEndDate}, 対象: ${isInRange}`
        );

        return isInRange;
      });

      console.log(`対象care_logs数: ${targetCareLogs.length}`);
      console.log('対象care_logs:', targetCareLogs);

      if (targetCareLogs.length === 0) {
        console.log('対象期間内にcare_logsが見つかりません');
        alert('対象期間内にお世話記録が見つかりません');
        return;
      }

      // Step 4: 各care_logの walk_result を true に更新（並列処理）
      console.log('Step 4: care_logs個別更新中...');

      const updatePromises = targetCareLogs.map(async (log: any) => {
        console.log(`更新中: care_log_id=${log.id}, date=${log.date}`);

        const updateRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/care_logs/${log.id}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              walk_result: true,
            }),
          }
        );

        if (!updateRes.ok) {
          throw new Error(`Care log更新失敗: ${updateRes.status}`);
        }

        const updatedLog = await updateRes.json();
        console.log(`更新成功: care_log_id=${log.id}`, updatedLog);
        return updatedLog;
      });

      const updatedLogs = await Promise.all(updatePromises);
      const updatedCount = updatedLogs.length;

      console.log(`Care logs更新完了: ${updatedCount}件更新`);

      // Step 5: reflection_notesの個別承認
      console.log('Step 5: reflection_notes個別承認中...');

      // 全ての反省文を取得
      console.log('反省文取得開始...');
      const allReflectionRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/reflection_notes`,
        {
          method: 'GET',
          headers,
        }
      );

      console.log(
        '反省文取得レスポンス:',
        allReflectionRes.status,
        allReflectionRes.statusText
      );

      if (!allReflectionRes.ok) {
        throw new Error(`反省文取得失敗: ${allReflectionRes.status}`);
      }

      console.log('反省文レスポンスボディ読み取り開始...');
      const allReflectionNotes = await allReflectionRes.json();
      console.log('全反省文:', allReflectionNotes);

      // 未承認の反省文を特定
      const unapprovedNotes = allReflectionNotes.filter(
        (note: any) => !note.approved_by_parent
      );
      console.log(`未承認の反省文数: ${unapprovedNotes.length}`);

      // 各反省文を個別に承認（並列処理）
      const approvePromises = unapprovedNotes.map(async (note: any) => {
        console.log(`承認中: reflection_note_id=${note.id}`);

        try {
          const approveRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/reflection_notes/${note.id}`,
            {
              method: 'PATCH',
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                approved_by_parent: true,
              }),
            }
          );

          console.log(
            `承認レスポンス (ID:${note.id}):`,
            approveRes.status,
            approveRes.statusText
          );

          if (!approveRes.ok) {
            throw new Error(`反省文承認失敗: ${approveRes.status}`);
          }

          console.log(`承認レスポンスボディ読み取り開始 (ID:${note.id})...`);
          const approvedNote = await approveRes.json();
          console.log(`承認成功: reflection_note_id=${note.id}`, approvedNote);
          return approvedNote;
        } catch (error) {
          console.error(`個別承認エラー (ID:${note.id}):`, error);
          throw error;
        }
      });

      const approvedNotes = await Promise.all(approvePromises);
      const approvedCount = approvedNotes.length;

      console.log(`反省文承認完了: ${approvedCount}件承認`);

      // 成功メッセージ
      console.log('=== 承認処理完了 ===');
      console.log(`Care logs更新數: ${updatedCount}`);
      console.log(`反省文更新數: ${approvedCount}`);

      // 成功後にダイアログを表示
      setDialogContent({
        title: '承認が完了しました',
        description: 'お世話を再開します。ホーム画面に戻ります。',
      });

      setShowDialog(true);
    } catch (error) {
      console.error('承認処理に失敗しました:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      alert(`承認処理に失敗しました: ${errorMessage}`);
    } finally {
      setIsApproving(false);
    }
  };

  // ダイアログを閉じてダッシュボードに遷移
  const handleDialogClose = () => {
    setShowDialog(false);
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-orange-50 to-orange-100 px-4 sm:px-6 py-6">
      <div className="w-full max-w-xs">
        <Tabs
          defaultValue="all"
          className="w-full"
          // onValueChange={setActiveTab} // カレンダー非表示
        >
          <TabsList className="grid w-full grid-cols-1 mb-4">
            <TabsTrigger value="all" className="border-orange-200">
              すべての反省文
            </TabsTrigger>
            {/* <TabsTrigger value="calendar">カレンダー表示</TabsTrigger> */}
          </TabsList>
          <TabsContent value="all">
            <div className="space-y-4">
              {isLoading && (
                <div className="flex justify-center items-center p-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">読み込み中...</p>
                  </div>
                </div>
              )}

              {!isLoading && reflectionData.length === 0 && (
                <Card className="bg-white border-orange-200">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">反省文がありません</p>
                  </CardContent>
                </Card>
              )}

              {!isLoading &&
                reflectionData.length > 0 &&
                reflectionData.map((reflection) => (
                  <Card
                    key={reflection.id}
                    className="bg-white border-orange-200"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <h2 className="text-base sm:text-lg font-medium">
                          {reflection.approved_by_parent
                            ? '再チャレンジ済み'
                            : '未承認の反省文'}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                          {new Date(reflection.created_at).toLocaleDateString(
                            'ja-JP'
                          )}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm sm:text-base">
                        {reflection.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
          {/* <TabsContent value="calendar">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <h2 className="text-base sm:text-lg font-medium">
                    2023年6月
                  </h2>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-1" />
                    月を選択
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                    <div key={day} className="text-xs font-medium py-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                    const hasReflection = reflectionData.some(
                      (r) => new Date(r.date).getDate() === day
                    );
                    return (
                      <Button
                        key={day}
                        variant={hasReflection ? 'default' : 'outline'}
                        className={`h-10 w-full ${
                          hasReflection
                            ? 'bg-orange-200 hover:bg-orange-300 text-orange-800'
                            : ''
                        }`}
                        onClick={() => {
                          if (hasReflection) {
                            setActiveTab('all');
                          }
                        }}
                      >
                        {day}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent> */}
        </Tabs>
        <Button
          className={`w-full mt-6 ${
            isApproving
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600'
          }`}
          onClick={handleApproveRechallenge}
          disabled={isApproving}
        >
          {isApproving ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              承認処理中...
            </div>
          ) : (
            <>
              <Heart className="mr-2 h-4 w-4" />
              お世話再チャレンジ承認
            </>
          )}
        </Button>

        {/* ホームに戻るボタン */}
        <Button
          variant="outline"
          className="w-full mt-4 border-orange-200 hover:bg-orange-50 text-orange-800"
          onClick={() => router.push('/admin')}
        >
          管理者画面に戻る
        </Button>
      </div>

      {/* ダイアログ部分 */}
      <Dialog open={showDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="bg-white rounded-lg max-w-xs mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              {dialogContent.title}
            </DialogTitle>
            <DialogDescription className="text-center pt-2 text-base whitespace-pre-line">
              {dialogContent.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={handleDialogClose}
              className="bg-black text-white border border-white px-6 py-2 rounded-lg shadow-none hover:bg-gray-800 active:bg-gray-900"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
