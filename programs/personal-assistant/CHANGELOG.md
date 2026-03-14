# Changelog

## [Unreleased]

### 2026-03-14 — Phase 1–5 V1 Rollout

**Phase 1: Shared schema and server scaffolding**
- Added `PA_SCHEMA` to `server/src/db/init.js` defining 8 SQLite tables: `pa_configuration`, `pa_tasks`, `pa_calendar_events`, `pa_email_accounts`, `pa_email_cache`, `pa_email_audit`, `pa_social_drafts`, `pa_fitness_logs`, `pa_fitness_goals`. All tables carry `IF NOT EXISTS` guards and covering indexes.
- Added `db.pa` method namespace with full CRUD helpers for all modules: tasks, calendar events, email accounts, email audit, social drafts, fitness logs, and fitness goals. Also exposes `overviewStats()` for the dashboard summary feed.
- Created `server/src/routes/pa.js` registering all PA REST endpoints under `/api/pa/*`.
- Registered `paRoutes` in `server/src/app.js` and added 6 entries to `DELIVERED_PAGES`: `/pa`, `/pa/tasks`, `/pa/calendar`, `/pa/email`, `/pa/social`, `/pa/fitness`.

**Phase 2: Task Manager + Calendar**
- Delivered `client/pages/pa-tasks.html` — full kanban board (Todo / In Progress / Done), filter pills, priority badges, due dates, New/Edit/Delete modals, toast feedback. Backed by `/api/pa/tasks`.
- Delivered `client/pages/pa-calendar.html` — month-grid calendar (Mon–Sun), prev/next navigation, today highlight, event pills per cell, click-to-create, upcoming events list. Backed by `/api/pa/calendar`.
- Delivered `client/pages/pa.html` — unified dashboard: 5 stat cards (open tasks, upcoming events, social drafts, fitness logs this week, email accounts), 5 active module tiles, two-panel feed (open tasks + upcoming events). Shimmer skeleton loading states.

**Phase 3: Email**
- Delivered `client/pages/pa-email.html` — email account management UI with provider/status badge matrix, per-account audit log toggle, 5-step Operator Setup Guide. Operator boundary clearly documented: Bolt manages the account model; cPanel mailbox creation, IMAP/SMTP credentials, and SSH access remain operator-owned.
- API routes: `GET/POST /api/pa/email/accounts`, `PATCH/DELETE /api/pa/email/accounts/:id`, `GET /api/pa/email/accounts/:id/audit`.

**Phase 4: Social Content Planning**
- Delivered `client/pages/pa-social.html` — social draft board with status tabs (All / Draft / Scheduled / Published), 2-col card grid, platform color pills (Twitter/Instagram/LinkedIn/Facebook), character count, scheduling field. Publishing boundary notice shown inline.
- API routes: full CRUD under `/api/pa/social`.

**Phase 5: Fitness Dashboard**
- Delivered `client/pages/pa-fitness.html` — activity log table with week/month/all filter, goals grid with progress bars, log modal (type, duration, distance, calories, date, source, notes), add-goal modal. Privacy boundary notice: data stays in local SQLite; no live wearable sync.
- API routes: `GET/POST /api/pa/fitness/logs`, `DELETE /api/pa/fitness/logs/:id`, `GET/POST /api/pa/fitness/goals`, `PATCH /api/pa/fitness/goals/:id`.

**Alignment fixes (post-linter review)**
- Corrected all client pages to unwrap `{entries:[...]}` from list API responses.
- Corrected `start_time`/`end_time` → `start_at`/`end_at` field references in calendar and dashboard pages.
- Corrected POST/PATCH response unwrapping (`{task}`, `{event}`, `{account}`, `{draft}`, `{log}`, `{goal}`).
- Corrected fitness log and goal payloads to camelCase keys matching the API contract.
- Corrected social `scheduledFor` and `tags` payload keys.

**Phase 6: Unified overview, daily briefing, and agent packet updates**
- Added `buildDailyBriefing()` in `server/src/routes/pa.js` — generates a plain-English sentence summarising open tasks, next event, pending drafts, and recent fitness sessions.
- `/api/pa/overview` now includes `dailyBriefing` string plus top-level `taskCounts`, `draftCount`, `recentFitness`, `emailAccounts` fields for direct client consumption.
- `client/pages/pa.html` now shows the daily briefing banner above the stat cards when data is available.
- Updated `server/src/lib/project-catalog.js` Personal Assistant entry: summary, hero text, statusStrip, all module tiles changed from `stub` to `active` with real `/pa/*` links. Added 6 PA API endpoint surfaces.
- Updated `agents/personal-assistant/personal-assistant-master/memory.md` with V1 live status, datastore context, and updated priorities.

**Phase 7: QA pass, operator packet, rollback notes**
- Updated `programs/personal-assistant/OPERATOR_HANDOFF_CONTRACT.md` with V1 implementation status and explicit operator steps for email IMAP/SMTP, social publishing tokens, and fitness wearable sync.
- Updated `programs/personal-assistant/ROLLBACK_AND_REPAIR.md` to reflect V1 live state with revised rollback file inventory.
- Final test pass: 3/3 baseline tests pass.

### 2026-03-14

- Added the canonical Personal Assistant V1 planning and handoff pack inside `programs/personal-assistant/`.
- Tailored the old personal-agent vision into Agent Enterprise-native docs covering requirements, design, phased tasks, styling guidance, operator handoff, rollback, and external-agent execution rules.
- Reframed the module scaffolds so they point back to the new root authority docs instead of reading like isolated placeholder apps.
