/**
 * Regenerates public/architecture/github-architecture.{svg,png}
 * from docs/GITHUB_ARCHITECTURE.md via src/lib/github-architecture-diagram.ts.
 *
 * Usage: npm run diagram:github-architecture
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const diagramModuleUrl = pathToFileURL(
  resolve(root, "src/lib/github-architecture-diagram.ts"),
).href;

const {
  createGithubArchitectureDiagramArtifacts,
  GITHUB_ARCHITECTURE_PUBLIC_DIR,
  GITHUB_ARCHITECTURE_SVG_BASENAME,
  GITHUB_ARCHITECTURE_PNG_BASENAME,
} = await import(diagramModuleUrl);

const artifacts = createGithubArchitectureDiagramArtifacts(root);
const outDir = resolve(root, GITHUB_ARCHITECTURE_PUBLIC_DIR);
mkdirSync(outDir, { recursive: true });

const svgPath = resolve(outDir, GITHUB_ARCHITECTURE_SVG_BASENAME);
const pngPath = resolve(outDir, GITHUB_ARCHITECTURE_PNG_BASENAME);

writeFileSync(svgPath, artifacts.svg, "utf8");

const pngBuffer = await sharp(Buffer.from(artifacts.svg, "utf8"), { density: 160 }).png().toBuffer();
writeFileSync(pngPath, pngBuffer);

console.log("Regenerated GitHub architecture diagram from", artifacts.sourceDocument);
console.log(" -", svgPath);
console.log(" -", pngPath);
console.log("version", artifacts.version);
