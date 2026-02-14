import { data, redirect, Outlet, NavLink } from "react-router";
import type { Route } from "./+types/app";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login", { headers: responseHeaders });
  }

  return data({ user }, { headers: responseHeaders });
}

function formatJapaneseDate(date: Date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日（${weekday}）`;
}

const navItems = [
  { to: "/app", label: "ホーム", icon: "🏠", end: true },
  { to: "/app/history", label: "履歴", icon: "📊", end: false },
  { to: "/app/settings", label: "設定", icon: "⚙️", end: false },
];

export default function AppLayout() {
  const dateLabel = formatJapaneseDate(new Date());

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col max-w-lg mx-auto">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-5 pt-12 pb-4 bg-slate-50">
        <h1 className="text-base font-medium text-slate-600">{dateLabel}</h1>
        <NavLink
          to="/app/settings"
          aria-label="設定"
          className="text-slate-400 text-2xl leading-none p-1 -mr-1"
        >
          ⚙️
        </NavLink>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto px-4 pb-4">
        <Outlet />
      </main>

      {/* ボトムナビゲーション */}
      <nav className="bg-white border-t border-slate-100 safe-area-inset-bottom">
        <ul className="flex">
          {navItems.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors min-h-[56px] ${
                    isActive ? "text-slate-700" : "text-slate-400"
                  }`
                }
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
