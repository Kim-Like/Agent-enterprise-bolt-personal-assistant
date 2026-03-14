import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import Fastify from "fastify";

import { createAgentManager } from "./lib/agent-manager.js";
import { normalizeAgentRegistry } from "./lib/agent-registry.js";
import { loadModelCatalog } from "./lib/chat-models.js";
import { createWorkService } from "./lib/work-service.js";
import { initControlPlaneDb } from "./db/init.js";
import { loadEnv } from "./lib/env.js";
import {
  createLavprisClientAgentService,
  loadGeneratedClientAgentRegistry,
  mergeAgentRegistries,
} from "./lib/lavpris-client-agents.js";
import { createLavprisRolloutService } from "./lib/lavpris-rollout.js";
import { assetRoutes } from "./routes/assets.js";
import { agentRoutes } from "./routes/agents.js";
import { healthRoutes } from "./routes/health.js";
import { lavprisRoutes } from "./routes/lavpris.js";
import { metaRoutes } from "./routes/meta.js";
import { overviewRoutes } from "./routes/overview.js";
import { pageRoutes } from "./routes/pages.js";
import { projectRoutes } from "./routes/projects.js";
import { programRoutes } from "./routes/programs.js";
import { systemMapRoutes } from "./routes/system-map.js";
import { workRoutes } from "./routes/work.js";

const DELIVERED_PAGES = [
  {
    id: "control-plane-home",
    route: "/",
    title: "Control Plane Home",
    source: "delivery",
    file: "client/pages/index.html",
  },
  {
    id: "agents-home",
    route: "/agents",
    title: "Agent Inventory",
    source: "delivery",
    file: "client/pages/agents.html",
  },
  {
    id: "workboard-home",
    route: "/workboard",
    title: "Workboard",
    source: "delivery",
    file: "client/pages/workboard.html",
  },
];

const PROTOTYPE_PAGES = [
  {
    id: "prototype-agent-overview",
    route: "/01-agent-overview.html",
    title: "Agent Overview Prototype",
    source: "prototype",
    file: "01-agent-overview.html",
  },
  {
    id: "prototype-kanban",
    route: "/02-kanban.html",
    title: "Kanban Prototype",
    source: "prototype",
    file: "02-kanban.html",
  },
  {
    id: "prototype-program-visualisation",
    route: "/03-program-visualisation.html",
    title: "Program Visualisation Prototype",
    source: "prototype",
    file: "03-program-visualisation.html",
  },
  {
    id: "prototype-project-overview",
    route: "/04-project-overview.html",
    title: "Project Overview Prototype",
    source: "prototype",
    file: "04-project-overview.html",
  },
  {
    id: "prototype-agent-chat",
    route: "/05-agent-chat.html",
    title: "Agent Chat Prototype",
    source: "prototype",
    file: "05-agent-chat.html",
  },
  {
    id: "prototype-overview-alias",
    route: "/overview",
    title: "Agent Overview Alias",
    source: "prototype",
    file: "01-agent-overview.html",
  },
  {
    id: "prototype-programs-alias",
    route: "/programs",
    title: "Program Visualisation Alias",
    source: "prototype",
    file: "03-program-visualisation.html",
  },
  {
    id: "prototype-kanban-alias",
    route: "/kanban",
    title: "Kanban Alias",
    source: "prototype",
    file: "02-kanban.html",
  },
  {
    id: "prototype-projects-alias",
    route: "/projects",
    title: "Project Overview Alias",
    source: "prototype",
    file: "04-project-overview.html",
  },
  {
    id: "prototype-project-detail-alias",
    route: "/projects/:projectId",
    title: "Project Detail Alias",
    source: "prototype",
    file: "04-project-overview.html",
  },
  {
    id: "prototype-chat-alias",
    route: "/chat",
    title: "Agent Chat Alias",
    source: "prototype",
    file: "05-agent-chat.html",
  },
];

async function loadRegistry(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function buildPageCatalog(env) {
  return [...DELIVERED_PAGES, ...PROTOTYPE_PAGES].map((page) => ({
    ...page,
    absolutePath: path.resolve(env.cwd, page.file),
  }));
}

async function loadRegistries(env, db) {
  const [rawAgents, generatedAgents, programs] = await Promise.all([
    loadRegistry(env.agentRegistryPath),
    loadGeneratedClientAgentRegistry(env),
    loadRegistry(env.programRegistryPath),
  ]);
  const mergedAgents = mergeAgentRegistries(rawAgents, generatedAgents);
  const agents = normalizeAgentRegistry(mergedAgents, programs);

  db.snapshotRegistry("agents", agents);
  db.snapshotRegistry("lavpris-generated-agents", generatedAgents);
  db.snapshotRegistry("programs", programs);
  db.setMeta("last_registry_refresh_at", new Date().toISOString());

  return { agents, programs };
}

function syncRegistryObject(target, source) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }

  for (const [key, value] of Object.entries(source)) {
    target[key] = value;
  }

  return target;
}

export async function createApp(options = {}) {
  const env = options.env || loadEnv();
  const db = options.db || initControlPlaneDb(env);
  const registries = options.registries || (await loadRegistries(env, db));
  const modelCatalog = options.modelCatalog || (await loadModelCatalog(env));
  const pageCatalog = options.pageCatalog || buildPageCatalog(env);
  const startedAt = options.startedAt || new Date().toISOString();
  let agentManagerRef = null;
  const refreshRegistries =
    options.refreshRegistries ||
    (async () => {
      const next = await loadRegistries(env, db);
      syncRegistryObject(registries.agents, next.agents);
      syncRegistryObject(registries.programs, next.programs);

      if (agentManagerRef) {
        agentManagerRef.refreshAll();
      }

      return registries;
    });
  const lavprisRolloutService =
    options.lavprisRolloutService ||
    createLavprisRolloutService({
      env,
      db,
    });
  const workService =
    options.workService ||
    createWorkService({
      db,
      agentRegistry: registries.agents,
      modelCatalog,
      env,
      lavprisRolloutService,
      listAgentEntries() {
        return agentManagerRef ? agentManagerRef.list() : registries.agents.entries;
      },
      getAgentEntry(agentId) {
        return agentManagerRef
          ? agentManagerRef.get(agentId)
          : registries.agents.entries.find((entry) => entry.id === agentId) || null;
      },
    });
  const agentManager =
    options.agentManager ||
    createAgentManager({
      agentRegistry: registries.agents,
      programRegistry: registries.programs,
      db,
      env,
      services: {
        workService,
      },
    });
  agentManagerRef = agentManager;
  const lavprisClientAgents =
    options.lavprisClientAgents ||
    createLavprisClientAgentService({
      env,
      db,
      workService,
      refreshRegistries,
    });
  const internalApiToken =
    options.internalApiToken || env.internalApiToken || randomUUID();
  const ownDb = !options.db;

  const app = Fastify({
    logger: options.logger ?? false,
    disableRequestLogging: true,
  });

  app.decorate("controlPlane", {
    env,
    db,
    registries,
    agentManager,
    workService,
    lavprisClientAgents,
    lavprisRolloutService,
    modelCatalog,
    pageCatalog,
    startedAt,
    internalApiToken,
    refreshRegistries,
  });

  if (ownDb) {
    app.addHook("onClose", async () => {
      db.close();
    });
  }

  await agentManager.initialize();
  if (typeof workService.primeRuntimeStatus === "function") {
    await workService.primeRuntimeStatus();
  }
  if (typeof lavprisClientAgents.bootstrapGeneratedAgents === "function") {
    await lavprisClientAgents.bootstrapGeneratedAgents();
  }

  await app.register(healthRoutes);
  await app.register(metaRoutes);
  await app.register(assetRoutes);
  await app.register(pageRoutes);
  await app.register(agentRoutes);
  await app.register(overviewRoutes);
  await app.register(projectRoutes);
  await app.register(programRoutes);
  await app.register(systemMapRoutes);
  await app.register(workRoutes);
  await app.register(lavprisRoutes, {
    requireInternalAccess: true,
    internalApiToken,
  });

  return app;
}
