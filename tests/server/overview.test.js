import assert from "node:assert/strict";
import test from "node:test";

import { makeApp } from "./support.js";

test("overview api groups agents by top-level families and keeps the global root", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-overview-");

  try {
    const response = await app.inject("/api/overview");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.equal(payload.root.id, "father");
    assert.equal(payload.defaultFilter, "all");
    assert.equal(payload.counts.totalAgents, 42);
    assert.equal(payload.counts.totalFamilies, 7);
    assert.deepEqual(
      payload.families.map((family) => family.id),
      [
        "engineer",
        "ian-master",
        "artisan-master",
        "baltzer-master",
        "lavprishjemmeside-master",
        "personal-assistant-master",
        "samlino-master",
      ],
    );

    const baltzer = payload.families.find((family) => family.id === "baltzer-master");
    const ianAgency = payload.families.find((family) => family.id === "ian-master");

    assert.equal(ianAgency.label, "IAn Agency");
    assert.equal(baltzer.counts.total, 6);
    assert.ok(baltzer.programIds.includes("baltzer-reporting"));
    assert.ok(baltzer.agents.some((agent) => agent.id === "baltzer-tcg-index-task"));
  } finally {
    await cleanup();
  }
});

test("overview page shell removes demo agents and loads the shared overview assets", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-overview-");

  try {
    const response = await app.inject("/overview");
    assert.equal(response.statusCode, 200);
    assert.match(response.headers["content-type"], /text\/html/);
    assert.doesNotMatch(response.body, /Jarvis/i);
    assert.match(response.body, /Agent Enterprise/i);
    assert.match(response.body, /data-dashboard-rail/);
    assert.match(response.body, /id="familyList"/);
    assert.match(response.body, /\/assets\/dashboard-rail\.js/);
    assert.match(response.body, /\/assets\/overview\.js/);
  } finally {
    await cleanup();
  }
});

test("all five prototype pages include the shared rail bootstrap", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-overview-");

  try {
    const routes = [
      "/01-agent-overview.html",
      "/02-kanban.html",
      "/03-program-visualisation.html",
      "/04-project-overview.html",
      "/05-agent-chat.html",
    ];

    for (const route of routes) {
      const response = await app.inject(route);
      assert.equal(response.statusCode, 200, route);
      assert.match(response.body, /data-dashboard-rail/);
      assert.match(response.body, /\/assets\/dashboard-rail\.js/);
    }
  } finally {
    await cleanup();
  }
});
