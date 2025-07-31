// fetchでバックエンドの /api/care_logs を叩く関数（cl改善版対応）

// 下記のコメントは開発中のみ、削除する予定
// 主な役割：バックエンド API との通信、散歩記録の保存・取得
// saveWalkRecord：今回の散歩距離、時間、結果などのデータをcare_logsへ送信する。
// determineWalkSuccess：距離に基づいて目標達成可否を判定する。
// cl改善版対応：累積距離システム、動的しきい値、時間窓検証を使用した高精度GPS追跡データ

// 認証ヘッダーを生成するヘルパー関数
const getAuthHeader = (token?: string): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` }),
});
// 散步データの型定義（cl改善版対応）
export interface WalkData {
  id?: string;
  date: string;
  distance: number; // メートル単位
  duration: number; // 秒単位
  startTime?: string;
  endTime?: string;
  success: boolean;
  route?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  }[];
  // cl改善版追加フィールド
  gpsAccuracy?: number; // GPS精度情報
  calculationMethod?: 'balanced' | 'standard'; // 計算方法の識別
  accumulatedSegments?: number; // 累積された小さな移動の回数
}

// 散步結果の型定義
export interface WalkResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// API エンドポイントのベース URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// 散步成功判定のロジック（cl改善版対応）
// 距離のみで1000 m 以上は成功
// cl改善版GPS計算による高精度データを使用
export const determineWalkSuccess = (
  distance: number,
  _duration: number,
  targetDistance?: number,
  _targetDuration?: number
): boolean => {
  // デフォルトの目標距離（設定されていない場合）
  const defaultTargetDistance = 1000; // 1000メートル

  const actualTargetDistance = targetDistance || defaultTargetDistance;

  // 詳細なデバッグログを追加
  console.log('[WalkAPI] 散歩成功判定の詳細チェック:', {
    受け取った距離: distance,
    距離の型: typeof distance,
    距離の値: distance,
    目標距離: actualTargetDistance,
    '距離 >= 目標距離': distance >= actualTargetDistance,
    '距離 < 目標距離': distance < actualTargetDistance,
    'Math.round(distance)': Math.round(distance),
    距離が数値か: !Number.isNaN(distance) && Number.isFinite(distance),
  });

  // cl改善版GPS計算による高精度距離データで判定（1000メートル以上で成功）
  const isSuccess = distance >= actualTargetDistance;

  console.log('[WalkAPI] 散歩成功判定（cl改善版）:', {
    distance: `${distance}m`,
    targetDistance: `${actualTargetDistance}m`,
    isSuccess,
    calculationMethod: 'balanced',
  });

  console.log(`[WalkAPI] 最終判定結果: ${isSuccess ? '成功' : '失敗'}`);

  return isSuccess;
};

// 散歩記録を更新する関数（既存のcare_logを更新）
const updateWalkRecord = async (
  walkData: any,
  careSettingId: number,
  token?: string
): Promise<WalkResult> => {
  try {
    // 認証ヘッダーを取得
    const headers = getAuthHeader(token);

    console.log(
      `[WalkAPI] updateWalkRecord: care_setting_id: ${careSettingId}`
    );
    console.log(`[WalkAPI] updateWalkRecord: walkData:`, walkData);

    const todayResponse = await fetch(
      `${API_BASE_URL}/api/care_logs/today?care_setting_id=${careSettingId}&date=${walkData.date}`,
      {
        method: 'GET',
        headers,
      }
    );

    console.log(`[WalkAPI] today API response status: ${todayResponse.status}`);

    if (!todayResponse.ok) {
      throw new Error(`今日の記録取得エラー: ${todayResponse.status}`);
    }

    const todayData = await todayResponse.json();
    console.log(`[WalkAPI] today API response data:`, todayData);

    if (!todayData.care_log_id) {
      throw new Error('更新対象のcare_logが見つかりません');
    }

    // PATCHで散歩記録を更新
    const patchData = {
      walk_result: walkData.walk_result,
      walk_total_distance_m: walkData.walk_total_distance_m,
    };
    console.log(`[WalkAPI] PATCH データ:`, patchData);
    console.log(
      `[WalkAPI] PATCH walk_resultの型:`,
      typeof patchData.walk_result
    );
    console.log(`[WalkAPI] PATCH walk_resultの値:`, patchData.walk_result);

    const response = await fetch(
      `${API_BASE_URL}/api/care_logs/${todayData.care_log_id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patchData),
      }
    );

    console.log(`[WalkAPI] PATCH response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WalkAPI] PATCH エラー詳細:`, errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, details: ${errorText}`
      );
    }

    const result = await response.json();
    console.log(`[WalkAPI] PATCH 成功:`, result);
    return {
      success: true,
      message: '散歩記録が正常に更新されました',
      data: result,
    };
  } catch (error) {
    console.error('散歩記録更新エラー:', error);
    return {
      success: false,
      message: '散歩記録の更新に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// 散步記録を保存する関数（care_logsに統合）
export const saveWalkRecord = async (
  walkData: any,
  careSettingId: number,
  token?: string
): Promise<WalkResult> => {
  try {
    // 認証ヘッダーを取得
    const headers = getAuthHeader(token);

    console.log(`[WalkAPI] saveWalkRecord: care_setting_id: ${careSettingId}`);
    console.log(`[WalkAPI] 元の散歩データ:`, walkData);

    // 散歩の成功判定
    const walkSuccess = determineWalkSuccess(
      walkData.distance,
      walkData.duration
    );

    console.log(`[WalkAPI] 散歩成功判定結果: ${walkSuccess}`);

    // care_logs API用のデータ構造に変換（散歩のみの場合）
    const careLogData = {
      date: walkData.date,
      walk_result: walkSuccess,
      walk_total_distance_m: Math.round(walkData.distance),
    };

    console.log('[WalkAPI] care_logsに散歩データを保存:', careLogData);
    console.log('[WalkAPI] walk_resultの型:', typeof careLogData.walk_result);
    console.log('[WalkAPI] walk_resultの値:', careLogData.walk_result);

    const response = await fetch(`${API_BASE_URL}/api/care_logs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(careLogData),
    });

    console.log(`[WalkAPI] POST レスポンス status: ${response.status}`);

    if (!response.ok) {
      // 既存の記録がある場合はPATCHで更新を試行
      if (response.status === 400) {
        console.log(
          '[WalkAPI] 400エラー検出 - 既存記録があるため更新APIを使用'
        );
        const responseText = await response.text();
        console.log('[WalkAPI] 400エラーの詳細:', responseText);
        return await updateWalkRecord(careLogData, careSettingId, token);
      }

      // エラーの詳細を確認
      const errorText = await response.text();
      console.log('[WalkAPI] POSTエラーの詳細:', errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, details: ${errorText}`
      );
    }

    const result = await response.json();
    console.log('[WalkAPI] POST成功:', result);
    return {
      success: true,
      message: '散歩記録が正常に保存されました（care_logs使用）',
      data: result,
    };
  } catch (error) {
    console.error('散歩記録保存エラー:', error);
    return {
      success: false,
      message: '散歩記録の保存に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// ローカルストレージ用のユーティリティ関数（cl改善版データ対応）
export const saveWalkToLocalStorage = (walkData: any): void => {
  try {
    const existingWalks = JSON.parse(
      localStorage.getItem('walkHistory') || '[]'
    );

    // cl改善版GPS計算による高精度データであることを記録
    const enhancedWalkData = {
      ...walkData,
      id: Date.now().toString(), // ローカル用のID
      timestamp: new Date().toISOString(),
      calculationMethod: 'balanced', // cl改善版使用を明記
      gpsQuality: 'enhanced', // GPS品質情報
    };

    existingWalks.push(enhancedWalkData);
    localStorage.setItem('walkHistory', JSON.stringify(existingWalks));

    console.log(
      '[WalkAPI] cl改善版GPSデータをローカルストレージに保存しました'
    );
  } catch (error) {
    console.error('ローカルストレージ保存エラー:', error);
  }
};

export const getWalksFromLocalStorage = (): WalkData[] => {
  try {
    return JSON.parse(localStorage.getItem('walkHistory') || '[]');
  } catch (error) {
    console.error('ローカルストレージ取得エラー:', error);
    return [];
  }
};

// cl改善版GPS品質チェック関数
export const validateGPSData = (
  walkData: WalkData
): {
  isValid: boolean;
  quality: 'high' | 'medium' | 'low';
  issues: string[];
} => {
  const issues: string[] = [];
  let quality: 'high' | 'medium' | 'low' = 'high';

  // 距離の妥当性チェック
  if (walkData.distance < 0) {
    issues.push('距離が負の値です');
  }

  // 時間の妥当性チェック
  if (walkData.duration < 0) {
    issues.push('時間が負の値です');
  }

  // GPS精度チェック
  if (walkData.gpsAccuracy && walkData.gpsAccuracy > 50) {
    quality = 'medium';
    issues.push('GPS精度が低めです');
  }

  if (walkData.gpsAccuracy && walkData.gpsAccuracy > 100) {
    quality = 'low';
    issues.push('GPS精度が非常に低いです');
  }

  // cl改善版計算方法の確認
  if (walkData.calculationMethod !== 'balanced') {
    quality = 'medium';
    issues.push('標準計算方法が使用されています');
  }

  return {
    isValid: issues.length === 0 || quality !== 'low',
    quality,
    issues,
  };
};
