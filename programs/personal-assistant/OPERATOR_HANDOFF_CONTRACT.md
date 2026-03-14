# Operator Handoff Contract

Use this whenever implementation crosses into operator-owned territory.

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
