export async function healthRoutes(app) {
  app.get("/health", async () => {
    const { agentManager, db, env, registries, startedAt } = app.controlPlane;
    const uptimeMs = Date.now() - Date.parse(startedAt);
    const summary = agentManager.summary();

    return {
      status: "ok",
      app: env.appName,
      mode: "single-process-control-plane",
      startedAt,
      uptimeMs,
      storage: {
        sqlitePath: db.sqlitePath,
        connected: true,
      },
      inventory: {
        agents: registries.agents.entries.length,
        programs: registries.programs.entries.length,
      },
      agents: {
        enabled: summary.byEnablement.enabled || 0,
        ready: summary.byEnablement.ready || 0,
        blocked: summary.byEnablement.blocked || 0,
        held: summary.byEnablement.held || 0,
        byEnablement: summary.byEnablement,
        byHealth: summary.byHealth,
        invokable: summary.invokable,
      },
    };
  });
}

export default healthRoutes;
