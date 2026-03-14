import { evaluateAgentHealth } from "./agent-health.js";
import { createRuntimeCatalog } from "../runtimes/index.js";

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function createAgentManager({
  agentRegistry,
  programRegistry,
  db,
  env,
  services = {},
  runtimeCatalog = createRuntimeCatalog(),
}) {
  let resolvedEntries = [];

  function resolveEntries() {
    resolvedEntries = agentRegistry.entries.map((agent) => {
      const previousState = db.getAgentState(agent.id);
      const health = evaluateAgentHealth({
        agent,
        programRegistry,
        runtimeCatalog,
        db,
      });
      const adapter = runtimeCatalog.get(agent.runtime.adapter);
      const invocationAvailable = Boolean(
        agent.runtime.executionEnabled &&
          health.status === "healthy" &&
          adapter?.canInvoke(agent),
      );

      db.upsertAgentState(agent.id, {
        enablementState: agent.enablement.state,
        healthStatus: health.status,
        adapter: agent.runtime.adapter,
        lastHealthCheckAt: health.lastCheckedAt,
        lastRunAt: previousState?.lastRunAt || null,
        lastError: previousState?.lastError || null,
        details: {
          ...(previousState?.details || {}),
          reason: health.reason,
          checks: health.checks,
          expected: health.expected,
        },
      });

      return {
        ...agent,
        health,
        invocation: {
          mode: agent.runtime.invocation,
          adapter: agent.runtime.adapter,
          available: invocationAvailable,
        },
        persistedState: db.getAgentState(agent.id),
      };
    });

    return resolvedEntries;
  }

  return {
    registry: agentRegistry,
    programRegistry,
    runtimeCatalog,
    async initialize() {
      return resolveEntries();
    },
    refreshAll() {
      return resolveEntries();
    },
    list() {
      return resolvedEntries.length > 0 ? resolvedEntries : resolveEntries();
    },
    get(agentId) {
      return this.list().find((entry) => entry.id === agentId) || null;
    },
    getHealth(agentId) {
      const entry = this.get(agentId);
      return entry ? entry.health : null;
    },
    summary() {
      const entries = this.list();

      return {
        total: entries.length,
        executionEnabled: entries.filter((entry) => entry.runtime.executionEnabled)
          .length,
        invokable: entries.filter((entry) => entry.invocation.available).length,
        byKind: countBy(entries, (entry) => entry.kind),
        byStatus: countBy(entries, (entry) => entry.status),
        byEnablement: countBy(entries, (entry) => entry.enablement.state),
        byHealth: countBy(entries, (entry) => entry.health.status),
        byAdapter: countBy(entries, (entry) => entry.runtime.adapter),
      };
    },
    listHeld() {
      return this.list().filter((entry) => entry.enablement.state === "held");
    },
    listBlocked() {
      return this.list().filter((entry) => entry.enablement.state === "blocked");
    },
    async invoke(agentId, payload = {}) {
      const entry = this.get(agentId);

      if (!entry) {
        throw new Error(`Unknown agent: ${agentId}`);
      }

      const adapter = runtimeCatalog.get(entry.runtime.adapter);
      if (!adapter) {
        throw new Error(`Unknown adapter: ${entry.runtime.adapter}`);
      }

      if (!entry.runtime.executionEnabled || !entry.invocation.available) {
        throw new Error(`${entry.id} is not enabled for invocation.`);
      }

      const result = await adapter.invoke({
        agent: entry,
        payload,
        context: {
          db,
          env,
          agentRegistry,
          programRegistry,
          runtimeCatalog,
          services,
        },
      });

      db.recordAgentRun(entry.id, {
        adapter: entry.runtime.adapter,
        ...result,
      });
      this.refreshAll();

      return result;
    },
  };
}
