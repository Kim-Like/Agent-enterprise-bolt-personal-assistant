# Personal Assistant Tech Stack

## Runtime Foundation

Personal Assistant must fit the existing Agent Enterprise stack.

Core runtime:

- Node.js `>=20.18.0`
- Fastify
- SQLite via `better-sqlite3`
- same-origin static HTML pages in `client/pages/`
- vanilla JavaScript browser assets in `client/assets/`

## Data Layer

Primary store:

- `.data/control-plane.sqlite`

Personal Assistant tables should use the `pa_` prefix and live in the same database as the rest of the control plane.

Do not introduce:

- Prisma
- Sequelize
- a second local database
- a browser-only persistence model as the source of truth

## Integration Surfaces

Expected code touch points for V1:

- `server/src/db/init.js`
- `server/src/routes/`
- `server/src/lib/project-catalog.js`
- `server/src/lib/overview-model.js`
- `client/pages/`
- `client/assets/`
- `agents/registry.json`
- `programs/registry.json`
- `agents/personal-assistant/`
- `programs/personal-assistant/`

## UI Stack

The UI should follow current Agent Enterprise patterns:

- inline or shared CSS, no Tailwind requirement
- Plus Jakarta Sans for interface typography
- JetBrains Mono for technical and stats surfaces
- glass/frosted cards over soft gradients
- compact dark shell/nav with lighter content surfaces
- responsive but dashboard-first layouts

Full styling rules live in `STYLING_GUIDELINES.md`.

## Email / cPanel Boundary

Email is not a fake local-only module. It is bounded by real external infrastructure:

- cPanel estate on `cp10.nordicway.dk`
- Roundcube-compatible mailbox expectations
- IMAP / SMTP credentials and connectivity
- operator-owned secret injection

External agents may prepare:

- schema
- service code
- route contracts
- mailbox setup docs
- verification scripts

External agents may not perform:

- live mailbox provisioning
- Roundcube config changes
- secret injection
- SSH execution on cPanel

Those go through `OPERATOR_HANDOFF_CONTRACT.md`.

## Recommended V1 Provider Posture

- Tasks + calendar: local-first data model, optional provider sync later
- Email: cPanel/Roundcube-backed foundation with honest operator handoff
- Social: planning + scheduling model first, live publishing boundary second
- Fitness: import/manual ingestion first, direct wearable/provider sync later

## Testing

Expected validation surfaces:

- `npm test`
- server route tests for `/api/pa/*`
- schema/init coverage
- project catalog / registry integrity
- static page load sanity for `/pa` routes

If a phase introduces a new structured contract, it must also update the relevant docs in this folder.
