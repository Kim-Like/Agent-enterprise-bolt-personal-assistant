# Personal Assistant Master Memory

Status: active

## Owned Program Scope

- `programs/personal-assistant`

## Datastore Context

- V1 live: local SQLite (`better-sqlite3`) via `db.pa.*` namespace in the control-plane process
- 9 tables: `pa_configuration`, `pa_tasks`, `pa_calendar_events`, `pa_email_accounts`, `pa_email_cache`, `pa_email_audit`, `pa_social_drafts`, `pa_fitness_logs`, `pa_fitness_goals`
- All tables carry `IF NOT EXISTS` guards and covering indexes for common query shapes

## V1 Implementation Status (2026-03-14)

- Phases 1–6 complete
- All 5 modules live: `/pa`, `/pa/tasks`, `/pa/calendar`, `/pa/email`, `/pa/social`, `/pa/fitness`
- REST API: full CRUD under `/api/pa/*`, overview at `/api/pa/overview` with `dailyBriefing` field
- Operator-owned boundaries: email IMAP/SMTP cPanel setup, social publishing tokens, fitness wearable sync

## Current Priorities

1. Phase 7: final QA pass, operator packet completion, and implementation status summary
2. Monitor operator onboarding for email (cPanel mailbox steps) and social (publishing token setup)

## 2026-02-28 Orchestration vNext

- Master now delegates via structured mission envelopes and correlation-aware receipts.
- Specialist outputs are expected through structured result packets (`/api/tasks/{task_id}/result`).
- Blocked execution escalates through structured protocol (`/api/tasks/{task_id}/escalate`).
- Route/delegate/result/escalate decisions are audited in `specialist_invocations`.

## 2026-02-28 Orchestrator Hardening v2 (Warn-Only)

- Master orchestration now aligns on matrix-driven task boundaries with deterministic overlap resolution.
- Contract enforcement remains warn-only permanent (`ORCH_CONTRACT_MODE=warn_only`).
- Delegation/result/escalation flows now carry structured warning metadata for autonomous triage.
- Correlation-first observability is required across route/delegate/result/escalate telemetry.

## 2026-03-01 Claude Control and Continuity

- Master docs now align with model catalog, thread model override, context usage, and context refresh workflows.
- Hard policy alignment recorded: `opus_46` engineer-only, `haiku_30` disabled, `sonnet_46` fallback.
- Context continuity now uses carryover packets with thread lineage instead of oversized single-thread transcripts.

## 2026-03-01 Kanban Governance v1

- Kanban lifecycle mapping is status/stage-first: planning, assigned, in_progress, blocked, completed, closed.
- Task versions (`v1`, `v1.1`, `v2`) are board metadata and do not replace status/execution_stage truth.
- Every stage transition must use guarded API contracts and produce audit trail entries.
- Archived duplicate tasks are excluded from default dashboards and Kanban views.
- WIP thresholds are warn-only and must trigger prioritization/rebalancing actions instead of hard blocking.
