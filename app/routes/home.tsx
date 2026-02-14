import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "かくね — 確認した、を記録しよう" },
    {
      name: "description",
      content:
        "確認した事実を記録して、繰り返し確認する衝動を和らげるアプリです。",
    },
  ];
}

const features = [
  {
    icon: "✔️",
    title: "1タップで記録",
    description: "鍵・ガス・窓など、確認した事実をすぐに記録できます。",
  },
  {
    icon: "📷",
    title: "写真で証拠を残す",
    description: "カメラで撮影して記録に添付。3日後に自動削除されます。",
  },
  {
    icon: "📊",
    title: "振り返りで気づきを得る",
    description: "カレンダーやグラフで確認パターンを穏やかに可視化します。",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ヘッダー */}
      <header className="px-6 pt-12 pb-2 text-center">
        <p className="text-slate-400 text-sm font-medium tracking-widest uppercase mb-2">
          Kakune
        </p>
        <h1 className="text-5xl font-bold text-slate-700 tracking-tight">
          かくね
        </h1>
        <p className="mt-4 text-slate-500 text-base leading-relaxed max-w-xs mx-auto">
          「確認した」を記録して、
          <br />
          繰り返す衝動を少しずつ和らげる。
        </p>
      </header>

      {/* イラスト的なアクセント */}
      <div className="flex justify-center mt-8 mb-6">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-sky-100 opacity-60" />
          <img
            src="/app-icon-base.png"
            alt="かくねアイコン"
            className="relative w-16 h-16 object-contain"
          />
        </div>
      </div>

      {/* CTA ボタン */}
      <div className="px-6 flex flex-col items-center gap-3">
        <a
          href="/login"
          className="w-full max-w-xs rounded-2xl bg-slate-700 text-white text-center text-base font-medium py-4 block active:scale-95 transition-transform"
        >
          はじめる
        </a>
        <a
          href="/login"
          className="text-slate-400 text-sm py-2 underline underline-offset-4"
        >
          すでにアカウントをお持ちの方
        </a>
      </div>

      {/* 機能紹介 */}
      <section className="mt-12 px-6 flex flex-col gap-4 max-w-md mx-auto w-full">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm"
          >
            <span className="text-2xl mt-0.5 shrink-0">{f.icon}</span>
            <div>
              <p className="text-slate-700 font-medium text-base">{f.title}</p>
              <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">
                {f.description}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* フッター免責事項 */}
      <footer className="mt-auto px-6 pt-10 pb-8 text-center">
        <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
          このアプリは強迫性障害（OCD）の治療の代替ではありません。
          専門家によるサポートと組み合わせてご利用ください。
        </p>
      </footer>
    </div>
  );
}
