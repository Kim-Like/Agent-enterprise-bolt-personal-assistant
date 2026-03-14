import assert from "node:assert/strict";
import test from "node:test";

import { makeApp } from "./support.js";

test("projects api returns the six portfolio pages in the expected order", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-projects-");

  try {
    const response = await app.inject("/api/projects");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.deepEqual(
      payload.entries.map((entry) => entry.label),
      [
        "IAn Agency",
        "Artisan",
        "Baltzer",
        "Lavprishjemmeside",
        "Personal Assistant",
        "Samlino",
      ],
    );
    assert.equal(payload.entries[0].href, "/projects/ian-agency");
    assert.ok(payload.entries.every((entry) => entry.counts.totalTiles > 0));
  } finally {
    await cleanup();
  }
});

test("project detail api returns only mapped surfaces for the selected project", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-projects-");

  try {
    const artisanResponse = await app.inject("/api/projects/artisan");
    assert.equal(artisanResponse.statusCode, 200);
    const artisan = artisanResponse.json();

    assert.equal(artisan.id, "artisan");
    assert.ok(artisan.gridTiles.some((tile) => tile.label === "WP Inventory"));
    assert.ok(artisan.gridTiles.some((tile) => tile.label === "Billy API"));
    assert.ok(artisan.gridTiles.some((tile) => tile.label === "Brevo"));
    assert.ok(!artisan.gridTiles.some((tile) => tile.label === "Shopify"));

    const baltzerResponse = await app.inject("/api/projects/baltzer");
    assert.equal(baltzerResponse.statusCode, 200);
    const baltzer = baltzerResponse.json();

    assert.ok(baltzer.gridTiles.some((tile) => tile.label === "Shopify"));
    assert.ok(
      baltzer.gridTiles.some((tile) => tile.label === "Schedule + Salary API"),
    );
    assert.ok(baltzer.gridTiles.some((tile) => tile.label === "TCG Index App"));
    assert.ok(!baltzer.gridTiles.some((tile) => tile.label === "Brevo"));
  } finally {
    await cleanup();
  }
});

test("project detail payloads keep all planned, hold, and archive tiles navigable", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-projects-");

  try {
    const [lavprisResponse, paResponse, samlinoResponse] = await Promise.all([
      app.inject("/api/projects/lavprishjemmeside"),
      app.inject("/api/projects/personal-assistant"),
      app.inject("/api/projects/samlino"),
    ]);

    const lavpris = lavprisResponse.json();
    const pa = paResponse.json();
    const samlino = samlinoResponse.json();

    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "lavprishjemmeside.dk"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "ljdesignstudio.dk"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "lavprishjemmeside API"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "ljdesignstudio API"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "GitHub Repo"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "lavprishjemmeside Repo"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "ljdesignstudio Repo"));
    assert.ok(lavpris.gridTiles.some((tile) => tile.label === "Bolt.new Workspace"));

    assert.ok(pa.gridTiles.some((tile) => tile.label === "Task Manager"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Calendar Management"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Email Management"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Social Media Management"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Fitness Dashboard"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Task + Calendar"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Email + Social"));
    assert.ok(pa.gridTiles.some((tile) => tile.label === "Fitness Dashboard"));

    assert.ok(samlino.gridTiles.some((tile) => tile.label === "Inventory + Functions"));
    assert.ok(samlino.gridTiles.some((tile) => tile.label === "Schema APIs"));
    assert.ok(samlino.gridTiles.some((tile) => tile.label === "AI-visibility"));
    assert.ok(samlino.gridTiles.some((tile) => tile.label === "seo-auditor"));
    assert.ok(samlino.gridTiles.some((tile) => tile.label === "samlino-mind-map"));

    for (const payload of [lavpris, pa, samlino]) {
      assert.ok(
        payload.gridTiles.every((tile) => {
          const action = tile.action || {};
          return (
            action.kind === "panel" ||
            (action.kind === "internal" && typeof action.href === "string") ||
            (action.kind === "external" && typeof action.href === "string")
          );
        }),
      );
    }
  } finally {
    await cleanup();
  }
});

test("project overview shell serves both directory and detail routes with the shared projects asset", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-projects-");

  try {
    const [directoryPage, legacyPage, detailPage, asset] = await Promise.all([
      app.inject("/projects"),
      app.inject("/04-project-overview.html"),
      app.inject("/projects/ian-agency"),
      app.inject("/assets/projects.js"),
    ]);

    for (const response of [directoryPage, legacyPage, detailPage]) {
      assert.equal(response.statusCode, 200);
      assert.match(response.headers["content-type"], /text\/html/);
      assert.match(response.body, /Project Overview/i);
      assert.match(response.body, /id="projectSwitcher"/);
      assert.match(response.body, /\/assets\/projects\.js/);
      assert.match(response.body, /data-dashboard-rail/);
    }

    assert.equal(asset.statusCode, 200);
    assert.match(asset.headers["content-type"], /javascript/);
    assert.match(asset.body, /\/api\/projects/);
    assert.match(asset.body, /\/projects\//);
  } finally {
    await cleanup();
  }
});
