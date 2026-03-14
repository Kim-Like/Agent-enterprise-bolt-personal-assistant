import { toAgentListItem } from "../lib/agent-view-model.js";

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export async function agentRoutes(app) {
  app.get("/api/agents", async () => {
    const registry = app.controlPlane.registries.agents;
    const summary = app.controlPlane.agentManager.summary();
    const entries = app.controlPlane.agentManager.list().map(toAgentListItem);

    return {
      version: registry.version,
      schemaVersion: registry.schemaVersion,
      generatedAt: registry.generatedAt,
      sourceRoot: registry.sourceRoot,
      total: entries.length,
      counts: {
        kind: countBy(entries, "kind"),
        status: countBy(entries, "status"),
        enablement: summary.byEnablement,
        health: summary.byHealth,
        adapters: summary.byAdapter,
        executionEnabled: summary.executionEnabled,
        invokable: summary.invokable,
      },
      capabilityTemplates: registry.capabilityTemplates,
      entries,
    };
  });

  app.get("/api/agents/:agentId", async (request, reply) => {
    const entry = app.controlPlane.agentManager.get(request.params.agentId);

    if (!entry) {
      return reply.code(404).send({ error: "Unknown agent" });
    }

    return {
      agent: {
        ...toAgentListItem(entry),
        health: entry.health,
        persistedState: entry.persistedState,
      },
    };
  });
}

export default agentRoutes;
