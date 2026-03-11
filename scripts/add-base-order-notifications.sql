-- BASE注文通知の重複防止テーブル
-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS base_order_notifications (
  id uuid default gen_random_uuid() primary key,
  unique_key text not null,       -- BASE注文ID
  event_type text not null,       -- 'order_add' | 'shipped'
  line_user_id text,              -- 送信先LINE ID（未紐付けはnull）
  customer_mail text,             -- 注文者メール
  sent boolean default false,     -- LINE送信済みか
  payload jsonb,                  -- 受信ペイロード全体（デバッグ用）
  created_at timestamptz default now()
);

-- 同一注文×同一イベントの重複送信防止
CREATE UNIQUE INDEX IF NOT EXISTS base_order_notifications_unique
  ON base_order_notifications(unique_key, event_type);
