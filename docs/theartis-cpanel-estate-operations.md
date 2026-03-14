# Theartis cPanel Estate Operations

This document extends the existing Lavprishjemmeside SSH-first contract to the rest of the `theartis` cPanel estate on `cp10.nordicway.dk`. It is the operator baseline for `engineer` and the relevant `master` lanes when they need direct server access.

## Authority

- Local SSH aliases: `cp10-theartis`, `cp10-lavpris`
- Host: `cp10.nordicway.dk`
- User: `theartis`
- Port: `33`
- Local key: `/Users/IAn/.ssh/cpanel_theartisan`
- Remote GitHub alias: `github-kimjeppesen`
- Remote Node runtime path: `/opt/alt/alt-nodejs22/root/usr/bin`

Direct shell entry:

```bash
ssh cp10-theartis
```

## Write Access Policy

- `engineer` and the relevant `master` lane are the intended write-authorized operators for this account.
- This phase verifies writable paths only. It does not add deploy, rollback, or arbitrary write automation to the control plane.
- The authenticated `theartis` SSH account is already write-capable on the live estate. `Agent Enterprise` now records and verifies those writable surfaces.

## Managed Surfaces

### Lavprishjemmeside CMS

- Domain: `lavprishjemmeside.dk`
- API: `https://api.lavprishjemmeside.dk/health`
- Repo: `/home/theartis/repositories/lavprishjemmeside.dk`
- Web root: `/home/theartis/lavprishjemmeside.dk`
- Mode: `repo-plus-live-site`

### Lavprishjemmeside Client Site

- Domain: `ljdesignstudio.dk`
- API: `https://api.ljdesignstudio.dk/health`
- Repo: `/home/theartis/repositories/ljdesignstudio.dk`
- Web root: `/home/theartis/ljdesignstudio.dk`
- Mode: `repo-plus-live-site`

### Artisan Reporting

- Domain: `reporting.theartisan.dk`
- Health: `https://reporting.theartisan.dk/health`
- Repo: `/home/theartis/repositories/reporting.theartisan.dk`
- Web root: `/home/theartis/reporting.theartisan.dk`
- Mode: `repo-plus-live-node-app`

### The Artisan WordPress

- Domain: `theartisan.dk`
- Site: `https://theartisan.dk/`
- WordPress JSON probe: `https://theartisan.dk/wp-json/`
- Content repo: `/home/theartis/repositories/the-artisan`
- Live WordPress root: `/home/theartis/public_html`
- cPanel domain root: `/home/theartis/theartisan.dk`
- Mode: `repo-plus-live-wordpress`

Important layout note:

- `theartisan.dk` is served from `/home/theartis/public_html`.
- `/home/theartis/theartisan.dk` is only the cPanel domain root and currently contains `cgi-bin`, not the live WordPress runtime.
- Repo-backed work belongs in `/home/theartis/repositories/the-artisan`, while live WordPress edits land under `/home/theartis/public_html/wp-content`.

### Thirdwave

- Domain: `thirdwave.dk`
- Site: `https://thirdwave.dk/`
- WordPress JSON probe: `https://thirdwave.dk/wp-json/`
- SEO auditor proxy: `https://thirdwave.dk/seo-auditor/audit_proxy.php`
- Live root: `/home/theartis/thirdwave.dk`
- Mode: `live-root-only`

Important layout note:

- No dedicated `/home/theartis/repositories/thirdwave.dk` repo currently exists on `cp10`.
- `thirdwave.dk` is a brownfield live-root deployment. Treat direct edits there as higher risk until the site is repo-extracted.

## Commands

All account-level helpers live in `scripts/theartis/` and load `.env.local` first, then `.env`.

- `npm run theartis:preflight`
  Validates SSH alias resolution, key readability, remote path presence, remote Node, and the shared GitHub alias.
- `npm run theartis:inventory`
  Prints the current site/repo/runtime map for Lavpris, Artisan, and Thirdwave surfaces.
- `npm run theartis:health`
  Checks live health endpoints, WordPress JSON probes, and the Thirdwave SEO auditor proxy surface.
- `npm run theartis:repo-status`
  Prints Git status for repo-backed surfaces and explicitly flags surfaces that are live-root-only.
- `npm run theartis:write-access`
  Verifies which repo and live-root paths are writable by the authenticated `theartis` account.

Examples:

```bash
npm run theartis:health -- theartisan.dk thirdwave.dk
npm run theartis:repo-status -- reporting.theartisan.dk theartisan.dk
```

## Safety Boundaries

Still out of scope:

- deploy automation
- rollback automation
- arbitrary remote shell execution from the dashboard
- control-plane HTTP endpoints for write-capable cPanel actions
- secrets sync from live `.env` files into this repo

Security rules carried over from legacy:

- no tokenized Git remotes
- no secrets committed to `Agent Enterprise`
- no direct templating of secrets into cPanel config

## Legacy References

The operating model is grounded in these legacy sources:

- `programs/artisan/the-artisan-wp/OPERATIONS_RUNBOOK.md`
- `docs/cpanel-runtime-contract.md`
- `ops/repository-topology.json`
- `programs/lavprishjemmeside/README.md`
- `programs/lavprishjemmeside/cms/README.md`
- `/Users/IAn/IAn/README/lavprishjemmeside-control-map.md`
- `/Users/IAn/IAn/programs/samlino/seo-agent-playground/seo-auditor/audit_proxy.php`

The older `/Users/IAn/IAn/scripts/lavpris/*` and artisan deployment scripts remain reference material only. `Agent Enterprise` now owns the account-level access contract under `scripts/theartis/`.
