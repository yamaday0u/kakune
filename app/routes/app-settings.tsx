import { data, redirect, Form, useLoaderData } from "react-router";
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

  return data({ email: user.email ?? "" }, { headers: responseHeaders });
}

export async function action({ request }: Route.ActionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);
  await supabase.auth.signOut();
  return redirect("/", { headers: responseHeaders });
}

export default function AppSettings() {
  const { email } = useLoaderData<typeof loader>();

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

      {/* ログアウト */}
      <section className="bg-white rounded-2xl shadow-sm px-5 py-2">
        <Form method="post">
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
