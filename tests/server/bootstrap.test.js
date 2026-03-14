import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadEnv } from "../../server/src/lib/env.js";
import { makeApp, rootDir } from "./support.js";

test("bootstrap structure exposes one package contract", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(rootDir, "package.json"), "utf8"),
  );

  assert.equal(packageJson.scripts.start, "node server/src/index.js");
  assert.equal(packageJson.scripts.dev, "node --watch server/src/index.js");
  assert.equal(packageJson.scripts.test, "node --test tests/server/*.test.js");
  assert.ok(!("vite" in (packageJson.dependencies || {})));
  assert.ok(existsSync(path.join(rootDir, "config")));
  assert.ok(existsSync(path.join(rootDir, "server")));
  assert.ok(existsSync(path.join(rootDir, "client")));
  assert.ok(existsSync(path.join(rootDir, "tests")));
});

test("env loader resolves app and sqlite paths", async () => {
  const env = loadEnv({
    APP_ROOT: rootDir,
    APP_DATA_DIR: ".tmp/bootstrap-data",
    HOST: "0.0.0.0",
    PORT: "4100",
    LAVPRIS_PUBLIC_INGRESS_HOST: "0.0.0.0",
    LAVPRIS_PUBLIC_INGRESS_PORT: "8100",
  });

  assert.equal(env.port, 4100);
  assert.equal(env.host, "0.0.0.0");
  assert.equal(env.publicOrigin, "http://127.0.0.1:4100");
   assert.equal(env.controlPlaneOrigin, "http://127.0.0.1:4100");
   assert.equal(env.lavprisPublicIngressPort, 8100);
   assert.equal(env.lavprisPublicIngressOrigin, "http://127.0.0.1:8100");
  assert.ok(env.sqlitePath.endsWith(path.join(".tmp", "bootstrap-data", "control-plane.sqlite")));
});

test("app bootstrap stays in-process and loads registries", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-bootstrap-");

  try {
    assert.equal(app.controlPlane.env.appName, "Agent Enterprise");
    assert.ok(app.controlPlane.registries.agents.entries.length > 0);
    assert.ok(app.controlPlane.registries.programs.entries.length > 0);
    assert.ok(app.controlPlane.agentManager.list().length > 0);
    assert.ok(app.controlPlane.db.listAgentStates().length > 0);
    assert.ok(app.controlPlane.db.getMeta("startup_mode"), "single-process");
  } finally {
    await cleanup();
  }
});

test("startup scripts define local and Lavpris ingress entrypoints", async () => {
  const [startScript, tailscaleScript, ingressScript] = await Promise.all([
    readFile(path.join(rootDir, "scripts/start.sh"), "utf8"),
    readFile(path.join(rootDir, "scripts/tailscale-funnel.sh"), "utf8"),
    readFile(path.join(rootDir, "scripts/start_lavpris_public_ingress.sh"), "utf8"),
  ]);

  assert.match(startScript, /exec npm start/);
  assert.match(ingressScript, /lavpris-public-ingress/);
  assert.match(tailscaleScript, /tailscale funnel/);
});
