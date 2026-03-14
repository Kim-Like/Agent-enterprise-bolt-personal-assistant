import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const PA_SCHEMA = `
CREATE TABLE IF NOT EXISTS pa_configuration (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pa_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_tasks_status_updated_at
  ON pa_tasks (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS pa_calendar_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_calendar_events_start_at
  ON pa_calendar_events (start_at ASC);

CREATE TABLE IF NOT EXISTS pa_email_accounts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  address TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'cpanel-imap',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pa_email_cache (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  message_uid TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  from_address TEXT NOT NULL DEFAULT '',
  to_addresses TEXT NOT NULL DEFAULT '[]',
  date TEXT NOT NULL,
  body_preview TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  flags TEXT NOT NULL DEFAULT '[]',
  folder TEXT NOT NULL DEFAULT 'INBOX',
  synced_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_email_cache_account_date
  ON pa_email_cache (account_id, date DESC);

CREATE TABLE IF NOT EXISTS pa_email_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'operator',
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_email_audit_account_created_at
  ON pa_email_audit (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pa_social_drafts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  media_urls TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_social_drafts_status_scheduled_for
  ON pa_social_drafts (status, scheduled_for ASC);

CREATE TABLE IF NOT EXISTS pa_fitness_logs (
  id TEXT PRIMARY KEY,
  activity_type TEXT NOT NULL,
  duration_minutes INTEGER,
  distance_km REAL,
  calories INTEGER,
  notes TEXT NOT NULL DEFAULT '',
  logged_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_fitness_logs_logged_at
  ON pa_fitness_logs (logged_at DESC);

CREATE TABLE IF NOT EXISTS pa_fitness_goals (
  id TEXT PRIMARY KEY,
  goal_type TEXT NOT NULL,
  target_value REAL NOT NULL,
  unit TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'weekly',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS control_plane_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registry_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_registry_snapshots_kind_created_at
  ON registry_snapshots (kind, created_at DESC);

CREATE TABLE IF NOT EXISTS runtime_bookmarks (
  scope TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runtime_state (
  agent_id TEXT PRIMARY KEY,
  enablement_state TEXT NOT NULL,
  health_status TEXT NOT NULL,
  adapter TEXT NOT NULL,
  last_health_check_at TEXT,
  last_run_at TEXT,
  last_error TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_runtime_state_health
  ON agent_runtime_state (health_status, enablement_state);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  stage TEXT NOT NULL,
  approval_state TEXT NOT NULL,
  request_type TEXT NOT NULL,
  program_id TEXT,
  site_domain TEXT,
  source_agent_id TEXT,
  requested_by TEXT,
  requested_skills TEXT NOT NULL DEFAULT '[]',
  source_thread_id TEXT NOT NULL,
  engineer_thread_id TEXT,
  assigned_agent_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT,
  rejected_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_stage_updated_at
  ON tasks (stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS task_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_events_task_created_at
  ON task_events (task_id, created_at ASC);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  role TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'general',
  agent_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  model_family TEXT NOT NULL DEFAULT 'sonnet',
  model_provider_id TEXT,
  continued_from_thread_id TEXT,
  latest_context_snapshot_id TEXT,
  requested_skills TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_task_updated_at
  ON chat_threads (task_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_threads_agent_updated_at
  ON chat_threads (agent_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  task_id TEXT,
  author_type TEXT NOT NULL,
  author_id TEXT,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  usage_input_tokens INTEGER,
  usage_output_tokens INTEGER,
  usage_total_tokens INTEGER,
  usage_source TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  compacted_in_snapshot_id TEXT,
  is_compacted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created_at
  ON chat_messages (thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS chat_context_snapshots (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  task_id TEXT,
  summary_goal TEXT NOT NULL,
  summary_decisions TEXT NOT NULL,
  summary_questions TEXT NOT NULL,
  summary_entities TEXT NOT NULL,
  summary_constraints TEXT NOT NULL,
  summary_next_actions TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  summary_token_estimate INTEGER NOT NULL,
  covered_message_count INTEGER NOT NULL,
  covered_through_message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_context_snapshots_thread_created_at
  ON chat_context_snapshots (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_learning_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  task_id TEXT,
  source TEXT NOT NULL,
  note TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_learning_notes_agent_created_at
  ON agent_learning_notes (agent_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_agent_learning_notes_thread_created_at
  ON agent_learning_notes (thread_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS client_agents (
  site_key TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  orchestrator_id TEXT NOT NULL,
  packet_root TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_last_rotated_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_agents_status_updated_at
  ON client_agents (status, updated_at DESC);

CREATE TABLE IF NOT EXISTS client_agent_profiles (
  site_key TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  questionnaire_json TEXT NOT NULL DEFAULT '{}',
  soul_md TEXT NOT NULL DEFAULT '',
  user_md TEXT NOT NULL DEFAULT '',
  preview_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

function nowIso() {
  return new Date().toISOString();
}

function tableExists(connection, tableName) {
  return Boolean(
    connection
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name = ?
        `,
      )
      .get(tableName),
  );
}

function tableInfo(connection, tableName) {
  if (!tableExists(connection, tableName)) {
    return [];
  }

  return connection.prepare(`PRAGMA table_info(${tableName})`).all();
}

function hasColumn(columns, name) {
  return columns.some((column) => column.name === name);
}

function rebuildChatThreads(connection) {
  connection.exec(`
    DROP INDEX IF EXISTS idx_chat_threads_task_updated_at;
    DROP INDEX IF EXISTS idx_chat_threads_agent_updated_at;
    ALTER TABLE chat_threads RENAME TO chat_threads_legacy;
    CREATE TABLE chat_threads (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      role TEXT NOT NULL,
      session_type TEXT NOT NULL DEFAULT 'general',
      agent_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      model_family TEXT NOT NULL DEFAULT 'sonnet',
      model_provider_id TEXT,
      continued_from_thread_id TEXT,
      latest_context_snapshot_id TEXT,
      requested_skills TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
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
    )
    SELECT id,
           task_id,
           role,
           CASE
             WHEN role = 'engineer' THEN 'task_delivery'
             WHEN role = 'source' THEN 'task_review'
             ELSE 'general'
           END,
           agent_id,
           title,
           status,
           'sonnet',
           NULL,
           NULL,
           NULL,
           '[]',
           created_at,
           updated_at
    FROM chat_threads_legacy;
    DROP TABLE chat_threads_legacy;
    CREATE INDEX idx_chat_threads_task_updated_at
      ON chat_threads (task_id, updated_at DESC);
    CREATE INDEX idx_chat_threads_agent_updated_at
      ON chat_threads (agent_id, updated_at DESC);
  `);
}

function rebuildChatMessages(connection) {
  connection.exec(`
    DROP INDEX IF EXISTS idx_chat_messages_thread_created_at;
    ALTER TABLE chat_messages RENAME TO chat_messages_legacy;
    CREATE TABLE chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      task_id TEXT,
      author_type TEXT NOT NULL,
      author_id TEXT,
      kind TEXT NOT NULL,
      body TEXT NOT NULL,
      usage_input_tokens INTEGER,
      usage_output_tokens INTEGER,
      usage_total_tokens INTEGER,
      usage_source TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      compacted_in_snapshot_id TEXT,
      is_compacted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
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
    )
    SELECT id,
           thread_id,
           task_id,
           author_type,
           author_id,
           kind,
           body,
           NULL,
           NULL,
           NULL,
           NULL,
           '{}',
           NULL,
           0,
           created_at
    FROM chat_messages_legacy;
    DROP TABLE chat_messages_legacy;
    CREATE INDEX idx_chat_messages_thread_created_at
      ON chat_messages (thread_id, created_at ASC);
  `);
}

function ensureChatSessionSchema(connection) {
  const migrate = connection.transaction(() => {
    const threadColumns = tableInfo(connection, "chat_threads");
    if (threadColumns.length > 0) {
      const legacyThreadSchema =
        threadColumns.find((column) => column.name === "task_id")?.notnull === 1 ||
        !hasColumn(threadColumns, "session_type") ||
        !hasColumn(threadColumns, "model_family") ||
        !hasColumn(threadColumns, "model_provider_id") ||
        !hasColumn(threadColumns, "continued_from_thread_id") ||
        !hasColumn(threadColumns, "latest_context_snapshot_id");

      if (legacyThreadSchema) {
        rebuildChatThreads(connection);
      }
    }

    const messageColumns = tableInfo(connection, "chat_messages");
    if (messageColumns.length > 0) {
      const legacyMessageSchema =
        messageColumns.find((column) => column.name === "task_id")?.notnull === 1 ||
        !hasColumn(messageColumns, "usage_input_tokens") ||
        !hasColumn(messageColumns, "usage_output_tokens") ||
        !hasColumn(messageColumns, "usage_total_tokens") ||
        !hasColumn(messageColumns, "usage_source") ||
        !hasColumn(messageColumns, "metadata") ||
        !hasColumn(messageColumns, "compacted_in_snapshot_id") ||
        !hasColumn(messageColumns, "is_compacted");

      if (legacyMessageSchema) {
        rebuildChatMessages(connection);
      }
    }

    connection.exec(`
      CREATE TABLE IF NOT EXISTS chat_context_snapshots (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        task_id TEXT,
        summary_goal TEXT NOT NULL,
        summary_decisions TEXT NOT NULL,
        summary_questions TEXT NOT NULL,
        summary_entities TEXT NOT NULL,
        summary_constraints TEXT NOT NULL,
        summary_next_actions TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        summary_token_estimate INTEGER NOT NULL,
        covered_message_count INTEGER NOT NULL,
        covered_through_message_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_context_snapshots_thread_created_at
        ON chat_context_snapshots (thread_id, created_at DESC);
    `);
  });

  migrate();
}

function ensureRequestedSkillSchema(connection) {
  const migrate = connection.transaction(() => {
    const taskColumns = tableInfo(connection, "tasks");
    if (taskColumns.length > 0 && !hasColumn(taskColumns, "requested_skills")) {
      connection.exec(`
        ALTER TABLE tasks
        ADD COLUMN requested_skills TEXT NOT NULL DEFAULT '[]'
      `);
    }

    const threadColumns = tableInfo(connection, "chat_threads");
    if (
      threadColumns.length > 0 &&
      !hasColumn(threadColumns, "requested_skills")
    ) {
      connection.exec(`
        ALTER TABLE chat_threads
        ADD COLUMN requested_skills TEXT NOT NULL DEFAULT '[]'
      `);
    }
  });

  migrate();
}

function ensureTaskMetadataSchema(connection) {
  const migrate = connection.transaction(() => {
    const taskColumns = tableInfo(connection, "tasks");
    if (taskColumns.length === 0) {
      return;
    }

    if (!hasColumn(taskColumns, "program_id")) {
      connection.exec(`
        ALTER TABLE tasks
        ADD COLUMN program_id TEXT
      `);
    }

    if (!hasColumn(taskColumns, "site_domain")) {
      connection.exec(`
        ALTER TABLE tasks
        ADD COLUMN site_domain TEXT
      `);
    }
  });

  migrate();
}

export function initControlPlaneDb(env) {
  fs.mkdirSync(path.dirname(env.sqlitePath), { recursive: true });

  const connection = new Database(env.sqlitePath);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.exec(SCHEMA);
  connection.exec(PA_SCHEMA);
  ensureChatSessionSchema(connection);
  ensureRequestedSkillSchema(connection);
  ensureTaskMetadataSchema(connection);

  const upsertMetaStatement = connection.prepare(`
    INSERT INTO control_plane_meta (key, value, updated_at)
    VALUES (@key, @value, @updated_at)
    ON CONFLICT(key) DO UPDATE
      SET value = excluded.value,
          updated_at = excluded.updated_at
  `);

  const snapshotRegistryStatement = connection.prepare(`
    INSERT INTO registry_snapshots (kind, payload, created_at)
    VALUES (@kind, @payload, @created_at)
  `);

  const bookmarkStatement = connection.prepare(`
    INSERT INTO runtime_bookmarks (scope, state, details, updated_at)
    VALUES (@scope, @state, @details, @updated_at)
    ON CONFLICT(scope) DO UPDATE
      SET state = excluded.state,
          details = excluded.details,
          updated_at = excluded.updated_at
  `);

  const upsertAgentStateStatement = connection.prepare(`
    INSERT INTO agent_runtime_state (
      agent_id,
      enablement_state,
      health_status,
      adapter,
      last_health_check_at,
      last_run_at,
      last_error,
      details,
      updated_at
    ) VALUES (
      @agent_id,
      @enablement_state,
      @health_status,
      @adapter,
      @last_health_check_at,
      @last_run_at,
      @last_error,
      @details,
      @updated_at
    )
    ON CONFLICT(agent_id) DO UPDATE
      SET enablement_state = excluded.enablement_state,
          health_status = excluded.health_status,
          adapter = excluded.adapter,
          last_health_check_at = excluded.last_health_check_at,
          last_run_at = excluded.last_run_at,
          last_error = excluded.last_error,
          details = excluded.details,
          updated_at = excluded.updated_at
  `);

  const insertAgentLearningStatement = connection.prepare(`
    INSERT INTO agent_learning_notes (
      agent_id,
      thread_id,
      task_id,
      source,
      note,
      metadata,
      created_at
    ) VALUES (
      @agent_id,
      @thread_id,
      @task_id,
      @source,
      @note,
      @metadata,
      @created_at
    )
  `);

  const upsertClientAgentStatement = connection.prepare(`
    INSERT INTO client_agents (
      site_key,
      domain,
      agent_id,
      status,
      orchestrator_id,
      packet_root,
      token_hash,
      token_last_rotated_at,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      @site_key,
      @domain,
      @agent_id,
      @status,
      @orchestrator_id,
      @packet_root,
      @token_hash,
      @token_last_rotated_at,
      @metadata,
      @created_at,
      @updated_at
    )
    ON CONFLICT(site_key) DO UPDATE
      SET domain = excluded.domain,
          agent_id = excluded.agent_id,
          status = excluded.status,
          orchestrator_id = excluded.orchestrator_id,
          packet_root = excluded.packet_root,
          token_hash = excluded.token_hash,
          token_last_rotated_at = excluded.token_last_rotated_at,
          metadata = excluded.metadata,
          updated_at = excluded.updated_at
  `);

  const upsertClientAgentProfileStatement = connection.prepare(`
    INSERT INTO client_agent_profiles (
      site_key,
      agent_id,
      questionnaire_json,
      soul_md,
      user_md,
      preview_json,
      created_at,
      updated_at
    ) VALUES (
      @site_key,
      @agent_id,
      @questionnaire_json,
      @soul_md,
      @user_md,
      @preview_json,
      @created_at,
      @updated_at
    )
    ON CONFLICT(site_key) DO UPDATE
      SET agent_id = excluded.agent_id,
          questionnaire_json = excluded.questionnaire_json,
          soul_md = excluded.soul_md,
          user_md = excluded.user_md,
          preview_json = excluded.preview_json,
          updated_at = excluded.updated_at
  `);

  function toClientAgent(row) {
    if (!row) {
      return null;
    }

    return {
      siteKey: row.site_key,
      domain: row.domain,
      agentId: row.agent_id,
      status: row.status,
      orchestratorId: row.orchestrator_id,
      packetRoot: row.packet_root,
      tokenHash: row.token_hash,
      tokenLastRotatedAt: row.token_last_rotated_at,
      metadata: JSON.parse(row.metadata),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  function toClientAgentProfile(row) {
    if (!row) {
      return null;
    }

    return {
      siteKey: row.site_key,
      agentId: row.agent_id,
      questionnaire: JSON.parse(row.questionnaire_json),
      soulMd: row.soul_md,
      userMd: row.user_md,
      preview: JSON.parse(row.preview_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const db = {
    connection,
    sqlitePath: env.sqlitePath,
    setMeta(key, value) {
      upsertMetaStatement.run({
        key,
        value: JSON.stringify(value),
        updated_at: nowIso(),
      });
    },
    getMeta(key) {
      const row = connection
        .prepare("SELECT value FROM control_plane_meta WHERE key = ?")
        .get(key);

      return row ? JSON.parse(row.value) : null;
    },
    listMeta() {
      return connection
        .prepare(
          "SELECT key, value, updated_at FROM control_plane_meta ORDER BY key ASC",
        )
        .all()
        .map((row) => ({
          key: row.key,
          value: JSON.parse(row.value),
          updatedAt: row.updated_at,
        }));
    },
    snapshotRegistry(kind, payload) {
      snapshotRegistryStatement.run({
        kind,
        payload: JSON.stringify(payload),
        created_at: nowIso(),
      });
    },
    latestSnapshot(kind) {
      const row = connection
        .prepare(
          `
            SELECT payload, created_at
            FROM registry_snapshots
            WHERE kind = ?
            ORDER BY created_at DESC
            LIMIT 1
          `,
        )
        .get(kind);

      if (!row) {
        return null;
      }

      return {
        createdAt: row.created_at,
        payload: JSON.parse(row.payload),
      };
    },
    setBookmark(scope, state, details = {}) {
      bookmarkStatement.run({
        scope,
        state,
        details: JSON.stringify(details),
        updated_at: nowIso(),
      });
    },
    listBookmarks() {
      return connection
        .prepare(
          "SELECT scope, state, details, updated_at FROM runtime_bookmarks ORDER BY scope ASC",
        )
        .all()
        .map((row) => ({
          scope: row.scope,
          state: row.state,
          details: JSON.parse(row.details),
          updatedAt: row.updated_at,
        }));
    },
    upsertAgentState(agentId, state) {
      upsertAgentStateStatement.run({
        agent_id: agentId,
        enablement_state: state.enablementState,
        health_status: state.healthStatus,
        adapter: state.adapter,
        last_health_check_at: state.lastHealthCheckAt || null,
        last_run_at: state.lastRunAt || null,
        last_error: state.lastError || null,
        details: JSON.stringify(state.details || {}),
        updated_at: nowIso(),
      });
    },
    getAgentState(agentId) {
      const row = connection
        .prepare(
          `
            SELECT agent_id,
                   enablement_state,
                   health_status,
                   adapter,
                   last_health_check_at,
                   last_run_at,
                   last_error,
                   details,
                   updated_at
            FROM agent_runtime_state
            WHERE agent_id = ?
          `,
        )
        .get(agentId);

      if (!row) {
        return null;
      }

      return {
        agentId: row.agent_id,
        enablementState: row.enablement_state,
        healthStatus: row.health_status,
        adapter: row.adapter,
        lastHealthCheckAt: row.last_health_check_at,
        lastRunAt: row.last_run_at,
        lastError: row.last_error,
        details: JSON.parse(row.details),
        updatedAt: row.updated_at,
      };
    },
    listAgentStates() {
      return connection
        .prepare(
          `
            SELECT agent_id,
                   enablement_state,
                   health_status,
                   adapter,
                   last_health_check_at,
                   last_run_at,
                   last_error,
                   details,
                   updated_at
            FROM agent_runtime_state
            ORDER BY agent_id ASC
          `,
        )
        .all()
        .map((row) => ({
          agentId: row.agent_id,
          enablementState: row.enablement_state,
          healthStatus: row.health_status,
          adapter: row.adapter,
          lastHealthCheckAt: row.last_health_check_at,
          lastRunAt: row.last_run_at,
          lastError: row.last_error,
          details: JSON.parse(row.details),
          updatedAt: row.updated_at,
        }));
    },
    recordAgentRun(agentId, result = {}) {
      const current = db.getAgentState(agentId) || {
        enablementState: "disabled",
        healthStatus: "disabled",
        adapter: result.adapter || "unknown",
        lastHealthCheckAt: null,
        lastRunAt: null,
        lastError: null,
        details: {},
      };

      db.upsertAgentState(agentId, {
        enablementState: current.enablementState,
        healthStatus: current.healthStatus,
        adapter: current.adapter,
        lastHealthCheckAt: current.lastHealthCheckAt,
        lastRunAt: nowIso(),
        lastError: result.error || null,
        details: {
          ...current.details,
          lastRun: result,
        },
      });
    },
    appendAgentLearning(agentId, learning = {}) {
      insertAgentLearningStatement.run({
        agent_id: agentId,
        thread_id: learning.threadId,
        task_id: learning.taskId || null,
        source: learning.source || "conversation-turn",
        note: learning.note,
        metadata: JSON.stringify(learning.metadata || {}),
        created_at: learning.createdAt || nowIso(),
      });
    },
    listAgentLearning(agentId, { limit = 6 } = {}) {
      return connection
        .prepare(
          `
            SELECT id,
                   agent_id,
                   thread_id,
                   task_id,
                   source,
                   note,
                   metadata,
                   created_at
            FROM agent_learning_notes
            WHERE agent_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT ?
          `,
        )
        .all(agentId, limit)
        .map((row) => ({
          id: row.id,
          agentId: row.agent_id,
          threadId: row.thread_id,
          taskId: row.task_id,
          source: row.source,
          note: row.note,
          metadata: JSON.parse(row.metadata),
          createdAt: row.created_at,
        }));
    },
    upsertClientAgent(record) {
      const existing = db.getClientAgentBySiteKey(record.siteKey);
      const createdAt = record.createdAt || existing?.createdAt || nowIso();
      const updatedAt = record.updatedAt || nowIso();

      upsertClientAgentStatement.run({
        site_key: record.siteKey,
        domain: record.domain,
        agent_id: record.agentId,
        status: record.status,
        orchestrator_id: record.orchestratorId,
        packet_root: record.packetRoot,
        token_hash: record.tokenHash,
        token_last_rotated_at: record.tokenLastRotatedAt || updatedAt,
        metadata: JSON.stringify(record.metadata || {}),
        created_at: createdAt,
        updated_at: updatedAt,
      });

      return db.getClientAgentBySiteKey(record.siteKey);
    },
    getClientAgentBySiteKey(siteKey) {
      const row = connection
        .prepare(
          `
            SELECT site_key,
                   domain,
                   agent_id,
                   status,
                   orchestrator_id,
                   packet_root,
                   token_hash,
                   token_last_rotated_at,
                   metadata,
                   created_at,
                   updated_at
            FROM client_agents
            WHERE site_key = ?
          `,
        )
        .get(siteKey);

      return toClientAgent(row);
    },
    getClientAgentByDomain(domain) {
      const row = connection
        .prepare(
          `
            SELECT site_key,
                   domain,
                   agent_id,
                   status,
                   orchestrator_id,
                   packet_root,
                   token_hash,
                   token_last_rotated_at,
                   metadata,
                   created_at,
                   updated_at
            FROM client_agents
            WHERE domain = ?
          `,
        )
        .get(domain);

      return toClientAgent(row);
    },
    getClientAgentByAgentId(agentId) {
      const row = connection
        .prepare(
          `
            SELECT site_key,
                   domain,
                   agent_id,
                   status,
                   orchestrator_id,
                   packet_root,
                   token_hash,
                   token_last_rotated_at,
                   metadata,
                   created_at,
                   updated_at
            FROM client_agents
            WHERE agent_id = ?
          `,
        )
        .get(agentId);

      return toClientAgent(row);
    },
    listClientAgents() {
      return connection
        .prepare(
          `
            SELECT site_key,
                   domain,
                   agent_id,
                   status,
                   orchestrator_id,
                   packet_root,
                   token_hash,
                   token_last_rotated_at,
                   metadata,
                   created_at,
                   updated_at
            FROM client_agents
            ORDER BY domain ASC
          `,
        )
        .all()
        .map(toClientAgent);
    },
    upsertClientAgentProfile(record) {
      const existing = db.getClientAgentProfile(record.siteKey);
      const createdAt = record.createdAt || existing?.createdAt || nowIso();
      const updatedAt = record.updatedAt || nowIso();

      upsertClientAgentProfileStatement.run({
        site_key: record.siteKey,
        agent_id: record.agentId,
        questionnaire_json: JSON.stringify(record.questionnaire || {}),
        soul_md: record.soulMd || "",
        user_md: record.userMd || "",
        preview_json: JSON.stringify(record.preview || {}),
        created_at: createdAt,
        updated_at: updatedAt,
      });

      return db.getClientAgentProfile(record.siteKey);
    },
    getClientAgentProfile(siteKey) {
      const row = connection
        .prepare(
          `
            SELECT site_key,
                   agent_id,
                   questionnaire_json,
                   soul_md,
                   user_md,
                   preview_json,
                   created_at,
                   updated_at
            FROM client_agent_profiles
            WHERE site_key = ?
          `,
        )
        .get(siteKey);

      return toClientAgentProfile(row);
    },
    pa: {
      listTasks({ status } = {}) {
        const where = status ? `WHERE status = ?` : ``;
        const args = status ? [status] : [];
        return connection
          .prepare(`SELECT * FROM pa_tasks ${where} ORDER BY updated_at DESC`)
          .all(...args)
          .map((r) => ({ ...r, tags: JSON.parse(r.tags) }));
      },
      getTask(id) {
        const r = connection.prepare(`SELECT * FROM pa_tasks WHERE id = ?`).get(id);
        return r ? { ...r, tags: JSON.parse(r.tags) } : null;
      },
      upsertTask(task) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_tasks WHERE id = ?`).get(task.id);
        const p = { id: task.id, title: task.title, description: task.description || '', status: task.status || 'todo', priority: task.priority || 'medium', due_date: task.dueDate || task.due_date || null, tags: JSON.stringify(task.tags || []), created_at: task.createdAt || task.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_tasks SET title=@title,description=@description,status=@status,priority=@priority,due_date=@due_date,tags=@tags,updated_at=@updated_at WHERE id=@id`).run(p);
        } else {
          connection.prepare(`INSERT INTO pa_tasks (id,title,description,status,priority,due_date,tags,created_at,updated_at) VALUES (@id,@title,@description,@status,@priority,@due_date,@tags,@created_at,@updated_at)`).run(p);
        }
        return db.pa.getTask(task.id);
      },
      deleteTask(id) {
        connection.prepare(`DELETE FROM pa_tasks WHERE id = ?`).run(id);
      },
      listEvents({ from, to } = {}) {
        let q = `SELECT * FROM pa_calendar_events`;
        const a = [];
        if (from && to) { q += ` WHERE start_at >= ? AND start_at <= ?`; a.push(from, to); }
        else if (from) { q += ` WHERE start_at >= ?`; a.push(from); }
        q += ` ORDER BY start_at ASC`;
        return connection.prepare(q).all(...a).map((r) => ({ ...r, tags: JSON.parse(r.tags), allDay: Boolean(r.all_day) }));
      },
      getEvent(id) {
        const r = connection.prepare(`SELECT * FROM pa_calendar_events WHERE id = ?`).get(id);
        return r ? { ...r, tags: JSON.parse(r.tags), allDay: Boolean(r.all_day) } : null;
      },
      upsertEvent(event) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_calendar_events WHERE id = ?`).get(event.id);
        const p = { id: event.id, title: event.title, description: event.description || '', start_at: event.startAt || event.start_at, end_at: event.endAt || event.end_at, all_day: event.allDay ? 1 : 0, location: event.location || null, tags: JSON.stringify(event.tags || []), created_at: event.createdAt || event.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_calendar_events SET title=@title,description=@description,start_at=@start_at,end_at=@end_at,all_day=@all_day,location=@location,tags=@tags,updated_at=@updated_at WHERE id=@id`).run(p);
        } else {
          connection.prepare(`INSERT INTO pa_calendar_events (id,title,description,start_at,end_at,all_day,location,tags,created_at,updated_at) VALUES (@id,@title,@description,@start_at,@end_at,@all_day,@location,@tags,@created_at,@updated_at)`).run(p);
        }
        return db.pa.getEvent(event.id);
      },
      deleteEvent(id) {
        connection.prepare(`DELETE FROM pa_calendar_events WHERE id = ?`).run(id);
      },
      listEmailAccounts() {
        return connection.prepare(`SELECT * FROM pa_email_accounts ORDER BY label ASC`).all();
      },
      upsertEmailAccount(acct) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_email_accounts WHERE id = ?`).get(acct.id);
        const p = { id: acct.id, label: acct.label, address: acct.address, provider: acct.provider || 'cpanel-imap', status: acct.status || 'pending', notes: acct.notes || '', created_at: acct.createdAt || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_email_accounts SET label=@label,address=@address,provider=@provider,status=@status,notes=@notes,updated_at=@updated_at WHERE id=@id`).run(p);
        } else {
          connection.prepare(`INSERT INTO pa_email_accounts (id,label,address,provider,status,notes,created_at,updated_at) VALUES (@id,@label,@address,@provider,@status,@notes,@created_at,@updated_at)`).run(p);
        }
        return connection.prepare(`SELECT * FROM pa_email_accounts WHERE id = ?`).get(acct.id);
      },
      deleteEmailAccount(id) {
        connection.prepare(`DELETE FROM pa_email_accounts WHERE id = ?`).run(id);
      },
      appendEmailAudit(entry) {
        connection.prepare(`INSERT INTO pa_email_audit (account_id,action,actor,detail,created_at) VALUES (@account_id,@action,@actor,@detail,@created_at)`).run({ account_id: entry.accountId, action: entry.action, actor: entry.actor || 'operator', detail: JSON.stringify(entry.detail || {}), created_at: nowIso() });
      },
      listEmailAudit(accountId, { limit = 20 } = {}) {
        return connection.prepare(`SELECT * FROM pa_email_audit WHERE account_id = ? ORDER BY created_at DESC LIMIT ?`).all(accountId, limit).map((r) => ({ ...r, detail: JSON.parse(r.detail) }));
      },
      listSocialDrafts({ status } = {}) {
        const where = status ? `WHERE status = ?` : ``;
        const args = status ? [status] : [];
        return connection
          .prepare(`SELECT * FROM pa_social_drafts ${where} ORDER BY updated_at DESC`)
          .all(...args)
          .map((r) => ({ ...r, tags: JSON.parse(r.tags), mediaUrls: JSON.parse(r.media_urls) }));
      },
      getSocialDraft(id) {
        const r = connection.prepare(`SELECT * FROM pa_social_drafts WHERE id = ?`).get(id);
        return r ? { ...r, tags: JSON.parse(r.tags), mediaUrls: JSON.parse(r.media_urls) } : null;
      },
      upsertSocialDraft(draft) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_social_drafts WHERE id = ?`).get(draft.id);
        const p = { id: draft.id, platform: draft.platform, body: draft.body, status: draft.status || 'draft', scheduled_for: draft.scheduledFor || draft.scheduled_for || null, tags: JSON.stringify(draft.tags || []), media_urls: JSON.stringify(draft.mediaUrls || []), created_at: draft.createdAt || draft.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_social_drafts SET platform=@platform,body=@body,status=@status,scheduled_for=@scheduled_for,tags=@tags,media_urls=@media_urls,updated_at=@updated_at WHERE id=@id`).run(p);
        } else {
          connection.prepare(`INSERT INTO pa_social_drafts (id,platform,body,status,scheduled_for,tags,media_urls,created_at,updated_at) VALUES (@id,@platform,@body,@status,@scheduled_for,@tags,@media_urls,@created_at,@updated_at)`).run(p);
        }
        return db.pa.getSocialDraft(draft.id);
      },
      deleteSocialDraft(id) {
        connection.prepare(`DELETE FROM pa_social_drafts WHERE id = ?`).run(id);
      },
      listFitnessLogs({ limit = 50, activityType } = {}) {
        const where = activityType ? `WHERE activity_type = ?` : ``;
        const args = activityType ? [activityType, limit] : [limit];
        return connection.prepare(`SELECT * FROM pa_fitness_logs ${where} ORDER BY logged_at DESC LIMIT ?`).all(...args);
      },
      getFitnessLog(id) {
        return connection.prepare(`SELECT * FROM pa_fitness_logs WHERE id = ?`).get(id) || null;
      },
      insertFitnessLog(log) {
        const now = nowIso();
        const p = { id: log.id, activity_type: log.activityType || log.activity_type, duration_minutes: log.durationMinutes || log.duration_minutes || null, distance_km: log.distanceKm || log.distance_km || null, calories: log.calories || null, notes: log.notes || '', logged_at: log.loggedAt || log.logged_at || now, source: log.source || 'manual', created_at: now };
        connection.prepare(`INSERT INTO pa_fitness_logs (id,activity_type,duration_minutes,distance_km,calories,notes,logged_at,source,created_at) VALUES (@id,@activity_type,@duration_minutes,@distance_km,@calories,@notes,@logged_at,@source,@created_at)`).run(p);
        return db.pa.getFitnessLog(log.id);
      },
      deleteFitnessLog(id) {
        connection.prepare(`DELETE FROM pa_fitness_logs WHERE id = ?`).run(id);
      },
      listFitnessGoals() {
        return connection.prepare(`SELECT * FROM pa_fitness_goals ORDER BY created_at DESC`).all();
      },
      upsertFitnessGoal(goal) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_fitness_goals WHERE id = ?`).get(goal.id);
        const p = { id: goal.id, goal_type: goal.goalType || goal.goal_type, target_value: goal.targetValue || goal.target_value, unit: goal.unit, period: goal.period || 'weekly', active: goal.active !== false ? 1 : 0, created_at: goal.createdAt || goal.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_fitness_goals SET goal_type=@goal_type,target_value=@target_value,unit=@unit,period=@period,active=@active,updated_at=@updated_at WHERE id=@id`).run(p);
        } else {
          connection.prepare(`INSERT INTO pa_fitness_goals (id,goal_type,target_value,unit,period,active,created_at,updated_at) VALUES (@id,@goal_type,@target_value,@unit,@period,@active,@created_at,@updated_at)`).run(p);
        }
        return connection.prepare(`SELECT * FROM pa_fitness_goals WHERE id = ?`).get(goal.id);
      },
      overviewStats() {
        const taskCounts = connection.prepare(`SELECT status, COUNT(*) as count FROM pa_tasks GROUP BY status`).all().reduce((acc, r) => { acc[r.status] = r.count; return acc; }, {});
        const upcomingEvents = connection.prepare(`SELECT COUNT(*) as count FROM pa_calendar_events WHERE start_at >= ?`).get(nowIso())?.count || 0;
        const draftCount = connection.prepare(`SELECT COUNT(*) as count FROM pa_social_drafts WHERE status = 'draft'`).get()?.count || 0;
        const recentFitness = connection.prepare(`SELECT COUNT(*) as count FROM pa_fitness_logs WHERE logged_at >= date('now','-7 days')`).get()?.count || 0;
        const emailAccounts = connection.prepare(`SELECT COUNT(*) as count FROM pa_email_accounts`).get()?.count || 0;
        return { taskCounts, upcomingEvents, draftCount, recentFitness, emailAccounts };
      },
    },
    close() {
      connection.close();
    },
  };

  db.setMeta("app_name", env.appName);
  db.setMeta("app_env", env.appEnv);
  db.setMeta("startup_mode", "single-process");
  db.setMeta("public_origin", env.publicOrigin);
  db.setMeta("last_boot_at", nowIso());
  db.setBookmark("server", "booted", { host: env.host, port: env.port });

  return db;
}
