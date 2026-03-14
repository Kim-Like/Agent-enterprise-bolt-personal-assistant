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

  app.get("/api/pa/li/overview", async () => {
    return { generatedAt: nowIso(), ...db.li.liOverviewStats() };
  });

  app.get("/api/pa/li/profiles", async (request) => {
    const { city, segmentId, search, limit, offset } = request.query;
    const profiles = db.li.listProfiles({ city, segmentId, search, limit: limit ? Number(limit) : 50, offset: offset ? Number(offset) : 0 });
    const total = db.li.countProfiles({ city, segmentId, search });
    return { generatedAt: nowIso(), total, entries: profiles };
  });

  app.get("/api/pa/li/profiles/:profileId", async (request, reply) => {
    const profile = db.li.getProfile(request.params.profileId);
    if (!profile) return reply.code(404).send({ error: "Profile not found" });
    return { profile };
  });

  app.post("/api/pa/li/profiles", async (request, reply) => {
    const body = request.body || {};
    if (!body.profileUrl) return reply.code(400).send({ error: "profileUrl is required" });
    const profile = db.li.upsertProfile({ id: randomUUID(), ...body, scrapedAt: body.scrapedAt || nowIso() });
    return reply.code(201).send({ profile });
  });

  app.patch("/api/pa/li/profiles/:profileId", async (request, reply) => {
    const existing = db.li.getProfile(request.params.profileId);
    if (!existing) return reply.code(404).send({ error: "Profile not found" });
    const profile = db.li.upsertProfile({ ...existing, ...(request.body || {}), id: existing.id });
    return { profile };
  });

  app.delete("/api/pa/li/profiles/:profileId", async (request, reply) => {
    if (!db.li.getProfile(request.params.profileId)) return reply.code(404).send({ error: "Profile not found" });
    db.li.deleteProfile(request.params.profileId);
    return reply.code(204).send();
  });

  app.get("/api/pa/li/segments", async () => {
    const segments = db.li.listSegments();
    return { generatedAt: nowIso(), total: segments.length, entries: segments };
  });

  app.post("/api/pa/li/segments", async (request, reply) => {
    const body = request.body || {};
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    const segment = db.li.upsertSegment({ id: randomUUID(), ...body });
    return reply.code(201).send({ segment });
  });

  app.patch("/api/pa/li/segments/:segmentId", async (request, reply) => {
    const existing = db.li.getSegment(request.params.segmentId);
    if (!existing) return reply.code(404).send({ error: "Segment not found" });
    const segment = db.li.upsertSegment({ ...existing, ...(request.body || {}), id: existing.id });
    return { segment };
  });

  app.delete("/api/pa/li/segments/:segmentId", async (request, reply) => {
    if (!db.li.getSegment(request.params.segmentId)) return reply.code(404).send({ error: "Segment not found" });
    db.li.deleteSegment(request.params.segmentId);
    return reply.code(204).send();
  });

  app.post("/api/pa/li/segments/:segmentId/refresh", async (request, reply) => {
    const segment = db.li.getSegment(request.params.segmentId);
    if (!segment) return reply.code(404).send({ error: "Segment not found" });
    const rules = segment.rules || [];
    const allProfiles = db.li.listProfiles({ limit: 10000 });
    const matched = allProfiles.filter(p => {
      return rules.every(rule => {
        const val = (p[rule.field] || '').toString().toLowerCase();
        const target = (rule.value || '').toLowerCase();
        if (rule.op === 'contains') return val.includes(target);
        if (rule.op === 'equals') return val === target;
        if (rule.op === 'not_equals') return val !== target;
        if (rule.op === 'starts_with') return val.startsWith(target);
        const skillsStr = Array.isArray(p.skills) ? p.skills.join(' ').toLowerCase() : '';
        const interestsStr = Array.isArray(p.interests) ? p.interests.join(' ').toLowerCase() : '';
        if (rule.field === 'skills') return skillsStr.includes(target);
        if (rule.field === 'interests') return interestsStr.includes(target);
        return true;
      });
    });
    db.li.refreshSegmentMembers(segment.id, matched.map(p => p.id));
    const updated = db.li.getSegment(segment.id);
    return { segment: updated, matchedCount: matched.length };
  });

  app.get("/api/pa/li/segments/:segmentId/members", async (request, reply) => {
    const segment = db.li.getSegment(request.params.segmentId);
    if (!segment) return reply.code(404).send({ error: "Segment not found" });
    const members = db.li.listSegmentMembers(request.params.segmentId);
    return { total: members.length, entries: members };
  });

  app.get("/api/pa/li/automations", async () => {
    const tasks = db.li.listAutomationTasks();
    return { generatedAt: nowIso(), total: tasks.length, entries: tasks };
  });

  app.post("/api/pa/li/automations", async (request, reply) => {
    const body = request.body || {};
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    if (!body.taskType) return reply.code(400).send({ error: "taskType is required" });
    const task = db.li.upsertAutomationTask({ id: randomUUID(), ...body });
    return reply.code(201).send({ task });
  });

  app.patch("/api/pa/li/automations/:taskId", async (request, reply) => {
    const existing = db.li.getAutomationTask(request.params.taskId);
    if (!existing) return reply.code(404).send({ error: "Automation task not found" });
    const task = db.li.upsertAutomationTask({ ...existing, ...(request.body || {}), id: existing.id });
    return { task };
  });

  app.delete("/api/pa/li/automations/:taskId", async (request, reply) => {
    if (!db.li.getAutomationTask(request.params.taskId)) return reply.code(404).send({ error: "Automation task not found" });
    db.li.deleteAutomationTask(request.params.taskId);
    return reply.code(204).send();
  });

  app.post("/api/pa/li/automations/:taskId/run", async (request, reply) => {
    const task = db.li.getAutomationTask(request.params.taskId);
    if (!task) return reply.code(404).send({ error: "Automation task not found" });
    const runId = randomUUID();
    const run = db.li.insertAutomationRun({ id: runId, taskId: task.id, status: 'running', startedAt: nowIso() });
    const criteria = task.criteria || {};
    let itemsFound = 0;
    let itemsProcessed = 0;
    let summary = '';

    try {
      if (task.task_type === 'refresh-segment' && criteria.segmentId) {
        const allProfiles = db.li.listProfiles({ limit: 10000 });
        const segment = db.li.getSegment(criteria.segmentId);
        if (segment) {
          const rules = segment.rules || [];
          const matched = allProfiles.filter(p => rules.every(rule => {
            const val = (p[rule.field] || '').toString().toLowerCase();
            const target = (rule.value || '').toLowerCase();
            if (rule.field === 'skills') return Array.isArray(p.skills) ? p.skills.join(' ').toLowerCase().includes(target) : false;
            if (rule.field === 'interests') return Array.isArray(p.interests) ? p.interests.join(' ').toLowerCase().includes(target) : false;
            if (rule.op === 'contains') return val.includes(target);
            if (rule.op === 'equals') return val === target;
            return true;
          }));
          db.li.refreshSegmentMembers(segment.id, matched.map(p => p.id));
          itemsFound = matched.length;
          itemsProcessed = allProfiles.length;
          summary = `Segment "${segment.name}" refreshed: ${itemsFound} matching profiles out of ${itemsProcessed} total.`;
        }
      } else if (task.task_type === 'enrich-geography') {
        const profiles = db.li.listProfiles({ limit: 10000 });
        const DK_CITIES = ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Fredericia', 'Silkeborg', 'Herning', 'Helsingør', 'Holstebro', 'Slagelse', 'Næstved', 'Hillerød', 'Viborg', 'Køge', 'Roskilde'];
        let enriched = 0;
        for (const p of profiles) {
          const cityLower = (p.city || '').toLowerCase();
          const matched = DK_CITIES.find(c => cityLower.includes(c.toLowerCase()) || c.toLowerCase().includes(cityLower));
          if (matched && p.city !== matched) {
            db.li.upsertProfile({ ...p, city: matched });
            enriched++;
          }
        }
        itemsProcessed = profiles.length;
        itemsFound = enriched;
        summary = `Geography enrichment: ${enriched} profiles updated out of ${profiles.length} processed.`;
      } else if (task.task_type === 'generate-snapshot') {
        const stats = db.li.liOverviewStats();
        db.connection.prepare(`INSERT INTO pa_li_reporting_snapshots (id,snapshot_date,profiles_scraped,profiles_enriched,outreach_sent,outreach_replied,connections_accepted,automation_runs,segment_count,total_profiles,created_at) VALUES (?,date('now'),0,0,?,?,?,?,?,?,?)`).run(randomUUID(), stats.outreachSentWeek, stats.outreachReplied, stats.totalOutreachSent - stats.outreachSentWeek, stats.recentRuns.length, stats.totalSegments, stats.totalProfiles, nowIso());
        summary = `Snapshot generated for today. Total profiles: ${stats.totalProfiles}, segments: ${stats.totalSegments}.`;
        itemsProcessed = 1;
        itemsFound = 1;
      } else {
        summary = `Task type "${task.task_type}" queued. A browser automation agent should process scrape targets manually.`;
        itemsProcessed = 0;
        itemsFound = 0;
      }

      const finished = db.li.updateAutomationRun(runId, { status: 'completed', itemsProcessed, itemsFound, summary, finishedAt: nowIso(), result: { summary, itemsProcessed, itemsFound } });
      db.li.upsertAutomationTask({ ...task, lastRunAt: nowIso(), lastRunStatus: 'completed', lastRunError: null, runCount: (task.run_count || 0) + 1 });
      return { run: finished };
    } catch (err) {
      const finished = db.li.updateAutomationRun(runId, { status: 'error', error: err.message, finishedAt: nowIso(), result: {} });
      db.li.upsertAutomationTask({ ...task, lastRunAt: nowIso(), lastRunStatus: 'error', lastRunError: err.message });
      return reply.code(500).send({ error: err.message, run: finished });
    }
  });

  app.get("/api/pa/li/automations/:taskId/runs", async (request, reply) => {
    if (!db.li.getAutomationTask(request.params.taskId)) return reply.code(404).send({ error: "Automation task not found" });
    const runs = db.li.listAutomationRuns(request.params.taskId, { limit: 20 });
    return { entries: runs };
  });

  app.get("/api/pa/li/campaigns", async () => {
    const campaigns = db.li.listCampaigns();
    return { generatedAt: nowIso(), total: campaigns.length, entries: campaigns };
  });

  app.post("/api/pa/li/campaigns", async (request, reply) => {
    const body = request.body || {};
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    const campaign = db.li.upsertCampaign({ id: randomUUID(), ...body });
    return reply.code(201).send({ campaign });
  });

  app.patch("/api/pa/li/campaigns/:campaignId", async (request, reply) => {
    const existing = db.li.getCampaign(request.params.campaignId);
    if (!existing) return reply.code(404).send({ error: "Campaign not found" });
    const body = request.body || {};
    const update = { ...existing, ...body, id: existing.id };
    if (body.status === 'active' && existing.status !== 'active') update.started_at = nowIso();
    if (body.status === 'paused') update.paused_at = nowIso();
    if (body.status === 'completed') update.completed_at = nowIso();
    const campaign = db.li.upsertCampaign(update);
    return { campaign };
  });

  app.delete("/api/pa/li/campaigns/:campaignId", async (request, reply) => {
    if (!db.li.getCampaign(request.params.campaignId)) return reply.code(404).send({ error: "Campaign not found" });
    db.li.deleteCampaign(request.params.campaignId);
    return reply.code(204).send();
  });

  app.get("/api/pa/li/campaigns/:campaignId/queue", async (request, reply) => {
    if (!db.li.getCampaign(request.params.campaignId)) return reply.code(404).send({ error: "Campaign not found" });
    const { status, limit, offset } = request.query;
    const entries = db.li.listOutreachQueue(request.params.campaignId, { status, limit: limit ? Number(limit) : 50, offset: offset ? Number(offset) : 0 });
    return { total: entries.length, entries };
  });

  app.post("/api/pa/li/campaigns/:campaignId/queue", async (request, reply) => {
    const campaign = db.li.getCampaign(request.params.campaignId);
    if (!campaign) return reply.code(404).send({ error: "Campaign not found" });
    const body = request.body || {};
    if (!body.profileId) return reply.code(400).send({ error: "profileId is required" });
    const item = db.li.upsertOutreachItem({ id: randomUUID(), campaignId: request.params.campaignId, ...body });
    return reply.code(201).send({ item });
  });

  app.patch("/api/pa/li/campaigns/:campaignId/queue/:itemId", async (request, reply) => {
    const item = db.connection.prepare(`SELECT * FROM pa_li_outreach_queue WHERE id = ? AND campaign_id = ?`).get(request.params.itemId, request.params.campaignId);
    if (!item) return reply.code(404).send({ error: "Queue item not found" });
    const updated = db.li.upsertOutreachItem({ ...item, ...(request.body || {}), id: item.id });
    return { item: updated };
  });

  app.post("/api/pa/li/campaigns/:campaignId/populate-from-segment", async (request, reply) => {
    const campaign = db.li.getCampaign(request.params.campaignId);
    if (!campaign) return reply.code(404).send({ error: "Campaign not found" });
    if (!campaign.segment_id) return reply.code(400).send({ error: "Campaign has no segment assigned" });
    const members = db.li.listSegmentMembers(campaign.segment_id);
    let added = 0;
    for (const member of members) {
      const existing = db.connection.prepare(`SELECT id FROM pa_li_outreach_queue WHERE campaign_id = ? AND profile_id = ?`).get(campaign.id, member.id);
      if (!existing) {
        db.li.upsertOutreachItem({ id: randomUUID(), campaignId: campaign.id, profileId: member.id, status: 'pending' });
        added++;
      }
    }
    return { added, totalMembers: members.length };
  });

  app.get("/api/pa/li/targets", async (request) => {
    const { status, limit } = request.query;
    const targets = db.li.listScrapeTargets({ status, limit: limit ? Number(limit) : 50 });
    return { total: targets.length, entries: targets };
  });

  app.post("/api/pa/li/targets", async (request, reply) => {
    const body = request.body || {};
    if (!body.profileUrl) return reply.code(400).send({ error: "profileUrl is required" });
    const target = db.li.upsertScrapeTarget({ id: randomUUID(), ...body });
    return reply.code(201).send({ target });
  });

  app.patch("/api/pa/li/targets/:targetId", async (request, reply) => {
    const existing = db.connection.prepare(`SELECT * FROM pa_li_scrape_targets WHERE id = ?`).get(request.params.targetId);
    if (!existing) return reply.code(404).send({ error: "Target not found" });
    const target = db.li.upsertScrapeTarget({ ...existing, ...(request.body || {}), id: existing.id });
    return { target };
  });

  app.delete("/api/pa/li/targets/:targetId", async (request, reply) => {
    const existing = db.connection.prepare(`SELECT id FROM pa_li_scrape_targets WHERE id = ?`).get(request.params.targetId);
    if (!existing) return reply.code(404).send({ error: "Target not found" });
    db.connection.prepare(`DELETE FROM pa_li_scrape_targets WHERE id = ?`).run(request.params.targetId);
    return reply.code(204).send();
  });

  app.get("/api/pa/li/reporting", async (request) => {
    const { days } = request.query;
    const daysBack = days ? Number(days) : 30;
    const snapshots = db.connection.prepare(`SELECT * FROM pa_li_reporting_snapshots WHERE snapshot_date >= date('now', '-' || ? || ' days') ORDER BY snapshot_date ASC`).all(daysBack);
    const overview = db.li.liOverviewStats();
    return { generatedAt: nowIso(), overview, snapshots };
  });

  app.get("/api/pa/inv/watchlist", async () => {
    return { generatedAt: nowIso(), entries: db.inv.listWatchlist() };
  });

  app.post("/api/pa/inv/watchlist", async (request, reply) => {
    const body = request.body || {};
    if (!body.symbol) return reply.code(400).send({ error: "symbol is required" });
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    const existing = db.inv.getWatchlistBySymbol(body.symbol.toUpperCase());
    if (existing) return reply.code(409).send({ error: "Symbol already in watchlist" });
    const item = db.inv.upsertWatchlistItem({ id: randomUUID(), ...body });
    return reply.code(201).send({ item });
  });

  app.patch("/api/pa/inv/watchlist/:itemId", async (request, reply) => {
    const existing = db.inv.getWatchlistItem(request.params.itemId);
    if (!existing) return reply.code(404).send({ error: "Watchlist item not found" });
    const item = db.inv.upsertWatchlistItem({ ...existing, ...(request.body || {}), id: existing.id });
    return { item };
  });

  app.delete("/api/pa/inv/watchlist/:itemId", async (request, reply) => {
    if (!db.inv.getWatchlistItem(request.params.itemId)) return reply.code(404).send({ error: "Not found" });
    db.inv.deleteWatchlistItem(request.params.itemId);
    return reply.code(204).send();
  });

  app.get("/api/pa/inv/prices/:symbol", async (request, reply) => {
    const symbol = request.params.symbol.toUpperCase();
    const days = request.query.days ? Number(request.query.days) : 365;
    const cached = db.inv.getPriceHistory(symbol, { days });
    const latest = db.inv.getLatestPrice(symbol);
    const stale = !latest || new Date() - new Date(latest.date) > 24 * 60 * 60 * 1000;

    if (stale) {
      try {
        const period1 = Math.floor(Date.now() / 1000) - days * 86400;
        const period2 = Math.floor(Date.now() / 1000);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${period1}&period2=${period2}`;
        const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
        if (resp.ok) {
          const json = await resp.json();
          const result = json?.chart?.result?.[0];
          if (result) {
            const timestamps = result.timestamp || [];
            const closes = result.indicators?.quote?.[0]?.close || [];
            const opens = result.indicators?.quote?.[0]?.open || [];
            const highs = result.indicators?.quote?.[0]?.high || [];
            const lows = result.indicators?.quote?.[0]?.low || [];
            const volumes = result.indicators?.quote?.[0]?.volume || [];
            const rows = timestamps.map((ts, i) => ({
              date: new Date(ts * 1000).toISOString().slice(0, 10),
              open: opens[i] || null,
              high: highs[i] || null,
              low: lows[i] || null,
              close: closes[i] || null,
              volume: volumes[i] || null,
            })).filter(r => r.close !== null);
            db.inv.cachePrices(symbol, rows);
            const fresh = db.inv.getPriceHistory(symbol, { days });
            return { symbol, days, entries: fresh, source: 'yahoo-live' };
          }
        }
      } catch (_e) {}
    }

    return { symbol, days, entries: cached, source: stale ? 'cache-stale' : 'cache' };
  });

  app.get("/api/pa/inv/holdings", async () => {
    const holdings = db.inv.listHoldings();
    const result = holdings.map(h => {
      const purchases = db.inv.listPurchases(h.id);
      return { ...h, purchases };
    });
    return { generatedAt: nowIso(), entries: result };
  });

  app.post("/api/pa/inv/holdings", async (request, reply) => {
    const body = request.body || {};
    if (!body.symbol) return reply.code(400).send({ error: "symbol is required" });
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    const existing = db.inv.getHoldingBySymbol(body.symbol.toUpperCase());
    if (existing) {
      const purchases = db.inv.listPurchases(existing.id);
      return { holding: { ...existing, purchases } };
    }
    const holding = db.inv.upsertHolding({ id: randomUUID(), ...body });
    return reply.code(201).send({ holding: { ...holding, purchases: [] } });
  });

  app.patch("/api/pa/inv/holdings/:holdingId", async (request, reply) => {
    const existing = db.inv.getHolding(request.params.holdingId);
    if (!existing) return reply.code(404).send({ error: "Holding not found" });
    const holding = db.inv.upsertHolding({ ...existing, ...(request.body || {}), id: existing.id });
    return { holding };
  });

  app.delete("/api/pa/inv/holdings/:holdingId", async (request, reply) => {
    if (!db.inv.getHolding(request.params.holdingId)) return reply.code(404).send({ error: "Not found" });
    db.inv.deleteHolding(request.params.holdingId);
    return reply.code(204).send();
  });

  app.get("/api/pa/inv/holdings/:holdingId/purchases", async (request, reply) => {
    const holding = db.inv.getHolding(request.params.holdingId);
    if (!holding) return reply.code(404).send({ error: "Holding not found" });
    const purchases = db.inv.listPurchases(holding.id);
    const latest = db.inv.getLatestPrice(holding.symbol);
    const currentPrice = latest?.close || null;
    const enriched = purchases.map(p => {
      if (!currentPrice) return { ...p, currentPrice: null, gainPct: null, gainAbs: null };
      const costBasis = p.price_per_share;
      const gainPct = ((currentPrice - costBasis) / costBasis) * 100;
      const gainAbs = (currentPrice - costBasis) * p.shares;
      return { ...p, currentPrice, gainPct: Math.round(gainPct * 100) / 100, gainAbs: Math.round(gainAbs * 100) / 100 };
    });
    const totalShares = purchases.reduce((s, p) => s + p.shares, 0);
    const totalCost = purchases.reduce((s, p) => s + p.shares * p.price_per_share + p.fee, 0);
    const avgCost = totalShares > 0 ? totalCost / totalShares : null;
    const totalValue = currentPrice ? totalShares * currentPrice : null;
    const totalGainPct = avgCost && currentPrice ? ((currentPrice - avgCost) / avgCost) * 100 : null;
    return {
      holding,
      purchases: enriched,
      summary: { totalShares, totalCost, avgCost, currentPrice, totalValue, totalGainPct: totalGainPct ? Math.round(totalGainPct * 100) / 100 : null },
    };
  });

  app.post("/api/pa/inv/holdings/:holdingId/purchases", async (request, reply) => {
    const holding = db.inv.getHolding(request.params.holdingId);
    if (!holding) return reply.code(404).send({ error: "Holding not found" });
    const body = request.body || {};
    if (!body.purchaseDate) return reply.code(400).send({ error: "purchaseDate is required" });
    if (!body.shares || body.shares <= 0) return reply.code(400).send({ error: "shares must be > 0" });
    if (!body.pricePerShare || body.pricePerShare <= 0) return reply.code(400).send({ error: "pricePerShare must be > 0" });
    const purchase = db.inv.insertPurchase({ id: randomUUID(), holdingId: holding.id, symbol: holding.symbol, ...body });
    return reply.code(201).send({ purchase });
  });

  app.patch("/api/pa/inv/holdings/:holdingId/purchases/:purchaseId", async (request, reply) => {
    const holding = db.inv.getHolding(request.params.holdingId);
    if (!holding) return reply.code(404).send({ error: "Holding not found" });
    const existing = db.inv.getPurchase(request.params.purchaseId);
    if (!existing) return reply.code(404).send({ error: "Purchase not found" });
    const purchase = db.inv.updatePurchase({ ...existing, ...(request.body || {}), id: existing.id });
    return { purchase };
  });

  app.delete("/api/pa/inv/holdings/:holdingId/purchases/:purchaseId", async (request, reply) => {
    if (!db.inv.getPurchase(request.params.purchaseId)) return reply.code(404).send({ error: "Not found" });
    db.inv.deletePurchase(request.params.purchaseId);
    return reply.code(204).send();
  });

  app.get("/api/pa/inv/news-sources", async () => {
    return { entries: db.inv.listNewsSources() };
  });

  app.post("/api/pa/inv/news-sources", async (request, reply) => {
    const body = request.body || {};
    if (!body.name) return reply.code(400).send({ error: "name is required" });
    if (!body.url) return reply.code(400).send({ error: "url is required" });
    const source = db.inv.upsertNewsSource({ id: randomUUID(), ...body });
    return reply.code(201).send({ source });
  });

  app.patch("/api/pa/inv/news-sources/:sourceId", async (request, reply) => {
    const sources = db.inv.listNewsSources();
    const existing = sources.find(s => s.id === request.params.sourceId);
    if (!existing) return reply.code(404).send({ error: "Source not found" });
    const source = db.inv.upsertNewsSource({ ...existing, ...(request.body || {}), id: existing.id });
    return { source };
  });

  app.delete("/api/pa/inv/news-sources/:sourceId", async (request, reply) => {
    db.inv.deleteNewsSource(request.params.sourceId);
    return reply.code(204).send();
  });

  app.get("/api/pa/inv/news", async (request) => {
    const { symbol, limit } = request.query;
    const articles = db.inv.listNewsArticles({ symbol, limit: limit ? Number(limit) : 50 });
    return { generatedAt: nowIso(), total: articles.length, entries: articles };
  });

  app.post("/api/pa/inv/news/fetch", async (request) => {
    const sources = db.inv.listNewsSources().filter(s => s.enabled);
    const watchlist = db.inv.listWatchlist();
    const symbols = watchlist.map(w => w.symbol);
    const allKeywords = [...symbols, ...watchlist.map(w => w.name), 'stock market', 'investing', 'ETF'];
    let totalFetched = 0;

    for (const source of sources) {
      try {
        const feedUrl = source.rss_url || source.url;
        const resp = await fetch(feedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
        if (!resp.ok) continue;
        const xml = await resp.text();
        const items = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];
        for (const match of items.slice(0, 20)) {
          const content = match[1];
          const titleMatch = content.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/si);
          const linkMatch = content.match(/<link[^>]*>(.*?)<\/link>|<link>(.*?)<\/link>/si);
          const descMatch = content.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/si);
          const dateMatch = content.match(/<pubDate[^>]*>(.*?)<\/pubDate>/si);
          const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
          const link = (linkMatch?.[1] || linkMatch?.[2] || '').trim();
          const desc = (descMatch?.[1] || descMatch?.[2] || '').replace(/<[^>]+>/g, '').trim();
          const pubDate = dateMatch?.[1]?.trim() || new Date().toISOString();
          if (!title || !link) continue;
          const titleLower = title.toLowerCase();
          const descLower = desc.toLowerCase();
          let matchedSymbol = '';
          let relevance = 0.3;
          for (const sym of symbols) {
            if (titleLower.includes(sym.toLowerCase()) || descLower.includes(sym.toLowerCase())) {
              matchedSymbol = sym;
              relevance = 0.9;
              break;
            }
          }
          for (const kw of (source.keywords || [])) {
            if (titleLower.includes(kw.toLowerCase())) { relevance = Math.max(relevance, 0.7); break; }
          }
          const posWords = ['surge','rally','gain','growth','profit','beat','record','strong','buy','upgrade'];
          const negWords = ['fall','drop','loss','decline','miss','weak','sell','downgrade','crash','risk'];
          const posCnt = posWords.filter(w => titleLower.includes(w)).length;
          const negCnt = negWords.filter(w => titleLower.includes(w)).length;
          const sentiment = posCnt > negCnt ? 'positive' : negCnt > posCnt ? 'negative' : 'neutral';
          try {
            db.inv.upsertArticle({ id: randomUUID(), sourceId: source.id, symbol: matchedSymbol, title, summary: desc.slice(0, 500), url: link, publishedAt: new Date(pubDate).toISOString(), sentiment, relevanceScore: relevance });
            totalFetched++;
          } catch (_e) {}
        }
        db.inv.upsertNewsSource({ ...source, lastFetchedAt: nowIso() });
      } catch (_e) {}
    }

    return { fetched: totalFetched, sources: sources.length };
  });

  app.get("/api/pa/inv/advisor/signals", async (request) => {
    const { symbol } = request.query;
    const signals = db.inv.listAdvisorSignals({ symbol, limit: 50 });
    return { generatedAt: nowIso(), entries: signals };
  });

  app.post("/api/pa/inv/advisor/analyse", async (request) => {
    const watchlist = db.inv.listWatchlist().filter(w => w.enabled);
    const results = [];

    for (const item of watchlist) {
      const history = db.inv.getPriceHistory(item.symbol, { days: 365 });
      if (history.length < 20) {
        results.push({ symbol: item.symbol, skipped: true, reason: 'insufficient data' });
        continue;
      }

      const closes = history.map(h => h.close);
      const n = closes.length;
      const latest = closes[n - 1];

      const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const sma50 = n >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : null;
      const sma200 = n >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : null;

      const gains = [], losses = [];
      for (let i = 1; i < Math.min(15, n); i++) {
        const diff = closes[n - i] - closes[n - i - 1];
        if (diff >= 0) gains.push(diff); else losses.push(Math.abs(diff));
      }
      const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
      const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / 14 : 0.0001;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      const high52 = Math.max(...closes.slice(-252 < 0 ? 0 : -252));
      const low52 = Math.min(...closes.slice(-252 < 0 ? 0 : -252));
      const pctFrom52High = ((latest - high52) / high52) * 100;
      const pctFrom52Low = ((latest - low52) / low52) * 100;

      const recentVol = closes.slice(-20);
      const meanRecent = recentVol.reduce((a, b) => a + b, 0) / recentVol.length;
      const variance = recentVol.reduce((s, v) => s + Math.pow(v - meanRecent, 2), 0) / recentVol.length;
      const stdDev = Math.sqrt(variance);
      const volatilityPct = (stdDev / meanRecent) * 100;

      const momentum1m = n >= 20 ? ((latest - closes[n - 20]) / closes[n - 20]) * 100 : null;
      const momentum3m = n >= 60 ? ((latest - closes[n - 60]) / closes[n - 60]) * 100 : null;

      let direction = 'neutral';
      let strength = 0.5;
      const reasons = [];

      if (rsi < 30) { direction = 'buy'; strength += 0.25; reasons.push(`RSI oversold (${rsi.toFixed(1)})`); }
      else if (rsi > 70) { direction = 'sell'; strength += 0.2; reasons.push(`RSI overbought (${rsi.toFixed(1)})`); }
      else reasons.push(`RSI neutral (${rsi.toFixed(1)})`);

      if (sma200 && latest > sma200 && latest > sma50) { if (direction !== 'sell') { direction = 'buy'; strength += 0.15; } reasons.push('Price above SMA50 & SMA200 (golden zone)'); }
      else if (sma200 && latest < sma200) { if (direction !== 'buy') { direction = 'sell'; strength += 0.1; } reasons.push('Price below SMA200 (bearish)'); }

      if (pctFrom52High < -20) { if (direction !== 'sell') direction = 'buy'; strength += 0.1; reasons.push(`${Math.abs(pctFrom52High).toFixed(1)}% below 52-week high — potential value`); }

      if (momentum1m !== null && momentum1m > 5) { if (direction !== 'sell') direction = 'buy'; strength += 0.05; reasons.push(`Positive 1-month momentum (+${momentum1m.toFixed(1)}%)`); }
      else if (momentum1m !== null && momentum1m < -5) { strength -= 0.05; reasons.push(`Negative 1-month momentum (${momentum1m.toFixed(1)}%)`); }

      strength = Math.min(1, Math.max(0, strength));

      const signalType = direction === 'buy' ? 'entry-opportunity' : direction === 'sell' ? 'exit-signal' : 'hold';
      const sig = db.inv.insertAdvisorSignal({
        id: randomUUID(),
        symbol: item.symbol,
        signalType,
        direction,
        strength,
        rationale: reasons.join('. '),
        indicators: { rsi, sma20, sma50, sma200, pctFrom52High, pctFrom52Low, volatilityPct, momentum1m, momentum3m, latest },
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      results.push({ symbol: item.symbol, signal: sig });
    }

    return { generatedAt: nowIso(), analysed: results.filter(r => !r.skipped).length, skipped: results.filter(r => r.skipped).length, results };
  });
}

export default paRoutes;
