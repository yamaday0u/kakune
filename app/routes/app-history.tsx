import { data, redirect, useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import type { Route } from "./+types/app-history";
import { createSupabaseClient } from "~/lib/supabase.server";

// ─── Timezone utilities ────────────────────────────────────────────────────────

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC ISO string → JST の日付文字列 "YYYY-MM-DD" */
function toJSTDateString(utcISO: string): string {
  const d = new Date(new Date(utcISO).getTime() + JST_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}

/** JST の月境界を UTC の Date として返す（month は 1-based）*/
function jstMonthBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS);
  return { start, end };
}

/** JST の週（月曜始まり）境界を UTC の Date として返す。
 *  weekOffset=0 → 今週, weekOffset=-1 → 先週 */
function jstWeekBounds(weekOffset = 0) {
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

// ─── Types ─────────────────────────────────────────────────────────────────────

type CalendarDay = {
  date: string; // "YYYY-MM-DD"
  count: number;
  byItem: { id: string; name: string; icon: string | null; count: number }[];
};

// ─── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login", { headers: responseHeaders });

  // ?month=YYYY-MM のパース（未指定 or 不正なら現在の JST 月）
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");
  const nowJST = new Date(Date.now() + JST_OFFSET_MS);
  const defaultMonth = `${nowJST.getUTCFullYear()}-${String(nowJST.getUTCMonth() + 1).padStart(2, "0")}`;
  const currentMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : defaultMonth;

  const todayStr = toJSTDateString(new Date().toISOString());
  const [y, m] = currentMonth.split("-").map(Number);
  const { start: monthStart, end: monthEnd } = jstMonthBounds(y, m);
  const { start: thisWeekStart, end: thisWeekEnd } = jstWeekBounds(0);
  const { start: lastWeekStart, end: lastWeekEnd } = jstWeekBounds(-1);

  const [
    { data: monthLogs },
    { count: thisWeekCount },
    { count: lastWeekCount },
    { data: itemsList },
  ] = await Promise.all([
    supabase
      .from("check_logs")
      .select("check_item_id, checked_at")
      .gte("checked_at", monthStart.toISOString())
      .lt("checked_at", monthEnd.toISOString()),
    supabase
      .from("check_logs")
      .select("*", { count: "exact", head: true })
      .gte("checked_at", thisWeekStart.toISOString())
      .lt("checked_at", thisWeekEnd.toISOString()),
    supabase
      .from("check_logs")
      .select("*", { count: "exact", head: true })
      .gte("checked_at", lastWeekStart.toISOString())
      .lt("checked_at", lastWeekEnd.toISOString()),
    // アーカイブ済み含む全アイテム（履歴に過去データが残っている場合も名前表示）
    supabase.from("check_items").select("id, name, icon"),
  ]);

  // JST 日付 × アイテムIDでカウント集計
  const countByDateItem: Record<string, Record<string, number>> = {};
  for (const log of monthLogs ?? []) {
    const d = toJSTDateString(log.checked_at);
    if (!countByDateItem[d]) countByDateItem[d] = {};
    countByDateItem[d][log.check_item_id] =
      (countByDateItem[d][log.check_item_id] ?? 0) + 1;
  }

  const itemsById = Object.fromEntries((itemsList ?? []).map((i) => [i.id, i]));
  const calendarData: CalendarDay[] = Object.entries(countByDateItem).map(
    ([date, byItemId]) => {
      const byItem = Object.entries(byItemId)
        .map(([id, count]) => ({
          id,
          name: itemsById[id]?.name ?? "削除済み",
          icon: itemsById[id]?.icon ?? null,
          count,
        }))
        .sort((a, b) => b.count - a.count);
      return {
        date,
        count: byItem.reduce((s, i) => s + i.count, 0),
        byItem,
      };
    },
  );

  return data(
    {
      summary: {
        thisWeek: thisWeekCount ?? 0,
        lastWeek: lastWeekCount ?? 0,
      },
      calendarData,
      currentMonth,
      todayStr,
    },
    { headers: responseHeaders },
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function heatmapClass(count: number): string {
  if (count === 0) return "bg-slate-100 text-slate-300";
  if (count <= 2) return "bg-sky-100 text-sky-700";
  if (count <= 5) return "bg-sky-200 text-sky-800";
  return "bg-sky-300 text-sky-900";
}

/** カレンダーグリッド用セル配列。null は空白パディング（月曜始まり）*/
function buildCalendarCells(year: number, month: number): (number | null)[] {
  const dow = new Date(year, month - 1, 1).getDay(); // 0=日
  const firstDow = (dow + 6) % 7; // 月曜=0 に変換（日曜=6）
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array<null>(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── SummaryCard ───────────────────────────────────────────────────────────────

function SummaryCard({
  thisWeek,
  lastWeek,
}: {
  thisWeek: number;
  lastWeek: number;
}) {
  const diff = thisWeek - lastWeek;

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">今週</p>
          <p className="text-3xl font-bold tabular-nums text-slate-700 leading-none">
            {thisWeek}
            <span className="text-base font-normal text-slate-500 ml-1">
              回
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 mb-0.5">前週</p>
          <p className="text-xl font-medium tabular-nums text-slate-500 leading-none">
            {lastWeek}
            <span className="text-sm font-normal text-slate-400 ml-1">回</span>
          </p>
          {diff !== 0 && (
            <p className="text-xs text-slate-400 mt-1 tabular-nums">
              前週比 {diff > 0 ? "+" : ""}
              {diff}回
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CalendarGrid ──────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function CalendarGrid({
  year,
  month,
  calendarMap,
  todayStr,
  onDayClick,
}: {
  year: number;
  month: number;
  calendarMap: Record<string, CalendarDay>;
  todayStr: string;
  onDayClick: (day: CalendarDay) => void;
}) {
  const navigate = useNavigate();
  const cells = buildCalendarCells(year, month);
  const currentMonthStr = `${year}-${String(month).padStart(2, "0")}`;
  // 現在の JST 月（未来月への移動を防ぐ）
  const nowJSTMonth = toJSTDateString(new Date().toISOString()).slice(0, 7);
  const canGoNext = currentMonthStr < nowJSTMonth;

  function goToPrevMonth() {
    const prev =
      month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, "0")}`;
    navigate(`/app/history?month=${prev}`);
  }

  function goToNextMonth() {
    if (!canGoNext) return;
    const next =
      month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, "0")}`;
    navigate(`/app/history?month=${next}`);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="flex items-center justify-center min-w-11 min-h-11 text-2xl text-slate-400 active:text-slate-600 transition-colors"
          aria-label="前の月"
        >
          ‹
        </button>
        <span className="text-base font-medium text-slate-700">
          {year}年{month}月
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          disabled={!canGoNext}
          className="flex items-center justify-center min-w-11 min-h-11 text-2xl transition-colors disabled:text-slate-200 text-slate-400 active:text-slate-600"
          aria-label="次の月"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-xs text-slate-400 font-medium"
          >
            {label}
          </div>
        ))}
      </div>

      {/* 日付セル */}
      <div className="grid grid-cols-7 p-1.5 gap-1">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayData = calendarMap[dateStr];
          const count = dayData?.count ?? 0;
          const isToday = dateStr === todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              disabled={count === 0}
              onClick={() => dayData && onDayClick(dayData)}
              className={[
                "flex flex-col items-center justify-center aspect-square rounded-xl text-xs transition-all",
                heatmapClass(count),
                isToday ? "ring-2 ring-sky-400" : "",
                count > 0 ? "active:brightness-95" : "cursor-default",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="text-[11px] font-medium leading-none">
                {day}
              </span>
              {count > 0 && (
                <span className="text-[11px] font-bold tabular-nums leading-none mt-0.5">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── DayModal ─────────────────────────────────────────────────────────────────

function DayModal({ day, onClose }: { day: CalendarDay; onClose: () => void }) {
  const [year, month, d] = day.date.split("-").map(Number);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[new Date(year, month - 1, d).getDay()];
  const label = `${month}月${d}日（${weekday}）`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/40" aria-hidden />

      {/* モーダル本体 */}
      <div
        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-medium text-slate-700">
            {label}の記録
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center min-w-11 min-h-11 -mr-2 text-xl text-slate-400 active:text-slate-600 transition-colors"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        {/* アイテム一覧 */}
        <ul className="divide-y divide-slate-100">
          {day.byItem.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="text-2xl w-8 text-center shrink-0">
                {item.icon ?? "✔️"}
              </span>
              <span className="flex-1 text-base text-slate-700">
                {item.name}
              </span>
              <span className="text-base font-bold tabular-nums text-slate-600">
                {item.count}
                <span className="text-sm font-normal text-slate-400 ml-0.5">
                  回
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* フッター：合計 */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
          <span className="text-sm text-slate-500">合計</span>
          <span className="text-base font-bold tabular-nums text-slate-700">
            {day.count}
            <span className="text-sm font-normal text-slate-500 ml-0.5">
              回
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function AppHistory() {
  const { summary, calendarData, currentMonth, todayStr } =
    useLoaderData<typeof loader>();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [year, month] = currentMonth.split("-").map(Number);

  const calendarMap = Object.fromEntries(calendarData.map((d) => [d.date, d]));

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <SummaryCard {...summary} />
      <CalendarGrid
        year={year}
        month={month}
        calendarMap={calendarMap}
        todayStr={todayStr}
        onDayClick={setSelectedDay}
      />
      {selectedDay && (
        <DayModal day={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}
