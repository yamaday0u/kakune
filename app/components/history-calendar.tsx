import { useNavigate, useSearchParams } from "react-router";
import { toJSTDateString } from "~/lib/date";

export type CalendarDay = {
  date: string; // "YYYY-MM-DD"
  count: number;
  byItem: { id: string; name: string; icon: string | null; count: number }[];
};

function heatmapClass(count: number): string {
  if (count === 0) return "bg-slate-100 text-slate-300";
  if (count <= 2) return "bg-sky-100 text-sky-700";
  if (count <= 5) return "bg-sky-200 text-sky-800";
  return "bg-sky-300 text-sky-900";
}

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

export function SummaryCard({
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

export function CalendarGrid({
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
  const [searchParams] = useSearchParams();
  const cells = buildCalendarCells(year, month);
  const currentMonthStr = `${year}-${String(month).padStart(2, "0")}`;
  const nowJSTMonth = toJSTDateString(new Date().toISOString()).slice(0, 7);
  const canGoNext = currentMonthStr < nowJSTMonth;

  function buildMonthUrl(monthStr: string) {
    const params = new URLSearchParams(searchParams);
    params.set("month", monthStr);
    return `/app/history?${params.toString()}`;
  }

  function goToPrevMonth() {
    const prev =
      month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, "0")}`;
    navigate(buildMonthUrl(prev));
  }

  function goToNextMonth() {
    if (!canGoNext) return;
    const next =
      month === 12
        ? `${year + 1}-01`
        : `${year}-${String(month + 1).padStart(2, "0")}`;
    navigate(buildMonthUrl(next));
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

export function DayModal({
  day,
  onClose,
}: {
  day: CalendarDay;
  onClose: () => void;
}) {
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
