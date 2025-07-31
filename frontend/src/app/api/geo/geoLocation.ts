// Geolocation取得ロジック（cl改善版）

// 下記のコメントは開発中のみ、削除する予定
// 主な役割：GPS取得と距離計算ロジック
// GPSTracker クラス（cl改善版）
// startTracking()：位置追跡を開始し、初期座標を取得し、watchPosition で後続の位置変化を監視する。
// 位置情報が更新されるたびに：
// 新しい座標（currentPosition）を取得。
// 前回の座標（previousPosition）との距離を（ハーサイン公式で）比較する。
// 累積距離システム：小さな移動も蓄積し、動的しきい値で判定する。
// 時間窓検証：30秒間の総移動距離を確認してGPS漂移を防ぐ。
// コールバック（onDistanceUpdate）を通じて、現在の累積距離をリアルタイムに返す。
// 精度フィルタ（cl改善版）
// 精度（accuracy）が50mを超える位置データはノイズとみなして無視する。

// 距離計算関数（Haversine formula）
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // 地球の半径（メートル）
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // メートル単位
};

// GPS位置情報の型定義
export interface GPSPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

// 位置履歴の型定義
export interface PositionHistoryEntry {
  position: GPSPosition;
  timestamp: number;
}

// GPS追跡クラス（cl改善版）
export class GPSTracker {
  private watchId: number | null = null;

  private currentPosition: GPSPosition | null = null;

  private previousPosition: GPSPosition | null = null; // 前回位置を記録（経路距離計算用）

  private startPosition: GPSPosition | null = null; // 開始位置を記録（参考用）

  private totalDistance: number = 0;

  // cl改善版追加プロパティ
  private accumulatedDistance: number = 0;

  private consecutiveSmallMoves: number = 0;

  private positionHistory: PositionHistoryEntry[] = [];

  private lastRecordedPosition: GPSPosition | null = null;

  private onPositionUpdate: ((position: GPSPosition) => void) | null = null;

  private onDistanceUpdate: ((distance: number) => void) | null = null;

  private onError: ((error: string) => void) | null = null;

  // デバッグ用：位置更新回数を記録
  private positionUpdateCount: number = 0;

  // 定時更新用：タイマーID
  private updateTimerId: NodeJS.Timeout | null = null;

  // 定時更新が使用中かどうか
  private usingTimerUpdate: boolean = false;

  constructor() {
    this.checkGeolocationSupport();
  }

  // Geolocationサポートチェック
  private checkGeolocationSupport(): boolean {
    if (!navigator.geolocation) {
      console.error('[GPSTracker] Geolocationがサポートされていません');
      if (this.onError) {
        this.onError('お使いのブラウザはGPS機能をサポートしていません');
      }
      return false;
    }
    console.log('[GPSTracker] Geolocationサポート確認済み');
    return true;
  }

  // 位置情報更新コールバック設定
  public setPositionCallback(callback: (position: GPSPosition) => void): void {
    this.onPositionUpdate = callback;
    console.log('[GPSTracker] 位置情報更新コールバック設定完了');
  }

  // 距離更新コールバック設定
  public setDistanceCallback(callback: (distance: number) => void): void {
    this.onDistanceUpdate = callback;
    console.log('[GPSTracker] 距離更新コールバック設定完了');
  }

  // エラーコールバック設定
  public setErrorCallback(callback: (error: string) => void): void {
    this.onError = callback;
    console.log('[GPSTracker] エラーコールバック設定完了');
  }

  // 位置履歴の管理
  private updatePositionHistory(position: GPSPosition): void {
    const now = Date.now();
    this.positionHistory.push({
      position,
      timestamp: now,
    });

    // 30秒以上古い位置は削除
    this.positionHistory = this.positionHistory.filter(
      (p) => now - p.timestamp < 30000
    );
  }

  // 時間窓での移動距離チェック
  private checkTimeWindowMovement(): boolean {
    if (this.positionHistory.length < 2) return false;

    const oldest = this.positionHistory[0];
    const newest = this.positionHistory[this.positionHistory.length - 1];

    const timeDiff = newest.timestamp - oldest.timestamp;
    if (timeDiff < 15000) return false; // 15秒未満は判定しない

    const straightDistance = calculateDistance(
      oldest.position.latitude,
      oldest.position.longitude,
      newest.position.latitude,
      newest.position.longitude
    );

    // 15秒以上で8m以上の直線移動があれば真の移動と判定
    return straightDistance > 8;
  }

  // 動的しきい値計算
  private calculateDynamicThreshold(accuracy: number): number {
    let baseThreshold = Math.max(accuracy * 0.8, 3);

    // 連続で小さな移動が続く場合、しきい値を下げる
    if (this.consecutiveSmallMoves > 3) {
      baseThreshold = Math.max(baseThreshold * 0.6, 2);
      console.log(
        `[GPSTracker] 連続移動検出: しきい値を${baseThreshold.toFixed(1)}mに下げる`
      );
    }

    return Math.min(baseThreshold, 10); // 最大10m
  }

  // 経路距離の計算（前回位置からの累積）- cl改善版
  private calculatePathDistance(): void {
    if (this.previousPosition && this.currentPosition) {
      // 時間間隔計算
      const timeInterval =
        this.currentPosition.timestamp - this.previousPosition.timestamp;
      const timeIntervalSeconds = timeInterval / 1000;

      console.log('[GPSTracker] 経路距離計算開始', {
        previous: {
          lat: this.previousPosition.latitude,
          lng: this.previousPosition.longitude,
          accuracy: this.previousPosition.accuracy,
          time: new Date(this.previousPosition.timestamp).toLocaleTimeString(),
        },
        current: {
          lat: this.currentPosition.latitude,
          lng: this.currentPosition.longitude,
          accuracy: this.currentPosition.accuracy,
          time: new Date(this.currentPosition.timestamp).toLocaleTimeString(),
        },
        timeInterval: `${timeIntervalSeconds.toFixed(1)}秒`,
        accumulated: `${this.accumulatedDistance.toFixed(1)}m`,
      });

      // 精度50m超はノイズとみなして無視（cl改善版）
      if (this.currentPosition.accuracy > 50) {
        console.log(
          '[GPSTracker] 精度が低すぎるためスキップ',
          `${this.currentPosition.accuracy.toFixed(1)}m > 50m`
        );
        return;
      }

      const distance = calculateDistance(
        this.previousPosition.latitude,
        this.previousPosition.longitude,
        this.currentPosition.latitude,
        this.currentPosition.longitude
      );

      const dynamicThreshold = this.calculateDynamicThreshold(
        this.currentPosition.accuracy
      );

      // 速度計算（異常な移動を検出）
      const speed =
        timeIntervalSeconds > 0 ? (distance / timeIntervalSeconds) * 3.6 : 0; // km/h

      console.log('[GPSTracker] 経路距離計算結果', {
        distance: `${distance.toFixed(2)}m`,
        threshold: `${dynamicThreshold.toFixed(2)}m`,
        accuracy: `${this.currentPosition.accuracy.toFixed(1)}m`,
        speed: `${speed.toFixed(1)}km/h`,
        accumulated: `${this.accumulatedDistance.toFixed(1)}m`,
        currentTotal: `${this.totalDistance.toFixed(2)}m`,
      });

      // 異常に高速な移動（25km/h以上）は除外（cl改善版）
      if (speed > 25) {
        console.log(
          '[GPSTracker] 異常に高速な移動のためスキップ',
          `${speed.toFixed(1)}km/h > 25km/h`
        );
        return;
      }

      // 累積距離システム（cl改善版）
      if (distance >= dynamicThreshold) {
        // 大きな移動：直接追加
        this.totalDistance += distance;
        this.accumulatedDistance = 0;
        this.consecutiveSmallMoves = 0;

        console.log('[GPSTracker] 直接追加', {
          addedDistance: `${distance.toFixed(2)}m`,
          totalDistance: `${this.totalDistance.toFixed(2)}m`,
        });

        this.lastRecordedPosition = { ...this.currentPosition };

        if (this.onDistanceUpdate) {
          this.onDistanceUpdate(this.totalDistance);
        }
      } else if (distance > 1) {
        // 小さな移動：累積
        this.accumulatedDistance += distance;
        this.consecutiveSmallMoves += 1;

        console.log('[GPSTracker] 累積中', {
          addedDistance: `${distance.toFixed(2)}m`,
          accumulatedDistance: `${this.accumulatedDistance.toFixed(2)}m`,
          consecutiveSmallMoves: this.consecutiveSmallMoves,
        });

        // 累積距離が5m以上になった場合
        if (this.accumulatedDistance >= 5) {
          // 時間窓チェックで真の移動か確認
          if (this.checkTimeWindowMovement()) {
            this.totalDistance += this.accumulatedDistance;
            console.log('[GPSTracker] 累積追加', {
              addedDistance: `${this.accumulatedDistance.toFixed(2)}m`,
              totalDistance: `${this.totalDistance.toFixed(2)}m`,
            });

            this.accumulatedDistance = 0;
            this.consecutiveSmallMoves = 0;
            this.lastRecordedPosition = { ...this.currentPosition };

            if (this.onDistanceUpdate) {
              this.onDistanceUpdate(this.totalDistance);
            }
          } else {
            console.log('[GPSTracker] 時間窓チェック失敗: GPS漂移の可能性');
            this.accumulatedDistance = 0;
            this.consecutiveSmallMoves = 0;
          }
        }
      } else {
        // 非常に小さな移動：GPS誤差の可能性
        console.log('[GPSTracker] 微小移動無視', {
          distance: `${distance.toFixed(2)}m`,
          reason: '< 1m',
        });
        this.consecutiveSmallMoves = Math.max(
          0,
          this.consecutiveSmallMoves - 1
        );
      }
    } else if (!this.previousPosition) {
      console.log('[GPSTracker] 初回位置設定、距離計算はスキップ');
      this.lastRecordedPosition = this.currentPosition
        ? { ...this.currentPosition }
        : null;
    } else {
      console.log('[GPSTracker] 現在位置が取得できていません');
    }
  }

  // 定時更新方式：タイマーを使用してgetCurrentPositionを定期実行（cl改善版）
  private startTimerUpdate(): void {
    console.log('[GPSTracker] 定時更新方式開始：タイマーによるGPS取得');
    this.usingTimerUpdate = true;

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15秒タイムアウト
      maximumAge: 5000, // 5秒キャッシュ
    };

    // 30秒間隔で位置情報を取得
    this.updateTimerId = setInterval(() => {
      console.log('[GPSTracker] 定時更新方式：getCurrentPosition実行中...');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('[GPSTracker] 定時更新方式：位置情報取得成功', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });

          // 前回位置を保存
          this.previousPosition = this.currentPosition;

          this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // 位置履歴に追加
          this.updatePositionHistory(this.currentPosition);

          if (this.onPositionUpdate) {
            this.onPositionUpdate(this.currentPosition);
          }

          // 距離計算処理（経路距離）
          this.calculatePathDistance();
        },
        (error) => {
          console.error('[GPSTracker] 定時更新方式：位置情報取得エラー', {
            code: error.code,
            message: error.message,
          });

          // 長時間運行でのエラーハンドリング改善
          if (error.code === error.TIMEOUT) {
            console.log('[GPSTracker] GPS取得タイムアウト - 継続監視中');
            // タイムアウトの場合は継続（一時的な問題の可能性）
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            console.log('[GPSTracker] GPS利用不可 - 位置サービス確認推奨');
            // 利用不可の場合も継続（環境変化の可能性）
          } else {
            console.error('[GPSTracker] 予期しないGPSエラー:', error);
          }

          // エラーがあってもGPS追跡は継続
          // 散歩中に一時的な問題が発生してもタイマーは止まらない
        },
        options
      );
    }, 30000); // 30秒間隔
  }

  // GPS追跡開始（cl改善版）
  public startTracking(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.checkGeolocationSupport()) {
        resolve(false);
        return;
      }

      console.log('[GPSTracker] GPS追跡開始（cl改善版）');

      // cl改善版の変数をリセット
      this.accumulatedDistance = 0;
      this.consecutiveSmallMoves = 0;
      this.positionHistory = [];
      this.lastRecordedPosition = null;

      // 最初は高精度モードを試行
      this.tryGetPosition(true, resolve);
    });
  }

  // 位置取得を試行するヘルパーメソッド
  private tryGetPosition(
    highAccuracy: boolean,
    resolve: (value: boolean) => void
  ): void {
    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 15000 : 30000, // 低精度の場合は30秒
      maximumAge: highAccuracy ? 0 : 300000, // 低精度の場合は5分間のキャッシュを許可
    };

    console.log(
      `[GPSTracker] 位置取得試行: ${highAccuracy ? '高精度' : '低精度'}モード`,
      options
    );

    // 現在位置を取得
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[GPSTracker] 初期位置取得成功', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        this.currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        // 開始位置を設定
        this.startPosition = { ...this.currentPosition };
        // 初回は前回位置をnullにして、最初の移動から計算開始
        this.previousPosition = null;
        // 位置履歴に追加
        this.updatePositionHistory(this.currentPosition);

        if (this.onPositionUpdate) {
          this.onPositionUpdate(this.currentPosition);
        }

        // watchPosition開始前のデバッグログ
        console.log('[GPSTracker] watchPosition開始...');
        this.positionUpdateCount = 0;

        // 位置情報の監視を開始（cl改善版設定）
        this.watchId = navigator.geolocation.watchPosition(
          (watchPosition) => {
            this.positionUpdateCount += 1;
            console.log(
              `[GPSTracker] watchPositionコールバック呼び出し #${this.positionUpdateCount}`,
              {
                lat: watchPosition.coords.latitude,
                lng: watchPosition.coords.longitude,
                accuracy: watchPosition.coords.accuracy,
                timestamp: new Date(
                  watchPosition.timestamp
                ).toLocaleTimeString(),
              }
            );

            // 前回位置を保存
            this.previousPosition = this.currentPosition;

            this.currentPosition = {
              latitude: watchPosition.coords.latitude,
              longitude: watchPosition.coords.longitude,
              accuracy: watchPosition.coords.accuracy,
              timestamp: watchPosition.timestamp,
            };

            // 位置履歴に追加
            this.updatePositionHistory(this.currentPosition);

            if (this.onPositionUpdate) {
              this.onPositionUpdate(this.currentPosition);
            }

            // 距離計算処理（路徑距離）
            this.calculatePathDistance();
          },
          (error) => {
            console.error('[GPSTracker] watchPositionエラー', {
              code: error.code,
              message: error.message,
              callCount: this.positionUpdateCount,
            });

            // watchPositionが失敗した場合、定時更新方式を開始
            if (!this.usingTimerUpdate) {
              console.log(
                '[GPSTracker] watchPosition失敗、定時更新方式に切り替え'
              );
              this.startTimerUpdate();
            }

            if (this.onError) {
              this.onError(
                '位置情報の監視に失敗しました（定時更新方式を使用中）'
              );
            }
          },
          {
            enableHighAccuracy: highAccuracy,
            timeout: highAccuracy ? 15000 : 30000,
            maximumAge: highAccuracy ? 5000 : 300000,
          }
        );

        console.log('[GPSTracker] watchPosition設定完了', {
          watchId: this.watchId,
        });

        // 15秒後にwatchPositionが呼ばれていない場合、定時更新方式に切り替え
        setTimeout(() => {
          if (this.positionUpdateCount === 0 && !this.usingTimerUpdate) {
            console.warn(
              '[GPSTracker] 15秒間watchPositionが呼ばれていません、定時更新方式に切り替え'
            );
            this.startTimerUpdate();
          }
        }, 15000);

        resolve(true);
      },
      (error) => {
        console.error(
          `[GPSTracker] 位置取得エラー (${highAccuracy ? '高精度' : '低精度'}モード)`,
          {
            code: error.code,
            message: error.message,
            userAgent: navigator.userAgent,
          }
        );

        // 高精度モードで失敗した場合、低精度モードを試行
        if (
          highAccuracy &&
          (error.code === error.POSITION_UNAVAILABLE ||
            error.code === error.TIMEOUT)
        ) {
          console.log('[GPSTracker] 高精度モード失敗、低精度モードで再試行');
          this.tryGetPosition(false, resolve);
          return;
        }

        // 最終的に失敗した場合のエラーメッセージ
        let errorMessage = '位置情報の取得に失敗しました';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              '位置情報の許可が拒否されました。設定で許可してください。';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              '位置情報が利用できません（Wi-Fiや位置情報サービスを確認してください）。';
            break;
          case error.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました。';
            break;
          default:
            errorMessage = `不明なエラーが発生しました（code: ${error.code}）`;
            break;
        }
        if (this.onError) {
          this.onError(errorMessage);
        }
        resolve(false);
      },
      options
    );
  }

  // GPS追跡停止（cl改善版）
  public stopTracking(): void {
    console.log('[GPSTracker] GPS追跡停止');

    // 残った累積距離があれば追加
    if (this.accumulatedDistance > 2) {
      this.totalDistance += this.accumulatedDistance;
      console.log('[GPSTracker] 終了時累積追加', {
        addedDistance: `${this.accumulatedDistance.toFixed(2)}m`,
        totalDistance: `${this.totalDistance.toFixed(2)}m`,
      });

      if (this.onDistanceUpdate) {
        this.onDistanceUpdate(this.totalDistance);
      }
    }

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      console.log('[GPSTracker] watchPosition停止');
    }

    if (this.updateTimerId) {
      clearInterval(this.updateTimerId);
      this.updateTimerId = null;
      console.log('[GPSTracker] 定時更新方式タイマー停止');
    }

    this.usingTimerUpdate = false;
    this.positionUpdateCount = 0;
  }

  // 現在の総距離を取得
  public getTotalDistance(): number {
    return this.totalDistance;
  }

  // 現在の位置を取得
  public getCurrentPosition(): GPSPosition | null {
    return this.currentPosition;
  }

  // 距離をリセット（cl改善版）
  public resetDistance(): void {
    console.log('[GPSTracker] 距離リセット（cl改善版）');
    this.totalDistance = 0;
    this.accumulatedDistance = 0;
    this.consecutiveSmallMoves = 0;
    this.positionHistory = [];
    this.startPosition = null;
    this.previousPosition = null;
    this.lastRecordedPosition = null;
  }

  // 追跡中かどうかを確認
  public isTracking(): boolean {
    return this.watchId !== null || this.updateTimerId !== null;
  }

  // デバッグ情報を取得（cl改善版）
  public getDebugInfo(): {
    watchId: number | null;
    positionUpdateCount: number;
    usingTimerUpdate: boolean;
    totalDistance: number;
    accumulatedDistance: number;
    consecutiveSmallMoves: number;
    positionHistoryLength: number;
  } {
    return {
      watchId: this.watchId,
      positionUpdateCount: this.positionUpdateCount,
      usingTimerUpdate: this.usingTimerUpdate,
      totalDistance: this.totalDistance,
      accumulatedDistance: this.accumulatedDistance,
      consecutiveSmallMoves: this.consecutiveSmallMoves,
      positionHistoryLength: this.positionHistory.length,
    };
  }

  // 累積距離を取得
  public getAccumulatedDistance(): number {
    return this.accumulatedDistance;
  }
}

// ユーティリティ関数：位置情報の許可状態を確認
export const checkLocationPermission = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        resolve(true);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve(false);
        } else {
          resolve(true); // 他のエラーは一時的なものとして許可ありとみなす
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });

// ユーティリティ関数：位置情報の精度レベルを取得
export const getAccuracyLevel = (accuracy: number): string => {
  if (accuracy <= 5) return '非常に高精度';
  if (accuracy <= 10) return '高精度';
  if (accuracy <= 20) return '中精度';
  if (accuracy <= 50) return '低精度';
  return '非常に低精度';
};
