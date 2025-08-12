/**
 * UTCのISO文字列 → 日本時間の "YYYY-MM-DD" 文字列
 */
export function utcIsoToJstDateString(utcIsoString: string): string {
  const date = new Date(utcIsoString);
  // 9時間足す
  if (Number.isNaN(date.getTime())) return 'Invalid Date'; // MEMO_日付が無効な場合testにより追加
  date.setHours(date.getHours() + 9);
  return date.toISOString().slice(0, 10);
}

/**
 * 日本時間のDateオブジェクト → "YYYY-MM-DD" 文字列
 */
export function jstDateToDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * "YYYY-MM-DD" 文字列 → 日本時間のDateオブジェクト
 */
export function dateStringToJstDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
