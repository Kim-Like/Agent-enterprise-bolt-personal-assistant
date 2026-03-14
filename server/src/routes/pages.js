import fs from "node:fs/promises";

const HTML_TYPE = "text/html; charset=utf-8";

async function sendPage(reply, page) {
  const contents = await fs.readFile(page.absolutePath, "utf8");
  return reply.type(HTML_TYPE).send(contents);
}

export async function pageRoutes(app) {
  for (const page of app.controlPlane.pageCatalog) {
    app.get(page.route, async (_request, reply) => sendPage(reply, page));
  }

  const chatPage = app.controlPlane.pageCatalog.find((page) => page.route === "/chat");
  if (chatPage) {
    app.get("/chat/:agentId", async (_request, reply) => sendPage(reply, chatPage));
  }
}

export default pageRoutes;
