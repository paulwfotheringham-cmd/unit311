/**
 * Regenerates public/architecture/vercel-architecture.{svg,png}
 * from docs/VERCEL_ARCHITECTURE.md via src/lib/vercel-architecture-diagram.ts.
 *
 * Usage: npm run diagram:vercel-architecture
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const diagramModuleUrl = pathToFileURL(
  resolve(root, "src/lib/vercel-architecture-diagram.ts"),
).href;

const {
  createVercelArchitectureDiagramArtifacts,
  VERCEL_ARCHITECTURE_PUBLIC_DIR,
  VERCEL_ARCHITECTURE_SVG_BASENAME,
  VERCEL_ARCHITECTURE_PNG_BASENAME,
} = await import(diagramModuleUrl);

const artifacts = createVercelArchitectureDiagramArtifacts(root);
const outDir = resolve(root, VERCEL_ARCHITECTURE_PUBLIC_DIR);
mkdirSync(outDir, { recursive: true });

const svgPath = resolve(outDir, VERCEL_ARCHITECTURE_SVG_BASENAME);
const pngPath = resolve(outDir, VERCEL_ARCHITECTURE_PNG_BASENAME);

writeFileSync(svgPath, artifacts.svg, "utf8");

const pngBuffer = await sharp(Buffer.from(artifacts.svg, "utf8"), { density: 160 }).png().toBuffer();
writeFileSync(pngPath, pngBuffer);

console.log("Regenerated Vercel architecture diagram from", artifacts.sourceDocument);
console.log(" -", svgPath);
console.log(" -", pngPath);
console.log("version", artifacts.version);
