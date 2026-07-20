import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const VERCEL_ARCHITECTURE_DOC_RELATIVE_PATH = "docs/VERCEL_ARCHITECTURE.md";
export const VERCEL_ARCHITECTURE_PUBLIC_DIR = "public/architecture";
export const VERCEL_ARCHITECTURE_SVG_BASENAME = "vercel-architecture.svg";
export const VERCEL_ARCHITECTURE_PNG_BASENAME = "vercel-architecture.png";
/** Public URL path opened by Unit311 Details → Vercel. */
export const VERCEL_ARCHITECTURE_SVG_PUBLIC_PATH = "/architecture/vercel-architecture.svg";

export type VercelArchitectureDiagramArtifacts = {
  version: string;
  generatedAt: string;
  sourceDocument: string;
  sourceDocumentMtimeMs: number;
  svg: string;
  svgRelativePath: string;
  pngRelativePath: string;
};

type DomainRow = { domain: string; role: string; status: string };
type FlowRow = { host: string; behaviour: string };
type SurfaceRow = { surface: string; hostPath: string; implementation: string };
type StatusRow = { item: string; status: string };

type ParsedVercelArchitecture = {
  project: string;
  framework: string;
  runtime: string;
  productionUrl: string;
  database: string;
  domains: DomainRow[];
  dnsSslNotes: string[];
  middlewareFlows: FlowRow[];
  surfaces: SurfaceRow[];
  customerSteps: string[];
  redirects: Array<{ from: string; to: string }>;
  futureItems: string[];
  statusRows: StatusRow[];
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseMarkdownTableSection(markdown: string, heading: string): string[][] {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex < 0) return [];

  const rows: string[][] = [];
  let sawSeparator = false;

  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ") || line.startsWith("---")) break;
    if (!line.trim().startsWith("|")) continue;
    if (/^\|\s*-+/.test(line.trim())) {
      sawSeparator = true;
      continue;
    }
    if (!sawSeparator) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim().replace(/`/g, ""));
    if (cells.length > 0) rows.push(cells);
  }

  return rows;
}

function parseFieldTable(markdown: string, heading: string): Record<string, string> {
  const rows = parseMarkdownTableSection(markdown, heading);
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row[0] && row[1]) out[row[0]] = row[1];
  }
  return out;
}

function wrapWords(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function renderWrappedText(
  x: number,
  y: number,
  text: string,
  maxChars: number,
  lineHeight: number,
  className: string,
) {
  return wrapWords(text, maxChars)
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`,
    )
    .join("\n");
}

export function resolveVercelArchitectureDocPath(cwd = process.cwd()) {
  return join(cwd, VERCEL_ARCHITECTURE_DOC_RELATIVE_PATH);
}

export function parseVercelArchitectureDoc(markdown: string): ParsedVercelArchitecture {
  const production = parseFieldTable(markdown, "## Production deployment");
  const domains = parseMarkdownTableSection(markdown, "## Domains").map((row) => ({
    domain: row[0] ?? "",
    role: row[1] ?? "",
    status: row[2] ?? "",
  }));
  const dns = parseMarkdownTableSection(markdown, "## DNS and SSL").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const middlewareFlows = parseMarkdownTableSection(markdown, "## Middleware request flow").map(
    (row) => ({
      host: row[0] ?? "",
      behaviour: row[1] ?? "",
    }),
  );
  const surfaces = parseMarkdownTableSection(markdown, "## Application surfaces").map((row) => ({
    surface: row[0] ?? "",
    hostPath: row[1] ?? "",
    implementation: row[2] ?? "",
  }));
  const customerSteps = parseMarkdownTableSection(markdown, "## Customer workspace flow").map(
    (row) => `${row[0]} ${row[1]}`.trim(),
  );
  const redirects = parseMarkdownTableSection(markdown, "## Redirects summary").map((row) => ({
    from: row[0] ?? "",
    to: row[1] ?? "",
  }));
  const futureItems = parseMarkdownTableSection(markdown, "## Future customer workspaces").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const statusRows = parseMarkdownTableSection(markdown, "## Current status").map((row) => ({
    item: row[0] ?? "",
    status: row[1] ?? "",
  }));

  return {
    project: production["Vercel project"] || "unit311central",
    framework: production["Framework"] || "Next.js (App Router)",
    runtime: production["Runtime"] || "Vercel Edge Middleware + Node.js App Router",
    productionUrl: production["Production URL (apex)"] || "https://unit311central.com",
    database: production["Production database"] || "Supabase Unit311 Central",
    domains: domains.filter((row) => row.domain),
    dnsSslNotes: dns.filter(Boolean),
    middlewareFlows: middlewareFlows.filter((row) => row.host),
    surfaces: surfaces.filter((row) => row.surface),
    customerSteps: customerSteps.filter(Boolean),
    redirects: redirects.filter((row) => row.from),
    futureItems: futureItems.filter(Boolean),
    statusRows: statusRows.filter((row) => row.item),
  };
}

function hostLane(
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  lines: string[],
  variant: "public" | "internal" | "workspace",
) {
  const panelClass =
    variant === "public" ? "lane-public" : variant === "internal" ? "lane-internal" : "lane-workspace";
  const body = lines
    .slice(0, 6)
    .map(
      (line, index) =>
        `<text x="${x + 18}" y="${y + 72 + index * 22}" class="body">${escapeXml(line)}</text>`,
    )
    .join("\n");

  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" class="${panelClass}"/>
    <text x="${x + 18}" y="${y + 34}" class="label">${escapeXml(title)}</text>
    ${body}
  `;
}

export function buildVercelArchitectureSvg(
  parsed: ParsedVercelArchitecture,
  meta: { version: string; generatedAt: string },
): string {
  const width = 1780;
  const height = 1320;

  const domainChips = parsed.domains
    .slice(0, 6)
    .map((row, index) => {
      const col = index % 3;
      const rowIndex = Math.floor(index / 3);
      const x = 80 + col * 540;
      const y = 248 + rowIndex * 58;
      return `
        <rect x="${x}" y="${y}" width="520" height="48" rx="10" class="chip"/>
        <text x="${x + 14}" y="${y + 20}" class="mono">${escapeXml(row.domain)}</text>
        <text x="${x + 14}" y="${y + 38}" class="muted">${escapeXml(row.role)} · ${escapeXml(row.status)}</text>
      `;
    })
    .join("\n");

  const publicLane = hostLane(
    56,
    470,
    540,
    220,
    "Public website",
    [
      "unit311central.com",
      "Marketing pages + /login",
      "Session cookie parent domain",
      "Redirects legacy Internal paths",
    ],
    "public",
  );

  const internalLane = hostLane(
    620,
    470,
    540,
    220,
    "Internal application",
    [
      "internal.unit311central.com",
      "/ → rewrite /internaldashboard (impl)",
      "Browser: / only (308 legacy paths)",
      "Login → apex /login",
    ],
    "internal",
  );

  const workspaceLane = hostLane(
    1184,
    470,
    540,
    220,
    "Workspace routing",
    [
      "*.unit311central.com",
      "Rewrite → /ws/[slug]",
      "Missing → unavailable placeholder",
      "Present → onboarding placeholder",
    ],
    "workspace",
  );

  const flowRows = parsed.middlewareFlows
    .slice(0, 7)
    .map((row, index) => {
      const y = 780 + index * 28;
      return `
        <text x="80" y="${y}" class="mono">${escapeXml(row.host.slice(0, 42))}</text>
        <text x="420" y="${y}" class="body">${escapeXml(row.behaviour.slice(0, 85))}</text>
      `;
    })
    .join("\n");

  const customerFlow = parsed.customerSteps
    .slice(0, 7)
    .map((step, index) => {
      const y = 780 + index * 28;
      return `<text x="980" y="${y}" class="body">${escapeXml(step.slice(0, 78))}</text>`;
    })
    .join("\n");

  const dnsLines = parsed.dnsSslNotes
    .slice(0, 5)
    .map((note, index) => `<text x="80" y="${1088 + index * 22}" class="body">${escapeXml(note.slice(0, 95))}</text>`)
    .join("\n");

  const futureLines = parsed.futureItems
    .slice(0, 5)
    .map(
      (item, index) =>
        `<text x="980" y="${1088 + index * 22}" class="body">${escapeXml(item.slice(0, 78))}</text>`,
    )
    .join("\n");

  const statusSummary = parsed.statusRows
    .slice(0, 8)
    .map((row) => `${row.item}: ${row.status}`)
    .join(" · ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Unit311 Central Vercel Deployment Architecture</title>
  <desc id="desc">Generated from docs/VERCEL_ARCHITECTURE.md - domains, middleware, host routing, DNS/SSL, and customer workspace flow.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050b14"/>
      <stop offset="50%" stop-color="#0a1628"/>
      <stop offset="100%" stop-color="#10233d"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#12233a"/>
      <stop offset="100%" stop-color="#0d1a2d"/>
    </linearGradient>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
      <path d="M0,0 L8,3 L0,6 Z" fill="#7dd3fc"/>
    </marker>
    <style>
      .title { fill: #f8fafc; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 32px; font-weight: 700; }
      .subtitle { fill: #94a3b8; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 14px; }
      .label { fill: #93c5fd; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
      .card-title { fill: #f8fafc; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 18px; font-weight: 700; }
      .body { fill: #cbd5e1; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 13px; }
      .mono { fill: #bae6fd; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .muted { fill: #64748b; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 12px; }
      .panel { fill: url(#panel); stroke: rgba(148,163,184,0.35); stroke-width: 1.2; }
      .accent { fill: #0f2944; stroke: #38bdf8; stroke-width: 1.5; }
      .chip { fill: #12324f; stroke: #38bdf8; stroke-width: 1; }
      .lane-public { fill: #0f2944; stroke: #38bdf8; stroke-width: 1.5; }
      .lane-internal { fill: #132f52; stroke: #67e8f9; stroke-width: 1.5; }
      .lane-workspace { fill: #1a2740; stroke: #a5b4fc; stroke-width: 1.5; }
    </style>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1580" cy="90" r="200" fill="#1d4ed8" opacity="0.12"/>
  <circle cx="140" cy="1180" r="240" fill="#0ea5e9" opacity="0.08"/>

  <text x="56" y="52" class="title">Unit311 Central - Vercel Deployment Architecture</text>
  <text x="56" y="80" class="subtitle">Generated from ${escapeXml(VERCEL_ARCHITECTURE_DOC_RELATIVE_PATH)} | version ${escapeXml(meta.version)} | ${escapeXml(meta.generatedAt)}</text>
  <text x="56" y="104" class="muted">Markdown is the specification. SVG/PNG under public/architecture/ are regenerated by code - do not hand-edit.</text>

  <!-- Vercel project -->
  <rect x="56" y="128" width="1668" height="92" rx="18" class="accent"/>
  <text x="80" y="160" class="label">Vercel project / production deployment</text>
  <text x="80" y="188" class="card-title">${escapeXml(parsed.project)} | ${escapeXml(parsed.framework)}</text>
  <text x="80" y="208" class="mono">${escapeXml(parsed.runtime)} | ${escapeXml(parsed.productionUrl)} | ${escapeXml(parsed.database)}</text>

  <!-- Domains -->
  <rect x="56" y="244" width="1668" height="190" rx="18" class="panel"/>
  <text x="80" y="276" class="label">Domains</text>
  ${domainChips}

  <!-- Browser → Vercel -->
  <text x="56" y="460" class="label">Host detection → middleware → application surfaces</text>
  ${publicLane}
  ${internalLane}
  ${workspaceLane}

  <line x1="596" y1="580" x2="616" y2="580" stroke="#7dd3fc" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="1160" y1="580" x2="1180" y2="580" stroke="#7dd3fc" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Middleware + customer flow -->
  <rect x="56" y="718" width="880" height="290" rx="18" class="panel"/>
  <text x="80" y="752" class="label">Middleware request flow</text>
  ${flowRows}

  <rect x="956" y="718" width="768" height="290" rx="18" class="panel"/>
  <text x="980" y="752" class="label">Customer workspace flow</text>
  ${customerFlow}

  <!-- DNS / SSL + Future -->
  <rect x="56" y="1032" width="880" height="170" rx="18" class="panel"/>
  <text x="80" y="1066" class="label">DNS · SSL · wildcard domains</text>
  ${dnsLines}

  <rect x="956" y="1032" width="768" height="170" rx="18" class="panel"/>
  <text x="980" y="1066" class="label">Future customer workspaces</text>
  ${futureLines}

  <!-- Footer -->
  <rect x="56" y="1224" width="1668" height="72" rx="14" class="panel"/>
  <text x="80" y="1254" class="label">Current status</text>
  ${renderWrappedText(80, 1278, statusSummary || "See docs/VERCEL_ARCHITECTURE.md", 170, 18, "body")}
</svg>
`;
}

export function createVercelArchitectureDiagramArtifacts(
  cwd = process.cwd(),
): VercelArchitectureDiagramArtifacts {
  const docPath = resolveVercelArchitectureDocPath(cwd);
  const markdown = readFileSync(docPath, "utf8");
  const sourceDocumentMtimeMs = statSync(docPath).mtimeMs;
  const parsed = parseVercelArchitectureDoc(markdown);

  const generatedAt = new Date().toISOString();
  const version = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const svg = buildVercelArchitectureSvg(parsed, { version, generatedAt });

  return {
    version,
    generatedAt,
    sourceDocument: VERCEL_ARCHITECTURE_DOC_RELATIVE_PATH,
    sourceDocumentMtimeMs,
    svg,
    svgRelativePath: `${VERCEL_ARCHITECTURE_PUBLIC_DIR}/${VERCEL_ARCHITECTURE_SVG_BASENAME}`,
    pngRelativePath: `${VERCEL_ARCHITECTURE_PUBLIC_DIR}/${VERCEL_ARCHITECTURE_PNG_BASENAME}`,
  };
}
