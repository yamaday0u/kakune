import {
  data,
  redirect,
  Form,
  Link,
  useLoaderData,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/app-settings";
import { createSupabaseClient } from "~/lib/supabase.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "設定 — かくね" }];
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

  return data(
    {
      email: user.email ?? "",
      googleFormUrl: process.env.GOOGLE_FORM_URL ?? "",
    },
    { headers: responseHeaders }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);

  // logout
  await supabase.auth.signOut();
  return redirect("/", { headers: responseHeaders });
}

export default function AppSettings() {
  const { email, googleFormUrl } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const passwordChanged = searchParams.get("passwordChanged") === "1";

  return (
    <div className="flex flex-col gap-6 pt-2">
      {/* アカウント情報 */}
      <section className="bg-white rounded-2xl shadow-sm px-5 py-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
          アカウント
        </p>
        <p className="text-sm text-slate-500">メールアドレス</p>
        <p className="text-base text-slate-700 font-medium mt-0.5">{email}</p>
      </section>

      {/* パスワード変更 */}
      <section className="bg-white rounded-2xl shadow-sm px-5 py-2">
        {passwordChanged && (
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3 mt-2 mb-1">
            パスワードを変更しました
          </p>
        )}
        <Link
          to="/app/settings/change-password"
          className="w-full text-left py-3 text-base text-slate-700 font-medium flex items-center justify-between"
        >
          パスワード変更
          <span className="text-slate-400">›</span>
        </Link>
      </section>

      {/* 感想・要望 */}
      {googleFormUrl && (
        <section className="bg-white rounded-2xl shadow-sm px-5 py-2">
          <a
            href={googleFormUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-left py-3 text-base text-slate-700 font-medium flex items-center justify-between"
          >
            感想・要望を送る
            <span className="text-xs text-slate-400 mr-1">Googleフォームが開きます</span>
            <span className="text-slate-400">›</span>
          </a>
        </section>
      )}

      {/* ログアウト */}
      <section className="bg-white rounded-2xl shadow-sm px-5 py-2">
        <Form method="post">
          <input type="hidden" name="intent" value="logout" />
          <button
            type="submit"
            className="w-full text-left py-3 text-base text-red-500 font-medium"
          >
            ログアウト
          </button>
        </Form>
      </section>
    </div>
  );
}
