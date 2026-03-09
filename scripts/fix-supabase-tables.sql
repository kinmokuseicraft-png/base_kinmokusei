-- BASE連携・一斉配信を動かすための Supabase テーブル修正
-- 実行方法: Supabase ダッシュボード > SQL Editor でこのファイルを貼り付けて実行

-- 1. base_settings: 日付を TIMESTAMPTZ に統一（BIGINT だとトークン保存でエラーになる）
DROP TABLE IF EXISTS base_settings;
CREATE TABLE base_settings (
  id INT PRIMARY KEY DEFAULT 1,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. broadcasts: テーブルがなければ作成、あれば不足カラムを追加（column broadcasts.title does not exist を解消）
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS body TEXT NOT NULL DEFAULT '';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
