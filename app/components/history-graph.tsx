import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { JST_OFFSET_MS } from "~/lib/date";

export type GraphLog = {
  check_item_id: string;
  checked_at: string;
};

export type GraphItem = {
  id: string;
  name: string;
  icon: string | null;
};

type DataPoint = Record<string, number | string>;

const LINE_COLORS = [
  "#0ea5e9", // sky-500
  "#f97316", // orange-500
  "#a855f7", // purple-500
  "#22c55e", // green-500
  "#ef4444", // red-500
  "#eab308", // yellow-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
];

// ─── Data aggregation ──────────────────────────────────────────────────────────

function buildDailyData(logs: GraphLog[], items: GraphItem[]): DataPoint[] {
  const nowJSTMs = Date.now() + JST_OFFSET_MS;
  const todayJSTMidnightMs = nowJSTMs - (nowJSTMs % (24 * 60 * 60 * 1000));

  // 過去30日分の日付リスト（JST）
  const days: { dateStr: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayMs = todayJSTMidnightMs - i * 24 * 60 * 60 * 1000;
    const d = new Date(dayMs);
    const dateStr = d.toISOString().slice(0, 10);
    const m = parseInt(dateStr.slice(5, 7));
    const day = parseInt(dateStr.slice(8, 10));
    days.push({ dateStr, label: `${m}/${day}` });
  }

  // 日付 × アイテムID でカウント集計
  const countByDateItem: Record<string, Record<string, number>> = {};
  for (const log of logs) {
    const d = new Date(new Date(log.checked_at).getTime() + JST_OFFSET_MS);
    const dateStr = d.toISOString().slice(0, 10);
    if (!countByDateItem[dateStr]) countByDateItem[dateStr] = {};
    countByDateItem[dateStr][log.check_item_id] =
      (countByDateItem[dateStr][log.check_item_id] ?? 0) + 1;
  }

  return days.map(({ dateStr, label }) => {
    const point: DataPoint = { date: label };
    for (const item of items) {
      point[item.id] = countByDateItem[dateStr]?.[item.id] ?? 0;
    }
    return point;
  });
}

function buildWeeklyData(logs: GraphLog[], items: GraphItem[]): DataPoint[] {
  const nowJSTMs = Date.now() + JST_OFFSET_MS;
  const nowJST = new Date(nowJSTMs);
  const dowJST = nowJST.getUTCDay(); // 0=日
  const daysSinceMon = dowJST === 0 ? 6 : dowJST - 1;
  const todayJSTMidnightMs = nowJSTMs - (nowJSTMs % (24 * 60 * 60 * 1000));
  const thisMondayMs = todayJSTMidnightMs - daysSinceMon * 24 * 60 * 60 * 1000;

  // 過去12週のデータ（古い順）
  const weeks: { startMs: number; endMs: number; label: string }[] = [];
  for (let i = 11; i >= 0; i--) {
    const startMs = thisMondayMs - i * 7 * 24 * 60 * 60 * 1000;
    const endMs = startMs + 7 * 24 * 60 * 60 * 1000;
    const startJST = new Date(startMs);
    const label =
      i === 0
        ? "今週"
        : `${startJST.getUTCMonth() + 1}/${startJST.getUTCDate()}〜`;
    weeks.push({ startMs, endMs, label });
  }

  return weeks.map(({ startMs, endMs, label }) => {
    // startMs/endMs は JST 深夜 0 時基準（UTC に変換して比較）
    const startUTC = startMs - JST_OFFSET_MS;
    const endUTC = endMs - JST_OFFSET_MS;
    const point: DataPoint = { week: label };
    for (const item of items) {
      const count = logs.filter((log) => {
        if (log.check_item_id !== item.id) return false;
        const t = new Date(log.checked_at).getTime();
        return t >= startUTC && t < endUTC;
      }).length;
      point[item.id] = count;
    }
    return point;
  });
}

// ─── GraphView ─────────────────────────────────────────────────────────────────

export function GraphView({
  graphLogs,
  items,
  period,
  onPeriodChange,
}: {
  graphLogs: GraphLog[];
  items: GraphItem[];
  period: "daily" | "weekly";
  onPeriodChange: (p: "daily" | "weekly") => void;
}) {
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  // Recharts の ResponsiveContainer は SSR で動作しないためクライアント側のみで描画
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const data =
    period === "daily"
      ? buildDailyData(graphLogs, items)
      : buildWeeklyData(graphLogs, items);

  const xKey = period === "daily" ? "date" : "week";

  function toggleItem(id: string) {
    setHiddenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* 期間切替 */}
      <div className="flex items-center gap-1 p-3 border-b border-slate-100">
        <button
          type="button"
          onClick={() => onPeriodChange("daily")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            period === "daily"
              ? "bg-sky-50 text-sky-600"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          日別（30日）
        </button>
        <button
          type="button"
          onClick={() => onPeriodChange("weekly")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            period === "weekly"
              ? "bg-sky-50 text-sky-600"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          週別（12週）
        </button>
      </div>

      {/* グラフエリア */}
      <div className="px-2 pt-4 pb-2">
        {mounted ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 16, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey={xKey}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={period === "daily" ? 4 : 1}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
                formatter={(value, name) => {
                  const item = items.find((i) => i.id === name);
                  const label = item
                    ? `${item.icon ?? ""} ${item.name}`.trim()
                    : String(name);
                  return [`${value}回`, label];
                }}
              />
              {items.map((item, idx) =>
                hiddenItems.has(item.id) ? null : (
                  <Line
                    key={item.id}
                    type="monotone"
                    dataKey={item.id}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ),
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-60 bg-slate-50 rounded-xl animate-pulse" />
        )}
      </div>

      {/* アイテムトグル */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-4 pt-1">
          {items.map((item, idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            const hidden = hiddenItems.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  hidden
                    ? "border-slate-200 text-slate-400 bg-white"
                    : "border-transparent text-white"
                }`}
                style={hidden ? {} : { backgroundColor: color }}
              >
                <span>{item.icon ?? "✔️"}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
