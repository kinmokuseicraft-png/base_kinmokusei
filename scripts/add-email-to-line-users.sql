-- line_users テーブルにメールアドレスカラムを追加
ALTER TABLE line_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE line_users ADD COLUMN IF NOT EXISTS email_registered_at TIMESTAMPTZ;
