import { useEffect, useRef, useState } from "react";
import { data, useLoaderData, useNavigate } from "react-router";
import { createBrowserClient } from "@supabase/ssr";
import type { Route } from "./+types/auth-reset-password";

export function meta({}: Route.MetaArgs) {
  return [{ title: "パスワードをリセット — かくね" }];
}

export function loader() {
  return data({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  });
}

export default function AuthResetPassword() {
  const { supabaseUrl, supabaseKey } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // パスワード更新完了フラグ：クリーンアップ時の強制ログアウトを抑制するために使用
  const passwordUpdated = useRef(false);

  useEffect(() => {
    // PKCE フローでは PASSWORD_RECOVERY が発火しないため、
    // URL に code パラメータがある場合（リセットメール由来）に
    // SIGNED_IN を受け取ったときもフォームを表示する
    const hasCode = new URLSearchParams(window.location.search).has("code");
    const supabase = createBrowserClient(supabaseUrl, supabaseKey);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && hasCode)) {
        setIsRecovery(true);
      }
    });
    return () => {
      subscription.unsubscribe();
      // パスワード変更が完了していない状態で画面を離れた場合、
      // リセットリンク経由で作られたセッションを全て切断する
      if (!passwordUpdated.current) {
        supabase.auth.signOut();
      }
    };
  }, [supabaseUrl, supabaseKey]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }

    setIsSubmitting(true);
    const supabase = createBrowserClient(supabaseUrl, supabaseKey);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }
    // 全セッションを切断し、新しいパスワードで再ログインを促す
    passwordUpdated.current = true;
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="px-6 pt-10">
        <a
          href="/login"
          className="text-slate-400 text-sm flex items-center gap-1"
        >
          <span aria-hidden>←</span> ログインへ
        </a>
      </div>

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

      <div className="px-6 max-w-sm mx-auto w-full">
        {!isRecovery ? (
          <p className="text-sm text-slate-500 text-center">
            パスワードリセットメールのリンクからアクセスしてください。
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-700">
              新しいパスワードを設定
            </h2>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="newPassword"
                className="text-sm text-slate-600 font-medium"
              >
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="confirmPassword"
                className="text-sm text-slate-600 font-medium"
              >
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
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 rounded-2xl bg-slate-700 text-white text-base font-medium py-4 active:scale-95 transition-transform disabled:opacity-60"
            >
              {isSubmitting ? "処理中..." : "パスワードを変更"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
