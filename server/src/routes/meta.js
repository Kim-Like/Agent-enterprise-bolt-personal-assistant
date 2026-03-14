function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export async function metaRoutes(app) {
  app.get("/api/meta", async () => {
    const { agentManager, db, env, pageCatalog, registries, startedAt } =
      app.controlPlane;
    const agentSummary = agentManager.summary();

    return {
      app: {
        name: env.appName,
        environment: env.appEnv,
        runtime: "single-process-node",
        frontendMode: "backend-served-static",
        sameOrigin: true,
        startedAt,
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        logLevel: env.logLevel,
      },
      storage: {
        appDataDir: env.appDataDir,
        sqlitePath: env.sqlitePath,
        lastBootAt: db.getMeta("last_boot_at"),
        lastRegistryRefreshAt: db.getMeta("last_registry_refresh_at"),
      },
      inventory: {
        agents: registries.agents.entries.length,
        agentEnablement: agentSummary.byEnablement,
        agentHealth: agentSummary.byHealth,
        programs: registries.programs.entries.length,
        programClassification: countBy(
          registries.programs.entries,
          "classification",
        ),
      },
      pages: pageCatalog.map((page) => ({
        id: page.id,
        title: page.title,
        route: page.route,
        source: page.source,
      })),
      operations: {
        localStartCommand: "./scripts/start.sh",
        tailscaleStartCommand: "./scripts/tailscale-serve.sh",
        publicOrigin: env.publicOrigin,
      },
    };
  });
}

export default metaRoutes;
