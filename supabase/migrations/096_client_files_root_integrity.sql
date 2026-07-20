-- FDR-MOD-103 — Client Files root integrity
-- Clear broken soft links, coerce files_folder_id to uuid FK, backfill missing roots.
-- Idempotent for clean and upgraded databases.

do $$
declare
  col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'internal_clients'
    and column_name = 'files_folder_id';

  if col_type = 'text' or col_type = 'character varying' then
    -- Clear non-uuid / empty values before type coerce
    update public.internal_clients
    set
      files_folder_id = null,
      files_folder_name = null,
      updated_at = now()
    where files_folder_id is not null
      and (
        trim(files_folder_id) = ''
        or files_folder_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      );

    -- Drop invalid / cross-workspace links
    update public.internal_clients ic
    set
      files_folder_id = null,
      files_folder_name = null,
      updated_at = now()
    where ic.files_folder_id is not null
      and not exists (
        select 1
        from public.file_folders ff
        where ff.id::text = ic.files_folder_id
          and (
            ic.workspace_id is null
            or ff.workspace_id is null
            or ff.workspace_id = ic.workspace_id
          )
      );

    alter table public.internal_clients
      alter column files_folder_id type uuid
      using nullif(trim(files_folder_id), '')::uuid;
  elsif col_type = 'uuid' then
    -- Already uuid: clear links that no longer resolve in-workspace
    update public.internal_clients ic
    set
      files_folder_id = null,
      files_folder_name = null,
      updated_at = now()
    where ic.files_folder_id is not null
      and not exists (
        select 1
        from public.file_folders ff
        where ff.id = ic.files_folder_id
          and (
            ic.workspace_id is null
            or ff.workspace_id is null
            or ff.workspace_id = ic.workspace_id
          )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'internal_clients_files_folder_id_fkey'
      and conrelid = 'public.internal_clients'::regclass
  ) then
    alter table public.internal_clients
      add constraint internal_clients_files_folder_id_fkey
      foreign key (files_folder_id)
      references public.file_folders (id)
      on delete set null;
  end if;
end $$;

-- Backfill missing roots for workspace-scoped clients
do $$
declare
  r record;
  new_id uuid;
  folder_name text;
begin
  for r in
    select id, company_name, workspace_id
    from public.internal_clients
    where files_folder_id is null
      and workspace_id is not null
  loop
    folder_name := coalesce(nullif(trim(r.company_name), ''), 'Client folder');
    new_id := gen_random_uuid();

    insert into public.file_folders (id, name, parent_id, category_id, workspace_id)
    values (new_id, folder_name, null, null, r.workspace_id);

    update public.internal_clients
    set
      files_folder_id = new_id,
      files_folder_name = folder_name,
      updated_at = now()
    where id = r.id;
  end loop;
end $$;
