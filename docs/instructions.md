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

## ブランチ運用

コードを修正する際は**毎回必ず**以下の手順を守ること：

1. `develop` ブランチの最新をプルする
   ```bash
   git checkout develop && git pull origin develop
   ```
2. `develop` から新しいブランチを切る
   ```bash
   git checkout -b <branch-name>
   ```
3. 変更を加えてコミット・プッシュする
