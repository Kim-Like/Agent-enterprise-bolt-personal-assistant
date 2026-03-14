import { buildOverviewModel } from "../lib/overview-model.js";

export async function overviewRoutes(app) {
  app.get("/api/overview", async () =>
    buildOverviewModel({
      agentManager: app.controlPlane.agentManager,
      programRegistry: app.controlPlane.registries.programs,
    }),
  );
}

export default overviewRoutes;
