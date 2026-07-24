/**
 * Editable architecture diagram schema (React Flow JSON).
 * Stored in system_architecture_diagrams.diagram_json — never hardcoded as React trees.
 *
 * Extensibility notes:
 * - customType / icon / badge / href / status support richer nodes without schema migrations
 * - meta is a free-form bag for future AI generation tooling
 * - nested groups use parentId + type:"group"
 */

export type ArchitectureNodeKind =
  | "frontend"
  | "service"
  | "database"
  | "integration"
  | "storage"
  | "group";

export type ArchitectureNodeStatus = "live" | "beta" | "planned" | "deprecated" | "unknown";

export type ArchitectureNodeBadge = {
  label: string;
  tone?: "sky" | "emerald" | "amber" | "rose" | "slate" | "violet";
};

export type ArchitectureNodeData = {
  label: string;
  description?: string;
  nodeKind: ArchitectureNodeKind;
  /** When set, clicking opens this Unit311 Details section (or "coming soon"). */
  docSectionSlug?: string | null;
  /** Optional deep-link / external URL. */
  href?: string | null;
  /** Lucide icon name (resolved in the viewer). */
  icon?: string | null;
  /** Custom node renderer key for future node packs. */
  customType?: string | null;
  status?: ArchitectureNodeStatus | null;
  badges?: ArchitectureNodeBadge[];
  collapsed?: boolean;
  /** Reserved for AI generators / tooling. */
  meta?: Record<string, unknown>;
};

export type ArchitectureDiagramNode = {
  id: string;
  type?: "architecture" | "group";
  position: { x: number; y: number };
  data: ArchitectureNodeData;
  parentId?: string;
  extent?: "parent";
  style?: Record<string, string | number>;
  width?: number;
  height?: number;
  hidden?: boolean;
};

export type ArchitectureDiagramEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  meta?: Record<string, unknown>;
};

export type ArchitectureDiagramDocument = {
  version: 1;
  viewport?: { x: number; y: number; zoom: number };
  nodes: ArchitectureDiagramNode[];
  edges: ArchitectureDiagramEdge[];
  /** Optional diagram-level metadata for AI / catalogues. */
  meta?: Record<string, unknown>;
};

export type SystemArchitectureDiagram = {
  id: string;
  sectionSlug: string;
  title: string;
  diagramJson: ArchitectureDiagramDocument;
  createdAt: string;
  updatedAt: string;
};

/** Catalogue entries shown in the Architecture Viewer navigation panel. */
export type ArchitectureCatalogEntry = {
  sectionSlug: string;
  title: string;
  description?: string;
  seedTemplate?:
    | "blank"
    | "storage"
    | "platform-overview"
    | "voice-and-video"
    | "software-asset-register"
    | "executive-ai";
};

/** Node colour tokens matching Unit311 dark UI. */
export const ARCHITECTURE_NODE_COLORS: Record<
  Exclude<ArchitectureNodeKind, "group">,
  { bg: string; border: string; text: string; label: string }
> = {
  frontend: {
    bg: "rgba(37, 99, 235, 0.22)",
    border: "rgba(96, 165, 250, 0.65)",
    text: "#dbeafe",
    label: "Frontend",
  },
  service: {
    bg: "rgba(16, 185, 129, 0.18)",
    border: "rgba(52, 211, 153, 0.65)",
    text: "#d1fae5",
    label: "Internal Services",
  },
  database: {
    bg: "rgba(139, 92, 246, 0.2)",
    border: "rgba(167, 139, 250, 0.65)",
    text: "#ede9fe",
    label: "Database",
  },
  integration: {
    bg: "rgba(249, 115, 22, 0.18)",
    border: "rgba(251, 146, 60, 0.7)",
    text: "#ffedd5",
    label: "External Integrations",
  },
  storage: {
    bg: "rgba(148, 163, 184, 0.16)",
    border: "rgba(203, 213, 225, 0.55)",
    text: "#e2e8f0",
    label: "Storage / Infrastructure",
  },
};

export const ARCHITECTURE_DIAGRAM_CATALOG: readonly ArchitectureCatalogEntry[] = [
  {
    sectionSlug: "platform-overview",
    title: "Platform Overview",
    description: "Master Unit311 platform blueprint",
    seedTemplate: "platform-overview",
  },
  {
    sectionSlug: "authentication",
    title: "Authentication",
    description: "Signup, session, and workspace login",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "storage",
    title: "Storage",
    description: "Uploads, internal-files, signed URLs",
    seedTemplate: "storage",
  },
  {
    sectionSlug: "crm",
    title: "CRM",
    description: "Lead conversion and client reports",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "finance",
    title: "Finance",
    description: "GL, AR, billing, and treasury",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "wise",
    title: "Wise",
    description: "Payment matching and activation",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "workspace-provisioning",
    title: "Workspace Provisioning",
    description: "Tenant host and module bootstrap",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "workspace-onboarding",
    title: "Workspace Onboarding",
    description: "Customer onboarding wizard",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "ai-agent",
    title: "Executive AI Platform",
    description: "Operating Assistant, Command Centre, Guided Learning, trust",
    seedTemplate: "executive-ai",
  },
  {
    sectionSlug: "website",
    title: "Website",
    description: "Public marketing and signup",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "zoho-email",
    title: "Email",
    description: "Mailbox and transactional mail",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "database",
    title: "Database",
    description: "Postgres relationships",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "integrations",
    title: "External Integrations",
    description: "Third-party systems",
    seedTemplate: "blank",
  },
  {
    sectionSlug: "voice-and-video",
    title: "Communications",
    description: "Executive Call WebRTC 1:1 streaming",
    seedTemplate: "voice-and-video",
  },
  {
    sectionSlug: "software-asset-register",
    title: "Software Asset Register",
    description: "Corporate software licences, spend, and credentials",
    seedTemplate: "software-asset-register",
  },
] as const;

/** @deprecated Prefer ARCHITECTURE_DIAGRAM_CATALOG */
export const PLANNED_ARCHITECTURE_DIAGRAMS = ARCHITECTURE_DIAGRAM_CATALOG;

export function createBlankArchitectureDiagram(title = "Untitled architecture"): ArchitectureDiagramDocument {
  return {
    version: 1,
    viewport: { x: 0, y: 0, zoom: 0.9 },
    meta: { generator: "blank", title },
    nodes: [
      {
        id: "start",
        type: "architecture",
        position: { x: 280, y: 80 },
        data: {
          label: "Start here",
          description: "Replace with your architecture nodes.",
          nodeKind: "service",
          icon: "network",
          status: "planned",
        },
      },
    ],
    edges: [],
  };
}

function node(
  id: string,
  label: string,
  kind: ArchitectureNodeKind,
  x: number,
  y: number,
  extra: Partial<ArchitectureNodeData> & { parentId?: string; style?: Record<string, string | number> } = {},
): ArchitectureDiagramNode {
  const { parentId, style, ...data } = extra;
  return {
    id,
    type: kind === "group" ? "group" : "architecture",
    position: { x, y },
    parentId,
    extent: parentId ? "parent" : undefined,
    style,
    data: {
      label,
      nodeKind: kind,
      ...data,
    },
  };
}

/**
 * Initial Storage Architecture diagram — mirrors current platform asset flow.
 * Seeded for section_slug = "storage".
 */
export function createStorageArchitectureDiagram(): ArchitectureDiagramDocument {
  return {
    version: 1,
    viewport: { x: 40, y: 20, zoom: 0.85 },
    meta: { generator: "storage-seed", title: "Storage Architecture" },
    nodes: [
      node("group-ingress", "Ingress", "group", 160, 40, {
        collapsed: false,
        style: { width: 420, height: 220 },
      }),
      node("user-upload", "User Upload", "frontend", 70, 50, {
        parentId: "group-ingress",
        description: "Browser / workspace / CRM upload surfaces",
        docSectionSlug: "website",
        icon: "upload",
        status: "live",
      }),
      node("upload-api", "Upload API", "service", 70, 130, {
        parentId: "group-ingress",
        description: "/api/files/upload · prepare / complete",
        docSectionSlug: "storage",
        icon: "server",
        status: "live",
      }),
      node("group-persist", "Persistence", "group", 160, 300, {
        collapsed: false,
        style: { width: 420, height: 240 },
      }),
      node("supabase-storage", "Supabase Storage", "storage", 70, 50, {
        parentId: "group-persist",
        description: "Bucket: internal-files",
        docSectionSlug: "supabase",
        icon: "hard-drive",
        status: "live",
      }),
      node("postgres-meta", "Postgres Metadata", "database", 70, 140, {
        parentId: "group-persist",
        description: "file_objects · file_folders",
        docSectionSlug: "supabase",
        icon: "database",
        status: "live",
      }),
      node("group-egress", "Delivery", "group", 160, 580, {
        collapsed: false,
        style: { width: 420, height: 240 },
      }),
      node("signed-url-api", "Signed URL API", "service", 70, 50, {
        parentId: "group-egress",
        description: "GET /api/files/objects/[id] · 1h signed URL",
        docSectionSlug: "storage",
        icon: "link",
        status: "live",
      }),
      node("consumers", "Workspace / CRM / Client Files", "frontend", 70, 140, {
        parentId: "group-egress",
        description: "File explorers · invoices · CRM logos",
        docSectionSlug: "storage",
        icon: "folder-open",
        status: "live",
      }),
    ],
    edges: [
      { id: "e-upload-api", source: "user-upload", target: "upload-api", animated: true },
      {
        id: "e-api-storage",
        source: "upload-api",
        target: "supabase-storage",
        label: "blob write",
        animated: true,
      },
      {
        id: "e-storage-meta",
        source: "supabase-storage",
        target: "postgres-meta",
        label: "metadata",
      },
      {
        id: "e-meta-signed",
        source: "postgres-meta",
        target: "signed-url-api",
        animated: true,
      },
      {
        id: "e-signed-consumers",
        source: "signed-url-api",
        target: "consumers",
        label: "download",
      },
    ],
  };
}

/**
 * Master Platform Overview — entire Unit311 technical blueprint.
 * Seeded for section_slug = "platform-overview".
 */
export function createPlatformOverviewDiagram(): ArchitectureDiagramDocument {
  const moduleY = 40;
  const moduleX0 = 980;
  const modules = [
    { id: "mod-crm", label: "CRM", slug: "crm", icon: "users" },
    { id: "mod-projects", label: "Projects", slug: null, icon: "kanban" },
    { id: "mod-financials", label: "Financials", slug: "finance", icon: "wallet" },
    { id: "mod-hr", label: "HR", slug: null, icon: "badge" },
    { id: "mod-assets", label: "Assets", slug: "storage", icon: "boxes" },
    { id: "mod-messaging", label: "Communications", slug: null, icon: "message-square" },
    { id: "mod-ea", label: "Executive Assistant", slug: null, icon: "sparkles" },
    { id: "mod-files", label: "File Repository", slug: "storage", icon: "folder-open" },
  ] as const;

  const platformNodes: ArchitectureDiagramNode[] = [
    node("group-journey", "Customer journey", "group", 120, 40, {
      collapsed: false,
      style: { width: 360, height: 720 },
    }),
    node("public-website", "Public Website", "frontend", 60, 50, {
      parentId: "group-journey",
      docSectionSlug: "website",
      icon: "globe",
      status: "live",
      description: "Marketing site · unit311central.com",
    }),
    node("signup", "Signup", "frontend", 60, 130, {
      parentId: "group-journey",
      docSectionSlug: "authentication",
      icon: "user-plus",
      status: "live",
      description: "Account creation + email verify",
    }),
    node("stripe-payment", "Stripe Payment", "integration", 60, 210, {
      parentId: "group-journey",
      docSectionSlug: "finance",
      icon: "credit-card",
      status: "planned",
      description: "Card checkout path",
      badges: [{ label: "Planned", tone: "amber" }],
    }),
    node("wise-matching", "Wise Payment Matching", "integration", 60, 290, {
      parentId: "group-journey",
      docSectionSlug: "wise",
      icon: "banknote",
      status: "live",
      description: "Bank transfer reconciliation",
    }),
    node("activation", "Customer Activation Service", "service", 60, 370, {
      parentId: "group-journey",
      docSectionSlug: "wise",
      icon: "zap",
      status: "live",
      description: "Activate client + workspace",
    }),
    node("provisioning", "Workspace Provisioning", "service", 60, 450, {
      parentId: "group-journey",
      docSectionSlug: "workspace-provisioning",
      icon: "building-2",
      status: "live",
      description: "Tenant host + module seed",
    }),
    node("onboarding-wizard", "Workspace Onboarding Wizard", "frontend", 60, 530, {
      parentId: "group-journey",
      docSectionSlug: "workspace-onboarding",
      icon: "list-checks",
      status: "live",
      description: "Modules · branding · invites",
    }),
    node("customer-workspace", "Customer Workspace", "frontend", 60, 610, {
      parentId: "group-journey",
      docSectionSlug: "platform-overview",
      icon: "layout-dashboard",
      status: "live",
      description: "{slug}.unit311central.com",
      badges: [{ label: "Tenant", tone: "sky" }],
    }),

    node("group-modules", "Workspace modules", "group", moduleX0 - 40, moduleY, {
      collapsed: false,
      style: { width: 320, height: 720 },
    }),
    ...modules.map((mod, index) =>
      node(mod.id, mod.label, "frontend", 50, 50 + index * 80, {
        parentId: "group-modules",
        docSectionSlug: mod.slug,
        icon: mod.icon,
        status: mod.slug ? "live" : "planned",
        badges: mod.slug ? undefined : [{ label: "Docs soon", tone: "slate" }],
      }),
    ),

    node("group-platform", "Platform services", "group", 540, 40, {
      collapsed: false,
      style: { width: 340, height: 560 },
    }),
    node("internal-ops", "Internal Operations", "service", 50, 50, {
      parentId: "group-platform",
      docSectionSlug: "platform-overview",
      icon: "shield",
      status: "live",
      description: "internal.unit311central.com",
    }),
    node("ai-agent", "Executive AI Platform", "service", 50, 130, {
      parentId: "group-platform",
      docSectionSlug: "ai-agent",
      icon: "bot",
      status: "live",
      description: "Command Centre + Operating Assistant",
      badges: [{ label: "Live", tone: "emerald" }],
    }),
    node("authentication", "Authentication", "service", 50, 210, {
      parentId: "group-platform",
      docSectionSlug: "authentication",
      icon: "key-round",
      status: "live",
    }),
    node("supabase", "Supabase", "database", 50, 290, {
      parentId: "group-platform",
      docSectionSlug: "supabase",
      icon: "database",
      status: "live",
      description: "Postgres + Auth helpers",
    }),
    node("storage", "Storage", "storage", 50, 370, {
      parentId: "group-platform",
      docSectionSlug: "storage",
      icon: "hard-drive",
      status: "live",
      description: "internal-files bucket",
    }),
    node("email-services", "Email Services", "integration", 50, 450, {
      parentId: "group-platform",
      docSectionSlug: "zoho-email",
      icon: "mail",
      status: "live",
      description: "Zoho SMTP / IMAP",
    }),
  ];

  const journeyEdge = (from: string, to: string, id: string): ArchitectureDiagramEdge => ({
    id,
    source: from,
    target: to,
    animated: true,
  });

  const edges: ArchitectureDiagramEdge[] = [
    journeyEdge("public-website", "signup", "e-web-signup"),
    journeyEdge("signup", "stripe-payment", "e-signup-stripe"),
    journeyEdge("signup", "wise-matching", "e-signup-wise"),
    journeyEdge("stripe-payment", "activation", "e-stripe-act"),
    journeyEdge("wise-matching", "activation", "e-wise-act"),
    journeyEdge("activation", "provisioning", "e-act-prov"),
    journeyEdge("provisioning", "onboarding-wizard", "e-prov-onb"),
    journeyEdge("onboarding-wizard", "customer-workspace", "e-onb-ws"),
    ...modules.map((mod) => ({
      id: `e-ws-${mod.id}`,
      source: "customer-workspace",
      target: mod.id,
      label: "module",
    })),
    {
      id: "e-ws-internal",
      source: "customer-workspace",
      target: "internal-ops",
      label: "ops",
    },
    {
      id: "e-auth-ws",
      source: "authentication",
      target: "customer-workspace",
      animated: true,
    },
    {
      id: "e-auth-signup",
      source: "authentication",
      target: "signup",
    },
    {
      id: "e-supabase-all",
      source: "supabase",
      target: "activation",
      label: "data",
    },
    {
      id: "e-storage-files",
      source: "storage",
      target: "mod-files",
    },
    {
      id: "e-email-signup",
      source: "email-services",
      target: "signup",
      label: "verify",
    },
    {
      id: "e-ai-internal",
      source: "ai-agent",
      target: "internal-ops",
      label: "assist",
    },
  ];

  return {
    version: 1,
    viewport: { x: 0, y: 0, zoom: 0.72 },
    meta: {
      generator: "platform-overview-seed",
      title: "Platform Overview",
      role: "master-blueprint",
    },
    nodes: platformNodes,
    edges,
  };
}

/**
 * Executive Call voice/video architecture — 1:1 WebRTC with polled signaling.
 * Seeded for section_slug = "voice-and-video".
 */
export function createVoiceAndVideoArchitectureDiagram(): ArchitectureDiagramDocument {
  return {
    version: 1,
    viewport: { x: 20, y: 10, zoom: 0.88 },
    meta: {
      generator: "voice-and-video-seed",
      title: "Communications Architecture",
      sourceDocument: "docs/VOICE_AND_VIDEO_ARCHITECTURE.md",
    },
    nodes: [
      node("group-clients", "Call clients", "group", 40, 40, {
        collapsed: false,
        style: { width: 520, height: 200 },
      }),
      node("host-ui", "Host browser", "frontend", 40, 50, {
        parentId: "group-clients",
        description: "ExecutiveCallRoom · Unit311 operator",
        docSectionSlug: "voice-and-video",
        icon: "video",
        status: "live",
      }),
      node("guest-ui", "Guest browser", "frontend", 280, 50, {
        parentId: "group-clients",
        description: "/executivecall/[slug] · booked client",
        docSectionSlug: "voice-and-video",
        icon: "video",
        status: "live",
      }),
      node("group-control", "Meeting control", "group", 40, 280, {
        collapsed: false,
        style: { width: 520, height: 220 },
      }),
      node("meeting-api", "Meeting API", "service", 40, 50, {
        parentId: "group-control",
        description: "/api/executivecall/[slug] · admit / join / leave",
        docSectionSlug: "voice-and-video",
        icon: "server",
        status: "live",
      }),
      node("signaling-api", "WebRTC signaling API", "service", 280, 50, {
        parentId: "group-control",
        description: "/api/executivecall/[slug]/webrtc · SDP / ICE poll",
        docSectionSlug: "voice-and-video",
        icon: "network",
        status: "live",
      }),
      node("group-data", "Persistence", "group", 40, 540, {
        collapsed: false,
        style: { width: 520, height: 220 },
      }),
      node("bookings-db", "founder_session_bookings", "database", 40, 50, {
        parentId: "group-data",
        description: "Presence · admit gate · transcript draft",
        docSectionSlug: "supabase",
        icon: "database",
        status: "live",
      }),
      node("signals-db", "executive_call_webrtc_signals", "database", 280, 50, {
        parentId: "group-data",
        description: "offer · answer · ice-candidate · ready · hangup",
        docSectionSlug: "voice-and-video",
        icon: "database",
        status: "live",
      }),
      node("media-path", "WebRTC media (P2P RTP)", "integration", 620, 160, {
        description: "STUN · direct audio/video · no SFU today",
        docSectionSlug: "voice-and-video",
        icon: "radio",
        status: "live",
      }),
    ],
    edges: [
      { id: "e-host-meeting", source: "host-ui", target: "meeting-api", animated: true },
      { id: "e-guest-meeting", source: "guest-ui", target: "meeting-api", animated: true },
      { id: "e-host-signal", source: "host-ui", target: "signaling-api", animated: true },
      { id: "e-guest-signal", source: "guest-ui", target: "signaling-api", animated: true },
      { id: "e-meeting-bookings", source: "meeting-api", target: "bookings-db", label: "state" },
      { id: "e-signal-db", source: "signaling-api", target: "signals-db", label: "SDP/ICE" },
      {
        id: "e-media",
        source: "host-ui",
        target: "guest-ui",
        label: "RTP",
        animated: true,
      },
      {
        id: "e-stun",
        source: "media-path",
        target: "host-ui",
        label: "ICE",
      },
    ],
  };
}

/**
 * Software Asset Register architecture — Corporate Information module.
 * Seeded for section_slug = "software-asset-register".
 */
export function createSoftwareAssetRegisterArchitectureDiagram(): ArchitectureDiagramDocument {
  return {
    version: 1,
    viewport: { x: 10, y: 0, zoom: 0.86 },
    meta: {
      generator: "software-asset-register-seed",
      title: "Software Asset Register Architecture",
    },
    nodes: [
      node("group-ui", "Internal UI", "group", 40, 40, {
        collapsed: false,
        style: { width: 280, height: 200 },
      }),
      node("sar-workspace", "Software Asset Register", "frontend", 40, 50, {
        parentId: "group-ui",
        description: "Technology Management · Software",
        docSectionSlug: "software-asset-register",
        href: "/?view=technology-software",
        icon: "layout-grid",
        status: "live",
      }),
      node("details-hub", "Unit311 Details", "frontend", 40, 130, {
        parentId: "group-ui",
        description: "Living architecture diagram entry",
        docSectionSlug: "architecture-diagrams",
        icon: "network",
        status: "live",
      }),
      node("group-api", "APIs", "group", 360, 40, {
        collapsed: false,
        style: { width: 320, height: 260 },
      }),
      node("assets-api", "/api/software-assets", "service", 40, 50, {
        parentId: "group-api",
        description: "List · create · summary tiles",
        docSectionSlug: "software-asset-register",
        icon: "server",
        status: "live",
      }),
      node("asset-api", "/api/software-assets/[id]", "service", 40, 130, {
        parentId: "group-api",
        description: "Get · patch · delete · reveal password · files",
        docSectionSlug: "software-asset-register",
        icon: "server",
        status: "live",
      }),
      node("secure-creds", "secure-credentials", "service", 40, 200, {
        parentId: "group-api",
        description: "AES-256-GCM encrypt / decrypt",
        docSectionSlug: "software-asset-register",
        icon: "shield",
        status: "live",
      }),
      node("group-data", "Supabase", "group", 720, 40, {
        collapsed: false,
        style: { width: 340, height: 320 },
      }),
      node("tbl-assets", "software_assets", "database", 40, 45, {
        parentId: "group-data",
        description: "Product · licences · financials · ownership",
        docSectionSlug: "software-asset-register",
        icon: "database",
        status: "live",
      }),
      node("tbl-creds", "software_asset_credentials", "database", 40, 125, {
        parentId: "group-data",
        description: "Ciphertext · nonce · tag (no plaintext)",
        docSectionSlug: "software-asset-register",
        icon: "database",
        status: "live",
      }),
      node("tbl-files", "software_asset_files", "database", 40, 205, {
        parentId: "group-data",
        description: "Contracts · invoices · guides",
        docSectionSlug: "storage",
        icon: "database",
        status: "live",
      }),
      node("tbl-audit", "software_asset_audit_events", "database", 40, 275, {
        parentId: "group-data",
        description: "Create / update / delete history stub",
        docSectionSlug: "software-asset-register",
        icon: "database",
        status: "live",
      }),
      node("fin-future", "Financials (future)", "integration", 360, 340, {
        description: "AP renewals · expense link · account 5010",
        docSectionSlug: "finance",
        icon: "wallet",
        status: "planned",
      }),
    ],
    edges: [
      { id: "e-ui-list", source: "sar-workspace", target: "assets-api", animated: true },
      { id: "e-ui-detail", source: "sar-workspace", target: "asset-api", animated: true },
      { id: "e-details-diagram", source: "details-hub", target: "sar-workspace", label: "open" },
      { id: "e-api-assets", source: "assets-api", target: "tbl-assets", label: "CRUD" },
      { id: "e-api-creds", source: "asset-api", target: "secure-creds", label: "password" },
      { id: "e-creds-db", source: "secure-creds", target: "tbl-creds", label: "at rest" },
      { id: "e-api-files", source: "asset-api", target: "tbl-files" },
      { id: "e-api-audit", source: "asset-api", target: "tbl-audit" },
      {
        id: "e-fin",
        source: "tbl-assets",
        target: "fin-future",
        label: "linked_expense_id",
      },
    ],
  };
}

function createExecutiveAiArchitectureDiagram(): ArchitectureDiagramDocument {
  return {
    version: 1,
    viewport: { x: 40, y: 20, zoom: 0.85 },
    meta: {
      title: "Executive AI Platform",
      sourceDocument: "docs/EXECUTIVE_AI_PLATFORM.md",
      updated: "2026-07-21",
    },
    nodes: [
      node("group-ui", "Operator surfaces", "group", 40, 40, {
        style: { width: 360, height: 360 },
      }),
      node("command-centre", "Executive Command Centre", "frontend", 40, 50, {
        parentId: "group-ui",
        docSectionSlug: "ai-agent",
        icon: "layout-dashboard",
        description: "Brief · Health · Risks · Finance pulse",
        status: "live",
      }),
      node("floating-assistant", "Floating Operating Assistant", "frontend", 40, 130, {
        parentId: "group-ui",
        docSectionSlug: "ai-agent",
        icon: "sparkles",
        description: "Single launcher · SSE chat",
        status: "live",
      }),
      node("guided-learning", "Guided Learning", "frontend", 40, 210, {
        parentId: "group-ui",
        docSectionSlug: "ai-agent",
        icon: "compass",
        description: "Overlays · page registry · workflows",
        status: "live",
      }),
      node("proactive-layer", "Proactive Layer", "frontend", 40, 290, {
        parentId: "group-ui",
        docSectionSlug: "ai-agent",
        icon: "bell",
        description: "Brief cards · notifications · release tour",
        status: "live",
      }),

      node("group-api", "API & runtime", "group", 460, 40, {
        style: { width: 380, height: 360 },
      }),
      node("chat-api", "/api/executive-assistant/chat", "service", 40, 50, {
        parentId: "group-api",
        icon: "message-square",
        description: "Operating SSE · legacy {messages} compat",
        status: "live",
      }),
      node("proactive-api", "/api/executive-assistant/proactive", "service", 40, 130, {
        parentId: "group-api",
        icon: "activity",
        status: "live",
      }),
      node("conversations-api", "/api/executive-assistant/conversations", "service", 40, 210, {
        parentId: "group-api",
        icon: "messages-square",
        status: "live",
      }),
      node("feedback-api", "/api/executive-assistant/feedback", "service", 40, 290, {
        parentId: "group-api",
        icon: "thumbs-up",
        description: "Anonymous trust signals",
        status: "live",
      }),

      node("group-ai", "AI services", "group", 900, 40, {
        style: { width: 340, height: 280 },
      }),
      node("runtime", "assistant-runtime", "service", 40, 50, {
        parentId: "group-ai",
        icon: "cpu",
        description: "Tools · streaming · persistence",
        status: "live",
      }),
      node("openai", "OpenAI Responses API", "integration", 40, 130, {
        parentId: "group-ai",
        icon: "bot",
        description: "OPENAI_API_KEY",
        status: "live",
      }),
      node("enterprise-ui", "Enterprise UI tokens", "service", 40, 210, {
        parentId: "group-ai",
        icon: "palette",
        docSectionSlug: "ai-agent",
        status: "live",
      }),

      node("group-data", "Data & trust store", "group", 460, 460, {
        style: { width: 560, height: 280 },
      }),
      node("domain-data", "Live domain tables", "database", 40, 50, {
        parentId: "group-data",
        icon: "database",
        description: "projects · clients · CRM · HR · invoices",
        status: "live",
      }),
      node("ea-conversations", "executive_assistant_conversations", "database", 40, 130, {
        parentId: "group-data",
        icon: "database",
        description: "Migration 101 · RLS · service-role writes",
        status: "live",
      }),
      node("ea-trust", "feedback + quality_events", "database", 40, 210, {
        parentId: "group-data",
        icon: "shield",
        description: "Migration 102 · RLS · service-role writes",
        status: "live",
      }),
    ],
    edges: [
      { id: "e-cc-proactive", source: "command-centre", target: "proactive-api", animated: true },
      { id: "e-float-chat", source: "floating-assistant", target: "chat-api", animated: true },
      { id: "e-guided-runtime", source: "guided-learning", target: "runtime", label: "tools" },
      { id: "e-proactive-api", source: "proactive-layer", target: "proactive-api", animated: true },
      { id: "e-chat-runtime", source: "chat-api", target: "runtime", animated: true },
      {
        id: "e-conv-store",
        source: "conversations-api",
        target: "ea-conversations",
        label: "service role",
      },
      { id: "e-fb-store", source: "feedback-api", target: "ea-trust", label: "service role" },
      { id: "e-runtime-openai", source: "runtime", target: "openai", animated: true },
      { id: "e-runtime-domain", source: "runtime", target: "domain-data", label: "tools" },
      { id: "e-proactive-domain", source: "proactive-api", target: "domain-data" },
      { id: "e-runtime-conv", source: "runtime", target: "ea-conversations" },
    ],
  };
}

export function resolveSeedTemplate(
  template: ArchitectureCatalogEntry["seedTemplate"] | undefined,
  title?: string,
): ArchitectureDiagramDocument {
  if (template === "storage") return createStorageArchitectureDiagram();
  if (template === "platform-overview") return createPlatformOverviewDiagram();
  if (template === "voice-and-video") return createVoiceAndVideoArchitectureDiagram();
  if (template === "software-asset-register") {
    return createSoftwareAssetRegisterArchitectureDiagram();
  }
  if (template === "executive-ai") return createExecutiveAiArchitectureDiagram();
  return createBlankArchitectureDiagram(title);
}

export function isArchitectureDiagramDocument(
  value: unknown,
): value is ArchitectureDiagramDocument {
  if (!value || typeof value !== "object") return false;
  const doc = value as ArchitectureDiagramDocument;
  return doc.version === 1 && Array.isArray(doc.nodes) && Array.isArray(doc.edges);
}

export function normalizeArchitectureDiagramDocument(
  value: unknown,
): ArchitectureDiagramDocument {
  if (isArchitectureDiagramDocument(value)) {
    return {
      version: 1,
      viewport: value.viewport,
      nodes: value.nodes,
      edges: value.edges,
      meta: value.meta,
    };
  }
  return createBlankArchitectureDiagram();
}
