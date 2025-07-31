// GPS 距離計算テストページ（cl改善版）
// 未来のテストのために保存される

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WalkGPSTestPage() {
  const [isWalking, setIsWalking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [walkTime, setWalkTime] = useState(0);
  const [status, setStatus] = useState('散歩を開始する準備');
  const [debugInfo, setDebugInfo] = useState<{ id: number; message: string }[]>(
    []
  );

  const watchIdRef = useRef<number | null>(null);
  const previousPositionRef = useRef<GeolocationPosition | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const totalDistanceRef = useRef(0);
  const lastUpdateTimeRef = useRef<Date | null>(null);

  // cl改善版追加変数
  const accumulatedDistanceRef = useRef(0);
  const consecutiveSmallMovesRef = useRef(0);
  const positionHistoryRef = useRef<
    Array<{ position: GeolocationPosition; timestamp: number }>
  >([]);
  const lastRecordedPositionRef = useRef<GeolocationPosition | null>(null);

  // GPS距離計算関数（ハーバサイン式を使用）
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371000; // 地球半径（メートル）
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 位置履歴の管理
  const updatePositionHistory = (position: GeolocationPosition) => {
    const now = Date.now();
    positionHistoryRef.current.push({
      position,
      timestamp: now,
    });

    // 30秒以上古い位置は削除
    positionHistoryRef.current = positionHistoryRef.current.filter(
      (p) => now - p.timestamp < 30000
    );
  };

  // 時間窓での移動距離チェック
  const checkTimeWindowMovement = (): boolean => {
    if (positionHistoryRef.current.length < 2) return false;

    const oldest = positionHistoryRef.current[0];
    const newest =
      positionHistoryRef.current[positionHistoryRef.current.length - 1];

    const timeDiff = newest.timestamp - oldest.timestamp;
    if (timeDiff < 15000) return false; // 15秒未満は判定しない

    const straightDistance = calculateDistance(
      oldest.position.coords.latitude,
      oldest.position.coords.longitude,
      newest.position.coords.latitude,
      newest.position.coords.longitude
    );

    // 15秒以上で8m以上の直線移動があれば真の移動と判定
    return straightDistance > 8;
  };

  // デバッグ情報追加
  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const uniqueId = Date.now() + Math.random(); // ユニークIDを追加
    const debugEntry = { id: uniqueId, message: `[${timestamp}] ${info}` };
    setDebugInfo((prev) => [debugEntry, ...prev.slice(0, 11)]); // 12個まで表示
  };

  // 動的しきい値計算
  const calculateDynamicThreshold = (accuracy: number): number => {
    let baseThreshold = Math.max(accuracy * 0.8, 3);

    // 連続で小さな移動が続く場合、しきい値を下げる
    if (consecutiveSmallMovesRef.current > 3) {
      baseThreshold = Math.max(baseThreshold * 0.6, 2);
      addDebugInfo(
        `連続移動検出: しきい値を${baseThreshold.toFixed(1)}mに下げる`
      );
    }

    return Math.min(baseThreshold, 10); // 最大10m
  };

  // GPS位置更新処理（cl改善版）
  const handlePositionUpdate = (position: GeolocationPosition) => {
    const now = new Date();
    const currentLat = position.coords.latitude;
    const currentLon = position.coords.longitude;
    const { accuracy } = position.coords;

    // 位置履歴に追加
    updatePositionHistory(position);

    addDebugInfo(
      `GPS更新: 精度=${accuracy.toFixed(1)}m, 累積=${accumulatedDistanceRef.current.toFixed(1)}m`
    );

    // 精度フィルター（50m以内）
    if (accuracy > 50) {
      addDebugInfo(`精度不良によりスキップ: ${accuracy.toFixed(1)}m > 50m`);
      return;
    }

    // 前回の位置がある場合、距離を計算
    if (previousPositionRef.current) {
      const prevLat = previousPositionRef.current.coords.latitude;
      const prevLon = previousPositionRef.current.coords.longitude;

      const segmentDistance = calculateDistance(
        prevLat,
        prevLon,
        currentLat,
        currentLon
      );
      const dynamicThreshold = calculateDynamicThreshold(accuracy);

      addDebugInfo(
        `移動: ${segmentDistance.toFixed(1)}m, しきい値: ${dynamicThreshold.toFixed(1)}m`
      );

      // 速度チェック
      const timeDiff =
        (now.getTime() -
          (lastUpdateTimeRef.current?.getTime() || now.getTime())) /
        1000;
      const speed = timeDiff > 0 ? (segmentDistance / timeDiff) * 3.6 : 0;

      if (speed > 25) {
        addDebugInfo(`速度異常によりスキップ: ${speed.toFixed(1)}km/h`);
        return;
      }

      // 累積距離システム
      if (segmentDistance >= dynamicThreshold) {
        // 大きな移動：直接追加
        totalDistanceRef.current += segmentDistance;
        accumulatedDistanceRef.current = 0;
        consecutiveSmallMovesRef.current = 0;

        setDistance(Math.round(totalDistanceRef.current));
        addDebugInfo(
          `直接追加: +${segmentDistance.toFixed(1)}m, 合計: ${totalDistanceRef.current.toFixed(1)}m`
        );

        lastRecordedPositionRef.current = position;
        lastUpdateTimeRef.current = now;
      } else if (segmentDistance > 1) {
        // 小さな移動：累積
        accumulatedDistanceRef.current += segmentDistance;
        consecutiveSmallMovesRef.current += 1;

        addDebugInfo(
          `累積中: +${segmentDistance.toFixed(1)}m, 累積計: ${accumulatedDistanceRef.current.toFixed(1)}m`
        );

        // 累積距離が5m以上になった場合
        if (accumulatedDistanceRef.current >= 5) {
          // 時間窓チェックで真の移動か確認
          if (checkTimeWindowMovement()) {
            totalDistanceRef.current += accumulatedDistanceRef.current;
            setDistance(Math.round(totalDistanceRef.current));
            addDebugInfo(
              `累積追加: +${accumulatedDistanceRef.current.toFixed(1)}m, 合計: ${totalDistanceRef.current.toFixed(1)}m`
            );

            accumulatedDistanceRef.current = 0;
            consecutiveSmallMovesRef.current = 0;
            lastRecordedPositionRef.current = position;
          } else {
            addDebugInfo(`時間窓チェック失敗: GPS漂移の可能性`);
            accumulatedDistanceRef.current = 0;
            consecutiveSmallMovesRef.current = 0;
          }
        }
      } else {
        // 非常に小さな移動：GPS誤差の可能性
        addDebugInfo(`微小移動無視: ${segmentDistance.toFixed(1)}m < 1m`);
        consecutiveSmallMovesRef.current = Math.max(
          0,
          consecutiveSmallMovesRef.current - 1
        );
      }
    } else {
      addDebugInfo('初回位置設定完了');
      lastUpdateTimeRef.current = now;
      lastRecordedPositionRef.current = position;
    }

    // 現在位置を前回位置として保存
    previousPositionRef.current = position;
  };

  // GPS追跡開始
  const startWalk = () => {
    if (!navigator.geolocation) {
      alert('このブラウザはGPSをサポートしていません');
      return;
    }

    setIsWalking(true);
    setDistance(0);
    setWalkTime(0);
    setStatus('散歩中...');
    totalDistanceRef.current = 0;
    accumulatedDistanceRef.current = 0;
    consecutiveSmallMovesRef.current = 0;
    positionHistoryRef.current = [];
    previousPositionRef.current = null;
    lastRecordedPositionRef.current = null;
    startTimeRef.current = new Date();
    lastUpdateTimeRef.current = null;

    addDebugInfo('散歩開始 - cl改善版GPS追跡開始');

    // GPS追跡開始
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      (error) => {
        addDebugInfo(`GPSエラー: ${error.message} (code: ${error.code})`);
        console.error('GPS error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    // 時間カウンター
    const timeInterval = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current.getTime()) / 1000
        );
        setWalkTime(elapsed);
      }
    }, 1000);

    // クリーンアップ用にintervalIdを保存
    (window as any).walkTimeInterval = timeInterval;
  };

  // GPS追跡停止
  const stopWalk = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if ((window as any).walkTimeInterval) {
      clearInterval((window as any).walkTimeInterval);
    }

    // 残った累積距離があれば追加
    if (accumulatedDistanceRef.current > 2) {
      totalDistanceRef.current += accumulatedDistanceRef.current;
      setDistance(Math.round(totalDistanceRef.current));
      addDebugInfo(
        `終了時累積追加: +${accumulatedDistanceRef.current.toFixed(1)}m`
      );
    }

    setIsWalking(false);
    setStatus(
      `散歩完了！ 距離: ${Math.round(totalDistanceRef.current)}m, 時間: ${Math.floor(walkTime / 60)}分${walkTime % 60}秒`
    );

    addDebugInfo(
      `散歩終了 - 合計距離: ${Math.round(totalDistanceRef.current)}m, 時間: ${walkTime}秒`
    );
  };

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(
    () => () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if ((window as any).walkTimeInterval) {
        clearInterval((window as any).walkTimeInterval);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-blue-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center text-green-800 mb-6">
          🚶‍♀️ GPS距離テスト（cl改善版）
        </h1>

        {/* メイン情報カード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">{status}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {distance}m
                </div>
                <div className="text-sm text-gray-600">距離</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {formatTime(walkTime)}
                </div>
                <div className="text-sm text-gray-600">時間</div>
              </div>
            </div>

            <div className="flex justify-center">
              {!isWalking ? (
                <Button
                  onClick={startWalk}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  散歩開始
                </Button>
              ) : (
                <Button
                  onClick={stopWalk}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  散歩終了
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* デバッグ情報カード */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">デバッグ情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs font-mono max-h-60 overflow-y-auto">
              {debugInfo.map((entry) => (
                <div
                  key={entry.id}
                  className="text-gray-700 border-b border-gray-100 pb-1"
                >
                  {entry.message}
                </div>
              ))}
              {debugInfo.length === 0 && (
                <div className="text-gray-500">
                  散歩を開始するとデバッグ情報が表示されます
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 使用説明 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">テスト方法（cl改善版）</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. 屋外の開けた場所に移動</p>
            <p>2. 「散歩開始」をタップ</p>
            <p>3. ゆっくりと5-10m程度歩いてみる</p>
            <p>4. デバッグ情報でGPS更新を確認</p>
            <div className="bg-blue-50 p-2 rounded">
              <p className="text-blue-800 font-medium text-xs">
                📝 cl改善版改善点：
                <br />
                • 累積距離システム：小さな移動も蓄積
                <br />
                • 動的しきい値：連続移動時は緩和
                <br />
                • 時間窓検証：30秒間の総移動距離確認
                <br />• GPS漂移対策：原地不動時の偽距離防止
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
