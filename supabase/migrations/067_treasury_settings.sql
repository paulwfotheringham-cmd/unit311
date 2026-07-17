create table if not exists public.treasury_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.treasury_settings enable row level security;

drop policy if exists "treasury_settings_all" on public.treasury_settings;
create policy "treasury_settings_all" on public.treasury_settings
  for all using (true) with check (true);
