# Delivery Runbook

## Scope

Standard execution flow for all Engineer-led changes in Agent Enterprise and its governed remote estates.

## Pre-Work Checklist

1. Confirm objective, owning agent, and target program or estate when applicable.
2. Confirm working directory is `/Users/IAn/Agent/Agent Enterprise`.
3. Read latest `engineer/MEMORY.md` and `father/MEMORY.md`.

## Implementation Flow

1. Apply code/doc changes.
2. Run tests:
   - `npm test`
3. Run core endpoint checks:
   - `/health`
   - `/api/meta`
   - `/api/agents`
   - `/api/system-map`
   - `/api/kanban` when task flow changed
4. Validate queue contract for any new tasks.
5. If the change touches a remote estate, run the relevant `lavpris:*` or `theartis:*` scripts plus SQL or HTTP checks.
6. Update memory/context docs when behavior changes.

## Runtime Verification

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
curl -s http://127.0.0.1:3000/health
curl -s http://127.0.0.1:3000/api/meta
sqlite3 .data/control-plane.sqlite "PRAGMA journal_mode;"
```

Expected journal mode: `wal`

## Rollback

1. Revert code/docs in git where possible.
2. Restart service and recheck endpoints.
3. Confirm SQLite integrity, queue readability, and remote estate health if affected.

## Definition of Done

- tests passing
- endpoints healthy
- remote SSH, SQL, or health checks complete when applicable
- routing/ownership intact
- docs/memory updated
- no unmanaged changes outside canonical root
