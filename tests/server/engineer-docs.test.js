import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { rootDir } from "./support.js";

const ENGINEER_FILES = {
  skills: "agents/Engineer/skills.md",
  tools: "agents/Engineer/tools.md",
  architecture: "agents/Engineer/ARCHITECTURE.md",
  runbook: "agents/Engineer/DELIVERY_RUNBOOK.md",
  toolchain: "agents/Engineer/TOOLCHAIN_REQUIREMENTS.md",
  user: "agents/Engineer/user.md",
  heartbeat: "agents/Engineer/heartbeat.md",
  soul: "agents/Engineer/soul.md",
  backendTemplate: "agents/Engineer/templates/backend-specialist.md",
  integrationTaskSkills: "agents/Engineer/tasks/integration-architecture-task/skills.md",
  integrationTaskTools: "agents/Engineer/tasks/integration-architecture-task/tools.md",
  reliabilityTaskTools: "agents/Engineer/tasks/platform-reliability-task/tools.md",
  observabilityTaskTools: "agents/Engineer/tasks/data-observability-task/tools.md",
};

async function loadEngineerDocs() {
  const entries = await Promise.all(
    Object.entries(ENGINEER_FILES).map(async ([key, relativePath]) => [
      key,
      await readFile(path.join(rootDir, relativePath), "utf8"),
    ]),
  );

  return Object.fromEntries(entries);
}

test("engineer packet covers Agent Enterprise control plane and remote estate operations", async () => {
  const docs = await loadEngineerDocs();

  assert.match(docs.skills, /SSH \+ Terminal Operations/);
  assert.match(docs.skills, /cPanel \+ SQL Operations/);
  assert.match(docs.skills, /WordPress \+ B2B \+ Theme Development/);
  assert.match(docs.skills, /Node\.js Applications on cPanel/);
  assert.match(docs.tools, /npm run lavpris:preflight/);
  assert.match(docs.tools, /npm run theartis:write-access/);
  assert.match(docs.tools, /mysql client/);
  assert.match(docs.tools, /WordPress\/WooCommerce on cPanel/);
  assert.match(docs.architecture, /Fastify routes/);
  assert.match(docs.runbook, /npm test/);
  assert.match(docs.toolchain, /ssh/);
  assert.match(docs.user, /\/Users\/IAn\/Agent\/Agent Enterprise/);
  assert.match(docs.heartbeat, /SSH, terminal, cPanel MySQL, WordPress, hosted Node\.js apps/);
  assert.match(docs.soul, /cPanel-hosted runtimes/);
  assert.match(docs.backendTemplate, /Node\.js, Fastify, SQLite/);
});

test("engineer packet no longer relies on legacy Python or pre-rebuild path assumptions", async () => {
  const docs = await loadEngineerDocs();
  const stalePattern =
    /FastAPI|Uvicorn|\/Users\/IAn\/Agent\/IAn|localhost:8001|100\.96\.78\.62:8001|AI-Enterprise|Pydantic validation|Optional typing rules/;

  for (const [key, value] of Object.entries(docs)) {
    assert.doesNotMatch(value, stalePattern, `stale runtime marker remained in ${key}`);
  }

  assert.doesNotMatch(docs.integrationTaskSkills, /master_id|program_id/);
  assert.doesNotMatch(docs.integrationTaskTools, /master_id|program_id/);
  assert.doesNotMatch(docs.reliabilityTaskTools, /master_id|program_id/);
  assert.doesNotMatch(docs.observabilityTaskTools, /master_id|program_id/);
});
