Read these files in order and keep them active in memory throughout the project:

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

Hard rules:

- This is an Agent Enterprise-native implementation, not a standalone rebuild.
- Do not invent alternative infrastructure for cPanel, Roundcube, IMAP, SMTP, secrets, or SSH-only operations.
- If a feature requires mailbox setup, database execution, env injection, or remote estate work, hand it back as an operator packet instead of faking completion.
- Update `programs/personal-assistant/CHANGELOG.md` for every behavior change.
- If you change schema, API, env, workflow, or operator boundaries, update the relevant docs in `programs/personal-assistant/` in the same phase.
- Follow `programs/personal-assistant/tasks.md` in order unless explicitly redirected.
- Keep styling aligned with `programs/personal-assistant/STYLING_GUIDELINES.md` and the current Agent Enterprise shell.

Working truth:

- `programs/personal-assistant/` is the planning authority.
- Implementation may touch `server/`, `client/`, `agents/`, and registries where needed to integrate the suite properly.
- The cPanel / mailbox / Roundcube boundary remains operator-owned.
