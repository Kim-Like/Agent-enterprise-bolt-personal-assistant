import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { makeApp, rootDir } from "./support.js";

test("personal assistant baseline boots and exposes the project surface", async () => {
  const { app, cleanup } = await makeApp("pa-baseline-");

  try {
    const [health, projectDetail, projectDirectory, paPage] = await Promise.all([
      app.inject("/health"),
      app.inject("/api/projects/personal-assistant"),
      app.inject("/api/projects"),
      app.inject("/projects/personal-assistant"),
    ]);

    assert.equal(health.statusCode, 200);
    assert.equal(projectDetail.statusCode, 200);
    assert.equal(projectDirectory.statusCode, 200);
    assert.equal(paPage.statusCode, 200);

    const detail = projectDetail.json();
    const directory = projectDirectory.json();

    assert.equal(detail.id, "personal-assistant");
    assert.equal(detail.theme.accent, "#0F766E");
    assert.ok(detail.gridTiles.some((tile) => tile.label === "Task Manager"));
    assert.ok(detail.gridTiles.some((tile) => tile.label === "Email + Social"));
    assert.ok(
      directory.entries.some((entry) => entry.label === "Personal Assistant"),
    );
    assert.match(paPage.body, /Project Overview/i);
  } finally {
    await cleanup();
  }
});

test("personal assistant docs define canonical authority and operator boundaries", async () => {
  const docsRoot = path.join(rootDir, "programs", "personal-assistant");

  const [
    readme,
    intro,
    requirements,
    design,
    tasks,
    styling,
    prompt,
    instructions,
    handoff,
    changelog,
  ] = await Promise.all([
    readFile(path.join(docsRoot, "README.md"), "utf8"),
    readFile(path.join(docsRoot, "introduction.md"), "utf8"),
    readFile(path.join(docsRoot, "requirements.md"), "utf8"),
    readFile(path.join(docsRoot, "design.md"), "utf8"),
    readFile(path.join(docsRoot, "tasks.md"), "utf8"),
    readFile(path.join(docsRoot, "STYLING_GUIDELINES.md"), "utf8"),
    readFile(path.join(docsRoot, "EXTERNAL_AGENT_PROMPT.md"), "utf8"),
    readFile(path.join(docsRoot, "EXTERNAL_AGENT_INSTRUCTIONS.md"), "utf8"),
    readFile(path.join(docsRoot, "OPERATOR_HANDOFF_CONTRACT.md"), "utf8"),
    readFile(path.join(docsRoot, "CHANGELOG.md"), "utf8"),
  ]);

  assert.match(readme, /canonical v1 planning and handoff pack/i);
  assert.match(intro, /standalone SaaS|standalone app/i);
  assert.match(requirements, /do not invent alternate infrastructure/i);
  assert.match(design, /cPanel|Roundcube|IMAP|SMTP/i);
  assert.match(tasks, /Phase 7 — QA, Operator Packet, Rollout, And Fallback/i);
  assert.match(styling, /Plus Jakarta Sans/i);
  assert.match(prompt, /programs\/personal-assistant\/tasks\.md/);
  assert.match(instructions, /Every behavior change must update `CHANGELOG\.md`/);
  assert.match(handoff, /Do not mark operator-owned work as complete/i);
  assert.match(changelog, /canonical Personal Assistant V1 planning and handoff pack/i);
});

test("personal assistant registries and packets remain aligned with the V1 suite shape", async () => {
  const agentsRegistry = JSON.parse(
    await readFile(path.join(rootDir, "agents", "registry.json"), "utf8"),
  );
  const programsRegistry = JSON.parse(
    await readFile(path.join(rootDir, "programs", "registry.json"), "utf8"),
  );

  const agentIds = new Set(agentsRegistry.entries.map((entry) => entry.id));
  const programIds = new Set(programsRegistry.entries.map((entry) => entry.id));

  assert.ok(agentIds.has("personal-assistant-master"));
  assert.ok(agentIds.has("pa-taskmanager-calendar-task"));
  assert.ok(agentIds.has("pa-email-social-task"));
  assert.ok(agentIds.has("pa-fitness-dashboard-task"));

  assert.ok(programIds.has("personal-assistant-root"));
  assert.ok(programIds.has("personal-assistant-task-manager"));
  assert.ok(programIds.has("personal-assistant-calendar-management"));
  assert.ok(programIds.has("personal-assistant-email-management"));
  assert.ok(programIds.has("personal-assistant-social-media-management"));
  assert.ok(programIds.has("personal-assistant-fitness-dashboard"));
});
