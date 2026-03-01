export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC ISO string → JST の日付文字列 "YYYY-MM-DD" */
export function toJSTDateString(utcISO: string): string {
  const d = new Date(new Date(utcISO).getTime() + JST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** JST の月境界を UTC の Date として返す（month は 1-based）*/
export function jstMonthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS);
  return { start, end };
}

/** JST の週（月曜始まり）境界を UTC の Date として返す。
 *  weekOffset=0 → 今週, weekOffset=-1 → 先週 */
export function jstWeekBounds(weekOffset = 0) {
  const nowJSTMs = Date.now() + JST_OFFSET_MS;
  const nowJST = new Date(nowJSTMs);
  const dowJST = nowJST.getUTCDay(); // 0=日
  const daysSinceMon = dowJST === 0 ? 6 : dowJST - 1;
  // 今日の JST 深夜 0 時（"JST as UTC" 空間）
  const todayJSTMidnightMs = nowJSTMs - (nowJSTMs % (24 * 60 * 60 * 1000));
  // 今週月曜の JST 深夜 0 時
  const thisMondayMs = todayJSTMidnightMs - daysSinceMon * 24 * 60 * 60 * 1000;
  // 対象週の月曜
  const targetMondayMs = thisMondayMs + weekOffset * 7 * 24 * 60 * 60 * 1000;
  const start = new Date(targetMondayMs - JST_OFFSET_MS);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}
