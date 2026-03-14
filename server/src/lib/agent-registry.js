const INTERNAL_DEPENDENCY_KEYS = new Set([
  "queue",
  "registry",
  "execution-history",
  "control-plane",
  "logs",
  "health-checks",
  "docs",
  "context",
  "metrics",
  "dashboards",
  "checklists",
  "workspace",
  "specs",
  "prototype-tools",
  "schema-tools",
  "research-data",
  "content-data",
  "seo-data",
  "search-console-data",
  "customer-segments",
  "campaigns",
]);

const DEFAULT_PROGRAM_ALIASES = {
  shopify: ["baltzer-shopify"],
  "event-platform": ["baltzer-event-management-platform"],
  "workforce-api": ["baltzer-employee-schedule-salary-api"],
  "seo-agent-playground": ["samlino-seo-agent-playground"],
};

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function mergeEntryOverride(entry, override = {}) {
  return {
    ...entry,
    ...override,
    runtime: {
      ...(entry.runtime || {}),
      ...(override.runtime || {}),
    },
    enablement: override.enablement
      ? {
          ...(entry.enablement || {}),
          ...override.enablement,
        }
      : entry.enablement,
    health: override.health
      ? {
          ...(entry.health || {}),
          ...override.health,
        }
      : entry.health,
    dependencyRefs: override.dependencyRefs
      ? {
          ...(entry.dependencyRefs || {}),
          ...override.dependencyRefs,
        }
      : entry.dependencyRefs,
  };
}

function buildProgramAliasMap(rawRegistry) {
  const programAliases = {
    ...DEFAULT_PROGRAM_ALIASES,
    ...(rawRegistry.dependencyAliases?.programs || {}),
  };

  return new Map(
    Object.entries(programAliases).map(([key, value]) => [
      key,
      Array.isArray(value) ? value : [value],
    ]),
  );
}

function resolveReportingRefs(agent) {
  if (agent.parentId === "artisan-master" || agent.sourcePath.includes("/artisan/")) {
    return ["artisan-reporting"];
  }

  if (agent.parentId === "baltzer-master" || agent.sourcePath.includes("/baltzer/")) {
    return ["baltzer-reporting"];
  }

  return ["artisan-reporting", "baltzer-reporting"];
}

function resolveProgramRefs(agent, dependency, programIds, aliasMap) {
  if (programIds.has(dependency)) {
    return [dependency];
  }

  if (dependency === "reporting") {
    return resolveReportingRefs(agent).filter((programId) => programIds.has(programId));
  }

  return (aliasMap.get(dependency) || []).filter((programId) => programIds.has(programId));
}

function classifyDependencies(agent, agentIds, programIds, aliasMap) {
  const baseRefs = {
    agents: uniqueStrings([agent.parentId]),
    programs: [],
    connectors: [],
    internal: [],
    unresolved: [],
  };

  for (const dependency of uniqueStrings(agent.dependencies || [])) {
    if (agentIds.has(dependency)) {
      baseRefs.agents.push(dependency);
      continue;
    }

    if (INTERNAL_DEPENDENCY_KEYS.has(dependency)) {
      baseRefs.internal.push(dependency);
      continue;
    }

    const programRefs = resolveProgramRefs(agent, dependency, programIds, aliasMap);
    if (programRefs.length > 0) {
      baseRefs.programs.push(...programRefs);
      continue;
    }

    baseRefs.connectors.push(dependency);
  }

  if (agent.dependencyRefs) {
    for (const key of Object.keys(baseRefs)) {
      baseRefs[key] = baseRefs[key].concat(agent.dependencyRefs[key] || []);
    }
  }

  return {
    agents: uniqueStrings(baseRefs.agents),
    programs: uniqueStrings(baseRefs.programs),
    connectors: uniqueStrings(baseRefs.connectors),
    internal: uniqueStrings(baseRefs.internal),
    unresolved: uniqueStrings(baseRefs.unresolved),
  };
}

function normalizeEnablement(agent) {
  const explicit = agent.enablement || {};

  if (explicit.state) {
    return {
      state: explicit.state,
      reason: explicit.reason || "Phase 2 explicit activation policy.",
      activationOrder: explicit.activationOrder ?? null,
      updatedForPhase: 2,
    };
  }

  if (agent.status === "legacy-hold" || agent.heavyDependencyRisk) {
    return {
      state: "held",
      reason: agent.notes || "Held by legacy or heavy dependency policy.",
      activationOrder: null,
      updatedForPhase: 2,
    };
  }

  if (agent.status === "pending") {
    return {
      state: "blocked",
      reason: agent.notes || "Blocked until backing dependencies are live.",
      activationOrder: null,
      updatedForPhase: 2,
    };
  }

  return {
    state: "disabled",
    reason: "Not part of the first controlled activation set.",
    activationOrder: null,
    updatedForPhase: 2,
  };
}

function inferAdapter(agent, enablement) {
  if (agent.runtime?.adapter) {
    return agent.runtime.adapter;
  }

  if (enablement.state === "enabled" || enablement.state === "ready") {
    return "in-process-function";
  }

  if (enablement.state === "blocked") {
    return "connector-probe";
  }

  return "registry-only";
}

function inferRuntimeEntry(agent) {
  return `agent:${agent.id}`;
}

function inferHealthProbes(agent, enablement) {
  if (agent.health?.probes) {
    return uniqueStrings(agent.health.probes);
  }

  const probes = ["registry", "adapter"];

  if (enablement.state !== "disabled" && enablement.state !== "held") {
    probes.push("state-store");
  }

  return probes;
}

export function normalizeAgentRegistry(rawRegistry, programRegistry = { entries: [] }) {
  if (!rawRegistry || !Array.isArray(rawRegistry.entries)) {
    throw new Error("Agent registry must define an entries array.");
  }

  const agentIds = new Set(rawRegistry.entries.map((entry) => entry.id));
  const programIds = new Set((programRegistry.entries || []).map((entry) => entry.id));
  const aliasMap = buildProgramAliasMap(rawRegistry);
  const overrides = rawRegistry.agentOverrides || {};

  const entries = rawRegistry.entries.map((entry, index) => {
    const merged = mergeEntryOverride(entry, overrides[entry.id]);
    const enablement = normalizeEnablement(merged);
    const dependencies = classifyDependencies(merged, agentIds, programIds, aliasMap);
    const runtime = {
      mode: merged.runtime?.mode || rawRegistry.runtimePolicy?.defaultMode || "function",
      transport: merged.runtime?.transport || "http-in-process",
      adapter: inferAdapter(merged, enablement),
      entry: merged.runtime?.entry || inferRuntimeEntry(merged),
      invocation:
        merged.runtime?.invocation ||
        (enablement.state === "enabled" || enablement.state === "ready"
          ? "manual"
          : "none"),
      allowChildProcess: Boolean(merged.runtime?.allowChildProcess),
      executionEnabled: enablement.state === "enabled",
    };
    const health = {
      expected:
        merged.health?.expected ||
        (enablement.state === "held"
          ? "held"
          : enablement.state === "disabled"
            ? "disabled"
            : "healthy"),
      probes: inferHealthProbes(merged, enablement),
      manualChecks: uniqueStrings(merged.health?.manualChecks || []),
    };

    return {
      ...merged,
      sequence: index + 1,
      legacyDependencies: uniqueStrings(merged.dependencies || []),
      dependencies,
      runtime,
      enablement,
      health,
      policy: {
        mergeCandidate: Boolean(merged.mergeCandidate),
        heavyDependencyRisk: Boolean(merged.heavyDependencyRisk),
        hold: enablement.state === "held",
        singleProcessOnly: true,
        allowChildProcess: runtime.allowChildProcess,
      },
    };
  });

  return {
    version: rawRegistry.version || 2,
    schemaVersion: rawRegistry.schemaVersion || 2,
    generatedAt: rawRegistry.generatedAt,
    sourceRoot: rawRegistry.sourceRoot,
    runtimePolicy: {
      defaultMode: rawRegistry.runtimePolicy?.defaultMode || "function",
      defaultAdapter: rawRegistry.runtimePolicy?.defaultAdapter || "registry-only",
      defaultInvocation: rawRegistry.runtimePolicy?.defaultInvocation || "none",
      executionEnabled: false,
      singleProcessOnly: true,
      notes: uniqueStrings(rawRegistry.runtimePolicy?.notes || []),
    },
    capabilityTemplates: rawRegistry.capabilityTemplates || [],
    agentOverrides: rawRegistry.agentOverrides || {},
    entries,
  };
}
