import { NavLink } from "react-router";
import { Settings } from "lucide-react";
import { JST_OFFSET_MS } from "~/lib/date";

function formatJapaneseDate() {
  const nowJST = new Date(Date.now() + JST_OFFSET_MS);
  const month = nowJST.getUTCMonth() + 1;
  const day = nowJST.getUTCDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[nowJST.getUTCDay()];
  return `${month}月${day}日（${weekday}）`;
}

export default function Header() {
  const dateLabel = formatJapaneseDate();
  return (
    <header className="shrink-0 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 bg-slate-200 border-2 border-slate-200 ">
      <h1 className="text-base font-medium text-slate-600">{dateLabel}</h1>
      <NavLink
        to="/settings"
        aria-label="設定"
        className="text-slate-400 text-2xl leading-none p-1 -mr-1"
      >
        <Settings size={22} />
      </NavLink>
    </header>
  );
}
