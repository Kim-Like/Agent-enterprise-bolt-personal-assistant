import fs from "node:fs/promises";
import path from "node:path";
import { buildAgentAvatar } from "../lib/chat-avatar.js";

const ALLOWED_FILES = ["soul.md", "user.md"];

function resolvePath(appRoot, sourcePath, file) {
  const resolved = path.resolve(appRoot, sourcePath, file);
  const base = path.resolve(appRoot, sourcePath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}

export async function agentConfigRoutes(app) {
  const env = app.controlPlane.env;
  const appRoot = env.cwd;

  app.get("/api/agent-config/:agentId", async (request, reply) => {
    const entry = app.controlPlane.agentManager.get(request.params.agentId);
    if (!entry) return reply.code(404).send({ error: "Unknown agent" });

    const sourcePath = entry.sourcePath;
    if (!sourcePath) return reply.code(400).send({ error: "Agent has no sourcePath" });

    const files = {};
    for (const file of ALLOWED_FILES) {
      try {
        const filePath = resolvePath(appRoot, sourcePath, file);
        files[file] = await fs.readFile(filePath, "utf8");
      } catch {
        files[file] = "";
      }
    }

    const avatar = buildAgentAvatar(entry);

    return {
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      sourcePath,
      files,
      chatIdentity: entry.chatIdentity || {},
      avatar: {
        mode: avatar.avatarMode,
        seed: avatar.avatarSeed,
        glyph: avatar.avatarGlyph,
        accent: avatar.avatarAccent,
        imagePath: avatar.avatarImagePath,
        url: avatar.avatarUrl,
        svg: avatar.avatarSvg,
      },
    };
  });

  app.put("/api/agent-config/:agentId/file", async (request, reply) => {
    const entry = app.controlPlane.agentManager.get(request.params.agentId);
    if (!entry) return reply.code(404).send({ error: "Unknown agent" });

    const { file, content } = request.body || {};
    if (!ALLOWED_FILES.includes(file)) return reply.code(400).send({ error: "File not allowed" });
    if (typeof content !== "string") return reply.code(400).send({ error: "content must be a string" });

    const sourcePath = entry.sourcePath;
    if (!sourcePath) return reply.code(400).send({ error: "Agent has no sourcePath" });

    const filePath = resolvePath(appRoot, sourcePath, file);
    await fs.writeFile(filePath, content, "utf8");

    return { ok: true, file, length: content.length };
  });

  app.put("/api/agent-config/:agentId/avatar", async (request, reply) => {
    const agentId = request.params.agentId;
    const entry = app.controlPlane.agentManager.get(agentId);
    if (!entry) return reply.code(404).send({ error: "Unknown agent" });

    const { glyph, accent } = request.body || {};

    if (glyph !== undefined) {
      const clean = String(glyph).slice(0, 4).trim();
      if (!entry.chatIdentity) entry.chatIdentity = {};
      entry.chatIdentity.avatarGlyph = clean;
    }
    if (accent !== undefined) {
      const clean = String(accent).slice(0, 9);
      if (!entry.chatIdentity) entry.chatIdentity = {};
      entry.chatIdentity.avatarAccent = clean;
    }

    const avatar = buildAgentAvatar(entry);
    return {
      ok: true,
      avatar: {
        mode: avatar.avatarMode,
        seed: avatar.avatarSeed,
        glyph: avatar.avatarGlyph,
        accent: avatar.avatarAccent,
        url: avatar.avatarUrl,
        svg: avatar.avatarSvg,
      },
    };
  });

  app.get("/api/agent-config", async () => {
    const entries = app.controlPlane.agentManager.list();
    return {
      agents: entries.map((e) => {
        const avatar = buildAgentAvatar(e);
        return {
          id: e.id,
          name: e.name,
          kind: e.kind,
          parentId: e.parentId,
          sourcePath: e.sourcePath,
          enablement: e.enablement?.state,
          avatarUrl: avatar.avatarUrl,
          avatarGlyph: avatar.avatarGlyph,
          avatarAccent: avatar.avatarAccent,
        };
      }),
    };
  });
}

export default agentConfigRoutes;
