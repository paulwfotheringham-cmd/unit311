-- Expand competitor markets + seed known SaaS / work-platform competitors
-- Markets: US, UK, Canada, Spain, France, Italy, Germany

alter table public.competitors drop constraint if exists competitors_region_check;

alter table public.competitors
  add constraint competitors_region_check
  check (
    region in (
      'us',
      'uk',
      'canada',
      'spain',
      'france',
      'italy',
      'germany',
      'portugal',
      'kenya',
      'namibia',
      'southafrica',
      'congo'
    )
  );

insert into public.competitors (
  region,
  company_name,
  website,
  services,
  service_categories,
  drone_technology,
  last_revenue,
  notes,
  sort_order
)
select
  market.region,
  seed.company_name,
  seed.website,
  seed.services,
  seed.service_categories,
  seed.drone_technology,
  seed.last_revenue,
  seed.notes,
  seed.sort_order
from (
  values
    ('us'),
    ('uk'),
    ('canada'),
    ('spain'),
    ('france'),
    ('italy'),
    ('germany')
) as market(region)
cross join (
  values
    (
      'Salesforce',
      'https://www.salesforce.com/',
      'Enterprise CRM, sales automation, service cloud, and marketing cloud suites.',
      'other',
      '',
      '$37.9B (FY2025)',
      'Largest CRM platform; deep enterprise footprint across all listed markets.',
      1
    ),
    (
      'HubSpot',
      'https://www.hubspot.com/',
      'Inbound CRM, marketing automation, sales pipeline, and customer service hubs.',
      'other',
      '',
      '$2.6B (2024)',
      'Strong mid-market CRM and marketing automation presence.',
      2
    ),
    (
      'Freshworks',
      'https://www.freshworks.com/',
      'CRM, IT service management, customer support, and marketing suites for growing teams.',
      'other',
      '',
      '$720M (2024 est.)',
      'Competes in CRM and support desks against HubSpot and Salesforce.',
      3
    ),
    (
      'Monday.com',
      'https://monday.com/',
      'Work OS for projects, CRM boards, marketing workflows, and operations dashboards.',
      'other',
      '',
      '$972M (2024)',
      'Work management platform expanding into CRM and service workflows.',
      4
    ),
    (
      'Asana',
      'https://asana.com/',
      'Work management, project tracking, goals, and cross-team collaboration.',
      'other',
      '',
      '$724M (2024)',
      'Project and portfolio management competitor in knowledge-work markets.',
      5
    ),
    (
      'Zoho CRM',
      'https://www.zoho.com/crm/',
      'Affordable CRM with sales automation, analytics, and Zoho suite integrations.',
      'other',
      '',
      '$1.2B suite (2024 est.)',
      'Price-competitive CRM alternative popular with SMBs.',
      6
    ),
    (
      'Pipedrive',
      'https://www.pipedrive.com/',
      'Sales-focused CRM pipeline management for SMBs and revenue teams.',
      'other',
      '',
      '$200M (2024 est.)',
      'Sales CRM specialist competing with HubSpot and Salesforce Essentials.',
      7
    ),
    (
      'Airtable',
      'https://www.airtable.com/',
      'Flexible database, interface builder, and workflow automation for operations teams.',
      'other',
      '',
      '$300M (2024 est.)',
      'No-code operations database competing with Notion and Monday.',
      8
    ),
    (
      'Notion',
      'https://www.notion.so/',
      'Docs, wikis, projects, and AI workspace for teams and companies.',
      'other',
      '',
      '$300M (2024 est.)',
      'All-in-one workspace overlapping with Asana and Monday use cases.',
      9
    ),
    (
      'ClickUp',
      'https://clickup.com/',
      'Tasks, docs, goals, dashboards, and AI productivity for project teams.',
      'other',
      '',
      '$200M (2024 est.)',
      'All-in-one work management challenger to Asana and Monday.',
      10
    ),
    (
      'Atlassian Jira',
      'https://www.atlassian.com/software/jira',
      'Issue tracking, agile project management, and software delivery workflows.',
      'other',
      '',
      '$4.4B Atlassian (FY2025)',
      'Dominant engineering project-tracking platform.',
      11
    ),
    (
      'Microsoft Dynamics 365',
      'https://dynamics.microsoft.com/',
      'CRM and ERP cloud suite integrated with Microsoft 365 and Azure.',
      'other',
      '',
      '$5B+ Dynamics (2024 est.)',
      'Enterprise CRM/ERP alternative to Salesforce in Microsoft-centric accounts.',
      12
    )
) as seed(
  company_name,
  website,
  services,
  service_categories,
  drone_technology,
  last_revenue,
  notes,
  sort_order
)
where not exists (
  select 1
  from public.competitors existing
  where existing.region = market.region
    and lower(existing.company_name) = lower(seed.company_name)
);
