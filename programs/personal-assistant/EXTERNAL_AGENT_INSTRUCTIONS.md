# External Agent Instructions

This file is the hard execution contract for Personal Assistant V1 work.

## Authority

You must treat these files as the canonical execution set:

1. `README.md`
2. `introduction.md`
3. `CHANGELOG.md`
4. `requirements.md`
5. `design.md`
6. `tasks.md`
7. `STYLING_GUIDELINES.md`
8. `OPERATOR_HANDOFF_CONTRACT.md`
9. `ROLLBACK_AND_REPAIR.md`

## Hard Rules

1. Do not invent a separate architecture outside Agent Enterprise.
2. Do not replace cPanel / Roundcube / IMAP / SMTP / SSH dependencies with fake substitute infrastructure.
3. If work requires mailbox setup, cPanel changes, DB execution, secrets, or SSH operations, produce an operator packet instead of improvising around the missing access.
4. Every behavior change must update `CHANGELOG.md`.
5. If schema, API, env, workflow, or operator boundaries change, the relevant docs in this folder must also be updated.
6. Follow `tasks.md` phase order unless explicitly redirected.
7. Do not claim live rollout or operator execution complete unless those steps were actually handed back and confirmed by the operator.

## Coding Boundary

For this program, implementation may legitimately touch code outside `programs/personal-assistant/`, including:

- `server/`
- `client/`
- `agents/`
- `agents/registry.json`
- `programs/registry.json`

But the planning authority remains in this folder.

## Required Phase Handoff Format

For every completed phase, provide:

- Summary
- Files changed
- Tests run
- Docs updated
- Operator handoff required
- Open blockers

If operator work is required, include a `cPanel / Operator Handoff` section using `OPERATOR_HANDOFF_CONTRACT.md`.
