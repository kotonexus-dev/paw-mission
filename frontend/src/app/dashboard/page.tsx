'use client';

import { useState, useEffect, useCallback } from 'react';
// import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Heart,
  Footprints,
  Settings,
  Coffee,
  Utensils,
  Star,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// API エンドポイントのベース URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Dashboard Loading コンポーネント
const DashboardLoading = ({
  authLoading,
  currentUser,
  careSettings,
  careSettingsLoading,
}: {
  authLoading: boolean;
  currentUser: any;
  careSettings: any;
  careSettingsLoading: boolean;
}) => {
  const [progress, setProgress] = useState(0);

  // Loading効果
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95; // 最大95%、実際の完了まで待つ
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // ローディングが完了に近づいた時、プログレスバーを100%にする
  useEffect(() => {
    if (
      !authLoading &&
      currentUser &&
      careSettings?.id &&
      !careSettingsLoading
    ) {
      setProgress(100);
    }
  }, [authLoading, currentUser, careSettings?.id, careSettingsLoading]);

  // 状態に応じて表示メッセージを決定
  const getLoadingMessage = () => {
    if (authLoading) return '認証確認中...';
    if (!currentUser) return '認証が必要です';
    if (!careSettings?.id || careSettingsLoading)
      return 'ユーザー情報を取得中...';
    return '読み込み中...';
  };

  return (
    <div className="flex flex-col items-center justify-start pt-20 min-h-screen bg-gradient-to-b from-yellow-50 to-orange-100 px-6 py-8">
      <div className="w-full max-w-xs text-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="relative">
            <div className="h-32 w-32 rounded-full bg-orange-100 flex items-center justify-center">
              <Heart className="h-20 w-20 text-orange-500" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-orange-300 border-t-orange-500 animate-spin" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">
          {getLoadingMessage()}
        </h1>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div
            className="bg-orange-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-base text-orange-600 font-medium animate-pulse">
          LOADING...
        </p>

        <div className="mt-8 flex justify-center space-x-2">
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth(); // useAuthコンテキストのみ使用

  // care_settings の状態管理
  const [careSettings, setCareSettings] = useState<{
    id: number;
    parent_name: string;
    child_name: string;
    dog_name: string;
    care_start_date: string;
    care_end_date: string;
  } | null>(null);
  const [careSettingsLoading, setCareSettingsLoading] = useState(true);

  console.log('[Dashboard] User:', currentUser);

  // Firebase認証トークンを取得するヘルパー関数（walk/page.tsx のパターンを採用）
  const getFirebaseToken = useCallback(async (): Promise<string> => {
    if (!currentUser) {
      throw new Error('認証トークンが取得できませんでした');
    }
    const token = await currentUser.getIdToken();
    return token;
  }, [currentUser]);

  // お世話状態
  const [careLog, setCareLog] = useState({
    fed_morning: false,
    fed_night: false,
    walked: false,
    care_log_id: null,
  });
  const [loading, setLoading] = useState(false);
  // クライアント側でのみ日付を使用
  const [mounted, setMounted] = useState(false);
  // ダイアログ表示用の state
  const [showNoCareDialog, setShowNoCareDialog] = useState(false);

  // デバッグ用：loading状態を監視
  useEffect(() => {
    const info = {
      authLoading,
      currentUser: !!currentUser,
      careSettingsId: careSettings?.id,
      loading,
      careSettingsLoading,
      timestamp: new Date().toLocaleTimeString(),
    };
    console.log('[Dashboard] Loading状態:', info);
  }, [
    authLoading,
    currentUser,
    careSettings?.id,
    loading,
    careSettingsLoading,
  ]);

  // タイムアウト処理：15秒後に強制的にloading状態を解除
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (
        authLoading ||
        !currentUser ||
        !careSettings?.id ||
        loading ||
        careSettingsLoading
      ) {
        console.warn(
          '[Dashboard] Loading timeout - 強制的に次の画面に進みます'
        );
        console.warn('[Dashboard] 最終状態:', {
          authLoading,
          currentUser: !!currentUser,
          careSettingsId: careSettings?.id,
          loading,
          careSettingsLoading,
        });

        setLoading(false);
        setCareSettingsLoading(false);

        // 認証が完了していない場合はログインページへ
        if (!currentUser) {
          router.push('/onboarding/login');
        }
      }
    }, 15000); // 15秒

    return () => clearTimeout(timeout);
  }, [
    authLoading,
    currentUser,
    careSettings?.id,
    loading,
    careSettingsLoading,
    router,
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // care_settings を取得（認証完了後）
  useEffect(() => {
    if (authLoading || !currentUser) {
      // authLoading と currentUser を使用
      console.log('[Dashboard] 認証待ちまたは未認証のためAPIコール延期');
      return;
    }

    const fetchCareSettings = async () => {
      setCareSettingsLoading(true);
      try {
        const token = await getFirebaseToken();
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(`${API_BASE_URL}/api/care_settings/me`, {
          method: 'GET',
          headers,
        });

        if (res.ok) {
          const data = await res.json();
          setCareSettings({
            id: data.id,
            parent_name: data.parent_name,
            child_name: data.child_name,
            dog_name: data.dog_name,
            care_start_date: data.care_start_date,
            care_end_date: data.care_end_date,
          });
          console.log('[Dashboard] care_settings取得成功:', data);
        } else if (res.status === 404) {
          console.log(
            '[Dashboard] care_settings が見つかりません（新規ユーザー）'
          );
          // 新規ユーザーの場合、onboarding にリダイレクト
          router.push('/onboarding/welcome');
        } else {
          console.error(`[Dashboard] care_settings取得失敗: ${res.status}`);
        }
      } catch (error) {
        console.error('[Dashboard] care_settings取得エラー:', error);
      } finally {
        setCareSettingsLoading(false);
      }
    };

    fetchCareSettings();
  }, [authLoading, currentUser, router, getFirebaseToken]); // currentUser と getFirebaseToken に依存

  // お世話状態をAPIから取得（care_settings取得後に実行）
  useEffect(() => {
    if (!careSettings?.id || !mounted) return; // care_settings がない場合、またはマウント前は実行しない

    const fetchCareLog = async () => {
      setLoading(true);
      try {
        // 日本時間の今日の日付を取得（UTC+9）
        const now = new Date();
        const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const today = jstDate.toISOString().split('T')[0];

        const token = await getFirebaseToken();
        const headers = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch(
          `${API_BASE_URL}/api/care_logs/today?care_setting_id=${careSettings.id}&date=${today}`,
          {
            method: 'GET',
            headers,
          }
        );

        if (res.ok) {
          const data = await res.json();
          setCareLog({
            fed_morning: data.fed_morning,
            fed_night: data.fed_night,
            walked: data.walked,
            care_log_id: data.care_log_id || null,
          });
          console.log('[Dashboard] 今日のcare_log取得成功:', data);
        } else {
          console.error(`[Dashboard] care_log取得失敗: ${res.status}`);
        }
      } catch (error) {
        console.error('[Dashboard] care_log取得エラー:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCareLog();
  }, [careSettings?.id, mounted, getFirebaseToken]); // careSettings.id と mounted に依存

  // お世話開始日に初めてプレーするユーザーは、お世話開始日に前日の記録がなくても、dashboardから反省文まで飛ばないようロジック追加
  // 昨日の散歩状態を確認し、未実施ならば reflection-writing ページへリダイレクト
  useEffect(() => {
    if (!careSettings?.id || !mounted) return; // care_settings がない場合、またはマウント前は実行しない

    const checkYesterdayWalk = async () => {
      // 本日の時間を取得
      const currentday = new Date();
      // 昨日 = 本日の時間 - 1日（24時間）
      const yesterday = new Date(currentday.getTime() - 24 * 60 * 60 * 1000);
      // JST時間に変換（+9時間）
      const jstYesterdayDate = new Date(
        yesterday.getTime() + 9 * 60 * 60 * 1000
      );
      // 昨日の日付文字列を取得
      const yesterdayDateStr = jstYesterdayDate.toISOString().slice(0, 10);
      console.log(
        'yesterdayDateStr:jstYesterdayDate.toISOString().slice(0, 10)',
        yesterdayDateStr
      );

      // お世話開始日の確認
      if (careSettings.care_start_date) {
        const careStartDate = new Date(careSettings.care_start_date);
        const yesterdayDate = new Date(yesterdayDateStr);

        // 昨日がお世話開始日より前の場合は、リダイレクトしない
        if (yesterdayDate < careStartDate) {
          console.log(
            `[Dashboard] 昨日(${yesterdayDateStr})はお世話開始日(${careSettings.care_start_date})より前のため、リダイレクトしません`
          );
          return;
        }
      }

      // お世話終了日の確認
      if (careSettings.care_end_date) {
        const careEndDate = new Date(careSettings.care_end_date);
        const yesterdayDate = new Date(yesterdayDateStr);

        // 昨日がお世話終了日より後の場合は、リダイレクトしない
        if (yesterdayDate > careEndDate) {
          console.log(
            `[Dashboard] 昨日(${yesterdayDateStr})はお世話終了日(${careSettings.care_end_date})より後のため、リダイレクトしません`
          );
          return;
        }
      }

      try {
        console.log(
          `[Dashboard] 昨日の散歩確認開始: careSettingId=${careSettings.id}, date=${yesterdayDateStr}`
        );

        // Firebase 認証ヘッダーを取得
        let authHeaders: Record<string, string>;
        try {
          const token = await getFirebaseToken();
          authHeaders = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          };
        } catch (authError) {
          console.error('[Dashboard] 認証失敗:', authError);
          return; // 認証エラーの場合は処理を中断
        }

        // fetch バックエンド API
        const res = await fetch(
          `${API_BASE_URL}/api/care_logs/by_date?care_setting_id=${careSettings.id}&date=${yesterdayDateStr}`,
          {
            method: 'GET',
            headers: authHeaders,
          }
        );

        if (!res.ok) {
          console.error(`[Dashboard] API 呼び出し失敗: status=${res.status}`);

          // 認証エラーの場合の特別な処理
          if (res.status === 401) {
            console.error(
              '[Dashboard] 認証エラー: Firebase token が無効または期限切れです'
            );
            // to-do: 必要に応じてログイン画面にリダイレクト
            // router.push('/login');
            return;
          }

          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log(`[Dashboard] 後端レスポンス:`, data);

        // 昨日のcare_logが存在し、散歩が未実施の場合
        if (data && data.care_log_id && !data.walked) {
          console.log('[Dashboard] 昨日散歩未実施のためダイアログを表示');
          setShowNoCareDialog(true);
          return;
        }

        // 昨日のcare_logが存在しない場合は自動作成してからダイアログ表示
        if (data && !data.care_log_id && !data.walked) {
          console.log(
            '[Dashboard] 昨日記録なし、自動作成してからダイアログを表示'
          );

          try {
            // 既存のjstYesterdayDate変数を使用
            const yesterdayISO = jstYesterdayDate.toISOString();

            console.log(
              '[Dashboard] 昨日のcare_log自動作成開始:',
              yesterdayISO
            );

            // 昨日のcare_logを作成
            const token = await getFirebaseToken();
            const createRes = await fetch(`${API_BASE_URL}/api/care_logs/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                date: yesterdayISO,
                fed_morning: false,
                fed_night: false,
                walk_result: false,
              }),
            });

            if (createRes.ok) {
              const createdData = await createRes.json();
              console.log(
                '[Dashboard] 昨日のcare_log自動作成成功:',
                createdData.id
              );
            } else if (createRes.status === 409 || createRes.status === 400) {
              // 409エラー（既存記録）は無視
              console.log('[Dashboard] 昨日のcare_log既存のため作成スキップ');
            } else {
              // その他のエラーはログ出力
              const errorText = await createRes.text();
              console.error(
                '[Dashboard] 昨日のcare_log作成失敗:',
                createRes.status,
                errorText
              );
            }
          } catch (createError) {
            console.error(
              '[Dashboard] 昨日のcare_log自動作成エラー:',
              createError
            );
          }

          // care_log作成結果に関わらずダイアログを表示
          setShowNoCareDialog(true);
        }
      } catch (error) {
        console.error('[Dashboard] 昨日の散歩確認エラー:', error);
      }
    };

    checkYesterdayWalk();
  }, [
    careSettings?.id,
    careSettings?.care_start_date,
    careSettings?.care_end_date,
    mounted,
    router,
    getFirebaseToken,
  ]);

  // ミッション定義
  const missions = [
    {
      id: 'morning-food',
      name: 'あさごはん',
      icon: Coffee,
      completed: careLog.fed_morning,
    },
    {
      id: 'evening-food',
      name: 'ゆうごはん',
      icon: Utensils,
      completed: careLog.fed_night,
    },
    {
      id: 'walk',
      name: 'おさんぽ',
      icon: Footprints,
      completed: careLog.walked,
    },
  ];

  // わんちゃんのひとこと
  const [currentMessage, setCurrentMessage] = useState('わん！');

  // ダイアログを閉じて反省文ページに遷移
  const handleNoCareDialogClose = () => {
    setShowNoCareDialog(false);
    router.push('/reflection-writing');
  };

  const handleDogClick = useCallback(async () => {
    try {
      // Firebase認証トークンを取得
      if (!currentUser) {
        throw new Error('ログインが必要です');
      }
      const idToken = await currentUser.getIdToken();
      const res = await fetch(`${API_BASE_URL}/api/message_logs/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`, // 認証トークンを追加
        },
      });
      if (!res.ok) {
        throw new Error('メッセージ取得失敗');
      }
      const data = await res.json();
      setCurrentMessage(data.message);
    } catch (error) {
      console.error('犬メッセージ取得エラー:', error);
      setCurrentMessage('わん！'); // エラー時のフォールバック
    }
  }, [currentUser]);

  // 初期メッセージを自動取得
  useEffect(() => {
    if (!authLoading && currentUser) {
      handleDogClick(); // 初回の犬のひとことを自動取得
    }
  }, [authLoading, currentUser, handleDogClick]);

  // お世話タスク完了時の処理
  const handleMissionComplete = async (missionId: string) => {
    if (missionId === 'walk') {
      // 散歩は /walk に遷移
      router.push('/walk');
      return;
    }

    try {
      // 認証ヘッダーを取得
      const token = await getFirebaseToken();
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // care_log_id がなければ新規作成
      let careLogId = careLog.care_log_id;
      if (!careLogId) {
        // 今日の care_log を新規作成
        const now = new Date();

        // 9時間（ミリ秒単位）を加算
        const jstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

        console.log('JST日時:', jstDate.toISOString());
        // const today = new Date().toISOString().slice(0, 10);
        // console.log(today);
        const res = await fetch(`${API_BASE_URL}/api/care_logs/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            date: jstDate.toISOString(),
            // date: today,
            fed_morning: missionId === 'morning-food',
            fed_night: missionId === 'evening-food',
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error('POST失敗', res.status, text);
          throw new Error('POST失敗');
        }
        const data = await res.json();
        console.log('POST成功', { careLogId, missionId, data });
        careLogId = data.id;
      } else {
        // 既存の care_log を部分更新
        const updateBody: any = {};
        if (missionId === 'morning-food') updateBody.fed_morning = true;
        if (missionId === 'evening-food') updateBody.fed_night = true;
        const resPatch = await fetch(
          `${API_BASE_URL}/api/care_logs/${careLogId}`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateBody),
          }
        );
        if (!resPatch.ok) {
          const text = await resPatch.text();
          console.error('PATCH失敗', resPatch.status, text);
          throw new Error('PATCH失敗');
        }
        const dataPatch = await resPatch.json();
        console.log('PATCH成功', { careLogId, missionId, data: dataPatch });
      }
      // 更新後、再取得
      const now2 = new Date();
      const jstDate2 = new Date(now2.getTime() + 9 * 60 * 60 * 1000);
      const today = jstDate2.toISOString().split('T')[0];
      console.log('today', today);

      const res2 = await fetch(
        `${API_BASE_URL}/api/care_logs/today?care_setting_id=${careSettings?.id}&date=${today}`,
        {
          method: 'GET',
          headers,
        }
      );
      if (!res2.ok) {
        const text = await res2.text();
        console.error('取得後失敗', res2.status, text);
      } else {
        const data2 = await res2.json();
        console.log('取得後', data2);
        setCareLog({
          fed_morning: data2.fed_morning,
          fed_night: data2.fed_night,
          walked: data2.walked,
          care_log_id: data2.care_log_id || null,
        });
      }
    } catch (error) {
      console.error('お世話タスク更新エラー:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-yellow-50 [&_*]:text-[18px]">
      {/* 背景色個別指定 */}
      {/* 読み込み中表示 */}
      {(() => {
        // loading条件チェック
        const isLoading =
          authLoading ||
          !currentUser ||
          !careSettings?.id ||
          loading ||
          careSettingsLoading;

        // 認証失敗、loading失敗
        if (!authLoading && !currentUser && !careSettingsLoading) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <div className="text-lg text-red-600 font-bold mb-4">
                認証が必要です
              </div>
              <Button
                onClick={() => router.push('/onboarding/login')}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                ログインページへ
              </Button>
            </div>
          );
        }

        // care_settings取得失敗、エラーメッセージ
        if (
          !authLoading &&
          currentUser &&
          !careSettingsLoading &&
          !careSettings?.id
        ) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <div className="text-lg text-red-600 font-bold mb-4">
                ユーザー情報の取得に失敗しました
              </div>
              <Button
                onClick={() => window.location.reload()}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                再読み込み
              </Button>
            </div>
          );
        }

        // loading
        if (isLoading) {
          return (
            <DashboardLoading
              authLoading={authLoading}
              currentUser={currentUser}
              careSettings={careSettings}
              careSettingsLoading={careSettingsLoading}
            />
          );
        }

        // 通常
        return (
          <>
            {/* ヘッダーナビゲーション */}
            {/* <div className="bg-white shadow-sm p-4"> */}
            {/* 背景色個別指定 */}
            <div className="relative">
              {/* ↓雲の背景レイヤー */}
              <div className="absolute -bottom-4 left-0 w-full flex min-w-max space-x-[-14px]">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className={`${
                      i % 2 === 0 ? 'w-16 h-40' : 'w-20 h-40'
                    } bg-cyan-400 rounded-full`}
                  />
                ))}
              </div>

              {/* ボタンレイヤー */}
              <div className="relative z-10 p-4">
                <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center py-3 px-2 h-16 border-2 bg-cyan-700 hover:bg-cyan-800 !text-white !border-white"
                    onClick={() => router.push('/dashboard')}
                  >
                    <Heart className="h-5 w-5 mb-1" />
                    <span className="text-xs !text-white">おせわ</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center py-3 px-2 h-16 border-2 bg-cyan-700 hover:bg-cyan-800 !text-white !border-white"
                    onClick={() => router.push('/walk')}
                  >
                    <Footprints className="h-5 w-5 mb-1" />
                    <span className="text-xs !text-white">おさんぽ</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex flex-col items-center justify-center py-3 px-2 h-16 border-2 bg-cyan-700 hover:bg-cyan-800 !text-white !border-white"
                    onClick={() => router.push('/admin-login')}
                  >
                    <Settings className="h-5 w-5 mb-1" />
                    <span className="text-xs !text-white">かんりしゃ</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* メインコンテンツ */}
            <div className="px-4 py-6">
              <div className="w-full max-w-xs mx-auto space-y-6">
                {/* 犬のアニメーション・ひとこと */}
                <Card className="bg-white rounded-2xl border-3 border-gray-500">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center space-y-4">
                      {/* ひとこと吹き出し */}
                      <div className="relative bg-white border-2 border-gray-300 rounded-full px-8 py-3 shadow-lg max-w-[260px]">
                        <p className="text-center text-sm font-medium text-gray-800">
                          {currentMessage}
                        </p>
                        {/* 吹き出しの尻尾（下向き） */}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                          <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-white" />
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-5 border-transparent border-t-gray-300" />
                        </div>
                      </div>

                      {/* 犬の画像 → 動画 */}
                      <div className="flex flex-col items-center">
                        {/* <Button
                          variant="ghost"
                          className="relative w-28 h-28 p-0 hover:scale-105 transition-transform duration-200"
                          onClick={handleDogClick}
                        > */}
                        {/* <Image
                            src="/images/cute-puppy.png"
                            alt="わんちゃん"
                            fill
                            style={{ objectFit: 'contain' }}
                            priority
                          />
                        </Button> */}
                        <Button
                          variant="ghost"
                          className="relative w-60 h-60 max-w-xs max-h-xs p-0 scale-105 transition-transform duration-200 rounded-full overflow-hidden"
                          onClick={handleDogClick}
                        >
                          <video
                            src="/animations/dog-idle.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-contain"
                          />
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">
                          タップしてね！
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 今日のお世話ミッション */}
                <Card className="border-3 border-gray-500 rounded-2xl text-gray-800">
                  <CardHeader className="pb-3">
                    <h2 className="text-lg font-bold flex items-center">
                      <Star className="mr-2 h-5 w-5 text-yellow-500" />
                      きょうのおせわみっしょん
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {missions.map((mission) => {
                        const Icon = mission.icon;
                        const isCompleted = mission.completed;

                        return (
                          <Button
                            key={mission.id}
                            variant="ghost"
                            className={`w-full h-12 flex items-center justify-start text-left px-4 bg-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                              isCompleted
                                ? 'bg-green-50 text-green-800'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => handleMissionComplete(mission.id)}
                            disabled={isCompleted}
                            aria-label={mission.name}
                          >
                            <div className="flex items-center space-x-3">
                              {isCompleted ? (
                                <div className="text-green-500 text-lg">✅</div>
                              ) : (
                                <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                              )}
                              <Icon className="h-5 w-5" />
                              <span className="text-sm font-medium">
                                {mission.name}
                              </span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        );
      })()}
      {/* お世話不足ダイアログ */}
      <Dialog open={showNoCareDialog} onOpenChange={setShowNoCareDialog}>
        <DialogContent className="bg-white rounded-lg max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              あれれ、わんちゃんは...
            </DialogTitle>
            <DialogDescription className="text-center pt-2 text-base whitespace-pre-line">
              きのうのおさんぽみっしょんをたっせいしてないから
              わんちゃんはどこかに行ってしまいました。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={handleNoCareDialogClose}
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
