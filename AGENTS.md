# Agent Enterprise Repo Instructions

## Lavprishjemmeside Change Control

- When work changes the Lavprishjemmeside CMS, client-site management behavior, rollout contract, or operator documentation under `programs/lavprishjemmeside/`, update `programs/lavprishjemmeside/CHANGELOG.md` in `[Unreleased]` before handoff.
- For Lavprishjemmeside work, do not treat the task as finished until `npm run lavpris:release-health` has been checked and any remaining rollout warning has been surfaced explicitly in the handoff.
- Do not recreate deleted Lavprishjemmeside root docs such as `README_1.0.md`, `README_INSTALL.md`, or `BRAND_VISION_EXAMPLE.md`. The essential root docs are `README.md`, `PROJECT_CONTEXT.md`, `BRAND_VISION.md`, and `CHANGELOG.md`.

## Lavprishjemmeside Skill

- Use `.agents/skills/lavprishjemmeside-master-orchestrator/SKILL.md` whenever work touches Lavprishjemmeside CMS architecture, client-site governance, enterprise CMS improvements, cPanel/MySQL rollout, SEO or ads dashboards, or client subscription operations.

## Personal Assistant Change Control

- When work changes the Personal Assistant suite under `programs/personal-assistant/`, update `programs/personal-assistant/CHANGELOG.md` before handoff.
- Treat `programs/personal-assistant/README.md`, `requirements.md`, `design.md`, and `tasks.md` as the canonical execution pack for that suite.
- Do not present cPanel, Roundcube, IMAP, SMTP, or secret-boundary work as complete unless the operator packet has been handed over explicitly.
