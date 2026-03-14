# Agent Enterprise Introduction

`Agent Enterprise` is the current control-plane repo. It replaces the older multi-process `AI-Enterprise` setup with one same-origin Node.js application that serves the operator UI, registry APIs, workboard, chat workspace, and portfolio/project views from a single process.

This repo is already useful as a live control plane, but it is still a rebuild in progress. The current verified baseline is:

- 42 agents in `agents/registry.json`
- 21 programs in `programs/registry.json`
- 3 delivered pages and 11 prototype or alias routes
- SQLite-backed runtime, task, chat, and learning state in `.data/control-plane.sqlite`
- 46 passing server tests from `npm test`

## What Lives Here

- `agents/` holds the root, master, and task agent packets plus `registry.json`.
- `programs/` holds active apps, remote manifests, hold surfaces, and stub scaffolds.
- `server/` is the Fastify control plane.
- `client/` holds the delivered static HTML pages and shared browser assets.
- `docs/` holds remote-estate runbooks and operating contracts.
- `scripts/` holds local startup and SSH-first maintenance commands.
- `.data/` holds the live SQLite database.
- `.agents/skills/` holds project-local Codex skills such as `product-manager-skills`.

## Start the Server

Prerequisites:

- Node.js `>=20.18.0`
- `npm`
- optional: `tailscale`
- optional: Claude CLI or `ANTHROPIC_API_KEY` if you want live LLM responses

From the repo root:

```bash
cd "/Users/IAn/Agent/Agent Enterprise"
npm install
npm run dev
```

Stable start:

```bash
cd "/Users/IAn/Agent/Agent Enterprise"
./scripts/start.sh
```

Important environment note:

- The Node server does not auto-load `.env.local` or `.env`.
- `scripts/start.sh` and `scripts/tailscale-serve.sh` also do not source env files.
- If you need custom env values, source them before starting the server:

```bash
cd "/Users/IAn/Agent/Agent Enterprise"
cp config/env.example .env.local
set -a
source .env.local
set +a
npm run dev
```

Default local origin when no env overrides are exported:

- `http://127.0.0.1:3000`

Verification after boot:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/meta
npm test
```

## Start Without LLM

For maintenance, inventory, docs work, registry edits, and remote SSH checks, you do not need a live LLM backend.

- The server boots without `ANTHROPIC_API_KEY`.
- The UI and inventory routes work without Claude CLI auth.
- Chat surfaces are safest in maintenance mode if you force simulated replies:

```bash
export DEFAULT_MODEL_PROVIDER=simulated
npm run dev
```

If you do want live model responses later:

- `DEFAULT_MODEL_PROVIDER=claude` uses the local Claude CLI OAuth session.
- `DEFAULT_MODEL_PROVIDER=anthropic` uses `ANTHROPIC_API_KEY` against `https://api.anthropic.com`.

## Tailscale Sharing

The wrapper script starts the server locally and forwards it through Tailscale Serve:

```bash
cd "/Users/IAn/Agent/Agent Enterprise"
./scripts/tailscale-serve.sh
```

Notes:

- default local target: `http://127.0.0.1:3000`
- default HTTPS port: `443`
- the public Tailscale URL depends on the machine and tailnet; it is not hardcoded in the repo

## Local URLs

Base URL:

- `http://127.0.0.1:3000`

Delivered pages:

- `http://127.0.0.1:3000/`
- `http://127.0.0.1:3000/agents`
- `http://127.0.0.1:3000/workboard`

Prototype and alias pages still wired into the live app:

- `http://127.0.0.1:3000/overview`
- `http://127.0.0.1:3000/programs`
- `http://127.0.0.1:3000/kanban`
- `http://127.0.0.1:3000/projects`
- `http://127.0.0.1:3000/projects/:projectId`
- `http://127.0.0.1:3000/chat`
- `http://127.0.0.1:3000/chat/:agentId`
- `http://127.0.0.1:3000/01-agent-overview.html`
- `http://127.0.0.1:3000/02-kanban.html`
- `http://127.0.0.1:3000/03-program-visualisation.html`
- `http://127.0.0.1:3000/04-project-overview.html`
- `http://127.0.0.1:3000/05-agent-chat.html`

Known project detail routes:

- `http://127.0.0.1:3000/projects/ian-agency`
- `http://127.0.0.1:3000/projects/artisan`
- `http://127.0.0.1:3000/projects/baltzer`
- `http://127.0.0.1:3000/projects/lavprishjemmeside`
- `http://127.0.0.1:3000/projects/personal-assistant`
- `http://127.0.0.1:3000/projects/samlino`

## Local API URLs

System and inventory:

- `http://127.0.0.1:3000/health`
- `http://127.0.0.1:3000/api/meta`
- `http://127.0.0.1:3000/api/overview`
- `http://127.0.0.1:3000/api/system-map`
- `http://127.0.0.1:3000/api/agents`
- `http://127.0.0.1:3000/api/agents/:agentId`
- `http://127.0.0.1:3000/api/programs`
- `http://127.0.0.1:3000/api/projects`
- `http://127.0.0.1:3000/api/projects/:projectId`
- `http://127.0.0.1:3000/assets/*`

Workboard and task workflow:

- `http://127.0.0.1:3000/api/kanban`
- `http://127.0.0.1:3000/api/tasks/intake`
- `http://127.0.0.1:3000/api/tasks/:taskId`
- `http://127.0.0.1:3000/api/tasks/:taskId/approve`
- `http://127.0.0.1:3000/api/tasks/:taskId/reject`
- `http://127.0.0.1:3000/api/tasks/:taskId/engineer-transition`

Chat and model workflow:

- `http://127.0.0.1:3000/api/chat/context`
- `http://127.0.0.1:3000/api/chat/threads/:threadId`
- `http://127.0.0.1:3000/api/chat/agents`
- `http://127.0.0.1:3000/api/chat/agents/:agentId/workspace`
- `http://127.0.0.1:3000/api/chat/agents/:agentId/sessions`
- `http://127.0.0.1:3000/api/chat/sessions/:sessionId`
- `http://127.0.0.1:3000/api/chat/sessions/:sessionId/messages`
- `http://127.0.0.1:3000/api/chat/sessions/:sessionId/fork-model`
- `http://127.0.0.1:3000/api/chat/sessions/:sessionId/context`
- `http://127.0.0.1:3000/api/chat/sessions/:sessionId/compact`
- `http://127.0.0.1:3000/api/models/catalog`

Internal-only route:

- `POST /api/tasks/:taskId/engineer-transition` requires `x-control-plane-token` and is not meant for the normal operator UI.

Known contract drift:

- `GET /api/errors` does not exist.
- `GET /api/tasks` does not exist.
- Some project metadata still references those routes as if they are live.

## Remote Estate URLs

SSH authority:

- host: `cp10.nordicway.dk`
- port: `33`
- user: `theartis`
- SSH aliases expected in `~/.ssh/config`: `cp10-lavpris`, `cp10-theartis`

Lavprishjemmeside:

- `https://lavprishjemmeside.dk/`
- `https://lavprishjemmeside.dk/admin/`
- `https://api.lavprishjemmeside.dk/health`
- `https://ljdesignstudio.dk/`
- `https://ljdesignstudio.dk/admin/`
- `https://api.ljdesignstudio.dk/health`

Theartis estate:

- `https://reporting.theartisan.dk/`
- `https://reporting.theartisan.dk/health`
- `https://theartisan.dk/`
- `https://theartisan.dk/wp-json/`
- `https://thirdwave.dk/`
- `https://thirdwave.dk/wp-json/`
- `https://thirdwave.dk/seo-auditor/audit_proxy.php`

Anthropic API base URL:

- `https://api.anthropic.com`

## Maintenance Commands

Local quality checks:

```bash
cd "/Users/IAn/Agent/Agent Enterprise"
npm test
```

Lavpris remote-estate checks:

```bash
npm run lavpris:preflight
npm run lavpris:inventory
npm run lavpris:health
npm run lavpris:repo-status
```

Theartis remote-estate checks:

```bash
npm run theartis:preflight
npm run theartis:inventory
npm run theartis:health
npm run theartis:repo-status
npm run theartis:write-access
```

Important remote-ops note:

- The Lavpris and Theartis shell helpers do source `.env.local` and `.env`.
- They will fail fast if the env files or SSH aliases are missing.

## Current State Summary

What is already working:

- single-process same-origin control plane
- SQLite state store
- registry-backed agent and program APIs
- delivered home, agents, and workboard pages
- chat workspaces with persistent packet memory and learned notes
- project directory APIs and project detail models
- SSH-first inspection tooling for Lavpris and Theartis estates

What is not yet fully promoted:

- most project, chat, and kanban page shells are still tagged as prototype or alias routes
- many agents and programs are still visible-but-inert roadmap surfaces
- remote estates are only partially automated and remain policy-constrained
