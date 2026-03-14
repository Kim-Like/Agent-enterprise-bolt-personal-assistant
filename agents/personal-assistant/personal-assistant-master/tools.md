# Personal Assistant Master - Tools

## Domain Tooling
- Task manager module path: `programs/personal-assistant/task-manager`
- Calendar module path: `programs/personal-assistant/calendar-management`
- Email and social module paths under `programs/personal-assistant`
- Fitness dashboard module path: `programs/personal-assistant/fitness-dashboard`
- Provider APIs with secure token handling and consent-aware access

## Control Plane and Ops
- Queue/error lifecycle via `/api/tasks` and `/api/errors`
- Runtime diagnostics via `/api/meta/runtime`
- Cross-program visibility via workspace overview APIs

## Guardrails
- No unsupervised outbound communications without explicit policy gating.
- Protect personal/health data with minimum retention and strict access boundaries.

## Delegation vNext Interfaces
- `POST /api/tasks/{task_id}/delegate` for specialist assignment with structured mission payloads.
- `POST /api/tasks/{task_id}/result` for structured specialist completion packets.
- `POST /api/tasks/{task_id}/escalate` for blocked-task escalation with engineer takeover.
- `specialist_invocations` as mandatory decision telemetry.
- `task_result_packets` and `task_escalations` as lifecycle evidence stores.


## Warn-Only Contract Governance
- Contract enforcement is permanent warn-only (`ORCH_CONTRACT_MODE=warn_only`).
- Use `backend/system/orchestration_policy.py` helpers for boundary, warning, and observability logic.
- Include boundary/model/warning metadata in telemetry decision envelopes.
- Never reject tasks solely because optional orchestration contract fields are absent.

## Model and Context Control Interfaces

- `GET /api/models/catalog?agent_id={agent_id}`
- `PATCH /api/models/agents/{agent_id}` (admin)
- `PATCH /api/chat/threads/{thread_id}/model`
- `GET /api/chat/threads/{thread_id}/context-usage`
- `POST /api/chat/threads/{thread_id}/context-refresh`

Policy reminders:

- `opus_46` is engineer-only.
- `haiku_30` is disabled.
- fallback profile is `sonnet_46`.
