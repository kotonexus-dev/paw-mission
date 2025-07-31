'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// バックエンドからどんなデータ型でもらうのかを定義
export interface CurrentUser {
  id: string;
  firebase_uid: string;
  email: string;
  current_plan: string | null;
}

// 実際にフロント側で呼び出すフック
export default function useCurrentUser() {
  // 取得したユーザー情報を入れる
  const [user, setUser] = useState<CurrentUser | null>(null);
  // ローディング状態とエラーメッセージを管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Firebase認証情報を取得
  const { currentUser } = useAuth();

  // 実際にバックエンドからデータを取ってくる関数
  const fetchCurrentUser = useCallback(async () => {
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
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

      console.log('useCurrentUserのfetchデータ確認:', data);

      // 取得したデータを画面で使えるようにstateにセット
      setUser({
        id: data.id,
        firebase_uid: data.firebase_uid,
        email: data.email,
        current_plan: data.current_plan,
      });
    } catch (err) {
      console.error(err);
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // 画面が最初に表示されたタイミングで、一度だけ fetchCurrentUser を実行
  // currentUserが利用可能になってから実行
  useEffect(() => {
    if (currentUser) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, [currentUser, fetchCurrentUser]);

  // 更新した際に再度データを取得できるようにするため、refetch関数も定義
  return { user, loading, error, refetch: fetchCurrentUser };
}
