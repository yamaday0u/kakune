# Font Awesome アイコン移行 実装計画

## 1. 現状調査

アプリ内の「アイコン」は次の 3 種類に分かれる。

| 種別 | 実装 | 使用箇所 |
| --- | --- | --- |
| A. UIアイコン（ライブラリ） | `lucide-react` | `BottomNav.tsx`（House / History）、`Header.tsx`（Settings）、`history.tsx`（Calendar1 / ChartSpline） |
| B. UI記号（テキスト文字・絵文字） | `‹` `›` `×` `←` `📷` など | `history-calendar.tsx`、`login.tsx`、`auth-reset-password.tsx`、`items/detail.tsx`、`settings.tsx`、`settings/change-password.tsx`、`(authenticated)/home.tsx`、`routes/home.tsx`（LPの ✔️📷📊） |
| C. 確認項目アイコン（ユーザーデータ） | `check_items.icon`（TEXT）に絵文字を保存 | `items.tsx`（`PRESET_ICONS` / `IconPicker`）、`(authenticated)/home.tsx`、`items/detail.tsx`、`history-calendar.tsx`、`history-graph.tsx`（凡例＋Tooltip文字列） |

※ `public/app-icon-base.png`（favicon・ロゴ画像）は対象外。

## 2. 方針

- **パッケージ**: `@fortawesome/react-fontawesome` + `@fortawesome/fontawesome-svg-core` + `@fortawesome/free-solid-svg-icons`（必要に応じて `free-regular-svg-icons`）
  - アイコンは `import { faHouse } from "@fortawesome/free-solid-svg-icons"` の個別 import にする（tree-shaking が効く。`library.add` は使わない）
- **SSR対策**: FA はデフォルトでランタイムに CSS を `<head>` へ注入するため、SSR 初期描画でアイコンが巨大化する（FOUC）。`app/lib/fontawesome.ts` で `config.autoAddCss = false` を設定し、`root.tsx` で `@fortawesome/fontawesome-svg-core/styles.css` を import する
- **サイズ指定**: lucide の `size={22}` は使えないので、Tailwind の `text-[22px]` などフォントサイズで指定するか、`className="size-[22px]"` で揃える
- **フェーズ分割**: A+B（UIのみ、DB変更なし）と C（データ形式変更あり）は影響範囲が違うので **PRを分ける**

## 3. フェーズ1: UIアイコンの置き換え（PR 1）

### 3-1. セットアップ
1. `npm i @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome`
2. `app/lib/fontawesome.ts` を作成（`config.autoAddCss = false`）し、`root.tsx` から import ＋ `styles.css` を import
3. 置き換え完了後に `npm uninstall lucide-react`

### 3-2. 対応表

| 現在 | Font Awesome | 箇所 |
| --- | --- | --- |
| `House` | `faHouse` | BottomNav |
| `History` | `faClockRotateLeft` | BottomNav |
| `Settings` | `faGear` | Header |
| `Calendar1` | `faCalendarDay` | history.tsx 切替ボタン |
| `ChartSpline` | `faChartLine` | history.tsx 切替ボタン |
| `‹` / `›`（月送り・戻る・リスト末尾） | `faChevronLeft` / `faChevronRight` | history-calendar、settings、change-password |
| `×`（モーダル閉じる） | `faXmark` | history-calendar |
| `←`（戻るリンク） | `faArrowLeft` | login、auth-reset-password、items/detail |
| `📷`（写真ボタン・プレースホルダー） | `faCamera`（プレースホルダーは `faImage` も可） | (authenticated)/home、items/detail、history-calendar |
| LP 機能紹介 `✔️` `📷` `📊` | `faCircleCheck` / `faCamera` / `faChartColumn` | routes/home.tsx |

### 3-3. 実装上の注意
- `BottomNav` の型 `LucideIcon` → `IconDefinition`（`@fortawesome/fontawesome-svg-core`）に変更し、`<FontAwesomeIcon icon={item.icon} />` で描画
- アイコンのみのボタン（閉じる・月送り）は `aria-label` を必ず付与し、アイコン側は `aria-hidden`（FA はデフォルトで `aria-hidden="true"`）
- テスト修正: `history-calendar.test.tsx` の `getAllByText("›")` / `×` / `📷` によるクエリを、`getByRole("button", { name: "閉じる" })` や `data-testid` / `aria-label` ベースに書き換える

## 4. フェーズ2: 確認項目アイコンの置き換え（PR 2）

### 4-1. データ形式
`check_items.icon` には今後 **FA のアイコン名（例: `"key"`）** を保存する。スキーマのコメントも元々「絵文字 or アイコン名」なのでカラム変更は不要。

### 4-2. 共通モジュールの追加
- `app/lib/item-icons.ts`: プリセット定義（名前 → `IconDefinition` ＋ 日本語ラベル）
- `app/components/ItemIcon.tsx`: `icon: string | null` を受け取り、
  - プリセット名なら `<FontAwesomeIcon>` を描画
  - 未知の値（旧データの絵文字など）ならそのままテキスト描画（**後方互換のフォールバック**）
  - `null` なら `faCheck`
- 現在 `{item.icon ?? "✔️"}` と書いている 7 箇所をすべて `<ItemIcon icon={item.icon} />` に置き換える

### 4-3. プリセット対応表（案）

| 絵文字 | 保存値 | FA アイコン | ラベル |
| --- | --- | --- | --- |
| 🔑 | `key` | `faKey` | 鍵 |
| 🔒 | `lock` | `faLock` | 施錠 |
| 🚪 | `door` | `faDoorClosed` | ドア |
| 🪟 | `window` | 要検討（Free に家の窓アイコンなし。`faTableCells` 等で代替） | 窓 |
| 🔥 | `fire` | `faFire` | 火 |
| 💡 | `lightbulb` | `faLightbulb` | 電気 |
| ⚡ | `bolt` | `faBolt` | 電源 |
| 🚿 | `shower` | `faShower` | シャワー |
| 🚰 | `faucet` | `faFaucet` | 水道 |
| 🚗 | `car` | `faCar` | 車 |
| 🎒 | `bag` | 要確認（`faSuitcase` / `faBagShopping` で代替） | カバン |
| 💼 | `briefcase` | `faBriefcase` | 仕事 |
| 🏠 | `house` | `faHouse` | 家 |
| 📱 | `phone` | `faMobileScreen` | スマホ |
| ✔️ | `check` | `faCheck` | チェック |

> 🪟・🎒 は Font Awesome Free に相当アイコンがない／Pro限定の可能性があるため、実装時に公式サイトで Free 収録を確認して決める。

### 4-4. 画面ごとの変更
- `items.tsx`: `PRESET_ICONS` を `item-icons.ts` 参照に変更。`IconPicker` のボタンは `aria-label` を日本語ラベルに、初期値を `"check"` に
- `history-graph.tsx`: Tooltip の `formatter` は文字列連結しているため、アイコンを外して `item.name` のみにする（Recharts の label に ReactNode を返す方法もあるが、Tooltip 内のレイアウト崩れリスクがあるのでシンプルに）。凡例は `<ItemIcon>` に置換
- `items.test.tsx`: 絵文字ベースのアサーションをアイコン名／ラベルベースに書き換え

### 4-5. 既存データのマイグレーション
`supabase/migrations/2026XXXXXXXXXX_item_icon_to_fontawesome.sql` を追加し、既知の絵文字を名前に一括変換する。

```sql
UPDATE check_items SET icon = CASE icon
  WHEN '🔑' THEN 'key'
  WHEN '🔒' THEN 'lock'
  -- ...（4-3 の表どおり）
  ELSE icon
END
WHERE icon IN ('🔑', '🔒', /* ... */);
```

- 未知の絵文字は `ItemIcon` のフォールバックでそのまま表示されるので壊れない
- ✔️ は異体字セレクタ（U+FE0F）付き／なし両方を変換対象にする
- **リリース順序**: アプリ（フォールバック付き `ItemIcon`）をデプロイ → マイグレーション実行、の順にすれば途中状態でも表示が壊れない

## 5. 検証

1. `npm run typecheck`
2. `npm run test`（修正したテストを含め全件パス）
3. `npm run build`（バンドルに FA の個別アイコンのみ含まれることを確認）
4. `npm run dev` で各画面を目視確認
   - SSR 初回表示でアイコンが巨大化しないこと（`autoAddCss` 設定の確認）
   - ボトムナビのアクティブ色（`text-slate-700` / `text-slate-400`）がアイコンにも効くこと（FA は `currentColor` なのでそのまま効く想定）
   - モバイル幅でのサイズ感・タップ領域

## 6. 作業見積もり

| フェーズ | 内容 | 規模 |
| --- | --- | --- |
| PR 1 | セットアップ、UIアイコン・記号の置換、lucide削除、テスト修正 | 約10ファイル |
| PR 2 | `ItemIcon` 追加、プリセット変更、7箇所置換、マイグレーション、テスト修正 | 約8ファイル＋SQL |
