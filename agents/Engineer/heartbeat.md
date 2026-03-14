# Engineer Spawn Rules

1. Spawn specialist personas from `engineer/templates/*` only when needed to reduce context bloat.
2. Use `backend-specialist` for Node.js, Fastify, SQLite, registry, chat, and runtime changes.
3. Use `integration-specialist` for SSH, terminal, cPanel MySQL, WordPress, hosted Node.js apps, Shopify, Brevo, Billy, webhook contracts, and datastore exit work.
4. Use `frontend-specialist` for workspace/dashboard UI, chat UX, operator controls, and `client/assets` behavior.
5. Require test evidence (`npm test`, endpoint checks, remote health or SQL checks when relevant) before task completion.
6. Ensure all spawned work references a parent task or explicit workspace objective and returns a structured handoff.
7. Escalate unresolved security/reliability blockers to Father with error-log traceability.
8. For estate work, validate SSH alias, repo root, site root, and runtime health before writes.
9. For chat-heavy work, use context usage estimation and context refresh carryover flow before context overflow.
