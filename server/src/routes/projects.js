import {
  buildProjectDetailModel,
  buildProjectsDirectoryModel,
} from "../lib/projects-model.js";

export async function projectRoutes(app) {
  app.get("/api/projects", async () =>
    buildProjectsDirectoryModel({
      agentManager: app.controlPlane.agentManager,
      programRegistry: app.controlPlane.registries.programs,
    }),
  );

  app.get("/api/projects/:projectId", async (request, reply) => {
    const payload = buildProjectDetailModel({
      projectId: request.params.projectId,
      agentManager: app.controlPlane.agentManager,
      programRegistry: app.controlPlane.registries.programs,
    });

    if (!payload) {
      return reply.code(404).send({
        error: "Project not found",
        projectId: request.params.projectId,
      });
    }

    return payload;
  });
}

export default projectRoutes;
