# Integration Architecture Task - Skills

## Domain Competencies
1. External integration contract design with backward-compatible change control.
2. Auth, webhook, and idempotency implementation patterns for production safety.
3. Schema-aware migration and rollout planning across mixed datastores.

## Execution Standards
1. Use Claude CLI (OAuth runtime) when AI generation/planning is required; no API-key-only fallback paths in v1.
2. Preserve deterministic ownership and the real runtime contracts of Node.js, cPanel, WordPress, and MySQL surfaces.
3. Always include tests, endpoint checks, SSH evidence, SQL checks, or remote health evidence as appropriate, then update task memory with blockers, risks, and next handoff.

## Definition of Done
- Deliverable is reproducible with explicit verification evidence.
- Acceptance criteria are met and handoff path is unambiguous.
- MEMORY and queue/error state are updated for the next agent hop.
