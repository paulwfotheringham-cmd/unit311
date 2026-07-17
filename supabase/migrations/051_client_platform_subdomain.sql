-- Client platform subdomain provisioning

alter table public.internal_clients
  add column if not exists platform_subdomain text,
  add column if not exists platform_ready_at timestamptz;

create unique index if not exists internal_clients_platform_subdomain_uidx
  on public.internal_clients (platform_subdomain)
  where platform_subdomain is not null;
