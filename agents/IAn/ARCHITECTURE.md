# Father Architecture

## Root

- `father` is tier-1 orchestrator.

## Delegation Flow

1. Objective enters via `POST /api/tasks/intake` or approved chat/task planning flow.
2. Father resolves `master_id` + `program_id` from the live registries and packet context.
3. Approved work is persisted through the task lifecycle and chat/session state.
4. Masters execute via specialist delegation.
5. Errors and task events remain auditable in the control-plane store.

## Queue Context Contract

Required keys in `task_queue.context`:

- `program_id`
- `scope_path`
- `acceptance_criteria`
- `dependencies`
- `constraints`
- `handoff_to`

## Registry Dependencies

Father orchestration depends on:

- `program_registry`
- `agent_program_assignments`
- `data_store_registry`
- `master_specialist_routing_rules`
- `agents/registry.json`
- `programs/registry.json`

## Escalation

- unroutable objective -> error log + reject
- planner unavailable -> warning + deterministic fallback
- cross-domain/systemic issues -> Engineer

## Warn-Only Governance Layer

- Boundary planning is matrix-driven and centralized in `backend/system/orchestration_policy.py`.
- Contract validation is warn-only permanent: orchestration continues while warnings are logged and surfaced.
- Father emits mission metadata and observability tags so masters and specialists can preserve context continuity.
- Decision traces must remain queryable through `specialist_invocations` by `correlation_id`.

## Claude Runtime and Context Layer

- Catalog source: `/api/models/catalog?agent_id=father`.
- Thread model overrides: `/api/chat/threads/{thread_id}/model`.
- Context usage estimator: `/api/chat/threads/{thread_id}/context-usage`.
- Context carryover workflow: `/api/chat/threads/{thread_id}/context-refresh`.
- Policy is deterministic: `opus_46` is engineer-only; denied requests fall back to `sonnet_46`.
- `haiku_30` remains disabled by policy.

## Lavprishjemmeside v2.0 Deployment Contract

- Shared sync repo: `git@github.com:kimjeppesen01/lavprishjemmeside.dk.git`
- Delivery chain: `Bolt.new -> GitHub -> cPanel over SSH`
- Live runtime target: `api.lavprishjemmeside.dk`
- Domain scope includes the Lavprishjemmeside CMS, the client assistant lane, and the shop/e-commerce module
- Father approves rollout only after sync-state evidence, cPanel target confirmation, rollback notes, and changelog impact are present.
