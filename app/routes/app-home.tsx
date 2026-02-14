import { data, redirect, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/app-home";
import { createSupabaseClient } from "~/lib/supabase.server";

type CheckItem = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  todayCount: number;
};

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login", { headers: responseHeaders });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [{ data: items }, { data: todayLogs }] = await Promise.all([
    supabase
      .from("check_items")
      .select("id, name, icon, sort_order")
      .eq("is_archived", false)
      .order("sort_order"),
    supabase
      .from("check_logs")
      .select("check_item_id")
      .gte("checked_at", todayStart.toISOString())
      .lt("checked_at", tomorrowStart.toISOString()),
  ]);

  const countMap = (todayLogs ?? []).reduce<Record<string, number>>(
    (acc, log) => {
      acc[log.check_item_id] = (acc[log.check_item_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const checkItems: CheckItem[] = (items ?? []).map((item) => ({
    ...item,
    todayCount: countMap[item.id] ?? 0,
  }));

  return data({ checkItems }, { headers: responseHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login", { headers: responseHeaders });
  }

  const formData = await request.formData();
  const checkItemId = formData.get("check_item_id") as string;

  await supabase.from("check_logs").insert({
    user_id: user.id,
    check_item_id: checkItemId,
    checked_at: new Date().toISOString(),
  });

  return data({ ok: true }, { headers: responseHeaders });
}

function CheckItemCard({ item }: { item: CheckItem }) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  // 楽観的更新: サーバー応答を待たずにカウントを+1表示
  const optimisticCount =
    isSubmitting ? item.todayCount + 1 : item.todayCount;

  return (
    <div className="flex items-center bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* タップ領域（カウント+1） */}
      <fetcher.Form method="post" className="flex-1">
        <input type="hidden" name="check_item_id" value={item.id} />
        <button
          type="submit"
          className="w-full flex items-center gap-3 px-5 py-4 text-left active:bg-slate-50 transition-colors min-h-[64px]"
          aria-label={`${item.name}を確認済みにする`}
        >
          <span className="text-2xl w-8 text-center shrink-0">
            {item.icon ?? "✔️"}
          </span>
          <span className="flex-1 text-base font-medium text-slate-700">
            {item.name}
          </span>
          <span
            className={`text-2xl font-bold tabular-nums transition-all ${
              isSubmitting ? "text-sky-400 scale-110" : "text-slate-500"
            }`}
          >
            {optimisticCount}
          </span>
        </button>
      </fetcher.Form>

      {/* 写真ボタン */}
      <label
        className="flex items-center justify-center w-14 h-16 border-l border-slate-100 text-slate-400 shrink-0 cursor-pointer active:bg-slate-50 transition-colors"
        aria-label="写真を撮影する"
      >
        <span className="text-xl">📷</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
        />
      </label>
    </div>
  );
}

export default function AppHome() {
  const { checkItems } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-col gap-3 pt-2">
      {checkItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-4">
          <span className="text-5xl">📋</span>
          <p className="text-slate-600 font-medium text-base">
            確認項目がまだありません
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            鍵・ガスの元栓・窓など、
            <br />
            繰り返し確認したいものを追加しましょう。
          </p>
          <a
            href="/app/items"
            className="mt-2 rounded-2xl bg-slate-700 text-white text-sm font-medium px-6 py-3"
          >
            項目を追加する
          </a>
        </div>
      ) : (
        <>
          {checkItems.map((item) => (
            <CheckItemCard key={item.id} item={item} />
          ))}

          <a
            href="/app/items"
            className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-sm font-medium py-4 mt-1 active:border-slate-300 transition-colors"
          >
            <span className="text-lg">＋</span>
            項目を追加
          </a>
        </>
      )}
    </div>
  );
}
