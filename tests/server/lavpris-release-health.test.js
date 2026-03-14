import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createApp } from "../../server/src/app.js";
import { initControlPlaneDb } from "../../server/src/db/init.js";
import { loadEnv } from "../../server/src/lib/env.js";
import {
  collectLavprisPathHealth,
} from "../../server/src/lib/lavpris-path-health.js";
import {
  createLavprisRolloutService,
  lavprisRootChangelogPath,
} from "../../server/src/lib/lavpris-rollout.js";
import { rootDir } from "./support.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

async function makeTempEnv(prefix = "agent-enterprise-lavpris-release-") {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const codexHome = path.join(tempDir, ".codex");
  await fs.mkdir(path.join(codexHome, "rules"), { recursive: true });
  await fs.writeFile(path.join(codexHome, "config.toml"), 'model = "gpt-5"\n');
  await fs.writeFile(path.join(codexHome, "rules", "default.rules"), "# clean\n");

  const env = loadEnv({
    APP_ROOT: rootDir,
    APP_DATA_DIR: path.join(tempDir, ".data"),
    APP_ENV: "test",
    DEFAULT_MODEL_PROVIDER: "simulated",
    CODEX_HOME: codexHome,
    AGENT_ENTERPRISE_INTERNAL_TOKEN: "test-internal-api-token",
    AGENT_ENTERPRISE_LAVPRIS_MASTER_TOKEN: "master-rollout-token",
    LAVPRIS_CLIENT_AGENT_ROOT_PATH: path.join(tempDir, "generated-client-agents"),
    LAVPRIS_CLIENT_AGENT_REGISTRY_PATH: path.join(
      tempDir,
      "generated-client-agents.registry.json",
    ),
  });
  const db = initControlPlaneDb(env);

  return {
    env,
    db,
    cleanup: async () => {
      db.close();
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
}

test("lavpris path health flags stale active config references but ignores session archives", async () => {
  const { env, cleanup } = await makeTempEnv("agent-enterprise-path-health-");

  try {
    await fs.writeFile(
      path.join(env.codexHome, "rules", "default.rules"),
      'prefix_rule(pattern=["rm","-rf","programs/lavprishjemmeside/lavprishjemmeside.dk/node_modules"], decision="allow")\n',
    );
    await fs.mkdir(path.join(env.codexHome, "sessions"), { recursive: true });
    await fs.writeFile(
      path.join(env.codexHome, "sessions", "old.jsonl"),
      "/Users/IAn/Agent/AI-Enterprise\n",
    );

    const payload = collectLavprisPathHealth({ env });

    assert.equal(payload.ok, false);
    assert.ok(
      payload.findings.some((finding) => finding.file.endsWith(".codex/rules/default.rules")),
    );
    assert.ok(
      payload.findings.every((finding) => !finding.file.includes(".codex/sessions/")),
    );
  } finally {
    await cleanup();
  }
});

test("lavpris release health warns when local changelog is ahead of the live parent site", async () => {
  const { env, db, cleanup } = await makeTempEnv("agent-enterprise-release-health-");

  try {
    const localSha = createHash("sha256")
      .update(await fs.readFile(lavprisRootChangelogPath(env), "utf8"), "utf8")
      .digest("hex");
    const service = createLavprisRolloutService({
      env,
      db,
      fetchImpl: async () =>
        jsonResponse({
          status: "ok",
          database: "connected",
          cms: {
            release_version: "1.0.0",
            api_version: "1.0.0",
            build: "1.0.0+remote",
            commit: randomUUID(),
            commit_short: "remote1",
            git_ref: "remote-tag",
            git_committed_at: "2026-03-10T10:00:00.000Z",
            dirty: false,
            update_channel: "lavprishjemmeside-cms",
            changelog_sha: `${localSha}-remote`,
            changelog_updated_at: "2026-03-10T10:00:00.000Z",
            last_deployed_at: "2026-03-10T10:05:00.000Z",
          },
        }),
    });

    const payload = await service.getReleaseHealth({ force: true });

    assert.equal(payload.exitCode, 1);
    assert.equal(payload.rollout.sourceVsParent.status, "changelog_live_pending");
  } finally {
    await cleanup();
  }
});

test("lavpris rollout routes expose master and site-scoped status, and engineer completion requires changelog evidence", async () => {
  const { env, db, cleanup } = await makeTempEnv("agent-enterprise-rollout-routes-");

  try {
    const localSha = createHash("sha256")
      .update(await fs.readFile(lavprisRootChangelogPath(env), "utf8"), "utf8")
      .digest("hex");
    const rolloutService = createLavprisRolloutService({
      env,
      db,
      fetchImpl: async (url) => {
        if (String(url).includes("api.lavprishjemmeside.dk/health")) {
          return jsonResponse({
            status: "ok",
            database: "connected",
            cms: {
              release_version: "1.0.0",
              api_version: "1.0.0",
              build: "1.0.0+parent",
              commit: randomUUID(),
              commit_short: "parent1",
              git_ref: "parent-tag",
              git_committed_at: "2026-03-14T08:00:00.000Z",
              dirty: false,
              update_channel: "lavprishjemmeside-cms",
              changelog_sha: localSha,
              changelog_updated_at: "2026-03-14T08:00:00.000Z",
              last_deployed_at: "2026-03-14T08:10:00.000Z",
            },
          });
        }

        return jsonResponse({
          status: "ok",
          database: "connected",
          cms: {
            release_version: "1.0.0",
            api_version: "1.0.0",
            build: "1.0.0+client-old",
            commit: randomUUID(),
            commit_short: "client1",
            git_ref: "client-tag",
            git_committed_at: "2026-03-12T08:00:00.000Z",
            dirty: false,
            update_channel: "lavprishjemmeside-cms",
            changelog_sha: `${localSha}-client`,
            changelog_updated_at: "2026-03-12T08:00:00.000Z",
            last_deployed_at: "2026-03-12T08:10:00.000Z",
          },
        });
      },
    });
    const app = await createApp({
      env,
      db,
      lavprisRolloutService: rolloutService,
    });

    try {
      const provisioned = await app.controlPlane.lavprisClientAgents.provisionClientAgent({
        domain: "ljdesignstudio.dk",
        siteLabel: "LJ Design Studio",
      });

      const masterDenied = await app.inject({
        method: "GET",
        url: "/api/lavpris/rollout/status",
        headers: {
          "x-control-plane-token": app.controlPlane.internalApiToken,
        },
      });
      assert.equal(masterDenied.statusCode, 403);

      const masterAllowed = await app.inject({
        method: "GET",
        url: "/api/lavpris/rollout/status",
        headers: {
          "x-control-plane-token": app.controlPlane.internalApiToken,
          "x-lavpris-master-token": env.lavprisMasterToken,
        },
      });
      assert.equal(masterAllowed.statusCode, 200);
      assert.equal(masterAllowed.json().sourceVsParent.status, "aligned");

      const siteRollout = await app.inject({
        method: "GET",
        url: `/api/lavpris/sites/${provisioned.siteKey}/rollout-status`,
        headers: {
          "x-control-plane-token": app.controlPlane.internalApiToken,
          "x-lavpris-site-token": provisioned.siteToken,
        },
      });
      assert.equal(siteRollout.statusCode, 200);
      assert.equal(siteRollout.json().comparison.status, "update_available");

      const intake = app.controlPlane.workService.intakeTask({
        title: "Lavpris release gate",
        summary: "Validate completion requires changelog evidence.",
        requestType: "engineering",
        programId: "lavprishjemmeside",
        sourceAgentId: "lavprishjemmeside-master",
        requestedBy: "Operator",
      });
      const taskId = intake.task.id;
      app.controlPlane.workService.approveTask(taskId, { actorId: "operator" });

      for (const targetStage of ["planned", "in_development", "testing"]) {
        const transition = await app.inject({
          method: "POST",
          url: `/api/tasks/${taskId}/engineer-transition`,
          headers: {
            "x-control-plane-token": app.controlPlane.internalApiToken,
          },
          payload: {
            targetStage,
          },
        });
        assert.equal(transition.statusCode, 200);
      }

      const missingChecklist = await app.inject({
        method: "POST",
        url: `/api/tasks/${taskId}/engineer-transition`,
        headers: {
          "x-control-plane-token": app.controlPlane.internalApiToken,
        },
        payload: {
          targetStage: "completed",
        },
      });
      assert.equal(missingChecklist.statusCode, 409);
      assert.equal(missingChecklist.json().code, "CHANGELOG_REQUIRED");
      assert.ok(missingChecklist.json().rolloutStatus);

      const completion = await app.inject({
        method: "POST",
        url: `/api/tasks/${taskId}/engineer-transition`,
        headers: {
          "x-control-plane-token": app.controlPlane.internalApiToken,
        },
        payload: {
          targetStage: "completed",
          releaseChecklist: {
            changelogEntryText:
              "Implemented the first-party e-commerce module with shop schema, Flatpay / Frisbii payment integration, public storefront routes, admin shop management, and transactional order email support.",
          },
        },
      });

      assert.equal(completion.statusCode, 200);
      assert.equal(completion.json().task.stage, "completed");
    } finally {
      await app.close();
    }
  } finally {
    await cleanup();
  }
});
