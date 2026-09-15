# AI coding — research notes

## Core theses

1. **Context is the scarce resource.** New task → new session. Never let it
   wander into tangents.
2. **Specificity is the job.** Writing the spec _is_ the engineering work now.
   The model isn't the bottleneck.
3. **Plan before code, verify after.** Plan mode → plan → tests → code.
   Never trust output I haven't run.
4. **Config over repetition.** Anything I type twice belongs in a file.
5. **Automate the loops.** Security scans, dependency audits, brainstorming.
6. **Use it to learn, not just to produce.**

## My prompt template

IMPLEMENT: <specific change>
GOAL: <what "done" means, observably>
USING: <libraries, patterns, existing code to mirror>
WORK IN: <exact file paths — nothing else>
RESPECT: <constraints, things not to touch>
PROVIDE: <diff / tests passing / summary>
IF ASSUMPTIONS ARE NEEDED, LIST THEM FIRST AND STOP.

## Interview trick (for anything non-trivial)

"I want to build <one line>. Interview me in detail before writing anything.
Ask one question at a time."
→ Answer honestly incl. "I don't know". Output is a spec I couldn't write cold.

## Where instructions go (this was my blind spot)

| Want                            | Use                          |
| ------------------------------- | ---------------------------- |
| Build cmds, layout, conventions | CLAUDE.md (root, <200 lines) |
| Constraint on _some_ files      | path-scoped rule             |
| Repeatable procedure            | skill                        |
| Isolated side work              | subagent                     |
| Must happen every time          | hook                         |
| Must never happen               | hook + permissions           |

Key: a line in CLAUDE.md is a suggestion. Only hooks/permissions are guardrails.

## Corrections to my earlier notes

- **Subagents aren't a token luxury — they SAVE context.** Fresh context window,
  only the summary comes back. This is literally my "no tangents" rule enforced
  structurally. I had this backwards.
- **"Make it teach me" needs no custom agent.** Built-in output styles:
  Proactive / Explanatory / Learning. Try before building.

## Still to figure out

- [ ] worktrees — `git worktree add ../proj-x feature-x`, parallel sessions
- [ ] hooks — actual syntax, settings.json
- [ ] MCP — only worth it when reaching outside the repo (DB, Sentry, Linear)
- [ ] skills — write first one after typing same procedure 3×
- [ ] scheduling / recurring automation

## Per-feature routine

1. Interview
2. Plan mode — iterate on the PLAN, not the code (100× cheaper)
3. Tests first, failing, and stated as not-to-be-modified
4. Implement with template
5. Verify myself + /code-review on the diff
6. New session for next feature. Don't compact. Don't continue.

## Don't build the system before the pain

Run the routine on one real feature. The friction tells me which of
skills/hooks/MCP to build first — and it won't be what I'd guess.

## Sources

- https://code.claude.com/docs/en/best-practices
- https://claude.com/blog/steering-claude-code-skills-hooks-rules-subagents-and-more
