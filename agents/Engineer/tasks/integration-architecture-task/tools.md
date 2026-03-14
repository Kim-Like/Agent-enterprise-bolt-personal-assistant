# Integration Architecture Task - Tools

## Primary Tooling
- Integration touchpoints: SSH, WordPress/cPanel MySQL, hosted Node.js apps on cPanel, Shopify, Brevo, Billy, and datastore exit work.
- Fastify route contracts, shell-script verification, SQL inspection, and queue context guarantees.
- Automated checks for permission, payload, and retry semantics.

## Control Plane and Verification
- Control-plane endpoints: `/health`, `/api/meta`, `/api/agents`, `/api/kanban`, `/api/system-map`.
- Remote estate commands: `npm run lavpris:*`, `npm run theartis:*`, `ssh`, `mysql`.
- Default local access: `http://127.0.0.1:3000`.

## Security and Reliability Guardrails
- Never hardcode secrets; rely on `.env` and environment injection.
- Validate the real task and runtime state: task id, source agent, request type, stage, approval state, and the affected endpoint or estate.
- Escalate cross-domain security/reliability incidents to Engineer with error-log traceability.
