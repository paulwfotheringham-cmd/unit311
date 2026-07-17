import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const WORKSPACE_ARCHITECTURE_DOC_RELATIVE_PATH = "docs/WORKSPACE_ARCHITECTURE.md";
export const WORKSPACE_ARCHITECTURE_DIAGRAM_BASENAME = "workspace-architecture";
export const WORKSPACE_ARCHITECTURE_LINK_FILE = "workspace-architecture.link.json";

export type WorkspaceArchitectureLink = {
  sourceDocument: string;
  sourceDocumentMtimeMs: number;
  version: string;
  generatedAt: string;
  svgFileName: string;
  pngFileName: string;
};

export type WorkspaceArchitectureDiagramArtifacts = {
  version: string;
  generatedAt: string;
  sourceDocument: string;
  sourceDocumentMtimeMs: number;
  svg: string;
  svgFileName: string;
  pngFileName: string;
  link: WorkspaceArchitectureLink;
};

type ParsedArchitecture = {
  projectId: string;
  projectName: string;
  internalName: string;
  internalSlug: string;
  internalType: string;
  internalStatus: string;
  internalId: string;
  foundationTables: string[];
  workspaceAwareTables: string[];
  internalOnlyTables: string[];
  hasProvisionFunction: boolean;
  statusRows: Array<{ item: string; status: string }>;
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
  let sawHeader = false;

  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ") || line.startsWith("### ") || line.startsWith("---")) break;
    if (!line.trim().startsWith("|")) continue;
    if (/^\|\s*-+/.test(line.trim())) {
      sawHeader = true;
      continue;
    }
    if (!sawHeader && rows.length === 0) {
      // skip header row once separator has not appeared yet — collect after separator
      continue;
    }
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

export function resolveWorkspaceArchitectureDocPath(cwd = process.cwd()) {
  return join(cwd, WORKSPACE_ARCHITECTURE_DOC_RELATIVE_PATH);
}

export function parseWorkspaceArchitectureDoc(markdown: string): ParsedArchitecture {
  const projectFields = parseFieldTable(markdown, "**Production database**");
  const internalFields = parseFieldTable(markdown, "## Unit311 Central Internal workspace");

  const workspaceAware = parseMarkdownTableSection(markdown, "## Which tables are workspace-aware").map(
    (row) => row[0],
  );
  const internalOnly = parseMarkdownTableSection(markdown, "## Which tables remain Internal only").map(
    (row) => row[0],
  );
  const statusRows = parseMarkdownTableSection(markdown, "## Current status").map((row) => ({
    item: row[0] ?? "",
    status: row[1] ?? "",
  }));

  const foundationTables = [
    "workspace_settings",
    "workspace_modules",
    "workspace_users",
    "workspace_audit_log",
  ];

  return {
    projectId: projectFields["Project ID"] || "kkxtvzxqmbacjatkiupq",
    projectName: projectFields["Supabase display name"] || "Unit311 Central",
    internalName: internalFields["name"] || "Unit311 Central",
    internalSlug: internalFields["slug"] || "unit311",
    internalType: internalFields["workspace_type"] || "Internal",
    internalStatus: internalFields["status"] || "Active",
    internalId: internalFields["Stable ID (production)"] || "cd5c37a5-add4-4a8b-830c-6d26b775f62c",
    foundationTables,
    workspaceAwareTables: workspaceAware.filter(Boolean),
    internalOnlyTables: internalOnly.filter(Boolean),
    hasProvisionFunction: markdown.includes("provision_workspace"),
    statusRows: statusRows.filter((row) => row.item),
  };
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

function chipRows(items: string[], columns: number, maxRows: number) {
  const shown = items.slice(0, columns * maxRows);
  const rows: string[][] = [];
  for (let i = 0; i < shown.length; i += columns) {
    rows.push(shown.slice(i, i + columns));
  }
  return { rows, omitted: Math.max(0, items.length - shown.length) };
}

export function buildWorkspaceArchitectureSvg(parsed: ParsedArchitecture, meta: {
  version: string;
  generatedAt: string;
  sourceDocumentMtimeMs: number;
}): string {
  const width = 1680;
  const height = 1180;
  const awareChips = chipRows(parsed.workspaceAwareTables, 4, 5);
  const internalChips = chipRows(parsed.internalOnlyTables, 2, 5);

  const statusSummary = parsed.statusRows
    .slice(0, 6)
    .map((row) => `${row.item}: ${row.status}`)
    .join(" · ");

  const foundationBoxes = parsed.foundationTables
    .map((name, index) => {
      const x = 80 + (index % 2) * 340;
      const y = 580 + Math.floor(index / 2) * 54;
      return `
        <rect x="${x}" y="${y}" width="320" height="44" rx="10" class="foundation-card"/>
        <text x="${x + 16}" y="${y + 28}" class="foundation-label">${escapeXml(name)}</text>
      `;
    })
    .join("\n");

  const chipStartY = 808;
  const awareChipSvg = awareChips.rows
    .map((row, rowIndex) =>
      row
        .map((name, colIndex) => {
          const x = 100 + colIndex * 185;
          const y = chipStartY + rowIndex * 36;
          return `
            <rect x="${x}" y="${y}" width="175" height="28" rx="8" class="chip-aware"/>
            <text x="${x + 10}" y="${y + 19}" class="chip-text">${escapeXml(name)}</text>
          `;
        })
        .join("\n"),
    )
    .join("\n");

  const internalChipSvg = internalChips.rows
    .map((row, rowIndex) =>
      row
        .map((name, colIndex) => {
          const x = 980 + colIndex * 290;
          const y = chipStartY + rowIndex * 36;
          return `
            <rect x="${x}" y="${y}" width="275" height="28" rx="8" class="chip-internal"/>
            <text x="${x + 10}" y="${y + 19}" class="chip-text">${escapeXml(name)}</text>
          `;
        })
        .join("\n"),
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Unit311 Central Workspace Architecture</title>
  <desc id="desc">Visual representation of docs/WORKSPACE_ARCHITECTURE.md for the Unit311 Central Supabase project.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111F"/>
      <stop offset="55%" stop-color="#0b1e36"/>
      <stop offset="100%" stop-color="#102a4a"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#12233a"/>
      <stop offset="100%" stop-color="#0d1a2d"/>
    </linearGradient>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L8,3 L0,6 Z" fill="#7dd3fc"/>
    </marker>
    <style>
      .title { fill: #f8fafc; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 34px; font-weight: 700; }
      .subtitle { fill: #94a3b8; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 15px; }
      .section-title { fill: #e2e8f0; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 18px; font-weight: 700; }
      .body { fill: #cbd5e1; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 13px; }
      .mono { fill: #bae6fd; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .label { fill: #93c5fd; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
      .card-title { fill: #f8fafc; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 16px; font-weight: 700; }
      .foundation-card { fill: #132f52; stroke: #38bdf8; stroke-width: 1.2; }
      .foundation-label { fill: #e0f2fe; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; font-weight: 600; }
      .chip-aware { fill: #12324f; stroke: #38bdf8; stroke-width: 1; }
      .chip-internal { fill: #3a1d24; stroke: #f87171; stroke-width: 1; }
      .chip-text { fill: #e2e8f0; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; }
      .panel { fill: url(#panel); stroke: rgba(148,163,184,0.35); stroke-width: 1.2; }
      .accent-panel { fill: #0f2944; stroke: #38bdf8; stroke-width: 1.5; }
      .warn-panel { fill: #2a1520; stroke: #f87171; stroke-width: 1.5; }
      .muted { fill: #64748b; font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 12px; }
    </style>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="1500" cy="80" r="180" fill="#1d4ed8" opacity="0.12"/>
  <circle cx="120" cy="980" r="220" fill="#0ea5e9" opacity="0.08"/>

  <text x="56" y="58" class="title">Unit311 Central — Workspace Architecture</text>
  <text x="56" y="88" class="subtitle">Generated visual of ${escapeXml(WORKSPACE_ARCHITECTURE_DOC_RELATIVE_PATH)} · version ${escapeXml(meta.version)} · ${escapeXml(meta.generatedAt)}</text>
  <text x="56" y="112" class="muted">Markdown remains the technical specification. This diagram is a linked visual representation.</text>

  <!-- Single project -->
  <rect x="56" y="140" width="1568" height="96" rx="18" class="accent-panel"/>
  <text x="80" y="172" class="label">Production Supabase (single project)</text>
  <text x="80" y="200" class="card-title">${escapeXml(parsed.projectName)}</text>
  <text x="80" y="222" class="mono">project_id = ${escapeXml(parsed.projectId)} · Do not create another production database for tenancy</text>

  <!-- Registry -->
  <rect x="56" y="268" width="520" height="200" rx="18" class="panel"/>
  <text x="80" y="302" class="label">Registry</text>
  <text x="80" y="332" class="card-title">workspaces</text>
  <text x="80" y="358" class="body">id · name · slug · workspace_type · status</text>
  <text x="80" y="382" class="body">No workspace_id on this table (it is the registry).</text>
  <text x="80" y="414" class="mono">lookup preferred by slug, not hardcoded UUID</text>

  <!-- Internal workspace -->
  <rect x="616" y="268" width="520" height="200" rx="18" class="accent-panel"/>
  <text x="640" y="302" class="label">Internal workspace</text>
  <text x="640" y="332" class="card-title">${escapeXml(parsed.internalName)}</text>
  <text x="640" y="358" class="mono">slug = ${escapeXml(parsed.internalSlug)}</text>
  <text x="640" y="382" class="body">type ${escapeXml(parsed.internalType)} · status ${escapeXml(parsed.internalStatus)}</text>
  <text x="640" y="414" class="mono">id ${escapeXml(parsed.internalId)}</text>

  <!-- Provision -->
  <rect x="1176" y="268" width="448" height="200" rx="18" class="panel"/>
  <text x="1200" y="302" class="label">Customer provisioning</text>
  <text x="1200" y="332" class="card-title">${parsed.hasProvisionFunction ? "provision_workspace()" : "provision (planned)"}</text>
  ${renderWrappedText(
    1200,
    362,
    parsed.hasProvisionFunction
      ? "Transactional: workspace + settings + enabled modules from unit311 + default folders/categories + audit log. Returns workspace_id. No users/auth/clients/emails."
      : "Future onboarding will create Customer workspaces from Internal defaults.",
    42,
    18,
    "body",
  )}

  <!-- Foundation -->
  <rect x="56" y="500" width="720" height="200" rx="18" class="panel"/>
  <text x="80" y="534" class="label">Workspace foundation tables</text>
  <text x="80" y="560" class="body">1:1 / 1:N children of workspaces (database foundation; app not consuming yet)</text>
  ${foundationBoxes}

  <!-- Flow arrows -->
  <line x1="576" y1="368" x2="612" y2="368" stroke="#7dd3fc" stroke-width="2" marker-end="url(#arrow)"/>
  <line x1="1136" y1="368" x2="1172" y2="368" stroke="#7dd3fc" stroke-width="2" marker-end="url(#arrow)"/>
  <path d="M316 468 C316 488, 316 488, 416 498" fill="none" stroke="#7dd3fc" stroke-width="2" marker-end="url(#arrow)"/>

  <!-- Future customer note -->
  <rect x="816" y="500" width="808" height="200" rx="18" class="panel"/>
  <text x="840" y="534" class="label">Multi-workspace model</text>
  <text x="840" y="566" class="card-title">One database · many workspaces</text>
  ${renderWrappedText(
    840,
    598,
    "1) Unit311 Central Internal operations  2) Customer workspaces isolated by workspace_id. Phase 1 prepared the database only — application code is not workspace-aware yet. Inserts omitting workspace_id still default to Internal.",
    78,
    20,
    "body",
  )}
  <text x="840" y="670" class="mono">Future: resolveActiveWorkspace(slug | organisation | session) → Internal stays slug=unit311</text>

  <!-- Workspace-aware -->
  <rect x="56" y="728" width="860" height="300" rx="18" class="accent-panel"/>
  <text x="80" y="762" class="label">Workspace-aware tables (${parsed.workspaceAwareTables.length})</text>
  <text x="80" y="786" class="body">workspace_id NOT NULL · FK → workspaces(id) · indexed · Phase 1 default = Internal</text>
  ${awareChipSvg}
  ${
    awareChips.omitted > 0
      ? `<text x="100" y="${chipStartY + awareChips.rows.length * 36 + 24}" class="muted">+ ${awareChips.omitted} more in ${escapeXml(WORKSPACE_ARCHITECTURE_DOC_RELATIVE_PATH)}</text>`
      : ""
  }

  <!-- Internal-only -->
  <rect x="948" y="728" width="676" height="300" rx="18" class="warn-panel"/>
  <text x="972" y="762" class="label">Internal-only tables (${parsed.internalOnlyTables.length})</text>
  <text x="972" y="786" class="body">No workspace_id · never copy into customer workspaces</text>
  ${internalChipSvg}
  ${
    internalChips.omitted > 0
      ? `<text x="980" y="${chipStartY + internalChips.rows.length * 36 + 24}" class="muted">+ ${internalChips.omitted} more documented</text>`
      : `<text x="980" y="${chipStartY + internalChips.rows.length * 36 + 24}" class="muted">CRM · Discovery · Contact Forms · Internal Messaging · Staff</text>`
  }

  <!-- Footer status -->
  <rect x="56" y="1056" width="1568" height="92" rx="16" class="panel"/>
  <text x="80" y="1090" class="label">Current status (from specification)</text>
  ${renderWrappedText(80, 1118, statusSummary || "See docs/WORKSPACE_ARCHITECTURE.md current status table.", 160, 18, "body")}
</svg>
`;
}

export function createWorkspaceArchitectureDiagramArtifacts(
  cwd = process.cwd(),
): WorkspaceArchitectureDiagramArtifacts {
  const docPath = resolveWorkspaceArchitectureDocPath(cwd);
  const markdown = readFileSync(docPath, "utf8");
  const sourceDocumentMtimeMs = statSync(docPath).mtimeMs;
  const parsed = parseWorkspaceArchitectureDoc(markdown);

  const generatedAt = new Date().toISOString();
  const version = generatedAt.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const svgFileName = `${WORKSPACE_ARCHITECTURE_DIAGRAM_BASENAME}-${version}.svg`;
  const pngFileName = `${WORKSPACE_ARCHITECTURE_DIAGRAM_BASENAME}-${version}.png`;

  const svg = buildWorkspaceArchitectureSvg(parsed, {
    version,
    generatedAt,
    sourceDocumentMtimeMs,
  });

  const link: WorkspaceArchitectureLink = {
    sourceDocument: WORKSPACE_ARCHITECTURE_DOC_RELATIVE_PATH,
    sourceDocumentMtimeMs,
    version,
    generatedAt,
    svgFileName,
    pngFileName,
  };

  return {
    version,
    generatedAt,
    sourceDocument: WORKSPACE_ARCHITECTURE_DOC_RELATIVE_PATH,
    sourceDocumentMtimeMs,
    svg,
    svgFileName,
    pngFileName,
    link,
  };
}
