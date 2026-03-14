import assert from "node:assert/strict";
import test from "node:test";

import { makeApp } from "./support.js";

function column(payload, id) {
  return payload.columns.find((entry) => entry.id === id);
}

test("engineering intake creates an Accepted task with a review thread", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-workflow-");

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/tasks/intake",
      payload: {
        title: "Refactor dashboard filters",
        summary: "Lavprishjemmeside needs the overview filters cleaned up.",
        requestType: "engineering",
        sourceAgentId: "lavprishjemmeside-master",
        requestedBy: "Operator",
        sourceThread: {
          title: "Lavpris dashboard review",
          message: "Please route this frontend task into engineering.",
        },
      },
    });

    assert.equal(response.statusCode, 201);

    const payload = response.json();
    assert.equal(payload.accepted, true);
    assert.equal(payload.task.stage, "accepted");
    assert.equal(payload.task.approvalState, "pending_approval");
    assert.equal(payload.task.engineerThreadId, null);
    assert.equal(payload.task.activeThreadMode, "review");
    assert.equal(
      payload.task.chatHref,
      `/chat/lavprishjemmeside-master?task=${payload.task.id}`,
    );

    const [kanbanResponse, workspaceResponse] = await Promise.all([
      app.inject("/api/kanban"),
      app.inject(
        `/api/chat/agents/lavprishjemmeside-master/workspace?taskId=${payload.task.id}`,
      ),
    ]);

    assert.equal(kanbanResponse.statusCode, 200);
    assert.equal(column(kanbanResponse.json(), "accepted").count, 1);

    assert.equal(workspaceResponse.statusCode, 200);
    assert.equal(workspaceResponse.json().activeSession.session.sessionType, "task_review");
    assert.equal(
      workspaceResponse.json().activeSession.linkedTask.availableActions.approve,
      true,
    );
  } finally {
    await cleanup();
  }
});

test("non-engineering intake does not create Kanban items", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-workflow-");

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/tasks/intake",
      payload: {
        title: "Summarize campaign results",
        summary: "This is a marketing summary request, not an engineering task.",
        requestType: "marketing",
        sourceAgentId: "artisan-master",
        requestedBy: "Operator",
      },
    });

    assert.equal(response.statusCode, 202);
    assert.equal(response.json().accepted, false);

    const kanbanResponse = await app.inject("/api/kanban");
    assert.equal(column(kanbanResponse.json(), "accepted").count, 0);
  } finally {
    await cleanup();
  }
});

test("approval queues engineer work and engineer-only transitions enforce the board flow", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-workflow-");

  try {
    const intake = await app.inject({
      method: "POST",
      url: "/api/tasks/intake",
      payload: {
        title: "Wire live Kanban board",
        summary: "Move the demo board onto real task APIs.",
        requestType: "engineering",
        sourceAgentId: "ian-master",
        requestedBy: "Operator",
      },
    });

    const taskId = intake.json().task.id;
    const approval = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}/approve`,
    });

    assert.equal(approval.statusCode, 200);
    assert.equal(approval.json().task.stage, "accepted");
    assert.equal(
      approval.json().task.approvalState,
      "approved_waiting_for_engineer",
    );
    assert.equal(approval.json().queueResult.status, "queued");
    assert.ok(approval.json().task.engineerThreadId);
    assert.equal(
      approval.json().task.chatHref,
      `/chat/engineer?task=${taskId}`,
    );

    const forbidden = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}/engineer-transition`,
      payload: { targetStage: "planned" },
    });

    assert.equal(forbidden.statusCode, 403);

    for (const targetStage of [
      "planned",
      "in_development",
      "testing",
      "completed",
    ]) {
      const transition = await app.inject({
        method: "POST",
        url: `/api/tasks/${taskId}/engineer-transition`,
        headers: {
          "x-control-plane-token": app.controlPlane.internalApiToken,
        },
        payload: {
          targetStage,
          message: `Engineer moved work to ${targetStage}.`,
        },
      });

      assert.equal(transition.statusCode, 200);
      assert.equal(transition.json().task.stage, targetStage);
    }

    const [detail, engineerWorkspace] = await Promise.all([
      app.inject(`/api/tasks/${taskId}`),
      app.inject(`/api/chat/agents/engineer/workspace?taskId=${taskId}`),
    ]);
    assert.equal(detail.statusCode, 200);
    assert.equal(detail.json().task.stage, "completed");
    assert.equal(detail.json().task.events.at(-1).payload.toStage, "completed");
    assert.equal(engineerWorkspace.statusCode, 200);
    assert.equal(
      engineerWorkspace.json().activeSession.session.sessionType,
      "task_delivery",
    );
  } finally {
    await cleanup();
  }
});

test("direct engineer intake bypasses Accepted and opens the engineer thread immediately", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-workflow-");

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/tasks/intake",
      payload: {
        title: "Implement task deep links",
        summary: "Create a direct engineer-owned task from the main chat lane.",
        requestType: "engineering",
        sourceAgentId: "engineer",
        requestedBy: "Operator",
      },
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json().task.stage, "planned");
    assert.equal(response.json().task.approvalState, "not_required");
    assert.ok(response.json().task.engineerThreadId);
    assert.equal(
      response.json().task.chatHref,
      `/chat/engineer?task=${response.json().task.id}`,
    );

    const workspace = await app.inject(
      `/api/chat/agents/engineer/workspace?taskId=${response.json().task.id}`,
    );
    assert.equal(workspace.statusCode, 200);
    assert.equal(workspace.json().activeSession.session.sessionType, "task_delivery");
  } finally {
    await cleanup();
  }
});

test("kanban and chat prototypes are wired to live workspace assets instead of placeholder content", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-workflow-");

  try {
    const [kanbanPage, chatPage, agentChatPage] = await Promise.all([
      app.inject("/kanban"),
      app.inject("/chat"),
      app.inject("/chat/engineer"),
    ]);

    assert.equal(kanbanPage.statusCode, 200);
    assert.match(kanbanPage.body, /\/assets\/kanban\.js/);
    assert.match(kanbanPage.body, /Accepted through Completed/i);
    assert.doesNotMatch(kanbanPage.body, /Budget Hold/i);

    assert.equal(chatPage.statusCode, 200);
    assert.match(chatPage.body, /\/assets\/chat\.js/);
    assert.match(chatPage.body, /Loading agent chat workspaces/i);
    assert.doesNotMatch(chatPage.body, /Zeb Evans/i);

    assert.equal(agentChatPage.statusCode, 200);
    assert.match(agentChatPage.body, /\/assets\/chat\.js/);
  } finally {
    await cleanup();
  }
});
