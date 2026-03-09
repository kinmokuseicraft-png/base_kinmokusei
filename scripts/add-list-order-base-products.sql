-- base_products に list_order を追加（3,000件対応・ショップ並び順用）
-- 実行方法: Supabase ダッシュボード > SQL Editor でこのファイルの内容を貼り付けて実行する

ALTER TABLE base_products ADD COLUMN IF NOT EXISTS list_order INT DEFAULT 0;
