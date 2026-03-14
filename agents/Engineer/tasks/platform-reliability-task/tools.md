# Platform Reliability Task - Tools

## Primary Tooling
- Fastify runtime, Node.js process controls, and SQLite WAL discipline.
- Logs, health routes, and error telemetry for incident triage.
- Tailscale network path validation for remote operator access.
- SSH and terminal checks for remote cPanel estates when runtime incidents cross the control-plane boundary.

## Control Plane and Verification
- Control-plane endpoints: `/health`, `/api/meta`, `/api/agents`, `/api/kanban`, `/api/system-map`.
- Chat/runtime inspection: `/api/chat/agents/:agentId/workspace`, `/api/chat/sessions/:sessionId/context`.
- Default local access: `http://127.0.0.1:3000`.

## Security and Reliability Guardrails
- Never hardcode secrets; rely on `.env` and environment injection.
- Validate the real task and runtime state: task id, source agent, request type, stage, approval state, and the affected endpoint or estate.
- Escalate cross-domain security/reliability incidents to Engineer with error-log traceability.
