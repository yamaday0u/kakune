import { data, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/app-item-detail";
import { createSupabaseClient } from "~/lib/supabase.server";

type Log = {
  id: string;
  checked_at: string;
  photo_path: string | null;
  signedUrl: string | null;
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login", { headers: responseHeaders });
  }

  const itemId = params.id as string;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [{ data: item }, { data: rawLogs }] = await Promise.all([
    supabase
      .from("check_items")
      .select("id, name, icon")
      .eq("id", itemId)
      .single(),
    supabase
      .from("check_logs")
      .select("id, checked_at, photo_path")
      .eq("check_item_id", itemId)
      .gte("checked_at", todayStart.toISOString())
      .lt("checked_at", tomorrowStart.toISOString())
      .order("checked_at", { ascending: false }),
  ]);

  if (!item) {
    return redirect("/app", { headers: responseHeaders });
  }

  // 写真のある記録に署名付きURLを生成
  const logs: Log[] = await Promise.all(
    (rawLogs ?? []).map(async (log) => {
      if (!log.photo_path) return { ...log, signedUrl: null };
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(log.photo_path, 3600);
      return { ...log, signedUrl: signed?.signedUrl ?? null };
    }),
  );

  // 最新の写真URL（一番最近の写真付きログから取得）
  const latestPhotoLog = logs.find((l) => l.signedUrl !== null) ?? null;

  return data(
    { item, logs, latestPhotoUrl: latestPhotoLog?.signedUrl ?? null },
    { headers: responseHeaders },
  );
}

function formatTime(isoString: string) {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AppItemDetail() {
  const { item, logs, latestPhotoUrl } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col min-h-full">
      {/* 戻るリンク */}
      <div className="px-1 pt-2 pb-4">
        <a
          href="/app"
          className="text-slate-400 text-sm flex items-center gap-1"
        >
          <span aria-hidden>←</span> ホームへ
        </a>
      </div>

      {/* アイテム名 */}
      <div className="flex items-center gap-3 px-1 pb-6">
        <span className="text-3xl">{item.icon ?? "✔️"}</span>
        <h2 className="text-xl font-bold text-slate-700">{item.name}</h2>
      </div>

      {/* 写真エリア */}
      <div className="flex-1 flex items-center justify-center bg-slate-100 rounded-2xl overflow-hidden min-h-60 mx-0">
        {latestPhotoUrl ? (
          <img
            src={latestPhotoUrl}
            alt={`${item.name}の確認写真`}
            className="w-full h-full object-contain max-h-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
            <span className="text-5xl">📷</span>
            <p className="text-sm">まだ写真がありません</p>
          </div>
        )}
      </div>

      {/* カウント＆ログ一覧 */}
      <div className="pt-6 pb-2">
        <div className="flex items-baseline gap-2 px-1 mb-4">
          <span className="text-4xl font-bold tabular-nums text-slate-700">
            {logs.length}
          </span>
          <span className="text-base text-slate-500">回確認済み（今日）</span>
        </div>

        {logs.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-1 bg-white rounded-xl px-3 py-2 text-sm text-slate-600 shadow-sm"
              >
                <span className="tabular-nums">
                  {formatTime(log.checked_at)}
                </span>
                {log.photo_path && (
                  <span className="text-xs text-sky-400" aria-label="写真あり">
                    📷
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
