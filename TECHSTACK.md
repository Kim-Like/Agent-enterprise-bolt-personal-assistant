# Agent Enterprise Tech Stack

This file is a stack and architecture map for new maintainers and new LLMs. It describes what the repo actually uses now, not what the old `AI-Enterprise` system used.

## Core Runtime

- Node.js `>=20.18.0`
- ESM-only package (`"type": "module"`)
- Fastify `^5.2.1`
- one backend process
- same-origin static page delivery from the backend
- no Vite dev server
- no separate frontend runtime

Runtime entrypoints:

- `npm run dev` -> `node --watch server/src/index.js`
- `npm start` -> `node server/src/index.js`
- `./scripts/start.sh` -> installs deps if needed, then runs `npm start`

## Persistence and Local State

- SQLite via `better-sqlite3 ^11.8.1`
- default database path: `.data/control-plane.sqlite`
- default app data dir: `.data/`

Current schema tables in `server/src/db/init.js`:

- `control_plane_meta`
- `registry_snapshots`
- `runtime_bookmarks`
- `agent_runtime_state`
- `tasks`
- `task_events`
- `chat_threads`
- `chat_messages`
- `chat_context_snapshots`
- `agent_learning_notes`

What the database is used for:

- runtime boot metadata
- agent and program registry snapshots
- agent enablement and health persistence
- task queue and event history
- chat sessions and thread messages
- session compaction snapshots
- continuous-learning notes for master/root agents

## Registry-First Architecture

The control plane is driven by JSON registries, not by scanning the filesystem at runtime.

Authoritative files:

- `package.json`
- `agents/registry.json`
- `programs/registry.json`
- `config/model-profiles.json`

Current verified registry counts:

- agents: 42
- kinds: 1 root, 7 master, 34 task
- programs: 21
- program classes: 4 active, 5 remote, 2 hold, 10 stub

Agent runtime adapters currently in use:

- `registry-only`
- `in-process-function`
- `connector-probe`

## Agent Packet System

Master and root agents now use packet files loaded into chat context and orchestration prompts.

Expected packet set:

- `soul.md`
- `user.md`
- `memory.md`
- `heartbeat.md`
- `skills.md`
- `ARCHITECTURE.md`

Continuous learning does not rewrite those packet files. Instead, new learned notes are stored in SQLite and re-injected into later sessions.

## Frontend Delivery

The UI is deliberately simple:

- static HTML pages
- vanilla JavaScript assets in `client/assets`
- no React
- no TypeScript
- no SPA framework
- same-origin asset serving from `/assets/*`

Current page status:

- delivered pages: `/`, `/agents`, `/workboard`
- prototype or alias shells: `/overview`, `/programs`, `/kanban`, `/projects`, `/projects/:projectId`, `/chat`, raw `01-05` HTML prototypes

Styling/runtime notes:

- shared browser logic lives in `client/assets/*.js`
- delivered pages pull Google Fonts directly
- backend serves HTML and assets; there is no separate frontend build pipeline

## API Surface

Fastify routes are organized under `server/src/routes/`.

Main route groups:

- health: `/health`
- metadata: `/api/meta`
- overview: `/api/overview`
- agents: `/api/agents`, `/api/agents/:agentId`
- programs: `/api/programs`
- projects: `/api/projects`, `/api/projects/:projectId`
- runtime/system topology: `/api/system-map`
- workboard/task flow: `/api/kanban`, task intake and task actions
- chat/session flow: agent workspaces, sessions, messages, compaction
- models: `/api/models/catalog`

Not currently present:

- `GET /api/errors`
- `GET /api/tasks`

Those routes are still referenced by some portfolio metadata and should be treated as contract drift, not live API.

## Model and LLM Layer

Configured model families live in `config/model-profiles.json`:

- `haiku` -> `claude-3-5-haiku-latest`
- `sonnet` -> `claude-sonnet-4-5`
- `opus` -> `claude-opus-4-1`

Context budgets are stored per family:

- haiku: 160k context, 8k reserved reply
- sonnet: 180k context, 12k reserved reply
- opus: 200k context, 16k reserved reply

Supported provider modes:

- `claude`
  - uses the local Claude CLI OAuth session
  - requires a discoverable `claude` binary or `CLAUDE_BINARY_PATH`
- `anthropic`
  - uses the Anthropic Messages API
  - requires `ANTHROPIC_API_KEY`
- any other value, commonly `simulated`
  - forces local simulated replies
  - useful for maintenance and test environments

Important behavior:

- the server still works without any live LLM provider
- chat surfaces degrade to simulated/local mode if no live provider is configured
- the default env example still sets `DEFAULT_MODEL_PROVIDER=claude`

## Remote Operations Stack

This repo also acts as an SSH-first operator layer for remote estates on `cp10.nordicway.dk`.

Remote maintenance technologies explicitly in scope:

- SSH
- cPanel-hosted Node.js
- cPanel-hosted WordPress
- cPanel file and repo topology checks
- MySQL-aware estate operations through cPanel-hosted applications
- repo/status and health probing for remote apps and sites

Current shell helper groups:

- `scripts/lavpris/*`
- `scripts/theartis/*`

Supported commands:

- `npm run lavpris:preflight`
- `npm run lavpris:inventory`
- `npm run lavpris:health`
- `npm run lavpris:repo-status`
- `npm run theartis:preflight`
- `npm run theartis:inventory`
- `npm run theartis:health`
- `npm run theartis:repo-status`
- `npm run theartis:write-access`

Env-backed remote contracts include:

- SSH host/user/port/key
- cPanel Node runtime path
- repo roots for Lavpris CMS, LJ Design Studio, The Artisan, and reporting
- live site roots for WordPress and cPanel applications
- Thirdwave audit-proxy path

## External Surfaces

Known live surfaces referenced by the current operating model:

- `https://lavprishjemmeside.dk/`
- `https://api.lavprishjemmeside.dk/health`
- `https://ljdesignstudio.dk/`
- `https://api.ljdesignstudio.dk/health`
- `https://reporting.theartisan.dk/`
- `https://reporting.theartisan.dk/health`
- `https://theartisan.dk/`
- `https://theartisan.dk/wp-json/`
- `https://thirdwave.dk/`
- `https://thirdwave.dk/wp-json/`
- `https://thirdwave.dk/seo-auditor/audit_proxy.php`
- `https://api.anthropic.com`

## Testing

The repo uses the built-in Node test runner:

- command: `npm test`
- scope: `tests/server/*.test.js`
- current verified count during this audit: 46 passing tests

Coverage focus:

- bootstrap and env loading
- page delivery
- agent registry normalization
- runtime summaries and health routes
- chat workspace behavior
- remote-ops docs and shell helper presence
- workflow/task lifecycle

Known testing gaps:

- no browser E2E suite
- no visual regression suite
- no automated remote estate integration runs in CI from this workspace
- Tailscale runtime validation is still environment-dependent/manual

## What This Repo Deliberately Avoids

These are not part of the current stack, by design:

- no split frontend/backend dev servers
- no Python/FastAPI control-plane runtime
- no automatic `.env.local` loading in the Node bootstrap
- no deploy automation for cPanel estates
- no rollback automation
- no dashboard-triggered arbitrary remote shell execution
- no attempt to boot heavy brownfield hold programs inside the base server
