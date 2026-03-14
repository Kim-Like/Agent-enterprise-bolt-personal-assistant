# Personal Assistant Introduction

## Purpose

Personal Assistant is the internal personal operations suite inside Agent Enterprise. It is intended to help one operator coordinate tasks, calendar, email, social planning, and fitness visibility without breaking the control-plane architecture that already exists.

The suite is not meant to become a separate product stack or a standalone SaaS. It must fit directly into the current Agent Enterprise runtime, registry, project catalog, chat workspace model, and SQLite control-plane data store.

## What Exists Today

Today the suite is visible as a planned surface:

- `personal-assistant` exists in `programs/registry.json`
- `personal-assistant-master` exists in `agents/registry.json`
- grouped task lanes already exist:
  - `pa-taskmanager-calendar-task`
  - `pa-email-social-task`
  - `pa-fitness-dashboard-task`
- project catalog entries and theme values already describe the suite as scaffolded
- module folders exist under `programs/personal-assistant/`

What does not exist yet is the actual V1 runtime: shared schema, route family, pages, sync boundaries, audit logic, and operator handoff packets.

## V1 Outcome

V1 should deliver one coherent suite with:

- `/pa` overview shell
- `/api/pa/*` API family
- SQLite-backed `pa_*` tables
- live module surfaces for:
  - tasks + calendar
  - email operations foundation
  - social planning
  - fitness dashboard
- daily briefings and structured assistant support through the existing Personal Assistant master

## Constraints

V1 must respect these constraints:

- no new SPA framework
- no separate frontend build system
- no shadow database outside `.data/control-plane.sqlite`
- no fake email provider or fake cPanel replacement
- no direct external-agent SSH control over cPanel, Roundcube, or mailbox infrastructure

## Why This Needs A Tailored Plan

The original `personal-agent-plan.md` is a strong source document, but it assumes a cleaner greenfield than the current repo actually offers.

The tailored V1 plan in this folder adapts that vision to the real Agent Enterprise setup:

- existing grouped task lanes stay meaningful
- registry-first architecture stays in place
- same-origin Fastify + static HTML stays in place
- SQLite remains the default persistent store
- cPanel / Roundcube boundaries remain operator-owned

## Success Criteria

The suite is ready for a V1 rollout only when:

- the canonical docs in this folder are aligned
- the shared `pa_*` data model exists
- the Personal Assistant suite is visible as a real, not placeholder, program surface
- module routes and overview pages work end-to-end
- email and mailbox work is honest about operator-owned setup boundaries
- testing covers the new schema, APIs, and pages without regressing the rest of Agent Enterprise
