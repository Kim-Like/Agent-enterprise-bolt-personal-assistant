import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { makeApp } from "./support.js";

test("chat home lists agents with avatars and isolated session inventories", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-chat-");

  try {
    const agentsResponse = await app.inject("/api/chat/agents");
    assert.equal(agentsResponse.statusCode, 200);

    const agentsPayload = agentsResponse.json();
    const engineer = agentsPayload.agents.find((agent) => agent.id === "engineer");
    const artisan = agentsPayload.agents.find((agent) => agent.id === "artisan-master");

    assert.ok(engineer);
    assert.match(engineer.avatarUrl, /^data:image\/svg\+xml/);
    assert.equal(engineer.sessionCount, 0);

    const created = await app.inject({
      method: "POST",
      url: "/api/chat/agents/engineer/sessions",
      payload: {
        modelFamily: "sonnet",
      },
    });

    assert.equal(created.statusCode, 201);
    assert.equal(created.json().session.agentId, "engineer");

    const [engineerWorkspace, artisanWorkspace] = await Promise.all([
      app.inject("/api/chat/agents/engineer/workspace"),
      app.inject("/api/chat/agents/artisan-master/workspace"),
    ]);

    assert.equal(engineerWorkspace.statusCode, 200);
    assert.equal(engineerWorkspace.json().sessions.length, 1);
    assert.equal(engineerWorkspace.json().activeSession.session.agentId, "engineer");

    assert.equal(artisanWorkspace.statusCode, 200);
    assert.equal(artisanWorkspace.json().sessions.length, 0);
    assert.equal(artisanWorkspace.json().activeSession, null);

    const chatPage = await app.inject("/chat");
    assert.equal(chatPage.statusCode, 200);
    assert.match(chatPage.body, /Agent-scoped chat/i);
  } finally {
    await cleanup();
  }
});

test("master workspaces load packet identity and carry learned memory across sessions", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-chat-");

  try {
    const firstSession = await app.inject({
      method: "POST",
      url: "/api/chat/agents/artisan-master/sessions",
      payload: {
        modelFamily: "haiku",
      },
    });

    assert.equal(firstSession.statusCode, 201);
    const firstSessionId = firstSession.json().session.id;

    const firstReply = await app.inject({
      method: "POST",
      url: `/api/chat/sessions/${firstSessionId}/messages`,
      payload: {
        body: "Prioritize the reporting stabilization work and keep the B2B flow safe.",
      },
    });

    assert.equal(firstReply.statusCode, 200);

    const secondSession = await app.inject({
      method: "POST",
      url: "/api/chat/agents/artisan-master/sessions",
      payload: {
        modelFamily: "haiku",
      },
    });

    assert.equal(secondSession.statusCode, 201);
    const secondContext = await app.inject(
      `/api/chat/sessions/${secondSession.json().session.id}/context`,
    );

    assert.equal(secondContext.statusCode, 200);
    const context = secondContext.json();

    assert.equal(context.role.sourcePath, "agents/artisan/artisan-master");
    assert.match(context.role.soul, /Artisan Master - Soul/i);
    assert.match(context.role.userContext, /Business:\s+The Artisan/i);
    assert.match(context.role.baseMemory, /Owned Program Scope/i);
    assert.match(context.role.orchestrationSkills, /Domain Competencies/i);
    assert.match(context.role.architecture, /Artisan Master Architecture/i);
    assert.ok(context.learning.recentNotes.length >= 1);
    assert.match(
      context.learning.recentNotes[0].note,
      /reporting stabilization work/i,
    );
  } finally {
    await cleanup();
  }
});

test("model switching creates a new session and context budgets differ by Claude family", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-chat-");

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/chat/agents/engineer/sessions",
      payload: {
        modelFamily: "haiku",
      },
    });

    assert.equal(created.statusCode, 201);
    const firstSessionId = created.json().session.id;

    const firstContext = await app.inject(
      `/api/chat/sessions/${firstSessionId}/context`,
    );
    assert.equal(firstContext.statusCode, 200);
    assert.equal(firstContext.json().modelFamily, "haiku");

    const forked = await app.inject({
      method: "POST",
      url: `/api/chat/sessions/${firstSessionId}/fork-model`,
      payload: {
        modelFamily: "opus",
      },
    });

    assert.equal(forked.statusCode, 200);
    assert.equal(forked.json().session.continuedFromSessionId, firstSessionId);
    assert.equal(forked.json().session.modelFamily, "opus");

    const firstSession = await app.inject(`/api/chat/sessions/${firstSessionId}`);
    const secondContext = await app.inject(
      `/api/chat/sessions/${forked.json().session.id}/context`,
    );

    assert.equal(firstSession.statusCode, 200);
    assert.equal(firstSession.json().session.status, "superseded");

    assert.equal(secondContext.statusCode, 200);
    assert.equal(secondContext.json().modelFamily, "opus");
    assert.ok(
      secondContext.json().maxContextTokens > firstContext.json().maxContextTokens,
    );
  } finally {
    await cleanup();
  }
});

test("compacting a long session preserves the session id and replaces older turns with carryover state", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-chat-");

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/chat/agents/engineer/sessions",
      payload: {
        modelFamily: "sonnet",
      },
    });

    const sessionId = created.json().session.id;

    for (const body of [
      "Plan the dashboard data contract.",
      "Break down the implementation into smaller units.",
      "List the main testing concerns before delivery.",
    ]) {
      const sent = await app.inject({
        method: "POST",
        url: `/api/chat/sessions/${sessionId}/messages`,
        payload: { body },
      });

      assert.equal(sent.statusCode, 200);
    }

    const before = await app.inject(`/api/chat/sessions/${sessionId}/context`);
    assert.equal(before.statusCode, 200);
    assert.equal(before.json().compaction.available, true);

    const compacted = await app.inject({
      method: "POST",
      url: `/api/chat/sessions/${sessionId}/compact`,
    });

    assert.equal(compacted.statusCode, 200);
    assert.equal(compacted.json().session.id, sessionId);
    assert.equal(compacted.json().compactionHistory.length, 1);
    assert.ok(compacted.json().context.carryoverSummary);
    assert.equal(compacted.json().context.compaction.snapshotCount, 1);
    assert.ok(compacted.json().context.compaction.compactedMessageCount >= 1);
    assert.ok(
      compacted.json().messages.some((message) => message.isCompacted),
    );
  } finally {
    await cleanup();
  }
});

test("chat replies use sidebar runtime status and keep the main body conversational", async () => {
  const { app, cleanup } = await makeApp("agent-enterprise-chat-");

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/chat/agents/father/sessions",
      payload: {
        modelFamily: "haiku",
      },
    });

    const sessionId = created.json().session.id;
    const reply = await app.inject({
      method: "POST",
      url: `/api/chat/sessions/${sessionId}/messages`,
      payload: {
        body: "Hey IAn",
      },
    });

    assert.equal(reply.statusCode, 200);
    const messages = reply.json().messages;
    const lastMessage = messages.at(-1);

    assert.equal(lastMessage.authorType, "agent");
    assert.doesNotMatch(lastMessage.body, /responded on/i);
    assert.match(lastMessage.body, /what do you want me to focus on/i);
    assert.equal(reply.json().context.provider.mode, "simulated");
    assert.equal(reply.json().context.provider.configured, false);
  } finally {
    await cleanup();
  }
});

test("chat can use the legacy Claude CLI OAuth runtime instead of API mode", async () => {
  const runtimeDir = await mkdtemp(
    path.join(os.tmpdir(), "agent-enterprise-claude-cli-"),
  );
  const fakeBinary = path.join(runtimeDir, "claude");
  await writeFile(
    fakeBinary,
    `#!/usr/bin/env bash
if [ "$1" = "auth" ] && [ "$2" = "status" ]; then
  printf '%s\n' '{"loggedIn": true, "authMethod": "claude.ai", "email": "operator@example.com", "subscriptionType": "pro"}'
  exit 0
fi

for arg in "$@"; do
  if [ "$arg" = "--print" ]; then
    printf '%s\n' 'Live CLI reply from OAuth session.'
    exit 0
  fi
done

printf '%s\n' 'unexpected command' >&2
exit 1
`,
  );
  await chmod(fakeBinary, 0o755);

  const { app, cleanup } = await makeApp("agent-enterprise-chat-", {
    DEFAULT_MODEL_PROVIDER: "claude",
    CLAUDE_BINARY: fakeBinary,
  });

  try {
    const created = await app.inject({
      method: "POST",
      url: "/api/chat/agents/father/sessions",
      payload: {
        modelFamily: "haiku",
      },
    });

    assert.equal(created.statusCode, 201);
    const sessionId = created.json().session.id;

    const workspace = await app.inject("/api/chat/agents/father/workspace");
    assert.equal(workspace.statusCode, 200);
    assert.equal(workspace.json().context.provider.mode, "claude-cli-oauth");
    assert.equal(workspace.json().context.provider.configured, true);
    assert.match(
      workspace.json().context.provider.detail,
      /operator@example\.com/i,
    );

    const reply = await app.inject({
      method: "POST",
      url: `/api/chat/sessions/${sessionId}/messages`,
      payload: {
        body: "Hey IAn",
      },
    });

    assert.equal(reply.statusCode, 200);
    assert.equal(reply.json().context.provider.mode, "claude-cli-oauth");
    assert.equal(reply.json().context.provider.configured, true);
    assert.equal(reply.json().messages.at(-1).body, "Live CLI reply from OAuth session.");
  } finally {
    await cleanup();
    await rm(runtimeDir, { recursive: true, force: true });
  }
});
