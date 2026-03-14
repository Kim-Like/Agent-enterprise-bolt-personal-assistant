# Data and Observability Task - Tools

## Primary Tooling
- SQLite + control-plane tables for operational metrics extraction.
- Dashboard API surfaces and charting data contracts.
- Structured error/event records for root-cause and trend analysis.
- Remote estate health scripts when observability crosses into cPanel-hosted applications.

## Control Plane and Verification
- Control-plane endpoints: `/health`, `/api/meta`, `/api/agents`, `/api/kanban`, `/api/system-map`.
- Chat/runtime inspection: `/api/chat/agents/:agentId/workspace`, `/api/chat/sessions/:sessionId/context`, `/api/chat/sessions/:sessionId/compact`.
- Default local access: `http://127.0.0.1:3000`.

## Security and Reliability Guardrails
- Never hardcode secrets; rely on `.env` and environment injection.
- Validate the real task and runtime state: task id, source agent, request type, stage, approval state, and the affected endpoint or estate.
- Escalate cross-domain security/reliability incidents to Engineer with error-log traceability.
