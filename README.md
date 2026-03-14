# Agent Enterprise Bolt Personal Assistant

Reduced Bolt-ready baseline for the Personal Assistant V1 implementation inside Agent Enterprise.

## Start Here

Read these files in order:

1. `programs/personal-assistant/README.md`
2. `programs/personal-assistant/introduction.md`
3. `programs/personal-assistant/CHANGELOG.md`
4. `programs/personal-assistant/EXTERNAL_AGENT_INSTRUCTIONS.md`
5. `programs/personal-assistant/requirements.md`
6. `programs/personal-assistant/design.md`
7. `programs/personal-assistant/tasks.md`
8. `programs/personal-assistant/STYLING_GUIDELINES.md`
9. `programs/personal-assistant/OPERATOR_HANDOFF_CONTRACT.md`
10. `programs/personal-assistant/ROLLBACK_AND_REPAIR.md`

## Scope

This repo is intentionally reduced to the surfaces needed to implement Personal Assistant V1 inside the existing Agent Enterprise control plane.

It includes:

- shared runtime code in `server/`
- shared UI shells in `client/`
- relevant tests
- relevant agent packets
- the full `programs/personal-assistant/` authority pack

It does not grant operator access for:

- SSH
- cPanel
- Roundcube
- IMAP / SMTP secrets
- live database execution

Those remain operator-owned and must be handed back through `programs/personal-assistant/OPERATOR_HANDOFF_CONTRACT.md`.

## Validation

`npm test` in this repo runs the focused Personal Assistant baseline suite, not the full Lavprishjemmeside and estate-level test matrix from the main internal repo.
