import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { rootDir } from "./support.js";

const skillRoot = path.join(
  rootDir,
  ".agents",
  "skills",
  "lavprishjemmeside-master-orchestrator",
);

const files = {
  repoAgents: path.join(rootDir, "AGENTS.md"),
  skill: path.join(skillRoot, "SKILL.md"),
  starterPrompts: path.join(skillRoot, "STARTER-PROMPTS.md"),
  evals: path.join(skillRoot, "evals", "evals.json"),
  programReadme: path.join(rootDir, "programs", "lavprishjemmeside", "README.md"),
  projectContext: path.join(rootDir, "programs", "lavprishjemmeside", "PROJECT_CONTEXT.md"),
  brandVision: path.join(rootDir, "programs", "lavprishjemmeside", "BRAND_VISION.md"),
  changelog: path.join(rootDir, "programs", "lavprishjemmeside", "CHANGELOG.md"),
  masterSkills: path.join(
    rootDir,
    "agents",
    "lavprishjemmeside",
    "lavprishjemmeside-master",
    "skills.md",
  ),
  masterTools: path.join(
    rootDir,
    "agents",
    "lavprishjemmeside",
    "lavprishjemmeside-master",
    "tools.md",
  ),
  engineerSkills: path.join(rootDir, "agents", "Engineer", "skills.md"),
  engineerTools: path.join(rootDir, "agents", "Engineer", "tools.md"),
  taskTools: [
    path.join(
      rootDir,
      "agents",
      "lavprishjemmeside",
      "lavprishjemmeside-master",
      "tasks",
      "lph-ai-cms-task",
      "tools.md",
    ),
    path.join(
      rootDir,
      "agents",
      "lavprishjemmeside",
      "lavprishjemmeside-master",
      "tasks",
      "lph-seo-dashboard-task",
      "tools.md",
    ),
    path.join(
      rootDir,
      "agents",
      "lavprishjemmeside",
      "lavprishjemmeside-master",
      "tasks",
      "lph-ads-dashboard-task",
      "tools.md",
    ),
    path.join(
      rootDir,
      "agents",
      "lavprishjemmeside",
      "lavprishjemmeside-master",
      "tasks",
      "lph-subscription-ops-task",
      "tools.md",
    ),
  ],
};

test("lavprishjemmeside orchestrator skill is present and wired to essential docs", () => {
  const skill = fs.readFileSync(files.skill, "utf8");
  const prompts = fs.readFileSync(files.starterPrompts, "utf8");
  const evals = JSON.parse(fs.readFileSync(files.evals, "utf8"));
  const repoAgents = fs.readFileSync(files.repoAgents, "utf8");

  assert.match(skill, /^name: lavprishjemmeside-master-orchestrator$/m);
  assert.match(skill, /lavprishjemmeside\.dk/i);
  assert.match(skill, /client-website governance/i);
  assert.match(skill, /CHANGELOG\.md/);
  assert.match(skill, /PROJECT_CONTEXT\.md/);
  assert.match(skill, /BRAND_VISION\.md/);
  assert.match(prompts, /enterprise-ready/i);
  assert.equal(evals.skill_name, "lavprishjemmeside-master-orchestrator");
  assert.equal(evals.evals.length, 3);
  assert.match(repoAgents, /Lavprishjemmeside Change Control/);
  assert.match(repoAgents, /lavprishjemmeside-master-orchestrator/);
});

test("lavprishjemmeside master and engineer packets enforce changelog discipline", () => {
  const masterSkills = fs.readFileSync(files.masterSkills, "utf8");
  const masterTools = fs.readFileSync(files.masterTools, "utf8");
  const engineerSkills = fs.readFileSync(files.engineerSkills, "utf8");
  const engineerTools = fs.readFileSync(files.engineerTools, "utf8");

  assert.match(masterSkills, /Change-Control Rule/);
  assert.match(masterSkills, /CHANGELOG\.md/);
  assert.match(masterTools, /Essential Program Docs/);
  assert.match(masterTools, /npm run lavpris:preflight/);
  assert.match(engineerSkills, /programs\/lavprishjemmeside\/CHANGELOG\.md/);
  assert.match(engineerTools, /CHANGELOG\.md` must be updated/);
  assert.doesNotMatch(masterTools, /\/api\/errors/);
  assert.doesNotMatch(masterTools, /\/api\/tasks\{task_id\}\/delegate/);

  for (const taskToolPath of files.taskTools) {
    const taskTools = fs.readFileSync(taskToolPath, "utf8");
    assert.match(taskTools, /CHANGELOG\.md/);
    assert.doesNotMatch(taskTools, /FastAPI endpoints/);
    assert.doesNotMatch(taskTools, /\/api\/errors/);
    assert.doesNotMatch(taskTools, /localhost:8001|100\.96\.78\.62:8001/);
  }
});

test("lavprishjemmeside docs are trimmed to the essential root set", () => {
  const readme = fs.readFileSync(files.programReadme, "utf8");
  const projectContext = fs.readFileSync(files.projectContext, "utf8");
  const brandVision = fs.readFileSync(files.brandVision, "utf8");
  const changelog = fs.readFileSync(files.changelog, "utf8");

  assert.match(readme, /Essential Root Docs/);
  assert.match(readme, /README_1\.0\.md/);
  assert.match(readme, /README_INSTALL\.md/);
  assert.match(readme, /BRAND_VISION_EXAMPLE\.md/);
  assert.match(readme, /github\.com\/kimjeppesen01\/lavprishjemmeside\.dk/i);
  assert.match(readme, /bolt\.new/i);
  assert.match(projectContext, /Essential Document Set/);
  assert.match(projectContext, /Change-Control Rule/);
  assert.match(projectContext, /Bolt\.new -> GitHub -> cPanel/i);
  assert.doesNotMatch(brandVision, /BRAND_VISION_EXAMPLE\.md/);
  assert.match(changelog, /Every Engineer, Codex, and Claude Code change/);

  for (const removed of [
    path.join(rootDir, "programs", "lavprishjemmeside", "README_1.0.md"),
    path.join(rootDir, "programs", "lavprishjemmeside", "README_INSTALL.md"),
    path.join(rootDir, "programs", "lavprishjemmeside", "BRAND_VISION_EXAMPLE.md"),
    path.join(rootDir, "programs", "lavprishjemmeside", ".DS_Store"),
    path.join(rootDir, "programs", "lavprishjemmeside", "client-sites", ".DS_Store"),
  ]) {
    assert.equal(fs.existsSync(removed), false, removed);
  }
});
