-- Multi-tenant Chart of Accounts uniqueness.
-- Replace global UNIQUE(code) with UNIQUE(workspace_id, code).
-- Schema-only: does not rewrite or modify any row data.

do $$
declare
  null_count bigint;
  dup_count bigint;
begin
  select count(*) into null_count
  from public.accounts
  where workspace_id is null;

  if null_count > 0 then
    raise exception
      '090_accounts_workspace_code_unique: accounts.workspace_id has % null row(s)',
      null_count;
  end if;

  select count(*) into dup_count
  from (
    select workspace_id, code
    from public.accounts
    group by workspace_id, code
    having count(*) > 1
  ) duplicates;

  if dup_count > 0 then
    raise exception
      '090_accounts_workspace_code_unique: % duplicate (workspace_id, code) group(s) exist',
      dup_count;
  end if;
end $$;

alter table public.accounts
  drop constraint if exists accounts_code_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_workspace_id_code_key'
      and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_workspace_id_code_key
      unique (workspace_id, code);
  end if;
end $$;
