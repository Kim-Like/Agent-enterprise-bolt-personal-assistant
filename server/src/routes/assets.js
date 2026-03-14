import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

export async function assetRoutes(app) {
  app.get("/assets/*", async (request, reply) => {
    const assetRoot = path.resolve(app.controlPlane.env.cwd, "client/assets");
    const requestedPath = request.params["*"] || "";
    const absolutePath = path.resolve(assetRoot, requestedPath);
    const isInsideAssetRoot =
      absolutePath === assetRoot || absolutePath.startsWith(`${assetRoot}${path.sep}`);

    if (!isInsideAssetRoot) {
      return reply.code(404).send({ error: "Asset not found" });
    }

    try {
      const contents = await fs.readFile(absolutePath);
      const contentType =
        MIME_TYPES[path.extname(absolutePath)] || "application/octet-stream";

      return reply.type(contentType).send(contents);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "EISDIR") {
        return reply.code(404).send({ error: "Asset not found" });
      }

      throw error;
    }
  });
}

export default assetRoutes;
