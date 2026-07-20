/**
 * Refresh curated Demo workspace content (same app build as Internal).
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=... node scripts/refresh-demo-workspace.mjs
 *
 * Optional:
 *   SUPABASE_PROJECT_REF=kkxtvzxqmbacjatkiupq
 *   DEMO_WORKSPACE_SLUG=demo
 *
 * Safe to re-run: deletes Demo-scoped curated clients tagged in notes, then reseeds.
 */

const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "kkxtvzxqmbacjatkiupq";
const demoSlug = (process.env.DEMO_WORKSPACE_SLUG ?? "demo").trim().toLowerCase();
const CURATED_TAG = "[demo-curated]";

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Query failed (${res.status}): ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
}

const seedSql = `
do $$
declare
  demo_id uuid;
begin
  select id into demo_id from public.workspaces where slug = '${demoSlug}' limit 1;
  if demo_id is null then
    raise exception 'Demo workspace slug % not found. Apply migration 097_demo_workspace.sql first.', '${demoSlug}';
  end if;

  -- Remove previous curated demo clients in this workspace only
  delete from public.internal_clients
  where workspace_id = demo_id
    and notes like '%${CURATED_TAG}%';

  insert into public.internal_clients (
    id, workspace_id, company_name, industry, primary_contact, email, phone, region,
    account_status, contract_type, tax_id, billing_address, active_projects, notes
  ) values
    (
      'demo-client-aurora',
      demo_id,
      'Aurora Survey Ltd',
      'Survey / Mapping',
      'Alex Rivera',
      'alex@aurora-demo.example',
      '+44 20 0000 1001',
      'United Kingdom',
      'Active',
      'Framework Agreement',
      'GB-DEMO-001',
      '1 Demo Street, London',
      0,
      '${CURATED_TAG} Active client for sales journeys.'
    ),
    (
      'demo-client-harbor',
      demo_id,
      'Harbor Logistics',
      'Logistics',
      'Sam Chen',
      'sam@harbor-demo.example',
      '+1 415 000 2002',
      'United States',
      'Onboarding',
      'Project-based',
      'US-DEMO-002',
      '200 Pier Ave, Oakland',
      0,
      '${CURATED_TAG} Onboarding journey demo.'
    ),
    (
      'demo-client-northwind',
      demo_id,
      'Northwind Energy',
      'Energy',
      'Jordan Lee',
      'jordan@northwind-demo.example',
      '+61 2 0000 3003',
      'Australia',
      'Client Created',
      'Trial',
      'AU-DEMO-003',
      '88 Wind Rd, Sydney',
      0,
      '${CURATED_TAG} New client / files workspace demo.'
    )
  on conflict (id) do update set
    workspace_id = excluded.workspace_id,
    company_name = excluded.company_name,
    industry = excluded.industry,
    primary_contact = excluded.primary_contact,
    email = excluded.email,
    phone = excluded.phone,
    region = excluded.region,
    account_status = excluded.account_status,
    contract_type = excluded.contract_type,
    tax_id = excluded.tax_id,
    billing_address = excluded.billing_address,
    notes = excluded.notes,
    updated_at = now();
end $$;
`;

console.log(`Refreshing Demo workspace "${demoSlug}" on project ${projectRef}…`);
await query(seedSql);

const count = await query(`
  select count(*)::int as curated_clients
  from public.internal_clients c
  join public.workspaces w on w.id = c.workspace_id
  where w.slug = '${demoSlug}'
    and c.notes like '%${CURATED_TAG}%'
`);

console.log("Curated demo clients:", JSON.stringify(count));
console.log("Done. Open https://demo.unit311central.com and verify the demo journey.");
