import assert from "node:assert/strict";
import test from "node:test";
import { makeApp } from "./support.js";

test("health route exposes single-process bootstrap", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-delivery-");

  try {
    const response = await app.inject("/health");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.equal(payload.status, "ok");
    assert.equal(payload.mode, "single-process-control-plane");
    assert.ok(payload.inventory.agents > 0);
    assert.ok(payload.inventory.programs > 0);
    assert.ok(payload.agents.enabled >= 1);
  } finally {
    await cleanup();
  }
});

test("meta route reports same-origin page delivery", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-delivery-");

  try {
    const response = await app.inject("/api/meta");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.equal(payload.app.frontendMode, "backend-served-static");
    assert.equal(payload.app.sameOrigin, true);
    assert.ok(payload.pages.some((page) => page.route === "/01-agent-overview.html"));
    assert.ok(payload.pages.some((page) => page.route === "/overview"));
    assert.ok(payload.pages.some((page) => page.route === "/kanban"));
    assert.ok(payload.inventory.agentEnablement.enabled >= 1);
    assert.equal(payload.operations.localStartCommand, "./scripts/start.sh");
  } finally {
    await cleanup();
  }
});

test("page delivery serves bootstrap pages and canonical prototypes", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-delivery-");

  try {
    const checks = [
      ["/", "Agent Enterprise Control Plane"],
      ["/agents", "Agent inventory"],
      ["/workboard", "Program workboard"],
      ["/overview", "Agent Overview"],
      ["/kanban", "Workboard"],
      ["/projects", "Project Overview"],
      ["/projects/ian-agency", "Project Overview"],
      ["/chat", "Agent Chat"],
      ["/chat/engineer", "Agent Chat"],
      ["/01-agent-overview.html", "Agent Overview"],
      ["/02-kanban.html", "Workboard"],
      ["/03-program-visualisation.html", "Program Visualisation"],
      ["/04-project-overview.html", "Project Overview"],
      ["/05-agent-chat.html", "Agent Chat"],
    ];

    for (const [route, marker] of checks) {
      const response = await app.inject(route);
      assert.equal(response.statusCode, 200, route);
      assert.match(response.headers["content-type"], /text\/html/);
      assert.match(response.body, new RegExp(marker, "i"));
    }
  } finally {
    await cleanup();
  }
});

test("shared dashboard assets are served from the same origin", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-delivery-");

  try {
    const [railAsset, overviewAsset, kanbanAsset, chatAsset, projectsAsset] =
      await Promise.all([
      app.inject("/assets/dashboard-rail.js"),
      app.inject("/assets/overview.js"),
      app.inject("/assets/kanban.js"),
      app.inject("/assets/chat.js"),
      app.inject("/assets/projects.js"),
    ]);

    assert.equal(railAsset.statusCode, 200);
    assert.match(railAsset.headers["content-type"], /javascript/);
    assert.match(railAsset.body, /\/overview/);

    assert.equal(overviewAsset.statusCode, 200);
    assert.match(overviewAsset.headers["content-type"], /javascript/);
    assert.match(overviewAsset.body, /\/api\/overview/);

    assert.equal(kanbanAsset.statusCode, 200);
    assert.match(kanbanAsset.headers["content-type"], /javascript/);
    assert.match(kanbanAsset.body, /\/api\/kanban/);
    assert.match(kanbanAsset.body, /\/api\/work\/events/);

    assert.equal(chatAsset.statusCode, 200);
    assert.match(chatAsset.headers["content-type"], /javascript/);
    assert.match(chatAsset.body, /\/api\/chat\/agents/);
    assert.match(chatAsset.body, /\/api\/chat\/sessions/);
    assert.match(chatAsset.body, /\/api\/work\/events/);

    assert.equal(projectsAsset.statusCode, 200);
    assert.match(projectsAsset.headers["content-type"], /javascript/);
    assert.match(projectsAsset.body, /\/api\/projects/);
    assert.match(projectsAsset.body, /\/projects\//);
  } finally {
    await cleanup();
  }
});
