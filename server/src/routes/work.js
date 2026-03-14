import {
  denyInternalAccess,
  hasInternalAccess,
} from "../lib/internal-api.js";

function sendError(reply, error) {
  return reply.code(error.statusCode || 500).send({
    error: error.message || "Unexpected server error.",
    ...(error.code ? { code: error.code } : {}),
    ...(error.payload || {}),
  });
}

export async function workRoutes(app) {
  app.get("/api/skills", async () => ({
    generatedAt: new Date().toISOString(),
    skills: app.controlPlane.workService.listSkills(),
  }));

  app.get("/api/kanban", async () => app.controlPlane.workService.listKanban());

  app.get("/api/tasks/:taskId", async (request, reply) => {
    const task = app.controlPlane.workService.getTask(request.params.taskId);

    if (!task) {
      return reply.code(404).send({ error: "Unknown task" });
    }

    return { task };
  });

  app.post("/api/tasks/intake", async (request, reply) => {
    try {
      const result = app.controlPlane.workService.intakeTask(request.body || {});

      if (!result.accepted) {
        return reply.code(202).send(result);
      }

      return reply.code(201).send(result);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/tasks/:taskId/approve", async (request, reply) => {
    try {
      const task = app.controlPlane.workService.approveTask(request.params.taskId, {
        actorId: "operator",
      });
      const queueResult = await app.controlPlane.agentManager.invoke("engineer", {
        action: "queue-task",
        taskId: request.params.taskId,
      });

      return {
        ok: true,
        task,
        queueResult,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/tasks/:taskId/reject", async (request, reply) => {
    try {
      const task = app.controlPlane.workService.rejectTask(request.params.taskId, {
        actorId: "operator",
      });

      return {
        ok: true,
        task,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/tasks/:taskId/engineer-transition", async (request, reply) => {
    if (!hasInternalAccess(request, app.controlPlane.internalApiToken)) {
      return denyInternalAccess(
        reply,
        "Engineer transition is not available from the operator UI.",
      );
    }

    try {
      const payload = request.body || {};
      if (!payload.targetStage) {
        return reply.code(400).send({ error: "targetStage is required" });
      }

      const result = await app.controlPlane.agentManager.invoke("engineer", {
        action: "transition-task",
        taskId: request.params.taskId,
        targetStage: payload.targetStage,
        message: payload.message,
        releaseChecklist: payload.releaseChecklist,
      });

      return {
        ok: true,
        result,
        task: app.controlPlane.workService.getTask(request.params.taskId),
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/chat/context", async (request, reply) => {
    const taskId = request.query.taskId || null;
    const context = app.controlPlane.workService.getChatContext({ taskId });

    if (taskId && !context.task) {
      return reply.code(404).send({ error: "Unknown task" });
    }

    return context;
  });

  app.get("/api/chat/threads/:threadId", async (request, reply) => {
    try {
      return app.controlPlane.workService.getThread(request.params.threadId);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/chat/agents", async () => ({
    generatedAt: new Date().toISOString(),
    agents: app.controlPlane.workService.listChatAgents(),
  }));

  app.get("/api/chat/agents/:agentId/workspace", async (request, reply) => {
    try {
      return app.controlPlane.workService.getAgentWorkspace(request.params.agentId, {
        taskId: request.query.taskId || null,
        sessionId: request.query.sessionId || null,
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/chat/agents/:agentId/sessions", async (request, reply) => {
    try {
      const payload = app.controlPlane.workService.createSession(
        request.params.agentId,
        request.body || {},
      );

      return reply.code(201).send(payload);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/chat/sessions/:sessionId", async (request, reply) => {
    try {
      return app.controlPlane.workService.getSession(request.params.sessionId);
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/tasks/:taskId/skills", async (request, reply) => {
    try {
      const task = app.controlPlane.workService.updateTaskRequestedSkills(
        request.params.taskId,
        {
          ...(request.body || {}),
          actorId: "operator",
        },
      );

      return {
        ok: true,
        task,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch("/api/chat/sessions/:sessionId/skills", async (request, reply) => {
    try {
      const payload = app.controlPlane.workService.updateSessionRequestedSkills(
        request.params.sessionId,
        {
          ...(request.body || {}),
          actorId: "operator",
        },
      );

      return {
        ok: true,
        ...payload,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/chat/sessions/:sessionId/messages", async (request, reply) => {
    try {
      const payload = await app.controlPlane.workService.sendSessionMessage(
        request.params.sessionId,
        request.body || {},
      );

      return {
        ok: true,
        ...payload,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/chat/sessions/:sessionId/fork-model", async (request, reply) => {
    try {
      const payload = app.controlPlane.workService.forkSessionModel(
        request.params.sessionId,
        request.body || {},
      );

      return {
        ok: true,
        ...payload,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/chat/sessions/:sessionId/context", async (request, reply) => {
    try {
      return app.controlPlane.workService.getSessionContext(request.params.sessionId, {
        draft: request.query.draft || "",
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post("/api/chat/sessions/:sessionId/compact", async (request, reply) => {
    try {
      const payload = app.controlPlane.workService.compactSession(
        request.params.sessionId,
      );

      return {
        ok: true,
        ...payload,
      };
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get("/api/models/catalog", async (request) => ({
    generatedAt: new Date().toISOString(),
    agentId: request.query.agent_id || null,
    models: app.controlPlane.workService.listModelCatalog(
      request.query.agent_id || null,
    ),
  }));

  app.get("/api/work/events", async (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    reply.raw.write("retry: 2000\n\n");

    const unsubscribe = app.controlPlane.workService.subscribe((event) => {
      reply.raw.write(`event: work\ndata: ${JSON.stringify(event)}\n\n`);
    });

    request.raw.on("close", () => {
      unsubscribe();
    });
  });
}

export default workRoutes;
