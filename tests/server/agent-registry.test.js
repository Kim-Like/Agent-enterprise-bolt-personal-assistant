import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { normalizeAgentRegistry } from "../../server/src/lib/agent-registry.js";
import { makeApp, rootDir } from "./support.js";

test("registry normalization upgrades the phase 2 activation model", async () => {
  const [rawAgents, programs] = await Promise.all([
    readFile(path.join(rootDir, "agents/registry.json"), "utf8"),
    readFile(path.join(rootDir, "programs/registry.json"), "utf8"),
  ]);

  const registry = normalizeAgentRegistry(
    JSON.parse(rawAgents),
    JSON.parse(programs),
  );

  assert.equal(registry.schemaVersion, 2);
  assert.equal(registry.sourceRoot, "agents");
  assert.equal(registry.runtimePolicy.defaultAdapter, "registry-only");
  assert.ok(registry.entries.every((entry) => !entry.sourcePath.includes("agents copy")));

  const enabled = registry.entries.find((entry) => entry.id === "ian-master");
  const artisan = registry.entries.find((entry) => entry.id === "artisan-master");
  const held = registry.entries.find((entry) => entry.id === "samlino-seo-agent-task");
  const blocked = registry.entries.find(
    (entry) => entry.id === "baltzer-shopify-core-task",
  );

  assert.equal(enabled.enablement.state, "enabled");
  assert.equal(enabled.runtime.adapter, "in-process-function");
  assert.equal(artisan.enablement.state, "enabled");
  assert.equal(artisan.runtime.entry, "agent:artisan-master");
  assert.equal(held.enablement.state, "held");
  assert.equal(blocked.enablement.state, "blocked");
  assert.ok(blocked.dependencies.programs.includes("baltzer-shopify"));
});

test("app bootstrap persists normalized agent runtime state", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-registry-");

  try {
    const states = app.controlPlane.db.listAgentStates();
    const runtimeState = states.find((state) => state.agentId === "ian-master");

    assert.equal(states.length, app.controlPlane.registries.agents.entries.length);
    assert.equal(runtimeState.enablementState, "enabled");
    assert.equal(runtimeState.adapter, "in-process-function");
    assert.equal(runtimeState.healthStatus, "healthy");
  } finally {
    await cleanup();
  }
});
