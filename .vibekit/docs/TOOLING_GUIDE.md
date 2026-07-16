# Tooling guide

## Claude Code

Use root `CLAUDE.md` plus project skills in `.claude/skills/`. Keep long instructions out of `CLAUDE.md` and in skills. The kit provides shims that point to canonical shared skills under `.vibekit/skills/`.

## Cursor

Use `.cursor/rules/*.mdc`. The kit creates always-on core rules plus scoped rules for init, autoresearch, and security. Keep Cursor rules short; link to skills and docs for long procedures.

## Codex

Use `AGENTS.md` for repo instructions and `.agents/skills/*/SKILL.md` for skills. The kit also includes `.codex-plugin/plugin.json` so the shared skills can be packaged as a plugin.

## Shared skill strategy

Canonical skill bodies live in `.vibekit/skills/<skill-name>/`. Harness-specific folders contain small shims:

- `.claude/skills/<skill-name>/SKILL.md`
- `.agents/skills/<skill-name>/SKILL.md`

This reduces drift while still giving each tool the path it expects.
