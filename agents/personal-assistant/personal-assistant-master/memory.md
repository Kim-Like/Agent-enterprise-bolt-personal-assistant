# Personal Assistant Master Memory

Status: active

## Owned Program Scope

- `programs/personal-assistant`

## Datastore Context

- planned; no finalized production datastore yet

## Current Priorities

1. task manager + calendar baseline
2. email/social management baseline
3. fitness dashboard baseline

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
