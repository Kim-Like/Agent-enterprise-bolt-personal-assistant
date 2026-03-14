import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

import { loadAgentPacketSet, packetTextValues } from "./agent-packets.js";
import { toAgentListItem } from "./agent-view-model.js";
import { createAnthropicClient } from "./anthropic-client.js";
import { createClaudeCliRuntime } from "./claude-cli-runtime.js";
import {
  estimateTokens,
  listModelCatalog,
  requireModel,
  resolveModel,
} from "./chat-models.js";
import {
  listSkillLibrary,
  normalizeRequestedSkills,
  resolveSkillSelection,
} from "./skill-library.js";
import {
  APPROVAL_STATE_LABELS,
  TASK_STAGE_LABELS,
  VISIBLE_TASK_STAGES,
  WORK_EVENT_TYPES,
} from "./work-constants.js";
import {
  isLavprisTask,
  validateLavprisChangelogEntry,
} from "./lavpris-rollout.js";

const SESSION_STATUSES = {
  open: "active",
  active: "active",
  archived: "archived",
  superseded: "superseded",
};

const SESSION_TYPE_LABELS = {
  general: "General session",
  client_support: "Client support",
  task_review: "Task review",
  task_delivery: "Task delivery",
};

const COMPACTION_RETAIN_MESSAGE_COUNT = 4;

function nowIso() {
  return new Date().toISOString();
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function parseSkillList(value) {
  const parsed = parseJson(value, []);
  return normalizeRequestedSkills(Array.isArray(parsed) ? parsed : []);
}

function compactText(value, limit = 160) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "";
  }

  return normalized.length > limit
    ? `${normalized.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
    : normalized;
}

function sentenceCase(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }

  return normalized.endsWith(".") ? normalized : `${normalized}.`;
}

function isGreetingPrompt(value) {
  return /^(hi|hello|hey|yo|sup|good\s+(morning|afternoon|evening))\b/i.test(
    String(value || "").trim(),
  );
}

function isQuestionPrompt(value) {
  const normalized = String(value || "").trim();
  return /\?$/.test(normalized) || /^(what|why|how|when|where|who|can|could|should|would|do|does|is|are)\b/i.test(normalized);
}

function sessionStatus(value) {
  return SESSION_STATUSES[value] || "active";
}

function isActiveSession(rowOrStatus) {
  const value =
    typeof rowOrStatus === "string" ? rowOrStatus : rowOrStatus?.status || "active";
  return sessionStatus(value) === "active";
}

function defaultEngineerMessage(stage, title) {
  switch (stage) {
    case "planned":
      return `Planning started for "${title}".`;
    case "in_development":
      return `Implementation is underway for "${title}".`;
    case "testing":
      return `Testing has started for "${title}".`;
    case "completed":
      return `Delivery is complete for "${title}".`;
    default:
      return `Engineer updated "${title}".`;
  }
}

function assertTransition(task, targetStage) {
  if (targetStage === "planned") {
    if (
      task.stage !== "accepted" ||
      task.approvalState !== "approved_waiting_for_engineer"
    ) {
      throw createHttpError(
        409,
        "Task must be approved and still in Accepted before planning can start.",
      );
    }

    return;
  }

  const allowed = {
    planned: "in_development",
    in_development: "testing",
    testing: "completed",
  };

  if (allowed[task.stage] !== targetStage) {
    throw createHttpError(
      409,
      `Task cannot move from ${task.stage} to ${targetStage}.`,
    );
  }
}

function stringList(values) {
  return values.filter(Boolean).join("\n");
}

function messageExcerpt(message) {
  const prefix =
    message.authorType === "agent"
      ? "Agent"
      : message.authorType === "system"
        ? "System"
        : "User";
  return `${prefix}: ${compactText(message.body, 160)}`;
}

function hasOwnProperty(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function createWorkService({
  db,
  agentRegistry,
  modelCatalog,
  env = process.env,
  claudeCliRuntime = null,
  lavprisRolloutService = null,
  listAgentEntries = () => agentRegistry.entries || [],
  getAgentEntry = null,
}) {
  const connection = db.connection;
  const eventBus = new EventEmitter();
  const anthropicClient = createAnthropicClient(env);
  const selectedProvider = String(env.defaultModelProvider || "claude")
    .trim()
    .toLowerCase();
  const claudeRuntime = claudeCliRuntime || createClaudeCliRuntime(env);

  eventBus.setMaxListeners(0);

  function agentEntries() {
    return listAgentEntries() || [];
  }

  function findAgentEntry(agentId) {
    if (!agentId) {
      return null;
    }

    if (typeof getAgentEntry === "function") {
      return getAgentEntry(agentId) || null;
    }

    return agentEntries().find((entry) => entry.id === agentId) || null;
  }

  function agentName(agentId) {
    return findAgentEntry(agentId)?.name || agentId || "Unknown";
  }

  function agentListItem(agentId) {
    const entry = findAgentEntry(agentId);
    return entry ? toAgentListItem(entry) : null;
  }

  function supportsPacketMemory(agentEntry) {
    return Boolean(
      agentEntry?.sourcePath &&
        (agentEntry.kind === "master" || agentEntry.kind === "root"),
    );
  }

  function agentPacketSet(agentEntry) {
    if (!supportsPacketMemory(agentEntry)) {
      return loadAgentPacketSet({ env, entry: null });
    }

    return loadAgentPacketSet({ env, entry: agentEntry });
  }

  let cachedSkillLibrary = null;

  function skillLibrary() {
    if (!cachedSkillLibrary) {
      cachedSkillLibrary = listSkillLibrary(env);
    }

    return cachedSkillLibrary;
  }

  function skillListItem(skill) {
    return {
      name: skill.name,
      description: skill.description,
      scope: skill.scope,
      directoryName: skill.directoryName,
      rootPath: skill.rootPath,
      sourcePath: skill.sourcePath,
    };
  }

  function resolveRequestedSkillState(requestedSkills = []) {
    const selection = resolveSkillSelection(env, requestedSkills, {
      library: skillLibrary(),
    });

    return {
      requestedSkills: selection.requestedSkills,
      requestedSkillDetails: selection.resolved.map(skillListItem),
      missingRequestedSkills: selection.missing,
      resolvedSkillPackets: selection.resolved,
    };
  }

  function validateRequestedSkills(requestedSkills = []) {
    const selection = resolveSkillSelection(env, requestedSkills, {
      library: skillLibrary(),
    });

    if (selection.missing.length > 0) {
      throw createHttpError(
        400,
        `Unknown skill${selection.missing.length === 1 ? "" : "s"}: ${selection.missing.join(", ")}`,
      );
    }

    return selection.requestedSkills;
  }

  function mergedSelectedSkillState({ session = null, task = null } = {}) {
    return resolveRequestedSkillState([
      ...(task?.requestedSkills || []),
      ...(session?.requestedSkills || []),
    ]);
  }

  function recentLearning(agentId, limit = 4) {
    if (!agentId || typeof db.listAgentLearning !== "function") {
      return [];
    }

    return db.listAgentLearning(agentId, { limit });
  }

  function packetSection(label, value) {
    const text = String(value || "").trim();
    return text ? `${label}\n${text}` : null;
  }

  function learningSection(notes) {
    if (!notes.length) {
      return null;
    }

    return `Recent learned memory\n${notes
      .map((item, index) => `${index + 1}. ${item.note}`)
      .join("\n")}`;
  }

  function selectedSkillSection(skillState) {
    if (
      !skillState.requestedSkillDetails.length &&
      !skillState.missingRequestedSkills.length
    ) {
      return null;
    }

    const parts = [];

    if (skillState.requestedSkillDetails.length) {
      parts.push(
        `Selected skills\n${skillState.resolvedSkillPackets
          .map(
            (skill) =>
              `Skill: ${skill.name} (${skill.scope})\nSource: ${skill.sourcePath}\n\n${skill.content.trim()}`,
          )
          .join("\n\n")}`,
      );
    }

    if (skillState.missingRequestedSkills.length) {
      parts.push(
        `Missing selected skills\n${skillState.missingRequestedSkills.join(", ")}`,
      );
    }

    return parts.join("\n\n");
  }

  function buildLearningNote({ session, task, prompt, replyBody }) {
    const normalizedPrompt = compactText(prompt, 180);
    const normalizedReply = compactText(replyBody, 220);

    if (
      !normalizedPrompt ||
      normalizedPrompt.length < 12 ||
      (isGreetingPrompt(normalizedPrompt) && !task)
    ) {
      return null;
    }

    const scope = task ? `Task "${task.title}"` : session.agentName;
    return `${scope}: operator focus "${normalizedPrompt}". Latest assistant stance: ${normalizedReply}`;
  }

  function appendLearningNote({ session, task, prompt, replyBody, threadId, source }) {
    const agentEntry = findAgentEntry(session.agentId);
    if (!supportsPacketMemory(agentEntry) || typeof db.appendAgentLearning !== "function") {
      return;
    }

    const note = buildLearningNote({ session, task, prompt, replyBody });
    if (!note) {
      return;
    }

    const lastNote = recentLearning(session.agentId, 1)[0];
    if (lastNote?.note === note) {
      return;
    }

    db.appendAgentLearning(session.agentId, {
      threadId,
      taskId: session.taskId,
      source,
      note,
      metadata: {
        agentId: session.agentId,
        taskId: session.taskId || null,
      },
    });
  }

  const statements = {
    insertTask: connection.prepare(`
      INSERT INTO tasks (
        id,
        title,
        summary,
        stage,
        approval_state,
        request_type,
        program_id,
        site_domain,
        source_agent_id,
        requested_by,
        requested_skills,
        source_thread_id,
        engineer_thread_id,
        assigned_agent_id,
        created_at,
        updated_at,
        approved_at,
        rejected_at,
        completed_at
      ) VALUES (
        @id,
        @title,
        @summary,
        @stage,
        @approval_state,
        @request_type,
        @program_id,
        @site_domain,
        @source_agent_id,
        @requested_by,
        @requested_skills,
        @source_thread_id,
        @engineer_thread_id,
        @assigned_agent_id,
        @created_at,
        @updated_at,
        @approved_at,
        @rejected_at,
        @completed_at
      )
    `),
    selectTaskById: connection.prepare(`
      SELECT id,
             title,
             summary,
             stage,
             approval_state,
             request_type,
             program_id,
             site_domain,
             source_agent_id,
             requested_by,
             requested_skills,
             source_thread_id,
             engineer_thread_id,
             assigned_agent_id,
             created_at,
             updated_at,
             approved_at,
             rejected_at,
             completed_at
      FROM tasks
      WHERE id = ?
    `),
    selectTasks: connection.prepare(`
      SELECT id,
             title,
             summary,
             stage,
             approval_state,
             request_type,
             program_id,
             site_domain,
             source_agent_id,
             requested_by,
             requested_skills,
             source_thread_id,
             engineer_thread_id,
             assigned_agent_id,
             created_at,
             updated_at,
             approved_at,
             rejected_at,
             completed_at
      FROM tasks
      ORDER BY updated_at DESC, created_at DESC
    `),
    updateApprovedTask: connection.prepare(`
      UPDATE tasks
      SET approval_state = @approval_state,
          engineer_thread_id = @engineer_thread_id,
          assigned_agent_id = @assigned_agent_id,
          approved_at = @approved_at,
          updated_at = @updated_at
      WHERE id = @id
    `),
    updateRejectedTask: connection.prepare(`
      UPDATE tasks
      SET stage = @stage,
          approval_state = @approval_state,
          rejected_at = @rejected_at,
          updated_at = @updated_at
      WHERE id = @id
    `),
    updateTransitionedTask: connection.prepare(`
      UPDATE tasks
      SET stage = @stage,
          approval_state = @approval_state,
          updated_at = @updated_at,
          completed_at = @completed_at
      WHERE id = @id
    `),
    touchTask: connection.prepare(`
      UPDATE tasks
      SET updated_at = @updated_at
      WHERE id = @id
    `),
    updateTaskSourceThread: connection.prepare(`
      UPDATE tasks
      SET source_thread_id = @thread_id,
          updated_at = @updated_at
      WHERE id = @id
    `),
    updateTaskRequestedSkills: connection.prepare(`
      UPDATE tasks
      SET requested_skills = @requested_skills,
          updated_at = @updated_at
      WHERE id = @id
    `),
    updateTaskEngineerThread: connection.prepare(`
      UPDATE tasks
      SET engineer_thread_id = @thread_id,
          updated_at = @updated_at
      WHERE id = @id
    `),
    insertTaskEvent: connection.prepare(`
      INSERT INTO task_events (
        task_id,
        event_type,
        actor_type,
        actor_id,
        payload,
        created_at
      ) VALUES (
        @task_id,
        @event_type,
        @actor_type,
        @actor_id,
        @payload,
        @created_at
      )
    `),
    selectTaskEvents: connection.prepare(`
      SELECT id,
             task_id,
             event_type,
             actor_type,
             actor_id,
             payload,
             created_at
      FROM task_events
      WHERE task_id = ?
      ORDER BY created_at ASC, id ASC
    `),
    insertThread: connection.prepare(`
      INSERT INTO chat_threads (
        id,
        task_id,
        role,
        session_type,
        agent_id,
        title,
        status,
        model_family,
        model_provider_id,
        continued_from_thread_id,
        latest_context_snapshot_id,
        requested_skills,
        created_at,
        updated_at
      ) VALUES (
        @id,
        @task_id,
        @role,
        @session_type,
        @agent_id,
        @title,
        @status,
        @model_family,
        @model_provider_id,
        @continued_from_thread_id,
        @latest_context_snapshot_id,
        @requested_skills,
        @created_at,
        @updated_at
      )
    `),
    selectThreadById: connection.prepare(`
      SELECT id,
             task_id,
             role,
             session_type,
             agent_id,
             title,
             status,
             model_family,
             model_provider_id,
             continued_from_thread_id,
             latest_context_snapshot_id,
             requested_skills,
             created_at,
             updated_at
      FROM chat_threads
      WHERE id = ?
    `),
    selectThreadsForTask: connection.prepare(`
      SELECT id,
             task_id,
             role,
             session_type,
             agent_id,
             title,
             status,
             model_family,
             model_provider_id,
             continued_from_thread_id,
             latest_context_snapshot_id,
             requested_skills,
             created_at,
             updated_at
      FROM chat_threads
      WHERE task_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `),
    selectThreadsForAgent: connection.prepare(`
      SELECT id,
             task_id,
             role,
             session_type,
             agent_id,
             title,
             status,
             model_family,
             model_provider_id,
             continued_from_thread_id,
             latest_context_snapshot_id,
             requested_skills,
             created_at,
             updated_at
      FROM chat_threads
      WHERE agent_id = ?
      ORDER BY updated_at DESC, created_at DESC
    `),
    updateThreadStatus: connection.prepare(`
      UPDATE chat_threads
      SET status = @status,
          updated_at = @updated_at
      WHERE id = @id
    `),
    updateThreadSnapshot: connection.prepare(`
      UPDATE chat_threads
      SET latest_context_snapshot_id = @latest_context_snapshot_id,
          updated_at = @updated_at
      WHERE id = @id
    `),
    updateThreadRequestedSkills: connection.prepare(`
      UPDATE chat_threads
      SET requested_skills = @requested_skills,
          updated_at = @updated_at
      WHERE id = @id
    `),
    touchThread: connection.prepare(`
      UPDATE chat_threads
      SET updated_at = @updated_at
      WHERE id = @id
    `),
    insertMessage: connection.prepare(`
      INSERT INTO chat_messages (
        id,
        thread_id,
        task_id,
        author_type,
        author_id,
        kind,
        body,
        usage_input_tokens,
        usage_output_tokens,
        usage_total_tokens,
        usage_source,
        metadata,
        compacted_in_snapshot_id,
        is_compacted,
        created_at
      ) VALUES (
        @id,
        @thread_id,
        @task_id,
        @author_type,
        @author_id,
        @kind,
        @body,
        @usage_input_tokens,
        @usage_output_tokens,
        @usage_total_tokens,
        @usage_source,
        @metadata,
        @compacted_in_snapshot_id,
        @is_compacted,
        @created_at
      )
    `),
    selectMessagesForThread: connection.prepare(`
      SELECT id,
             thread_id,
             task_id,
             author_type,
             author_id,
             kind,
             body,
             usage_input_tokens,
             usage_output_tokens,
             usage_total_tokens,
             usage_source,
             metadata,
             compacted_in_snapshot_id,
             is_compacted,
             created_at
      FROM chat_messages
      WHERE thread_id = ?
      ORDER BY created_at ASC, rowid ASC
    `),
    selectLastMessageForThread: connection.prepare(`
      SELECT id,
             thread_id,
             task_id,
             author_type,
             author_id,
             kind,
             body,
             usage_input_tokens,
             usage_output_tokens,
             usage_total_tokens,
             usage_source,
             metadata,
             compacted_in_snapshot_id,
             is_compacted,
             created_at
      FROM chat_messages
      WHERE thread_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1
    `),
    markMessagesCompacted: connection.prepare(`
      UPDATE chat_messages
      SET compacted_in_snapshot_id = @compacted_in_snapshot_id,
          is_compacted = 1
      WHERE id = @id
    `),
    insertSnapshot: connection.prepare(`
      INSERT INTO chat_context_snapshots (
        id,
        thread_id,
        task_id,
        summary_goal,
        summary_decisions,
        summary_questions,
        summary_entities,
        summary_constraints,
        summary_next_actions,
        summary_text,
        summary_token_estimate,
        covered_message_count,
        covered_through_message_id,
        created_at
      ) VALUES (
        @id,
        @thread_id,
        @task_id,
        @summary_goal,
        @summary_decisions,
        @summary_questions,
        @summary_entities,
        @summary_constraints,
        @summary_next_actions,
        @summary_text,
        @summary_token_estimate,
        @covered_message_count,
        @covered_through_message_id,
        @created_at
      )
    `),
    selectSnapshotsForThread: connection.prepare(`
      SELECT id,
             thread_id,
             task_id,
             summary_goal,
             summary_decisions,
             summary_questions,
             summary_entities,
             summary_constraints,
             summary_next_actions,
             summary_text,
             summary_token_estimate,
             covered_message_count,
             covered_through_message_id,
             created_at
      FROM chat_context_snapshots
      WHERE thread_id = ?
      ORDER BY created_at DESC
    `),
  };

  function publish(type, payload) {
    const event = {
      id: randomUUID(),
      type,
      at: nowIso(),
      payload,
    };

    eventBus.emit("event", event);
    return event;
  }

  function taskOwnerAgentId(task) {
    return task.engineerThreadId ? "engineer" : task.sourceAgentId || "father";
  }

  function buildTaskChatHref(task) {
    return `/chat/${encodeURIComponent(taskOwnerAgentId(task))}?task=${encodeURIComponent(task.id)}`;
  }

  function toTask(row) {
    if (!row) {
      return null;
    }

    const sourceAgentId = row.source_agent_id || "father";
    const skillState = resolveRequestedSkillState(parseSkillList(row.requested_skills));
    const task = {
      id: row.id,
      title: row.title,
      summary: row.summary,
      stage: row.stage,
      stageLabel: TASK_STAGE_LABELS[row.stage] || row.stage,
      approvalState: row.approval_state,
      approvalLabel: APPROVAL_STATE_LABELS[row.approval_state] || row.approval_state,
      requestType: row.request_type,
      programId: row.program_id || null,
      siteDomain: row.site_domain || null,
      sourceAgentId,
      sourceAgentName: agentName(sourceAgentId),
      requestedBy: row.requested_by,
      requestedSkills: skillState.requestedSkills,
      requestedSkillDetails: skillState.requestedSkillDetails,
      missingRequestedSkills: skillState.missingRequestedSkills,
      sourceThreadId: row.source_thread_id,
      engineerThreadId: row.engineer_thread_id,
      assignedAgentId: row.assigned_agent_id,
      assignedAgentName: row.assigned_agent_id
        ? agentName(row.assigned_agent_id)
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      completedAt: row.completed_at,
    };

    return {
      ...task,
      chatHref: buildTaskChatHref(task),
    };
  }

  function sessionLabel(row) {
    if (row.session_type === "task_delivery") {
      return "Engineer delivery";
    }

    if (row.session_type === "task_review") {
      return "Task review";
    }

    if (row.session_type === "client_support") {
      return "Client support";
    }

    return "General";
  }

  function taskForRow(row) {
    return row?.task_id ? toTask(getTaskRecord(row.task_id)) : null;
  }

  function toSession(row) {
    if (!row) {
      return null;
    }

    const model = resolveModel(modelCatalog, row.model_family);
    const task = taskForRow(row);
    const skillState = resolveRequestedSkillState(parseSkillList(row.requested_skills));

    return {
      id: row.id,
      taskId: row.task_id,
      role: row.role,
      sessionType: row.session_type,
      sessionTypeLabel: SESSION_TYPE_LABELS[row.session_type] || row.session_type,
      label: sessionLabel(row),
      agentId: row.agent_id,
      agentName: agentName(row.agent_id),
      title: row.title,
      status: sessionStatus(row.status),
      modelFamily: row.model_family,
      modelProviderId: row.model_provider_id || model?.providerId || null,
      modelLabel: model?.label || row.model_family,
      continuedFromSessionId: row.continued_from_thread_id,
      latestContextSnapshotId: row.latest_context_snapshot_id,
      requestedSkills: skillState.requestedSkills,
      requestedSkillDetails: skillState.requestedSkillDetails,
      missingRequestedSkills: skillState.missingRequestedSkills,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      taskTitle: task?.title || null,
      taskStage: task?.stage || null,
    };
  }

  function toMessage(row) {
    if (!row) {
      return null;
    }

    const agent = row.author_type === "agent" ? agentListItem(row.author_id) : null;

    return {
      id: row.id,
      threadId: row.thread_id,
      taskId: row.task_id,
      authorType: row.author_type,
      authorId: row.author_id,
      authorLabel:
        row.author_type === "agent"
          ? agent?.name || agentName(row.author_id)
          : row.author_type === "system"
            ? "Control Plane"
            : row.author_id || "Operator",
      authorAvatarUrl: agent?.avatarUrl || null,
      kind: row.kind,
      body: row.body,
      usage: {
        inputTokens: row.usage_input_tokens,
        outputTokens: row.usage_output_tokens,
        totalTokens: row.usage_total_tokens,
        source: row.usage_source,
      },
      metadata: parseJson(row.metadata),
      compactedInSnapshotId: row.compacted_in_snapshot_id,
      isCompacted: Boolean(row.is_compacted),
      createdAt: row.created_at,
    };
  }

  function toTaskEvent(row) {
    return {
      id: row.id,
      taskId: row.task_id,
      eventType: row.event_type,
      actorType: row.actor_type,
      actorId: row.actor_id,
      payload: parseJson(row.payload),
      createdAt: row.created_at,
    };
  }

  function toSnapshot(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      threadId: row.thread_id,
      taskId: row.task_id,
      goal: row.summary_goal,
      durableDecisions: row.summary_decisions,
      unresolvedQuestions: row.summary_questions,
      keyEntitiesAndReferences: row.summary_entities,
      currentConstraints: row.summary_constraints,
      nextActions: row.summary_next_actions,
      summaryText: row.summary_text,
      summaryTokenEstimate: row.summary_token_estimate,
      coveredMessageCount: row.covered_message_count,
      coveredThroughMessageId: row.covered_through_message_id,
      createdAt: row.created_at,
    };
  }

  function getTaskRecord(taskId) {
    return statements.selectTaskById.get(taskId);
  }

  function requireTask(taskId) {
    const row = getTaskRecord(taskId);
    if (!row) {
      throw createHttpError(404, `Unknown task: ${taskId}`);
    }

    return row;
  }

  function getThreadRecord(threadId) {
    return statements.selectThreadById.get(threadId);
  }

  function requireThread(threadId) {
    const row = getThreadRecord(threadId);
    if (!row) {
      throw createHttpError(404, `Unknown session: ${threadId}`);
    }

    return row;
  }

  function threadMessages(threadId) {
    return statements.selectMessagesForThread.all(threadId).map(toMessage);
  }

  function threadSnapshots(threadId) {
    return statements.selectSnapshotsForThread.all(threadId).map(toSnapshot);
  }

  function latestSnapshot(threadId) {
    return threadSnapshots(threadId)[0] || null;
  }

  function recordTaskEvent(taskId, eventType, actorType, actorId, payload = {}, createdAt) {
    statements.insertTaskEvent.run({
      task_id: taskId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId || null,
      payload: JSON.stringify(payload),
      created_at: createdAt,
    });
  }

  function touchTask(taskId, updatedAt) {
    statements.touchTask.run({
      id: taskId,
      updated_at: updatedAt,
    });
  }

  function createThread({
    id,
    taskId = null,
    role,
    sessionType,
    agentId,
    title,
    modelFamily,
    modelProviderId,
    continuedFromSessionId = null,
    requestedSkills = [],
    createdAt,
  }) {
    statements.insertThread.run({
      id,
      task_id: taskId,
      role,
      session_type: sessionType,
      agent_id: agentId || null,
      title,
      status: "active",
      model_family: modelFamily,
      model_provider_id: modelProviderId || null,
      continued_from_thread_id: continuedFromSessionId,
      latest_context_snapshot_id: null,
      requested_skills: JSON.stringify(requestedSkills),
      created_at: createdAt,
      updated_at: createdAt,
    });

    const thread = toSession(getThreadRecord(id));
    publish(WORK_EVENT_TYPES.threadCreated, {
      taskId,
      threadId: id,
      sessionType,
      agentId,
    });

    return thread;
  }

  function addMessage({
    threadId,
    taskId = null,
    authorType,
    authorId,
    kind,
    body,
    createdAt,
    usage = {},
    metadata = {},
    compactedInSnapshotId = null,
    isCompacted = false,
    touchTaskState = true,
  }) {
    statements.insertMessage.run({
      id: randomUUID(),
      thread_id: threadId,
      task_id: taskId,
      author_type: authorType,
      author_id: authorId || null,
      kind,
      body,
      usage_input_tokens: usage.inputTokens ?? null,
      usage_output_tokens: usage.outputTokens ?? null,
      usage_total_tokens: usage.totalTokens ?? null,
      usage_source: usage.source || null,
      metadata: JSON.stringify(metadata || {}),
      compacted_in_snapshot_id: compactedInSnapshotId,
      is_compacted: isCompacted ? 1 : 0,
      created_at: createdAt,
    });
    statements.touchThread.run({
      id: threadId,
      updated_at: createdAt,
    });

    if (touchTaskState && taskId) {
      touchTask(taskId, createdAt);
    }

    publish(WORK_EVENT_TYPES.threadMessage, {
      taskId,
      threadId,
      authorType,
      authorId: authorId || null,
    });
  }

  function activeTaskThreadId(task) {
    return task.engineerThreadId || task.sourceThreadId;
  }

  function buildTaskListItem(task) {
    const activeThreadId = activeTaskThreadId(task);
    const lastMessage = activeThreadId
      ? toMessage(statements.selectLastMessageForThread.get(activeThreadId))
      : null;

    return {
      id: task.id,
      title: task.title,
      stage: task.stage,
      stageLabel: task.stageLabel,
      approvalState: task.approvalState,
      approvalLabel: task.approvalLabel,
      sourceAgentId: task.sourceAgentId,
      sourceAgentName: task.sourceAgentName,
      assignedAgentId: task.assignedAgentId,
      assignedAgentName: task.assignedAgentName,
      summary: task.summary,
      requestedSkills: task.requestedSkills,
      requestedSkillDetails: task.requestedSkillDetails,
      missingRequestedSkills: task.missingRequestedSkills,
      preview: lastMessage?.body || task.summary,
      lastActivityAt: lastMessage?.createdAt || task.updatedAt,
      activeThreadId,
      activeThreadMode: task.engineerThreadId ? "engineer" : "review",
      chatHref: task.chatHref,
    };
  }

  function buildKanbanCard(task) {
    return {
      id: task.id,
      title: task.title,
      summary: task.summary,
      stage: task.stage,
      stageLabel: task.stageLabel,
      approvalState: task.approvalState,
      approvalLabel: task.approvalLabel,
      sourceAgentId: task.sourceAgentId,
      sourceAgentName: task.sourceAgentName,
      assignedAgentId: task.assignedAgentId,
      assignedAgentName: task.assignedAgentName,
      requestedSkills: task.requestedSkills,
      requestedSkillDetails: task.requestedSkillDetails,
      missingRequestedSkills: task.missingRequestedSkills,
      updatedAt: task.updatedAt,
      chatHref: task.chatHref,
    };
  }

  function listTaskRows() {
    return statements.selectTasks.all();
  }

  function listActiveTasks() {
    return listTaskRows()
      .map(toTask)
      .filter((task) => task.stage !== "rejected");
  }

  function sessionPreview(threadRow) {
    const lastMessage = toMessage(statements.selectLastMessageForThread.get(threadRow.id));
    const task = taskForRow(threadRow);
    const session = toSession(threadRow);

    return {
      ...session,
      preview: compactText(lastMessage?.body || task?.summary || session.title, 160),
      lastActivityAt: lastMessage?.createdAt || session.updatedAt,
      taskTitle: task?.title || null,
      href: `/chat/${encodeURIComponent(session.agentId)}?session=${encodeURIComponent(session.id)}`,
    };
  }

  function sessionMessagesForCompaction(threadId) {
    return threadMessages(threadId).filter((message) => !message.isCompacted);
  }

  function createCompactionPacket(thread, task, messages, previousSnapshot = null) {
    const recentUserMessages = messages
      .filter((message) => message.authorType !== "agent" && message.authorType !== "system")
      .slice(-3)
      .map(messageExcerpt);
    const recentAgentMessages = messages
      .filter((message) => message.authorType === "agent")
      .slice(-3)
      .map(messageExcerpt);

    const goal =
      previousSnapshot?.goal ||
      (task ? `${task.title}: ${task.summary}` : `Continue ${thread.title}`);
    const durableDecisions = stringList(
      [
        previousSnapshot?.durableDecisions,
        ...recentAgentMessages,
      ].filter(Boolean),
    ) || "No durable decisions captured yet.";
    const unresolvedQuestions = stringList(
      [
        previousSnapshot?.unresolvedQuestions,
        ...recentUserMessages,
      ].filter(Boolean),
    ) || "Continue the current line of questioning.";
    const keyEntitiesAndReferences = stringList(
      [
        previousSnapshot?.keyEntitiesAndReferences,
        `Agent: ${thread.agentName}`,
        task ? `Task: ${task.title}` : null,
        task?.sourceAgentName ? `Source: ${task.sourceAgentName}` : null,
        `Session: ${thread.title}`,
      ].filter(Boolean),
    );
    const currentConstraints = stringList(
      [
        previousSnapshot?.currentConstraints,
        `Model: ${thread.modelLabel}`,
        task ? `Task stage: ${task.stageLabel}` : "Task stage: none",
        "Single-process control plane with manual operator approval on Accepted work.",
      ].filter(Boolean),
    );
    const nextActions = stringList(
      [
        previousSnapshot?.nextActions,
        task
          ? `Continue ${thread.sessionType === "task_delivery" ? "delivery" : "review"} work for "${task.title}".`
          : `Continue the conversation with ${thread.agentName}.`,
        recentUserMessages.at(-1)
          ? `Respond to: ${recentUserMessages.at(-1)}`
          : null,
      ].filter(Boolean),
    );
    const summaryText = [
      `Goal\n${goal}`,
      `Durable decisions\n${durableDecisions}`,
      `Unresolved questions\n${unresolvedQuestions}`,
      `Key entities and references\n${keyEntitiesAndReferences}`,
      `Current constraints\n${currentConstraints}`,
      `Next actions\n${nextActions}`,
    ].join("\n\n");

    return {
      goal,
      durableDecisions,
      unresolvedQuestions,
      keyEntitiesAndReferences,
      currentConstraints,
      nextActions,
      summaryText,
      summaryTokenEstimate: estimateTokens(summaryText),
    };
  }

  function sessionContext(threadId, { draft = "" } = {}) {
    const row = requireThread(threadId);
    const session = toSession(row);
    const task = row.task_id ? toTask(requireTask(row.task_id)) : null;
    const agentEntry = findAgentEntry(session.agentId);
    const packets = agentPacketSet(agentEntry);
    const learningNotes = recentLearning(session.agentId, 4);
    const selectedSkills = mergedSelectedSkillState({ session, task });
    const model = requireModel(modelCatalog, session.modelFamily);
    const messages = threadMessages(threadId);
    const snapshot = latestSnapshot(threadId);
    const liveMessages = messages.filter((message) => !message.isCompacted);
    const baseTokens =
      estimateTokens(session.title) +
      estimateTokens(task?.title) +
      estimateTokens(task?.summary) +
      estimateTokens(agentEntry?.purpose) +
      estimateTokens(agentEntry?.notes) +
      packetTextValues(packets).reduce((total, value) => total + estimateTokens(value), 0) +
      selectedSkills.resolvedSkillPackets.reduce(
        (total, skill) => total + estimateTokens(skill.content),
        0,
      ) +
      learningNotes.reduce((total, item) => total + estimateTokens(item.note), 0);
    const snapshotTokens = snapshot?.summaryTokenEstimate || 0;
    const liveMessageTokens = liveMessages.reduce(
      (total, message) => total + estimateTokens(message.body),
      0,
    );
    const draftTokens = estimateTokens(draft);
    const usedTokens = baseTokens + snapshotTokens + liveMessageTokens + draftTokens;
    const remainingTokens = Math.max(
      0,
      model.maxContextTokens - model.reservedReplyTokens - usedTokens,
    );
    const lastMeasuredTurn = [...messages]
      .reverse()
      .find((message) => message.usage?.source === "provider-measured");
    const compactedMessageCount = messages.filter((message) => message.isCompacted).length;

    return {
      sessionId: threadId,
      modelFamily: model.family,
      modelLabel: model.label,
      modelProviderId: model.providerId,
      maxContextTokens: model.maxContextTokens,
      reservedReplyTokens: model.reservedReplyTokens,
      estimatedUsedTokens: usedTokens,
      estimatedRemainingTokens: remainingTokens,
      draftTokens,
      accuracySource:
        draftTokens > 0 || !lastMeasuredTurn ? "local-estimated" : "provider-measured",
      compaction: {
        available: liveMessages.length > COMPACTION_RETAIN_MESSAGE_COUNT,
        snapshotCount: statements.selectSnapshotsForThread.all(threadId).length,
        compactedMessageCount,
        liveMessageCount: liveMessages.length,
        lastCompactedAt: snapshot?.createdAt || null,
        latestSnapshotId: snapshot?.id || null,
      },
      carryoverSummary: snapshot
        ? {
            id: snapshot.id,
            text: snapshot.summaryText,
            tokenEstimate: snapshot.summaryTokenEstimate,
            createdAt: snapshot.createdAt,
          }
        : null,
      provider: buildProviderStatus(session, {
        accuracySource:
          draftTokens > 0 || !lastMeasuredTurn ? "local-estimated" : "provider-measured",
      }),
      role: {
        purpose: agentEntry?.purpose || "",
        notes: agentEntry?.notes || "",
        sourcePath: packets.sourcePath,
        filePaths: packets.filePaths,
        soul: packets.soul,
        userContext: packets.userContext,
        baseMemory: packets.baseMemory,
        heartbeat: packets.heartbeat,
        orchestrationSkills: packets.orchestrationSkills,
        architecture: packets.architecture,
      },
      learning: {
        recentNotes: learningNotes,
      },
      selectedSkills: {
        requestedSkills: selectedSkills.requestedSkills,
        items: selectedSkills.requestedSkillDetails,
        missingRequestedSkills: selectedSkills.missingRequestedSkills,
      },
    };
  }

  function buildSessionPayload(threadId) {
    const row = requireThread(threadId);
    const session = toSession(row);
    const task = row.task_id ? getTask(row.task_id) : null;
    const messages = threadMessages(threadId);
    const compactionHistory = threadSnapshots(threadId);

    return {
      session,
      linkedTask: task,
      messages,
      compactionHistory,
      context: sessionContext(threadId),
    };
  }

  function taskDetailFromRow(row) {
    const task = toTask(row);
    const sessions = statements.selectThreadsForTask.all(task.id).map(toSession);
    const events = statements.selectTaskEvents.all(task.id).map(toTaskEvent);
    const activeSessionId = activeTaskThreadId(task);
    const activeThreadMode = task.engineerThreadId ? "engineer" : "review";

    return {
      ...task,
      availableActions: {
        approve:
          task.stage === "accepted" && task.approvalState === "pending_approval",
        reject:
          task.stage === "accepted" &&
          (task.approvalState === "pending_approval" ||
            task.approvalState === "approved_waiting_for_engineer"),
      },
      activeSessionId,
      activeThreadId: activeSessionId,
      activeThreadMode,
      sessions,
      threads: sessions,
      sourceThread:
        sessions.find((session) => session.sessionType === "task_review") || null,
      engineerThread:
        sessions.find((session) => session.sessionType === "task_delivery") || null,
      events,
    };
  }

  function chatAgentSummary(entry) {
    const sessions = statements.selectThreadsForAgent.all(entry.id).map(sessionPreview);
    const latestSession = sessions[0] || null;

    return {
      ...toAgentListItem(entry),
      sessionCount: sessions.length,
      activeSessionCount: sessions.filter((session) => session.status === "active").length,
      latestSession,
    };
  }

  function selectWorkspaceSession(agentId, { taskId = null, sessionId = null } = {}) {
    const sessions = statements.selectThreadsForAgent.all(agentId).map(toSession);

    if (sessionId) {
      const matching = sessions.find((session) => session.id === sessionId);
      if (!matching) {
        throw createHttpError(
          404,
          `Session ${sessionId} does not belong to ${agentId}.`,
        );
      }

      return matching;
    }

    if (taskId) {
      const task = getTask(taskId);
      if (!task) {
        throw createHttpError(404, `Unknown task: ${taskId}`);
      }

      const preferredId =
        agentId === "engineer" && task.engineerThreadId
          ? task.engineerThreadId
          : task.sourceAgentId === agentId
            ? task.sourceThreadId
            : sessions.find((session) => session.taskId === taskId && isActiveSession(session))
              ?.id;

      if (preferredId) {
        return sessions.find((session) => session.id === preferredId) || null;
      }
    }

    return sessions.find((session) => session.status === "active") || sessions[0] || null;
  }

  function sessionTitleForNewSession(agentId, payload = {}) {
    if (payload.title) {
      return payload.title;
    }

    if (payload.taskId) {
      const task = getTask(payload.taskId);
      if (task) {
        return `${task.title} · ${agentName(agentId)}`;
      }
    }

    return `${agentName(agentId)} · ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  function createSession(agentId, payload = {}) {
    const entry = findAgentEntry(agentId);
    if (!entry) {
      throw createHttpError(404, `Unknown agent: ${agentId}`);
    }

    const sessionType = payload.sessionType || (payload.taskId ? "task_review" : "general");
    const task = payload.taskId ? getTask(payload.taskId) : null;
    const model = requireModel(modelCatalog, payload.modelFamily);
    const timestamp = nowIso();

    if (sessionType === "task_delivery" && agentId !== "engineer") {
      throw createHttpError(
        409,
        "Only engineer can own task delivery sessions.",
      );
    }

    if (task && sessionType === "task_review" && task.sourceAgentId !== agentId) {
      throw createHttpError(
        409,
        "Task review sessions must stay under the source agent.",
      );
    }

    if (task && sessionType === "task_delivery" && task.engineerThreadId) {
      const existing = toSession(getThreadRecord(task.engineerThreadId));
      if (existing && existing.agentId === agentId && existing.status === "active") {
        return buildSessionPayload(existing.id);
      }
    }

    const requestedSkills = validateRequestedSkills(
      hasOwnProperty(payload, "requestedSkills")
        ? payload.requestedSkills
        : task?.requestedSkills || [],
    );

    const sessionId = randomUUID();
    const role =
      sessionType === "task_delivery"
        ? "engineer"
        : sessionType === "task_review"
          ? "source"
          : "agent";

    createThread({
      id: sessionId,
      taskId: task?.id || null,
      role,
      sessionType,
      agentId,
      title: sessionTitleForNewSession(agentId, payload),
      modelFamily: model.family,
      modelProviderId: model.providerId,
      requestedSkills,
      createdAt: timestamp,
    });

    if (task?.id && sessionType === "task_review") {
      statements.updateTaskSourceThread.run({
        id: task.id,
        thread_id: sessionId,
        updated_at: timestamp,
      });
    }

    if (task?.id && sessionType === "task_delivery") {
      statements.updateTaskEngineerThread.run({
        id: task.id,
        thread_id: sessionId,
        updated_at: timestamp,
      });
    }

    return buildSessionPayload(sessionId);
  }

  function carryoverTextForFork(session, task) {
    const snapshot = latestSnapshot(session.id);
    if (snapshot) {
      return `Carryover summary from ${session.modelLabel}\n\n${snapshot.summaryText}`;
    }

    const recentMessages = threadMessages(session.id).slice(-6).map(messageExcerpt);

    return [
      `Carryover summary from ${session.modelLabel}`,
      task ? `Task: ${task.title}` : null,
      recentMessages.length > 0 ? recentMessages.join("\n") : "No prior turns yet.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function forkSessionModel(sessionId, payload = {}) {
    const currentRow = requireThread(sessionId);
    const currentSession = toSession(currentRow);
    const nextModel = requireModel(modelCatalog, payload.modelFamily);

    if (currentSession.modelFamily === nextModel.family) {
      throw createHttpError(
        409,
        `Session is already using ${nextModel.label}.`,
      );
    }

    const timestamp = nowIso();
    const task = currentSession.taskId ? getTask(currentSession.taskId) : null;
    const newSessionId = randomUUID();

    statements.updateThreadStatus.run({
      id: sessionId,
      status: "superseded",
      updated_at: timestamp,
    });

    createThread({
      id: newSessionId,
      taskId: currentSession.taskId,
      role: currentSession.role,
      sessionType: currentSession.sessionType,
      agentId: currentSession.agentId,
      title: currentSession.title,
      modelFamily: nextModel.family,
      modelProviderId: nextModel.providerId,
      continuedFromSessionId: currentSession.id,
      requestedSkills: currentSession.requestedSkills,
      createdAt: timestamp,
    });

    addMessage({
      threadId: newSessionId,
      taskId: currentSession.taskId,
      authorType: "system",
      authorId: "control-plane",
      kind: "carryover",
      body: carryoverTextForFork(currentSession, task),
      createdAt: timestamp,
      usage: {
        inputTokens: estimateTokens(currentSession.title),
        outputTokens: estimateTokens(carryoverTextForFork(currentSession, task)),
        totalTokens: estimateTokens(currentSession.title) + estimateTokens(carryoverTextForFork(currentSession, task)),
        source: "local-estimated",
      },
      touchTaskState: Boolean(currentSession.taskId),
    });

    if (currentSession.taskId && currentSession.sessionType === "task_review") {
      statements.updateTaskSourceThread.run({
        id: currentSession.taskId,
        thread_id: newSessionId,
        updated_at: timestamp,
      });
    }

    if (currentSession.taskId && currentSession.sessionType === "task_delivery") {
      statements.updateTaskEngineerThread.run({
        id: currentSession.taskId,
        thread_id: newSessionId,
        updated_at: timestamp,
      });
    }

    return buildSessionPayload(newSessionId);
  }

  function compactSession(sessionId) {
    const row = requireThread(sessionId);
    const session = toSession(row);
    const task = row.task_id ? getTask(row.task_id) : null;
    const liveMessages = sessionMessagesForCompaction(sessionId);

    if (liveMessages.length <= COMPACTION_RETAIN_MESSAGE_COUNT) {
      throw createHttpError(
        409,
        "This session is too short to compact right now.",
      );
    }

    const messagesToCompact = liveMessages.slice(
      0,
      liveMessages.length - COMPACTION_RETAIN_MESSAGE_COUNT,
    );
    const previousSnapshot = latestSnapshot(sessionId);
    const packet = createCompactionPacket(
      session,
      task,
      messagesToCompact,
      previousSnapshot,
    );
    const timestamp = nowIso();
    const snapshotId = randomUUID();

    statements.insertSnapshot.run({
      id: snapshotId,
      thread_id: sessionId,
      task_id: session.taskId,
      summary_goal: packet.goal,
      summary_decisions: packet.durableDecisions,
      summary_questions: packet.unresolvedQuestions,
      summary_entities: packet.keyEntitiesAndReferences,
      summary_constraints: packet.currentConstraints,
      summary_next_actions: packet.nextActions,
      summary_text: packet.summaryText,
      summary_token_estimate: packet.summaryTokenEstimate,
      covered_message_count: messagesToCompact.length,
      covered_through_message_id: messagesToCompact.at(-1)?.id || null,
      created_at: timestamp,
    });

    for (const message of messagesToCompact) {
      statements.markMessagesCompacted.run({
        id: message.id,
        compacted_in_snapshot_id: snapshotId,
      });
    }

    statements.updateThreadSnapshot.run({
      id: sessionId,
      latest_context_snapshot_id: snapshotId,
      updated_at: timestamp,
    });

    publish(WORK_EVENT_TYPES.threadUpdated, {
      threadId: sessionId,
      taskId: session.taskId,
      snapshotId,
    });

    appendLearningNote({
      session,
      task,
      prompt: packet.nextActions,
      replyBody: packet.summaryText,
      threadId: sessionId,
      source: "compaction-summary",
    });

    return buildSessionPayload(sessionId);
  }

  function claudeProviderDetail(status, session) {
    if (status.status === "live") {
      const emailSuffix = status.email ? ` for ${status.email}` : "";
      const subscriptionSuffix = status.subscriptionType
        ? ` (${status.subscriptionType})`
        : "";
      return `Using the local Claude CLI OAuth session${emailSuffix}${subscriptionSuffix}. Model alias: ${session.modelFamily}.`;
    }

    if (status.evidence === "binary_missing") {
      return "Claude CLI is not installed or not discoverable on this server yet. Install Claude Code or point CLAUDE_BINARY/CLAUDE_BINARY_PATH at the local binary.";
    }

    if (status.evidence === "cli_not_authenticated") {
      return "Claude CLI is installed but not authenticated. Run `claude auth login` on the server to restore the local OAuth session.";
    }

    if (status.evidence === "invalid_status_payload") {
      return "Claude CLI auth status did not return a usable payload, so the runtime cannot verify the local OAuth session yet.";
    }

    if (String(status.evidence || "").startsWith("subscription_limit:")) {
      return `The local Claude subscription hit its current usage limit. ${String(status.evidence || "").replace(/^subscription_limit:/, "")}`.trim();
    }

    if (String(status.evidence || "").startsWith("auth_required:")) {
      return `Claude CLI requires a fresh login before it can answer again. ${String(status.evidence || "").replace(/^auth_required:/, "")}`.trim();
    }

    if (status.evidence && status.evidence !== "configured_binary") {
      return `Claude CLI OAuth is currently unavailable: ${status.evidence}.`;
    }

    return "Claude CLI OAuth is configured but has not completed its first runtime check yet.";
  }

  function anthropicProviderStatus(session) {
    return {
      mode: "anthropic-api",
      configured: anthropicClient.configured,
      connectionStatus: anthropicClient.configured ? "live" : "missing",
      label: anthropicClient.configured
        ? "Anthropic API connected"
        : "Anthropic API unavailable",
      detail: anthropicClient.configured
        ? `Using ${session.modelProviderId || session.modelFamily} through the Anthropic Messages API.`
        : "No ANTHROPIC_API_KEY is configured on this server yet.",
      modelId: session.modelProviderId || null,
      backend: "anthropic_api",
      evidence: anthropicClient.configured ? "env_present" : "env_missing",
    };
  }

  function simulatedProviderStatus(session) {
    return {
      mode: "simulated",
      configured: false,
      connectionStatus: "offline",
      label: "Local simulated replies",
      detail:
        "No live Claude runtime is selected for this workspace, so replies are being generated locally inside the control plane.",
      modelId: session.modelProviderId || null,
      backend: "simulated",
      evidence: "local_fallback",
    };
  }

  function activeProviderStatus(session) {
    if (selectedProvider === "anthropic") {
      return anthropicProviderStatus(session);
    }

    if (selectedProvider === "claude") {
      const status = claudeRuntime.getStatusSnapshot();
      return {
        mode: "claude-cli-oauth",
        configured: status.status === "live",
        connectionStatus: status.status,
        label:
          status.status === "live"
            ? "Claude CLI OAuth connected"
            : status.status === "checking"
              ? "Claude CLI OAuth checking"
              : "Claude CLI OAuth unavailable",
        detail: claudeProviderDetail(status, session),
        modelId: session.modelFamily,
        backend: status.backend || "claude_cli_oauth",
        evidence: status.evidence || null,
        authMethod: status.authMethod || null,
        apiProvider: status.apiProvider || null,
        email: status.email || null,
        subscriptionType: status.subscriptionType || null,
      };
    }

    return simulatedProviderStatus(session);
  }

  function buildProviderStatus(session, context = null, overrides = {}) {
    return {
      ...activeProviderStatus(session),
      lastAccuracySource: context?.accuracySource || null,
      ...overrides,
    };
  }

  function buildAgentSystemPrompt({ session, task, threadId }) {
    const agentEntry = findAgentEntry(session.agentId);
    const packets = agentPacketSet(agentEntry);
    const learningNotes = recentLearning(session.agentId, 4);
    const snapshot = latestSnapshot(threadId);
    const selectedSkills = mergedSelectedSkillState({ session, task });

    return [
      `You are ${session.agentName}, an agent inside Agent Enterprise.`,
      `Role: ${sentenceCase(agentEntry?.purpose || "Coordinate work inside the control plane")}`,
      agentEntry?.notes ? `Operating notes: ${sentenceCase(agentEntry.notes)}` : null,
      packetSection("Soul file", packets.soul),
      packetSection("User context", packets.userContext),
      packetSection("Base memory", packets.baseMemory),
      packetSection("Heartbeat", packets.heartbeat),
      packetSection("Orchestration skills", packets.orchestrationSkills),
      packetSection("Architecture packet", packets.architecture),
      selectedSkillSection(selectedSkills),
      learningSection(learningNotes),
      task
        ? `Linked task: ${task.title}. Task summary: ${sentenceCase(task.summary)} Current stage: ${task.stageLabel}.`
        : null,
      snapshot ? `Carryover summary:\n${snapshot.summaryText}` : null,
      "Prefer the packet files and recent learned memory over stale assumptions when they conflict.",
      "Selected skills are part of the active operating context for this session. Use them when they are more specific than general packet guidance.",
      "Reply like a real assistant in a direct conversational tone.",
      "Do not start with status banners, model announcements, or descriptions of your own role unless the user explicitly asks for them.",
      "If the request is too vague, ask one concise follow-up question.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function buildAnthropicMessages(threadId) {
    return threadMessages(threadId)
      .filter((message) => !message.isCompacted)
      .map((message) => {
        if (message.authorType === "agent") {
          return {
            role: "assistant",
            content: message.body,
          };
        }

        return {
          role: "user",
          content:
            message.authorType === "system"
              ? `[System note]\n${message.body}`
              : message.body,
        };
      });
  }

  function buildClaudeCliUserPrompt({ session, task, threadId }) {
    const transcript = threadMessages(threadId)
      .filter((message) => !message.isCompacted)
      .map((message) => {
        if (message.authorType === "agent") {
          return `${session.agentName}: ${message.body}`;
        }

        if (message.authorType === "system") {
          return `[System note]\n${message.body}`;
        }

        return `Operator: ${message.body}`;
      })
      .join("\n\n");

    return [
      `Session title: ${session.title}`,
      `Target agent: ${session.agentName} (${session.agentId})`,
      task ? `Linked task: ${task.title}` : null,
      task ? `Task summary: ${sentenceCase(task.summary)}` : null,
      "Conversation so far:",
      transcript || "No prior session history.",
      "Reply with the next assistant message only.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function buildFallbackReply({ session, task, prompt }) {
    const agentEntry = findAgentEntry(session.agentId);
    const purpose = sentenceCase(
      agentEntry?.purpose || "Coordinate work inside the control plane",
    );
    const normalizedPrompt = String(prompt || "").trim();

    if (isGreetingPrompt(normalizedPrompt)) {
      return {
        kind: "response",
        body: `Hey. I'm ${session.agentName}. ${purpose} What do you want me to focus on?`,
        usage: {
          inputTokens: estimateTokens(normalizedPrompt),
          outputTokens: estimateTokens(purpose) + 18,
          totalTokens: estimateTokens(normalizedPrompt) + estimateTokens(purpose) + 18,
          source: "local-estimated",
        },
      };
    }

    if (task && session.sessionType === "task_review") {
      return {
        kind: "review",
        body: `I’ve got the review context for "${task.title}". ${sentenceCase(task.summary)} If this should move into engineering, approve it here. If you want me to tighten the brief first, tell me what to add or change.`,
        usage: {
          inputTokens: estimateTokens(normalizedPrompt),
          outputTokens: estimateTokens(task.summary) + 34,
          totalTokens: estimateTokens(normalizedPrompt) + estimateTokens(task.summary) + 34,
          source: "local-estimated",
        },
      };
    }

    if (task && session.sessionType === "task_delivery") {
      return {
        kind: "response",
        body: `I’m working from the task "${task.title}". ${sentenceCase(task.summary)} If you want, I can break it into implementation steps, call out risks, or move straight into the next development stage.`,
        usage: {
          inputTokens: estimateTokens(normalizedPrompt),
          outputTokens: estimateTokens(task.summary) + 32,
          totalTokens: estimateTokens(normalizedPrompt) + estimateTokens(task.summary) + 32,
          source: "local-estimated",
        },
      };
    }

    if (isQuestionPrompt(normalizedPrompt)) {
      return {
        kind: "response",
        body: `I can help with that. ${purpose} Give me the concrete decision, draft, or task you want handled, and I’ll answer from that context instead of guessing.`,
        usage: {
          inputTokens: estimateTokens(normalizedPrompt),
          outputTokens: estimateTokens(purpose) + 28,
          totalTokens: estimateTokens(normalizedPrompt) + estimateTokens(purpose) + 28,
          source: "local-estimated",
        },
      };
    }

    return {
      kind: "response",
      body: `Understood. ${purpose} Tell me the exact outcome you want, and I’ll take the next step from this workspace.`,
      usage: {
        inputTokens: estimateTokens(normalizedPrompt),
        outputTokens: estimateTokens(purpose) + 20,
        totalTokens: estimateTokens(normalizedPrompt) + estimateTokens(purpose) + 20,
        source: "local-estimated",
      },
    };
  }

  async function buildAgentReply({ session, task, prompt, context, threadId }) {
    const model = requireModel(modelCatalog, session.modelFamily);

    if (
      session.agentId === "engineer" &&
      task &&
      task.stage === "accepted" &&
      task.approvalState === "approved_waiting_for_engineer"
    ) {
      return {
        kind: "plan",
        body: `Planning has started for "${task.title}". I’m structuring the work into an executable implementation path before moving it into development.`,
        usage: {
          inputTokens: context.estimatedUsedTokens,
          outputTokens: estimateTokens(task.title) + estimateTokens(task.summary) + 28,
          totalTokens:
            context.estimatedUsedTokens +
            estimateTokens(task.title) +
            estimateTokens(task.summary) +
            28,
          source: "local-estimated",
        },
        metadata: {
          provider: buildProviderStatus(session, context),
        },
      };
    }

    if (selectedProvider === "claude") {
      const runtimeStatus = await claudeRuntime.status({
        force: true,
        modelFamily: session.modelFamily,
      });

      if (runtimeStatus.status === "live") {
        const systemPrompt = buildAgentSystemPrompt({ session, task, threadId });
        const userPrompt = buildClaudeCliUserPrompt({ session, task, threadId });

        try {
          const response = await claudeRuntime.runCompletion({
            modelFamily: session.modelFamily,
            systemPrompt,
            userPrompt,
            timeoutMs: env.claudeTimeoutMs,
          });

          const body =
            response.text ||
            "I’m here. Send the exact task or decision you want handled and I’ll continue from there.";

          return {
            kind: "response",
            body,
            usage: {
              inputTokens:
                estimateTokens(systemPrompt) + estimateTokens(userPrompt),
              outputTokens: estimateTokens(body),
              totalTokens:
                estimateTokens(systemPrompt) +
                estimateTokens(userPrompt) +
                estimateTokens(body),
              source: "local-estimated",
            },
            metadata: {
              provider: buildProviderStatus(session, context, {
                connectionStatus: "live",
              }),
            },
          };
        } catch (error) {
          claudeRuntime.recordFailure(error.message);
          const fallback = buildFallbackReply({ session, task, prompt });
          return {
            ...fallback,
            metadata: {
              provider: buildProviderStatus(session, context, {
                configured: false,
                connectionStatus: "partial",
                label: "Claude CLI fallback",
                detail: `Claude CLI OAuth was selected, but this turn fell back to a local reply: ${error.message}`,
                evidence: error.message,
              }),
            },
          };
        }
      }

      const fallback = buildFallbackReply({ session, task, prompt });
      return {
        ...fallback,
        metadata: {
          provider: buildProviderStatus(session, context),
        },
      };
    }

    if (selectedProvider === "anthropic") {
      if (!anthropicClient.configured) {
        const fallback = buildFallbackReply({ session, task, prompt });
        return {
          ...fallback,
          metadata: {
            provider: buildProviderStatus(session, context),
          },
        };
      }

      try {
        const response = await anthropicClient.createMessage({
          model: model.providerId,
          system: buildAgentSystemPrompt({ session, task, threadId }),
          messages: buildAnthropicMessages(threadId),
          maxTokens: Math.min(model.reservedReplyTokens, 2048),
        });

        return {
          kind: "response",
          body:
            response.text ||
            "I’m here. Send the exact task or decision you want handled and I’ll continue from there.",
          usage: response.usage,
          metadata: {
            provider: buildProviderStatus(session, context),
            stopReason: response.stopReason,
          },
        };
      } catch (error) {
        const fallback = buildFallbackReply({ session, task, prompt });
        return {
          ...fallback,
          metadata: {
            provider: buildProviderStatus(session, context, {
              mode: "anthropic-api",
              configured: false,
              connectionStatus: "partial",
              label: "Anthropic fallback",
              detail: `The Anthropic request failed, so this turn fell back to a local reply: ${error.message}`,
              evidence: error.message,
            }),
          },
        };
      }
    }

    const fallback = buildFallbackReply({ session, task, prompt });
    return {
      ...fallback,
      metadata: {
        provider: buildProviderStatus(session, context),
      },
    };
  }

  async function sendSessionMessage(sessionId, payload = {}) {
    const body = String(payload.body || "").trim();

    if (!body) {
      throw createHttpError(400, "Message body is required.");
    }

    const row = requireThread(sessionId);
    const session = toSession(row);
    const task = session.taskId ? getTask(session.taskId) : null;
    const timestamp = nowIso();
    const draftContext = sessionContext(sessionId, { draft: body });

    addMessage({
      threadId: sessionId,
      taskId: session.taskId,
      authorType: "user",
      authorId: payload.authorId || "operator",
      kind: "prompt",
      body,
      createdAt: timestamp,
      usage: {
        inputTokens: estimateTokens(body),
        outputTokens: null,
        totalTokens: estimateTokens(body),
        source: "local-estimated",
      },
      metadata: {
        origin: "workspace",
      },
    });

    const reply = await buildAgentReply({
      session,
      task,
      prompt: body,
      context: draftContext,
      threadId: sessionId,
    });
    const replyTimestamp = nowIso();

    if (
      session.agentId === "engineer" &&
      task &&
      task.stage === "accepted" &&
      task.approvalState === "approved_waiting_for_engineer"
    ) {
      await engineerTransitionTask(task.id, {
        actorId: "engineer",
        targetStage: "planned",
        message: reply.body,
        usage: reply.usage,
      });
    } else {
      addMessage({
        threadId: sessionId,
        taskId: session.taskId,
        authorType: "agent",
        authorId: session.agentId,
        kind: reply.kind,
        body: reply.body,
        createdAt: replyTimestamp,
        usage: reply.usage,
        metadata: {
          modelFamily: session.modelFamily,
          ...(reply.metadata || {}),
        },
      });
    }

    appendLearningNote({
      session,
      task,
      prompt: body,
      replyBody: reply.body,
      threadId: sessionId,
      source: "conversation-turn",
    });

    return buildSessionPayload(sessionId);
  }

  async function engineerTransitionTask(taskId, options = {}) {
    if (options.actorId !== "engineer") {
      throw createHttpError(403, "Only engineer can transition tasks.");
    }

    const task = toTask(requireTask(taskId));
    const targetStage = options.targetStage;
    assertTransition(task, targetStage);

    if (!task.engineerThreadId) {
      throw createHttpError(409, "Engineer thread has not been created yet.");
    }

    if (targetStage === "completed" && isLavprisTask(task)) {
      const changelogCheck = validateLavprisChangelogEntry(
        env,
        options.releaseChecklist?.changelogEntryText,
      );

      if (!changelogCheck.ok) {
        const error = createHttpError(409, changelogCheck.message);
        error.code = changelogCheck.code;
        if (lavprisRolloutService) {
          error.payload = {
            code: changelogCheck.code,
            rolloutStatus: await lavprisRolloutService.getMasterRolloutStatus(),
          };
        } else {
          error.payload = {
            code: changelogCheck.code,
          };
        }
        throw error;
      }
    }

    const timestamp = nowIso();
    addMessage({
      threadId: task.engineerThreadId,
      taskId,
      authorType: "agent",
      authorId: "engineer",
      kind: targetStage === "planned" ? "plan" : "transition",
      body: options.message || defaultEngineerMessage(targetStage, task.title),
      createdAt: timestamp,
      usage: options.usage || {
        inputTokens: estimateTokens(task.summary),
        outputTokens: estimateTokens(options.message || defaultEngineerMessage(targetStage, task.title)),
        totalTokens:
          estimateTokens(task.summary) +
          estimateTokens(options.message || defaultEngineerMessage(targetStage, task.title)),
        source: "provider-measured",
      },
      metadata: {
        targetStage,
      },
      touchTaskState: false,
    });

    statements.updateTransitionedTask.run({
      id: taskId,
      stage: targetStage,
      approval_state:
        targetStage === "planned"
          ? "approved"
          : task.approvalState === "not_required"
            ? "not_required"
            : "approved",
      updated_at: timestamp,
      completed_at: targetStage === "completed" ? timestamp : null,
    });

    recordTaskEvent(
      taskId,
      WORK_EVENT_TYPES.taskTransitioned,
      "agent",
      "engineer",
      {
        fromStage: task.stage,
        toStage: targetStage,
      },
      timestamp,
    );

    publish(WORK_EVENT_TYPES.taskTransitioned, {
      taskId,
      fromStage: task.stage,
      toStage: targetStage,
    });

    return getTask(taskId);
  }

  function getTask(taskId) {
    const row = getTaskRecord(taskId);
    return row ? taskDetailFromRow(row) : null;
  }

  function updateTaskRequestedSkills(taskId, payload = {}) {
    const row = requireTask(taskId);
    const timestamp = nowIso();
    const requestedSkills = validateRequestedSkills(payload.requestedSkills);

    statements.updateTaskRequestedSkills.run({
      id: taskId,
      requested_skills: JSON.stringify(requestedSkills),
      updated_at: timestamp,
    });

    for (const threadId of [row.source_thread_id, row.engineer_thread_id].filter(Boolean)) {
      statements.updateThreadRequestedSkills.run({
        id: threadId,
        requested_skills: JSON.stringify(requestedSkills),
        updated_at: timestamp,
      });
    }

    recordTaskEvent(
      taskId,
      WORK_EVENT_TYPES.taskUpdated,
      "operator",
      payload.actorId || "operator",
      {
        requestedSkills,
      },
      timestamp,
    );

    publish(WORK_EVENT_TYPES.taskUpdated, {
      taskId,
      requestedSkills,
    });

    return getTask(taskId);
  }

  function updateSessionRequestedSkills(sessionId, payload = {}) {
    const row = requireThread(sessionId);
    const timestamp = nowIso();
    const requestedSkills = validateRequestedSkills(payload.requestedSkills);

    statements.updateThreadRequestedSkills.run({
      id: sessionId,
      requested_skills: JSON.stringify(requestedSkills),
      updated_at: timestamp,
    });

    publish(WORK_EVENT_TYPES.threadUpdated, {
      threadId: sessionId,
      taskId: row.task_id || null,
      requestedSkills,
    });

    return buildSessionPayload(sessionId);
  }

  return {
    stages: VISIBLE_TASK_STAGES.map((stage) => ({
      id: stage,
      label: TASK_STAGE_LABELS[stage],
    })),
    async primeRuntimeStatus() {
      if (selectedProvider === "claude") {
        await claudeRuntime.status({
          force: true,
          includeLiveCheck: false,
          modelFamily: modelCatalog.defaultModelFamily,
        });
      }
    },
    subscribe(listener) {
      eventBus.on("event", listener);
      return () => eventBus.off("event", listener);
    },
    listSkills() {
      return skillLibrary().map(skillListItem);
    },
    listKanban() {
      const tasks = listActiveTasks();
      const columns = VISIBLE_TASK_STAGES.map((stage) => ({
        id: stage,
        label: TASK_STAGE_LABELS[stage],
        count: tasks.filter((task) => task.stage === stage).length,
        tasks: tasks
          .filter((task) => task.stage === stage)
          .map(buildKanbanCard),
      }));

      return {
        generatedAt: nowIso(),
        columns,
        counts: {
          totalActive: tasks.length,
          pendingApproval: tasks.filter(
            (task) => task.approvalState === "pending_approval",
          ).length,
          queuedForEngineer: tasks.filter(
            (task) =>
              task.stage === "accepted" &&
              task.approvalState === "approved_waiting_for_engineer",
          ).length,
          completed: tasks.filter((task) => task.stage === "completed").length,
        },
      };
    },
    intakeTask(payload = {}) {
      if (!payload.title || !payload.summary) {
        throw createHttpError(400, "Task intake requires title and summary.");
      }

      if (payload.requestType !== "engineering") {
        return {
          accepted: false,
          reason: "non-engineering-request",
        };
      }

      const timestamp = nowIso();
      const taskId = randomUUID();
      const sourceAgentId = payload.sourceAgentId || "father";
      const inferredProgramId =
        payload.programId ||
        (isLavprisTask({ sourceAgentId }) ? "lavprishjemmeside" : null);
      const directEngineer =
        payload.directToEngineer === true || sourceAgentId === "engineer";
      const defaultModel = requireModel(modelCatalog, payload.modelFamily);
      const requestedSkills = validateRequestedSkills(payload.requestedSkills);
      let sourceThreadId = randomUUID();
      let engineerThreadId = null;
      const stage = directEngineer ? "planned" : "accepted";
      const approvalState = directEngineer ? "not_required" : "pending_approval";

      if (directEngineer) {
        engineerThreadId = sourceThreadId;
        createThread({
          id: engineerThreadId,
          taskId,
          role: "engineer",
          sessionType: "task_delivery",
          agentId: "engineer",
          title: `${payload.title} · Engineer`,
          modelFamily: defaultModel.family,
          modelProviderId: defaultModel.providerId,
          requestedSkills,
          createdAt: timestamp,
        });
      } else {
        createThread({
          id: sourceThreadId,
          taskId,
          role: "source",
          sessionType: "task_review",
          agentId: sourceAgentId,
          title: payload.sourceThread?.title || `${payload.title} review`,
          modelFamily: defaultModel.family,
          modelProviderId: defaultModel.providerId,
          requestedSkills,
          createdAt: timestamp,
        });
      }

      statements.insertTask.run({
        id: taskId,
        title: payload.title,
        summary: payload.summary,
        stage,
        approval_state: approvalState,
        request_type: payload.requestType,
        program_id: inferredProgramId,
        site_domain: payload.siteDomain || null,
        source_agent_id: sourceAgentId,
        requested_by: payload.requestedBy || "Operator",
        requested_skills: JSON.stringify(requestedSkills),
        source_thread_id: sourceThreadId,
        engineer_thread_id: engineerThreadId,
        assigned_agent_id: directEngineer ? "engineer" : null,
        created_at: timestamp,
        updated_at: timestamp,
        approved_at: directEngineer ? timestamp : null,
        rejected_at: null,
        completed_at: null,
      });

      recordTaskEvent(
        taskId,
        WORK_EVENT_TYPES.taskCreated,
        "user",
        payload.requestedBy || "Operator",
        {
          programId: inferredProgramId,
          siteDomain: payload.siteDomain || null,
          sourceAgentId,
          requestType: payload.requestType,
          directEngineer,
          requestedSkills,
        },
        timestamp,
      );

      addMessage({
        threadId: directEngineer ? engineerThreadId : sourceThreadId,
        taskId,
        authorType: "user",
        authorId: payload.requestedBy || "Operator",
        kind: "request",
        body: payload.sourceThread?.message || payload.summary,
        createdAt: timestamp,
        touchTaskState: false,
        usage: {
          inputTokens: estimateTokens(payload.sourceThread?.message || payload.summary),
          outputTokens: null,
          totalTokens: estimateTokens(payload.sourceThread?.message || payload.summary),
          source: "local-estimated",
        },
      });

      if (directEngineer) {
        addMessage({
          threadId: engineerThreadId,
          taskId,
          authorType: "agent",
          authorId: "engineer",
          kind: "plan",
          body:
            payload.engineerMessage ||
            defaultEngineerMessage("planned", payload.title),
          createdAt: timestamp,
          touchTaskState: false,
          usage: {
            inputTokens: estimateTokens(payload.summary),
            outputTokens: estimateTokens(
              payload.engineerMessage || defaultEngineerMessage("planned", payload.title),
            ),
            totalTokens:
              estimateTokens(payload.summary) +
              estimateTokens(
                payload.engineerMessage || defaultEngineerMessage("planned", payload.title),
              ),
            source: "provider-measured",
          },
        });
        recordTaskEvent(
          taskId,
          WORK_EVENT_TYPES.taskTransitioned,
          "agent",
          "engineer",
          {
            fromStage: null,
            toStage: "planned",
          },
          timestamp,
        );
      }

      publish(WORK_EVENT_TYPES.taskCreated, {
        taskId,
        stage,
      });

      return {
        accepted: true,
        task: getTask(taskId),
      };
    },
    approveTask(taskId, options = {}) {
      const existing = toTask(requireTask(taskId));

      if (
        existing.stage !== "accepted" ||
        existing.approvalState !== "pending_approval"
      ) {
        throw createHttpError(409, "Only pending Accepted tasks can be approved.");
      }

      const timestamp = nowIso();
      const engineerThreadId = randomUUID();
      const model = requireModel(modelCatalog, options.modelFamily);

      createThread({
        id: engineerThreadId,
        taskId,
        role: "engineer",
        sessionType: "task_delivery",
        agentId: "engineer",
        title: `${existing.title} · Engineer`,
        modelFamily: model.family,
        modelProviderId: model.providerId,
        requestedSkills: existing.requestedSkills,
        createdAt: timestamp,
      });

      addMessage({
        threadId: engineerThreadId,
        taskId,
        authorType: "system",
        authorId: "control-plane",
        kind: "queue",
        body: "Task approved. Planning queued for engineer.",
        createdAt: timestamp,
        touchTaskState: false,
        usage: {
          inputTokens: estimateTokens(existing.summary),
          outputTokens: estimateTokens("Task approved. Planning queued for engineer."),
          totalTokens:
            estimateTokens(existing.summary) +
            estimateTokens("Task approved. Planning queued for engineer."),
          source: "local-estimated",
        },
      });

      statements.updateApprovedTask.run({
        id: taskId,
        approval_state: "approved_waiting_for_engineer",
        engineer_thread_id: engineerThreadId,
        assigned_agent_id: "engineer",
        approved_at: timestamp,
        updated_at: timestamp,
      });

      recordTaskEvent(
        taskId,
        WORK_EVENT_TYPES.taskApproved,
        "operator",
        options.actorId || "operator",
        {},
        timestamp,
      );
      recordTaskEvent(
        taskId,
        WORK_EVENT_TYPES.taskQueued,
        "agent",
        "engineer",
        {
          engineerThreadId,
        },
        timestamp,
      );

      publish(WORK_EVENT_TYPES.taskApproved, {
        taskId,
        engineerThreadId,
      });
      publish(WORK_EVENT_TYPES.taskQueued, {
        taskId,
        engineerThreadId,
      });

      return getTask(taskId);
    },
    updateTaskRequestedSkills,
    updateSessionRequestedSkills,
    rejectTask(taskId, options = {}) {
      const task = toTask(requireTask(taskId));

      if (task.stage !== "accepted") {
        throw createHttpError(409, "Only Accepted tasks can be rejected.");
      }

      const timestamp = nowIso();
      statements.updateRejectedTask.run({
        id: taskId,
        stage: "rejected",
        approval_state: "rejected",
        rejected_at: timestamp,
        updated_at: timestamp,
      });

      recordTaskEvent(
        taskId,
        WORK_EVENT_TYPES.taskRejected,
        "operator",
        options.actorId || "operator",
        {
          reason: options.reason || "Rejected by operator.",
        },
        timestamp,
      );

      publish(WORK_EVENT_TYPES.taskRejected, {
        taskId,
      });

      return getTask(taskId);
    },
    engineerTransitionTask,
    getTask,
    getThread(threadId) {
      return buildSessionPayload(threadId);
    },
    getSession(sessionId) {
      return buildSessionPayload(sessionId);
    },
    listAgentSessions(agentId, options = {}) {
      const sessionType = options.sessionType || null;
      const status = options.status || null;
      const limit =
        Number.isFinite(options.limit) && options.limit > 0 ? options.limit : Infinity;

      return statements.selectThreadsForAgent
        .all(agentId)
        .map(sessionPreview)
        .filter(
          (session) =>
            (!sessionType || session.sessionType === sessionType) &&
            (!status || session.status === status),
        )
        .slice(0, limit);
    },
    listChatAgents() {
      return agentEntries().map(chatAgentSummary);
    },
    listModelCatalog(agentId = null) {
      return listModelCatalog(modelCatalog, agentId);
    },
    getAgentWorkspace(agentId, options = {}) {
      const entry = findAgentEntry(agentId);
      if (!entry) {
        throw createHttpError(404, `Unknown agent: ${agentId}`);
      }

      const sessions = statements.selectThreadsForAgent.all(agentId).map(sessionPreview);
      const activeSession = selectWorkspaceSession(agentId, options);
      const selectedTask = options.taskId ? getTask(options.taskId) : null;

      return {
        generatedAt: nowIso(),
        agent: chatAgentSummary(entry),
        sessions,
        activeSessionId: activeSession?.id || null,
        activeSession: activeSession ? buildSessionPayload(activeSession.id) : null,
        selectedTask,
        availableSkills: skillLibrary().map(skillListItem),
        modelCatalog: listModelCatalog(modelCatalog, agentId),
        context: activeSession ? sessionContext(activeSession.id) : null,
      };
    },
    createSession,
    forkSessionModel,
    sendSessionMessage,
    getSessionContext(sessionId, options = {}) {
      return sessionContext(sessionId, options);
    },
    compactSession,
    getChatContext({ taskId } = {}) {
      const taskItems = listActiveTasks().map(buildTaskListItem);
      const selectedTaskId = taskId || taskItems[0]?.id || null;
      const task = selectedTaskId ? getTask(selectedTaskId) : null;

      return {
        generatedAt: nowIso(),
        selectedTaskId,
        tasks: taskItems,
        task,
        availableSkills: skillLibrary().map(skillListItem),
        activeThreadId: task?.activeSessionId || null,
        activeThreadMode: task?.activeThreadMode || null,
        workspaceHref: task?.chatHref || "/chat",
        stages: this.stages,
      };
    },
  };
}

export default createWorkService;
