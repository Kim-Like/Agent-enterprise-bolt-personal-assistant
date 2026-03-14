# Operator Handoff Contract

Use this whenever implementation crosses into operator-owned territory.

## V1 Implementation Status (2026-03-14)

The following work is **complete and does not require operator action**:

- SQLite schema (`PA_SCHEMA`), all `db.pa.*` methods, and `server/src/routes/pa.js` REST API
- All six pages: `/pa`, `/pa/tasks`, `/pa/calendar`, `/pa/email`, `/pa/social`, `/pa/fitness`
- Overview API at `/api/pa/overview` with daily briefing summary
- Project-catalog and agent packet updates

The following areas **require operator action** before they are operationally complete:

### Email (IMAP/SMTP)

The UI and account model are live. The actual mailbox must be set up by the operator:

1. Log in to cPanel at `cp10.nordicway.dk`
2. Create the mailbox under `Email > Email Accounts`
3. Note the IMAP host/port (port 993, SSL) and SMTP host/port (port 587, TLS)
4. Add the account via the `/pa/email` UI, selecting `cpanel-imap` as the provider
5. Store the mailbox credentials in a secure operator secret store (not in the codebase)
6. Mark the account status as `active` via `PATCH /api/pa/email/accounts/:id`

### Social (Publishing Tokens)

The draft board and scheduling UI are live. Publishing tokens must be obtained and stored by the operator:

1. Create developer app credentials for each platform (Twitter/X, Instagram, LinkedIn, Facebook)
2. Store access tokens as environment variables in the control-plane host environment
3. A future Phase 8 publishing integration will read these tokens — do not inject them into client-side code

### Fitness (Wearable Sync)

Manual activity logging is live at `/pa/fitness`. Wearable sync requires operator setup:

1. Obtain API credentials from the wearable platform (e.g., Apple HealthKit export, Garmin Connect API)
2. A future sync integration will read these credentials via environment variables
3. Until then, use the manual log entry form at `/pa/fitness`

## Operator-Owned Areas

- SSH work on `cp10.nordicway.dk`
- cPanel mailbox setup
- Roundcube-related mailbox operations
- IMAP / SMTP secret injection
- production or shared database execution
- live rollout and rollback actions

## Required Handoff Packet Types

### SQL / Database Packet

Include:

- purpose
- exact files or SQL statements
- run order
- idempotency expectations
- verification queries
- rollback note

### Env / Secret Packet

Include:

- exact variable names
- which service or host they apply to
- whether values are new, rotated, or optional
- restart requirement

### Mailbox / Email Packet

Include:

- mailbox/account purpose
- expected cPanel or Roundcube-side configuration
- IMAP host/port and SMTP host/port assumptions
- verification checklist

### Rollout Packet

Include:

- files or features being activated
- required local or remote commands
- expected post-rollout checks
- rollback trigger

## Hard Rule

Do not mark operator-owned work as complete unless the operator has actually executed it.
