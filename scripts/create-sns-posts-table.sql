-- SNS発信ハブ：投稿保存用テーブル
-- 実行方法: Supabase ダッシュボード > SQL Editor でこのファイルを貼り付けて実行

CREATE TABLE IF NOT EXISTS sns_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INT,
  original_memo TEXT,
  image_url TEXT,
  x_copy TEXT NOT NULL DEFAULT '',
  insta_copy TEXT NOT NULL DEFAULT '',
  line_copy TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE sns_posts IS 'SNS発信ハブで生成した3案と素材を保存。product_id は base_products の item_id を参照（任意）。';
