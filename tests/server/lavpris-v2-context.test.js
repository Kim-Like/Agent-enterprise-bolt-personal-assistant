import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { rootDir } from "./support.js";

const FILES = {
  lavprisUser: "agents/lavprishjemmeside/lavprishjemmeside-master/user.md",
  lavprisSkills: "agents/lavprishjemmeside/lavprishjemmeside-master/skills.md",
  lavprisMemory: "agents/lavprishjemmeside/lavprishjemmeside-master/memory.md",
  engineerUser: "agents/Engineer/user.md",
  engineerSkills: "agents/Engineer/skills.md",
  engineerMemory: "agents/Engineer/memory.md",
  fatherUser: "agents/IAn/user.md",
  fatherSkills: "agents/IAn/skills.md",
  fatherMemory: "agents/IAn/memory.md",
  fatherHeartbeat: "agents/IAn/heartbeat.md",
  fatherArchitecture: "agents/IAn/ARCHITECTURE.md",
  changelog: "programs/lavprishjemmeside/CHANGELOG.md",
};

async function load(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

test("Lavprishjemmeside v2.0 deployment contract is encoded across runtime-loaded agent packets", async () => {
  const docs = Object.fromEntries(
    await Promise.all(
      Object.entries(FILES).map(async ([key, relativePath]) => [key, await load(relativePath)]),
    ),
  );

  for (const [key, value] of Object.entries(docs)) {
    if (key === "changelog") {
      continue;
    }

    assert.match(value, /lavprishjemmeside/i, `${key} should mention Lavprishjemmeside`);
  }

  assert.match(docs.lavprisUser, /git@github\.com:kimjeppesen01\/lavprishjemmeside\.dk\.git/);
  assert.match(docs.lavprisUser, /api\.lavprishjemmeside\.dk/);
  assert.match(docs.lavprisSkills, /Bolt\.new -> GitHub -> cPanel over SSH/);
  assert.match(docs.lavprisMemory, /Dry-run push permission is available/);
  assert.match(docs.lavprisMemory, /programs\/lavprishjemmeside\/local-mirror/);

  assert.match(docs.engineerUser, /git@github\.com:kimjeppesen01\/lavprishjemmeside\.dk\.git/);
  assert.match(docs.engineerUser, /cPanel as the live deployment target/i);
  assert.match(docs.engineerSkills, /Bolt\.new -> GitHub -> cPanel over SSH/);
  assert.match(docs.engineerSkills, /lavpris:sync-status/);
  assert.match(docs.engineerSkills, /GitHub-hosted deployment/);
  assert.match(docs.engineerMemory, /f4a85fab7ce24ad5c64db19cdd9b5fbfcbc70bae/);
  assert.match(docs.engineerMemory, /__codex_permission_check__/);
  assert.match(docs.engineerMemory, /sync-status` is now green/);
  assert.match(docs.engineerMemory, /Node `v10` \/ npm `6`/);

  assert.match(docs.fatherUser, /git@github\.com:kimjeppesen01\/lavprishjemmeside\.dk\.git/);
  assert.match(docs.fatherSkills, /Bolt\.new -> GitHub -> cPanel over SSH/);
  assert.match(docs.fatherSkills, /programs\/lavprishjemmeside\/local-mirror/);
  assert.match(docs.fatherMemory, /POST \/api\/tasks\/intake/);
  assert.match(docs.fatherMemory, /sync-status` is green/);
  assert.match(docs.fatherHeartbeat, /POST \/api\/tasks\/intake/);
  assert.match(docs.fatherHeartbeat, /GitHub-hosted deployment/);
  assert.match(docs.fatherArchitecture, /api\.lavprishjemmeside\.dk/);
  assert.match(docs.fatherArchitecture, /git@github\.com:kimjeppesen01\/lavprishjemmeside\.dk\.git/);

  assert.match(docs.changelog, /Lavprishjemmeside, Father, and Engineer packets/);
  assert.match(docs.changelog, /Bolt\.new -> GitHub -> cPanel over SSH/);
});
