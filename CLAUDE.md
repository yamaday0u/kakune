# Kakune（かくね）

強迫性障害（OCD）の確認行為を記録するWebアプリ。
詳細な要件定義は `docs/requirements.md` を参照。

## 技術スタック

- **フレームワーク**: React Router v7 (Remix) + TypeScript
- **スタイル**: Tailwind CSS v4
- **BaaS**: Supabase（DB / Auth / Storage）
- **ビルド**: Vite

## ディレクトリ構成

```
kakune/
├── app/
│   ├── app.css               # グローバルCSS（Tailwindのエントリポイント）
│   ├── root.tsx              # HTMLシェル（viewport meta, フォント, エラーバウンダリ）
│   ├── routes.ts             # ルート定義
│   ├── lib/
│   │   └── supabase.server.ts  # Supabaseクライアント生成（SSR用）
│   └── routes/
│       ├── home.tsx            # / トップページ
│       ├── login.tsx           # /login ログイン・新規登録
│       ├── app.tsx             # /app レイアウト（ヘッダー・ボトムナビ）
│       ├── app-home.tsx        # /app ホーム（確認項目一覧・カウント・写真）
│       ├── app-item-detail.tsx # /app/items/:id アイテム詳細（写真・ログ一覧）
│       ├── app-items.tsx       # /app/items 確認項目のCRUD管理
│       └── app-settings.tsx    # /app/settings 設定
├── supabase/
│   └── migrations/
│       ├── 20260214000000_init_schema.sql  # check_items / check_logs テーブル + RLS
│       └── 20260214000001_storage_photos.sql  # photosバケット + RLS
├── public/                   # 静的ファイル（アイコン画像など）
├── docs/
│   └── requirements.md       # 要件定義・技術選定ドキュメント
├── .env.local                # 環境変数
├── react-router.config.ts
├── vite.config.ts
└── package.json
```

## ルーティング

```
/                   → home.tsx        トップページ
/login              → login.tsx       ログイン / 新規登録
/app                → app.tsx（レイアウト）
  /app              → app-home.tsx    ホーム（今日の確認ダッシュボード）
  /app/items        → app-items.tsx   確認項目管理
  /app/items/:id    → app-item-detail.tsx  アイテム詳細
  /app/settings     → app-settings.tsx    設定
```

## DBスキーマ（Supabase）

- `check_items` — 確認項目マスタ（name, icon, sort_order, is_archived）
- `check_logs` — 確認記録（check_item_id, checked_at, note, photo_path）
- `storage: photos` — 写真バケット（非公開。パス: `{user_id}/{uuid}.webp`）
- 全テーブルにRLS適用済み（自分のデータのみアクセス可能）

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # プロダクションビルド
npm run typecheck  # 型チェック（react-router typegen + tsc）
```

## Cron ジョブ

- `vercel.json` で Vercel Cron を設定
- `/api/trigger-cleanup` を **毎日 JST 00:00**（UTC 15:00）に実行
- Vercel Cron は UTC 固定のため、JST に合わせるには `-9h` した UTC 時刻を指定する

## 実装指示

詳細は `docs/instructions.md` を参照。
