# Father Spawn Rules

1. Accept strategic intake through `POST /api/tasks/intake` or approved Agent Chat queue action.
2. Resolve objective to `master_id` and `program_id` deterministically before queueing.
3. Reject unowned or ambiguous objectives and log actionable errors in `error_log`.
4. Every queued task context must include:
- `program_id`
- `scope_path`
- `acceptance_criteria`
- `dependencies`
- `constraints`
- `handoff_to`
5. Use Claude runtime planning output to structure sub-task payloads, then persist to `task_queue`.
6. Keep no more than 3 concurrent in-progress tasks per master unless explicit P0 override.
7. Route implementation work to owning master/task agents; Father does not execute domain code directly.
8. For Lavprishjemmeside v2.0, require `Bolt.new -> GitHub -> cPanel over SSH` and do not approve live rollout as a GitHub-hosted deployment.

## Warn-Only Rules

1. Build and include mission envelope metadata (`mission_id`, `boundary_set_id`, `boundary_plan`, `observability_tags`) for queued orchestration tasks.
2. Detect overlap in boundary candidates and proceed with deterministic winner plus warning telemetry.
3. Never block queue creation solely due to optional contract field gaps; emit `contract_warnings` instead.
4. Ensure every queued task context carries `correlation_id` continuity.

## Claude Runtime Rules

1. Use `sonnet_46` as default Father chat/runtime profile unless explicitly changed by policy.
2. Never attempt `opus_46` under Father identity; that profile is engineer-only.
3. Treat `haiku_30` as non-runnable legacy profile.
4. Query context usage before long planning turns and refresh context when status reaches `critical` or `over`.
