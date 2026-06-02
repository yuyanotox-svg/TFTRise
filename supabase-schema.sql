create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_state_backups (
  id bigint generated always as identity primary key,
  state_id text not null,
  data jsonb not null default '{}'::jsonb,
  reason text not null default 'manual',
  created_at timestamptz not null default now()
);

alter table public.app_state enable row level security;
alter table public.app_state_backups enable row level security;

drop policy if exists "TFTRise public read app state" on public.app_state;
create policy "TFTRise public read app state"
on public.app_state
for select
using (true);

drop policy if exists "TFTRise public write app state" on public.app_state;
drop policy if exists "TFTRise public update app state" on public.app_state;

-- Writes are handled by Vercel API routes with SUPABASE_SERVICE_ROLE_KEY.
-- Do not add public insert/update policies for the browser anon key.

drop policy if exists "TFTRise public read state backups" on public.app_state_backups;
drop policy if exists "TFTRise public write state backups" on public.app_state_backups;

-- Backups are server-only. Use Supabase dashboard or a future admin API to restore.
