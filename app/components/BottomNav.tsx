import { NavLink } from "react-router";
import { House, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navItems: {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  disabled: boolean;
}[] = [
  { to: "/", label: "ホーム", icon: House, end: true, disabled: false },
  { to: "/history", label: "履歴", icon: History, end: false, disabled: false },
];

export default function BottomNav() {
  return (
    <nav className="shrink-0 bg-white border-t border-slate-100 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {navItems.map((item) =>
          item.disabled ? (
            <li key={item.to} className="flex-1">
              <span className="flex flex-col items-center justify-center gap-0.5 py-3 min-h-14 text-slate-300 cursor-default select-none">
                <item.icon size={22} />
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
                <item.icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
