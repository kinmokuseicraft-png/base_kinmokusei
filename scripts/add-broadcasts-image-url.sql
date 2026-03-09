-- broadcasts テーブルに image_url カラムを追加
alter table public.broadcasts
  add column if not exists image_url text default null;
