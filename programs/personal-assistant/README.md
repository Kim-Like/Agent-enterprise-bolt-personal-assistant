# Personal Assistant

Canonical V1 planning and handoff pack for the Personal Assistant suite inside Agent Enterprise.

## Current State

- Program is already visible in the control plane registry.
- Master and task agents already exist as planned, non-executing packets.
- Module folders exist, but they are mostly scaffolds and notes.
- There is no finished V1 runtime yet.

## What V1 Means

V1 is not five disconnected apps. It is one Agent Enterprise-native personal operations suite with:

- one shared SQLite data model
- one same-origin Fastify route family under `/api/pa/*`
- one suite shell under `/pa`
- grouped execution lanes matching the current master-agent structure
- explicit operator handoff for cPanel, mailbox, IMAP, SMTP, and secret work

## Read Order

1. `README.md`
2. `introduction.md`
3. `CHANGELOG.md`
4. `EXTERNAL_AGENT_INSTRUCTIONS.md`
5. `requirements.md`
6. `design.md`
7. `tasks.md`
8. `STYLING_GUIDELINES.md`
9. `OPERATOR_HANDOFF_CONTRACT.md`
10. `ROLLBACK_AND_REPAIR.md`
11. `DOCUMENT_AUTHORITY_MAP.md`

## Folder Map

- `task-manager/`
- `calendar-management/`
- `email-management/`
- `social-media-management/`
- `fitness-dashboard/`
- `personal-agent-plan.md`
  Historical/source planning input. Useful context, but not execution authority.

## Important Integration Truth

Most implementation work for this program will not live only inside `programs/personal-assistant/`.

Real V1 integration will also touch:

- `server/src/db/init.js`
- `server/src/routes/`
- `server/src/lib/project-catalog.js`
- `client/pages/`
- `client/assets/`
- `agents/registry.json`
- `programs/registry.json`
- `agents/personal-assistant/`

This folder is the planning and handoff authority, not the only future code location.

## Operator Boundary

Bolt or any external agent must not invent alternative infrastructure for:

- cPanel mailbox operations
- Roundcube / IMAP / SMTP credentials
- SSH changes on `cp10.nordicway.dk`
- production env injection
- live database changes outside documented operator packets

Those items must be handed back through `OPERATOR_HANDOFF_CONTRACT.md`.
