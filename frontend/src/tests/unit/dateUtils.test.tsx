'use client';

import {
  utcIsoToJstDateString,
  jstDateToDateString,
  dateStringToJstDate,
} from '@/lib/dateUtils';

describe('dateUtils.ts のユーティリティ関数', () => {
  it('utcIsoToJstDateString: JST日付文字列に変換できる', () => {
    const utc = '2023-01-01T00:00:00Z';
    expect(utcIsoToJstDateString(utc)).toBe('2023-01-01'); // JSTで9:00になる
  });

  it('jstDateToDateString: Dateを"YYYY-MM-DD"文字列に変換できる', () => {
    const date = new Date(2023, 4, 5); // 月は0-indexなので5月
    expect(jstDateToDateString(date)).toBe('2023-05-05');
  });

  it('dateStringToJstDate: 文字列を正しいDate型に変換できる', () => {
    const result = dateStringToJstDate('2023-07-18');
    expect(result.getFullYear()).toBe(2023);
    expect(result.getMonth()).toBe(6); // 7月 -> 6
    expect(result.getDate()).toBe(18);
  });

  it('utcIsoToJstDateString: 不正な日付を渡すと "Invalid Date" を返す', () => {
    const invalid = 'invalid-date';
    const result = utcIsoToJstDateString(invalid);
    expect(utcIsoToJstDateString('invalid-date')).toBe('Invalid Date'); // 変換に失敗してもtoISOString()はNaNになる
  });

  it('dateStringToJstDate: 不正な日付文字列も Date型にはなる（NaN）', () => {
    const result = dateStringToJstDate('invalid-date');
    expect(result instanceof Date).toBe(true);
    expect(isNaN(result.getTime())).toBe(true); // Invalid date
  });
});
