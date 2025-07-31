'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// バックエンドからどんなデータ型でもらうのかを定義
export interface CareSettings {
  id: number;
  parent_name: string;
  child_name: string;
  dog_name: string;
  care_start_date: string;
  care_end_date: string;
}

export function useCareSettings() {
  // バックエンドから取った設定を入れる
  const [careSettings, setCareSettings] = useState<CareSettings | null>(null);
  // ローディング状態とエラーメッセージを管理
  const [loading, setLoading] = useState(true);
  // エラーが起きたらここにメッセージを入れる
  const [error, setError] = useState('');
  // Firebase認証情報を取得
  const { currentUser } = useAuth();

  // 実際にバックエンドからデータを取ってくる関数
  const fetchCareSettings = useCallback(async () => {
    // 最初にローディング中の状態にする（読み込み開始）
    setLoading(true);
    setError('');
    try {
      // Firebase認証チェック
      if (!currentUser) {
        throw new Error('認証が必要です');
      }

      // Firebase IDトークンを取得
      const idToken = await currentUser.getIdToken();

      // バックエンドのFastAPIに直接GETリクエスト
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/care_settings/me`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      // サーバーから来たレスポンスをJSONに変換
      const data = await res.json();

      console.log('useCareSettingsのfetchデータ確認:', data);

      // 取得したデータを画面で使えるようにstateにセット
      setCareSettings({
        id: data.id,
        parent_name: data.parent_name,
        child_name: data.child_name,
        dog_name: data.dog_name,
        care_start_date: data.care_start_date,
        care_end_date: data.care_end_date,
      });

      // エラーがあればここでキャッチ
    } catch (err) {
      console.error(err);
      setError('情報の取得に失敗しました');

      // 最後にローディング終了(読み込み終了)
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // 画面が最初に表示されたタイミングで、一度だけ fetchCareSettings を実行
  // →「ページ開いたら自動でサーバーからデータを取ってくる」仕組み
  // currentUserが利用可能になってから実行
  useEffect(() => {
    if (currentUser) {
    fetchCareSettings();
    }
  }, [currentUser, fetchCareSettings]);

  // 更新した際に再度データを取得できるようにするため、refetch関数も定義
  return { careSettings, loading, error, refetch: fetchCareSettings };
}
