async function main() {
  const details = await fetch("https://unit311central.com/api/unit311-details", {
    cache: "no-store",
  });
  const detailsJson = await details.json().catch(() => null);
  console.log("details", details.status, {
    error: detailsJson?.error ?? null,
    categoryCount: detailsJson?.categories?.length ?? null,
    hasPlatform: Boolean(
      detailsJson?.categories?.some((c) => c.id === "platform-overview"),
    ),
    hasStorage: Boolean(detailsJson?.categories?.some((c) => c.id === "storage")),
  });

  // Wait a moment for ensureCoreArchitectureSeeds fire-and-forget.
  await new Promise((r) => setTimeout(r, 2500));

  const arch = await fetch(
    "https://unit311central.com/api/architecture-diagrams?section=platform-overview&catalog=1",
    { cache: "no-store" },
  );
  const archJson = await arch.json().catch(() => null);
  console.log("arch platform", arch.status, {
    error: archJson?.error ?? null,
    hasDiagram: Boolean(archJson?.diagram),
    title: archJson?.diagram?.title ?? null,
    nodeCount: archJson?.diagram?.diagramJson?.nodes?.length ?? null,
    catalogCount: archJson?.catalog?.length ?? null,
  });

  const storage = await fetch(
    "https://unit311central.com/api/architecture-diagrams?section=storage",
    { cache: "no-store" },
  );
  const storageJson = await storage.json().catch(() => null);
  console.log("arch storage", storage.status, {
    error: storageJson?.error ?? null,
    hasDiagram: Boolean(storageJson?.diagram),
    title: storageJson?.diagram?.title ?? null,
    nodeCount: storageJson?.diagram?.diagramJson?.nodes?.length ?? null,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
