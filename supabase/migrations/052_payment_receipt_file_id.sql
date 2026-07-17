alter table public.platform_organisations
  add column if not exists payment_receipt_file_id uuid;

create index if not exists platform_organisations_payment_receipt_file_id_idx
  on public.platform_organisations (payment_receipt_file_id)
  where payment_receipt_file_id is not null;
