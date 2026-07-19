-- provision_workspace(): transactional customer workspace foundation
-- Project: kkxtvzxqmbacjatkiupq (Unit311 Central)
-- Database only. No users, auth, clients, subdomains, emails, or app behaviour.

-- Categories must be unique per workspace (not globally) so customer
-- workspaces can receive the same default file-type labels as Internal.
alter table public.file_categories
  drop constraint if exists file_categories_name_unique;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'file_categories_workspace_name_key'
      and conrelid = 'public.file_categories'::regclass
  ) then
    alter table public.file_categories
      add constraint file_categories_workspace_name_key
      unique (workspace_id, name);
  end if;
end $$;

create or replace function public.provision_workspace(
  company_name text,
  workspace_slug text
)
returns uuid
language plpgsql
as $$
declare
  v_company_name text;
  v_workspace_slug text;
  v_source_workspace_id uuid;
  v_new_workspace_id uuid;
  v_enabled_module_count integer;
begin
  v_company_name := nullif(trim(company_name), '');
  v_workspace_slug := nullif(lower(trim(workspace_slug)), '');

  if v_company_name is null then
    raise exception 'provision_workspace: company_name is required';
  end if;

  if v_workspace_slug is null then
    raise exception 'provision_workspace: workspace_slug is required';
  end if;

  if v_workspace_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception
      'provision_workspace: workspace_slug must be lowercase alphanumeric with optional hyphens (got %)',
      workspace_slug;
  end if;

  if exists (
    select 1 from public.workspaces w where w.slug = v_workspace_slug
  ) then
    raise exception
      'provision_workspace: workspace_slug already exists (got %)',
      v_workspace_slug;
  end if;

  select w.id
  into v_source_workspace_id
  from public.workspaces w
  where w.slug = 'unit311'
  limit 1;

  if v_source_workspace_id is null then
    raise exception
      'provision_workspace: Unit311 Central workspace (slug=unit311) not found';
  end if;

  -- 1. Create workspace (Customer)
  insert into public.workspaces (name, slug, workspace_type, status)
  values (v_company_name, v_workspace_slug, 'Customer', 'Active')
  returning id into v_new_workspace_id;

  -- 2. Default workspace_settings (mirror Internal defaults when present)
  insert into public.workspace_settings (
    workspace_id,
    timezone,
    currency,
    language,
    date_format,
    time_format,
    logo_url,
    primary_colour,
    secondary_colour
  )
  select
    v_new_workspace_id,
    coalesce(s.timezone, 'Europe/London'),
    coalesce(s.currency, 'USD'),
    coalesce(s.language, 'en-GB'),
    coalesce(s.date_format, 'DD/MM/YYYY'),
    coalesce(s.time_format, '24h'),
    null,
    coalesce(s.primary_colour, '#0b2d63'),
    coalesce(s.secondary_colour, '#2563eb')
  from (select 1) as _
  left join public.workspace_settings s
    on s.workspace_id = v_source_workspace_id;

  -- 3. Copy enabled modules from Unit311 Central
  insert into public.workspace_modules (workspace_id, module_key, enabled)
  select
    v_new_workspace_id,
    m.module_key,
    true
  from public.workspace_modules m
  where m.workspace_id = v_source_workspace_id
    and m.enabled = true;

  get diagnostics v_enabled_module_count = row_count;

  if v_enabled_module_count = 0 then
    raise exception
      'provision_workspace: Unit311 Central has no enabled modules to copy';
  end if;

  -- 4. Default file structure (categories + structural root folders only)
  -- Does not copy Internal operational / client folders or files.
  insert into public.file_categories (name, color, workspace_id)
  select c.name, c.color, v_new_workspace_id
  from public.file_categories c
  where c.workspace_id = v_source_workspace_id
  order by c.name;

  insert into public.file_folders (
    name,
    parent_id,
    category_id,
    external_scope,
    workspace_id
  )
  values
    ('External Files', null, null, true, v_new_workspace_id),
    ('Client Invoices', null, null, false, v_new_workspace_id);

  -- 5. Audit log
  insert into public.workspace_audit_log (
    workspace_id,
    event_type,
    entity_type,
    entity_id,
    description
  )
  values (
    v_new_workspace_id,
    'workspace_created',
    'workspace',
    v_new_workspace_id,
    format(
      'Workspace provisioned for company "%s" with slug "%s".',
      v_company_name,
      v_workspace_slug
    )
  );

  -- 6. Return new workspace_id
  return v_new_workspace_id;
end;
$$;

comment on function public.provision_workspace(text, text) is
  'Transactional customer workspace provisioning: workspace, settings, enabled modules from unit311, default file categories/root folders, audit log. No users/auth/clients.';
