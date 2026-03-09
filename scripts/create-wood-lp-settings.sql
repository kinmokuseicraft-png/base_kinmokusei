-- LP管理テーブル: wood_lp_settings
-- JSONファイルの内容を上書きするための設定（hero画像・公開設定など）
CREATE TABLE IF NOT EXISTS wood_lp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- JSONのslug (例: ebony-african)
  wood_name_ja TEXT NOT NULL,          -- 表示名 (例: エボニー)
  hero_image_url TEXT,                 -- ヒーロー画像URL (Supabase Storage)
  hero_video_url TEXT,                 -- ヒーロー動画URL (将来用)
  custom_catch_copy TEXT,              -- catch_copyの上書き（空の場合JSONを使用）
  custom_story TEXT,                   -- card_descriptionの上書き
  search_keyword TEXT,                 -- BASE商品検索キーワード（空の場合wood_name_jaを使用）
  is_published BOOLEAN DEFAULT false,  -- 公開/非公開
  sort_order INT DEFAULT 0,            -- 一覧の並び順
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wood_lp_settings_slug ON wood_lp_settings(slug);
CREATE INDEX IF NOT EXISTS idx_wood_lp_settings_published ON wood_lp_settings(is_published);
