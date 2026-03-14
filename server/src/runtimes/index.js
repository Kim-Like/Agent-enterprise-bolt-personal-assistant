function buildCheck(name, status, message) {
  return { name, status, message };
}

function buildDryRunHandler(label) {
  return async ({ agent, payload }) => ({
    accepted: true,
    status: "dry-run",
    agentId: agent.id,
    label,
    action: payload.action || "inspect",
    summary: `${agent.name} completed a dry-run ${payload.action || "inspect"} action.`,
    singleProcess: true,
    timestamp: new Date().toISOString(),
  });
}

async function handleEngineerRuntime({ agent, payload, context }) {
  const workService = context.services?.workService;

  if (payload.action === "queue-task") {
    if (!workService?.getTask(payload.taskId)) {
      throw new Error(`Unknown task: ${payload.taskId}`);
    }

    return {
      accepted: true,
      status: "queued",
      agentId: agent.id,
      action: payload.action,
      taskId: payload.taskId,
      summary: `${agent.name} accepted task ${payload.taskId} into its planning queue.`,
      singleProcess: true,
      timestamp: new Date().toISOString(),
    };
  }

  if (payload.action === "transition-task") {
    if (!workService) {
      throw new Error("Work service is not available for engineer transitions.");
    }

    const task = await workService.engineerTransitionTask(payload.taskId, {
      actorId: agent.id,
      targetStage: payload.targetStage,
      message: payload.message,
      releaseChecklist: payload.releaseChecklist,
    });

    return {
      accepted: true,
      status: "applied",
      agentId: agent.id,
      action: payload.action,
      taskId: payload.taskId,
      stage: task.stage,
      threadId: task.engineerThreadId,
      summary: `${agent.name} moved task ${payload.taskId} to ${task.stage}.`,
      singleProcess: true,
      timestamp: new Date().toISOString(),
    };
  }

  return buildDryRunHandler("platform")({ agent, payload, context });
}

const HANDLERS = {
  "agent:ian-master": buildDryRunHandler("governance"),
  "agent:artisan-master": buildDryRunHandler("artisan-orchestration"),
  "agent:baltzer-master": buildDryRunHandler("baltzer-orchestration"),
  "agent:lavprishjemmeside-master": buildDryRunHandler(
    "lavprishjemmeside-orchestration",
  ),
  "agent:personal-assistant-master": buildDryRunHandler("personal-ops"),
  "agent:samlino-master": buildDryRunHandler("samlino-orchestration"),
  "agent:data-observability-task": buildDryRunHandler("observability"),
  "agent:automation-quality-task": buildDryRunHandler("quality"),
  "agent:portfolio-pmo-task": buildDryRunHandler("planning"),
  "agent:engineer": handleEngineerRuntime,
  "agent:platform-reliability-task": buildDryRunHandler("reliability"),
};

function createRegistryOnlyAdapter() {
  return {
    id: "registry-only",
    description: "Read-only registry record without invocation capability.",
    inProcess: true,
    canInvoke() {
      return false;
    },
    checkHealth() {
      return {
        checks: [
          buildCheck(
            "adapter-runtime",
            "pass",
            "Registry-only adapter keeps the agent visible without enabling execution.",
          ),
        ],
      };
    },
    async invoke({ agent }) {
      throw new Error(`${agent.id} does not expose an invokable runtime.`);
    },
  };
}

function createInProcessFunctionAdapter() {
  return {
    id: "in-process-function",
    description: "Single-process function adapter backed by local handlers.",
    inProcess: true,
    canInvoke(agent) {
      return Boolean(HANDLERS[agent.runtime.entry]);
    },
    checkHealth({ agent }) {
      const hasHandler = Boolean(HANDLERS[agent.runtime.entry]);

      return {
        checks: [
          buildCheck(
            "adapter-runtime",
            hasHandler ? "pass" : "fail",
            hasHandler
              ? `In-process handler ${agent.runtime.entry} is available.`
              : `Missing in-process handler ${agent.runtime.entry}.`,
          ),
        ],
      };
    },
    async invoke({ agent, payload, context }) {
      const handler = HANDLERS[agent.runtime.entry];

      if (!handler) {
        throw new Error(`Missing handler for ${agent.runtime.entry}.`);
      }

      return handler({ agent, payload, context });
    },
  };
}

function createConnectorProbeAdapter() {
  return {
    id: "connector-probe",
    description: "Dependency-only adapter that never starts execution.",
    inProcess: true,
    canInvoke() {
      return false;
    },
    checkHealth({ agent }) {
      return {
        checks: [
          buildCheck(
            "adapter-runtime",
            "pass",
            `${agent.name} is staged behind a connector probe and cannot invoke yet.`,
          ),
        ],
      };
    },
    async invoke({ agent }) {
      throw new Error(`${agent.id} is blocked until its dependencies are active.`);
    },
  };
}

export function createRuntimeCatalog() {
  const adapters = {
    "registry-only": createRegistryOnlyAdapter(),
    "in-process-function": createInProcessFunctionAdapter(),
    "connector-probe": createConnectorProbeAdapter(),
  };

  return {
    get(id) {
      return adapters[id] || null;
    },
    list() {
      return Object.values(adapters).map((adapter) => ({
        id: adapter.id,
        description: adapter.description,
        inProcess: adapter.inProcess,
      }));
    },
  };
}
