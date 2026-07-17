import {
  ARCHITECTURE_DIAGRAM_CATALOG,
  createBlankArchitectureDiagram,
  createPlatformOverviewDiagram,
  createStorageArchitectureDiagram,
  createVoiceAndVideoArchitectureDiagram,
  createSoftwareAssetRegisterArchitectureDiagram,
  normalizeArchitectureDiagramDocument,
  resolveSeedTemplate,
  type ArchitectureCatalogEntry,
  type ArchitectureDiagramDocument,
  type SystemArchitectureDiagram,
} from "@/lib/architecture-diagram-data";
import { ensureSystemArchitectureDiagramsTable } from "@/lib/internal-db-migrations";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

function requireSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return createSupabaseServerClient();
}

function mapRow(row: Record<string, unknown>): SystemArchitectureDiagram {
  return {
    id: String(row.id),
    sectionSlug: String(row.section_slug),
    title: String(row.title),
    diagramJson: normalizeArchitectureDiagramDocument(row.diagram_json),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function catalogEntryForSlug(sectionSlug: string): ArchitectureCatalogEntry | undefined {
  return ARCHITECTURE_DIAGRAM_CATALOG.find((entry) => entry.sectionSlug === sectionSlug);
}

export async function getArchitectureDiagramBySection(
  sectionSlug: string,
): Promise<SystemArchitectureDiagram | null> {
  await ensureSystemArchitectureDiagramsTable().catch(() => false);
  const supabase = requireSupabase();
  const slug = sectionSlug.trim().toLowerCase();
  if (!slug) return null;

  const { data, error } = await supabase
    .from("system_architecture_diagrams")
    .select("*")
    .eq("section_slug", slug)
    .maybeSingle();

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.message.includes("schema cache") ||
      error.message.includes("Could not find")
    ) {
      return null;
    }
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function listArchitectureDiagrams(): Promise<SystemArchitectureDiagram[]> {
  await ensureSystemArchitectureDiagramsTable().catch(() => false);
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("system_architecture_diagrams")
    .select("*")
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export async function upsertArchitectureDiagram(input: {
  sectionSlug: string;
  title: string;
  diagramJson: ArchitectureDiagramDocument | unknown;
}): Promise<SystemArchitectureDiagram> {
  await ensureSystemArchitectureDiagramsTable().catch(() => false);
  const supabase = requireSupabase();
  const sectionSlug = input.sectionSlug.trim().toLowerCase();
  const title = input.title.trim() || "Untitled architecture";
  const diagramJson = normalizeArchitectureDiagramDocument(input.diagramJson);
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("system_architecture_diagrams")
    .select("id")
    .eq("section_slug", sectionSlug)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await supabase
      .from("system_architecture_diagrams")
      .update({
        title,
        diagram_json: diagramJson,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("system_architecture_diagrams")
    .insert({
      section_slug: sectionSlug,
      title,
      diagram_json: diagramJson,
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function createArchitectureDiagramForSection(input: {
  sectionSlug: string;
  title?: string;
  useStorageTemplate?: boolean;
  usePlatformOverviewTemplate?: boolean;
  seedTemplate?: ArchitectureCatalogEntry["seedTemplate"];
}): Promise<SystemArchitectureDiagram> {
  const sectionSlug = input.sectionSlug.trim().toLowerCase();
  const existing = await getArchitectureDiagramBySection(sectionSlug);
  if (existing) return existing;

  const catalog = catalogEntryForSlug(sectionSlug);
  const seedTemplate =
    input.seedTemplate ??
    (input.usePlatformOverviewTemplate || sectionSlug === "platform-overview"
      ? "platform-overview"
      : input.useStorageTemplate || sectionSlug === "storage"
        ? "storage"
        : sectionSlug === "voice-and-video"
          ? "voice-and-video"
          : sectionSlug === "software-asset-register"
            ? "software-asset-register"
            : catalog?.seedTemplate ?? "blank");

  const title =
    input.title?.trim() ||
    catalog?.title ||
    (seedTemplate === "storage"
      ? "Storage Architecture"
      : seedTemplate === "platform-overview"
        ? "Platform Overview"
        : seedTemplate === "voice-and-video"
          ? "Voice & Video Architecture"
          : seedTemplate === "software-asset-register"
            ? "Software Asset Register Architecture"
            : `${sectionSlug} Architecture`);

  const diagramJson = resolveSeedTemplate(seedTemplate, title);
  return upsertArchitectureDiagram({ sectionSlug, title, diagramJson });
}

export async function ensureCoreArchitectureSeeds(): Promise<{
  storage: SystemArchitectureDiagram;
  platformOverview: SystemArchitectureDiagram;
  voiceAndVideo: SystemArchitectureDiagram;
  softwareAssetRegister: SystemArchitectureDiagram;
}> {
  const [storage, platformOverview, voiceAndVideo, softwareAssetRegister] = await Promise.all([
    createArchitectureDiagramForSection({
      sectionSlug: "storage",
      title: "Storage Architecture",
      seedTemplate: "storage",
    }),
    createArchitectureDiagramForSection({
      sectionSlug: "platform-overview",
      title: "Platform Overview",
      seedTemplate: "platform-overview",
    }),
    createArchitectureDiagramForSection({
      sectionSlug: "voice-and-video",
      title: "Voice & Video Architecture",
      seedTemplate: "voice-and-video",
    }),
    createArchitectureDiagramForSection({
      sectionSlug: "software-asset-register",
      title: "Software Asset Register Architecture",
      seedTemplate: "software-asset-register",
    }),
  ]);
  return { storage, platformOverview, voiceAndVideo, softwareAssetRegister };
}

/** Ensure the Storage Architecture seed exists (idempotent). */
export async function ensureStorageArchitectureSeed(): Promise<SystemArchitectureDiagram> {
  return createArchitectureDiagramForSection({
    sectionSlug: "storage",
    title: "Storage Architecture",
    seedTemplate: "storage",
  });
}

export async function ensurePlatformOverviewSeed(): Promise<SystemArchitectureDiagram> {
  return createArchitectureDiagramForSection({
    sectionSlug: "platform-overview",
    title: "Platform Overview",
    seedTemplate: "platform-overview",
  });
}

export function getArchitectureCatalog(): ArchitectureCatalogEntry[] {
  return [...ARCHITECTURE_DIAGRAM_CATALOG];
}

export {
  createBlankArchitectureDiagram,
  createPlatformOverviewDiagram,
  createStorageArchitectureDiagram,
  createVoiceAndVideoArchitectureDiagram,
  createSoftwareAssetRegisterArchitectureDiagram,
};
