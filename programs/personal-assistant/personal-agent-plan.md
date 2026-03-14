# Personal Agent Development Plan

> Reference-only source document. The canonical V1 execution authority now lives in `README.md`, `requirements.md`, `design.md`, and `tasks.md` in this same folder.

**Agent Enterprise · Personal Assistant Project**
**Phased Implementation with Agent Skills, UI Surfaces & Validation Gates**

Modules: Calendar · Email · Fitness · Social Media · Kanban Tasks
Stack: Node.js / Fastify / SQLite / Vanilla JS / cPanel Remote Estate

Version 1.0 · For External Agent Implementation

---

## Executive Overview

This document defines the phased build-out of a Personal Agent within the existing Agent Enterprise control plane. The agent will manage five domains: Calendar, Email, Fitness, Social Media, and Task/Kanban. Each phase is designed so an external autonomous agent can implement it end-to-end, validate the result, and proceed to the next phase without human intervention between steps.

The plan respects the current stack: Node.js >=20 with Fastify, SQLite via better-sqlite3, static HTML with vanilla JavaScript, and the registry-first architecture already in place. No new frameworks are introduced. All new surfaces are delivered as static pages served from the same origin.

---

## Architecture Principles

**Registry-driven:** Every new agent and program is registered in `agents/registry.json` and `programs/registry.json` before any code references it.

**SQLite-native:** All persistent state (events, tasks, logs, fitness data, email cache) lives in the existing `.data/control-plane.sqlite` database.

**Same-origin delivery:** All UI surfaces are static HTML pages served by Fastify. No SPA framework. No separate frontend build.

**Skill-based agent design:** Each domain gets a dedicated skill file in `.agents/skills/` that the agent loads into its context to operate within that domain.

**cPanel integration:** Email connects to Roundcube/cPanel on `cp10.nordicway.dk` using IMAP/SMTP over the existing SSH estate infrastructure.

**Phase isolation:** Each phase is independently deployable and testable. A broken later phase never blocks an earlier working phase.

---

## Phase Overview

The project is divided into seven phases. Phases 0 and 1 establish shared foundations. Phases 2 through 5 each deliver one domain module. Phase 6 delivers the kanban task system and the unified overview dashboard.

| Phase | Name | Delivers | Duration |
|-------|------|----------|----------|
| 0 | Foundation & Shared Schema | DB tables, shared APIs, agent registry entries | 1 sprint |
| 1 | Front Page Overview Shell | Project overview dashboard shell | 1 sprint |
| 2 | Calendar Module | Calendar UI + agent skill | 1-2 sprints |
| 3 | Email Module | Roundcube/cPanel email integration | 2 sprints |
| 4 | Fitness Module | Fitness dashboard + tracking | 1-2 sprints |
| 5 | Social Media Module | Marketing dashboard + image gen | 2 sprints |
| 6 | Kanban Task Module | Multi-project kanban + overview integration | 1-2 sprints |

---

## PHASE 0 — Foundation & Shared Schema

*Duration: 1 sprint (3-5 days)*

This phase lays the groundwork that every subsequent module depends on. It extends the SQLite schema, registers the personal-assistant master agent, and creates the shared API plumbing.

### DB Schema

- Add table: `pa_calendar_events` (id, title, description, start_ts, end_ts, recurrence, location, source, synced_at, created_at)
- Add table: `pa_emails` (id, message_id, folder, from_addr, to_addr, subject, body_preview, body_html, read, flagged, synced_at)
- Add table: `pa_email_accounts` (id, label, imap_host, imap_port, smtp_host, smtp_port, username, encrypted_pass)
- Add table: `pa_fitness_logs` (id, date, type, duration_min, calories, distance_km, notes, source)
- Add table: `pa_fitness_goals` (id, metric, target, period, active)
- Add table: `pa_social_posts` (id, platform, content, media_url, scheduled_at, published_at, status, engagement_json)
- Add table: `pa_social_accounts` (id, platform, handle, access_token_enc, refresh_token_enc, active)
- Add table: `pa_kanban_boards` (id, project_id, title, created_at)
- Add table: `pa_kanban_columns` (id, board_id, title, position)
- Add table: `pa_kanban_cards` (id, column_id, title, description, assignee, priority, due_date, position, created_at, updated_at)
- Run migration in `server/src/db/init.js` alongside existing tables

### Agent Registry

- Register master agent: `personal-assistant` (kind: master) in `agents/registry.json`
- Register task agents: `pa-calendar`, `pa-email`, `pa-fitness`, `pa-social`, `pa-kanban` (kind: task)
- Create packet files: `agents/personal-assistant/soul.md`, `user.md`, `memory.md`, `skills.md`
- Create skill stubs: `.agents/skills/pa-calendar.md`, `pa-email.md`, `pa-fitness.md`, `pa-social.md`, `pa-kanban.md`

### Program Registry

- Register program: `personal-assistant` (class: active) in `programs/registry.json`
- Register sub-programs: `pa-calendar`, `pa-email`, `pa-fitness`, `pa-social`, `pa-kanban` (class: active)

### Shared API

- Create route group: `server/src/routes/personal-assistant.js`
- `GET /api/pa/overview` — returns summary counts from all PA tables
- `GET /api/pa/config` — returns module enable/disable flags from pa_config table
- `POST /api/pa/config` — update module flags
- Wire route group into Fastify in `server/src/index.js`

### Shared Assets

- Create `client/assets/pa-shared.js` — shared fetch helpers, date formatting, notification toasts
- Create `client/assets/pa-shared.css` — shared PA color tokens, card layouts, responsive grid

### VALIDATION GATE 0

- [ ] `npm test` passes (all existing 46 tests + new PA schema tests)
- [ ] `GET /health` returns 200
- [ ] `GET /api/pa/overview` returns JSON with zero-count summaries for all modules
- [ ] `personal-assistant` agent appears in `GET /api/agents` response
- [ ] All 5 task agents (`pa-calendar`, `pa-email`, `pa-fitness`, `pa-social`, `pa-kanban`) appear in registry
- [ ] SQLite database contains all new `pa_*` tables with correct columns
- [ ] No regressions: existing `/workboard`, `/agents`, and `/` pages load without errors

---

## PHASE 1 — Front Page Overview Shell

*Duration: 1 sprint (3-5 days)*

The overview page acts as the personal agent home screen. It shows a summary card per module and links to each module detail page. This phase delivers the shell with placeholder data; later phases fill in real data.

### Page Delivery

- Create `client/pa-overview.html` — the personal assistant home page
- Register Fastify route: `GET /pa` → serves `pa-overview.html`
- Add navigation link to existing `/` home page and `/agents` page

### UI Layout

- Header bar: Personal Assistant title, date/time, quick-action buttons
- Module grid: 5 cards in responsive 2-3 column layout (Calendar, Email, Fitness, Social, Tasks)
- Each card: icon, module name, 2-3 key stats from `/api/pa/overview`, status indicator, click-through link
- Project selector: dropdown or tabs to filter tasks by project (wired in Phase 6)
- Recent activity feed: last 10 events across all modules (from combined query)

### API Wiring

- Fetch `/api/pa/overview` on page load and populate all cards
- Auto-refresh every 60 seconds (configurable interval)
- Loading skeleton states for each card while data fetches

### Agent Skill

- Update `.agents/skills/pa-overview.md` — skill for reading and summarizing all module states
- Agent can query `/api/pa/overview` and compose a daily briefing

### VALIDATION GATE 1

- [ ] `GET /pa` returns 200 and renders the overview page in a browser
- [ ] All 5 module cards are visible with placeholder or zero-count data
- [ ] Clicking each card navigates to `/pa/calendar`, `/pa/email`, `/pa/fitness`, `/pa/social`, `/pa/tasks` (404 is acceptable — pages built in later phases)
- [ ] Page is responsive: renders correctly at 1440px, 1024px, and 375px widths
- [ ] Auto-refresh fires at the configured interval (verify via network tab)
- [ ] No console errors in the browser
- [ ] `npm test` passes

---

## PHASE 2 — Calendar Module

*Duration: 1-2 sprints (5-10 days)*

The calendar module provides event management with day, week, and month views. Events are stored in SQLite and can optionally sync with external calendar providers in a later iteration.

### API Routes

- `GET /api/pa/calendar/events?start=&end=` — list events in date range
- `POST /api/pa/calendar/events` — create event
- `PUT /api/pa/calendar/events/:id` — update event
- `DELETE /api/pa/calendar/events/:id` — delete event
- `GET /api/pa/calendar/today` — today's events for overview card
- `POST /api/pa/calendar/events/:id/recurrence` — manage recurring events

### Page Delivery

- Create `client/pa-calendar.html`
- Register Fastify route: `GET /pa/calendar` → serves page
- Month view: grid with event dots, click day to expand
- Week view: 7-column time grid with event blocks
- Day view: hour-by-hour timeline
- Event creation modal: title, description, start/end datetime, location, recurrence
- Event detail/edit side panel

### Agent Skill

- Write `.agents/skills/pa-calendar.md` with full CRUD operation instructions
- Agent can: list today's events, create events from natural language, find conflicts, suggest rescheduling
- Agent can compose daily/weekly agenda summaries
- Skill includes API endpoint reference and example request/response payloads

### Overview Wiring

- Update `/api/pa/overview` to include: next 3 upcoming events, event count today, conflicts count
- Calendar card on `/pa` overview page shows live data

### VALIDATION GATE 2

- [ ] `POST /api/pa/calendar/events` creates an event and returns it with an ID
- [ ] `GET /api/pa/calendar/events?start=...&end=...` returns events in the correct range
- [ ] Calendar page renders month, week, and day views without console errors
- [ ] Creating an event via the UI modal persists it to SQLite and it appears on the calendar
- [ ] Editing and deleting events works end-to-end
- [ ] Recurring event creation generates correct future occurrences
- [ ] `/pa` overview page calendar card shows real upcoming event data
- [ ] `npm test` passes with new calendar test cases

---

## PHASE 3 — Email Module (Roundcube / cPanel)

*Duration: 2 sprints (8-12 days)*

The email module connects to Roundcube over cPanel's IMAP/SMTP on `cp10.nordicway.dk`. It caches email metadata locally in SQLite for fast browsing and provides send/reply/forward capabilities.

### IMAP/SMTP Setup

- Install `imapflow` (IMAP client) and `nodemailer` (SMTP sender) as dependencies
- Create `server/src/services/email-connector.js` — connection manager
- IMAP connection to `cp10.nordicway.dk` using credentials from `pa_email_accounts`
- SMTP connection for sending via the same cPanel mail server
- Connection pooling and graceful disconnect on server shutdown
- Store encrypted credentials in `pa_email_accounts` (use env-based encryption key)

### Sync Service

- Create `server/src/services/email-sync.js` — background sync worker
- Initial sync: fetch last 200 messages per folder (INBOX, Sent, Drafts, Trash)
- Incremental sync: use IMAP UIDVALIDITY + UID to fetch only new messages
- Store metadata + body preview in `pa_emails`, full HTML body on demand
- Sync interval: configurable, default 5 minutes
- Folder list sync: detect custom Roundcube folders

### API Routes

- `GET /api/pa/email/folders` — list all folders with unread counts
- `GET /api/pa/email/messages?folder=&page=&limit=` — paginated message list
- `GET /api/pa/email/messages/:id` — full message with HTML body
- `POST /api/pa/email/send` — send new email (to, cc, bcc, subject, body, attachments)
- `POST /api/pa/email/messages/:id/reply` — reply to message
- `POST /api/pa/email/messages/:id/forward` — forward message
- `PUT /api/pa/email/messages/:id/read` — mark read/unread
- `PUT /api/pa/email/messages/:id/flag` — toggle flag
- `DELETE /api/pa/email/messages/:id` — move to trash
- `POST /api/pa/email/sync` — trigger manual sync
- `GET /api/pa/email/accounts` — list configured accounts
- `POST /api/pa/email/accounts` — add/test new account

### Page Delivery

- Create `client/pa-email.html`
- Register Fastify route: `GET /pa/email` → serves page
- Three-panel layout: folder sidebar, message list, reading pane
- Compose modal: rich text editor (contenteditable with basic formatting)
- Reply/forward pre-fills with quoted original message
- Search bar: client-side filter on cached messages + server-side IMAP SEARCH fallback
- Unread badge on folder names

### Agent Skill

- Write `.agents/skills/pa-email.md` with complete API reference
- Agent can: check unread count, read latest emails, compose and send emails, search by sender/subject
- Agent can draft reply suggestions based on email content
- Agent can summarize inbox (unread count, flagged items, grouped by sender)

### Overview Wiring

- Update `/api/pa/overview`: unread count, latest 3 emails subject/sender, flagged count
- Email card on overview shows live unread badge and recent subjects

### VALIDATION GATE 3

- [ ] `POST /api/pa/email/accounts` with valid cPanel IMAP credentials returns success + connection test passes
- [ ] `POST /api/pa/email/sync` triggers sync and populates `pa_emails` table
- [ ] `GET /api/pa/email/folders` returns INBOX, Sent, Drafts, Trash with correct unread counts
- [ ] `GET /api/pa/email/messages?folder=INBOX` returns paginated message list
- [ ] Full message body loads when clicking a message in the reading pane
- [ ] `POST /api/pa/email/send` delivers an email (verify in Roundcube webmail)
- [ ] Reply and forward pre-fill correctly and send successfully
- [ ] Mark read/unread and flag toggle persist to both SQLite and IMAP server
- [ ] `/pa` overview email card shows real unread count
- [ ] `npm test` passes — includes mock IMAP tests for sync logic
- [ ] No credentials exposed in API responses or client-side code

---

## PHASE 4 — Fitness Module

*Duration: 1-2 sprints (5-8 days)*

The fitness module provides a personal health dashboard for tracking workouts, goals, and progress over time. Data is manually entered or imported via CSV. No external fitness API integration in the initial build.

### API Routes

- `GET /api/pa/fitness/logs?start=&end=&type=` — list fitness logs with filters
- `POST /api/pa/fitness/logs` — create log entry
- `PUT /api/pa/fitness/logs/:id` — update log
- `DELETE /api/pa/fitness/logs/:id` — delete log
- `GET /api/pa/fitness/goals` — list active goals
- `POST /api/pa/fitness/goals` — create goal
- `PUT /api/pa/fitness/goals/:id` — update goal
- `GET /api/pa/fitness/stats?period=week|month|year` — aggregated stats (total duration, avg calories, distance totals)
- `POST /api/pa/fitness/import` — CSV import endpoint

### Page Delivery

- Create `client/pa-fitness.html`
- Register Fastify route: `GET /pa/fitness` → serves page
- Dashboard header: streak counter, weekly summary bar
- Activity log table: sortable, filterable by type (run, bike, swim, weights, yoga, other)
- Charts: weekly activity bar chart (duration per day), monthly trend line (calories burned), type distribution pie chart
- Use Chart.js loaded from CDN for charting (no npm dependency needed for client)
- Goal cards: progress bars showing current vs target for each active goal
- Quick-add form: type dropdown, duration, calories, distance, notes, date
- CSV import modal with preview and column mapping

### Agent Skill

- Write `.agents/skills/pa-fitness.md`
- Agent can: log workouts from natural language, check goal progress, generate weekly summaries
- Agent can suggest workout plans based on recent activity patterns
- Agent can calculate streaks and identify rest days

### Overview Wiring

- Update `/api/pa/overview`: current streak, workouts this week, top goal progress percentage
- Fitness card on overview shows streak and weekly chart mini-sparkline

### VALIDATION GATE 4

- [ ] `POST /api/pa/fitness/logs` creates a log entry and returns it
- [ ] `GET /api/pa/fitness/stats?period=week` returns correct aggregations
- [ ] Fitness page renders with charts (Chart.js loads from CDN without error)
- [ ] Quick-add form persists entries and they appear in the log table immediately
- [ ] Goal progress bars calculate correctly (current vs target)
- [ ] CSV import parses a sample file, previews it, and imports rows into `pa_fitness_logs`
- [ ] `/pa` overview fitness card shows real streak and weekly data
- [ ] `npm test` passes with fitness route tests

---

## PHASE 5 — Social Media Module

*Duration: 2 sprints (8-12 days)*

The social media module acts as a marketing dashboard for managing posts across platforms, scheduling content, tracking engagement, and generating images using AI models. Initial platforms: Instagram, LinkedIn, X (Twitter). Image generation uses the Anthropic API for prompt engineering paired with an external image generation endpoint.

### API Routes

- `GET /api/pa/social/accounts` — list connected social accounts
- `POST /api/pa/social/accounts` — add social account credentials
- `GET /api/pa/social/posts?status=&platform=` — list posts with filters
- `POST /api/pa/social/posts` — create/schedule post
- `PUT /api/pa/social/posts/:id` — edit post
- `DELETE /api/pa/social/posts/:id` — delete post
- `POST /api/pa/social/posts/:id/publish` — publish immediately
- `GET /api/pa/social/analytics?platform=&period=` — engagement analytics
- `POST /api/pa/social/generate-image` — generate image from prompt (calls image gen service)
- `POST /api/pa/social/generate-caption` — AI-assisted caption generation (calls Anthropic API)

### Image Generation

- Create `server/src/services/image-generator.js` — image gen service wrapper
- Support configurable image gen backend via env: `REPLICATE_API_TOKEN` or local Stable Diffusion endpoint
- Prompt engineering: use Anthropic API to refine user intent into optimized image prompts
- Generated images stored in `.data/pa-media/` with metadata in `pa_social_posts`
- Image preview and regeneration in the compose UI

### Page Delivery

- Create `client/pa-social.html`
- Register Fastify route: `GET /pa/social` → serves page
- Content calendar view: month grid showing scheduled and published posts
- Post composer: platform selector, text editor with character counts per platform, media upload/generate, schedule datetime picker
- Image generation panel: prompt input, style selector, generate button, preview grid, select for attachment
- Analytics dashboard: engagement timeline chart, per-post metrics table, platform comparison
- Account management section: connect/disconnect platforms, status indicators

### Agent Skill

- Write `.agents/skills/pa-social.md`
- Agent can: draft posts for specific platforms, schedule content, generate images from descriptions
- Agent can analyze engagement trends and suggest optimal posting times
- Agent can create content calendars for a given period
- Agent can repurpose content across platforms (adapt format/length per platform)

### Overview Wiring

- Update `/api/pa/overview`: scheduled posts count, posts published this week, top engagement post
- Social card on overview shows upcoming scheduled posts and weekly published count

### VALIDATION GATE 5

- [ ] `POST /api/pa/social/posts` creates a scheduled post with correct `scheduled_at` timestamp
- [ ] Content calendar view shows posts on their scheduled dates
- [ ] `POST /api/pa/social/generate-caption` returns an AI-generated caption (verify Anthropic API call)
- [ ] `POST /api/pa/social/generate-image` returns an image URL or base64 preview (mock acceptable if no image gen API key)
- [ ] Post composer shows per-platform character counts and enforces limits
- [ ] Analytics page renders charts with sample data without console errors
- [ ] `/pa` overview social card shows real scheduled/published counts
- [ ] `npm test` passes — includes social route tests with mocked external APIs

---

## PHASE 6 — Kanban Task Module

*Duration: 1-2 sprints (5-10 days)*

The kanban module extends the existing `/kanban` prototype into a full multi-project task board with board-per-project support, drag-and-drop columns, and deep integration with the overview dashboard.

### API Routes

- `GET /api/pa/kanban/boards` — list all boards (optionally filter by `project_id`)
- `POST /api/pa/kanban/boards` — create board for a project
- `GET /api/pa/kanban/boards/:boardId` — board with columns and cards
- `POST /api/pa/kanban/boards/:boardId/columns` — add column
- `PUT /api/pa/kanban/columns/:colId` — rename or reorder column
- `DELETE /api/pa/kanban/columns/:colId` — delete column (must move cards first)
- `POST /api/pa/kanban/columns/:colId/cards` — create card
- `PUT /api/pa/kanban/cards/:cardId` — update card (title, description, assignee, priority, due_date)
- `PUT /api/pa/kanban/cards/:cardId/move` — move card to different column/position
- `DELETE /api/pa/kanban/cards/:cardId` — delete card
- `GET /api/pa/kanban/cards?assignee=&priority=&due_before=` — cross-board card search

### Page Delivery

- Create `client/pa-tasks.html`
- Register Fastify route: `GET /pa/tasks` → serves page
- Project selector: dropdown populated from `GET /api/projects` listing all known projects (ian-agency, artisan, baltzer, lavprishjemmeside, personal-assistant, samlino)
- Board view: horizontal scrollable columns with draggable cards (vanilla JS drag-and-drop, no library)
- Card component: title, priority badge (color-coded), due date, assignee avatar/initial
- Card detail modal: full edit form with description (markdown-capable), checklist sub-tasks, due date picker, priority selector, assignee
- Board settings: add/rename/reorder/delete columns
- Quick filter bar: priority, assignee, due date range
- Default columns for new boards: Backlog, To Do, In Progress, Review, Done

### Agent Skill

- Write `.agents/skills/pa-kanban.md`
- Agent can: create cards from natural language, move cards between columns, list current sprint items
- Agent can generate sprint reports (cards completed, cards overdue, velocity)
- Agent can prioritize backlog based on due dates and dependencies
- Agent can create new boards for new projects automatically

### Overview Integration

- Update `/api/pa/overview`: cards due today, cards in progress, overdue count, per-project summary
- Tasks card on overview shows: due today count, in-progress count, overdue badge
- Project selector on overview page filters all module data by selected project where applicable
- Recent activity feed on overview includes card movements and completions

### Project Front Page

- Enhance `/pa` overview to be the true front page: project grid showing all projects from `/api/projects`
- Each project tile: name, status, active card count, recent activity summary, click-through to `/projects/:projectId`
- Current tasks across all projects shown in a unified "My Tasks" section below the module cards
- Add quick-create: new task button on overview that prompts for project + title + priority

### VALIDATION GATE 6

- [ ] `POST /api/pa/kanban/boards` creates a board linked to a project from `/api/projects`
- [ ] Board view renders columns and cards; drag-and-drop reorders cards between columns
- [ ] Project selector dropdown lists all 6 known projects
- [ ] Switching projects loads the correct board for that project
- [ ] Card creation via the UI persists to SQLite and appears on the board immediately
- [ ] Card detail modal opens, edits save, and close reflects changes on the board
- [ ] `GET /api/pa/kanban/cards?priority=high` returns filtered results across boards
- [ ] `/pa` overview tasks card shows real due-today and overdue counts
- [ ] Project grid on `/pa` overview lists all projects with correct card counts
- [ ] "My Tasks" section shows cards assigned to the user across all projects
- [ ] `npm test` passes — includes kanban CRUD and move operation tests
- [ ] Full end-to-end: create board → add columns → add cards → move cards → verify in overview

---

## Agent Skill Architecture

Each domain module includes a dedicated skill file that the personal-assistant master agent loads into its context. Skills follow a consistent structure so the agent can operate predictably across all modules.

### Skill File Template

Every skill file (`.agents/skills/pa-{module}.md`) follows this structure:

| Section | Purpose |
|---------|---------|
| Overview | One-paragraph description of what the module does and why the agent uses it |
| Capabilities | Bulleted list of what the agent CAN do with this module |
| API Reference | Every endpoint: method, path, parameters, example request/response JSON |
| Common Workflows | Step-by-step sequences for frequent tasks (e.g., "Schedule a meeting" = check conflicts then create event then confirm) |
| Error Handling | How to interpret error codes and what to tell the user |
| Context Rules | When to proactively check this module (e.g., check calendar before suggesting meeting times) |

### Agent Orchestration

The personal-assistant master agent loads all skill files and routes requests to the correct module. The orchestration flow is:

1. **Intent detection:** Parse user request to determine which module(s) are involved.
2. **Skill loading:** Load the relevant `pa-{module}.md` skill into context.
3. **API execution:** Make HTTP requests to the PA API endpoints as documented in the skill.
4. **Response composition:** Format the API response into a natural language reply.
5. **Cross-module coordination:** When a request spans modules (e.g., "schedule a workout for Tuesday" touches both calendar and fitness), the agent executes against both APIs.

---

## Deliverable File Tree

Below is the complete set of new files created across all phases. No existing files are deleted; only extended.

| Path | Phase | Type |
|------|-------|------|
| `server/src/db/pa-schema.js` | 0 | DB Migration |
| `server/src/routes/personal-assistant.js` | 0 | API Routes |
| `agents/personal-assistant/soul.md` | 0 | Agent Packet |
| `agents/personal-assistant/user.md` | 0 | Agent Packet |
| `agents/personal-assistant/memory.md` | 0 | Agent Packet |
| `agents/personal-assistant/skills.md` | 0 | Agent Packet |
| `.agents/skills/pa-calendar.md` | 2 | Agent Skill |
| `.agents/skills/pa-email.md` | 3 | Agent Skill |
| `.agents/skills/pa-fitness.md` | 4 | Agent Skill |
| `.agents/skills/pa-social.md` | 5 | Agent Skill |
| `.agents/skills/pa-kanban.md` | 6 | Agent Skill |
| `client/assets/pa-shared.js` | 0 | Shared JS |
| `client/assets/pa-shared.css` | 0 | Shared CSS |
| `client/pa-overview.html` | 1 | Page |
| `client/pa-calendar.html` | 2 | Page |
| `client/pa-email.html` | 3 | Page |
| `client/pa-fitness.html` | 4 | Page |
| `client/pa-social.html` | 5 | Page |
| `client/pa-tasks.html` | 6 | Page |
| `server/src/services/email-connector.js` | 3 | Service |
| `server/src/services/email-sync.js` | 3 | Service |
| `server/src/services/image-generator.js` | 5 | Service |
| `tests/server/pa-foundation.test.js` | 0 | Test |
| `tests/server/pa-calendar.test.js` | 2 | Test |
| `tests/server/pa-email.test.js` | 3 | Test |
| `tests/server/pa-fitness.test.js` | 4 | Test |
| `tests/server/pa-social.test.js` | 5 | Test |
| `tests/server/pa-kanban.test.js` | 6 | Test |

---

## Implementation Contract for External Agent

The implementing agent must follow these rules for every phase.

### Pre-Phase Checklist

1. Read the phase specification in this document completely before writing any code.
2. Verify the previous validation gate passed. If Phase N-1 gate has unchecked items, fix those before starting Phase N.
3. Pull latest from the repo and run `npm test` to confirm a clean baseline.
4. Create a git branch: `pa/phase-{N}-{short-name}` (e.g., `pa/phase-2-calendar`).

### During-Phase Rules

1. Never modify existing working routes or pages unless the phase specification explicitly requires it.
2. Register all new agents, programs, and routes in the correct registry files before implementing logic.
3. Write tests alongside implementation, not after. Each API route must have at least one happy-path and one error-path test.
4. Use the existing SQLite database instance from `server/src/db/init.js`. Do not create separate database files.
5. All client-side JavaScript must be vanilla JS. No npm packages for the browser. CDN-loaded libraries (Chart.js) are permitted.
6. Commit after each logical sub-task (e.g., "add calendar schema", "add calendar API routes", "add calendar page").

### Post-Phase Protocol

1. Run the full test suite: `npm test`. All tests must pass, including all prior phases.
2. Run through every item in the Validation Gate checklist. Mark each item as passed or document the failure.
3. If any gate item fails, fix it before proceeding. Do not skip gate items.
4. Merge the phase branch into main only after the gate is fully passed.
5. Tag the merge commit: `pa-phase-{N}-complete`.

### Error Recovery

If a phase implementation causes regressions in prior phases, the implementing agent must revert the offending changes and re-approach. The fundamental rule is: a later phase never breaks an earlier phase. If the agent cannot resolve a regression within 3 attempts, it must stop and report the issue for human review.

---

## New Dependencies

| Package | Phase | Purpose |
|---------|-------|---------|
| `imapflow` | 3 | IMAP client for reading email from cPanel Roundcube |
| `nodemailer` | 3 | SMTP client for sending email through cPanel |
| `chart.js` (CDN) | 4 | Client-side charting for fitness and social dashboards |
| (none new) | 0,1,2,6 | All other phases use only existing Fastify + better-sqlite3 stack |

---

*End of Personal Agent Development Plan — Version 1.0*
