import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { rootDir } from "./support.js";

const FILES = {
  engineerUser: "agents/Engineer/user.md",
  engineerSkills: "agents/Engineer/skills.md",
  fatherUser: "agents/IAn/user.md",
  fatherSkills: "agents/IAn/skills.md",
  fatherArchitecture: "agents/IAn/ARCHITECTURE.md",
  lavprisSoul: "agents/lavprishjemmeside/lavprishjemmeside-master/soul.md",
  lavprisUser: "agents/lavprishjemmeside/lavprishjemmeside-master/user.md",
  lavprisSkills: "agents/lavprishjemmeside/lavprishjemmeside-master/skills.md",
  lavprisTools: "agents/lavprishjemmeside/lavprishjemmeside-master/tools.md",
  clientTemplateArchitecture:
    "agents/lavprishjemmeside/templates/client-agent/ARCHITECTURE.md",
  clientTemplateSkills:
    "agents/lavprishjemmeside/templates/client-agent/skills.md",
  parentClientSoul:
    "agents/lavprishjemmeside/clients/lavprishjemmeside-dk/soul.md",
  parentClientUser:
    "agents/lavprishjemmeside/clients/lavprishjemmeside-dk/user.md",
  parentClientSkills:
    "agents/lavprishjemmeside/clients/lavprishjemmeside-dk/skills.md",
  parentClientArchitecture:
    "agents/lavprishjemmeside/clients/lavprishjemmeside-dk/ARCHITECTURE.md",
  ljSoul: "agents/lavprishjemmeside/clients/ljdesignstudio-dk/soul.md",
  ljUser: "agents/lavprishjemmeside/clients/ljdesignstudio-dk/user.md",
  ljSkills: "agents/lavprishjemmeside/clients/ljdesignstudio-dk/skills.md",
  ljArchitecture:
    "agents/lavprishjemmeside/clients/ljdesignstudio-dk/ARCHITECTURE.md",
  clientGenerator: "server/src/lib/lavpris-client-agents.js",
};

async function load(relativePath) {
  return readFile(path.join(rootDir, relativePath), "utf8");
}

test("Lavprishjemmeside commerce knowledge is encoded across Engineer, Father, Master, and client agents", async () => {
  const docs = Object.fromEntries(
    await Promise.all(
      Object.entries(FILES).map(async ([key, relativePath]) => [
        key,
        await load(relativePath),
      ]),
    ),
  );

  assert.match(docs.engineerUser, /e-?commerce|commerce|shop/i);
  assert.match(docs.engineerUser, /Flatpay|Frisbii/i);
  assert.match(docs.engineerSkills, /commerce|Shopify and Commerce Systems/i);

  assert.match(docs.fatherUser, /e-?commerce|commerce|shop/i);
  assert.match(docs.fatherSkills, /Lavprishjemmeside AI CMS.*e-?commerce|shop/i);
  assert.match(docs.fatherArchitecture, /lavprishjemmeside/i);

  assert.match(docs.lavprisSoul, /e-?commerce|commerce|shop/i);
  assert.match(docs.lavprisUser, /shop|checkout|Flatpay|Frisbii/i);
  assert.match(docs.lavprisSkills, /e-?commerce|catalog|checkout|order/i);
  assert.match(docs.lavprisTools, /shop|ljdesignstudio/i);

  for (const key of [
    "clientTemplateArchitecture",
    "clientTemplateSkills",
    "parentClientSoul",
    "parentClientUser",
    "parentClientSkills",
    "parentClientArchitecture",
    "ljSoul",
    "ljUser",
    "ljSkills",
    "ljArchitecture",
    "clientGenerator",
  ]) {
    assert.match(
      docs[key],
      /shop|e-?commerce|checkout|order|catalog|Flatpay|Frisbii/i,
      `${key} should mention the CMS commerce lane`,
    );
  }
});
