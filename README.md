# ai-practice

Practice repo for AI-assisted development. Setup notes in `notes/`.

## env-check

Compares `.env` against `.env.example` and reports missing, empty, and extra
variables. Exits 1 when a required variable is missing, so it works as a CI check.

```bash
pnpm env-check
```

v0 handles `KEY=value`, comments, and blank lines. Quoted values, `export`
prefixes, multiple `.env.*` files, and CLI flags are backlog — see `spec.md`.