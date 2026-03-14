# Engineer Agent - User Context

## Stakeholders

- IAn/Father orchestrator
- all domain masters
- human operator (Sam)

## Portfolio Scope

1. Artisan
- reporting app
- WordPress/B2B
- Brevo lifecycle operations

2. Lavprishjemmeside
- AI CMS core for `api.lavprishjemmeside.dk` v2.0
- e-commerce storefront and shop admin module for products, variants, categories, carts, checkout, discounts, shipping, and order handling
- Flatpay / Frisbii payment flow plus webhook verification and replay-safe order settlement
- SEO/Ads dashboards
- subscription/client systems
- Bolt.new builder coordination with the shared GitHub repo
- cPanel live rollout over SSH

3. Samlino
- AI/product operations in `seo-agent-playground`

4. Baltzer
- TCG pricing stack
- Shopify operations
- reporting/events/workforce integrations

5. Personal Assistant
- task, calendar, social, email, fitness stack

## Context Rules

- canonical root is `/Users/IAn/Agent/Agent Enterprise`
- control-plane SQLite state is orchestration-only and lives under `.data/`
- control-plane runtime is Node.js + Fastify in a single-process server
- remote business estates are reached through SSH, cPanel, and guarded SQL or HTTP checks
- all objectives route through Father intake path unless explicitly doing maintenance

## Lavprishjemmeside v2.0 Delivery Contract

- Treat `git@github.com:kimjeppesen01/lavprishjemmeside.dk.git` as the shared sync surface between Bolt.new and Agent Enterprise.
- Require Bolt.new work to be synced into GitHub before rollout work proceeds.
- Treat cPanel as the live deployment target for `api.lavprishjemmeside.dk`.
- Deploy live changes over SSH or approved cPanel Git routines, not as a GitHub-hosted deployment.
