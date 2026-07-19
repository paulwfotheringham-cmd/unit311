import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const GITHUB_ARCHITECTURE_DOC_RELATIVE_PATH = "docs/GITHUB_ARCHITECTURE.md";
export const GITHUB_ARCHITECTURE_PUBLIC_DIR = "public/architecture";
export const GITHUB_ARCHITECTURE_SVG_BASENAME = "github-architecture.svg";
export const GITHUB_ARCHITECTURE_PNG_BASENAME = "github-architecture.png";
/** Public URL path opened by Unit311 Details → Github. */
export const GITHUB_ARCHITECTURE_SVG_PUBLIC_PATH = "/architecture/github-architecture.svg";

export type GithubArchitectureDiagramArtifacts = {
  version: string;
  generatedAt: string;
  sourceDocument: string;
  sourceDocumentMtimeMs: number;
  svg: string;
  svgRelativePath: string;
  pngRelativePath: string;
};

type StructureRow = { path: string; role: string };
type AreaRow = { area: string; location: string; purpose: string };
type StatusRow = { item: string; status: string };

type ParsedGithubArchitecture = {
  remote: string;
  packageName: string;
  product: string;
  defaultBranch: string;
  hosting: string;
  database: string;
  structure: StructureRow[];
  appRouter: AreaRow[];
  components: AreaRow[];
  libConcerns: Array<{ concern: string; location: string }>;
  supabaseNotes: string[];
  middlewareNotes: string[];
  docs: Array<{ document: string; purpose: string }>;
  internalModules: string[];
  customerModules: string[];
  buildSteps: string[];
  branchNotes: string[];
  hygieneNotes: string[];
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

export function resolveGithubArchitectureDocPath(cwd = process.cwd()) {
  return join(cwd, GITHUB_ARCHITECTURE_DOC_RELATIVE_PATH);
}

export function parseGithubArchitectureDoc(markdown: string): ParsedGithubArchitecture {
  const identity = parseFieldTable(markdown, "## Repository identity");
  const structure = parseMarkdownTableSection(markdown, "## Repository structure").map((row) => ({
    path: row[0] ?? "",
    role: row[1] ?? "",
  }));
  const appRouter = parseMarkdownTableSection(markdown, "## App Router").map((row) => ({
    area: row[0] ?? "",
    location: row[1] ?? "",
    purpose: row[2] ?? "",
  }));
  const components = parseMarkdownTableSection(markdown, "## Components").map((row) => ({
    area: row[0] ?? "",
    location: row[1] ?? "",
    purpose: row[2] ?? "",
  }));
  const libConcerns = parseMarkdownTableSection(markdown, "## lib").map((row) => ({
    concern: row[0] ?? "",
    location: row[1] ?? "",
  }));
  const supabaseNotes = parseMarkdownTableSection(markdown, "## Supabase").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const middlewareNotes = parseMarkdownTableSection(markdown, "## Middleware").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const docs = parseMarkdownTableSection(markdown, "## Documentation").map((row) => ({
    document: row[0] ?? "",
    purpose: row[1] ?? "",
  }));
  const internalModules = parseMarkdownTableSection(markdown, "## Internal modules").map(
    (row) => `${row[0]} → ${row[1]}`,
  );
  const customerModules = parseMarkdownTableSection(markdown, "## Customer modules").map(
    (row) => `${row[0]} → ${row[1]}`,
  );
  const buildSteps = parseMarkdownTableSection(markdown, "## Build process").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const branchNotes = parseMarkdownTableSection(markdown, "## Branch strategy").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const hygieneNotes = parseMarkdownTableSection(markdown, "## Repository hygiene").map(
    (row) => `${row[0]}: ${row[1]}`,
  );
  const statusRows = parseMarkdownTableSection(markdown, "## Current status").map((row) => ({
    item: row[0] ?? "",
    status: row[1] ?? "",
  }));

  return {
    remote: identity["GitHub remote"] || "https://github.com/paulwfotheringham-cmd/unit311.git",
    packageName: identity["Default package name"] || "unit311",
    product: identity["Product"] || "Unit311 Central",
    defaultBranch: identity["Default branch"] || "main",
    hosting: identity["Hosting project"] || "Vercel unit311central",
    database: identity["Production database"] || "Supabase Unit311 Central",
    structure: structure.filter((row) => row.path),
    appRouter: appRouter.filter((row) => row.area),
    components: components.filter((row) => row.area),
    libConcerns: libConcerns.filter((row) => row.concern),
    supabaseNotes: supabaseNotes.filter(Boolean),
    middlewareNotes: middlewareNotes.filter(Boolean),
    docs: docs.filter((row) => row.document),
    internalModules: internalModules.filter(Boolean),
    customerModules: customerModules.filter(Boolean),
    buildSteps: buildSteps.filter(Boolean),
    branchNotes: branchNotes.filter(Boolean),
    hygieneNotes: hygieneNotes.filter(Boolean),
    statusRows: statusRows.filter((row) => row.item),
  };
}

function sectionPanel(
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  lines: string[],
  variant: "default" | "accent" | "warn" = "default",
) {
  const cls = variant === "accent" ? "accent" : variant === "warn" ? "warn" : "panel";
  const body = lines
    .slice(0, 8)
    .map(
      (line, index) =>
        `<text x="${x + 16}" y="${y + 58 + index * 22}" class="body">${escapeXml(line.slice(0, 58))}</text>`,
    )
    .join("\n");
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" class="${cls}"/>
    <text x="${x + 16}" y="${y + 32}" class="label">${escapeXml(title)}</text>
    ${body}
  `;
}

export function buildGithubArchitectureSvg(
  parsed: ParsedGithubArchitecture,
  meta: { version: string; generatedAt: string },
): string {
  const width = 1780;
  const height = 1380;

  const structureChips = parsed.structure
    .slice(0, 12)
    .map((row, index) => {
      const col = index % 4;
      const rowIndex = Math.floor(index / 4);
      const x = 80 + col * 410;
      const y = 292 + rowIndex * 48;
      return `
        <rect x="${x}" y="${y}" width="395" height="40" rx="10" class="chip"/>
        <text x="${x + 12}" y="${y + 17}" class="mono">${escapeXml(row.path.slice(0, 34))}</text>
        <text x="${x + 12}" y="${y + 33}" class="muted">${escapeXml(row.role.slice(0, 42))}</text>
      `;
    })
    .join("\n");

  const appLines = parsed.appRouter
    .slice(0, 6)
    .map((row) => `${row.area}: ${row.location}`);
  const componentLines = parsed.components
    .slice(0, 6)
    .map((row) => `${row.area}: ${row.location}`);
  const libLines = parsed.libConcerns.slice(0, 6).map((row) => `${row.concern}: ${row.location}`);
  const docsLines = parsed.docs.slice(0, 7).map((row) => row.document);

  const statusSummary = parsed.statusRows
    .slice(0, 8)
    .map((row) => `${row.item}: ${row.status}`)
    .join(" · ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Unit311 Central GitHub Repository Architecture</title>
  <desc id="desc">Generated from docs/GITHUB_ARCHITECTURE.md - repository structure, App Router, modules, migrations, and hygiene.</desc>
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
    <style>
      .title { fill: #f8fafc; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 32px; font-weight: 700; }
      .subtitle { fill: #94a3b8; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 14px; }
      .label { fill: #93c5fd; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
      .card-title { fill: #f8fafc; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 18px; font-weight: 700; }
      .body { fill: #cbd5e1; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 13px; }
      .mono { fill: #bae6fd; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .muted { fill: #64748b; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 11px; }
      .panel { fill: url(#panel); stroke: rgba(148,163,184,0.35); stroke-width: 1.2; }
      .accent { fill: #0f2944; stroke: #38bdf8; stroke-width: 1.5; }
      .warn { fill: #1a2740; stroke: #a5b4fc; stroke-width: 1.5; }
      .chip { fill: #12324f; stroke: #38bdf8; stroke-width: 1; }
    </style>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1600" cy="80" r="200" fill="#1d4ed8" opacity="0.12"/>
  <circle cx="120" cy="1220" r="220" fill="#0ea5e9" opacity="0.08"/>

  <text x="56" y="52" class="title">Unit311 Central - GitHub Repository Architecture</text>
  <text x="56" y="80" class="subtitle">Generated from ${escapeXml(GITHUB_ARCHITECTURE_DOC_RELATIVE_PATH)} | version ${escapeXml(meta.version)} | ${escapeXml(meta.generatedAt)}</text>
  <text x="56" y="104" class="muted">Markdown is the specification. SVG/PNG under public/architecture/ are regenerated by code - do not hand-edit.</text>

  <rect x="56" y="128" width="1668" height="92" rx="18" class="accent"/>
  <text x="80" y="160" class="label">Repository identity / branch / deployment targets</text>
  <text x="80" y="188" class="card-title">${escapeXml(parsed.packageName)} | default branch ${escapeXml(parsed.defaultBranch)}</text>
  <text x="80" y="208" class="mono">${escapeXml(parsed.remote)} | ${escapeXml(parsed.hosting)} | ${escapeXml(parsed.database)}</text>

  <rect x="56" y="244" width="1668" height="170" rx="18" class="panel"/>
  <text x="80" y="276" class="label">Repository structure</text>
  ${structureChips}

  ${sectionPanel(56, 440, 540, 250, "App Router", appLines, "accent")}
  ${sectionPanel(620, 440, 540, 250, "Components", componentLines)}
  ${sectionPanel(1184, 440, 540, 250, "lib", libLines, "warn")}

  ${sectionPanel(
    56,
    716,
    540,
    230,
    "Supabase + migrations",
    parsed.supabaseNotes.slice(0, 6),
    "accent",
  )}
  ${sectionPanel(620, 716, 540, 230, "Middleware + public + env", [
    ...parsed.middlewareNotes.slice(0, 3),
    "public/architecture/ generated diagrams",
    ".env.example committed; secrets gitignored",
    "scripts/ ops helpers (no secret dumps)",
  ])}
  ${sectionPanel(1184, 716, 540, 230, "Documentation", docsLines)}

  ${sectionPanel(56, 972, 540, 230, "Internal modules", parsed.internalModules.slice(0, 7), "accent")}
  ${sectionPanel(620, 972, 540, 230, "Customer modules", parsed.customerModules.slice(0, 6), "warn")}
  ${sectionPanel(1184, 972, 540, 230, "Build / branch / hygiene", [
    ...parsed.buildSteps.slice(0, 3),
    ...parsed.branchNotes.slice(0, 2),
    ...parsed.hygieneNotes.slice(0, 2),
  ])}

  <rect x="56" y="1228" width="1668" height="120" rx="14" class="panel"/>
  <text x="80" y="1260" class="label">Current status / product</text>
  <text x="80" y="1286" class="card-title">${escapeXml(parsed.product)}</text>
  ${renderWrappedText(80, 1314, statusSummary || "See docs/GITHUB_ARCHITECTURE.md", 170, 18, "body")}
</svg>
`;
}

export function createGithubArchitectureDiagramArtifacts(
  cwd = process.cwd(),
): GithubArchitectureDiagramArtifacts {
  const docPath = resolveGithubArchitectureDocPath(cwd);
  const markdown = readFileSync(docPath, "utf8");
  const sourceDocumentMtimeMs = statSync(docPath).mtimeMs;
  const parsed = parseGithubArchitectureDoc(markdown);

  const generatedAt = new Date().toISOString();
  const version = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const svg = buildGithubArchitectureSvg(parsed, { version, generatedAt });

  return {
    version,
    generatedAt,
    sourceDocument: GITHUB_ARCHITECTURE_DOC_RELATIVE_PATH,
    sourceDocumentMtimeMs,
    svg,
    svgRelativePath: `${GITHUB_ARCHITECTURE_PUBLIC_DIR}/${GITHUB_ARCHITECTURE_SVG_BASENAME}`,
    pngRelativePath: `${GITHUB_ARCHITECTURE_PUBLIC_DIR}/${GITHUB_ARCHITECTURE_PNG_BASENAME}`,
  };
}
