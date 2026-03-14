import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { loadEnv } from "./lib/env.js";
import { internalApiHeaders } from "./lib/internal-api.js";

function registerShutdownHandlers(app) {
  const shutdown = async (signal) => {
    try {
      await app.close();
    } finally {
      process.exit(signal ? 0 : 1);
    }
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

export async function startServer(options = {}) {
  const env = options.env || loadEnv();
  const app = await createApp({
    env,
    logger: options.logger || { level: env.logLevel },
  });

  registerShutdownHandlers(app);
  await app.listen({ host: env.host, port: env.port });

  return app;
}

export { internalApiHeaders };

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer().then((app) => {
    const { host, port } = app.controlPlane.env;
    console.info(`Agent Enterprise control plane listening on http://${host}:${port}`);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
