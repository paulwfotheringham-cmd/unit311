import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    let key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

Object.assign(
  process.env,
  loadEnv(resolve(root, ".env.unit311central.runtime")),
  loadEnv(resolve(root, ".env.local")),
  loadEnv("C:/Users/Usuario/Desktop/telefeet/.env.local"),
);

const diagramModuleUrl = pathToFileURL(
  resolve(root, "src/lib/workspace-architecture-diagram.ts"),
).href;

const { createWorkspaceArchitectureDiagramArtifacts } = await import(diagramModuleUrl);
const artifacts = createWorkspaceArchitectureDiagramArtifacts(root);

const outDir = resolve(root, "docs/diagrams");
mkdirSync(outDir, { recursive: true });
const localSvg = resolve(outDir, artifacts.svgFileName);
const localPng = resolve(outDir, artifacts.pngFileName);
const latestSvg = resolve(outDir, "workspace-architecture.latest.svg");
const latestPng = resolve(outDir, "workspace-architecture.latest.png");
const latestLink = resolve(outDir, "workspace-architecture.link.json");

writeFileSync(localSvg, artifacts.svg, "utf8");
writeFileSync(latestSvg, artifacts.svg, "utf8");
writeFileSync(latestLink, JSON.stringify(artifacts.link, null, 2), "utf8");

const pngBuffer = await sharp(Buffer.from(artifacts.svg, "utf8"), { density: 160 }).png().toBuffer();
writeFileSync(localPng, pngBuffer);
writeFileSync(latestPng, pngBuffer);

console.log("Wrote local diagram copies:");
console.log(" -", localSvg);
console.log(" -", localPng);

const projectId = "kkxtvzxqmbacjatkiupq";
let url = process.env.SUPABASE_URL?.trim();
let key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if ((!url || !key || key.startsWith("env_") || url.length < 12) && accessToken) {
  const keysResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectId}/api-keys`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const keys = await keysResponse.json();
  if (!keysResponse.ok) throw new Error(JSON.stringify(keys));
  key = keys.find((entry) => entry.name === "service_role" || entry.id === "service_role")?.api_key;
  url = `https://${projectId}.supabase.co`;
}

if (!url || !key) {
  console.warn("Skipping Unit311 file upload — missing SUPABASE_URL / key.");
  process.exit(0);
}

const supabase = createClient(url, key);

async function ensureFolder(name, parentId) {
  let query = supabase.from("file_folders").select("*").eq("name", name).limit(1);
  query = parentId == null ? query.is("parent_id", null) : query.eq("parent_id", parentId);
  const { data: existing, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return existing;

  const { data, error: insertError } = await supabase
    .from("file_folders")
    .insert({ name, parent_id: parentId, category_id: null })
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);
  return data;
}

const rootFolder = await ensureFolder("Unit311 Details", null);
const supabaseFolder = await ensureFolder("Supabase", rootFolder.id);

async function uploadNamed(name, buffer, contentType) {
  const storagePath = `${supabaseFolder.id}/${Date.now()}-${name}`;
  const { error: uploadError } = await supabase.storage
    .from("internal-files")
    .upload(storagePath, buffer, { contentType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("file_objects")
    .insert({
      name,
      folder_id: supabaseFolder.id,
      category_id: null,
      storage_path: storagePath,
      mime_type: contentType,
      extension: name.includes(".") ? name.split(".").pop() : null,
      size_bytes: buffer.length,
    })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function upsertNamed(name, buffer, contentType) {
  const { data: existing } = await supabase
    .from("file_objects")
    .select("id, storage_path")
    .eq("folder_id", supabaseFolder.id)
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    await supabase.storage.from("internal-files").remove([existing.storage_path]);
    await supabase.from("file_objects").delete().eq("id", existing.id);
  }

  return uploadNamed(name, buffer, contentType);
}

const svgRow = await uploadNamed(
  artifacts.svgFileName,
  Buffer.from(artifacts.svg, "utf8"),
  "image/svg+xml",
);
const pngRow = await uploadNamed(artifacts.pngFileName, pngBuffer, "image/png");
await upsertNamed(
  "workspace-architecture.link.json",
  Buffer.from(JSON.stringify(artifacts.link, null, 2), "utf8"),
  "application/json",
);

const txtName = "Supabase details.txt";
const { data: existingTxt } = await supabase
  .from("file_objects")
  .select("id, storage_path")
  .eq("folder_id", supabaseFolder.id)
  .eq("name", txtName)
  .maybeSingle();

let current = "";
if (existingTxt) {
  const { data: blob } = await supabase.storage
    .from("internal-files")
    .download(existingTxt.storage_path);
  if (blob) current = await blob.text();
}

const marker = "Workspace Architecture Diagram";
const linkBlock = [
  "",
  "---",
  marker,
  `Source of truth: ${artifacts.link.sourceDocument}`,
  `Latest version: ${artifacts.link.version}`,
  `SVG: ${artifacts.link.svgFileName}`,
  `PNG: ${artifacts.link.pngFileName}`,
  `Generated at: ${artifacts.link.generatedAt}`,
  "Open via Unit311 Details → Supabase → View Architecture Diagram.",
].join("\n");

let nextContent;
if (current.includes(marker)) {
  nextContent = current.replace(
    /\n---\nWorkspace Architecture Diagram[\s\S]*?(?=\n---\n|$)/,
    linkBlock,
  );
  if (!nextContent.includes(marker)) {
    nextContent = `${current.trimEnd()}\n${linkBlock}\n`;
  }
} else if (current.trim()) {
  nextContent = `${current.trimEnd()}\n${linkBlock}\n`;
} else {
  nextContent = [
    "Unit311 Central — Supabase",
    "",
    "Production project: kkxtvzxqmbacjatkiupq (Unit311 Central).",
    "Workspace architecture technical specification: docs/WORKSPACE_ARCHITECTURE.md",
    linkBlock,
    "",
  ].join("\n");
}

await upsertNamed(txtName, Buffer.from(nextContent, "utf8"), "text/plain");

console.log("Uploaded to Unit311 Details / Supabase:");
console.log(" - svg", svgRow.id, artifacts.svgFileName);
console.log(" - png", pngRow.id, artifacts.pngFileName);
console.log(" - linked in", txtName);
