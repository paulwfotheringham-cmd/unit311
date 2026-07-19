import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageBreak,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "docs", "BCN-Unit311-Platform-Technical-Documentation.docx");
const SCREENSHOTS = path.join(ROOT, "docs", "screenshots");
const FOLDER_TREE = path.join(ROOT, "docs", "folder-structure.txt");

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, size: opts.size ?? 22 })],
  });
}

function bullet(text) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 80 },
  });
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 } });
}

function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 } });
}

function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 } });
}

function table(headers, rows) {
  const headerRow = new TableRow({
    children: headers.map(
      (text) =>
        new TableCell({
          width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  });
  const bodyRows = rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (text) =>
            new TableCell({
              children: [new Paragraph({ text: String(text) })],
            }),
        ),
      }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] });
}

function screenshot(name, caption) {
  const file = path.join(SCREENSHOTS, `${name}-1440.png`);
  if (!fs.existsSync(file)) {
    return [p(`[Screenshot unavailable: ${caption}]`, { italics: true })];
  }
  const data = fs.readFileSync(file);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [
        new ImageRun({
          data,
          transformation: { width: 620, height: 388 },
          type: "png",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: caption, italics: true, size: 20, color: "555555" })],
    }),
  ];
}

const folderLines = fs.existsSync(FOLDER_TREE)
  ? fs.readFileSync(FOLDER_TREE, "utf8").split(/\r?\n/).filter(Boolean).slice(0, 400)
  : [];

const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 400 },
    children: [new TextRun({ text: "Unit311 / BCN Drone Center", bold: true, size: 56 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: "Platform Technical & Business Documentation", size: 36 })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "Version 1.0 — March 2026", size: 24, color: "666666" })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Production: https://barcelonadronecenter.vercel.app", size: 22, color: "666666" })],
  }),
  new Paragraph({ children: [new PageBreak()] }),

  h1("Table of Contents"),
  p("1. Executive Overview"),
  p("2. Application Architecture"),
  p("3. Technology Stack & Folder Structure"),
  p("4. Database Schema & Entity Relationships"),
  p("5. Modules & Purpose"),
  p("6. Pages, Routes & Screens"),
  p("7. User Workflows & Business Processes"),
  p("8. API Endpoints & External Integrations"),
  p("9. User Roles, Permissions & Security"),
  p("10. Reusable Components & Shared Services"),
  p("11. Multi-Tenant Cloning & Configuration"),
  p("12. Deployment Architecture & Environment"),
  p("13. Strengths, Technical Debt & Recommendations"),
  p("Appendix A: Project Folder Structure"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("1. Executive Overview"),
  p(
    "The BCN Drone Center platform (marketed as Unit311) is a full-stack business operating system built for SMEs, new businesses, and operational teams that need CRM, projects, finance, HR, files, messaging, support, logistics, and geospatial tooling in one place. It is implemented as a Next.js 16 application deployed on Vercel with Supabase (PostgreSQL + Storage) as the primary data layer.",
  ),
  p(
    "The flagship surface is the Internal Operations Dashboard at /internaldashboard — a single-page application shell hosting 37+ functional workspaces accessed via query-parameter routing (?view=). The platform also includes public marketing pages, client portals (Venturi, Westport), WhatsApp-driven support intake, live Zoho email integration, WebODM deliverable viewing, and an Android wrapper (Capacitor) that loads the production site.",
  ),
  p("Primary business value:"),
  bullet("One-stop shop for business operations — replaces fragmented SaaS tools for early-stage and mid-market operators."),
  bullet("Industry-ready modules — surveying, inspection, mining sector intelligence, training, logistics, and competitor tracking."),
  bullet("White-label potential — site config, branding, mailbox accounts, office locations, and client records are data-driven and cloneable."),
  bullet("Demo-ready — internal dashboard is publicly accessible for sales and investor demonstrations."),
  new Paragraph({ children: [new PageBreak()] }),

  h1("2. Application Architecture"),
  h2("2.1 High-Level Architecture"),
  p(
    "The system follows a classic three-tier pattern: React client (App Router) → Next.js API routes (serverless on Vercel) → Supabase Postgres/Storage and external services (Zoho, WebODM, WhatsApp bots).",
  ),
  p("Architecture layers:"),
  bullet("Presentation: React 19 client components in src/components/, primarily testflighthub/ for internal ops."),
  bullet("Routing: Next.js App Router — marketing pages, (survey-operations) group for full-screen ops shell, 69 API route handlers."),
  bullet("Business logic: src/lib/*-service.ts modules encapsulate Supabase access and integration logic."),
  bullet("Data: 38 SQL migrations in supabase/migrations/; runtime migration helpers in internal-db-migrations.ts."),
  bullet("Integrations: IMAP/SMTP (Zoho), WebODM REST + tile proxies, CallMeBot/TextMeBot WhatsApp APIs."),
  h2("2.2 Internal Dashboard Pattern"),
  p(
    "InternalOperationsDashboard.tsx is the central orchestrator. It maintains activeView state synchronized with the URL query ?view=. SurveyOperationsShell provides the chrome (sidebar, header, responsive layout). Each workspace is a lazy-loaded React component rendered conditionally. Mock data modules seed UI when Supabase is unavailable; live modules fetch from /api/* on mount.",
  ),
  h2("2.3 Client Portal Pattern"),
  p(
    "External users authenticate via platform_users with user_type=external and a redirect_path (e.g. /client/venturi, /test1). Client dashboards use separate component trees under client-platform/ and dashboard/ with reduced navigation scope.",
  ),
  h2("2.4 Realtime & Maps"),
  p(
    "Messaging uses Supabase realtime via browser client (NEXT_PUBLIC_SUPABASE_*). Maps use Leaflet/react-leaflet with custom tile layers (OSM, satellite, urban). WebODM orthophoto/DSM tiles are proxied through Next.js API routes to avoid CORS and credential exposure.",
  ),
  new Paragraph({ children: [new PageBreak()] }),

  h1("3. Technology Stack & Folder Structure"),
  h2("3.1 Technology Stack"),
  table(
    ["Layer", "Technology", "Version / Notes"],
    [
      ["Framework", "Next.js (App Router, Turbopack)", "16.2.9"],
      ["UI", "React", "19.2.4"],
      ["Language", "TypeScript", "5.x"],
      ["Styling", "Tailwind CSS", "v4"],
      ["Database", "Supabase (PostgreSQL)", "@supabase/supabase-js 2.x"],
      ["Storage", "Supabase Storage", "Bucket: internal-files"],
      ["Maps", "Leaflet, react-leaflet, geotiff", "Orthophoto/DSM/terrain"],
      ["Charts", "Recharts", "Dashboard KPIs"],
      ["Whiteboard", "Excalidraw", "@excalidraw/excalidraw"],
      ["Email", "imapflow, mailparser, nodemailer", "Zoho EU hosts"],
      ["Auth", "Custom HMAC cookie sessions", "Not Supabase Auth"],
      ["Mobile", "Capacitor Android shell", "mobile/"],
      ["Hosting", "Vercel", "Serverless Node 24.x"],
      ["CI", "GitHub Actions", "Android APK workflow"],
    ],
  ),
  h2("3.2 Top-Level Repository Layout"),
  bullet("src/app/ — Next.js routes (pages + API)"),
  bullet("src/components/ — React UI (testflighthub/, dashboard/, auth/, layout/, ui/)"),
  bullet("src/lib/ — Business logic, mock data, integrations (~98 modules)"),
  bullet("src/hooks/ — React hooks (e.g. email WhatsApp poller)"),
  bullet("supabase/migrations/ — 38 numbered SQL migrations"),
  bullet("scripts/ — DB setup, seeding, WhatsApp/Zoho provisioning"),
  bullet("mobile/ — Capacitor Android wrapper"),
  bullet("docs/ — Generated documentation and screenshots"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("4. Database Schema & Entity Relationships"),
  h2("4.1 Core Entity Groups"),
  table(
    ["Domain", "Tables", "Purpose"],
    [
      ["Auth", "platform_users", "Login accounts (internal + external)"],
      ["Staff", "internal_operators", "Operator roster synced with platform users"],
      ["Clients", "internal_clients", "Client directory; links to file folders"],
      ["CRM", "crm_leads, crm_connections", "Sales pipeline + global contacts map"],
      ["Projects", "internal_projects", "Operations projects"],
      ["Files", "file_categories, file_folders, file_objects", "Hierarchical file repository + storage"],
      ["Messaging", "internal_messages, internal_message_channels, internal_scheduled_calls, internal_message_read_state", "Chat + video calls"],
      ["Calendar", "internal_calendar_events", "Scheduling"],
      ["Email (DB)", "internal_info_email_threads/messages, email_mailbox_credentials", "Thread store + live mailbox creds"],
      ["Finance", "financial_expenses", "Expense submissions"],
      ["HR", "hr_employees", "Employee records"],
      ["Strategy", "strategy_items, competitors", "Capability matrix + competitor intel"],
      ["Whiteboard", "internal_whiteboard, whiteboard_projects", "Excalidraw scenes"],
      ["Support", "support_tickets, whatsapp_support_sessions, whatsapp_inbound_log", "Ticketing + WhatsApp intake"],
      ["Notifications", "email_whatsapp_settings, email_whatsapp_notification_log", "Email→WhatsApp alerts"],
      ["Telemetry", "telemetry", "Flight simulator sandbox data"],
    ],
  ),
  h2("4.2 Key Relationships"),
  p("file_folders.parent_id → file_folders (self-referential tree)"),
  p("file_objects.folder_id → file_folders; file_objects.category_id → file_categories"),
  p("internal_info_email_messages.thread_id → internal_info_email_threads (CASCADE delete)"),
  p("whatsapp_support_sessions.ticket_id → support_tickets (CASCADE delete)"),
  p("internal_clients.files_folder_id → file_folders (soft link, migration 038)"),
  p("Creating internal_operators also upserts platform_users with user_type=internal"),
  h2("4.3 Row-Level Security"),
  p(
    "Nearly all tables use permissive RLS policies (USING true). Migration comments explicitly note this is intentional for internal tooling and should be tightened when production auth is enforced. telemetry table has no RLS.",
  ),
  new Paragraph({ children: [new PageBreak()] }),

  h1("5. Modules & Purpose"),
  p("Internal dashboard modules (Business Central through Tools):"),
  table(
    ["Module", "View key", "Data source", "Purpose"],
    [
      ["Home Dashboard", "home", "Mock command data", "KPIs, action items, week schedule"],
      ["Client Directory", "clients", "Supabase + mock fallback", "Manage client accounts"],
      ["CRM", "crm", "Supabase crm_leads", "Sales pipeline"],
      ["Connections", "connections", "Supabase crm_connections", "Global contacts map"],
      ["Representatives", "representatives", "Mock/local state", "Distributor/agent registry"],
      ["Office Locations", "office-locations", "office-locations-data.ts", "Barcelona, Porto, Oxford sites"],
      ["Projects", "projects", "Supabase + dashboard strip", "Project tracking with KPIs"],
      ["Recent Missions", "recent-missions", "Mock", "Mission history panel"],
      ["Financials", "financials", "Mock ledger", "P&L overview"],
      ["Debtors / Creditors", "debtors, creditors", "Mock", "AR/AP ledgers"],
      ["Expenses", "expenses", "Supabase financial_expenses", "Expense submissions"],
      ["HR", "hr", "Supabase hr_employees", "Employee management"],
      ["Assets / Fleet", "assets, fleet", "Mock registry", "Inventory & drone fleet"],
      ["File Explorer", "files-*", "Supabase files + storage", "Internal/external/client files"],
      ["Calendar", "calendar", "Supabase events", "Scheduling lenses (internal/client/training)"],
      ["Logistics", "logistics", "Mock shipments + Leaflet map", "Inbound/outbound package tracking"],
      ["Email", "info-email", "Zoho IMAP + Supabase threads", "Live mailbox workspace"],
      ["Messaging", "messaging", "Supabase realtime", "Internal + client chat, video calls"],
      ["Social", "social", "Placeholder", "Social media planning"],
      ["Support", "support", "Supabase tickets", "Help desk + WhatsApp flow"],
      ["Strategy", "strategy", "Supabase strategy_items", "Capability matrix"],
      ["Competitors", "competitors", "Supabase competitors", "Regional competitor intel"],
      ["Whiteboard", "whiteboard", "Supabase + Excalidraw", "Collaborative diagrams"],
      ["Sector", "sector", "Mock profiles", "Mining/industry sector intelligence"],
      ["Training", "training", "bcd-training-data.ts", "BCD training programmes"],
      ["Testing / Telemetry", "testing, telemetry", "Simulator + telemetry table", "Flight sandbox"],
      ["WebODM", "webodm", "WebODM API", "Orthophoto/DSM/3D deliverables"],
      ["Users", "users, users-external", "Supabase operators + platform_users", "Account administration"],
      ["Settings", "settings", "Local", "Workspace configuration"],
    ],
  ),
  new Paragraph({ children: [new PageBreak()] }),

  h1("6. Pages, Routes & Screens"),
  h2("6.1 Public & Marketing"),
  table(
    ["URL", "Purpose"],
    [
      ["/", "Operations login portal"],
      ["/clientlogin", "Client portal login"],
      ["/about, /contact, /inspection, /surveying", "Marketing service pages"],
      ["/commercial-imaging, /industries", "Service/industry pages"],
      ["/app-download", "Android app download info"],
    ],
  ),
  h2("6.2 Internal Operations"),
  table(
    ["URL", "Purpose"],
    [
      ["/internaldashboard", "Main ops hub (37 views via ?view=)"],
      ["/crm, /financials, /messaging, etc.", "Redirects to internaldashboard?view=*"],
      ["/testflighthub", "Permanent redirect to /internaldashboard"],
    ],
  ),
  h2("6.3 Client Portals"),
  table(
    ["URL", "Purpose"],
    [
      ["/client/venturi", "Venturi Aeronautical client dashboard"],
      ["/client/venturi/projects", "Venturi projects"],
      ["/client/venturi/messages", "Venturi messaging"],
      ["/test1", "Westport external client dashboard"],
    ],
  ),
  h2("6.4 Screenshots (Production, 1440×900)"),
  ...screenshot("internal-home", "Figure 1 — Internal Operations home dashboard"),
  ...screenshot("internal-clients", "Figure 2 — Client Directory workspace"),
  ...screenshot("internal-crm", "Figure 3 — CRM leads pipeline"),
  ...screenshot("internal-logistics", "Figure 4 — Logistics with Barcelona→London route map"),
  ...screenshot("internal-office-locations", "Figure 5 — Office Locations (Barcelona, Porto, Oxford)"),
  ...screenshot("internal-file-explorer", "Figure 6 — File Explorer (internal files)"),
  ...screenshot("operations-login", "Figure 7 — Operations login portal (/)"),
  ...screenshot("client-login", "Figure 8 — Client portal login (/clientlogin)"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("7. User Workflows & Business Processes"),
  h2("7.1 Internal Operator Daily Workflow"),
  bullet("Sign in at / with platform credentials → redirect to /internaldashboard"),
  bullet("Review Home Dashboard action items and week schedule"),
  bullet("Manage clients, projects, and CRM leads in Business Central"),
  bullet("Use File Explorer for document delivery; Calendar for scheduling"),
  bullet("Monitor Email inbox; Messaging for team/client communication"),
  bullet("Log expenses, review financials; HR for staff records"),
  h2("7.2 Sales & CRM Workflow"),
  bullet("Create CRM lead → track status and next action → convert to client record"),
  bullet("Map global connections on Connections workspace with geographic filters"),
  bullet("Link client to projects and dedicated file folder (files_folder_id)"),
  h2("7.3 Support Workflow"),
  bullet("Client messages WhatsApp bot → /api/whatsapp/inbound webhook"),
  bullet("Multi-step intake creates support_ticket + whatsapp_support_session"),
  bullet("Operator assigns ticket in Support workspace or /whatsapp/support-flow"),
  bullet("Optional email alerts: new info@ messages → WhatsApp via cron poller"),
  h2("7.4 Deliverables Workflow"),
  bullet("Process imagery in WebODM → view orthophoto/DSM/3D in WebODM workspace"),
  bullet("Store deliverables in File Explorer; share via client portal or external files"),
  h2("7.5 Demo / Public Access Workflow"),
  bullet("Prospect opens /internaldashboard directly — no login required (Vercel SSO disabled)"),
  bullet("Full UI with mock data fallbacks when APIs unavailable"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("8. API Endpoints & External Integrations"),
  h2("8.1 API Summary (69 routes)"),
  p("Domains: auth, users, external-users, clients, crm (leads + connections), financials/expenses, hr/employees, projects, strategy, competitors, whiteboard, files (browse/upload), messaging, calendar, info-email, email (Zoho live), support/tickets, whatsapp, webodm proxy, telemetry, weather, internal setup."),
  h2("8.2 External Integrations"),
  table(
    ["Integration", "Protocol", "Purpose"],
    [
      ["Supabase", "Postgres REST + Realtime + Storage", "Primary database and file storage"],
      ["Zoho Mail", "IMAP/SMTP (EU)", "Live email in Email workspace"],
      ["WebODM", "REST + proxied tiles", "Photogrammetry deliverables"],
      ["CallMeBot / TextMeBot", "HTTP APIs", "WhatsApp outbound + inbound webhook"],
      ["OpenWeather (via /api/weather)", "HTTP", "Weather panels for ops maps"],
      ["Vercel", "Serverless hosting", "Production deployment"],
      ["ArcGIS / OSM tiles", "HTTP tile layers", "Map backgrounds"],
    ],
  ),
  h2("8.3 Authentication on APIs"),
  p(
    "Most API routes require only Supabase configuration — no session cookie. Exceptions: POST /api/whiteboard/projects (session required), setup routes (INTERNAL_FILES_SETUP_SECRET), WhatsApp inbound (WHATSAPP_WEBHOOK_SECRET), email notification cron (CRON_SECRET).",
  ),
  new Paragraph({ children: [new PageBreak()] }),

  h1("9. User Roles, Permissions & Security Model"),
  h2("9.1 Platform User Types"),
  table(
    ["Type", "Storage", "Redirect", "Example"],
    [
      ["internal", "platform_users + internal_operators", "/internaldashboard", "paul.fotheringham, bcndrone"],
      ["external", "platform_users only", "/test1, /client/venturi", "westport, venturia"],
    ],
  ),
  h2("9.2 Operator Roles (internal_operators.role)"),
  p("Staff, Manager, Admin — used for roster classification; not enforced as API permissions today."),
  h2("9.3 Session Mechanism"),
  p(
    "Cookie dc_platform_session: HMAC-SHA256 signed JSON payload (7-day expiry). Passwords: scrypt with per-user salt. AUTH_SECRET env var (fallback: SUPABASE_ANON_KEY).",
  ),
  h2("9.4 Security Posture & Gaps"),
  bullet("CRITICAL: No Next.js middleware; /internaldashboard is publicly accessible by design for demos."),
  bullet("CRITICAL: ~67/69 API routes lack session enforcement — direct API access possible."),
  bullet("CRITICAL: Permissive Supabase RLS on all business tables."),
  bullet("HIGH: Email mailbox passwords stored in email_mailbox_credentials table."),
  bullet("MEDIUM: Login form can persist credentials in localStorage."),
  bullet("LOW: Vercel SSO protection was disabled to allow public demo access."),
  new Paragraph({ children: [new PageBreak()] }),

  h1("10. Reusable Components & Shared Services"),
  h2("10.1 Shell & Navigation"),
  bullet("SurveyOperationsShell — responsive header, mobile drawer, safe-area support"),
  bullet("SurveyOperationsSidebar — sectioned nav from internalSurveyNavSections"),
  bullet("ResponsiveMasterDetail — mobile-friendly list/detail pattern"),
  h2("10.2 Maps"),
  bullet("MapTileLayers, ConnectionsMap, LogisticsRouteMap, SectorSitesMap, FlightPathMap"),
  h2("10.3 Services (src/lib/)"),
  bullet("platform-auth.ts, platform-session.ts — authentication"),
  bullet("internal-*-service.ts — Supabase CRUD per domain"),
  bullet("email/* — Zoho integration pipeline"),
  bullet("whatsapp/*, support-* — support intake"),
  bullet("webodm-* — photogrammetry client"),
  bullet("*-data.ts — mock seeds and UI configuration"),
  h2("10.4 UI Primitives"),
  bullet("src/components/ui/ — Button, Card, Badge, ContactForm, ServiceCard (shadcn-style)"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("11. Multi-Tenant Cloning & Configuration"),
  p("The platform is designed to be cloned and configured for new businesses, industries, and geographies:"),
  h3("11.1 Branding & Site Config"),
  bullet("src/lib/site.ts — URL, contact, nav, SEO keywords"),
  bullet("src/lib/content.ts — marketing copy, services, industries"),
  bullet("src/lib/metadata.ts, structured-data.ts — SEO/JSON-LD"),
  bullet("Logo component, globals.css theme tokens"),
  h3("11.2 Operational Data Seeds"),
  bullet("office-locations-data.ts — add/remove office sites"),
  bullet("representatives-data.ts, logistics-data.ts — industry-specific mock/live data"),
  bullet("sector-profiles-data.ts, competitors seeds — regional competitor packs (UK, Spain, Portugal, Africa)"),
  bullet("bcd-training-data.ts — training course catalog"),
  h3("11.3 Per-Tenant Supabase"),
  bullet("Run scripts/provision-bcd-supabase.mjs to create new Supabase project + apply all migrations"),
  bullet("Seed platform_users for login accounts with custom redirect_path"),
  bullet("Configure Zoho mailboxes in email/accounts.ts + Vercel env vars"),
  h3("11.4 Client Portals"),
  bullet("Add external platform_user → build client dashboard under src/app/client/{slug}/"),
  bullet("Configure client-messaging-config.ts for dedicated chat rooms"),
  h3("11.5 Module Toggles"),
  bullet("internal-operations-data.ts — add/remove nav items and views without new routes"),
  bullet("Mock vs live: workspaces gracefully fall back to local mock data when API unavailable"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("12. Deployment Architecture & Environment"),
  h2("12.1 Production Topology"),
  p("GitHub (main) → Vercel build (Next.js Turbopack) → Serverless functions at barcelonadronecenter.vercel.app → Supabase cloud (Postgres + Storage) + external APIs."),
  h2("12.2 Key Environment Variables"),
  table(
    ["Variable", "Required for"],
    [
      ["SUPABASE_URL, SUPABASE_ANON_KEY", "Server database"],
      ["NEXT_PUBLIC_SUPABASE_URL/ANON_KEY", "Browser realtime (messaging)"],
      ["SUPABASE_DB_URL", "Migrations, direct SQL scripts"],
      ["AUTH_SECRET", "Session signing (recommended)"],
      ["ZOHO_*_EMAIL/PASSWORD", "Live email workspaces"],
      ["WEBODM_URL, WEBODM_USERNAME/PASSWORD", "WebODM integration"],
      ["CALLMEBOT_API_KEY, TEXTMEBOT_API_KEY", "WhatsApp messaging"],
      ["WHATSAPP_WEBHOOK_SECRET, CRON_SECRET", "Webhook/cron auth"],
      ["INTERNAL_FILES_SETUP_SECRET", "One-time DB setup routes"],
    ],
  ),
  h2("12.3 Deployment Commands"),
  bullet("npm run build — production build"),
  bullet("Git push to Unit311central/unit311central main (CLI vercel --prod disabled)"),
  bullet("npm run db:* — various migration and seed scripts"),
  h2("12.4 Mobile"),
  p("Capacitor Android app in mobile/ loads https://barcelonadronecenter.vercel.app. GitHub Actions workflow builds APK artifacts."),
  new Paragraph({ children: [new PageBreak()] }),

  h1("13. Strengths, Technical Debt & Recommendations"),
  h2("13.1 Strengths"),
  bullet("Comprehensive modular ops UI in a single deployable unit — strong demo and SME value proposition"),
  bullet("Clear separation of *-data.ts (config/mock) vs *-service.ts (persistence)"),
  bullet("Rich integration surface: email, WhatsApp, WebODM, maps, whiteboard"),
  bullet("Responsive shell with mobile drawer, safe-area, and resize-aware maps"),
  bullet("38 migrations provide reproducible schema; runtime migration helpers reduce drift"),
  h2("13.2 Technical Debt"),
  bullet("No API-level authorization — security relies on obscurity and permissive RLS"),
  bullet("Mixed mock vs live data — inconsistent persistence across modules"),
  bullet("Branding drift — DroneCatalyst references remain in README and some metadata"),
  bullet("Legacy SurveyOperationsDashboard unused; duplicate redirect routes"),
  bullet("Credentials in DB and localStorage — not production-hardened"),
  bullet("No automated test suite beyond Playwright dev dependency"),
  h2("13.3 Scalability Considerations"),
  bullet("Vercel serverless suits current scale; heavy file uploads depend on Supabase Storage limits"),
  bullet("IMAP polling for email notifications is cron-based — may need queue at volume"),
  bullet("Single Supabase project — multi-tenant would need project-per-tenant or schema isolation"),
  h2("13.4 Recommendations"),
  bullet("P1: Implement API middleware with requirePlatformSession for mutating routes"),
  bullet("P1: Replace permissive RLS with role-based policies tied to platform_users"),
  bullet("P2: Introduce INTERNAL_DASHBOARD_PUBLIC env flag instead of hard public access"),
  bullet("P2: Consolidate branding to BCN/Unit311; remove DroneCatalyst references from BCN repo"),
  bullet("P3: Add E2E test suite for critical workflows (login, clients, files, support)"),
  bullet("P3: Extract tenant config into a single tenant.config.ts for white-label cloning"),
  new Paragraph({ children: [new PageBreak()] }),

  h1("Appendix A: Project Folder Structure"),
  p("Truncated listing (excluding node_modules, .next, .git). Full list in docs/folder-structure.txt."),
];

for (const line of folderLines.slice(0, 200)) {
  children.push(
    new Paragraph({
      children: [new TextRun({ text: line, font: "Consolas", size: 16 })],
      spacing: { after: 20 },
    }),
  );
}

if (folderLines.length > 200) {
  children.push(p(`… and ${folderLines.length - 200} additional paths. See docs/folder-structure.txt for the complete listing.`));
}

const doc = new Document({
  creator: "BCN Drone Center Platform Documentation Generator",
  title: "Unit311 Platform Technical Documentation",
  description: "Comprehensive technical and business documentation for the BCN/Unit311 platform",
  sections: [
    {
      properties: {},
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "BCN Drone Center / Unit311 — Confidential Technical Documentation",
                  size: 18,
                  color: "888888",
                }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUT, buffer);
console.log(`Documentation written to ${OUT}`);
