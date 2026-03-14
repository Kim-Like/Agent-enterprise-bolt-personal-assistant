import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { rootDir } from "./support.js";

const envExamplePath = path.join(rootDir, "config", "env.example");
const packageJsonPath = path.join(rootDir, "package.json");
const docPath = path.join(rootDir, "docs", "theartis-cpanel-estate-operations.md");
const scriptsDir = path.join(rootDir, "scripts", "theartis");

const scriptPaths = [
  path.join(scriptsDir, "_common.sh"),
  path.join(scriptsDir, "ssh_preflight.sh"),
  path.join(scriptsDir, "ssh_inventory.sh"),
  path.join(scriptsDir, "ssh_health.sh"),
  path.join(scriptsDir, "ssh_repo_status.sh"),
  path.join(scriptsDir, "ssh_write_access.sh"),
];

test("theartis env contract and npm aliases are documented in Agent Enterprise", () => {
  const envExample = fs.readFileSync(envExamplePath, "utf8");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  for (const key of [
    "CPANEL_SSH_HOST",
    "CPANEL_SSH_PORT",
    "CPANEL_SSH_USER",
    "CPANEL_SSH_KEY_PATH",
    "CPANEL_NODE_BIN",
    "ARTISAN_WP_REPO_PATH",
    "ARTISAN_WP_SITE_ROOT",
    "ARTISAN_WP_DOMAIN_ROOT",
    "ARTISAN_REPORTING_REPO_PATH",
    "ARTISAN_REPORTING_SITE_ROOT",
    "THIRDWAVE_SITE_ROOT",
    "THIRDWAVE_AUDIT_PROXY_PATH",
  ]) {
    assert.match(envExample, new RegExp(`^${key}=`, "m"));
  }

  assert.equal(packageJson.scripts["theartis:preflight"], "bash scripts/theartis/ssh_preflight.sh");
  assert.equal(packageJson.scripts["theartis:inventory"], "bash scripts/theartis/ssh_inventory.sh");
  assert.equal(packageJson.scripts["theartis:health"], "bash scripts/theartis/ssh_health.sh");
  assert.equal(packageJson.scripts["theartis:repo-status"], "bash scripts/theartis/ssh_repo_status.sh");
  assert.equal(packageJson.scripts["theartis:write-access"], "bash scripts/theartis/ssh_write_access.sh");
});

test("theartis shell helpers are present and pass bash syntax checks", () => {
  for (const scriptPath of scriptPaths) {
    assert.ok(fs.existsSync(scriptPath), scriptPath);

    const result = spawnSync("bash", ["-n", scriptPath], { encoding: "utf8" });
    assert.equal(result.status, 0, `${scriptPath}\n${result.stderr}`);
  }
});

test("theartis operations doc records the account contract and write-capable surfaces", () => {
  const doc = fs.readFileSync(docPath, "utf8");

  assert.match(doc, /cp10-theartis/);
  assert.match(doc, /cp10-lavpris/);
  assert.match(doc, /theartisan\.dk/);
  assert.match(doc, /thirdwave\.dk/);
  assert.match(doc, /public_html/);
  assert.match(doc, /engineer/);
  assert.match(doc, /master/);
  assert.match(doc, /write-access/i);
  assert.match(doc, /npm run theartis:preflight/);
  assert.match(doc, /npm run theartis:inventory/);
  assert.match(doc, /npm run theartis:health/);
  assert.match(doc, /npm run theartis:repo-status/);
  assert.match(doc, /npm run theartis:write-access/);
});
