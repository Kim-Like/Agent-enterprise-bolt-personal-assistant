import { randomUUID } from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

function buildDailyBriefing(stats, upcomingEvents, recentTasks) {
  const lines = [];
  const todoCount = stats.taskCounts?.todo || 0;
  const inProgressCount = stats.taskCounts?.in_progress || 0;
  const nextEvent = upcomingEvents[0];

  if (todoCount > 0 || inProgressCount > 0) {
    const parts = [];
    if (inProgressCount > 0) parts.push(`${inProgressCount} in progress`);
    if (todoCount > 0) parts.push(`${todoCount} todo`);
    lines.push(`Tasks: ${parts.join(", ")}.`);
  } else {
    lines.push("No open tasks.");
  }

  if (nextEvent) {
    const d = new Date(nextEvent.start_at);
    const when = isNaN(d) ? nextEvent.start_at : d.toLocaleString("en-GB", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    lines.push(`Next event: "${nextEvent.title}" at ${when}.`);
  } else {
    lines.push("No upcoming events.");
  }

  if (stats.draftCount > 0) {
    lines.push(`${stats.draftCount} social draft${stats.draftCount !== 1 ? "s" : ""} pending.`);
  }

  if (stats.recentFitness > 0) {
    lines.push(`${stats.recentFitness} fitness ${stats.recentFitness !== 1 ? "sessions" : "session"} logged this week.`);
  }

  return lines.join(" ");
}

function buildOverviewPayload(db) {
  const stats = db.pa.overviewStats();
  const upcomingEvents = db.pa.listEvents({ from: nowIso() }).slice(0, 5);
  const recentTasks = db.pa.listTasks({ status: "todo" }).slice(0, 5);
  const recentLogs = db.pa.listFitnessLogs({ limit: 3 });
  const socialDrafts = db.pa.listSocialDrafts({ status: "draft" }).slice(0, 3);

  return {
    generatedAt: nowIso(),
    stats,
    taskCounts: stats.taskCounts,
    draftCount: stats.draftCount,
    recentFitness: stats.recentFitness,
    emailAccounts: stats.emailAccounts,
    upcomingEvents,
    recentTasks,
    recentLogs,
    socialDrafts,
    dailyBriefing: buildDailyBriefing(stats, upcomingEvents, recentTasks),
    modules: [
      { id: "tasks", label: "Task Manager", href: "/pa/tasks", status: "active" },
      { id: "calendar", label: "Calendar", href: "/pa/calendar", status: "active" },
      { id: "email", label: "Email", href: "/pa/email", status: "active" },
      { id: "social", label: "Social", href: "/pa/social", status: "active" },
      { id: "fitness", label: "Fitness", href: "/pa/fitness", status: "active" },
    ],
  };
}

export async function paRoutes(app) {
  const db = app.controlPlane.db;

  app.get("/api/pa/overview", async () => buildOverviewPayload(db));

  app.get("/api/pa/tasks", async (request) => {
    const { status } = request.query;
    const tasks = db.pa.listTasks(status ? { status } : undefined);
    return { generatedAt: nowIso(), total: tasks.length, entries: tasks };
  });

  app.get("/api/pa/tasks/:taskId", async (request, reply) => {
    const task = db.pa.getTask(request.params.taskId);
    if (!task) return reply.code(404).send({ error: "Task not found" });
    return { task };
  });

  app.post("/api/pa/tasks", async (request, reply) => {
    const body = request.body || {};
    if (!body.title) return reply.code(400).send({ error: "title is required" });
    const task = db.pa.upsertTask({
      id: randomUUID(),
      title: body.title,
      description: body.description || "",
      status: body.status || "todo",
      priority: body.priority || "medium",
      dueDate: body.dueDate || null,
      tags: body.tags || [],
    });
    return reply.code(201).send({ task });
  });

  app.patch("/api/pa/tasks/:taskId", async (request, reply) => {
    const existing = db.pa.getTask(request.params.taskId);
    if (!existing) return reply.code(404).send({ error: "Task not found" });
    const task = db.pa.upsertTask({ ...existing, ...(request.body || {}), id: existing.id });
    return { task };
  });

  app.delete("/api/pa/tasks/:taskId", async (request, reply) => {
    if (!db.pa.getTask(request.params.taskId)) return reply.code(404).send({ error: "Task not found" });
    db.pa.deleteTask(request.params.taskId);
    return reply.code(204).send();
  });

  app.get("/api/pa/calendar", async (request) => {
    const { from, to } = request.query;
    const events = db.pa.listEvents(from || to ? { from, to } : undefined);
    return { generatedAt: nowIso(), total: events.length, entries: events };
  });

  app.get("/api/pa/calendar/:eventId", async (request, reply) => {
    const event = db.pa.getEvent(request.params.eventId);
    if (!event) return reply.code(404).send({ error: "Event not found" });
    return { event };
  });

  app.post("/api/pa/calendar", async (request, reply) => {
    const body = request.body || {};
    if (!body.title) return reply.code(400).send({ error: "title is required" });
    if (!body.startAt) return reply.code(400).send({ error: "startAt is required" });
    if (!body.endAt) return reply.code(400).send({ error: "endAt is required" });
    const event = db.pa.upsertEvent({
      id: randomUUID(),
      title: body.title,
      description: body.description || "",
      startAt: body.startAt,
      endAt: body.endAt,
      allDay: Boolean(body.allDay),
      location: body.location || null,
      tags: body.tags || [],
    });
    return reply.code(201).send({ event });
  });

  app.patch("/api/pa/calendar/:eventId", async (request, reply) => {
    const existing = db.pa.getEvent(request.params.eventId);
    if (!existing) return reply.code(404).send({ error: "Event not found" });
    const body = request.body || {};
    const event = db.pa.upsertEvent({
      ...existing,
      ...body,
      id: existing.id,
      startAt: body.startAt || existing.start_at,
      endAt: body.endAt || existing.end_at,
    });
    return { event };
  });

  app.delete("/api/pa/calendar/:eventId", async (request, reply) => {
    if (!db.pa.getEvent(request.params.eventId)) return reply.code(404).send({ error: "Event not found" });
    db.pa.deleteEvent(request.params.eventId);
    return reply.code(204).send();
  });

  app.get("/api/pa/email/accounts", async () => {
    const accounts = db.pa.listEmailAccounts();
    return { generatedAt: nowIso(), total: accounts.length, entries: accounts };
  });

  app.post("/api/pa/email/accounts", async (request, reply) => {
    const body = request.body || {};
    if (!body.label) return reply.code(400).send({ error: "label is required" });
    if (!body.address) return reply.code(400).send({ error: "address is required" });
    const account = db.pa.upsertEmailAccount({
      id: randomUUID(),
      label: body.label,
      address: body.address,
      provider: body.provider || "cpanel-imap",
      status: "pending",
      notes: body.notes || "",
    });
    db.pa.appendEmailAudit({ accountId: account.id, action: "account_created", actor: "operator", detail: { address: account.address } });
    return reply.code(201).send({ account });
  });

  app.patch("/api/pa/email/accounts/:accountId", async (request, reply) => {
    const accounts = db.pa.listEmailAccounts();
    const existing = accounts.find((a) => a.id === request.params.accountId);
    if (!existing) return reply.code(404).send({ error: "Account not found" });
    const account = db.pa.upsertEmailAccount({ ...existing, ...(request.body || {}), id: existing.id });
    return { account };
  });

  app.delete("/api/pa/email/accounts/:accountId", async (request, reply) => {
    const accounts = db.pa.listEmailAccounts();
    if (!accounts.find((a) => a.id === request.params.accountId)) return reply.code(404).send({ error: "Account not found" });
    db.pa.deleteEmailAccount(request.params.accountId);
    return reply.code(204).send();
  });

  app.get("/api/pa/email/accounts/:accountId/audit", async (request, reply) => {
    const audit = db.pa.listEmailAudit(request.params.accountId);
    return { entries: audit };
  });

  app.get("/api/pa/social", async (request) => {
    const { status } = request.query;
    const drafts = db.pa.listSocialDrafts(status ? { status } : undefined);
    return { generatedAt: nowIso(), total: drafts.length, entries: drafts };
  });

  app.get("/api/pa/social/:draftId", async (request, reply) => {
    const draft = db.pa.getSocialDraft(request.params.draftId);
    if (!draft) return reply.code(404).send({ error: "Draft not found" });
    return { draft };
  });

  app.post("/api/pa/social", async (request, reply) => {
    const body = request.body || {};
    if (!body.platform) return reply.code(400).send({ error: "platform is required" });
    if (!body.body) return reply.code(400).send({ error: "body is required" });
    const draft = db.pa.upsertSocialDraft({
      id: randomUUID(),
      platform: body.platform,
      body: body.body,
      status: body.status || "draft",
      scheduledFor: body.scheduledFor || null,
      tags: body.tags || [],
      mediaUrls: body.mediaUrls || [],
    });
    return reply.code(201).send({ draft });
  });

  app.patch("/api/pa/social/:draftId", async (request, reply) => {
    const existing = db.pa.getSocialDraft(request.params.draftId);
    if (!existing) return reply.code(404).send({ error: "Draft not found" });
    const draft = db.pa.upsertSocialDraft({ ...existing, ...(request.body || {}), id: existing.id });
    return { draft };
  });

  app.delete("/api/pa/social/:draftId", async (request, reply) => {
    if (!db.pa.getSocialDraft(request.params.draftId)) return reply.code(404).send({ error: "Draft not found" });
    db.pa.deleteSocialDraft(request.params.draftId);
    return reply.code(204).send();
  });

  app.get("/api/pa/social/linkedin/accounts", async () => {
    const accounts = db.pa.listLinkedInAccounts();
    return { total: accounts.length, entries: accounts };
  });

  app.post("/api/pa/social/linkedin/accounts", async (request, reply) => {
    const body = request.body || {};
    if (!body.label) return reply.code(400).send({ error: "label is required" });
    if (!body.profileUrl) return reply.code(400).send({ error: "profileUrl is required" });
    const account = db.pa.upsertLinkedInAccount({
      id: randomUUID(),
      label: body.label,
      profileUrl: body.profileUrl,
      displayName: body.displayName || "",
      status: body.status || "active",
      notes: body.notes || "",
    });
    return reply.code(201).send({ account });
  });

  app.patch("/api/pa/social/linkedin/accounts/:accountId", async (request, reply) => {
    const existing = db.pa.getLinkedInAccount(request.params.accountId);
    if (!existing) return reply.code(404).send({ error: "Account not found" });
    const b = request.body || {};
    const account = db.pa.upsertLinkedInAccount({
      ...existing,
      label: b.label ?? existing.label,
      profileUrl: b.profileUrl ?? existing.profile_url,
      displayName: b.displayName ?? existing.display_name,
      status: b.status ?? existing.status,
      notes: b.notes ?? existing.notes,
      id: existing.id,
    });
    return { account };
  });

  app.delete("/api/pa/social/linkedin/accounts/:accountId", async (request, reply) => {
    if (!db.pa.getLinkedInAccount(request.params.accountId)) return reply.code(404).send({ error: "Account not found" });
    db.pa.deleteLinkedInAccount(request.params.accountId);
    return reply.code(204).send();
  });

  app.get("/api/pa/fitness/logs", async (request) => {
    const { limit, activityType } = request.query;
    const logs = db.pa.listFitnessLogs({ limit: limit ? Number(limit) : 50, activityType });
    return { generatedAt: nowIso(), total: logs.length, entries: logs };
  });

  app.post("/api/pa/fitness/logs", async (request, reply) => {
    const body = request.body || {};
    if (!body.activityType) return reply.code(400).send({ error: "activityType is required" });
    const log = db.pa.insertFitnessLog({
      id: randomUUID(),
      activityType: body.activityType,
      durationMinutes: body.durationMinutes || null,
      distanceKm: body.distanceKm || null,
      calories: body.calories || null,
      notes: body.notes || "",
      loggedAt: body.loggedAt || nowIso(),
      source: body.source || "manual",
    });
    return reply.code(201).send({ log });
  });

  app.delete("/api/pa/fitness/logs/:logId", async (request, reply) => {
    if (!db.pa.getFitnessLog(request.params.logId)) return reply.code(404).send({ error: "Log not found" });
    db.pa.deleteFitnessLog(request.params.logId);
    return reply.code(204).send();
  });

  app.get("/api/pa/fitness/goals", async () => {
    const goals = db.pa.listFitnessGoals();
    return { generatedAt: nowIso(), total: goals.length, entries: goals };
  });

  app.post("/api/pa/fitness/goals", async (request, reply) => {
    const body = request.body || {};
    if (!body.goalType) return reply.code(400).send({ error: "goalType is required" });
    if (!body.targetValue) return reply.code(400).send({ error: "targetValue is required" });
    if (!body.unit) return reply.code(400).send({ error: "unit is required" });
    const goal = db.pa.upsertFitnessGoal({
      id: randomUUID(),
      goalType: body.goalType,
      targetValue: body.targetValue,
      unit: body.unit,
      period: body.period || "weekly",
      active: true,
    });
    return reply.code(201).send({ goal });
  });

  app.patch("/api/pa/fitness/goals/:goalId", async (request, reply) => {
    const goals = db.pa.listFitnessGoals();
    const existing = goals.find((g) => g.id === request.params.goalId);
    if (!existing) return reply.code(404).send({ error: "Goal not found" });
    const goal = db.pa.upsertFitnessGoal({ ...existing, ...(request.body || {}), id: existing.id, goalType: existing.goal_type, targetValue: existing.target_value });
    return { goal };
  });
}

export default paRoutes;
