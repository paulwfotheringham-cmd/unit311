/**
 * Application Catalogue — PLATFORM STRUCTURE knowledge source.
 *
 * Separate from:
 * - Action Registry (executable business capabilities)
 * - Business data (clients, projects, invoices, …)
 *
 * Source of truth: internalSurveyNavSections (sidebar / platform navigation).
 */

import {
  internalSurveyNavSections,
  type InternalNavChildItem,
  type InternalNavItem,
  type InternalNavSection,
} from "@/lib/internal-operations-data";

export type ApplicationCataloguePage = {
  id: string;
  label: string;
  viewId?: string;
  href?: string;
  description?: string;
};

export type ApplicationCatalogueApp = {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  viewId?: string;
  href?: string;
  pages: ApplicationCataloguePage[];
};

export type ApplicationCatalogueModule = {
  id: string;
  label: string;
  /** Display name for assistants (e.g. QMS → Quality Management). */
  displayName: string;
  description: string;
  icon?: string;
  color?: string;
  applications: ApplicationCatalogueApp[];
  navigation: {
    defaultViewId?: string;
    href: string;
  };
};

export type ApplicationCatalogueEntry =
  | { kind: "module"; module: ApplicationCatalogueModule }
  | { kind: "application"; module: ApplicationCatalogueModule; application: ApplicationCatalogueApp }
  | {
      kind: "page";
      module: ApplicationCatalogueModule;
      application: ApplicationCatalogueApp;
      page: ApplicationCataloguePage;
    };

const MODULE_ALIASES: Record<string, string[]> = {
  "business-central": ["business central", "crm", "clients", "customers", "projects"],
  financials: [
    "finance",
    "financial",
    "accounting",
    "ledger",
    "receivables",
    "payables",
    "banking",
    "cash",
  ],
  "human-resources": ["hr", "human resources", "people", "employees", "payroll", "leave", "recruitment"],
  "corporate-information": ["corporate", "company", "cap table", "legal", "governance"],
  "technology-management": [
    "technology",
    "tech",
    "it",
    "devices",
    "software",
    "saas",
    "infrastructure",
    "cloud",
    "networks",
    "domains",
    "certificates",
    "identity",
    "security",
  ],
  "productivity-and-collaboration": [
    "productivity",
    "collaboration",
    "business productivity",
    "files",
    "email",
    "calendar",
    "messaging",
    "communications",
    "support",
  ],
  operations: ["ops", "assets", "inventory", "procurement", "logistics", "suppliers", "vendors"],
  training: ["learning", "courses", "education"],
  qms: ["quality", "quality management", "capa", "audits", "iso"],
  tools: ["utilities", "website", "media", "testing", "telemetry", "users"],
  "external-client-access": ["external access", "client portal", "external users"],
  settings: ["preferences", "profile", "billing", "appearance"],
};

const MODULE_DESCRIPTIONS: Record<string, string> = {
  "business-central": "Clients, CRM pipeline, onboarding, and project delivery.",
  financials: "General ledger, receivables, payables, banking, expenses, and financial reports.",
  "human-resources": "Employees, recruitment, leave, payroll, performance, and HR reporting.",
  "corporate-information": "Company details, cap table, offices, bank accounts, contracts, and advisors.",
  "technology-management":
    "Devices, software, SaaS, telecommunications, infrastructure, cloud, networks, domains, certificates, identity, security, and technology assets.",
  "productivity-and-collaboration":
    "Files, email, calendar, messaging, communications, and support desk.",
  operations: "Assets, inventory, procurement, and logistics.",
  training: "Staff and QMS training courses.",
  qms: "Quality management — document control, CAPA, audits, and management review.",
  tools: "Website management, media, testing, telemetry, and user administration.",
  "external-client-access": "External client users and portal access.",
  settings: "Profile, general settings, billing, and appearance.",
};

const DISPLAY_NAMES: Record<string, string> = {
  qms: "Quality Management",
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function flattenPages(
  children: readonly InternalNavChildItem[] | undefined,
  prefix: string,
): ApplicationCataloguePage[] {
  if (!children?.length) return [];
  const pages: ApplicationCataloguePage[] = [];
  for (const child of children) {
    const id = `${prefix}.${slugify(child.label)}`;
    if (child.children?.length) {
      pages.push(...flattenPages(child.children, id));
      continue;
    }
    pages.push({
      id,
      label: child.label,
      viewId: child.view,
      href: child.href ?? (child.view ? `/internaldashboard?view=${child.view}` : undefined),
      description: child.label,
    });
  }
  return pages;
}

function appFromItem(item: InternalNavItem, moduleId: string): ApplicationCatalogueApp {
  const id = `${moduleId}.${slugify(item.label)}`;
  const pages = item.children?.length
    ? flattenPages(item.children, id)
    : item.view || item.href
      ? [
          {
            id: `${id}.main`,
            label: item.label,
            viewId: item.view,
            href: item.href ?? (item.view ? `/internaldashboard?view=${item.view}` : undefined),
            description: item.label,
          },
        ]
      : [];

  const defaultView =
    item.view ??
    pages.find((p) => p.viewId)?.viewId ??
    pages[0]?.viewId;

  return {
    id,
    label: item.label,
    description: item.label,
    icon: item.icon,
    viewId: defaultView,
    href: item.href ?? (defaultView ? `/internaldashboard?view=${defaultView}` : undefined),
    pages,
  };
}

function moduleFromSection(section: InternalNavSection): ApplicationCatalogueModule | null {
  if (section.kind === "pin" || !section.label) return null;
  const id = slugify(section.label);
  const applications = section.items.map((item) => appFromItem(item, id));
  const defaultViewId =
    applications.find((a) => a.viewId)?.viewId ?? applications[0]?.pages[0]?.viewId;

  return {
    id,
    label: section.label,
    displayName: DISPLAY_NAMES[id] ?? section.label,
    description: MODULE_DESCRIPTIONS[id] ?? `${section.label} workspace in Unit311 Central.`,
    icon: section.icon,
    color: section.color,
    applications,
    navigation: {
      defaultViewId,
      href: defaultViewId
        ? `/internaldashboard?view=${defaultViewId}`
        : "/internaldashboard",
    },
  };
}

let cachedModules: ApplicationCatalogueModule[] | null = null;

/** Build / return the live Application Catalogue from platform navigation. */
export function listPlatformModules(): ApplicationCatalogueModule[] {
  if (cachedModules) return cachedModules;
  cachedModules = internalSurveyNavSections
    .map(moduleFromSection)
    .filter((m): m is ApplicationCatalogueModule => Boolean(m));
  return cachedModules;
}

export function getPlatformModule(idOrLabel: string): ApplicationCatalogueModule | null {
  const key = idOrLabel.trim().toLowerCase();
  if (!key) return null;
  return (
    listPlatformModules().find(
      (m) =>
        m.id === key ||
        m.label.toLowerCase() === key ||
        m.displayName.toLowerCase() === key ||
        (MODULE_ALIASES[m.id] ?? []).includes(key),
    ) ?? null
  );
}

function scoreText(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;
  if (h === n) return 40;
  if (h.startsWith(n)) return 28;
  if (h.includes(n)) return 18;
  const singular = n.replace(/s$/, "");
  if (singular.length > 2 && h.includes(singular)) return 14;
  return 0;
}

export function searchApplicationCatalogue(
  query: string,
  limit = 12,
): Array<{ score: number; entry: ApplicationCatalogueEntry }> {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !["the", "a", "an", "in", "of", "to", "for", "and", "or", "what", "where", "which", "how", "do", "i", "is", "are", "all", "list", "show", "me", "open", "go"].includes(t));

  if (!tokens.length) return [];

  const hits: Array<{ score: number; entry: ApplicationCatalogueEntry }> = [];

  for (const module of listPlatformModules()) {
    let moduleScore = 0;
    for (const token of tokens) {
      moduleScore += scoreText(module.label, token);
      moduleScore += scoreText(module.displayName, token);
      moduleScore += scoreText(module.description, token);
      moduleScore += scoreText(module.id, token);
      for (const alias of MODULE_ALIASES[module.id] ?? []) {
        moduleScore += scoreText(alias, token) * 0.8;
      }
    }
    if (moduleScore >= 12) {
      hits.push({ score: moduleScore, entry: { kind: "module", module } });
    }

    for (const application of module.applications) {
      let appScore = moduleScore * 0.25;
      for (const token of tokens) {
        appScore += scoreText(application.label, token) * 1.4;
        appScore += scoreText(application.description ?? "", token);
      }
      if (appScore >= 14) {
        hits.push({
          score: appScore,
          entry: { kind: "application", module, application },
        });
      }

      for (const page of application.pages) {
        let pageScore = appScore * 0.2;
        for (const token of tokens) {
          pageScore += scoreText(page.label, token) * 1.5;
        }
        if (pageScore >= 16) {
          hits.push({
            score: pageScore,
            entry: { kind: "page", module, application, page },
          });
        }
      }
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export type PlatformQuestionAnswer = {
  kind: "modules" | "module_detail" | "search" | "open" | "unsupported";
  answer: string;
  modules?: ApplicationCatalogueModule[];
  navigateHref?: string;
  navigateLabel?: string;
};

function formatModuleList(modules: ApplicationCatalogueModule[]): string {
  return [
    "Unit311 Central platform modules:",
    "",
    ...modules.map((m) => `• ${m.displayName}`),
    "",
    "Ask “What is under Financials?” (or any module) to see its applications.",
    "Ask “What can you do?” for executable business capabilities — that is a different catalogue.",
  ].join("\n");
}

function formatModuleDetail(module: ApplicationCatalogueModule): string {
  const apps = module.applications.map((app) => {
    if (app.pages.length > 1) {
      const pages = app.pages.map((p) => `  – ${p.label}`).join("\n");
      return `• ${app.label}\n${pages}`;
    }
    return `• ${app.label}`;
  });
  return [
    `${module.displayName}`,
    module.description,
    "",
    "Applications:",
    ...apps,
    "",
    `Open: ${module.navigation.href}`,
  ].join("\n");
}

/**
 * Answer platform / application-structure questions from the Application Catalogue only.
 * Never uses the Action Registry.
 */
export function answerPlatformQuestion(message: string): PlatformQuestionAnswer | null {
  const text = message.trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  // Executable capability questions belong elsewhere.
  if (
    /^(what\s+can\s+you\s+do|what\s+are\s+you\s+(able|capable)\s+of|list\s+(your\s+)?(capabilities|actions))\??$/i.test(
      lower,
    ) ||
    /\b(what\s+can\s+you\s+do|list\s+your\s+capabilities|what\s+actions?\s+(exist|are\s+(there|available)|for))\b/i.test(
      lower,
    ) ||
    /\b(capabilities?|actions?)\s+for\b/i.test(lower)
  ) {
    return null;
  }

  // Business-data list requests are not platform navigation.
  if (/\b(show|list)\s+(my\s+)?(clients?|projects?|employees?|invoices?|tasks?)\b/i.test(lower)) {
    return null;
  }

  const isModulesList =
    /\b(what|list|show|which)\b[\s\S]{0,40}\bmodules?\b/i.test(lower) ||
    /\bmodules?\s+(exist|are\s+there|available|in\s+(unit\s*311|the\s+platform|unit311central))\b/i.test(
      lower,
    ) ||
    /\b(platform|application)\s+(structure|catalogue|catalog|map)\b/i.test(lower) ||
    /\bwhat\s+is\s+in\s+(unit\s*311|the\s+platform|unit311central)\b/i.test(lower);

  if (isModulesList) {
    const modules = listPlatformModules();
    return {
      kind: "modules",
      answer: formatModuleList(modules),
      modules,
    };
  }

  const underMatch =
    lower.match(
      /\b(?:what\s+(?:apps?|applications|pages)\s+(?:are\s+)?(?:under|in|inside)|what(?:'s| is)?\s+(?:under|in|inside)|list\s+(?:apps?|applications|pages)\s+(?:in|under|for)|applications?\s+(?:are\s+)?(?:under|in))\s+(.+?)(?:\?|$)/i,
    ) ||
    lower.match(/\b(?:under|inside)\s+(.+?)(?:\?|$)/i);

  if (underMatch?.[1]) {
    const raw = underMatch[1]
      .replace(/\b(module|workspace|section|area)\b/gi, "")
      .replace(/\b(unit\s*311(?:central)?|the\s+platform)\b/gi, "")
      .trim();
    const module = getPlatformModule(raw) ?? searchApplicationCatalogue(raw, 1)[0]?.entry.module;
    if (module) {
      return {
        kind: "module_detail",
        answer: formatModuleDetail(module),
        modules: [module],
        navigateHref: module.navigation.href,
        navigateLabel: `Open ${module.displayName}`,
      };
    }
  }

  const openMatch = lower.match(
    /\b(?:open|go\s+to|take\s+me\s+to|navigate\s+to)\s+(.+?)(?:\?|$)/i,
  );
  if (openMatch?.[1]) {
    const raw = openMatch[1].replace(/\b(module|workspace|page|app|application)\b/gi, "").trim();
    const hit = searchApplicationCatalogue(raw, 1)[0];
    if (hit) {
      const href =
        hit.entry.kind === "module"
          ? hit.entry.module.navigation.href
          : hit.entry.kind === "application"
            ? hit.entry.application.href ?? hit.entry.module.navigation.href
            : hit.entry.page.href ?? hit.entry.module.navigation.href;
      const label =
        hit.entry.kind === "module"
          ? hit.entry.module.displayName
          : hit.entry.kind === "application"
            ? hit.entry.application.label
            : hit.entry.page.label;
      return {
        kind: "open",
        answer: [
          `Open ${label} in ${hit.entry.module.displayName}.`,
          "",
          hit.entry.kind === "module"
            ? formatModuleDetail(hit.entry.module)
            : `${hit.entry.module.displayName} → ${label}`,
        ].join("\n"),
        modules: [hit.entry.module],
        navigateHref: href,
        navigateLabel: `Open ${label}`,
      };
    }
  }

  const whereMatch = /\b(where\s+(do\s+i|can\s+i|to)|where\s+is|find)\b/i.test(lower);
  const locationTopic =
    /\b(suppliers?|vendors?|accounts\s+payable|general\s+ledger|leave|recruitment)\b/i.test(
      lower,
    );
  if (whereMatch || (locationTopic && /\b(manage|find|locate|open)\b/i.test(lower))) {
    const hits = searchApplicationCatalogue(text, 5);
    if (hits.length) {
      const lines = hits.map((h) => {
        if (h.entry.kind === "module") {
          return `• ${h.entry.module.displayName} — ${h.entry.module.description}`;
        }
        if (h.entry.kind === "application") {
          return `• ${h.entry.module.displayName} → ${h.entry.application.label}`;
        }
        return `• ${h.entry.module.displayName} → ${h.entry.application.label} → ${h.entry.page.label}`;
      });
      const top = hits[0]!;
      const href =
        top.entry.kind === "module"
          ? top.entry.module.navigation.href
          : top.entry.kind === "application"
            ? top.entry.application.href
            : top.entry.page.href;
      return {
        kind: "search",
        answer: [
          "From the Application Catalogue (platform structure — not executable actions):",
          "",
          ...lines,
        ].join("\n"),
        modules: [...new Set(hits.map((h) => h.entry.module))],
        navigateHref: href,
        navigateLabel: "Open location",
      };
    }
  }

  // Soft: "financials applications" / "hr apps"
  const softModule = listPlatformModules().find((m) => {
    const names = [m.label, m.displayName, m.id, ...(MODULE_ALIASES[m.id] ?? [])];
    return names.some((n) => lower.includes(n.toLowerCase())) &&
      /\b(app|apps|application|applications|pages|views|under|inside)\b/i.test(lower);
  });
  if (softModule) {
    return {
      kind: "module_detail",
      answer: formatModuleDetail(softModule),
      modules: [softModule],
      navigateHref: softModule.navigation.href,
      navigateLabel: `Open ${softModule.displayName}`,
    };
  }

  return null;
}

export function isPlatformQuestion(message: string): boolean {
  return answerPlatformQuestion(message) != null;
}
