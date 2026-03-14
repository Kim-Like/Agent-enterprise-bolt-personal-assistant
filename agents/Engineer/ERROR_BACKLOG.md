# Engineer Error Backlog

Snapshot date: `2026-02-28`

## Open Backlog

1. `PlannerUnavailable` warnings
- Source: `father.planner`
- Cause: Claude CLI/OAuth unavailable in some runs
- Action: validate `claude` binary path and auth state for deterministic planner behavior

2. Legacy runtime 500 records
- Source: historical `/api/execute` failures before fallback patch
- Action: keep for audit or mark resolved after confirming stable operation

3. External datastore config gaps
- Source: `/api/datastores/verify`
- Status: multiple `missing_env`
- Action: populate env keys and re-verify

## Resolved Baseline Issues

- Path sprawl outside canonical root
- Missing program/datastore registry APIs
- Missing ownership-linked task context keys
- Non-WAL database mode concerns

## Triage Protocol

1. Reproduce quickly.
2. Capture exact endpoint, stack trace, and context JSON.
3. Patch with test coverage.
4. Mark resolved in `error_log` with note.
