# Engineer Architecture Notes

## Mission

Engineer owns platform reliability, integration integrity, remote-estate operability, and cross-domain delivery quality for Agent Enterprise.

## System Layers

1. API Layer
- Fastify routes for health, metadata, agents, projects, programs, work, chat, and system-map surfaces.

2. Orchestration Data Layer
- SQLite `control-plane.sqlite` with WAL mode.
- Tasks, task events, chat threads, context snapshots, agent runtime state, and learned memory as control-plane source of truth.

3. Agent Layer
- Father -> Masters -> Specialists.
- Engineer is escalation lead and platform authority.

4. Program Layer
- Consolidated domain codebases in `programs/`.

5. Integration Layer
- WordPress/cPanel MySQL, hosted Node.js cPanel applications, Shopify, Brevo, Billy API, and datastore exit work.

## Critical Data Contracts

- Task lifecycle is structured through:
- `POST /api/tasks/intake`
- `POST /api/tasks/:taskId/approve`
- `POST /api/tasks/:taskId/reject`
- `POST /api/tasks/:taskId/engineer-transition`

- Chat and handoff continuity is structured through:
- `GET /api/chat/agents/:agentId/workspace`
- `GET /api/chat/sessions/:sessionId/context`
- `POST /api/chat/sessions/:sessionId/compact`

## Runtime and Chat Context Architecture

- Runtime visibility: `/health`, `/api/meta`, `/api/agents`, `/api/system-map`
- Agent workspaces: `GET /api/chat/agents/:agentId/workspace`
- Session context: `GET /api/chat/sessions/:sessionId/context`
- Carryover compaction: `POST /api/chat/sessions/:sessionId/compact`
- Model catalog: `GET /api/models/catalog`

## Ownership Model

- Agent ownership is defined in `agents/registry.json`.
- Program classification is defined in `programs/registry.json`.
- Father must not intake work without a clear owning agent and real scope.

## Core Engineer Sub-Personas

- `platform-reliability-task`
- `integration-architecture-task`
- `data-observability-task`
