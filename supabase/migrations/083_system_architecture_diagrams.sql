-- System architecture diagrams for Unit311 Details knowledge centre.
-- Each section_slug may have at most one editable React Flow diagram (JSON).

create table if not exists public.system_architecture_diagrams (
  id uuid primary key default gen_random_uuid(),
  section_slug text not null,
  title text not null,
  diagram_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_architecture_diagrams_section_slug_key unique (section_slug)
);

comment on table public.system_architecture_diagrams is
  'Editable React Flow architecture diagrams keyed by Unit311 Details section_slug.';

comment on column public.system_architecture_diagrams.section_slug is
  'Matches Unit311 Details category id (e.g. storage, wise, supabase).';

comment on column public.system_architecture_diagrams.diagram_json is
  'React Flow document: { version, nodes, edges, viewport? }.';

create index if not exists system_architecture_diagrams_section_slug_idx
  on public.system_architecture_diagrams (section_slug);

create index if not exists system_architecture_diagrams_updated_at_idx
  on public.system_architecture_diagrams (updated_at desc);
