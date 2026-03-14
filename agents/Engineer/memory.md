# Engineer Memory

Snapshot date: `2026-03-13`

## Current System Baseline

- Canonical root: `/Users/IAn/Agent/Agent Enterprise`
- Control-plane DB: `.data/control-plane.sqlite` (WAL)
- Runtime: Node.js 20 + Fastify, single-process, backend-served static pages
- Local start paths: `npm run dev` or `npm start`
- Objective intake: `POST /api/tasks/intake`
- Remote estate verification: `npm run lavpris:*` and `npm run theartis:*`

## Canonical Runtime Note

Older entries below describe pre-rebuild or pre-migration history and are not canonical runtime instructions. Prefer the current baseline above when there is a conflict.

## Implemented Control-Plane Upgrades

- registry tables added:
- `program_registry`
- `data_store_registry`
- `agent_program_assignments`
- `prompt_assets_registry`
- registry APIs added:
- `GET /api/system-map`
- `POST /api/system-map/rescan`
- `GET /api/datastores/verify`
- deterministic ownership routing enforced in Father
- task context contract enforced with required keys
- fallback routing enabled when planner is unavailable

## Canonical Program Paths

- `programs/artisan/*`
- `ssh://theartis@cp10.nordicway.dk/home/theartis/repositories/lavprishjemmeside.dk`
- `ssh://theartis@cp10.nordicway.dk/home/theartis/repositories/ljdesignstudio.dk`
- `programs/ian-agency/contexts/samlino/seo-agent-playground`
- `programs/baltzer/*`
- `programs/personal-assistant`

## Open Operational Gaps

1. External datastore env keys are incomplete in `.env` for some integrations (including artisan reporting cPanel MySQL).
2. Planner availability depends on local CLI/OAuth state.
3. Historical blockers and stale runtime assumptions in older packet notes should be triaged against current task, agent, and workspace state.

## Immediate Next Engineering Priorities

1. Fill missing env keys and re-run `/api/datastores/verify` to reduce `missing_env` statuses.
2. Maintain role-safe write guards for control-plane mutating routes.
3. Keep orchestration and model policy regression coverage green.
4. Keep scripted health bundles and smoke checks current.

## 2026-03-13 Lavprishjemmeside v2.0 Access Verification

1. GitHub SSH access to `git@github.com:kimjeppesen01/lavprishjemmeside.dk.git` is available from this machine.
2. `git ls-remote` resolved remote HEAD at `f4a85fab7ce24ad5c64db19cdd9b5fbfcbc70bae`.
3. A dry-run push to `refs/heads/__codex_permission_check__` succeeded, confirming write permission without creating a branch.
4. cPanel SSH alias `cp10-lavpris` is reachable and both `/home/theartis/repositories/lavprishjemmeside.dk` and `/home/theartis/lavprishjemmeside.dk` are writable.
5. `npm run lavpris:mirror-pull` created the canonical local mirror at `programs/lavprishjemmeside/local-mirror/` and it matches GitHub `main`.
6. `npm run lavpris:sync-status` is now green: GitHub, the local mirror, and the cPanel repo match on `main`, while runtime artifacts remain tolerated.
7. Root-cause note: the earlier `api/package-lock.json` drift came from the default SSH Node `v10` / npm `6` toolchain rewriting the lockfile; package work must use the cPanel Node 22 path or node virtualenv.
8. Live rollout path is `Bolt.new -> GitHub -> cPanel over SSH`; GitHub is a sync surface, not the live deployment host.

## 2026-02-28 Capability Upgrade Log

1. Full markdown audit executed across Father/Engineer/Master assets.
2. Root capability docs upgraded for Father, Engineer, and every domain Master.
3. Task-level `skill.md` and `tool.md` files upgraded to domain-specific execution packs.
4. Regression tests fixed for env-driven admin key behavior.

## 2026-02-28 Engineer Agent vNext Launch

1. Added provider-agnostic model routing (`backend/agent/model_router.py`) with Claude default provider adapter.
2. Expanded task orchestration contracts:
- `POST /api/tasks/{task_id}/delegate` supports v2 mission envelope and delegation receipts.
- Added `POST /api/tasks/{task_id}/result` for structured specialist result packets.
- Added `POST /api/tasks/{task_id}/escalate` for blocked-task escalation workflow.
3. Added telemetry and lifecycle persistence:
- `task_result_packets`
- `task_escalations`
- expanded `specialist_invocations` fields for route/delegate/compress/escalate context.
4. Added autonomous write authorization path with `X-Autonomy-Key` while retaining admin-key path.
5. Added stack profile contract registry in `backend/config/stack_profiles.json`.
6. Added virtual orchestration specialist identity `spec.engineer.orchestration` for FK-safe orchestration telemetry.

## 2026-02-28 Orchestrator Hardening v2 (Warn-Only)

1. Added shared policy module `backend/system/orchestration_policy.py` for boundary planning, overlap detection, warn-only contract warnings, map-reduce quality checks, and coverage validation.
2. Added matrix coverage startup warnings and master readiness helpers.
3. Enriched delegate/result/escalate contracts with warning and boundary metadata while preserving backward compatibility.
4. Standardized decision envelope persistence across routing/delegation/compression/result/escalation scopes.
5. Added ORCH_* defaults in schema seed and expanded orchestration tests for warn-only behavior.

## 2026-03-01 Claude Control + Context Continuity

1. Added profile policy source of truth in `backend/config/claude_model_profiles.json`.
2. Added model policy APIs:
- `GET /api/models/catalog`
- `PATCH /api/models/agents/{agent_id}`
3. Added thread control APIs:
- `PATCH /api/chat/threads/{thread_id}/model`
- `GET /api/chat/threads/{thread_id}/context-usage`
- `POST /api/chat/threads/{thread_id}/context-refresh`
4. Added chat lineage persistence via `chat_thread_carryovers` and continuation columns in `chat_threads`.
5. Policy lock is active: `opus_46` engineer-only, `haiku_30` disabled, `sonnet_46` fallback.

## 2026-03-01 Artisan Reporting Datastore Migration

1. `programs/artisan/reporting.theartisan.dk` state moved from JSON files to dedicated cPanel MySQL tables.
2. Added MySQL-backed state store (`db/mysql.js`, `repositories/*`, `services/reportingStateStore.js`).
3. Added one-shot migration and verification scripts (`db:schema`, `db:migrate`, `db:verify`).
4. Updated control-plane registry and specialist tool bindings to require `ARTISAN_REPORTING_DB_*` env keys.

## 2026-03-01 Artisan Remaining Migration v1

1. Added account snapshot/sync tables and APIs for Billy account ingestion.
2. Added supplier-rule DB governance with API + UI (`/rules`) while preserving existing dashboard endpoints.
3. Refactored categorization precedence to DB supplier rules first, then legacy mapping fallback.
4. Added migration scripts for remaining cutover:
- `accounts:sync`
- `rules:seed`
- `rules:verify`
- `migrate:remaining`

## 2026-03-01 Artisan WordPress Capability Hardening v1

1. Added controlled WordPress operations endpoints:
- `GET /api/programs/artisan-wordpress/inventory`
- `POST /api/programs/artisan-wordpress/ssh-check`
- `POST /api/programs/artisan-wordpress/ops-action`
2. Added deterministic SSH check and ops allowlist services for cPanel runtime.
3. Added `cpanel_ssh_ops` specialist binding for `spec.artisan.wp_b2b` with guarded-write mode.
4. Added orchestration metadata table `artisan_wp_inventory_snapshots`.
5. Added non-programmer intake classification endpoint:
- `POST /api/workspace/artisan/intake-classify`
6. Added first-party The Artisan WordPress docs:
- `DATABASE_MAP.md`
- `B2B_FUNCTION_MAP.md`
- `SAREN_CHILD_THEME_IDENTITY.md`
- `OPERATIONS_RUNBOOK.md`
7. Populated local `.env` WordPress DB host/user/name from live runtime mapping.

## 2026-03-01 Samlino v3 Rewrite

1. Added control-plane-native Samlino route and service layers (`/api/samlino/*`, `/api/programs/samlino-seo-agent-playground/*`).
2. Added Samlino local SQLite runtime utilities and migration path from legacy standalone app DB.
3. Expanded Samlino specialist topology and boundary matrix from coarse SEO-agent scope to workflow-specific specialists.
4. Updated program/application/datastore stack contracts to SQLite-only Samlino architecture.

## Hard Rules

- Do not move app transactional data into `control-plane.sqlite`.
- Do not create active runtime files outside canonical root.
- Do not bypass objective intake/ownership contracts.

## 2026-03-01 Kanban Governance v1

- Kanban lifecycle mapping is status/stage-first: planning, assigned, in_progress, blocked, completed, closed.
- Task versions (`v1`, `v1.1`, `v2`) are board metadata and do not replace status/execution_stage truth.
- Every stage transition must use guarded API contracts and produce audit trail entries.
- Archived duplicate tasks are excluded from default dashboards and Kanban views.
- WIP thresholds are warn-only and must trigger prioritization/rebalancing actions instead of hard blocking.


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: 8e0e3a5f-33e0-42d3-a3e7-2821f705c10b, fa7b9675-a70b-444c-8bc7-405cf954d410


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: f7e49629-8b6a-4ad7-aa8b-4ffbd55237c1, 18e9b823-91b5-4588-81fa-3daecfaba06d


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: 038fd9b6-b360-48b5-af1b-763e8203d034, 81b25b1b-e433-4f7b-a9d5-358d7487f28c


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: f07aa312-d496-40a8-a0d9-242982f97a14, 1b9289b5-0d0c-4b61-a155-1b4b66fdbb0b


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: 8359cc6d-960a-44e9-9c9b-ac2f779ce045, 4e201342-ebbb-48f3-9e96-c95d0c2c0464


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: c0c23f0c-f312-46eb-ab20-57ab92772634, 19a56491-17f7-4149-9d95-32188b61c867


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: 3afd221f-a2b6-494e-a0bd-5c6f64ec0578, de639e3e-adaf-4ffd-a8a2-ed6cb0e5a3c1


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: b93aef41-ce43-4b3a-9072-22efe75a233e, 27cb3a24-e5ee-4b22-8d5e-756822c4783c


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: f376ea2a-7352-478b-a92d-622e18680b09, 22897792-3e69-4748-a815-d3aefa49a5c5


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 4ff9e4f9-2c90-483f-b758-18a64305f874, 90df6051-04ef-4a00-b74e-75926109549e


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 6f0bf5e1-2f97-4525-b5a6-0f74cbc552bc, c013f967-936b-4efd-bd45-dc50e1d2e499


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: fede351d-2054-4682-9c34-caf4a58517e1, f58b317b-d3da-4a9a-b3b7-c7f9573454e3


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: 221c5724-b67a-40f5-8b92-48d8c6843202, fb82733f-e557-4a5a-b59a-36dc6403603d


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: d3b7d9f1-2719-4050-a4ee-5f30025ddf70, 0c94696a-6816-4b84-8a43-42822be78241


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 545f3e9d-f1a7-494e-91b2-d7308e452925, 985610db-711e-4d89-8d86-fc6ec36865cb


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: e93d1fbc-854e-44ef-a501-03043b1ce944, fd56c3b6-7c9b-4001-b009-fdc923b926a1


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: 0ecb86a9-5f9b-4556-9d74-980b6040f9da, 8b79406a-f597-4cc6-a534-a247ac78897d


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: a4275970-b501-4054-b578-70685cc0a298, cf1f9303-cd22-487e-a6d4-51cb1a40f2b7


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: ddbcd427-d6b2-47d0-ba24-c81587e09b12, f5d6cffa-47d0-4ed1-83b4-fcbf3cf89016


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 2c3351ad-beb5-4ed8-bd54-e6dd60ecf198, f1035740-e62b-4a58-b46f-b20809c4eb5a


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: 95422298-f89e-4454-a20a-9d42fa1a0f96, 43ee8fa9-61c3-4b3e-9232-c2196fccd488


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: ffceee33-f8d7-4189-b8d9-cc8e9e2d1f7f, 4342a64c-35cd-47cf-9c3d-9d4362e3d540


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 449b6c92-f324-4125-a68f-c3aa9e334481, 8e355332-77f5-460c-91dc-64125d5015ef


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: 1c173c09-3820-4570-a561-dd52d264ca40, 4d6348c6-5c9f-4241-beaa-9dc9cf5c7353


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: 4237c179-9555-47e3-8f88-8b15aa209863, a83290e6-1a40-4507-af05-80e7175609fd


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: 1015e6f3-33b6-4368-a192-865574809920, 587bde9e-f9fc-4e83-b73a-4d71b40e2fbf


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 22de359e-4b56-4924-b979-d1e66bc166c6, 81e4f09f-b856-47b2-8aa0-63a7cfcf2fca


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: 17657407-07af-4c3b-94ce-baef77d9f4ad, 4f9f34df-2659-482f-8890-dd3378768e52


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: 6e829a71-1bd6-46bb-8ed6-3086875bcd8b, 560b3a9a-e780-4b16-ae7f-2face2945a5b


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: 0aa6b69b-2f66-4181-a772-2fa13cd40e68, 87ab32f5-05ea-42dc-a5c9-76115d9f2e3d


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: a9c219c9-9b41-45cf-8cc1-dfcc447507d9, 8202c2b9-dd14-4bbf-b28c-8575c0038632


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: c7dc86fb-0c19-43c1-9150-72f9220e53fb, 600c00a4-5ba9-47f8-91e8-c991b9d275a0


## Context Reset Test
- reason: context_refresh
- summary: reason=context_refresh; thread=Context Reset Test; user=Prepare rollout checklist; assistant=ack:Prepare rollout checklist
- source_messages: f56b2c75-d9d9-4176-a63e-6a7f9131d9a3, add25a41-71ed-4b0d-b206-c0e191d49d1e


## V2 Chat Library Thread
- reason: pytest_manual
- summary: reason=pytest_manual; thread=V2 Chat Library Thread; user=Review @file:README/Introduction.md before answer; assistant=ok:Review @file:README/Introduction.md before answer
- source_messages: cc0a98e5-5305-4c83-acf1-8633189ef283, 108b6fa5-b5c0-4028-b058-402fe4fbbd61


## Engineer Thread
- reason: thread_archive
- summary: reason=thread_archive; thread=Engineer Thread; user=Plan next sprint; assistant=echo:Plan next sprint
- source_messages: ca139dd4-b763-42aa-9b00-821ca365fe2d, 6dfa9366-4062-43a9-830a-4f42d2415eb3
