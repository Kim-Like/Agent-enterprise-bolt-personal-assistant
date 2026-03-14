import {
  denyInternalAccess,
  hasInternalAccess,
} from "../lib/internal-api.js";

export const LAVPRIS_PUBLIC_ROUTE_SPECS = Object.freeze([
  {
    name: "provision-client-agent",
    method: "POST",
    url: "/api/lavpris/client-agents/provision",
  },
  {
    name: "get-assistant",
    method: "GET",
    url: "/api/lavpris/sites/:siteKey/assistant",
  },
  {
    name: "update-assistant-setup",
    method: "PATCH",
    url: "/api/lavpris/sites/:siteKey/assistant/setup",
  },
  {
    name: "create-assistant-session",
    method: "POST",
    url: "/api/lavpris/sites/:siteKey/assistant/sessions",
  },
  {
    name: "send-assistant-message",
    method: "POST",
    url: "/api/lavpris/sites/:siteKey/assistant/sessions/:sessionId/messages",
  },
  {
    name: "create-assistant-ticket",
    method: "POST",
    url: "/api/lavpris/sites/:siteKey/assistant/tickets",
  },
  {
    name: "master-rollout-status",
    method: "GET",
    url: "/api/lavpris/rollout/status",
  },
  {
    name: "site-rollout-status",
    method: "GET",
    url: "/api/lavpris/sites/:siteKey/rollout-status",
  },
]);

function sendError(reply, error) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || "Unexpected server error.",
    ...(error.code ? { code: error.code } : {}),
    ...(error.payload || {}),
  });
}

function bearerToken(request) {
  const header = String(request.headers.authorization || "").trim();

  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

function siteToken(request) {
  return (
    request.headers["x-lavpris-site-token"] ||
    request.headers["x-site-token"] ||
    bearerToken(request)
  );
}

function masterToken(request) {
  return request.headers["x-lavpris-master-token"] || bearerToken(request);
}

function rejectForbiddenFields(payload = {}, fields = []) {
  const forbidden = fields.filter((field) =>
    Object.prototype.hasOwnProperty.call(payload, field),
  );

  if (forbidden.length > 0) {
    const error = new Error(
      `Client assistant requests may not set: ${forbidden.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }
}

export async function lavprisRoutes(app, options = {}) {
  const service = app.controlPlane.lavprisClientAgents;
  const rolloutService = app.controlPlane.lavprisRolloutService;
  const requireInternalAccess = options.requireInternalAccess === true;
  const internalApiToken =
    options.internalApiToken || app.controlPlane.internalApiToken;

  function ensureInternalAccess(request, reply) {
    if (!requireInternalAccess) {
      return true;
    }

    if (hasInternalAccess(request, internalApiToken)) {
      return true;
    }

    denyInternalAccess(reply);
    return false;
  }

  function requireSiteAccess(request) {
    return service.authenticateSite(request.params.siteKey, siteToken(request));
  }

  function requireMasterAccess(request) {
    return rolloutService.requireMasterToken(masterToken(request));
  }

  app.post("/api/lavpris/client-agents/provision", async (request, reply) => {
    if (!ensureInternalAccess(request, reply)) {
      return;
    }

    try {
      service.requireProvisionToken(request.headers["x-lavpris-provision-token"]);
      const payload = await service.provisionClientAgent(request.body || {});

      return reply.code(201).send(payload);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/lavpris/sites/:siteKey/assistant", async (request, reply) => {
    if (!ensureInternalAccess(request, reply)) {
      return;
    }

    try {
      requireSiteAccess(request);
      const sessionId = String(request.query?.sessionId || "").trim();

      return {
        generatedAt: new Date().toISOString(),
        assistant: service.getAssistant(request.params.siteKey, { sessionId }),
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch(
    "/api/lavpris/sites/:siteKey/assistant/setup",
    async (request, reply) => {
      if (!ensureInternalAccess(request, reply)) {
        return;
      }

      try {
        requireSiteAccess(request);
        rejectForbiddenFields(request.body || {}, [
          "agentId",
          "sessionType",
          "requestedSkills",
          "modelFamily",
        ]);

        return {
          ok: true,
          assistant: await service.updateAssistantSetup(
            request.params.siteKey,
            request.body || {},
          ),
        };
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post(
    "/api/lavpris/sites/:siteKey/assistant/sessions",
    async (request, reply) => {
      if (!ensureInternalAccess(request, reply)) {
        return;
      }

      try {
        requireSiteAccess(request);
        rejectForbiddenFields(request.body || {}, [
          "agentId",
          "sessionType",
          "requestedSkills",
          "modelFamily",
        ]);

        return reply
          .code(201)
          .send(service.createClientSession(request.params.siteKey, request.body || {}));
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post(
    "/api/lavpris/sites/:siteKey/assistant/sessions/:sessionId/messages",
    async (request, reply) => {
      if (!ensureInternalAccess(request, reply)) {
        return;
      }

      try {
        requireSiteAccess(request);
        rejectForbiddenFields(request.body || {}, [
          "agentId",
          "sessionType",
          "requestedSkills",
          "modelFamily",
        ]);

        return {
          ok: true,
          ...(await service.sendClientMessage(
            request.params.siteKey,
            request.params.sessionId,
            request.body || {},
          )),
        };
      } catch (error) {
        return sendError(reply, error);
      }
    },
  );

  app.post("/api/lavpris/sites/:siteKey/assistant/tickets", async (request, reply) => {
    if (!ensureInternalAccess(request, reply)) {
      return;
    }

    try {
      requireSiteAccess(request);
      rejectForbiddenFields(request.body || {}, [
        "agentId",
        "sessionType",
        "requestedSkills",
        "modelFamily",
      ]);

      const result = service.createEngineerTicket(
        request.params.siteKey,
        request.body || {},
      );

      return reply.code(result.accepted ? 201 : 202).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/lavpris/rollout/status", async (request, reply) => {
    if (!ensureInternalAccess(request, reply)) {
      return;
    }

    try {
      requireMasterAccess(request);
      return await rolloutService.getMasterRolloutStatus();
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/lavpris/sites/:siteKey/rollout-status", async (request, reply) => {
    if (!ensureInternalAccess(request, reply)) {
      return;
    }

    try {
      requireSiteAccess(request);
      return await rolloutService.getSiteRolloutStatus(request.params.siteKey);
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
