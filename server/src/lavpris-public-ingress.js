import { pathToFileURL } from "node:url";

import Fastify from "fastify";

import { loadEnv } from "./lib/env.js";
import { internalApiHeaders } from "./index.js";
import { LAVPRIS_PUBLIC_ROUTE_SPECS } from "./routes/lavpris.js";

const BODY_LIMIT_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const GENERAL_RATE_LIMIT = Object.freeze({
  windowMs: 60_000,
  max: 60,
});
const PROVISION_RATE_LIMIT = Object.freeze({
  windowMs: 10 * 60_000,
  max: 10,
});

function clientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  return forwarded || request.ip || "unknown";
}

function buildCoreOrigin(env) {
  return env.controlPlaneOrigin;
}

function parseResponseBody(raw, contentType) {
  if (!raw) {
    return null;
  }

  if (String(contentType || "").includes("application/json")) {
    return JSON.parse(raw);
  }

  return raw;
}

function createRateLimiter() {
  const buckets = new Map();

  return {
    consume(key, windowMs, max) {
      const now = Date.now();
      const existing = buckets.get(key);

      if (!existing || now >= existing.resetAt) {
        buckets.set(key, {
          count: 1,
          resetAt: now + windowMs,
        });
        return {
          allowed: true,
          remaining: max - 1,
        };
      }

      if (existing.count >= max) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(existing.resetAt - now, 0),
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: max - existing.count,
      };
    },
  };
}

function limitForRoute(routeSpec) {
  if (routeSpec.name === "provision-client-agent") {
    return PROVISION_RATE_LIMIT;
  }

  return GENERAL_RATE_LIMIT;
}

function createFetchForwarder({ env }) {
  const coreOrigin = buildCoreOrigin(env);

  return async function forward({ request, routeSpec }) {
    const url = new URL(request.url, coreOrigin);
    const headers = {
      ...internalApiHeaders(env.internalApiToken),
    };
    const contentType = request.headers["content-type"];
    const siteToken = request.headers["x-lavpris-site-token"];
    const provisionToken = request.headers["x-lavpris-provision-token"];
    const authorization = request.headers.authorization;

    if (contentType) {
      headers["content-type"] = contentType;
    }
    if (siteToken) {
      headers["x-lavpris-site-token"] = siteToken;
    }
    if (provisionToken) {
      headers["x-lavpris-provision-token"] = provisionToken;
    }
    if (authorization) {
      headers.authorization = authorization;
    }

    const response = await fetch(url, {
      method: routeSpec.method,
      headers,
      body:
        routeSpec.method === "GET" || request.body === undefined
          ? undefined
          : JSON.stringify(request.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const rawBody = await response.text();

    return {
      statusCode: response.status,
      contentType: response.headers.get("content-type") || "application/json",
      payload: parseResponseBody(rawBody, response.headers.get("content-type")),
    };
  };
}

function createHealthForwarder({ env }) {
  const coreOrigin = buildCoreOrigin(env);

  return async function forwardHealth() {
    const response = await fetch(`${coreOrigin}/health`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const rawBody = await response.text();

    return {
      statusCode: response.status,
      contentType: response.headers.get("content-type") || "application/json",
      payload: parseResponseBody(rawBody, response.headers.get("content-type")),
    };
  };
}

function sendForwardedPayload(reply, forwarded) {
  reply.code(forwarded.statusCode);

  if (forwarded.contentType) {
    reply.type(forwarded.contentType);
  }

  return reply.send(forwarded.payload);
}

function requireInternalToken(env) {
  if (!env.internalApiToken) {
    throw new Error(
      "AGENT_ENTERPRISE_INTERNAL_TOKEN must be configured for the Lavpris public ingress.",
    );
  }
}

export async function createLavprisPublicIngressApp(options = {}) {
  const env = options.env || loadEnv();
  requireInternalToken(env);

  const app = Fastify({
    logger: options.logger ?? false,
    disableRequestLogging: true,
    bodyLimit: BODY_LIMIT_BYTES,
    requestTimeout: REQUEST_TIMEOUT_MS,
  });
  const limiter = createRateLimiter();
  const forward = options.forward || createFetchForwarder({ env });
  const forwardHealth = options.forwardHealth || createHealthForwarder({ env });

  app.addHook("onRequest", async (request, reply) => {
    request.requestStartedAt = Date.now();
  });

  app.addHook("onResponse", async (request, reply) => {
    const durationMs = Date.now() - (request.requestStartedAt || Date.now());

    app.log.info(
      {
        surface: "lavpris-public-ingress",
        method: request.method,
        url: request.url,
        route: request.routeOptions?.url || null,
        statusCode: reply.statusCode,
        ip: clientIp(request),
        durationMs,
      },
      "Lavpris public ingress request",
    );
  });

  app.get("/health", async (request, reply) => {
    try {
      const forwarded = await forwardHealth({ request });
      if (forwarded.statusCode !== 200) {
        reply.code(503);
        return {
          status: "degraded",
          mode: "lavpris-public-ingress",
          coreStatusCode: forwarded.statusCode,
        };
      }

      return {
        status: "ok",
        mode: "lavpris-public-ingress",
        target: buildCoreOrigin(env),
        core: forwarded.payload,
      };
    } catch (error) {
      reply.code(503);
      return {
        status: "degraded",
        mode: "lavpris-public-ingress",
        error: error.message || "Unable to reach Agent Enterprise control plane.",
      };
    }
  });

  for (const routeSpec of LAVPRIS_PUBLIC_ROUTE_SPECS) {
    app.route({
      method: routeSpec.method,
      url: routeSpec.url,
      handler: async (request, reply) => {
        const limit = limitForRoute(routeSpec);
        const rateLimitKey = `${clientIp(request)}:${routeSpec.name}`;
        const result = limiter.consume(rateLimitKey, limit.windowMs, limit.max);

        if (!result.allowed) {
          reply
            .code(429)
            .header("retry-after", Math.ceil((result.retryAfterMs || 0) / 1000));
          return {
            error: "Rate limit exceeded.",
          };
        }

        try {
          const forwarded = await forward({
            request,
            routeSpec,
          });
          return sendForwardedPayload(reply, forwarded);
        } catch (error) {
          reply.code(502);
          return {
            error:
              error.message || "Lavpris public ingress could not reach Agent Enterprise.",
          };
        }
      },
    });
  }

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: "Route not available from the Lavpris public ingress.",
      method: request.method,
      path: request.url,
    }),
  );

  return app;
}

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

export async function startLavprisPublicIngress(options = {}) {
  const env = options.env || loadEnv();
  const app = await createLavprisPublicIngressApp({
    env,
    logger: options.logger || { level: env.logLevel },
    forward: options.forward,
    forwardHealth: options.forwardHealth,
  });

  registerShutdownHandlers(app);
  await app.listen({
    host: env.lavprisPublicIngressHost,
    port: env.lavprisPublicIngressPort,
  });

  return app;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startLavprisPublicIngress()
    .then((app) => {
      const { lavprisPublicIngressHost, lavprisPublicIngressPort } = loadEnv();
      console.info(
        `Lavpris public ingress listening on http://${lavprisPublicIngressHost}:${lavprisPublicIngressPort}`,
      );
      return app;
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
