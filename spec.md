# env-check — full spec (backlog)

This is the complete behavioral design produced by an in-depth interview, covering more than the v0 implementation currently ships. v0 (see the module docs in `src/env-check/`) implements a strict subset: single `.env` vs `.env.example`, no flags, minimal parser. Everything below is scope for later passes, not yet built.

## Empty definition (full)

A key counts as empty if any of: `KEY=` (nothing after `=`), `KEY=""` or `KEY=''` (empty quoted string), `KEY=   ` (whitespace-only value), or bare `KEY` with no `=` at all. (Fully implemented. Note: quoted whitespace like `KEY="  "` is deliberately NOT empty — the quotes make the space literal content.)

## Optional marker

An inline trailing comment in `.env.example` only, exact-match (case-insensitive, trimmed) `# optional` — e.g. `API_KEY= # optional`. Exempts the key from both the missing check and the empty check, unconditionally, everywhere. Not implemented in v0 (every example key is required).

## Duplicate keys

If the same key appears twice in one file, that's a hard error for *that file* — the run continues checking other files, but that file's report shows the duplicate instead of computed findings, and the overall exit code reflects the failure. (v0: last occurrence silently wins, no error — a known simplification.)

## Extra variables

Reported by default. `--ignore-extra=KEY1,KEY2` (exact key names only, no wildcards, no config file) suppresses matching keys from the report entirely, as if they weren't extra — the filtering happens once, on the `extra` findings, before either formatting or exit-code evaluation runs. Because it's a single filter applied up front, a suppressed key can neither appear in output nor by itself trigger `--fail-on=extra` — only a *non-ignored* extra key can do either of those things. (v0 has no ignore mechanism; not needed since there's no `--fail-on` either.)

## File discovery

Auto-discover via directory listing: `.env` and any `.env.*` file in the cwd, excluding `.env.example` itself, sorted alphabetically for deterministic output. No path-override flags planned. (v0 only ever looks at exactly `.env`.)

## Exit code

`--fail-on=<comma list of missing,empty,extra>`, default `missing`. Any triggered finding, or a structural error (duplicate key, missing `.env.example`), causes exit 1 — the two failure classes deliberately share one code, kept simple; only a CLI usage error (bad flag/value, unknown flag) gets a distinct code, 2. An explicit `--fail-on=` (empty string) means "fail on nothing," not an error. (v0 hardcodes the `missing`-only default with no override flag.)

## Value exposure

Never print actual values from `.env`, anywhere, under any circumstance — key names only in all output. `.env.example`'s own values are irrelevant and ignored entirely except for the optional marker; it's purely a key-name template. (Already true in v0.)

## Output format

Human-readable text only, no JSON mode. Grouped by file, one section per discovered variant: a clean file prints `<file>: OK` on one line; a file with findings prints a header line `<file>:` then indented `KIND: KEY` lines in fixed order (MISSING, then EMPTY, then EXTRA), regardless of internal computation order, plus any malformed-line warnings for that file appended at the end of its section as `  WARNING: line N: malformed line, skipped: "<original line>"`. (v0 has this same per-finding format already, just for a single hardcoded `.env` file with no warnings.)

## Missing files handling

If `.env.example` doesn't exist: hard error, exit 1. If `.env.example` exists but zero `.env`/`.env.*` variant files are found: print a warning, exit 0 (don't fail just because there's nothing to check). (v0 has only one expected variant filename, so this collapses to a simpler rule: a missing `.env` is its own specific error, exit 1 — not a warning, and not silently treated as an empty file — since with only one file to check, "nothing to check" and "the one file is missing" are the same situation and it's worth calling out by name.)

## Case sensitivity

Key comparison is case-sensitive throughout (`DATABASE_URL` ≠ `database_url`). (Already true in v0.)

## Parser scope (full)

Supports: basic `KEY=value`, `#` full-line comments, blank lines, quoted values (`"..."`/`'...'`, so `=`/`#` inside quotes don't break parsing or end the value early), an `export ` line prefix (requires whitespace after "export" so `exported=` isn't mistaken for it), and unquoted trailing `# comment` stripping — a `#` must be preceded by whitespace to start a comment, so `PORT=3000#x` is *not* a comment and the whole `3000#x` is the literal value. Multiline/escaped values are explicitly out of scope even for this fuller spec — an unterminated quote is a malformed line, not a hang or a truncation guess. A line that's non-blank, non-comment, and doesn't match `KEY`/`KEY=value` (with optional `export` prefix) is skipped but produces a `WARNING` line in that file's report, rather than erroring or vanishing silently. (v0 implements the basic `KEY=value` + comments + blanks, plus the `export` prefix; quotes, trailing-comment stripping, and malformed-line warnings remain unimplemented, with non-matching lines silently ignored instead.)

## Commented-out lines

A commented-out assignment, e.g. `# DATABASE_URL=postgres://...`, is parsed as an ordinary full-line comment — it contributes nothing, so the key is simply absent and naturally reported as missing. No special-case code is needed for this; it falls out of the full-line-comment rule. (Already true in v0, same mechanism.)

## I/O error handling

File reads (and any other filesystem call beyond the initial `existsSync` presence check) should be wrapped in try/catch, with failures reported as a clean, specific error message and exit 1 — e.g. "Error: could not read .env: permission denied" — instead of letting a raw Node exception/stack trace reach the user. This covers cases `existsSync` doesn't rule out: permission-denied, the path being a directory instead of a file, encoding issues, or a race where the file is removed between the existence check and the read. **Not implemented in v0** — `cli.ts` currently calls `readFileSync` directly and would crash with an unhandled exception on any of these, rather than a clean message. Worth fixing before this tool is relied on outside a controlled dev environment.
