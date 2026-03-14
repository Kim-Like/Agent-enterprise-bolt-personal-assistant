# Personal Assistant V1 Requirements

## Product Goal

Deliver a real V1 of the Personal Assistant suite inside Agent Enterprise, turning the current scaffold into one integrated personal-operations surface instead of multiple disconnected placeholder modules.

## Hard Requirements

### 1. Agent Enterprise-Native Integration

V1 must fit the current control plane:

- register through existing agent and program registries
- appear in the project catalog as a real surface
- use Fastify + static page delivery
- use SQLite in `.data/control-plane.sqlite`
- preserve same-origin UI and API delivery

### 2. Shared Personal Assistant Runtime

V1 must create a unified runtime with:

- `/pa` overview surface
- `/api/pa/*` route family
- shared `pa_*` schema
- shared audit and summary model

### 3. Module Scope

V1 must cover these domains:

- task management
- calendar management
- email operations foundation
- social planning operations
- fitness dashboard visibility

The grouped execution-lane model already present in the master agent should remain visible:

- Task + Calendar
- Email + Social
- Fitness

### 4. Documentation And Change Control

Every behavior or contract change must update:

- `CHANGELOG.md`
- the relevant canonical docs in this folder

If schema, API, env, or operator-bound rollout work changes, the implementation is incomplete until the supporting handoff docs are updated.

### 5. Styling Consistency

New V1 pages must fit the current Agent Enterprise dashboard styling. Personal Assistant may use its own accent family, but it must remain visually consistent with the existing shell, card system, typography, spacing, and interaction patterns.

## Module Requirements

### Task + Calendar

- unified productivity lane
- task board or task list with calendar-aware scheduling hooks
- calendar views and event CRUD
- overview summary cards for upcoming work and schedule pressure

### Email

- inbox/listing foundation
- mailbox account model
- audit-friendly action model
- explicit operator boundary for live IMAP/SMTP connectivity
- no misleading “fully live mailbox” claims before operator setup exists

### Social

- planning and scheduling surfaces
- post drafts and lifecycle states
- platform-aware metadata
- safe path to later provider integration without pretending tokens already exist

### Fitness

- logs, goals, summaries, and trend views
- import/manual ingestion baseline
- health-data sensitivity and consent boundaries clearly modeled

## Non-Goals For V1

Do not turn V1 into:

- a separate product repo with its own stack
- a React/Vue/Svelte SPA rewrite
- a direct-health-provider or direct-social-provider rollout without operator approvals
- a self-provisioning mailbox system
- a cPanel automation system

## Delivery Rules For Bolt

- follow `tasks.md` phase order
- do not invent alternate infrastructure when blocked by cPanel, mailbox, or secret boundaries
- produce operator packets instead
- keep the docs in this folder as the execution authority
