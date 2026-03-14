# Engineer Agent - Tools

## Core Runtime

- Node.js >= 20.18.0
- npm
- Fastify control plane (`npm run dev`, `npm start`)
- sqlite3 CLI
- mysql client
- bash + ssh
- claude CLI
- git, jq, curl, lsof, rg

## Control-Plane APIs

- `/health`
- `/api/meta`
- `/api/agents`
- `/api/kanban`
- `/api/tasks/:taskId`
- `/api/tasks/intake`
- `/api/tasks/:taskId/approve`
- `/api/tasks/:taskId/reject`
- `/api/tasks/:taskId/engineer-transition`
- `/api/system-map`
- `/api/programs`

## Chat and Context Inspection APIs

- `GET /api/chat/agents`
- `GET /api/chat/agents/:agentId/workspace`
- `GET /api/chat/sessions/:sessionId/context`
- `POST /api/chat/sessions/:sessionId/compact`
- `GET /api/models/catalog`

## Operations Utilities

- local log files under `/tmp` when needed
- `npm test`
- `sqlite3 .data/control-plane.sqlite`
- `programs/lavprishjemmeside/CHANGELOG.md` must be updated for Lavprishjemmeside CMS or client-site management changes

## UI/UX Design Tooling

- Shared Codex skill: `~/.codex/skills/ui-ux-pro-max/SKILL.md`
- Design-system search tool: `python3 ~/.codex/skills/ui-ux-pro-max/scripts/search.py`
- Persist design outputs in repo-local `design-system/`

## Remote Estate Operations

- `npm run lavpris:preflight`
- `npm run lavpris:inventory`
- `npm run lavpris:health`
- `npm run lavpris:repo-status`
- `npm run lavpris:mirror-pull`
- `npm run lavpris:sync-status`
- `npm run lavpris:path-health`
- `npm run lavpris:rollout-status`
- `npm run lavpris:release-health`
- `npm run theartis:preflight`
- `npm run theartis:inventory`
- `npm run theartis:health`
- `npm run theartis:repo-status`
- `npm run theartis:write-access`
- shared Lavprishjemmeside sync repo: `git@github.com:kimjeppesen01/lavprishjemmeside.dk.git`
- approved upstream builder surface: Bolt.new
- live Lavprishjemmeside rollout target: cPanel over SSH, not GitHub-hosted deployment

## Integration Surfaces

- WordPress/WooCommerce on cPanel
- cPanel MySQL and `wp-config.php`-derived WordPress DB tuples
- Hosted Node.js applications on cPanel
- Remote repo/site-root SSH diagnostics and write access checks
- Artisan reporting cPanel MySQL (`ARTISAN_REPORTING_DB_*`)
- migration-hold datastore replacement work for Baltzer TCG
- Shopify
- Brevo
- Billy API

## Security/Quality Constraints

- explicit CORS origins only
- no secrets in committed markdown/code
- preserve deterministic ownership and queue contracts
- do not treat remote cPanel writes as casual shell work; every write path needs verification and rollback awareness

## Orchestration vNext Interfaces

- registry-driven enablement and health state from `agents/registry.json`
- agent workspaces and learned memory surfaced through `/api/chat/agents/:agentId/workspace`
- task routing through `/api/tasks/intake`, approval, and engineer transitions
- chat compaction and carryover through `/api/chat/sessions/:sessionId/compact`

## Autonomy Authorization

- remote write work requires explicit operator intent, a bounded command set, and post-change verification evidence.
