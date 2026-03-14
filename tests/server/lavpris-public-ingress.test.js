import assert from "node:assert/strict";
import test from "node:test";

import { makeLavprisIngressPair } from "./support.js";

const PROVISION_TOKEN = "lavpris-provision-secret";

test("Lavpris public ingress health checks the private control plane", async () => {
  const { ingress, cleanup } = await makeLavprisIngressPair(
    "agent-enterprise-lavpris-ingress-",
    {
      LAVPRIS_PROVISION_TOKEN: PROVISION_TOKEN,
    },
  );

  try {
    const response = await ingress.inject("/health");
    assert.equal(response.statusCode, 200);
    const payload = response.json();
    assert.equal(payload.status, "ok");
    assert.equal(payload.mode, "lavpris-public-ingress");
    assert.equal(payload.core.mode, "single-process-control-plane");
  } finally {
    await cleanup();
  }
});

test("Lavpris public ingress exposes only the assistant route family", async () => {
  const { ingress, cleanup } = await makeLavprisIngressPair(
    "agent-enterprise-lavpris-ingress-",
    {
      LAVPRIS_PROVISION_TOKEN: PROVISION_TOKEN,
    },
  );

  try {
    const response = await ingress.inject({
      method: "GET",
      url: "/api/chat/agents",
    });

    assert.equal(response.statusCode, 404);
    assert.match(response.json().error, /not available from the lavpris public ingress/i);
  } finally {
    await cleanup();
  }
});
