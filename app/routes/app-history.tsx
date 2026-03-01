import {
  data,
  redirect,
  useLoaderData,
  useSearchParams,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import { useState } from "react";
import type { Route } from "./+types/app-history";
import { createSupabaseClient } from "~/lib/supabase.server";
import {
  JST_OFFSET_MS,
  toJSTDateString,
  jstMonthBounds,
  jstWeekBounds,
} from "~/lib/date";
import type { CalendarDay } from "~/components/history-calendar";
import {
  SummaryCard,
  CalendarGrid,
  DayModal,
} from "~/components/history-calendar";
import { GraphView } from "~/components/history-graph";

// ─── shouldRevalidate ─────────────────────────────────────────────────────────

// view / period パラメータの変更ではローダーを再実行しない
export function shouldRevalidate({
  nextUrl,
  currentUrl,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (nextUrl.pathname !== currentUrl.pathname) return defaultShouldRevalidate;

  const nextMonth = nextUrl.searchParams.get("month");
  const currentMonth = currentUrl.searchParams.get("month");
  if (nextMonth !== currentMonth) return true;

  // month が同じなら view/period の変化のみ → 再実行不要
  return false;
}

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

  // グラフ用: 過去84日分（12週）
  const graphStart = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);

  const [
    { data: monthLogs },
    { count: thisWeekCount },
    { count: lastWeekCount },
    { data: itemsList },
    { data: graphLogs },
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
    // グラフ用ログ（過去84日）
    supabase
      .from("check_logs")
      .select("check_item_id, checked_at")
      .gte("checked_at", graphStart.toISOString()),
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
      graphLogs: graphLogs ?? [],
      items: itemsList ?? [],
    },
    { headers: responseHeaders },
  );
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function AppHistory() {
  const { summary, calendarData, currentMonth, todayStr, graphLogs, items } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [year, month] = currentMonth.split("-").map(Number);

  const view =
    searchParams.get("view") === "graph" ? "graph" : "calendar";
  const period =
    searchParams.get("period") === "weekly" ? "weekly" : "daily";

  const calendarMap = Object.fromEntries(calendarData.map((d) => [d.date, d]));

  function setView(v: "calendar" | "graph") {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v === "calendar") {
          next.delete("view");
          next.delete("period");
        } else {
          next.set("view", v);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  }

  function setPeriod(p: "daily" | "weekly") {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (p === "daily") {
          next.delete("period");
        } else {
          next.set("period", p);
        }
        return next;
      },
      { preventScrollReset: true },
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <SummaryCard {...summary} />

      {/* ビュー切替タブ */}
      <div className="flex items-center gap-1 bg-white rounded-2xl shadow-sm p-1">
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            view === "calendar"
              ? "bg-sky-50 text-sky-600"
              : "text-slate-500"
          }`}
        >
          📅 カレンダー
        </button>
        <button
          type="button"
          onClick={() => setView("graph")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            view === "graph"
              ? "bg-sky-50 text-sky-600"
              : "text-slate-500"
          }`}
        >
          📈 グラフ
        </button>
      </div>

      {view === "calendar" ? (
        <>
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
        </>
      ) : (
        <GraphView
          graphLogs={graphLogs}
          items={items}
          period={period}
          onPeriodChange={setPeriod}
        />
      )}
    </div>
  );
}
