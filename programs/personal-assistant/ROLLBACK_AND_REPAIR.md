# Rollback And Repair

## Current Baseline (Updated 2026-03-14)

Personal Assistant V1 is live. All five modules are backed by local SQLite and accessible at `/pa/*`.

The rollback baseline is:

- `server/src/db/init.js` — contains `PA_SCHEMA` and `db.pa.*` methods
- `server/src/routes/pa.js` — all `/api/pa/*` route handlers
- `server/src/app.js` — `paRoutes` import/register and `DELIVERED_PAGES` entries for all 6 PA pages
- `server/src/lib/project-catalog.js` — Personal Assistant definition with live application surfaces
- `client/pages/pa*.html` — 6 delivered pages (pa.html, pa-tasks.html, pa-calendar.html, pa-email.html, pa-social.html, pa-fitness.html)
- `agents/personal-assistant/personal-assistant-master/memory.md` — V1 status entry
- `programs/personal-assistant/CHANGELOG.md` — Phase 1–6 rollout log

## Before Any Structural Change To V1

Before making structural changes to the V1 implementation, preserve:

- `.data/control-plane.sqlite` (contains live PA data)
- `server/src/db/init.js`
- `server/src/routes/pa.js`
- `server/src/lib/project-catalog.js`
- `agents/registry.json`
- `programs/registry.json`
- `agents/personal-assistant/`
- `client/pages/pa*.html`

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
