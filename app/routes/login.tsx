import { useState } from "react";
import {
  data,
  redirect,
  Form,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/login";
import { createSupabaseClient } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "ログイン — かくね" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    return redirect("/app", { headers: responseHeaders });
  }
  return data({}, { headers: responseHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);

  const formData = await request.formData();
  const intent = formData.get("intent") as "login" | "signup";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (intent === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return data(
        { error: error.message, intent },
        { headers: responseHeaders },
      );
    }
    responseHeaders.append(
      "Set-Cookie",
      "flash_welcome=1; Path=/; Max-Age=60; SameSite=Lax",
    );
    return redirect("/app", { headers: responseHeaders });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return data({ error: error.message, intent }, { headers: responseHeaders });
  }
  return redirect("/app", { headers: responseHeaders });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const defaultMode =
    actionData && "intent" in actionData && actionData.intent === "signup"
      ? "signup"
      : "login";
  const [mode, setMode] = useState<"login" | "signup">(defaultMode);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 戻るリンク */}
      <div className="px-6 pt-10">
        <a href="/" className="text-slate-400 text-sm flex items-center gap-1">
          <span aria-hidden>←</span> トップへ
        </a>
      </div>

      {/* ロゴ */}
      <div className="flex flex-col items-center mt-8 mb-8">
        <div className="relative w-20 h-20 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full bg-sky-100 opacity-60" />
          <img
            src="/app-icon-base.png"
            alt="かくねアイコン"
            className="relative w-10 h-10 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold text-slate-700">かくね</h1>
      </div>

      {/* タブ */}
      <div className="px-6 max-w-sm mx-auto w-full">
        <div className="flex rounded-xl bg-slate-200 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "login"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-500"
            }`}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              mode === "signup"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-500"
            }`}
          >
            新規登録
          </button>
        </div>

        <Form method="post" className="flex flex-col gap-4">
          <input type="hidden" name="intent" value={mode} />

          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-sm text-slate-600 font-medium"
            >
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="example@mail.com"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm text-slate-600 font-medium"
            >
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              placeholder="8文字以上"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
            />
          </div>

          {/* エラー表示 */}
          {actionData && "error" in actionData && actionData.error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
              {actionData.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-2xl bg-slate-700 text-white text-base font-medium py-4 active:scale-95 transition-transform disabled:opacity-60"
          >
            {isSubmitting
              ? "処理中..."
              : mode === "signup"
                ? "アカウントを作成"
                : "ログイン"}
          </button>
        </Form>

        {mode === "login" && (
          <p className="text-center text-slate-400 text-sm mt-6">
            アカウントをお持ちでない方は{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="text-slate-600 underline underline-offset-4"
            >
              新規登録
            </button>
          </p>
        )}
      </div>

      <footer className="mt-auto px-6 pb-8 pt-10 text-center">
        <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
          このアプリは強迫性障害（OCD）の治療の代替ではありません。
          専門家によるサポートと組み合わせてご利用ください。
        </p>
      </footer>
    </div>
  );
}
