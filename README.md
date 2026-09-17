# ai-practice

Practice repo for AI-assisted development. Setup notes in `notes/`.

## env-check

Compares `.env` against `.env.example` and reports missing, empty, and extra
variables. Exits 1 when a required variable is missing, so it works as a CI check.

```bash
pnpm env-check                          # fail on missing keys (default)
pnpm env-check --fail-on=missing,empty  # also fail on empty values
pnpm env-check --fail-on=               # report only, never fail
pnpm env-check --ignore-extra=OLD_FLAG  # suppress known extras
```

v0 handles `KEY=value`, comments, and blank lines. Quoted values, `export`
prefixes, multiple `.env.*` files, and CLI flags are backlog — see `spec.md`.