import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  JST_OFFSET_MS,
  jstMonthBounds,
  jstWeekBounds,
  toJSTDateString,
} from "./date";

describe("toJSTDateString", () => {
  test("UTC深夜（JST午前9時）は同日になる", () => {
    expect(toJSTDateString("2024-01-01T00:00:00Z")).toBe("2024-01-01");
  });

  test("UTC15:30はJSTで翌日0:30になる", () => {
    // 2024-01-01T15:30:00Z → JST 2024-01-02T00:30:00
    expect(toJSTDateString("2024-01-01T15:30:00Z")).toBe("2024-01-02");
  });

  test("UTC14:59はJSTで同日23:59になる", () => {
    // 2024-01-01T14:59:00Z → JST 2024-01-01T23:59:00
    expect(toJSTDateString("2024-01-01T14:59:00Z")).toBe("2024-01-01");
  });

  test("UTC15:00ちょうどはJSTで翌日0:00になる", () => {
    // 2024-01-01T15:00:00Z → JST 2024-01-02T00:00:00
    expect(toJSTDateString("2024-01-01T15:00:00Z")).toBe("2024-01-02");
  });
});

describe("jstMonthBounds", () => {
  test("1月の開始はUTCで前日15:00", () => {
    const { start } = jstMonthBounds(2024, 1);
    expect(start.toISOString()).toBe("2023-12-31T15:00:00.000Z");
  });

  test("1月の終了はUTCで翌月1日15:00（＝1月31日JST深夜を超えない）", () => {
    const { end } = jstMonthBounds(2024, 1);
    expect(end.toISOString()).toBe("2024-01-31T15:00:00.000Z");
  });

  test("12月の開始はUTCで11月30日15:00", () => {
    const { start } = jstMonthBounds(2024, 12);
    expect(start.toISOString()).toBe("2024-11-30T15:00:00.000Z");
  });

  test("12月の終了はUTCで翌年1月1日15:00", () => {
    const { end } = jstMonthBounds(2024, 12);
    expect(end.toISOString()).toBe("2024-12-31T15:00:00.000Z");
  });

  test("うるう年2月の終了はUTCで3月1日15:00", () => {
    // 2024年はうるう年（2月29日まで）
    const { end } = jstMonthBounds(2024, 2);
    expect(end.toISOString()).toBe("2024-02-29T15:00:00.000Z");
  });
});

describe("jstWeekBounds", () => {
  // 2024-01-10 (水曜 UTC) = JST でも水曜日
  const WEDNESDAY_UTC = new Date("2024-01-10T00:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("weekOffset=0: 今週月曜（JST）の UTC 15:00 が start", () => {
    vi.setSystemTime(WEDNESDAY_UTC);
    const { start } = jstWeekBounds(0);
    // 今週月曜は2024-01-08 JST → UTC では 2024-01-07T15:00:00Z
    expect(start.toISOString()).toBe("2024-01-07T15:00:00.000Z");
  });

  test("weekOffset=0: 来週月曜（JST）の UTC 15:00 が end", () => {
    vi.setSystemTime(WEDNESDAY_UTC);
    const { end } = jstWeekBounds(0);
    // 来週月曜は2024-01-15 JST → UTC では 2024-01-14T15:00:00Z
    expect(end.toISOString()).toBe("2024-01-14T15:00:00.000Z");
  });

  test("weekOffset=-1: 先週の範囲を返す", () => {
    vi.setSystemTime(WEDNESDAY_UTC);
    const { start, end } = jstWeekBounds(-1);
    // 先週月曜は2024-01-01 JST → UTC 2023-12-31T15:00:00Z
    expect(start.toISOString()).toBe("2023-12-31T15:00:00.000Z");
    // 先週日曜の翌日（今週月曜）JST → UTC 2024-01-07T15:00:00Z
    expect(end.toISOString()).toBe("2024-01-07T15:00:00.000Z");
  });

  test("月曜日の場合: daysSinceMon=0 で今週月曜が start", () => {
    // 2024-01-08 は月曜 UTC
    vi.setSystemTime(new Date("2024-01-08T00:00:00Z"));
    const { start } = jstWeekBounds(0);
    // 月曜 JST → UTC 2024-01-07T15:00:00Z
    expect(start.toISOString()).toBe("2024-01-07T15:00:00.000Z");
  });

  test("日曜日の場合: daysSinceMon=6 で今週月曜が start", () => {
    // 2024-01-14 は日曜 UTC
    vi.setSystemTime(new Date("2024-01-14T00:00:00Z"));
    const { start } = jstWeekBounds(0);
    // 今週月曜は2024-01-08 JST → UTC 2024-01-07T15:00:00Z
    expect(start.toISOString()).toBe("2024-01-07T15:00:00.000Z");
  });
});

describe("JST_OFFSET_MS", () => {
  test("9時間分のミリ秒", () => {
    expect(JST_OFFSET_MS).toBe(9 * 60 * 60 * 1000);
  });
});
