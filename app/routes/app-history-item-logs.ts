import { data } from "react-router";
import type { Route } from "./+types/app-history-item-logs";
import { createSupabaseClient } from "~/lib/supabase.server";
import { JST_OFFSET_MS } from "~/lib/date";

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const itemId = url.searchParams.get("itemId");
  const dateStr = url.searchParams.get("date"); // "YYYY-MM-DD"

  if (!itemId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Response("Bad Request", { status: 400 });
  }

  // dateStr を JST の1日分として UTC 範囲に変換
  const [y, m, d] = dateStr.split("-").map(Number);
  const dayStart = new Date(Date.UTC(y, m - 1, d) - JST_OFFSET_MS);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [{ data: item }, { data: rawLogs }] = await Promise.all([
    supabase
      .from("check_items")
      .select("id, name, icon")
      .eq("id", itemId)
      .single(),
    supabase
      .from("check_logs")
      .select("id, checked_at, photo_path, photo_deleted_at")
      .eq("check_item_id", itemId)
      .gte("checked_at", dayStart.toISOString())
      .lt("checked_at", dayEnd.toISOString())
      .order("checked_at", { ascending: false }),
  ]);

  if (!item) {
    return new Response("Not Found", { status: 404 });
  }

  // photo_path があるログに署名付き URL を生成
  const logs = await Promise.all(
    (rawLogs ?? []).map(async (log) => {
      if (!log.photo_path) {
        return { ...log, signedUrl: null };
      }
      const { data: signed } = await supabase.storage
        .from("photos")
        .createSignedUrl(log.photo_path, 3600);
      return { ...log, signedUrl: signed?.signedUrl ?? null };
    }),
  );

  return data({ item, logs }, { headers: responseHeaders });
}
