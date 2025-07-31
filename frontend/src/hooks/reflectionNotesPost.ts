'use client';

// このファイルは、反省文を新規作成するためのAPIリクエストを送るhooksです。

import { getAuth } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase/config'; // → "[DEFAULT]" ならOK

// 反省文作成リクエストの型定義
interface ReflectionNoteCreateRequest {
  content: string;
}

// 反省文を新規作成
const createReflectionNote = async (content: string) => {
  const auth = getAuth(firebaseApp);
  const user = auth.currentUser;

  if (!user) {
    throw new Error('ユーザーがログインしていません');
  }

  // ユーザーのIDトークンを取得
  const token = await user.getIdToken();
  console.log('Firebaseトークン:', token);
  console.log('反省文の内容:', content);

  const body: ReflectionNoteCreateRequest = {
    content,
  };

  // バックエンドのAPIにPOSTリクエストを送る
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/reflection_notes`,
    {
      method: 'POST',
      headers: {
        // 送信データの形式をJSONと指定
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      // リクエストボディに反省文の内容を含める
      body: JSON.stringify(body),
    }
  );

  // レスポンスが正常でない場合はエラーを投げる
  if (!res.ok) {
    throw new Error('Failed to create reflection note');
  }

  let data;
  try {
    // 一度だけ JSON を読み取り
    data = await res.json();
    console.log('レスポンス内容', data);
    return data; // 読み取ったデータをそのまま返す
  } catch (err) {
    console.error('JSONの読み取りに失敗しました:', err);
    throw new Error('サーバーから無効なレスポンスが返されました');
  }
};

// デフォルトエクスポート
export default createReflectionNote;
