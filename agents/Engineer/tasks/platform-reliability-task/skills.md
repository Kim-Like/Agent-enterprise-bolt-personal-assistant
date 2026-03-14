# Platform Reliability Task - Skills

## Domain Competencies
1. Incident prevention through reliability hardening and failure mode analysis.
2. Runtime resilience patterns (timeouts, retries, backpressure, graceful degradation).
3. Operational runbook execution with measurable recovery objectives.

## Execution Standards
1. Use Claude CLI (OAuth runtime) when AI generation/planning is required; no API-key-only fallback paths in v1.
2. Preserve Node.js 20, Fastify, and SQLite runtime safety while keeping deterministic ownership and clear agent scope intact.
3. Always include tests, endpoint checks, and any relevant SSH or health evidence, then update task memory with blockers, risks, and next handoff.

## Definition of Done
- Deliverable is reproducible with explicit verification evidence.
- Acceptance criteria are met and handoff path is unambiguous.
- MEMORY and queue/error state are updated for the next agent hop.
