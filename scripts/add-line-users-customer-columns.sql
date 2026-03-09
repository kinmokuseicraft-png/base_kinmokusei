-- line_users に顧客紐付け用カラムを追加（LINE メールと BASE 顧客の突合用）
-- 実行方法: Supabase ダッシュボード > SQL Editor で実行

-- メールアドレス（LINE ログインで取得。重複不可、未設定は NULL）
ALTER TABLE line_users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- BASE 側の顧客 ID（注文データ突合用）
ALTER TABLE line_users ADD COLUMN IF NOT EXISTS base_customer_id TEXT;

-- メール/BASE 顧客の紐付けを行った日時（タイムゾーン付き）
ALTER TABLE line_users ADD COLUMN IF NOT EXISTS last_linked_at TIMESTAMPTZ;
