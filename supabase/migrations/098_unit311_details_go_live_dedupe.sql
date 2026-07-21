-- 098: Repair duplicate Unit311 Details / Go-Live file_folders + file_objects
-- and prevent recurrence with workspace-scoped unique indexes.
-- Root cause: Module Go-Live load used .maybeSingle() on file_objects by name;
-- concurrent ensureFolder/save created duplicate rows with no unique constraint.

-- 1) Merge duplicate folders (same workspace + parent + name): keep oldest.
do $$
declare
  dup record;
  keeper_id uuid;
  loser_id uuid;
begin
  for dup in
    select
      workspace_id,
      parent_id,
      name,
      array_agg(id order by created_at asc, id asc) as ids
    from public.file_folders
    group by workspace_id, parent_id, name
    having count(*) > 1
  loop
    keeper_id := dup.ids[1];

    foreach loser_id in array dup.ids[2:]
    loop
      -- Move child folders under the keeper (name collisions resolved in later passes).
      update public.file_folders
      set parent_id = keeper_id,
          updated_at = now()
      where parent_id = loser_id;

      -- Move files into the keeper.
      update public.file_objects
      set folder_id = keeper_id,
          updated_at = now()
      where folder_id = loser_id;

      delete from public.file_folders
      where id = loser_id;
    end loop;
  end loop;

  -- Repeat folder merge until no parent-level name collisions remain after moves.
  while exists (
    select 1
    from public.file_folders
    group by workspace_id, parent_id, name
    having count(*) > 1
  ) loop
    for dup in
      select
        workspace_id,
        parent_id,
        name,
        array_agg(id order by created_at asc, id asc) as ids
      from public.file_folders
      group by workspace_id, parent_id, name
      having count(*) > 1
    loop
      keeper_id := dup.ids[1];
      foreach loser_id in array dup.ids[2:]
      loop
        update public.file_folders
        set parent_id = keeper_id,
            updated_at = now()
        where parent_id = loser_id;

        update public.file_objects
        set folder_id = keeper_id,
            updated_at = now()
        where folder_id = loser_id;

        delete from public.file_folders
        where id = loser_id;
      end loop;
    end loop;
  end loop;
end $$;

-- 2) Deduplicate files in the same folder with the same name: keep newest.
do $$
declare
  dup record;
  keeper_id uuid;
  loser_id uuid;
begin
  for dup in
    select
      workspace_id,
      folder_id,
      name,
      array_agg(id order by created_at desc, id desc) as ids
    from public.file_objects
    where folder_id is not null
    group by workspace_id, folder_id, name
    having count(*) > 1
  loop
    keeper_id := dup.ids[1];
    foreach loser_id in array dup.ids[2:]
    loop
      delete from public.file_objects
      where id = loser_id;
    end loop;
  end loop;
end $$;

-- 3) Prevent recurrence
create unique index if not exists file_folders_workspace_root_name_uidx
  on public.file_folders (workspace_id, name)
  where parent_id is null;

create unique index if not exists file_folders_workspace_parent_name_uidx
  on public.file_folders (workspace_id, parent_id, name)
  where parent_id is not null;

create unique index if not exists file_objects_workspace_folder_name_uidx
  on public.file_objects (workspace_id, folder_id, name)
  where folder_id is not null;
