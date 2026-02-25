# Kakune（かくね） — 要件定義・技術選定

## 1. プロダクト概要

### アプリ名

**Kakune（かくね）** — 「確認したね」（共感の終助詞）の造語。確認した事実を優しく認めてくれるような存在。

- アプリ名: Kakune
- リポジトリ名: `kakune`
- 表記ゆれ: Kakune / かくね（ロゴ等では「かくね」のひらがな表記も可）

### コンセプト

強迫性障害（OCD）の確認行為に悩む人が、「確認した事実」を外部に記録することで、繰り返し確認する衝動を和らげるためのWebアプリ。

### ターゲットユーザー

- OCD の確認行為（鍵の施錠、ガスの元栓、電気の消灯など）に悩む当事者
- 認知行動療法（CBT）や曝露反応妨害法（ERP）を実践中の方

### MVP スコープ

まず自分で使うMVP。将来的な一般公開・医療連携の拡張余地は残すが、初期は過剰設計しない。

---

## 2. 機能要件

### 2.1 確認記録（コア機能）

| 機能             | 詳細                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| 確認項目の登録   | 「玄関の鍵」「ガスの元栓」「窓」など、ユーザーが自由に確認項目を作成・編集・削除できる |
| 確認のカウント   | 確認項目ごとに1タップでカウントを記録。タイムスタンプ付き                              |
| 写真の撮影・添付 | 確認時にカメラで撮影、または既存画像を添付して記録に紐づける                           |
| メモの追加       | 各確認記録に任意のテキストメモを追加可能                                               |
| 日次リセット     | カウントは日ごとにリセットされ、履歴として蓄積される                                   |

### 2.2 写真の自動削除

| 項目           | 詳細                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 削除タイミング | アップロードから **3日後** にストレージから完全削除                                                                                                               |
| 削除後の扱い   | `check_logs.photo_path` を NULL に更新。履歴上は写真なしの記録として残る                                                                                          |
| 実装方式       | デプロイ先の cron 機能（Vercel Cron Jobs / Cloudflare Workers Cron Triggers）から日次バッチ実行                                                                   |
| 削除フロー     | ① `check_logs` から `checked_at < now() - 3日` かつ `photo_path IS NOT NULL` を取得 → ② Supabase Storage Admin API でファイル削除 → ③ `photo_path` を NULL に更新 |
| 注意           | Supabase Storage にはオブジェクト TTL 機能がないため、アプリ側で管理する必要がある                                                                                |

### 2.3 可視化

| 機能             | 詳細                                                     |
| ---------------- | -------------------------------------------------------- |
| カレンダービュー | 日ごとの確認回数をカレンダー上にヒートマップ的に表示     |
| グラフビュー     | 確認項目ごとの回数推移を折れ線グラフで表示（日別・週別） |
| サマリー         | 今週 / 前週の合計確認回数と増減比較                      |

### 2.4 認証・データ管理

| 機能               | 詳細                                             |
| ------------------ | ------------------------------------------------ |
| ユーザー認証       | メール+パスワード、またはOAuthでログイン         |
| データ同期         | ログイン後、全データがクラウドに保存・同期される |
| データエクスポート | JSON / CSV 形式でデータをダウンロード可能        |

### 2.5 MVP で含めないもの（将来候補）

- リマインダー・通知機能
- 他ユーザーとの共有・セラピストとの連携
- PWA オフライン対応（Service Worker）
- 多言語対応

---

## 3. 非機能要件

### 3.1 プライバシー・セキュリティ

- **最重要事項**: メンタルヘルスに関するセンシティブデータを扱う
- 通信は全て HTTPS
- 写真データは認証済みユーザーのみアクセス可能なストレージに保存
- パスワードは当然ハッシュ化（認証サービス側で処理）
- 将来的な一般公開時には、データ削除機能（GDPR 的な「忘れられる権利」）を実装

### 3.2 パフォーマンス

- 確認ボタンの応答: 200ms 以内（楽観的更新）
- 写真アップロード: 圧縮してから送信（クライアント側で最大 1MB にリサイズ）
- グラフ描画: 1年分のデータでスムーズに動作

### 3.3 ユーザビリティ（スマホファースト）

- **スマホブラウザでの操作を第一に設計**し、PC はあくまで閲覧用の補助とする
- 片手操作で完結（確認直後にすぐ記録できることが最重要）
- 確認記録は **2タップ以内**（項目選択 → 確認ボタン）
- タップターゲットは **最低 44×44px**（Apple HIG 準拠）
- ビューポート: `width=device-width, initial-scale=1, viewport-fit=cover`
- **ボトムナビゲーション**を採用（親指の届く範囲にメイン操作を配置）
- ファーストビューにスクロール不要で今日の確認一覧とカウントボタンを収める
- カメラ起動は `<input type="file" accept="image/*" capture="environment">` で OS ネイティブのカメラ UI を利用
- フォントサイズは最低 16px（iOS Safari でのズーム防止にも有効）
- レイアウトは CSS の `min()` / `clamp()` / Container Queries で柔軟に対応
- PWA の `display: standalone` + `theme-color` で、ホーム画面追加時にアプリライクな体験を提供（SW によるオフラインキャッシュは MVP 外）

---

## 4. 技術選定

### 4.1 フロントエンド

| 選定                         | 理由                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **Remix (React Router v7)**  | 希望技術。SSR・loader/action パターンでフォーム処理が自然。progressive enhancement との相性が良い |
| **TypeScript**               | 型安全性の確保                                                                                    |
| **Tailwind CSS**             | ユーティリティファーストで高速にUIを構築                                                          |
| **Recharts** or **Chart.js** | グラフ描画。Recharts は React との統合がシームレス                                                |
| **react-day-picker** or 自作 | カレンダービュー                                                                                  |

### 4.2 バックエンド・インフラ

MVP では BaaS を活用して最速で構築する方針。

| 選定             | 理由                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase**     | PostgreSQL + Auth + Storage を一括提供。自前サーバー不要でMVPに最適                                                                                              |
| — DB             | Supabase PostgreSQL（RLS でユーザー単位のアクセス制御）                                                                                                          |
| — 認証           | Supabase Auth（メール/パスワード + Google OAuth）                                                                                                                |
| — ストレージ     | Supabase Storage（写真保存。バケットポリシーで本人のみアクセス可）                                                                                               |
| **ホスティング** | **Cloudflare Pages** or **Vercel**（Remix のデプロイ先として安定）                                                                                               |
| **写真自動削除** | デプロイ先の Cron 機能（Vercel: `vercel.json` の crons / Cloudflare: Cron Triggers）で日次バッチ。Supabase の `service_role` キーで Storage Admin API を呼び出す |

#### なぜ Supabase か

- MVP フェーズで認証・DB・ストレージを個別に構築するのはオーバーヘッドが大きい
- RLS（Row Level Security）でユーザーごとのデータ分離が SQL レベルで保証できる
- 無料枠が十分（個人利用MVP なら余裕）
- 将来的に PostgreSQL なので、自前インフラへの移行も容易

#### 代替案との比較

| 候補                         | 見送り理由                                                               |
| ---------------------------- | ------------------------------------------------------------------------ |
| Firebase                     | Firestore は NoSQL で可視化クエリ（集計・期間フィルタ）が煩雑            |
| 自前 API (Hono/Express) + DB | MVP には過剰。将来の公開時に移行する選択肢として残す                     |
| Prisma + PlanetScale         | Supabase が Auth/Storage も含めて提供するので、MVPでは一本化した方が速い |

### 4.3 DB スキーマ（案）

```sql
-- 確認項目マスタ
CREATE TABLE check_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,            -- 例: "玄関の鍵"
  icon        TEXT,                     -- 絵文字 or アイコン名
  sort_order  INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 確認記録
CREATE TABLE check_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_item_id UUID NOT NULL REFERENCES check_items(id) ON DELETE CASCADE,
  checked_at    TIMESTAMPTZ DEFAULT now(),  -- 確認した日時
  note          TEXT,                        -- 任意メモ
  photo_path    TEXT,                        -- Supabase Storage 内のパス
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- RLS ポリシー（両テーブルに適用）
ALTER TABLE check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own check_items"
  ON check_items FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own check_logs"
  ON check_logs FOR ALL
  USING (auth.uid() = user_id);

-- 可視化用インデックス
CREATE INDEX idx_check_logs_user_date
  ON check_logs (user_id, checked_at DESC);

CREATE INDEX idx_check_logs_item_date
  ON check_logs (check_item_id, checked_at DESC);
```

### 4.4 画像処理フロー

```
[アップロード]
撮影/選択 → クライアント側リサイズ(max 1MB, browser-image-compression)
  → Supabase Storage アップロード (photos/{user_id}/{uuid}.webp)
    → check_logs.photo_path にパスを保存
      → 表示時に Supabase Storage の署名付き URL を生成

[自動削除 — 日次 cron]
① SELECT id, photo_path FROM check_logs
     WHERE photo_path IS NOT NULL
       AND checked_at < now() - INTERVAL '3 days'
② Supabase Storage Admin API: DELETE photos/{user_id}/{filename}
③ UPDATE check_logs SET photo_path = NULL WHERE id IN (...)
```

---

## 5. 画面構成（MVP — スマホファースト）

### レイアウト構造

```
┌─────────────────────┐
│  ヘッダー（最小限）    │  ← 日付・設定アイコンのみ
│                     │
│  メインコンテンツ     │  ← 各画面の内容
│                     │
│                     │
├─────────────────────┤
│ 🏠  📊  ⚙️          │  ← ボトムナビゲーション（3タブ）
└─────────────────────┘
```

### ボトムナビの3タブ

1. **ホーム** (`/app`) — 今日の確認ダッシュボード。確認項目一覧 + カウントボタン
2. **履歴** (`/app/history`) — カレンダー & グラフビュー
3. **設定** (`/app/settings`) — 確認項目管理・データエクスポート・アカウント

### ルーティング

```
/ (ルート)
├── /login              — ログイン / サインアップ
├── /app                — ホーム: 今日の確認ダッシュボード
│   └── /app/log/:id    — 確認記録の詳細（写真・メモ閲覧。ボトムシートで表示）
├── /app/history        — カレンダー & グラフビュー
├── /app/items          — 確認項目の管理（設定タブ内からアクセス）
└── /app/settings       — 設定（データエクスポート、アカウント管理）
```

### ホーム画面の詳細レイアウト

```
┌─────────────────────┐
│ 2月14日(土)      ⚙️  │
├─────────────────────┤
│                     │
│ ┌─────────────────┐ │
│ │ 🔑 玄関の鍵     3 │ │  ← タップでカウント+1
│ │           [📷]   │ │  ← 写真アイコンでカメラ起動
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 🔥 ガスの元栓   1 │ │
│ │           [📷]   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 🪟 窓の施錠     2 │ │
│ │           [📷]   │ │
│ └─────────────────┘ │
│                     │
│     [+ 項目を追加]   │
│                     │
├─────────────────────┤
│ 🏠     📊     ⚙️    │
└─────────────────────┘
```

---

## 6. 開発ロードマップ（MVP）

### Phase 1: 基盤構築（1〜2日）

- Remix プロジェクトセットアップ（TypeScript + Tailwind）
- Supabase プロジェクト作成、DB スキーマ適用
- 認証フロー実装（ログイン / サインアップ / ログアウト）

### Phase 2: コア機能（3〜5日）

- 確認項目の CRUD
- 確認カウント記録（1タップ記録 + 楽観的更新）
- 写真撮影・アップロード
- 確認記録の詳細表示・編集

### Phase 3: 可視化（2〜3日）

- カレンダービュー（ヒートマップ）
- グラフビュー（日別・週別の折れ線グラフ）
- サマリー（今日/今週/今月）

### Phase 4: 仕上げ（1〜2日）

- 写真自動削除の cron ジョブ実装・テスト
- データエクスポート（JSON/CSV）
- レスポンシブ調整・モバイル最適 化
- デプロイ（Cloudflare Pages or Vercel）

**想定合計: 約 1〜2 週間**

---

## 7. 設計上の注意点

### UX に関して

- **不安が高まっている状態で使う**アプリであることを常に意識する
- UI はシンプル・落ち着いたトーンに（刺激的な色やアニメーションを避ける）
- カウントが増えたことを否定的に表示しない（「今日は○回です」と中立に）
- 確認回数が多い日を赤く表示するなどの「警告的な表現」は避ける

### 医療的配慮

- アプリは治療の代替ではないことを明示する（初回利用時や設定画面にディスクレーマー）
- 将来的にセラピストとデータ共有する機能を入れる場合は、明示的な同意フローを設計する

### 拡張性

- Supabase → 自前 API への移行パスを意識し、データアクセス層を抽象化しておく
- check_items テーブルの設計は柔軟に（将来カテゴリやタグを追加可能）
