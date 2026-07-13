import { data, redirect, Outlet } from "react-router";
import type { Route } from "./+types/app";
import { createSupabaseClient } from "~/lib/supabase.server";
import Header from "~/components/Header";
import BottomNav from "~/components/BottomNav";

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

export default function AppLayout() {
  return (
    <div className="h-dvh bg-slate-50 flex flex-col max-w-lg mx-auto">
      <Header />

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      {/* コピーライト */}
      <footer className="shrink-0 text-center py-1">
        <p className="text-slate-400 text-[10px]">
          © 2026 yamaday0u. All rights reserved.
        </p>
      </footer>

      <BottomNav />
    </div>
  );
}
