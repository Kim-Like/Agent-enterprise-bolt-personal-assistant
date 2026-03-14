import assert from "node:assert/strict";
import test from "node:test";
import { makeApp } from "./support.js";

test("agents inventory stays read-only and exposes phase 2 runtime state", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-registry-");

  try {
    const response = await app.inject("/api/agents");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.ok(payload.total >= 40);
    assert.equal(payload.schemaVersion, 2);
    assert.ok(payload.counts.executionEnabled >= 1);
    assert.ok(payload.counts.enablement.enabled >= 1);
    assert.ok(payload.counts.health.healthy >= 1);
    assert.ok(payload.entries.some((entry) => entry.enablement.state === "held"));
    assert.ok(
      payload.entries.some((entry) => entry.runtime.adapter === "in-process-function"),
    );

    const writeAttempt = await app.inject({
      method: "POST",
      url: "/api/agents",
      payload: { id: "noop" },
    });
    assert.equal(writeAttempt.statusCode, 404);
  } finally {
    await cleanup();
  }
});

test("program inventory classifies active, remote, hold, and stub modules", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-registry-");

  try {
    const response = await app.inject("/api/programs");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.ok(payload.counts.classification.active >= 1);
    assert.ok(payload.counts.classification.remote >= 1);
    assert.ok(payload.counts.classification.hold >= 1);
    assert.ok(payload.counts.classification.stub >= 1);
  } finally {
    await cleanup();
  }
});

test("system map reports one process, registry snapshots, and brownfield holds", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-registry-");

  try {
    const response = await app.inject("/api/system-map");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.equal(payload.runtime.processCount, 1);
    assert.equal(payload.storage.snapshots.agents, true);
    assert.equal(payload.storage.snapshots.programs, true);
    assert.ok(payload.runtime.adapters.length >= 3);
    assert.ok(payload.brownfieldHolds.agents.length >= 1);
    assert.ok(payload.brownfieldHolds.programs.length >= 1);
    assert.equal(payload.entrypoints.startupCommand, "./scripts/start.sh");
  } finally {
    await cleanup();
  }
});

test("agent detail route exposes health checks and persisted state", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-registry-");

  try {
    const response = await app.inject("/api/agents/ian-master");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.equal(payload.agent.id, "ian-master");
    assert.equal(payload.agent.enablement.state, "enabled");
    assert.ok(payload.agent.health.checks.length >= 1);
    assert.equal(payload.agent.persistedState.enablementState, "enabled");
  } finally {
    await cleanup();
  }
});
