# Personal Assistant V1 Tasks

This is the canonical V1 execution plan for Bolt and any other external implementation agent.

## Phase 0 — Authority Reset And Baseline

### Objective

Turn the current scaffold into a real execution surface with canonical docs, change control, and explicit operator boundaries.

### Product Intent

The suite should stop reading like five placeholder folders and start reading like one planned Agent Enterprise program with a real V1 delivery path.

### Implementation Lanes

- create the canonical root docs for Personal Assistant
- establish changelog discipline
- mark `personal-agent-plan.md` as source/reference, not execution authority
- update placeholder module notes to point back to the canonical root docs

### Acceptance

- root docs exist and agree on scope
- placeholder module docs no longer compete with the new V1 plan
- external-agent startup path is unambiguous

### Hard Stop

Do not start runtime implementation before the authority and operator boundaries are written down.

## Phase 1 — Shared Schema, Registries, And Suite Shell

### Objective

Create the shared V1 foundation inside Agent Enterprise.

### Product Intent

Give Personal Assistant a real runtime footprint instead of only a project-catalog placeholder.

### Implementation Lanes

- extend SQLite init with the first `pa_*` tables
- confirm or refine program + agent registry entries
- add project-catalog details that match the real V1 state
- create `/api/pa/overview`
- create `/pa` suite shell and shared client assets

### Acceptance

- schema exists
- `/api/pa/overview` responds
- `/pa` renders without errors
- tests cover the foundation

## Phase 2 — Task + Calendar Lane

### Objective

Deliver the first real productivity lane.

### Product Intent

Tasks and calendar should feel like one coordinated lane, matching the current grouped task agent.

### Implementation Lanes

- task data model
- calendar event data model
- task and calendar CRUD APIs
- shared overview summaries
- module pages and navigation states
- natural bridge points for assistant help and future scheduling automation

### Acceptance

- task and calendar pages work end-to-end
- overview reflects real task/event data
- grouped lane is visible in both UI and docs

## Phase 3 — Email Operations Foundation

### Objective

Build an honest, non-fake email foundation.

### Product Intent

Email should become operationally real without pretending Bolt has cPanel or Roundcube control.

### Implementation Lanes

- mailbox/account schema
- cached message model
- email service abstraction
- email module UI
- operator packet for IMAP / SMTP / cPanel steps
- audit and safety rules for outbound actions

### Acceptance

- local email data model and UI are implemented
- operator packet exists for real mailbox setup
- docs clearly distinguish implemented code from operator-owned setup

### Hard Stop

No “email is complete” claim without the operator packet and explicit boundary notes.

## Phase 4 — Social Planning And Content Lane

### Objective

Deliver a usable social planning lane without overpromising live publishing.

### Product Intent

Social should support ideation, drafting, scheduling, and review before any live token-backed posting boundary is crossed.

### Implementation Lanes

- social draft and schedule schema
- planning board or content list UI
- status lifecycle for drafts and scheduled items
- hooks for assistant help with captions, planning, and reuse
- operator or later-phase handoff points for real provider tokens

### Acceptance

- social planning works locally
- publishing boundaries are explicit

## Phase 5 — Fitness Dashboard And Health Boundary

### Objective

Deliver a real fitness visibility surface that respects privacy boundaries.

### Product Intent

Fitness should be useful in V1 even before live wearable sync exists.

### Implementation Lanes

- fitness logs and goals schema
- import/manual ingestion paths
- summary cards, trends, and recent activity
- consent and data-boundary docs

### Acceptance

- fitness page works with imported/manual data
- privacy boundary is explicit in both code and docs

## Phase 6 — Unified Overview, Daily Briefing, And Assistant Support

### Objective

Make the suite feel like one system instead of isolated pages.

### Product Intent

The overview should summarize the day and the assistant should have enough structure to support the suite coherently.

### Implementation Lanes

- mature `/pa` overview
- cross-module activity feed
- daily briefing summary logic
- agent packet updates where needed
- project-catalog updates from scaffold to real V1 surface

### Acceptance

- overview feels integrated
- data from all active modules is surfaced coherently
- personal-assistant-master has current docs and scope

## Phase 7 — QA, Operator Packet, Rollout, And Fallback

### Objective

Make V1 safe to integrate into the main project and safe to hand off for operator execution where required.

### Product Intent

A V1 implementation is not complete until it can be tested, handed over, and repaired without guesswork.

### Implementation Lanes

- final test pass
- changelog and docs sync
- operator packet completion
- rollback and repair notes
- implementation status summary: done vs operator-owned

### Acceptance

- tests pass
- docs and changelog are aligned
- operator-owned dependencies are handed over explicitly
- no fake claims of completed cPanel or mailbox work remain
