# Engineer Agent - Skills

## GSD Execution Framework (Codex)

1. Default to GSD command flow for non-trivial delivery work in Codex.
2. Begin unfamiliar scopes with `$gsd-map-codebase` to load architecture context.
3. Use `$gsd-plan-phase` before implementation and `$gsd-execute-phase` for structured execution.
4. Run `$gsd-verify-work` before handoff; use `$gsd-help` for command guidance.

## UI UX Pro Max Protocol

1. Use `$ui-ux-pro-max` before non-trivial frontend design or redesign work.
2. Start with design-system generation, then follow with stack-specific searches for the actual target surface.
3. Persist approved design output into `design-system/MASTER.md` and page overrides in `design-system/pages/`.
4. Treat the skill as design intelligence, not a license to ignore the repo's existing control-plane patterns, density targets, or operational UX goals.
5. For Agent Enterprise control-plane work, preserve the current backend-served HTML, CSS, and `client/assets/*.js` model.
6. Use React or TypeScript only when the target program repo actually uses them; do not assume React in the control plane.

## Research-Backed Competency Matrix

### Core Platform

1. Node.js 20 ESM service architecture with Fastify routes, hooks, and backend-served static pages.
2. SQLite reliability patterns for `better-sqlite3` and local CLI diagnostics.
3. Agent orchestration data modeling for registries, work queues, chat sessions, runtime state, and learned memory.

### Frontend Design Intelligence

1. UI UX Pro Max search workflow for patterns, palettes, typography, UX guidelines, and anti-patterns.
2. Design-system persistence workflow using `design-system/MASTER.md` plus page overrides.
3. Translation of approved design-system guidance into backend-served HTML/CSS and `client/assets` JavaScript for the control plane.

### SSH + Terminal Operations

1. SSH alias validation, remote shell hygiene, and deterministic read-first diagnostics.
2. Running local and remote terminal workflows safely with explicit rollback notes.
3. Using the estate scripts and direct shell access to inspect repo status, runtime health, permissions, and writable paths.

### cPanel + SQL Operations

1. MySQL CLI diagnostics, schema inspection, guarded exports, and change rollout discipline on cPanel-hosted applications.
2. Reading runtime configuration from environment files and app configs such as `wp-config.php`.
3. Distinguishing control-plane SQLite state from remote cPanel MySQL application state.

### WordPress + B2B + Theme Development

1. WordPress child theme development and template hierarchy.
2. WordPress REST API, admin flows, WooCommerce data awareness, and authenticated route integration.
3. cPanel-hosted deployment discipline for theme, plugin, and WordPress application updates.

### Node.js Applications on cPanel

1. Diagnosing hosted Node.js applications with remote `node` binaries, repo roots, site roots, and environment separation.
2. Running `npm install`, build, startup, and health verification under shared-hosting constraints.
3. Verifying remote repo status, writable paths, and runtime entrypoints before and after changes.

### Email Marketing (Brevo)

1. Brevo API usage for campaigns, transactional sends, and contact segmentation.
2. HTML email compatibility patterns (responsive tables, inline CSS, client testing).
3. Template variable management and campaign QA workflow.

### cPanel + Git Delivery

1. cPanel Git Version Control integration and deployment workflows.
2. Environment-safe branch promotion and rollback routines.
3. Build artifact and permissions hygiene on hosted environments.
4. Dedicated cPanel MySQL schema/change rollout for reporting applications.

### Lavprishjemmeside v2.0 Delivery Contract

1. The shared sync repo is `git@github.com:kimjeppesen01/lavprishjemmeside.dk.git`.
2. Preserve the delivery chain `Bolt.new -> GitHub -> cPanel over SSH`.
3. Treat GitHub as the sync surface and cPanel as the live deployment target for `api.lavprishjemmeside.dk`.
4. Do not describe or execute Lavprishjemmeside live rollout as a GitHub-hosted deployment.
5. Before remote write work, verify GitHub HEAD, remote repo/site status, writable paths, rollback notes, and changelog impact.
6. Use `programs/lavprishjemmeside/local-mirror/` as the canonical local checkout via `npm run lavpris:mirror-pull`.
7. Treat a failing `npm run lavpris:sync-status` check as a rollout blocker until GitHub, the local mirror, and cPanel are reconciled.
8. Run `npm run lavpris:release-health` before concluding Lavprishjemmeside delivery work so changelog discipline, path health, and rollout drift are visible.

### Lavprishjemmeside CMS and Commerce

1. The CMS includes a first-party shop module with products, variants, categories, cart validation, checkout, orders, shipping methods, discount codes, and shop settings.
2. Flatpay / Frisbii is the payment gateway surface for checkout-session creation, webhook verification, and settled-charge handling.
3. Commerce rollout can require both the normal `api/run-schema.cjs` path and the separate `api/src/schema_shop.sql` bootstrap when the shop tables are not yet present.

### Shopify and Commerce Systems

1. Shopify Admin GraphQL API and webhooks lifecycle.
2. Inventory/order sync and idempotent event processing.
3. Admin app security, token handling, and auditability.

### SEO/Ads/Data Dashboards

1. Search Console API ingestion and normalization.
2. Ads API ingestion pipeline patterns and rate-limit handling.
3. KPI layer design: CAC, CPC, CTR, conversion, MRR, churn, LTV.

### Personal Assistant Stack

1. Task/calendar API integration architecture.
2. Inbox triage automations with clear human override controls.
3. Fitness dashboard ingestion constraints and device data boundaries.

### Security + Reliability

1. Secrets management and least-privilege access.
2. Webhook signature verification and replay prevention.
3. Monitoring, structured logs, alert thresholds, and incident triage.
4. Safe SSH, terminal, SQL, and remote write discipline with explicit approval boundaries.

## Agent Extension Protocol

1. Capture objective with acceptance criteria.
2. Choose owning Master and execution task agent.
3. Implement behind test-first or test-with-change discipline.
4. Add observability and error handling.
5. Validate locally and via API checks.
6. Update architecture and MEMORY artifacts.
7. When the work changes Lavprishjemmeside CMS or client-site management behavior, update `programs/lavprishjemmeside/CHANGELOG.md` under `[Unreleased]` before handoff.
8. Lavprishjemmeside work is not complete until changelog evidence exists and the current `lavpris:release-health` result is surfaced in the handoff.

## Engineer Spawn Protocol

- `platform-reliability-task`: outages, incident prevention, runtime hardening.
- `integration-architecture-task`: SSH, cPanel, MySQL, WordPress, hosted Node.js, external APIs, webhooks, auth, data contracts.
- `data-observability-task`: KPI pipelines, dashboards, telemetry, alerting, runtime and estate health evidence.
- `backend-specialist`: Node.js, Fastify, SQLite, registry/work/chat runtime changes.
- `frontend-specialist`: control-plane pages, `client/assets` behavior, operator UX, and program UI changes when applicable.
- `integration-specialist`: remote terminal work, cPanel estates, MySQL diagnostics, WordPress, Shopify, Brevo, Billy, and deployment checks.

## Orchestration vNext Contract

1. Enforce explicit delegation envelopes for all specialist missions.
2. Require a clear objective, bounded scope, evidence path, and owning agent before delegation.
3. Route work through the real project surfaces: `agents/registry.json`, `programs/registry.json`, task lifecycle endpoints, and agent workspaces.
4. Use concise carryover summaries when a thread or handoff grows too large.
5. Blocked specialists must escalate with a concrete blocker, supporting evidence, and a next decision request.
6. Prefer real runtime state over stale packet assumptions when they conflict.

## Runtime Inspection Competencies

1. Use `/health`, `/api/meta`, `/api/agents`, `/api/system-map`, `/api/chat/agents/:agentId/workspace`, and `/api/chat/sessions/:sessionId/context` to inspect live runtime state.
2. Use `npm run lavpris:*` and `npm run theartis:*` when the work touches remote cPanel estates.
3. Keep engineer prompts and handoffs aligned with the root packet files, task packets, and persisted learning notes.

## The Artisan WordPress Capability Hardening

1. Keep the Artisan WordPress runtime map current from the repo packet, remote SSH checks, and `wp-config.php`-derived database details.
2. Use deterministic SSH and terminal checks before write work: connectivity, runtime paths, repo state, theme/plugin presence, and database reachability.
3. Use controlled backup, deploy, cache, and service-status routines before and after risky WordPress changes.
4. Enforce Saren child theme identity for all Artisan UI work:
- prefer `saren-child` overrides
- preserve existing `sa-*` / `saren-*` patterns
- reuse theme tokens (`--mainColor`, `--secondaryColor`, `--linesColor`, `--radius`)
5. Require theme-alignment checklist in all WP/B2B implementation evidence.

## Samlino v3 Platform Ownership

1. Maintain Samlino specialist boundary coverage and warn-only contract telemetry for all workflow specialists.
2. Treat Samlino as a program-context workspace, not the portfolio root.
3. Keep Samlino runtime and content workflows isolated from the shared control-plane SQLite state.

## 2026-03-01 Kanban Governance v1

- Kanban lifecycle mapping is status/stage-first: planning, assigned, in_progress, blocked, completed, closed.
- Task versions (`v1`, `v1.1`, `v2`) are board metadata and do not replace status/execution_stage truth.
- Every stage transition must use guarded API contracts and produce audit trail entries.
- Archived duplicate tasks are excluded from default dashboards and Kanban views.
- WIP thresholds are warn-only and must trigger prioritization/rebalancing actions instead of hard blocking.
