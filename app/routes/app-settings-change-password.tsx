import {
  data,
  redirect,
  Form,
  useActionData,
  useNavigation,
  Link,
} from "react-router";
import type { Route } from "./+types/app-settings-change-password";
import { createSupabaseClient } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "パスワード変更 — かくね" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login", { headers: responseHeaders });
  }

  return data({}, { headers: responseHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect("/login", { headers: responseHeaders });

  const formData = await request.formData();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (newPassword.length < 8) {
    return data(
      { error: "パスワードは8文字以上で入力してください" },
      { headers: responseHeaders }
    );
  }
  if (newPassword !== confirmPassword) {
    return data(
      { error: "パスワードが一致しません" },
      { headers: responseHeaders }
    );
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (verifyError) {
    return data(
      { error: "現在のパスワードが正しくありません" },
      { headers: responseHeaders }
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return data({ error: error.message }, { headers: responseHeaders });

  await supabase.auth.signOut({ scope: "others" });
  return redirect("/app/settings?passwordChanged=1", {
    headers: responseHeaders,
  });
}

export default function AppSettingsChangePassword() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex flex-col gap-4 pt-2">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/settings"
          className="text-slate-400 text-xl leading-none p-1 -ml-1"
          aria-label="戻る"
        >
          ‹
        </Link>
        <h2 className="text-base font-semibold text-slate-700">パスワード変更</h2>
      </div>

      <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
        <Form method="post" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="currentPassword" className="text-sm text-slate-600">
              現在のパスワード
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="newPassword" className="text-sm text-slate-600">
              新しいパスワード
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="8文字以上"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="confirmPassword" className="text-sm text-slate-600">
              新しいパスワード（確認）
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="8文字以上"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>

          {actionData && "error" in actionData && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
              {actionData.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 rounded-xl bg-slate-700 text-white text-sm font-medium py-3 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isSubmitting ? "変更中..." : "パスワードを変更"}
          </button>
        </Form>
      </section>
    </div>
  );
}
