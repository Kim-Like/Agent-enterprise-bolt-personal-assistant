import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const PA_LI_SCHEMA = `
CREATE TABLE IF NOT EXISTS pa_li_scraped_profiles (
  id TEXT PRIMARY KEY,
  linkedin_account_id TEXT,
  profile_url TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'Denmark',
  connection_degree TEXT NOT NULL DEFAULT '2nd',
  followers_count INTEGER,
  connections_count INTEGER,
  bio_summary TEXT NOT NULL DEFAULT '',
  skills TEXT NOT NULL DEFAULT '[]',
  interests TEXT NOT NULL DEFAULT '[]',
  education TEXT NOT NULL DEFAULT '[]',
  experience TEXT NOT NULL DEFAULT '[]',
  avatar_url TEXT,
  scraped_at TEXT NOT NULL,
  enriched_at TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  raw_data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_li_scraped_profiles_city
  ON pa_li_scraped_profiles (city, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pa_li_scraped_profiles_account
  ON pa_li_scraped_profiles (linkedin_account_id, scraped_at DESC);

CREATE TABLE IF NOT EXISTS pa_li_segments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '[]',
  member_count INTEGER NOT NULL DEFAULT 0,
  last_refreshed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pa_li_segment_members (
  id TEXT PRIMARY KEY,
  segment_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  UNIQUE(segment_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_li_segment_members_segment
  ON pa_li_segment_members (segment_id, added_at DESC);

CREATE TABLE IF NOT EXISTS pa_li_automation_tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  criteria TEXT NOT NULL DEFAULT '{}',
  schedule TEXT NOT NULL DEFAULT 'manual',
  enabled INTEGER NOT NULL DEFAULT 1,
  rate_limit_per_min INTEGER NOT NULL DEFAULT 10,
  daily_cap INTEGER NOT NULL DEFAULT 100,
  linkedin_account_id TEXT,
  last_run_at TEXT,
  last_run_status TEXT,
  last_run_error TEXT,
  run_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_li_automation_tasks_type
  ON pa_li_automation_tasks (task_type, enabled);

CREATE TABLE IF NOT EXISTS pa_li_automation_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_found INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  error TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  result TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pa_li_automation_runs_task
  ON pa_li_automation_runs (task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS pa_li_outreach_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  segment_id TEXT,
  linkedin_account_id TEXT,
  message_template TEXT NOT NULL DEFAULT '',
  connection_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  daily_limit INTEGER NOT NULL DEFAULT 20,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_replied INTEGER NOT NULL DEFAULT 0,
  total_accepted INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  paused_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_li_outreach_campaigns_status
  ON pa_li_outreach_campaigns (status, created_at DESC);

CREATE TABLE IF NOT EXISTS pa_li_outreach_queue (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  outreach_type TEXT NOT NULL DEFAULT 'connection',
  scheduled_at TEXT,
  sent_at TEXT,
  replied_at TEXT,
  accepted_at TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_li_outreach_queue_campaign
  ON pa_li_outreach_queue (campaign_id, status, scheduled_at ASC);

CREATE INDEX IF NOT EXISTS idx_pa_li_outreach_queue_profile
  ON pa_li_outreach_queue (profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pa_li_scrape_targets (
  id TEXT PRIMARY KEY,
  linkedin_account_id TEXT,
  profile_url TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 5,
  assigned_task_id TEXT,
  scraped_profile_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_li_scrape_targets_status
  ON pa_li_scrape_targets (status, priority DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS pa_li_reporting_snapshots (
  id TEXT PRIMARY KEY,
  snapshot_date TEXT NOT NULL,
  linkedin_account_id TEXT,
  campaign_id TEXT,
  profiles_scraped INTEGER NOT NULL DEFAULT 0,
  profiles_enriched INTEGER NOT NULL DEFAULT 0,
  outreach_sent INTEGER NOT NULL DEFAULT 0,
  outreach_replied INTEGER NOT NULL DEFAULT 0,
  connections_accepted INTEGER NOT NULL DEFAULT 0,
  automation_runs INTEGER NOT NULL DEFAULT 0,
  segment_count INTEGER NOT NULL DEFAULT 0,
  total_profiles INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_li_reporting_snapshots_date
  ON pa_li_reporting_snapshots (snapshot_date DESC);
`;

const PA_INV_SCHEMA = `
CREATE TABLE IF NOT EXISTS pa_inv_watchlist (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  currency TEXT NOT NULL DEFAULT 'USD',
  exchange TEXT NOT NULL DEFAULT '',
  sector TEXT NOT NULL DEFAULT '',
  isin TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#0F766E',
  chart_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pa_inv_portfolio_holdings (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pa_inv_holdings_symbol
  ON pa_inv_portfolio_holdings (symbol);

CREATE TABLE IF NOT EXISTS pa_inv_purchases (
  id TEXT PRIMARY KEY,
  holding_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  shares REAL NOT NULL,
  price_per_share REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  fee REAL NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_inv_purchases_holding
  ON pa_inv_purchases (holding_id, purchase_date ASC);

CREATE TABLE IF NOT EXISTS pa_inv_price_cache (
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  close REAL NOT NULL,
  volume INTEGER,
  source TEXT NOT NULL DEFAULT 'yahoo',
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_pa_inv_price_cache_symbol_date
  ON pa_inv_price_cache (symbol, date DESC);

CREATE TABLE IF NOT EXISTS pa_inv_news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  rss_url TEXT NOT NULL DEFAULT '',
  keywords TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_fetched_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pa_inv_news_articles (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  symbol TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  published_at TEXT NOT NULL,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  relevance_score REAL NOT NULL DEFAULT 0.5,
  fetched_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pa_inv_news_articles_symbol_date
  ON pa_inv_news_articles (symbol, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_pa_inv_news_articles_published
  ON pa_inv_news_articles (published_at DESC);

CREATE TABLE IF NOT EXISTS pa_inv_advisor_signals (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'neutral',
  strength REAL NOT NULL DEFAULT 0.5,
  rationale TEXT NOT NULL DEFAULT '',
  indicators TEXT NOT NULL DEFAULT '{}',
  generated_at TEXT NOT NULL,
  valid_until TEXT,
  acted_on INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pa_inv_advisor_signals_symbol
  ON pa_inv_advisor_signals (symbol, generated_at DESC);
`;

const PA_NORDNET_SCHEMA = `
CREATE TABLE IF NOT EXISTS pa_nordnet_accounts (
  account_id TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'investment',
  currency TEXT NOT NULL DEFAULT 'DKK',
  total_value REAL,
  own_capital REAL,
  buying_power REAL,
  synced_at TEXT NOT NULL,
  raw_data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS pa_nordnet_positions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  instrument_id TEXT NOT NULL DEFAULT '',
  isin TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  avg_price REAL,
  last_price REAL,
  market_value REAL,
  unrealized_pnl REAL,
  unrealized_pnl_pct REAL,
  currency TEXT NOT NULL DEFAULT 'DKK',
  synced_at TEXT NOT NULL,
  raw_data TEXT NOT NULL DEFAULT '{}',
  UNIQUE(account_id, instrument_id)
);

CREATE INDEX IF NOT EXISTS idx_pa_nordnet_positions_account
  ON pa_nordnet_positions (account_id, synced_at DESC);

CREATE TABLE IF NOT EXISTS pa_nordnet_orders (
  order_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  instrument_id TEXT NOT NULL DEFAULT '',
  isin TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  order_type TEXT NOT NULL DEFAULT 'LIMIT',
  side TEXT NOT NULL DEFAULT 'BUY',
  quantity REAL NOT NULL DEFAULT 0,
  price REAL,
  status TEXT NOT NULL DEFAULT 'active',
  currency TEXT NOT NULL DEFAULT 'DKK',
  created_at_nordnet TEXT,
  synced_at TEXT NOT NULL,
  raw_data TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pa_nordnet_orders_account
  ON pa_nordnet_orders (account_id, synced_at DESC);

CREATE TABLE IF NOT EXISTS pa_nordnet_trades (
  trade_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  instrument_id TEXT NOT NULL DEFAULT '',
  isin TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL DEFAULT 'BUY',
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'DKK',
  traded_at TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  raw_data TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pa_nordnet_trades_account_traded_at
  ON pa_nordnet_trades (account_id, traded_at DESC);
`;

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

CREATE TABLE IF NOT EXISTS pa_linkedin_accounts (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

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

CREATE TABLE IF NOT EXISTS pa_watch_workouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration_secs REAL NOT NULL,
  location TEXT,
  is_indoor INTEGER,
  active_energy REAL,
  total_energy REAL,
  energy_units TEXT NOT NULL DEFAULT 'kcal',
  hr_min REAL,
  hr_avg REAL,
  hr_max REAL,
  distance_km REAL,
  metadata_json TEXT,
  raw_json TEXT,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'health-auto-export'
);

CREATE INDEX IF NOT EXISTS idx_pa_watch_workouts_start ON pa_watch_workouts (start_date DESC);
CREATE INDEX IF NOT EXISTS idx_pa_watch_workouts_name ON pa_watch_workouts (name);

CREATE TABLE IF NOT EXISTS pa_watch_heart_rate (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id TEXT NOT NULL REFERENCES pa_watch_workouts(id) ON DELETE CASCADE,
  sample_date TEXT NOT NULL,
  qty REAL NOT NULL,
  units TEXT NOT NULL DEFAULT 'bpm',
  UNIQUE(workout_id, sample_date)
);

CREATE TABLE IF NOT EXISTS pa_watch_route (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id TEXT NOT NULL REFERENCES pa_watch_workouts(id) ON DELETE CASCADE,
  ts TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude REAL,
  speed REAL,
  course REAL,
  horizontal_accuracy REAL,
  vertical_accuracy REAL,
  UNIQUE(workout_id, ts)
);

CREATE TABLE IF NOT EXISTS pa_watch_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  units TEXT,
  sample_date TEXT NOT NULL,
  qty REAL,
  min_val REAL,
  avg_val REAL,
  max_val REAL,
  source TEXT,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, sample_date, source)
);

CREATE INDEX IF NOT EXISTS idx_pa_watch_metrics_name ON pa_watch_metrics (name, sample_date);
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

function ensureFitnessGamificationSchema(connection) {
  const migrate = connection.transaction(() => {
    const cols = tableInfo(connection, "pa_fitness_logs");
    if (cols.length === 0) return;
    if (!hasColumn(cols, "workout_meta")) {
      connection.exec(`ALTER TABLE pa_fitness_logs ADD COLUMN workout_meta TEXT NOT NULL DEFAULT '{}'`);
    }
    if (!hasColumn(cols, "xp_earned")) {
      connection.exec(`ALTER TABLE pa_fitness_logs ADD COLUMN xp_earned INTEGER NOT NULL DEFAULT 0`);
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
  connection.exec(PA_LI_SCHEMA);
  connection.exec(PA_INV_SCHEMA);
  connection.exec(PA_NORDNET_SCHEMA);
  ensureFitnessGamificationSchema(connection);
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
      listLinkedInAccounts() {
        return connection.prepare(`SELECT * FROM pa_linkedin_accounts ORDER BY created_at DESC`).all();
      },
      getLinkedInAccount(id) {
        return connection.prepare(`SELECT * FROM pa_linkedin_accounts WHERE id = ?`).get(id) || null;
      },
      upsertLinkedInAccount(acct) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_linkedin_accounts WHERE id = ?`).get(acct.id);
        const p = { id: acct.id, label: acct.label, profile_url: acct.profileUrl || acct.profile_url, display_name: acct.displayName || acct.display_name || '', status: acct.status || 'active', notes: acct.notes || '', created_at: acct.createdAt || acct.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_linkedin_accounts SET label=@label,profile_url=@profile_url,display_name=@display_name,status=@status,notes=@notes,updated_at=@updated_at WHERE id=@id`).run(p);
        } else {
          connection.prepare(`INSERT INTO pa_linkedin_accounts (id,label,profile_url,display_name,status,notes,created_at,updated_at) VALUES (@id,@label,@profile_url,@display_name,@status,@notes,@created_at,@updated_at)`).run(p);
        }
        return db.pa.getLinkedInAccount(acct.id);
      },
      deleteLinkedInAccount(id) {
        connection.prepare(`DELETE FROM pa_linkedin_accounts WHERE id = ?`).run(id);
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
        const p = { id: log.id, activity_type: log.activityType || log.activity_type, duration_minutes: log.durationMinutes || log.duration_minutes || null, distance_km: log.distanceKm || log.distance_km || null, calories: log.calories || null, notes: log.notes || '', logged_at: log.loggedAt || log.logged_at || now, source: log.source || 'manual', workout_meta: log.workoutMeta || log.workout_meta || '{}', xp_earned: log.xpEarned || log.xp_earned || 0, created_at: now };
        connection.prepare(`INSERT INTO pa_fitness_logs (id,activity_type,duration_minutes,distance_km,calories,notes,logged_at,source,workout_meta,xp_earned,created_at) VALUES (@id,@activity_type,@duration_minutes,@distance_km,@calories,@notes,@logged_at,@source,@workout_meta,@xp_earned,@created_at)`).run(p);
        return db.pa.getFitnessLog(log.id);
      },
      deleteFitnessLog(id) {
        connection.prepare(`DELETE FROM pa_fitness_logs WHERE id = ?`).run(id);
      },
      listWatchWorkouts({ limit = 50, name } = {}) {
        const where = name ? `WHERE name = ?` : ``;
        const args = name ? [name, limit] : [limit];
        return connection.prepare(`SELECT * FROM pa_watch_workouts ${where} ORDER BY start_date DESC LIMIT ?`).all(...args);
      },
      getWatchWorkout(id) {
        return connection.prepare(`SELECT * FROM pa_watch_workouts WHERE id = ?`).get(id) || null;
      },
      upsertWatchWorkout(w) {
        connection.prepare(`INSERT OR IGNORE INTO pa_watch_workouts (id,name,start_date,end_date,duration_secs,location,is_indoor,active_energy,total_energy,energy_units,hr_min,hr_avg,hr_max,distance_km,metadata_json,raw_json,ingested_at,source) VALUES (@id,@name,@start_date,@end_date,@duration_secs,@location,@is_indoor,@active_energy,@total_energy,@energy_units,@hr_min,@hr_avg,@hr_max,@distance_km,@metadata_json,@raw_json,@ingested_at,@source)`).run(w);
        return connection.prepare(`SELECT * FROM pa_watch_workouts WHERE id = ?`).get(w.id);
      },
      insertWatchHeartRate(rows) {
        const stmt = connection.prepare(`INSERT OR IGNORE INTO pa_watch_heart_rate (workout_id,sample_date,qty,units) VALUES (@workout_id,@sample_date,@qty,@units)`);
        const ins = connection.transaction((rows) => { for (const r of rows) stmt.run(r); });
        ins(rows);
      },
      insertWatchRoute(rows) {
        const stmt = connection.prepare(`INSERT OR IGNORE INTO pa_watch_route (workout_id,ts,latitude,longitude,altitude,speed,course,horizontal_accuracy,vertical_accuracy) VALUES (@workout_id,@ts,@latitude,@longitude,@altitude,@speed,@course,@horizontal_accuracy,@vertical_accuracy)`);
        const ins = connection.transaction((rows) => { for (const r of rows) stmt.run(r); });
        ins(rows);
      },
      upsertWatchMetrics(rows) {
        const stmt = connection.prepare(`INSERT OR IGNORE INTO pa_watch_metrics (name,units,sample_date,qty,min_val,avg_val,max_val,source) VALUES (@name,@units,@sample_date,@qty,@min_val,@avg_val,@max_val,@source)`);
        const ins = connection.transaction((rows) => { for (const r of rows) stmt.run(r); });
        ins(rows);
      },
      getWatchHeartRate(workoutId) {
        return connection.prepare(`SELECT * FROM pa_watch_heart_rate WHERE workout_id = ? ORDER BY sample_date ASC`).all(workoutId);
      },
      getWatchRoute(workoutId) {
        return connection.prepare(`SELECT * FROM pa_watch_route WHERE workout_id = ? ORDER BY ts ASC`).all(workoutId);
      },
      listWatchMetrics({ name, from, to, limit = 200 } = {}) {
        let sql = `SELECT * FROM pa_watch_metrics WHERE 1=1`;
        const args = [];
        if (name) { sql += ` AND name = ?`; args.push(name); }
        if (from) { sql += ` AND sample_date >= ?`; args.push(from); }
        if (to) { sql += ` AND sample_date <= ?`; args.push(to); }
        sql += ` ORDER BY sample_date DESC LIMIT ?`; args.push(limit);
        return connection.prepare(sql).all(...args);
      },
      watchStats() {
        const total = connection.prepare(`SELECT COUNT(*) as c FROM pa_watch_workouts`).get()?.c || 0;
        const lastSync = connection.prepare(`SELECT MAX(ingested_at) as t FROM pa_watch_workouts`).get()?.t || null;
        const totalKm = connection.prepare(`SELECT COALESCE(SUM(distance_km),0) as s FROM pa_watch_workouts`).get()?.s || 0;
        return { total, lastSync, totalKm };
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
    li: {
      listProfiles({ city, skills, interests, segmentId, search, limit = 50, offset = 0 } = {}) {
        let q = `SELECT p.* FROM pa_li_scraped_profiles p`;
        const args = [];
        const conditions = [];
        if (segmentId) {
          q = `SELECT p.* FROM pa_li_scraped_profiles p INNER JOIN pa_li_segment_members sm ON sm.profile_id = p.id AND sm.segment_id = ?`;
          args.push(segmentId);
        }
        if (city) { conditions.push(`p.city = ?`); args.push(city); }
        if (search) { conditions.push(`(p.full_name LIKE ? OR p.headline LIKE ? OR p.company LIKE ?)`); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (conditions.length) q += ` WHERE ` + conditions.join(' AND ');
        q += ` ORDER BY p.scraped_at DESC LIMIT ? OFFSET ?`;
        args.push(limit, offset);
        return connection.prepare(q).all(...args).map(r => ({ ...r, skills: JSON.parse(r.skills), interests: JSON.parse(r.interests), education: JSON.parse(r.education), experience: JSON.parse(r.experience), rawData: JSON.parse(r.raw_data) }));
      },
      countProfiles({ city, segmentId, search } = {}) {
        let q = `SELECT COUNT(*) as count FROM pa_li_scraped_profiles p`;
        const args = [];
        const conditions = [];
        if (segmentId) {
          q = `SELECT COUNT(*) as count FROM pa_li_scraped_profiles p INNER JOIN pa_li_segment_members sm ON sm.profile_id = p.id AND sm.segment_id = ?`;
          args.push(segmentId);
        }
        if (city) { conditions.push(`p.city = ?`); args.push(city); }
        if (search) { conditions.push(`(p.full_name LIKE ? OR p.headline LIKE ? OR p.company LIKE ?)`); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (conditions.length) q += ` WHERE ` + conditions.join(' AND ');
        return connection.prepare(q).get(...args)?.count || 0;
      },
      getProfile(id) {
        const r = connection.prepare(`SELECT * FROM pa_li_scraped_profiles WHERE id = ?`).get(id);
        if (!r) return null;
        return { ...r, skills: JSON.parse(r.skills), interests: JSON.parse(r.interests), education: JSON.parse(r.education), experience: JSON.parse(r.experience), rawData: JSON.parse(r.raw_data) };
      },
      upsertProfile(p) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_li_scraped_profiles WHERE id = ?`).get(p.id);
        const row = { id: p.id, linkedin_account_id: p.linkedinAccountId || p.linkedin_account_id || null, profile_url: p.profileUrl || p.profile_url, full_name: p.fullName || p.full_name || '', headline: p.headline || '', company: p.company || '', city: p.city || '', country: p.country || 'Denmark', connection_degree: p.connectionDegree || p.connection_degree || '2nd', followers_count: p.followersCount || p.followers_count || null, connections_count: p.connectionsCount || p.connections_count || null, bio_summary: p.bioSummary || p.bio_summary || '', skills: JSON.stringify(p.skills || []), interests: JSON.stringify(p.interests || []), education: JSON.stringify(p.education || []), experience: JSON.stringify(p.experience || []), avatar_url: p.avatarUrl || p.avatar_url || null, scraped_at: p.scrapedAt || p.scraped_at || now, enriched_at: p.enrichedAt || p.enriched_at || null, source: p.source || 'manual', raw_data: JSON.stringify(p.rawData || p.raw_data || {}), created_at: p.createdAt || p.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_li_scraped_profiles SET linkedin_account_id=@linkedin_account_id,profile_url=@profile_url,full_name=@full_name,headline=@headline,company=@company,city=@city,country=@country,connection_degree=@connection_degree,followers_count=@followers_count,connections_count=@connections_count,bio_summary=@bio_summary,skills=@skills,interests=@interests,education=@education,experience=@experience,avatar_url=@avatar_url,scraped_at=@scraped_at,enriched_at=@enriched_at,source=@source,raw_data=@raw_data,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_li_scraped_profiles (id,linkedin_account_id,profile_url,full_name,headline,company,city,country,connection_degree,followers_count,connections_count,bio_summary,skills,interests,education,experience,avatar_url,scraped_at,enriched_at,source,raw_data,created_at,updated_at) VALUES (@id,@linkedin_account_id,@profile_url,@full_name,@headline,@company,@city,@country,@connection_degree,@followers_count,@connections_count,@bio_summary,@skills,@interests,@education,@experience,@avatar_url,@scraped_at,@enriched_at,@source,@raw_data,@created_at,@updated_at)`).run(row);
        }
        return db.li.getProfile(p.id);
      },
      deleteProfile(id) {
        connection.prepare(`DELETE FROM pa_li_segment_members WHERE profile_id = ?`).run(id);
        connection.prepare(`DELETE FROM pa_li_scraped_profiles WHERE id = ?`).run(id);
      },
      listSegments() {
        return connection.prepare(`SELECT * FROM pa_li_segments ORDER BY created_at DESC`).all().map(r => ({ ...r, rules: JSON.parse(r.rules) }));
      },
      getSegment(id) {
        const r = connection.prepare(`SELECT * FROM pa_li_segments WHERE id = ?`).get(id);
        return r ? { ...r, rules: JSON.parse(r.rules) } : null;
      },
      upsertSegment(s) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_li_segments WHERE id = ?`).get(s.id);
        const row = { id: s.id, name: s.name, description: s.description || '', rules: JSON.stringify(s.rules || []), member_count: s.memberCount || s.member_count || 0, last_refreshed_at: s.lastRefreshedAt || s.last_refreshed_at || null, created_at: s.createdAt || s.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_li_segments SET name=@name,description=@description,rules=@rules,member_count=@member_count,last_refreshed_at=@last_refreshed_at,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_li_segments (id,name,description,rules,member_count,last_refreshed_at,created_at,updated_at) VALUES (@id,@name,@description,@rules,@member_count,@last_refreshed_at,@created_at,@updated_at)`).run(row);
        }
        return db.li.getSegment(s.id);
      },
      deleteSegment(id) {
        connection.prepare(`DELETE FROM pa_li_segment_members WHERE segment_id = ?`).run(id);
        connection.prepare(`DELETE FROM pa_li_segments WHERE id = ?`).run(id);
      },
      refreshSegmentMembers(segmentId, profileIds) {
        const now = nowIso();
        const del = connection.prepare(`DELETE FROM pa_li_segment_members WHERE segment_id = ?`);
        const ins = connection.prepare(`INSERT OR IGNORE INTO pa_li_segment_members (id, segment_id, profile_id, added_at) VALUES (?, ?, ?, ?)`);
        const tx = connection.transaction(() => {
          del.run(segmentId);
          for (const pid of profileIds) ins.run(nowIso() + Math.random(), segmentId, pid, now);
          connection.prepare(`UPDATE pa_li_segments SET member_count = ?, last_refreshed_at = ?, updated_at = ? WHERE id = ?`).run(profileIds.length, now, now, segmentId);
        });
        tx();
      },
      listSegmentMembers(segmentId) {
        return connection.prepare(`SELECT p.* FROM pa_li_scraped_profiles p INNER JOIN pa_li_segment_members sm ON sm.profile_id = p.id WHERE sm.segment_id = ? ORDER BY sm.added_at DESC`).all(segmentId).map(r => ({ ...r, skills: JSON.parse(r.skills), interests: JSON.parse(r.interests), education: JSON.parse(r.education), experience: JSON.parse(r.experience), rawData: JSON.parse(r.raw_data) }));
      },
      listAutomationTasks() {
        return connection.prepare(`SELECT * FROM pa_li_automation_tasks ORDER BY created_at DESC`).all().map(r => ({ ...r, criteria: JSON.parse(r.criteria), enabled: Boolean(r.enabled) }));
      },
      getAutomationTask(id) {
        const r = connection.prepare(`SELECT * FROM pa_li_automation_tasks WHERE id = ?`).get(id);
        return r ? { ...r, criteria: JSON.parse(r.criteria), enabled: Boolean(r.enabled) } : null;
      },
      upsertAutomationTask(t) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_li_automation_tasks WHERE id = ?`).get(t.id);
        const row = { id: t.id, name: t.name, task_type: t.taskType || t.task_type, description: t.description || '', criteria: JSON.stringify(t.criteria || {}), schedule: t.schedule || 'manual', enabled: t.enabled !== false ? 1 : 0, rate_limit_per_min: t.rateLimitPerMin || t.rate_limit_per_min || 10, daily_cap: t.dailyCap || t.daily_cap || 100, linkedin_account_id: t.linkedinAccountId || t.linkedin_account_id || null, last_run_at: t.lastRunAt || t.last_run_at || null, last_run_status: t.lastRunStatus || t.last_run_status || null, last_run_error: t.lastRunError || t.last_run_error || null, run_count: t.runCount || t.run_count || 0, created_at: t.createdAt || t.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_li_automation_tasks SET name=@name,task_type=@task_type,description=@description,criteria=@criteria,schedule=@schedule,enabled=@enabled,rate_limit_per_min=@rate_limit_per_min,daily_cap=@daily_cap,linkedin_account_id=@linkedin_account_id,last_run_at=@last_run_at,last_run_status=@last_run_status,last_run_error=@last_run_error,run_count=@run_count,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_li_automation_tasks (id,name,task_type,description,criteria,schedule,enabled,rate_limit_per_min,daily_cap,linkedin_account_id,last_run_at,last_run_status,last_run_error,run_count,created_at,updated_at) VALUES (@id,@name,@task_type,@description,@criteria,@schedule,@enabled,@rate_limit_per_min,@daily_cap,@linkedin_account_id,@last_run_at,@last_run_status,@last_run_error,@run_count,@created_at,@updated_at)`).run(row);
        }
        return db.li.getAutomationTask(t.id);
      },
      deleteAutomationTask(id) {
        connection.prepare(`DELETE FROM pa_li_automation_tasks WHERE id = ?`).run(id);
      },
      listAutomationRuns(taskId, { limit = 20 } = {}) {
        const where = taskId ? `WHERE task_id = ?` : ``;
        const args = taskId ? [taskId, limit] : [limit];
        return connection.prepare(`SELECT * FROM pa_li_automation_runs ${where} ORDER BY started_at DESC LIMIT ?`).all(...args).map(r => ({ ...r, result: JSON.parse(r.result) }));
      },
      insertAutomationRun(run) {
        const now = nowIso();
        const row = { id: run.id, task_id: run.taskId || run.task_id, status: run.status || 'running', items_processed: run.itemsProcessed || 0, items_found: run.itemsFound || 0, items_failed: run.itemsFailed || 0, summary: run.summary || '', error: run.error || null, started_at: run.startedAt || now, finished_at: run.finishedAt || null, result: JSON.stringify(run.result || {}) };
        connection.prepare(`INSERT INTO pa_li_automation_runs (id,task_id,status,items_processed,items_found,items_failed,summary,error,started_at,finished_at,result) VALUES (@id,@task_id,@status,@items_processed,@items_found,@items_failed,@summary,@error,@started_at,@finished_at,@result)`).run(row);
        return connection.prepare(`SELECT * FROM pa_li_automation_runs WHERE id = ?`).get(row.id);
      },
      updateAutomationRun(id, updates) {
        const now = nowIso();
        const existing = connection.prepare(`SELECT * FROM pa_li_automation_runs WHERE id = ?`).get(id);
        if (!existing) return null;
        const row = { ...existing, ...updates, finished_at: updates.finishedAt || updates.finished_at || existing.finished_at, result: JSON.stringify(updates.result || JSON.parse(existing.result)) };
        connection.prepare(`UPDATE pa_li_automation_runs SET status=@status,items_processed=@items_processed,items_found=@items_found,items_failed=@items_failed,summary=@summary,error=@error,finished_at=@finished_at,result=@result WHERE id=@id`).run(row);
        return connection.prepare(`SELECT * FROM pa_li_automation_runs WHERE id = ?`).get(id);
      },
      listCampaigns() {
        return connection.prepare(`SELECT * FROM pa_li_outreach_campaigns ORDER BY created_at DESC`).all();
      },
      getCampaign(id) {
        return connection.prepare(`SELECT * FROM pa_li_outreach_campaigns WHERE id = ?`).get(id) || null;
      },
      upsertCampaign(c) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_li_outreach_campaigns WHERE id = ?`).get(c.id);
        const row = { id: c.id, name: c.name, segment_id: c.segmentId || c.segment_id || null, linkedin_account_id: c.linkedinAccountId || c.linkedin_account_id || null, message_template: c.messageTemplate || c.message_template || '', connection_note: c.connectionNote || c.connection_note || '', status: c.status || 'draft', daily_limit: c.dailyLimit || c.daily_limit || 20, total_sent: c.totalSent || c.total_sent || 0, total_replied: c.totalReplied || c.total_replied || 0, total_accepted: c.totalAccepted || c.total_accepted || 0, started_at: c.startedAt || c.started_at || null, paused_at: c.pausedAt || c.paused_at || null, completed_at: c.completedAt || c.completed_at || null, created_at: c.createdAt || c.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_li_outreach_campaigns SET name=@name,segment_id=@segment_id,linkedin_account_id=@linkedin_account_id,message_template=@message_template,connection_note=@connection_note,status=@status,daily_limit=@daily_limit,total_sent=@total_sent,total_replied=@total_replied,total_accepted=@total_accepted,started_at=@started_at,paused_at=@paused_at,completed_at=@completed_at,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_li_outreach_campaigns (id,name,segment_id,linkedin_account_id,message_template,connection_note,status,daily_limit,total_sent,total_replied,total_accepted,started_at,paused_at,completed_at,created_at,updated_at) VALUES (@id,@name,@segment_id,@linkedin_account_id,@message_template,@connection_note,@status,@daily_limit,@total_sent,@total_replied,@total_accepted,@started_at,@paused_at,@completed_at,@created_at,@updated_at)`).run(row);
        }
        return db.li.getCampaign(c.id);
      },
      deleteCampaign(id) {
        connection.prepare(`DELETE FROM pa_li_outreach_queue WHERE campaign_id = ?`).run(id);
        connection.prepare(`DELETE FROM pa_li_outreach_campaigns WHERE id = ?`).run(id);
      },
      listOutreachQueue(campaignId, { status, limit = 50, offset = 0 } = {}) {
        let q = `SELECT q.*, p.full_name, p.headline, p.company, p.city, p.profile_url FROM pa_li_outreach_queue q LEFT JOIN pa_li_scraped_profiles p ON p.id = q.profile_id WHERE q.campaign_id = ?`;
        const args = [campaignId];
        if (status) { q += ` AND q.status = ?`; args.push(status); }
        q += ` ORDER BY q.scheduled_at ASC, q.created_at ASC LIMIT ? OFFSET ?`;
        args.push(limit, offset);
        return connection.prepare(q).all(...args);
      },
      upsertOutreachItem(item) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_li_outreach_queue WHERE id = ?`).get(item.id);
        const row = { id: item.id, campaign_id: item.campaignId || item.campaign_id, profile_id: item.profileId || item.profile_id, status: item.status || 'pending', outreach_type: item.outreachType || item.outreach_type || 'connection', scheduled_at: item.scheduledAt || item.scheduled_at || null, sent_at: item.sentAt || item.sent_at || null, replied_at: item.repliedAt || item.replied_at || null, accepted_at: item.acceptedAt || item.accepted_at || null, notes: item.notes || '', created_at: item.createdAt || item.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_li_outreach_queue SET status=@status,outreach_type=@outreach_type,scheduled_at=@scheduled_at,sent_at=@sent_at,replied_at=@replied_at,accepted_at=@accepted_at,notes=@notes,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_li_outreach_queue (id,campaign_id,profile_id,status,outreach_type,scheduled_at,sent_at,replied_at,accepted_at,notes,created_at,updated_at) VALUES (@id,@campaign_id,@profile_id,@status,@outreach_type,@scheduled_at,@sent_at,@replied_at,@accepted_at,@notes,@created_at,@updated_at)`).run(row);
        }
        return connection.prepare(`SELECT * FROM pa_li_outreach_queue WHERE id = ?`).get(row.id);
      },
      listScrapeTargets({ status, limit = 50 } = {}) {
        const where = status ? `WHERE status = ?` : ``;
        const args = status ? [status, limit] : [limit];
        return connection.prepare(`SELECT * FROM pa_li_scrape_targets ${where} ORDER BY priority DESC, created_at ASC LIMIT ?`).all(...args);
      },
      upsertScrapeTarget(t) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_li_scrape_targets WHERE id = ?`).get(t.id);
        const row = { id: t.id, linkedin_account_id: t.linkedinAccountId || t.linkedin_account_id || null, profile_url: t.profileUrl || t.profile_url, full_name: t.fullName || t.full_name || '', reason: t.reason || '', status: t.status || 'pending', priority: t.priority || 5, assigned_task_id: t.assignedTaskId || t.assigned_task_id || null, scraped_profile_id: t.scrapedProfileId || t.scraped_profile_id || null, created_at: t.createdAt || t.created_at || now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_li_scrape_targets SET linkedin_account_id=@linkedin_account_id,profile_url=@profile_url,full_name=@full_name,reason=@reason,status=@status,priority=@priority,assigned_task_id=@assigned_task_id,scraped_profile_id=@scraped_profile_id,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_li_scrape_targets (id,linkedin_account_id,profile_url,full_name,reason,status,priority,assigned_task_id,scraped_profile_id,created_at,updated_at) VALUES (@id,@linkedin_account_id,@profile_url,@full_name,@reason,@status,@priority,@assigned_task_id,@scraped_profile_id,@created_at,@updated_at)`).run(row);
        }
        return connection.prepare(`SELECT * FROM pa_li_scrape_targets WHERE id = ?`).get(row.id);
      },
      liOverviewStats() {
        const totalProfiles = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_scraped_profiles`).get()?.count || 0;
        const totalSegments = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_segments`).get()?.count || 0;
        const activeCampaigns = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_outreach_campaigns WHERE status = 'active'`).get()?.count || 0;
        const outreachSentWeek = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_outreach_queue WHERE status = 'sent' AND sent_at >= date('now','-7 days')`).get()?.count || 0;
        const outreachReplied = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_outreach_queue WHERE status = 'replied'`).get()?.count || 0;
        const totalOutreachSent = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_outreach_queue WHERE status IN ('sent','replied','accepted')`).get()?.count || 0;
        const replyRate = totalOutreachSent > 0 ? Math.round((outreachReplied / totalOutreachSent) * 100) : 0;
        const pendingTargets = connection.prepare(`SELECT COUNT(*) as count FROM pa_li_scrape_targets WHERE status = 'pending'`).get()?.count || 0;
        const cityCounts = connection.prepare(`SELECT city, COUNT(*) as count FROM pa_li_scraped_profiles WHERE city != '' GROUP BY city ORDER BY count DESC LIMIT 10`).all();
        const recentRuns = connection.prepare(`SELECT r.*, t.name as task_name FROM pa_li_automation_runs r LEFT JOIN pa_li_automation_tasks t ON t.id = r.task_id ORDER BY r.started_at DESC LIMIT 5`).all().map(r => ({ ...r, result: JSON.parse(r.result) }));
        const weeklyOutreach = connection.prepare(`SELECT date(sent_at) as day, COUNT(*) as count FROM pa_li_outreach_queue WHERE status IN ('sent','replied','accepted') AND sent_at >= date('now','-30 days') GROUP BY day ORDER BY day ASC`).all();
        return { totalProfiles, totalSegments, activeCampaigns, outreachSentWeek, outreachReplied, totalOutreachSent, replyRate, pendingTargets, cityCounts, recentRuns, weeklyOutreach };
      },
    },
    inv: {
      listWatchlist() {
        return connection.prepare(`SELECT * FROM pa_inv_watchlist ORDER BY chart_order ASC, created_at ASC`).all().map(r => ({ ...r, enabled: Boolean(r.enabled) }));
      },
      getWatchlistItem(id) {
        const r = connection.prepare(`SELECT * FROM pa_inv_watchlist WHERE id = ?`).get(id);
        return r ? { ...r, enabled: Boolean(r.enabled) } : null;
      },
      getWatchlistBySymbol(symbol) {
        const r = connection.prepare(`SELECT * FROM pa_inv_watchlist WHERE symbol = ?`).get(symbol);
        return r ? { ...r, enabled: Boolean(r.enabled) } : null;
      },
      upsertWatchlistItem(item) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_inv_watchlist WHERE id = ?`).get(item.id);
        const row = { id: item.id, symbol: (item.symbol||'').toUpperCase(), name: item.name, asset_type: item.assetType||item.asset_type||'stock', currency: item.currency||'USD', exchange: item.exchange||'', sector: item.sector||'', isin: item.isin||'', color: item.color||'#0F766E', chart_order: item.chartOrder||item.chart_order||0, notes: item.notes||'', enabled: item.enabled!==false?1:0, created_at: item.createdAt||item.created_at||now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_inv_watchlist SET symbol=@symbol,name=@name,asset_type=@asset_type,currency=@currency,exchange=@exchange,sector=@sector,isin=@isin,color=@color,chart_order=@chart_order,notes=@notes,enabled=@enabled,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_inv_watchlist (id,symbol,name,asset_type,currency,exchange,sector,isin,color,chart_order,notes,enabled,created_at,updated_at) VALUES (@id,@symbol,@name,@asset_type,@currency,@exchange,@sector,@isin,@color,@chart_order,@notes,@enabled,@created_at,@updated_at)`).run(row);
        }
        return db.inv.getWatchlistItem(item.id);
      },
      deleteWatchlistItem(id) {
        connection.prepare(`DELETE FROM pa_inv_watchlist WHERE id = ?`).run(id);
      },
      listHoldings() {
        return connection.prepare(`SELECT * FROM pa_inv_portfolio_holdings ORDER BY symbol ASC`).all();
      },
      getHolding(id) {
        return connection.prepare(`SELECT * FROM pa_inv_portfolio_holdings WHERE id = ?`).get(id) || null;
      },
      getHoldingBySymbol(symbol) {
        return connection.prepare(`SELECT * FROM pa_inv_portfolio_holdings WHERE symbol = ?`).get(symbol) || null;
      },
      upsertHolding(h) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_inv_portfolio_holdings WHERE id = ?`).get(h.id);
        const row = { id: h.id, symbol: (h.symbol||'').toUpperCase(), name: h.name, asset_type: h.assetType||h.asset_type||'stock', currency: h.currency||'USD', notes: h.notes||'', created_at: h.createdAt||h.created_at||now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_inv_portfolio_holdings SET symbol=@symbol,name=@name,asset_type=@asset_type,currency=@currency,notes=@notes,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_inv_portfolio_holdings (id,symbol,name,asset_type,currency,notes,created_at,updated_at) VALUES (@id,@symbol,@name,@asset_type,@currency,@notes,@created_at,@updated_at)`).run(row);
        }
        return db.inv.getHolding(h.id);
      },
      deleteHolding(id) {
        connection.prepare(`DELETE FROM pa_inv_purchases WHERE holding_id = ?`).run(id);
        connection.prepare(`DELETE FROM pa_inv_portfolio_holdings WHERE id = ?`).run(id);
      },
      listPurchases(holdingId) {
        return connection.prepare(`SELECT * FROM pa_inv_purchases WHERE holding_id = ? ORDER BY purchase_date ASC`).all(holdingId);
      },
      getPurchase(id) {
        return connection.prepare(`SELECT * FROM pa_inv_purchases WHERE id = ?`).get(id) || null;
      },
      insertPurchase(p) {
        const now = nowIso();
        const row = { id: p.id, holding_id: p.holdingId||p.holding_id, symbol: (p.symbol||'').toUpperCase(), purchase_date: p.purchaseDate||p.purchase_date, shares: p.shares, price_per_share: p.pricePerShare||p.price_per_share, currency: p.currency||'USD', fee: p.fee||0, notes: p.notes||'', created_at: now, updated_at: now };
        connection.prepare(`INSERT INTO pa_inv_purchases (id,holding_id,symbol,purchase_date,shares,price_per_share,currency,fee,notes,created_at,updated_at) VALUES (@id,@holding_id,@symbol,@purchase_date,@shares,@price_per_share,@currency,@fee,@notes,@created_at,@updated_at)`).run(row);
        return db.inv.getPurchase(p.id);
      },
      updatePurchase(p) {
        const now = nowIso();
        connection.prepare(`UPDATE pa_inv_purchases SET purchase_date=@purchase_date,shares=@shares,price_per_share=@price_per_share,currency=@currency,fee=@fee,notes=@notes,updated_at=@updated_at WHERE id=@id`).run({ id: p.id, purchase_date: p.purchaseDate||p.purchase_date, shares: p.shares, price_per_share: p.pricePerShare||p.price_per_share, currency: p.currency||'USD', fee: p.fee||0, notes: p.notes||'', updated_at: now });
        return db.inv.getPurchase(p.id);
      },
      deletePurchase(id) {
        connection.prepare(`DELETE FROM pa_inv_purchases WHERE id = ?`).run(id);
      },
      cachePrices(symbol, rows) {
        const stmt = connection.prepare(`INSERT OR REPLACE INTO pa_inv_price_cache (symbol,date,open,high,low,close,volume,source,fetched_at) VALUES (?,?,?,?,?,?,?,?,?)`);
        const tx = connection.transaction(() => { for (const r of rows) stmt.run(symbol, r.date, r.open||null, r.high||null, r.low||null, r.close, r.volume||null, r.source||'yahoo', nowIso()); });
        tx();
      },
      getPriceHistory(symbol, { days = 365 } = {}) {
        return connection.prepare(`SELECT date,open,high,low,close,volume FROM pa_inv_price_cache WHERE symbol = ? AND date >= date('now','-'||?||' days') ORDER BY date ASC`).all(symbol, days);
      },
      getLatestPrice(symbol) {
        return connection.prepare(`SELECT close,date FROM pa_inv_price_cache WHERE symbol = ? ORDER BY date DESC LIMIT 1`).get(symbol) || null;
      },
      listNewsSources() {
        return connection.prepare(`SELECT * FROM pa_inv_news_sources ORDER BY name ASC`).all().map(r => ({ ...r, keywords: JSON.parse(r.keywords), enabled: Boolean(r.enabled) }));
      },
      upsertNewsSource(s) {
        const now = nowIso();
        const exists = connection.prepare(`SELECT id FROM pa_inv_news_sources WHERE id = ?`).get(s.id);
        const row = { id: s.id, name: s.name, url: s.url, rss_url: s.rssUrl||s.rss_url||'', keywords: JSON.stringify(s.keywords||[]), enabled: s.enabled!==false?1:0, last_fetched_at: s.lastFetchedAt||s.last_fetched_at||null, created_at: s.createdAt||s.created_at||now, updated_at: now };
        if (exists) {
          connection.prepare(`UPDATE pa_inv_news_sources SET name=@name,url=@url,rss_url=@rss_url,keywords=@keywords,enabled=@enabled,last_fetched_at=@last_fetched_at,updated_at=@updated_at WHERE id=@id`).run(row);
        } else {
          connection.prepare(`INSERT INTO pa_inv_news_sources (id,name,url,rss_url,keywords,enabled,last_fetched_at,created_at,updated_at) VALUES (@id,@name,@url,@rss_url,@keywords,@enabled,@last_fetched_at,@created_at,@updated_at)`).run(row);
        }
        return connection.prepare(`SELECT * FROM pa_inv_news_sources WHERE id = ?`).get(row.id);
      },
      deleteNewsSource(id) {
        connection.prepare(`DELETE FROM pa_inv_news_sources WHERE id = ?`).run(id);
      },
      listNewsArticles({ symbol, limit = 50, offset = 0 } = {}) {
        const where = symbol ? `WHERE symbol = ? OR symbol = ''` : ``;
        const args = symbol ? [symbol, limit, offset] : [limit, offset];
        return connection.prepare(`SELECT * FROM pa_inv_news_articles ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`).all(...args);
      },
      upsertArticle(a) {
        const row = { id: a.id, source_id: a.sourceId||a.source_id||null, symbol: a.symbol||'', title: a.title, summary: a.summary||'', url: a.url, published_at: a.publishedAt||a.published_at, sentiment: a.sentiment||'neutral', relevance_score: a.relevanceScore||a.relevance_score||0.5, fetched_at: nowIso() };
        connection.prepare(`INSERT OR REPLACE INTO pa_inv_news_articles (id,source_id,symbol,title,summary,url,published_at,sentiment,relevance_score,fetched_at) VALUES (@id,@source_id,@symbol,@title,@summary,@url,@published_at,@sentiment,@relevance_score,@fetched_at)`).run(row);
        return connection.prepare(`SELECT * FROM pa_inv_news_articles WHERE id = ?`).get(row.id);
      },
      listAdvisorSignals({ symbol, limit = 20 } = {}) {
        const where = symbol ? `WHERE symbol = ?` : ``;
        const args = symbol ? [symbol, limit] : [limit];
        return connection.prepare(`SELECT * FROM pa_inv_advisor_signals ${where} ORDER BY generated_at DESC LIMIT ?`).all(...args).map(r => ({ ...r, indicators: JSON.parse(r.indicators), acted_on: Boolean(r.acted_on) }));
      },
      insertAdvisorSignal(sig) {
        const row = { id: sig.id, symbol: (sig.symbol||'').toUpperCase(), signal_type: sig.signalType||sig.signal_type, direction: sig.direction||'neutral', strength: sig.strength||0.5, rationale: sig.rationale||'', indicators: JSON.stringify(sig.indicators||{}), generated_at: nowIso(), valid_until: sig.validUntil||sig.valid_until||null, acted_on: 0 };
        connection.prepare(`INSERT INTO pa_inv_advisor_signals (id,symbol,signal_type,direction,strength,rationale,indicators,generated_at,valid_until,acted_on) VALUES (@id,@symbol,@signal_type,@direction,@strength,@rationale,@indicators,@generated_at,@valid_until,@acted_on)`).run(row);
        return connection.prepare(`SELECT * FROM pa_inv_advisor_signals WHERE id = ?`).get(row.id);
      },
    },
    nordnet: {
      upsertAccount(a) {
        const row = { account_id: String(a.accountId || a.account_id), label: a.label || '', account_type: a.accountType || a.account_type || 'investment', currency: a.currency || 'DKK', total_value: a.totalValue ?? a.total_value ?? null, own_capital: a.ownCapital ?? a.own_capital ?? null, buying_power: a.buyingPower ?? a.buying_power ?? null, synced_at: nowIso(), raw_data: JSON.stringify(a.rawData || a.raw_data || {}) };
        connection.prepare(`INSERT OR REPLACE INTO pa_nordnet_accounts (account_id,label,account_type,currency,total_value,own_capital,buying_power,synced_at,raw_data) VALUES (@account_id,@label,@account_type,@currency,@total_value,@own_capital,@buying_power,@synced_at,@raw_data)`).run(row);
        return connection.prepare(`SELECT * FROM pa_nordnet_accounts WHERE account_id = ?`).get(row.account_id);
      },
      listAccounts() {
        return connection.prepare(`SELECT * FROM pa_nordnet_accounts ORDER BY account_type ASC`).all().map(r => ({ ...r, raw_data: JSON.parse(r.raw_data) }));
      },
      upsertPosition(p) {
        const id = `${p.accountId || p.account_id}:${p.instrumentId || p.instrument_id}`;
        const row = { id, account_id: String(p.accountId || p.account_id), instrument_id: p.instrumentId || p.instrument_id || '', isin: p.isin || '', symbol: (p.symbol || '').toUpperCase(), name: p.name || '', quantity: p.quantity || 0, avg_price: p.avgPrice ?? p.avg_price ?? null, last_price: p.lastPrice ?? p.last_price ?? null, market_value: p.marketValue ?? p.market_value ?? null, unrealized_pnl: p.unrealizedPnl ?? p.unrealized_pnl ?? null, unrealized_pnl_pct: p.unrealizedPnlPct ?? p.unrealized_pnl_pct ?? null, currency: p.currency || 'DKK', synced_at: nowIso(), raw_data: JSON.stringify(p.rawData || p.raw_data || {}) };
        connection.prepare(`INSERT OR REPLACE INTO pa_nordnet_positions (id,account_id,instrument_id,isin,symbol,name,quantity,avg_price,last_price,market_value,unrealized_pnl,unrealized_pnl_pct,currency,synced_at,raw_data) VALUES (@id,@account_id,@instrument_id,@isin,@symbol,@name,@quantity,@avg_price,@last_price,@market_value,@unrealized_pnl,@unrealized_pnl_pct,@currency,@synced_at,@raw_data)`).run(row);
        return connection.prepare(`SELECT * FROM pa_nordnet_positions WHERE id = ?`).get(row.id);
      },
      listPositions(accountId) {
        const where = accountId ? `WHERE account_id = ?` : '';
        const args = accountId ? [String(accountId)] : [];
        return connection.prepare(`SELECT * FROM pa_nordnet_positions ${where} ORDER BY market_value DESC NULLS LAST`).all(...args).map(r => ({ ...r, raw_data: JSON.parse(r.raw_data) }));
      },
      clearPositions(accountId) {
        connection.prepare(`DELETE FROM pa_nordnet_positions WHERE account_id = ?`).run(String(accountId));
      },
      upsertOrder(o) {
        const row = { order_id: String(o.orderId || o.order_id), account_id: String(o.accountId || o.account_id), instrument_id: o.instrumentId || o.instrument_id || '', isin: o.isin || '', symbol: (o.symbol || '').toUpperCase(), name: o.name || '', order_type: o.orderType || o.order_type || 'LIMIT', side: o.side || 'BUY', quantity: o.quantity || 0, price: o.price ?? null, status: o.status || 'active', currency: o.currency || 'DKK', created_at_nordnet: o.createdAt || o.created_at_nordnet || null, synced_at: nowIso(), raw_data: JSON.stringify(o.rawData || o.raw_data || {}) };
        connection.prepare(`INSERT OR REPLACE INTO pa_nordnet_orders (order_id,account_id,instrument_id,isin,symbol,name,order_type,side,quantity,price,status,currency,created_at_nordnet,synced_at,raw_data) VALUES (@order_id,@account_id,@instrument_id,@isin,@symbol,@name,@order_type,@side,@quantity,@price,@status,@currency,@created_at_nordnet,@synced_at,@raw_data)`).run(row);
        return connection.prepare(`SELECT * FROM pa_nordnet_orders WHERE order_id = ?`).get(row.order_id);
      },
      listOrders(accountId) {
        const where = accountId ? `WHERE account_id = ?` : '';
        const args = accountId ? [String(accountId)] : [];
        return connection.prepare(`SELECT * FROM pa_nordnet_orders ${where} ORDER BY synced_at DESC`).all(...args).map(r => ({ ...r, raw_data: JSON.parse(r.raw_data) }));
      },
      upsertTrade(t) {
        const row = { trade_id: String(t.tradeId || t.trade_id), account_id: String(t.accountId || t.account_id), instrument_id: t.instrumentId || t.instrument_id || '', isin: t.isin || '', symbol: (t.symbol || '').toUpperCase(), name: t.name || '', side: t.side || 'BUY', quantity: t.quantity || 0, price: t.price || 0, amount: t.amount || 0, currency: t.currency || 'DKK', traded_at: t.tradedAt || t.traded_at || nowIso(), synced_at: nowIso(), raw_data: JSON.stringify(t.rawData || t.raw_data || {}) };
        connection.prepare(`INSERT OR REPLACE INTO pa_nordnet_trades (trade_id,account_id,instrument_id,isin,symbol,name,side,quantity,price,amount,currency,traded_at,synced_at,raw_data) VALUES (@trade_id,@account_id,@instrument_id,@isin,@symbol,@name,@side,@quantity,@price,@amount,@currency,@traded_at,@synced_at,@raw_data)`).run(row);
        return connection.prepare(`SELECT * FROM pa_nordnet_trades WHERE trade_id = ?`).get(row.trade_id);
      },
      listTrades(accountId, { limit = 50 } = {}) {
        const where = accountId ? `WHERE account_id = ?` : '';
        const args = accountId ? [String(accountId), limit] : [limit];
        return connection.prepare(`SELECT * FROM pa_nordnet_trades ${where} ORDER BY traded_at DESC LIMIT ?`).all(...args).map(r => ({ ...r, raw_data: JSON.parse(r.raw_data) }));
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
