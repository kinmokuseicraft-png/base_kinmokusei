-- 一斉配信テーブル（broadcasts）
-- Supabase の SQL Editor で実行してください

create table if not exists public.broadcasts (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null default '',
  body         text        not null default '',
  status       text        not null default 'draft'
                           check (status in ('draft', 'scheduled', 'sent')),
  scheduled_at timestamptz          default null,
  sent_at      timestamptz          default null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- インデックス（一覧取得の高速化）
create index if not exists broadcasts_status_idx      on public.broadcasts (status);
create index if not exists broadcasts_created_at_idx  on public.broadcasts (created_at desc);

-- Row Level Security（管理者のみ操作可能）
alter table public.broadcasts enable row level security;

-- service_role（サーバーサイドAPI）は全操作を許可
create policy "service_role full access" on public.broadcasts
  for all
  using (true)
  with check (true);
