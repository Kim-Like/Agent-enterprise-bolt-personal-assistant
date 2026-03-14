import assert from "node:assert/strict";
import test from "node:test";

import { makeApp } from "./support.js";

test("agent manager summarizes phase 2 enablement and health states", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-health-");

  try {
    const summary = app.controlPlane.agentManager.summary();

    assert.ok(summary.byEnablement.enabled >= 4);
    assert.ok(summary.byEnablement.held >= 2);
    assert.ok(summary.byHealth.healthy >= 4);
    assert.ok(summary.byHealth.held >= 2);
    assert.equal(summary.byAdapter["in-process-function"] >= 1, true);
  } finally {
    await cleanup();
  }
});

test("held and blocked agents expose the expected health states", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-health-");

  try {
    const held = app.controlPlane.agentManager.get("samlino-seo-agent-task");
    const blocked = app.controlPlane.agentManager.get("baltzer-shopify-core-task");

    assert.equal(held.health.status, "held");
    assert.equal(blocked.health.status, "blocked");
    assert.match(blocked.health.reason, /stub/i);
  } finally {
    await cleanup();
  }
});

test("health route exposes runtime-aware agent summaries", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-health-");

  try {
    const response = await app.inject("/health");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.ok(payload.agents.byEnablement.enabled >= 1);
    assert.ok(payload.agents.byHealth.healthy >= 1);
    assert.ok(payload.agents.held >= 1);
  } finally {
    await cleanup();
  }
});
