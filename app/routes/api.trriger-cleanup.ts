import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // Vercel Cron からの呼び出しを認証 ※ブラウザからこのAPIにアクセスしても認証で失敗させる
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cleanupSecret = process.env.CLEANUP_SECRET;
  console.log("Received cleanup trigger. Cleanup secret: ", cleanupSecret);

  const res = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/cleanup-expired-photos`,
    {
      method: "POST",
      headers: {
        "x-cleanup-secret": process.env.CLEANUP_SECRET!,
        "Content-Type": "application/json",
      },
    },
  );

  const data = await res.json();
  console.log("Cleanup result:", data);
  return Response.json(data);
}
