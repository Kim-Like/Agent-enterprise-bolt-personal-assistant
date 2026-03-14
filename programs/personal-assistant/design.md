# Personal Assistant V1 Design

## System Position

Personal Assistant is a program inside Agent Enterprise, not a standalone app.

That means the design must fit these existing layers:

- control-plane server in `server/`
- static pages in `client/pages/`
- browser assets in `client/assets/`
- registries in `agents/registry.json` and `programs/registry.json`
- project catalog entries in `server/src/lib/project-catalog.js`
- agent packets in `agents/personal-assistant/`

## Runtime Shape

### API

Create one bounded route family:

- `/api/pa/overview`
- `/api/pa/tasks/*`
- `/api/pa/calendar/*`
- `/api/pa/email/*`
- `/api/pa/social/*`
- `/api/pa/fitness/*`

### Pages

Create one suite shell:

- `/pa`

And module pages:

- `/pa/tasks`
- `/pa/calendar`
- `/pa/email`
- `/pa/social`
- `/pa/fitness`

The pages must use the same-origin model already used by the control plane. No external frontend app and no extra frontend server.

## Data Model

All V1 persistent state should live in `.data/control-plane.sqlite`.

Use `pa_*` tables for suite-owned data. Likely groups:

- configuration / account linkage
- tasks and task board data
- calendar events
- email cache / mailbox config metadata
- social drafts / schedule / outcomes
- fitness logs / goals / summaries
- audit or action history where appropriate

Schema changes should remain additive and be integrated through the existing DB init path, not through an unrelated migration framework.

## Agent Model

Keep the existing personal-assistant agent family meaningful:

- `personal-assistant-master`
- `pa-taskmanager-calendar-task`
- `pa-email-social-task`
- `pa-fitness-dashboard-task`

The V1 docs should guide implementation so the UI and API structure match these grouped lanes instead of fighting them.

## External Boundary Design

### Email / Roundcube / cPanel

These are real external boundaries, not things Bolt should replace:

- mailbox creation
- IMAP / SMTP secrets
- Roundcube or cPanel live setup
- SSH execution on `cp10.nordicway.dk`

Bolt may design:

- DB tables
- services
- routes
- UI
- docs
- verification commands

Bolt may not replace missing live access with fake local-only substitutes and call the feature done.

### Fitness Data

V1 should assume:

- import/manual ingestion first
- provider sync later

This avoids overcommitting to Apple Health or wearable APIs before the data model and consent boundaries are stable.

### Social Publishing

V1 should assume:

- planning and schedule model first
- token-backed publishing later

## UI Design Strategy

Use the existing Agent Enterprise design language:

- compact shell
- soft gradients
- glass or semi-transparent cards
- strong typography
- mono labels for diagnostics/stats
- crisp pills, tables, and section headers

Personal Assistant should use the personal-assistant theme already declared in the project catalog:

- accent `#0F766E`
- shell `#134E4A`
- surface `#F0FDFA`

## Rollout Boundary

V1 rollout into the main project should happen in two layers:

1. local integration into `Agent Enterprise`
2. operator-only execution for any cPanel / mailbox / secret setup

The operator contract is defined in `OPERATOR_HANDOFF_CONTRACT.md`.
