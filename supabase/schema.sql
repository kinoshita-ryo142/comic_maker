-- 1. ユーザーテーブル（管理者が発行するID/パスワード）
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- 2. キャラクターテーブル（1ユーザーにつき1キャラクター）
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.users(id) on delete cascade,
  name text not null,
  profile text not null,
  image_url text not null,
  updated_at timestamptz not null default now()
);

-- 3. 4コマ漫画テーブル
create table if not exists public.comics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  title text not null,
  synopsis text not null,
  scenario text not null,
  panels jsonb not null, -- [{ panelNumber: 1..4, scene: string, dialogue: string }]
  image_url text not null,
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_comics_user_id on public.comics(user_id);

-- ※ Storage バケットについて:
-- Supabase ダッシュボードの Storage から `comic-assets` という名前のバケットを作成し、
-- Public bucket を ON にしてください（画像をブラウザで表示するため）。
