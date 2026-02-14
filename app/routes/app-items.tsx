import { useState } from "react";
import {
  data,
  redirect,
  Form,
  useLoaderData,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/app-items";
import { createSupabaseClient } from "~/lib/supabase.server";

const PRESET_ICONS = [
  "🔑", "🔒", "🚪", "🪟", "🔥", "💡", "⚡",
  "🚿", "🚰", "🚗", "🎒", "💼", "🏠", "📱", "✔️",
];

type CheckItem = {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export function meta({}: Route.MetaArgs) {
  return [{ title: "確認項目の管理 — かくね" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login", { headers: responseHeaders });

  const { data: items } = await supabase
    .from("check_items")
    .select("id, name, icon, sort_order")
    .eq("is_archived", false)
    .order("sort_order");

  return data({ items: items ?? [] }, { headers: responseHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login", { headers: responseHeaders });

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const name = (formData.get("name") as string).trim();
    const icon = (formData.get("icon") as string).trim() || null;
    if (!name) {
      return data(
        { error: "項目名を入力してください", intent: "create" },
        { headers: responseHeaders }
      );
    }
    const { data: maxItem } = await supabase
      .from("check_items")
      .select("sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from("check_items").insert({
      user_id: user.id,
      name,
      icon,
      sort_order: (maxItem?.sort_order ?? -1) + 1,
    });
    return redirect("/app/items", { headers: responseHeaders });
  }

  if (intent === "update") {
    const id = formData.get("id") as string;
    const name = (formData.get("name") as string).trim();
    const icon = (formData.get("icon") as string).trim() || null;
    if (!name) {
      return data(
        { error: "項目名を入力してください", intent: "update", id },
        { headers: responseHeaders }
      );
    }
    await supabase
      .from("check_items")
      .update({ name, icon, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    return redirect("/app/items", { headers: responseHeaders });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    await supabase
      .from("check_items")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    return redirect("/app/items", { headers: responseHeaders });
  }

  return data({ error: "不明な操作です", intent: "" }, { headers: responseHeaders });
}

// ─── 絵文字ピッカー ──────────────────────────────────────────
function IconPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_ICONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-colors ${
              value === emoji
                ? "bg-slate-300 ring-2 ring-slate-400"
                : "bg-slate-100 active:bg-slate-200"
            }`}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

// ─── 新規作成フォーム ─────────────────────────────────────────
function AddItemForm({ error }: { error?: string }) {
  const [icon, setIcon] = useState("✔️");
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "create";

  return (
    <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
        新しい項目を追加
      </p>
      <Form method="post" className="flex flex-col gap-3">
        <input type="hidden" name="intent" value="create" />
        <IconPicker name="icon" value={icon} onChange={setIcon} />
        <div className="flex gap-2 items-center">
          <span className="text-2xl w-10 text-center shrink-0">{icon}</span>
          <input
            name="name"
            type="text"
            required
            placeholder="例: 玄関の鍵"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
          />
        </div>
        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-slate-700 text-white text-sm font-medium py-3 active:scale-95 transition-transform disabled:opacity-60"
        >
          {isSubmitting ? "追加中..." : "追加する"}
        </button>
      </Form>
    </section>
  );
}

// ─── 編集フォーム（行内展開） ──────────────────────────────────
function EditItemForm({
  item,
  onCancel,
  error,
}: {
  item: CheckItem;
  onCancel: () => void;
  error?: string;
}) {
  const [icon, setIcon] = useState(item.icon ?? "✔️");
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "update";

  return (
    <Form method="post" className="flex flex-col gap-3 px-5 py-4">
      <input type="hidden" name="intent" value="update" />
      <input type="hidden" name="id" value={item.id} />
      <IconPicker name="icon" value={icon} onChange={setIcon} />
      <div className="flex gap-2 items-center">
        <span className="text-2xl w-10 text-center shrink-0">{icon}</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={item.name}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
        />
      </div>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-2xl bg-slate-700 text-white text-sm font-medium py-3 active:scale-95 transition-transform disabled:opacity-60"
        >
          {isSubmitting ? "保存中..." : "保存する"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 text-slate-500 text-sm font-medium px-5 py-3 active:bg-slate-50 transition-colors"
        >
          キャンセル
        </button>
      </div>
    </Form>
  );
}

// ─── 項目行 ──────────────────────────────────────────────────
function ItemRow({
  item,
  isEditing,
  onEditStart,
  onEditEnd,
  updateError,
}: {
  item: CheckItem;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  updateError?: string;
}) {
  if (isEditing) {
    return (
      <li className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <EditItemForm item={item} onCancel={onEditEnd} error={updateError} />
      </li>
    );
  }

  return (
    <li className="bg-white rounded-2xl shadow-sm flex items-center overflow-hidden">
      <div className="flex-1 flex items-center gap-3 px-5 py-4 min-h-[64px]">
        <span className="text-2xl w-8 text-center shrink-0">
          {item.icon ?? "✔️"}
        </span>
        <span className="text-base font-medium text-slate-700">{item.name}</span>
      </div>
      <div className="flex shrink-0 border-l border-slate-100">
        <button
          type="button"
          onClick={onEditStart}
          className="px-4 py-4 text-sm text-slate-500 min-h-[64px] active:bg-slate-50 transition-colors"
        >
          編集
        </button>
        <Form method="post" className="flex">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            className="px-4 py-4 text-sm text-red-400 min-h-[64px] border-l border-slate-100 active:bg-red-50 transition-colors"
            aria-label={`${item.name}を削除`}
          >
            削除
          </button>
        </Form>
      </div>
    </li>
  );
}

// ─── ページ ───────────────────────────────────────────────────
export default function AppItems() {
  const { items } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [editingId, setEditingId] = useState<string | null>(null);

  const createError =
    actionData && "intent" in actionData && actionData.intent === "create"
      ? actionData.error
      : undefined;
  const updateError =
    actionData && "intent" in actionData && actionData.intent === "update"
      ? actionData.error
      : undefined;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <AddItemForm error={createError} />

      {items.length > 0 && (
        <section>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-1 mb-2">
            登録済みの項目
          </p>
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isEditing={editingId === item.id}
                onEditStart={() => setEditingId(item.id)}
                onEditEnd={() => setEditingId(null)}
                updateError={editingId === item.id ? updateError : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">
          まだ項目がありません。上のフォームから追加してください。
        </p>
      )}
    </div>
  );
}
