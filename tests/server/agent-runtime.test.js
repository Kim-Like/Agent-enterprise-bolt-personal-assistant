import assert from "node:assert/strict";
import test from "node:test";

import { makeApp } from "./support.js";

test("enabled master agents can execute controlled dry-run invocations", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-runtime-");

  try {
    const [ianResult, artisanResult] = await Promise.all([
      app.controlPlane.agentManager.invoke("ian-master", {
        action: "snapshot",
      }),
      app.controlPlane.agentManager.invoke("artisan-master", {
        action: "route-work",
      }),
    ]);

    assert.equal(ianResult.accepted, true);
    assert.equal(ianResult.status, "dry-run");
    assert.equal(ianResult.agentId, "ian-master");
    assert.equal(artisanResult.accepted, true);
    assert.equal(artisanResult.status, "dry-run");
    assert.equal(artisanResult.agentId, "artisan-master");

    const persisted = app.controlPlane.db.getAgentState("ian-master");
    const artisanPersisted = app.controlPlane.db.getAgentState("artisan-master");
    assert.ok(persisted.lastRunAt);
    assert.equal(persisted.details.lastRun.action, "snapshot");
    assert.ok(artisanPersisted.lastRunAt);
    assert.equal(artisanPersisted.details.lastRun.action, "route-work");
  } finally {
    await cleanup();
  }
});

test("engineer runtime can queue work while held agents remain non-invokable", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-runtime-");

  try {
    const intake = await app.inject({
      method: "POST",
      url: "/api/tasks/intake",
      payload: {
        title: "Stabilize kanban payloads",
        summary: "Engineer should pick up the API shape work.",
        requestType: "engineering",
        sourceAgentId: "ian-master",
        requestedBy: "Operator",
      },
    });

    const taskId = intake.json().task.id;
    await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}/approve`,
    });

    const result = await app.controlPlane.agentManager.invoke("engineer", {
      action: "queue-task",
      taskId,
    });

    assert.equal(result.accepted, true);
    assert.equal(result.status, "queued");
    assert.equal(result.agentId, "engineer");

    await assert.rejects(
      () =>
        app.controlPlane.agentManager.invoke("samlino-seo-agent-task", {
          action: "snapshot",
        }),
      /not enabled/i,
    );
  } finally {
    await cleanup();
  }
});

test("agent detail and page delivery reflect runtime-aware state", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-agent-runtime-");

  try {
    const [detailResponse, pageResponse] = await Promise.all([
      app.inject("/api/agents/portfolio-pmo-task"),
      app.inject("/agents"),
    ]);

    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.json().agent.invocation.available, true);
    assert.equal(pageResponse.statusCode, 200);
    assert.match(pageResponse.body, /Enabled agents/i);
    assert.match(pageResponse.body, /Held agents/i);
  } finally {
    await cleanup();
  }
});
