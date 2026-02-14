import { data, redirect, useFetcher, useLoaderData, Link } from "react-router";
import { useRef, useState } from "react";
import type { Route } from "./+types/app-home";
import { createSupabaseClient } from "~/lib/supabase.server";

type CheckItem = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  todayCount: number;
  hasPhotoToday: boolean;
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
      .select("check_item_id, photo_path")
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

  const photoMap = (todayLogs ?? []).reduce<Record<string, boolean>>(
    (acc, log) => {
      if (log.photo_path) acc[log.check_item_id] = true;
      return acc;
    },
    {}
  );

  const checkItems: CheckItem[] = (items ?? []).map((item) => ({
    ...item,
    todayCount: countMap[item.id] ?? 0,
    hasPhotoToday: photoMap[item.id] ?? false,
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
  const intent = (formData.get("intent") as string) ?? "count";
  const checkItemId = formData.get("check_item_id") as string;

  if (intent === "upload_photo") {
    const photoFile = formData.get("photo") as File | null;

    if (!photoFile || photoFile.size === 0) {
      return data(
        { ok: false, error: "写真が選択されていません" },
        { headers: responseHeaders }
      );
    }

    const fileName = `${crypto.randomUUID()}.webp`;
    const storagePath = `${user.id}/${fileName}`;

    const arrayBuffer = await photoFile.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, arrayBuffer, {
        contentType: "image/webp",
        upsert: false,
      });

    if (uploadError) {
      return data(
        { ok: false, error: uploadError.message },
        { headers: responseHeaders }
      );
    }

    await supabase.from("check_logs").insert({
      user_id: user.id,
      check_item_id: checkItemId,
      checked_at: new Date().toISOString(),
      photo_path: storagePath,
    });

    return data({ ok: true }, { headers: responseHeaders });
  }

  // デフォルト: カウント記録
  await supabase.from("check_logs").insert({
    user_id: user.id,
    check_item_id: checkItemId,
    checked_at: new Date().toISOString(),
  });

  return data({ ok: true }, { headers: responseHeaders });
}

/** Canvas API でクライアント側画像圧縮（最大 1920px / WebP） */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image compression failed"));
        },
        "image/webp",
        0.82
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

function CheckItemCard({ item }: { item: CheckItem }) {
  const countFetcher = useFetcher();
  const photoFetcher = useFetcher<typeof action>();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const [showSheet, setShowSheet] = useState(false);

  const isCountSubmitting = countFetcher.state !== "idle";
  const isPhotoUploading = photoFetcher.state !== "idle";

  const optimisticCount =
    isCountSubmitting || isPhotoUploading
      ? item.todayCount + 1
      : item.todayCount;
  const optimisticHasPhoto = isPhotoUploading || item.hasPhotoToday;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("intent", "upload_photo");
      fd.append("check_item_id", item.id);
      fd.append("photo", compressed, "photo.webp");
      photoFetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
    } catch {
      const fd = new FormData();
      fd.append("intent", "upload_photo");
      fd.append("check_item_id", item.id);
      fd.append("photo", file, "photo.webp");
      photoFetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
    }
  };

  return (
    <>
      <div className="flex items-center bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* アイテム名（詳細画面へのリンク） */}
        <Link
          to={`/app/items/${item.id}`}
          className="flex items-center gap-3 pl-5 pr-3 py-4 min-h-[64px] flex-1 min-w-0 active:bg-slate-50 transition-colors"
          aria-label={`${item.name}の詳細を見る`}
        >
          <span className="text-2xl w-8 text-center shrink-0">
            {item.icon ?? "✔️"}
          </span>
          <span className="flex-1 min-w-0 text-base font-medium text-slate-700 truncate">
            {item.name}
          </span>
        </Link>

        {/* カウント+1 ボタン */}
        <countFetcher.Form method="post">
          <input type="hidden" name="intent" value="count" />
          <input type="hidden" name="check_item_id" value={item.id} />
          <button
            type="submit"
            className="flex items-center justify-center px-4 py-4 min-h-[64px] active:bg-slate-50 transition-colors"
            aria-label={`${item.name}を確認済みにする`}
          >
            <span
              className={`text-2xl font-bold tabular-nums transition-all ${
                isCountSubmitting ? "text-sky-400 scale-110" : "text-slate-500"
              }`}
            >
              {optimisticCount}
            </span>
          </button>
        </countFetcher.Form>

        {/* 写真ボタン */}
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          disabled={isPhotoUploading}
          className={`flex flex-col items-center justify-center w-14 h-16 border-l border-slate-100 shrink-0 transition-colors ${
            isPhotoUploading
              ? "bg-sky-50 text-sky-400"
              : optimisticHasPhoto
              ? "text-sky-500 active:bg-sky-50"
              : "text-slate-400 active:bg-slate-50"
          }`}
          aria-label={isPhotoUploading ? "アップロード中..." : "写真を追加する"}
        >
          {isPhotoUploading ? (
            <span className="text-lg animate-spin">⏳</span>
          ) : (
            <>
              <span className="text-xl leading-none">📷</span>
              {optimisticHasPhoto && (
                <span className="text-[10px] font-medium mt-0.5 leading-none">済</span>
              )}
            </>
          )}
        </button>

        {/* 隠しファイル入力: カメラ */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleFileChange}
        />
        {/* 隠しファイル入力: アルバム */}
        <input
          ref={albumInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {/* アクションシート */}
      {showSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setShowSheet(false)}
        >
          {/* 背景オーバーレイ */}
          <div className="absolute inset-0 bg-black/30" />

          {/* シート本体 */}
          <div
            className="relative w-full max-w-lg mx-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-500 text-center">
                  {item.name}の写真を追加
                </p>
              </div>
              <button
                type="button"
                className="w-full flex items-center gap-4 px-5 py-4 text-base text-slate-700 active:bg-slate-50 transition-colors"
                onClick={() => {
                  setShowSheet(false);
                  cameraInputRef.current?.click();
                }}
              >
                <span className="text-2xl">📷</span>
                カメラで撮影
              </button>
              <div className="h-px bg-slate-100 mx-5" />
              <button
                type="button"
                className="w-full flex items-center gap-4 px-5 py-4 text-base text-slate-700 active:bg-slate-50 transition-colors"
                onClick={() => {
                  setShowSheet(false);
                  albumInputRef.current?.click();
                }}
              >
                <span className="text-2xl">🖼️</span>
                アルバムから選ぶ
              </button>
            </div>

            <button
              type="button"
              className="mt-3 w-full bg-white rounded-2xl py-4 text-base font-medium text-slate-700 active:bg-slate-50 transition-colors shadow-xl"
              onClick={() => setShowSheet(false)}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
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
