import { data, redirect, Outlet, NavLink } from "react-router";
import type { Route } from "./+types/app";
import { createSupabaseClient } from "~/lib/supabase.server";
import { JST_OFFSET_MS } from "~/lib/date";

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
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[jst.getUTCDay()];
  return `${month}月${day}日（${weekday}）`;
}

const navItems = [
  { to: "/app", label: "ホーム", icon: "🏠", end: true, disabled: false },
  { to: "/app/history", label: "履歴", icon: "📊", end: false, disabled: false },
];

export default function AppLayout() {
  const dateLabel = formatJapaneseDate(new Date());

  return (
    <div className="h-dvh bg-slate-50 flex flex-col max-w-lg mx-auto">
      {/* ヘッダー */}
      <header className="shrink-0 flex items-center justify-between px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-4 bg-slate-50">
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

      {/* コピーライト */}
      <footer className="shrink-0 text-center py-1">
        <p className="text-slate-400 text-[10px]">
          © 2026 yamaday0u. All rights reserved.
        </p>
      </footer>

      {/* ボトムナビゲーション */}
      <nav className="shrink-0 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex">
          {navItems.map((item) =>
            item.disabled ? (
              <li key={item.to} className="flex-1">
                <span className="flex flex-col items-center justify-center gap-0.5 py-3 min-h-14 text-slate-300 cursor-default select-none">
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-[9px] leading-none -mt-0.5">
                    Coming soon
                  </span>
                </span>
              </li>
            ) : (
              <li key={item.to} className="flex-1">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-0.5 py-3 text-xs font-medium transition-colors min-h-14 ${
                      isActive ? "text-slate-700" : "text-slate-400"
                    }`
                  }
                >
                  <span className="text-xl leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ),
          )}
        </ul>
      </nav>
    </div>
  );
}
