function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export async function programRoutes(app) {
  app.get("/api/programs", async () => {
    const registry = app.controlPlane.registries.programs;

    return {
      version: registry.version,
      generatedAt: registry.generatedAt,
      sourceRoot: registry.sourceRoot,
      total: registry.entries.length,
      counts: {
        classification: countBy(registry.entries, "classification"),
        runtime: countBy(registry.entries, "runtime"),
      },
      entries: registry.entries,
    };
  });
}

export default programRoutes;
