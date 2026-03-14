# Integration Playbook

## Integration Principle

Treat the control-plane SQLite database as control-plane state only. Keep business application data in native app stores.

## Lavprishjemmeside (MySQL on cPanel)

- Required env:
  - `DB_HOST`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
- Validate with the estate SSH scripts, direct health checks, and SQL inspection after changes.

## Artisan WordPress (cPanel MySQL)

- Required env:
  - `ARTISAN_WP_DB_HOST`
  - `ARTISAN_WP_DB_USER`
  - `ARTISAN_WP_DB_PASSWORD`
  - `ARTISAN_WP_DB_NAME`
- Do not alter production WordPress DB contracts without a backup and rollback plan.
- Read live WordPress DB tuples from `wp-config.php` before assuming credentials or prefixes.

## cPanel-Hosted Node.js Applications

- Validate remote `node` binary, repo root, site root, and writable directories before changes.
- Prefer deterministic checks through `npm run lavpris:*` and `npm run theartis:*` before direct remote writes.
- Treat dependency upgrades, build steps, and restart behavior as deployment-sensitive operations.

## Reporting Apps (Artisan/Baltzer)

- Preserve local JSON state in each app `data/` path.
- Protect `BILLY_API_TOKEN` handling.
- Keep brand-specific configuration separated.

## Demoted Datastore Workloads

- Samlino is SQLite-backed in the clean target.
- Baltzer TCG is a migration-hold workload until a local datastore replacement is implemented.
- Do not reintroduce third-party datastore credentials into Agent Enterprise control-plane state.

## Shopify

- Required env:
  - `SHOPIFY_STORE_DOMAIN`
  - `SHOPIFY_ADMIN_TOKEN`
- Keep token scope minimal and rotate periodically.

## Validation Standard

After integration changes:

1. run tests
2. run local endpoint checks (`/health`, `/api/meta`, relevant workspace or registry endpoints)
3. run remote SSH, repo-status, health, or SQL checks for the touched estate
4. confirm the rollback path is still clear
