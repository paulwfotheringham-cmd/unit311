import { execSync } from "node:child_process";
import { existsSync, unlinkSync, writeFileSync } from "node:fs";

function api(path, method = "GET", body) {
  const args = [`npx vercel api "${path}"`];
  if (method !== "GET") args.push(`-X ${method}`);
  const inputFile = body ? ".env-provision-payload.json" : null;
  if (body) {
    writeFileSync(inputFile, JSON.stringify(body));
    args.push(`--input ${inputFile}`);
  }
  try {
    const out = execSync(args.filter(Boolean).join(" "), { encoding: "utf8" });
    const start = Math.min(...["{", "["].map((c) => out.indexOf(c)).filter((i) => i >= 0));
    return JSON.parse(out.slice(start));
  } finally {
    if (inputFile && existsSync(inputFile)) unlinkSync(inputFile);
  }
}

const sourceProject = "barcelonadronecenter";
const targetProject = "unit311central";
const key = "SUPABASE_ACCESS_TOKEN";

const source = api(`/v9/projects/${sourceProject}`);
const sourceList = api(`/v9/projects/${sourceProject}/env`);
const sourceEntry = sourceList.envs.find((e) => e.key === key && e.target.includes("production"));
if (!sourceEntry) {
  console.error(`Source project ${sourceProject} has no production ${key}.`);
  process.exit(1);
}

const sourceDetail = api(`/v1/projects/${source.id}/env/${sourceEntry.id}`);
console.log("Source entry:", {
  id: sourceEntry.id,
  type: sourceDetail.type,
  valueLength: (sourceDetail.value ?? "").length,
});

const target = api(`/v9/projects/${targetProject}`);
const targetList = api(`/v9/projects/${targetProject}/env`);
const existing = targetList.envs.find((e) => e.key === key && e.target.includes("production"));
if (existing) {
  console.log(`${key} already exists on ${targetProject}.`);
  process.exit(0);
}

const payload = {
  key,
  value: sourceDetail.value ?? "",
  type: sourceDetail.type ?? "sensitive",
  target: ["production"],
};

console.log(`Creating ${key} on ${targetProject}…`);
const created = api(`/v10/projects/${target.id}/env`, "POST", payload);
console.log("Created:", created);
