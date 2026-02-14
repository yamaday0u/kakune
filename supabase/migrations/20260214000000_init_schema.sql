-- ============================================================
-- 確認項目マスタ
-- ============================================================
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

-- ============================================================
-- 確認記録
-- ============================================================
CREATE TABLE check_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_item_id UUID NOT NULL REFERENCES check_items(id) ON DELETE CASCADE,
  checked_at    TIMESTAMPTZ DEFAULT now(),  -- 確認した日時
  note          TEXT,                        -- 任意メモ
  photo_path    TEXT,                        -- Supabase Storage 内のパス
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS（Row Level Security）
-- ============================================================
ALTER TABLE check_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own check_items"
  ON check_items FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only access own check_logs"
  ON check_logs FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 可視化用インデックス
-- ============================================================
CREATE INDEX idx_check_logs_user_date
  ON check_logs (user_id, checked_at DESC);

CREATE INDEX idx_check_logs_item_date
  ON check_logs (check_item_id, checked_at DESC);
