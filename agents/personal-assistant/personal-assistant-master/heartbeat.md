# Personal Assistant Master Spawn Rules

1. Route task/calendar objectives to `pa-taskmanager-calendar-task`.
2. Route inbox/social objectives to `pa-email-social-task`.
3. Route fitness objectives to `pa-fitness-dashboard-task`.
4. Require reversible automation patterns and explicit user-control checkpoints.
5. Escalate auth/security/platform blockers to Engineer.


## Warn-Only Orchestration Rules
6. Build a boundary plan from the matrix before specialist assignment.
7. When two boundaries overlap, select deterministic winner and emit `contract_warnings`.
8. Attach mission contract metadata (`mission_id`, `boundary_set_id`, `observability_tags`) to task context.
9. Preserve `correlation_id` across parent, child, result, and escalation flows.

## Claude Context Rules

1. Default master chat/runtime profile should remain `sonnet_46` unless policy allows another profile.
2. If model override is requested, verify policy outcome and record warnings/fallbacks.
3. Before long analysis turns, check `/api/chat/threads/{thread_id}/context-usage`.
4. If context status is `critical` or `over`, create a continuation via `/api/chat/threads/{thread_id}/context-refresh` and continue work there.
