function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export async function systemMapRoutes(app) {
  app.get("/api/system-map", async () => {
    const { agentManager, db, env, pageCatalog, registries, startedAt } =
      app.controlPlane;
    const agentEntries = agentManager.list();
    const programEntries = registries.programs.entries;
    const agentSummary = agentManager.summary();

    return {
      runtime: {
        mode: "single-process-control-plane",
        processCount: 1,
        adapters: agentManager.runtimeCatalog.list(),
        host: env.host,
        port: env.port,
        publicOrigin: env.publicOrigin,
        startedAt,
      },
      storage: {
        sqlitePath: env.sqlitePath,
        snapshots: {
          agents: Boolean(db.latestSnapshot("agents")),
          programs: Boolean(db.latestSnapshot("programs")),
        },
      },
      inventory: {
        agents: {
          total: agentEntries.length,
          byKind: countBy(agentEntries, "kind"),
          byEnablement: agentSummary.byEnablement,
          byHealth: agentSummary.byHealth,
          byAdapter: agentSummary.byAdapter,
          byRuntimeMode: agentEntries.reduce((counts, entry) => {
            const mode = entry.runtime.adapter;
            counts[mode] = (counts[mode] || 0) + 1;
            return counts;
          }, {}),
        },
        programs: {
          total: programEntries.length,
          byClassification: countBy(programEntries, "classification"),
        },
      },
      brownfieldHolds: {
        agents: agentManager.listHeld().map((entry) => ({
          id: entry.id,
          name: entry.name,
          reason: entry.enablement.reason,
        })),
        programs: programEntries
          .filter((entry) => entry.classification === "hold")
          .map((entry) => ({
            id: entry.id,
            name: entry.name,
            reason: entry.notes,
          })),
      },
      entrypoints: {
        local: env.publicOrigin,
        startupCommand: "./scripts/start.sh",
        tailscaleCommand: "./scripts/tailscale-serve.sh",
        pages: pageCatalog.map((page) => ({
          title: page.title,
          route: page.route,
          source: page.source,
        })),
      },
    };
  });
}

export default systemMapRoutes;
