# Rollback And Repair

## Current Baseline

Personal Assistant is currently scaffolded, not live as a full V1 runtime.

That means the rollback baseline is primarily:

- current registries
- current agent packets
- current project-catalog entry
- current placeholder module folders

## Before V1 Integration

Before enabling V1 runtime work in the main project, preserve:

- `.data/control-plane.sqlite`
- `server/src/db/init.js`
- `server/src/lib/project-catalog.js`
- `agents/registry.json`
- `programs/registry.json`
- `agents/personal-assistant/`
- `client/pages/` and `client/assets/` surfaces that will be touched

## Repair-First Rule

If a V1 integration breaks:

- control-plane boot
- registry loading
- `/projects/personal-assistant`
- `/pa` pages
- `/api/pa/*`

then attempt one bounded repair cycle first.

If the bounded repair cycle does not restore a working state, revert to the preserved baseline.

## Email Boundary Reminder

Mailbox and cPanel changes are outside the local code rollback boundary. Those must be tracked separately through operator packets.
