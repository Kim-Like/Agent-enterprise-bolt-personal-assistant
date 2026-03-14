# Toolchain Requirements

## Required Local Binaries

- `node` (>= 20.18.0)
- `npm`
- `sqlite3`
- `git`
- `ssh`
- `bash`
- `mysql`
- `claude` (Claude Pro OAuth CLI)

## Recommended Utilities

- `rg`
- `jq`
- `curl`
- `lsof`
- `mysql` client (for cPanel DB diagnostics)

## Environment Expectations

- local MacBook is the control-plane host
- remote estates are reached through SSH aliases and cPanel account access
- `.env` must contain control-plane and estate credentials as needed
- remote Node.js and repo/site-root paths must be validated before cPanel app changes
