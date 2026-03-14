import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { makeApp } from "./support.js";

test("skill library lists both project and user-installed skills", async () => {
  const codexHome = await mkdtemp(
    path.join(os.tmpdir(), "agent-enterprise-codex-home-"),
  );
  const skillRoot = path.join(codexHome, "skills", "user-sql-admin");

  await mkdir(skillRoot, { recursive: true });
  await writeFile(
    path.join(skillRoot, "SKILL.md"),
    `---
name: user-sql-admin
description: Manage hosted SQL maintenance through cPanel and SSH.
---

# User SQL Admin

Use this skill when the operator wants database maintenance help.`,
    "utf8",
  );

  const { app, cleanup } = await makeApp("agent-enterprise-skill-selection-", {
    CODEX_HOME: codexHome,
  });

  try {
    const response = await app.inject("/api/skills");
    assert.equal(response.statusCode, 200);

    const payload = response.json();
    assert.ok(
      payload.skills.some((skill) => skill.name === "product-manager-skills"),
    );

    const userSkill = payload.skills.find((skill) => skill.name === "user-sql-admin");
    assert.ok(userSkill);
    assert.equal(userSkill.scope, "user");
  } finally {
    await cleanup();
    await rm(codexHome, { recursive: true, force: true });
  }
});

test("accepted tasks can carry specialty skills into engineer planning", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-skill-selection-");

  try {
    const intake = await app.inject({
      method: "POST",
      url: "/api/tasks/intake",
      payload: {
        title: "Tighten Lavpris CMS planning",
        summary: "Attach the right PM and orchestration skills before approval.",
        requestType: "engineering",
        sourceAgentId: "lavprishjemmeside-master",
        requestedBy: "Operator",
        requestedSkills: ["product-manager-skills"],
      },
    });

    assert.equal(intake.statusCode, 201);
    assert.deepEqual(intake.json().task.requestedSkills, [
      "product-manager-skills",
    ]);

    const taskId = intake.json().task.id;
    const taskSkillUpdate = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${taskId}/skills`,
      payload: {
        requestedSkills: [
          "product-manager-skills",
          "lavprishjemmeside-master-orchestrator",
        ],
      },
    });

    assert.equal(taskSkillUpdate.statusCode, 200);
    assert.deepEqual(taskSkillUpdate.json().task.requestedSkills, [
      "product-manager-skills",
      "lavprishjemmeside-master-orchestrator",
    ]);

    const kanban = await app.inject("/api/kanban");
    assert.equal(kanban.statusCode, 200);
    const acceptedCard = kanban
      .json()
      .columns.find((column) => column.id === "accepted")
      .tasks.find((task) => task.id === taskId);
    assert.deepEqual(acceptedCard.requestedSkills, [
      "product-manager-skills",
      "lavprishjemmeside-master-orchestrator",
    ]);

    const approval = await app.inject({
      method: "POST",
      url: `/api/tasks/${taskId}/approve`,
    });
    assert.equal(approval.statusCode, 200);

    const engineerWorkspace = await app.inject(
      `/api/chat/agents/engineer/workspace?taskId=${taskId}`,
    );
    assert.equal(engineerWorkspace.statusCode, 200);

    const payload = engineerWorkspace.json();
    assert.deepEqual(payload.activeSession.session.requestedSkills, [
      "product-manager-skills",
      "lavprishjemmeside-master-orchestrator",
    ]);
    assert.deepEqual(
      payload.context.selectedSkills.items.map((skill) => skill.name),
      [
        "product-manager-skills",
        "lavprishjemmeside-master-orchestrator",
      ],
    );
  } finally {
    await cleanup();
  }
});

test("general sessions can start with and update specialty skills", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-skill-selection-");

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/chat/agents/engineer/sessions",
      payload: {
        modelFamily: "sonnet",
        requestedSkills: ["lavprishjemmeside-master-orchestrator"],
      },
    });

    assert.equal(created.statusCode, 201);
    assert.deepEqual(created.json().session.requestedSkills, [
      "lavprishjemmeside-master-orchestrator",
    ]);

    const sessionId = created.json().session.id;
    const updated = await app.inject({
      method: "PATCH",
      url: `/api/chat/sessions/${sessionId}/skills`,
      payload: {
        requestedSkills: ["product-manager-skills"],
      },
    });

    assert.equal(updated.statusCode, 200);
    assert.deepEqual(updated.json().session.requestedSkills, [
      "product-manager-skills",
    ]);
    assert.deepEqual(
      updated.json().context.selectedSkills.items.map((skill) => skill.name),
      ["product-manager-skills"],
    );
  } finally {
    await cleanup();
  }
});
