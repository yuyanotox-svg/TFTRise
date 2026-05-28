create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "TFTRise public read app state" on public.app_state;
create policy "TFTRise public read app state"
on public.app_state
for select
using (true);

drop policy if exists "TFTRise public write app state" on public.app_state;
create policy "TFTRise public write app state"
on public.app_state
for insert
with check (true);

drop policy if exists "TFTRise public update app state" on public.app_state;
create policy "TFTRise public update app state"
on public.app_state
for update
using (true)
with check (true);
