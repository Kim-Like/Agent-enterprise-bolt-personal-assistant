import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../../server/src/app.js";
import { createLavprisPublicIngressApp } from "../../server/src/lavpris-public-ingress.js";
import { loadEnv } from "../../server/src/lib/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const rootDir = path.resolve(__dirname, "..", "..");

export async function makeApp(
  prefix = "agent-enterprise-test-",
  envOverrides = {},
  appOptions = {},
) {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  const env = loadEnv({
    APP_ROOT: rootDir,
    APP_DATA_DIR: tempDir,
    APP_ENV: "test",
    DEFAULT_MODEL_PROVIDER: "simulated",
    AGENT_ENTERPRISE_INTERNAL_TOKEN: "test-internal-api-token",
    LAVPRIS_CLIENT_AGENT_ROOT_PATH: path.join(tempDir, "generated-client-agents"),
    LAVPRIS_CLIENT_AGENT_REGISTRY_PATH: path.join(
      tempDir,
      "generated-client-agents.registry.json",
    ),
    ...envOverrides,
  });
  const app = await createApp({ env, ...appOptions });

  return {
    app,
    cleanup: async () => {
      await app.close();
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

function createInjectForwarder(controlPlaneApp) {
  return async function forward({ request, routeSpec }) {
    const payload =
      routeSpec.method === "GET" || request.body === undefined
        ? undefined
        : request.body;
    const headers = {
      "x-control-plane-token": controlPlaneApp.controlPlane.internalApiToken,
      ...(request.headers["x-lavpris-site-token"]
        ? { "x-lavpris-site-token": request.headers["x-lavpris-site-token"] }
        : {}),
      ...(request.headers["x-lavpris-provision-token"]
        ? {
            "x-lavpris-provision-token":
              request.headers["x-lavpris-provision-token"],
          }
        : {}),
      ...(request.headers.authorization
        ? { authorization: request.headers.authorization }
        : {}),
    };

    if (payload !== undefined || request.headers["content-type"]) {
      headers["content-type"] =
        request.headers["content-type"] || "application/json";
    }

    const response = await controlPlaneApp.inject({
      method: routeSpec.method,
      url: request.url,
      headers,
      payload,
    });

    return {
      statusCode: response.statusCode,
      contentType: response.headers["content-type"] || "application/json",
      payload: response.headers["content-type"]?.includes("application/json")
        ? response.json()
        : response.body,
    };
  };
}

export async function makeLavprisIngressPair(
  prefix = "agent-enterprise-lavpris-ingress-",
  envOverrides = {},
  appOptions = {},
) {
  const { app, cleanup } = await makeApp(prefix, envOverrides, appOptions);
  const ingress = await createLavprisPublicIngressApp({
    env: app.controlPlane.env,
    forward: createInjectForwarder(app),
    forwardHealth: async () => {
      const response = await app.inject("/health");

      return {
        statusCode: response.statusCode,
        contentType: response.headers["content-type"] || "application/json",
        payload: response.json(),
      };
    },
  });

  return {
    app,
    ingress,
    cleanup: async () => {
      await ingress.close();
      await cleanup();
    },
  };
}
