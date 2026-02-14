# 実装指示書

## Supabaseクライアント

- クライアントは必ず `~/lib/supabase.server.ts` の `createSupabaseClient(request, responseHeaders)` を使う
- `responseHeaders` を loader/action の戻り値に必ず含める（Supabaseのセッションクッキー更新のため）

## 写真処理

- 写真はクライアント側でCanvas APIを使い WebP / 最大1920px に圧縮してからアップロード
- 写真の表示には署名付きURL（`createSignedUrl`、有効期限1時間）を使う

## モバイル対応

- コンテナの高さは `h-dvh`（`h-screen` は使わない）
- セーフエリアは `env(safe-area-inset-*)` で対応

## git commit

コミットメッセージは**日本語**で書く。
