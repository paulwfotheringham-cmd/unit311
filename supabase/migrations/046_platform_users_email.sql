-- Contact email for platform users (especially external client portals)

alter table public.platform_users
  add column if not exists email text;

create index if not exists platform_users_email_idx
  on public.platform_users (email);
