# グラフビュー 実装計画

## 1. 概要

要件定義 §2.3「可視化」に基づき、`/app/history` ルートに**グラフビュー**を実装する。

カレンダービューは既に実装済みのため、同一ページにビュー切替タブを追加してグラフビューを統合する。

---

## 2. 実装スコープ

### 今回実装する

| 機能 | 詳細 |
|------|------|
| ビュー切替タブ | 履歴ページ上部に「📅 カレンダー」「📈 グラフ」タブを追加 |
| 折れ線グラフ | 確認項目ごとの回数推移を Recharts（LineChart）で表示 |
| 日別グラフ | 直近30日間の日別確認回数（X軸: M/D形式） |
| 週別グラフ | 直近12週間の週別確認回数（月曜始まり） |
| アイテムトグル | 表示するアイテムを個別にON/OFF（タップでラインを非表示） |
| 期間切替 | 「日別（30日）」「週別（12週）」ボタンで切替 |
| URL状態保持 | `?view=graph&period=daily` でビュー状態を URL に保持 |

### スコープ外

- 確認ログの編集・削除
- データエクスポート（別途 §2.4）
- 棒グラフ・円グラフ等の他グラフ種別

---

## 3. ファイル構成

### 新規作成

```
app/
├── lib/
│   └── date.ts                      # JSTユーティリティ（app-history.tsx から抽出）
└── components/
    ├── history-calendar.tsx          # カレンダー関連コンポーネント（app-history.tsx から移動）
    └── history-graph.tsx             # グラフ関連コンポーネント（新規）
docs/
└── graph-view-plan.md               # 本ドキュメント
```

### 変更

| ファイル | 変更内容 |
|----------|----------|
| `app/routes/app-history.tsx` | ① lib/date からユーティリティをインポート ② グラフ用ローダークエリを追加 ③ ビュー切替タブを実装 ④ `shouldRevalidate` を追加 |

---

## 4. ライブラリ選定

| 用途 | 採用 | 理由 |
|------|------|------|
| グラフ描画 | **Recharts v3** | 要件定義 §4.1 で言及。React との統合がシームレスで TypeScript 対応も良好 |

---

## 5. ルーティング・URL 設計

```
/app/history                            # カレンダービュー（デフォルト）
/app/history?view=graph                 # グラフビュー（日別・デフォルト）
/app/history?view=graph&period=weekly   # グラフビュー（週別）
/app/history?month=2026-01              # カレンダービュー（特定月）
```

`shouldRevalidate` を実装し、`view` / `period` パラメータの変更ではローダーを再実行しない。月変更時のみ再実行する。

---

## 6. データ設計

### 6.1 Loader で追加取得するデータ

```typescript
// グラフ用: 過去84日分のログ（12週をカバー）
const graphStart = new Date(Date.now() - 84 * 24 * 60 * 60 * 1000);

supabase
  .from("check_logs")
  .select("check_item_id, checked_at")
  .gte("checked_at", graphStart.toISOString())
```

### 6.2 フロントエンドでの集計

```typescript
// 日別: 過去30日を JST で集計
function buildDailyData(logs, items) → DataPoint[]

// 週別: 過去12週を月曜始まりで集計
function buildWeeklyData(logs, items) → DataPoint[]
```

---

## 7. UI 設計

### 7.1 ページ全体レイアウト

```
┌─────────────────────────────┐
│  サマリーカード（共通）        │
├─────────────────────────────┤
│  [📅 カレンダー] [📈 グラフ]  │  ← ビュー切替タブ
├─────────────────────────────┤
│  （グラフビュー時）            │
│  [日別（30日）] [週別（12週）] │  ← 期間切替
│                             │
│  ┌─────────────────────┐    │
│  │    Recharts          │    │  ← LineChart + ResponsiveContainer
│  │    折れ線グラフ        │    │
│  └─────────────────────┘    │
│                             │
│  ● 🔑 玄関の鍵              │  ← アイテムトグルボタン
│  ● 🔥 ガスの元栓             │
└─────────────────────────────┘
```

### 7.2 カラーパレット（アイテムライン色）

| インデックス | 色 | Tailwind 相当 |
|---|---|---|
| 0 | `#0ea5e9` | sky-500 |
| 1 | `#f97316` | orange-500 |
| 2 | `#a855f7` | purple-500 |
| 3 | `#22c55e` | green-500 |
| 4 | `#ef4444` | red-500 |
| 5 | `#eab308` | yellow-500 |
| 6 | `#ec4899` | pink-500 |
| 7 | `#14b8a6` | teal-500 |

---

## 8. 実装ステップ

| ステップ | 内容 |
|----------|------|
| 1 | `npm install recharts` |
| 2 | `app/lib/date.ts` を作成（JSTユーティリティを抽出） |
| 3 | `app/components/history-calendar.tsx` を作成（カレンダーコンポーネントを移動） |
| 4 | `app/components/history-graph.tsx` を作成（Rechartsグラフ） |
| 5 | `app/routes/app-history.tsx` を更新（ローダー・ビュー切替） |
| 6 | `npm run typecheck` で型確認 |

---

## 9. 決定事項まとめ

| 事項 | 決定内容 |
|------|---------|
| グラフライブラリ | Recharts v3（npm install 可能になったため）|
| ファイル分割 | カレンダー・グラフをそれぞれ別コンポーネントファイルに分割 |
| ビュー切替 | URL パラメータ（`?view=`）で管理。`shouldRevalidate` で不要な再フェッチを防止 |
| データ取得 | ローダーで過去84日分を並列取得。TS側で日別/週別を集計 |
| タイムゾーン | `app/lib/date.ts` の JST ユーティリティ関数を共用 |
| SSR対策 | `mounted` state + `useEffect` で `ResponsiveContainer` のSSRエラーを回避 |
