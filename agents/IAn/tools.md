# Father Agent - Tools

## Control Plane Interfaces

- Fastify APIs: `/health`, `/api/meta`, `/api/tasks/intake`, `/api/tasks/:taskId`, `/api/agents`, `/api/system-map`, `/api/programs`
- Workspace APIs: `/api/chat/agents/:agentId/workspace`, `/api/chat/sessions/:sessionId/context`, `/api/chat/*`
- SQLite orchestration DB `.data/control-plane.sqlite` in WAL mode for queue, event, session, and learning state

## Prompt and Runtime Tooling

- Claude runtime subprocess tooling (`CLAUDE_BINARY`, model profile settings)
- Agent packet loading from `soul.md`, `user.md`, `memory.md`, `heartbeat.md`, `skills.md`, and `ARCHITECTURE.md`
- Runtime diagnostics via `/api/meta` and chat workspace views

## Claude Model and Context APIs

- `GET /api/models/catalog?agent_id={agent_id}`
- `PATCH /api/models/agents/{agent_id}` (admin key)
- `PATCH /api/chat/threads/{thread_id}/model`
- `GET /api/chat/threads/{thread_id}/context-usage`
- `POST /api/chat/threads/{thread_id}/context-refresh`

## Operational Tooling

- Server run command: `npm run dev` or `npm start`
- Health checks: `/health` and `/api/meta`
- Access paths: `http://127.0.0.1:3000`, `/workboard.html`, and `/chat/:agentId`

## Governance Constraints

- Canonical root: `/Users/IAn/Agent/Agent Enterprise`
- `.data/control-plane.sqlite` is orchestration-only; business data stays in app-native datastores
- Never bypass ownership mapping or queue context contract keys
- Lavprishjemmeside v2.0 deploys follow `Bolt.new -> GitHub -> cPanel over SSH`; GitHub is a sync surface, not the live deployment host

## vNext Governance Surfaces

- Delegation contracts:
- `POST /api/tasks/{task_id}/delegate`
- `POST /api/tasks/{task_id}/result`
- `POST /api/tasks/{task_id}/escalate`
- Stack coherence registry: `backend/config/stack_profiles.json`
- Escalation and result ledgers:
- `task_escalations`
- `task_result_packets`
- Decision telemetry ledger:
- `specialist_invocations` with route/delegate/compress/escalate/chat scope tagging

## Warn-Only Contract Governance

- Global mode: `ORCH_CONTRACT_MODE=warn_only`.
- Boundary source of truth: `backend/config/orchestrator_boundary_matrix.json`.
- Shared helper module: `backend/system/orchestration_policy.py`.
- Warning outputs are expected in API responses and persisted in telemetry decision payloads.
- Missing contract fields should never block delegation by themselves.
- Triaging key: use `correlation_id` across `task_queue`, `task_result_packets`, `task_escalations`, and `specialist_invocations`.

## Claude Policy Constraints

- `opus_46` is restricted to `engineer` identity.
- `haiku_30` remains disabled by policy.
- Denied profile requests must degrade gracefully to `sonnet_46` with warning telemetry.
