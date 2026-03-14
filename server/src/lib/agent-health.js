function buildCheck(name, status, message) {
  return { name, status, message };
}

function summarizeChecks(checks, fallback) {
  const failing = checks.find((check) => check.status === "fail");
  if (failing) {
    return failing.message;
  }

  const warned = checks.find((check) => check.status === "warn");
  if (warned) {
    return warned.message;
  }

  return fallback;
}

export function evaluateAgentHealth({
  agent,
  programRegistry,
  runtimeCatalog,
  db,
}) {
  const lastCheckedAt = new Date().toISOString();

  if (agent.enablement.state === "held") {
    return {
      status: "held",
      reason: agent.enablement.reason,
      expected: agent.health.expected,
      lastCheckedAt,
      checks: [buildCheck("policy", "pass", agent.enablement.reason)],
    };
  }

  if (agent.enablement.state === "disabled") {
    return {
      status: "disabled",
      reason: agent.enablement.reason,
      expected: agent.health.expected,
      lastCheckedAt,
      checks: [buildCheck("policy", "pass", agent.enablement.reason)],
    };
  }

  const checks = [];
  const missingFields = ["id", "name", "kind", "purpose"].filter(
    (field) => !agent[field],
  );
  checks.push(
    buildCheck(
      "registry",
      missingFields.length === 0 ? "pass" : "fail",
      missingFields.length === 0
        ? "Registry contract is complete."
        : `Missing registry fields: ${missingFields.join(", ")}.`,
    ),
  );

  const adapter = runtimeCatalog.get(agent.runtime.adapter);
  checks.push(
    buildCheck(
      "adapter",
      adapter ? "pass" : "fail",
      adapter
        ? `Adapter ${agent.runtime.adapter} is registered.`
        : `Adapter ${agent.runtime.adapter} is missing.`,
    ),
  );

  if (agent.health.probes.includes("state-store")) {
    checks.push(
      buildCheck(
        "state-store",
        db ? "pass" : "fail",
        db
          ? "SQLite-backed agent state is available."
          : "SQLite-backed agent state is unavailable.",
      ),
    );
  }

  if (agent.health.probes.includes("programs")) {
    const programIssues = agent.dependencies.programs
      .map((programId) => {
        const program = programRegistry.entries.find((entry) => entry.id === programId);
        if (!program) {
          return `Missing program dependency: ${programId}.`;
        }

        if (program.classification === "stub" || program.classification === "hold") {
          return `${program.name} is still classified as ${program.classification}.`;
        }

        return null;
      })
      .filter(Boolean);

    checks.push(
      buildCheck(
        "programs",
        programIssues.length === 0 ? "pass" : "fail",
        programIssues.length === 0
          ? "Program dependencies are activation-safe."
          : programIssues.join(" "),
      ),
    );
  }

  if (adapter?.checkHealth) {
    const adapterResult = adapter.checkHealth({ agent, db, programRegistry });
    checks.push(...(adapterResult.checks || []));
  }

  let status = agent.enablement.state === "blocked" ? "blocked" : "healthy";

  if (checks.some((check) => check.status === "fail")) {
    status = "blocked";
  } else if (checks.some((check) => check.status === "warn")) {
    status = "degraded";
  }

  return {
    status,
    reason:
      status === "healthy"
        ? agent.enablement.reason || "Agent is healthy inside the control plane."
        : summarizeChecks(checks, agent.enablement.reason),
    expected: agent.health.expected,
    lastCheckedAt,
    checks,
  };
}
