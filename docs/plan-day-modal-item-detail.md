# DayModal アイテム詳細表示 実装計画

## 概要

カレンダービューで日をタップして開く `DayModal` 内のアイテムをタップすると、
`app-item-detail.tsx` と同様のレイアウト（写真・ログ一覧）をモーダル内で表示する。
写真が3日後に自動削除された場合は「アップロードされた写真は削除済みです」と表示する。

---

## 現状の把握

| ファイル | 役割 |
|---|---|
| `app/components/history-calendar.tsx` | `DayModal` を含む。現在は日ごとのアイテム名＋回数をリスト表示するのみ |
| `app/routes/app-history.tsx` | `DayModal` を呼び出す。ローダーはカレンダー集計データ（ログの `check_item_id` と `checked_at` のみ）を返す |
| `app/routes/app-item-detail.tsx` | アイテム詳細ページ。**今日分のみ**対象で、写真の署名付きURLをサーバーサイドで生成する |
| `app/routes.ts` | ルート定義 |
| `supabase/migrations/` | DBスキーマ定義 |

**課題1**: カレンダービューのローダーは写真パスや署名付きURLを持っていない。
任意の日付×アイテムの詳細（ログ＋署名付きURL）をオンデマンドで取得する仕組みが必要。

**課題2**: 現行の自動削除処理は `photo_path = NULL` に上書きするため、
「最初から写真なし」と「3日後に削除済み」を DB 上で区別できない。

---

## 設計方針

`useFetcher` を使って **リソースルート**（API エンドポイント）をクライアントから呼び出す。
モーダルを閉じずにモーダル内でビューを切り替える（スタックせず差し替え）。

写真削除の判別は `photo_deleted_at` カラムを `check_logs` に追加し、
クリーンアップ処理がこのカラムをセットするよう変更する（案A）。

```
DayModal
├── [アイテム一覧ビュー]  ← 現状
└── [アイテム詳細ビュー]  ← 新規追加（アイテムタップで切り替え）
      ├── 写真エリア
      │     ├── 写真あり             → 画像表示
      │     ├── photo_deleted_at あり → 「アップロードされた写真は削除済みです」
      │     └── 最初から写真なし     → 📷 プレースホルダー
      ├── 回数 & ログ時刻一覧
      └── 「← 戻る」で一覧ビューに戻る
```

---

## 実装ステップ

### Step 1: DB マイグレーション追加

**新規ファイル**: `supabase/migrations/20260318000000_add_photo_deleted_at.sql`

```sql
ALTER TABLE check_logs ADD COLUMN photo_deleted_at TIMESTAMPTZ;
```

クリーンアップの Edge Function（`cleanup-expired-photos`）の変更内容:

- 現行: `UPDATE check_logs SET photo_path = NULL WHERE ...`
- 変更後: `UPDATE check_logs SET photo_path = NULL, photo_deleted_at = now() WHERE ...`

> **注意**: Edge Function のコードはこのリポジトリ外（Supabase Dashboard）で管理されているため、
> 別途 Supabase Dashboard 上での更新が必要。

---

### Step 2: リソースルート追加

**新規ファイル**: `app/routes/app-history-item-logs.ts`

- **パス**: `app/history/item-logs`（`app` レイアウト配下）
- **ローダー引数**: クエリパラメータ `?itemId=<uuid>&date=YYYY-MM-DD`
- **処理**:
  1. 認証確認（未認証なら 401）
  2. `date` を JST 日付として解釈し、UTC での開始〜終了を計算
  3. `check_logs` を `check_item_id = itemId AND checked_at IN [dayStart, dayEnd)` で取得
     - 取得カラム: `id, checked_at, photo_path, photo_deleted_at`
  4. `check_items` からアイテム情報（`id, name, icon`）を取得
  5. `photo_path` が非 null のログに署名付き URL を生成（有効期限 3600 秒）
  6. JSON で返す

**型定義（ローダーの返り値）**:

```ts
type ItemDayLogsResponse = {
  item: { id: string; name: string; icon: string | null };
  logs: {
    id: string;
    checked_at: string;
    photo_path: string | null;
    photo_deleted_at: string | null;  // 追加
    signedUrl: string | null;
  }[];
};
```

**`routes.ts` への追加**:

```ts
route("history/item-logs", "routes/app-history-item-logs.ts"),
```

（`app` レイアウト配下の子ルートとして追加）

---

### Step 3: `ItemDayDetail` コンポーネント追加

**場所**: `app/components/history-calendar.tsx` 末尾に追加

```ts
export function ItemDayDetail({
  itemId,
  date,
  onBack,
}: {
  itemId: string;
  date: string;       // "YYYY-MM-DD"
  onBack: () => void;
}) { ... }
```

**内部ロジック**:

1. `useFetcher()` を使い、マウント時に `useEffect` で
   `/app/history/item-logs?itemId=${itemId}&date=${date}` へ `fetcher.load()` を実行
2. `fetcher.state === "loading"` の間はスケルトン（ローディングスピナー）表示
3. データ取得後:
   - **写真エリア**: ログ全体を見て以下の3パターンで表示
     - `signedUrl` あり → 画像表示（`app-item-detail.tsx` と同じレイアウト）
     - `signedUrl` なし かつ `photo_deleted_at` あり → 「アップロードされた写真は削除済みです」メッセージ
     - `signedUrl` なし かつ `photo_deleted_at` なし → 📷 プレースホルダー（写真なし）
   - **回数 & ログ一覧**: ログ数 + 時刻バッジ（`photo_path` or `photo_deleted_at` ありのログには 📷 マーク）
4. ヘッダーに `← 戻る` ボタンで `onBack()` を呼ぶ

**写真エリアの判定ロジック**:

```ts
const latestSignedUrl = logs.find((l) => l.signedUrl !== null)?.signedUrl ?? null;
const hasDeletedPhoto = logs.some((l) => l.photo_deleted_at !== null);
```

---

### Step 4: `DayModal` を更新

`DayModal` に内部 state を追加し、アイテムタップで詳細ビューへ切り替える。

```ts
// DayModal 内部
const [selectedItem, setSelectedItem] = useState<{
  id: string;
  name: string;
} | null>(null);
```

- アイテムリストの `<li>` を `<button>` に変更し `onClick={() => setSelectedItem({ id, name })}` を追加
- `selectedItem` が非 null のとき、モーダル本体を `<ItemDayDetail>` に差し替える
- `ItemDayDetail` の `onBack` で `setSelectedItem(null)` に戻す
- ヘッダータイトルも詳細ビュー時はアイテム名を表示する

**モーダルヘッダーの切り替え**:

```
アイテム一覧ビュー: "5月10日（土）の記録"
アイテム詳細ビュー: "🔒 鍵の確認"（← 戻る ボタン付き）
```

---

## ファイル変更サマリー

| ファイル | 変更内容 |
|---|---|
| `supabase/migrations/20260318000000_add_photo_deleted_at.sql` | **新規作成**。`photo_deleted_at` カラムを追加 |
| `app/routes.ts` | `history/item-logs` ルートを `app` 子として追加 |
| `app/routes/app-history-item-logs.ts` | **新規作成**。リソースルート（ローダーのみ） |
| `app/components/history-calendar.tsx` | `DayModal` に state を追加、アイテムをタップ可能に。`ItemDayDetail` コンポーネントを追加 |
| Supabase Edge Function `cleanup-expired-photos` | `photo_deleted_at = now()` を UPDATE に追加（Dashboard で対応） |

---

## UI フロー

```
カレンダー画面
  → [日セルをタップ]
  → DayModal（アイテム一覧）
       → [アイテムをタップ]
       → DayModal（アイテム詳細）
            写真 / 「アップロードされた写真は削除済みです」 / 写真なしプレースホルダー
            ログ時刻一覧
            [← 戻る] → アイテム一覧に戻る
  → [×] → モーダルを閉じる
```

---

## 注意事項

- `photo_deleted_at` カラム追加前に記録されたログは、削除後も `photo_deleted_at = NULL` のままになる。
  マイグレーション適用以前の削除済み写真は「写真なし」として表示される（後から遡及はしない）。
- 署名付き URL は取得時点から1時間有効。モーダルを長時間開いたままにすると期限切れになるが、再取得はしない（シンプルさ優先）。
- `ItemDayDetail` は `useFetcher` を使うため、React Router のコンテキスト内で動作する必要がある（現状の使用箇所はすべて `/app` 配下なので問題なし）。
