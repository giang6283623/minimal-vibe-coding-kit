@AGENTS.md

# Claude Code

This file is intentionally small. Shared rules live in `AGENTS.md`, project facts live in `backbone.yml`, and long procedures live in `.claude/skills/`.

## Startup

1. Read `backbone.yml`.
2. If `meta.template_status` is `uninitialized`, follow `FIRST_TIME_INIT.md` before other work.
3. If initialized, continue with the user's task.

## Useful skills

- `/init-vibe` - initialize or repair the kit setup.
- `/autoresearch-coding` - run a metric-driven improvement loop.
- `/security-scan` - run AgentShield-style review.
- `/daily-enhance` - propose rule, skill, and workflow improvements.

## Hard rules

- Show a diff and wait for explicit approval before changing root instruction files, `backbone.yml`, rules, skills, or workflows.
- Do not deploy, rotate secrets, run migrations, delete data, or rewrite remote history without explicit approval.
- Keep `.autoresearch/`, `results.tsv`, and `.vibekit/reports/` local unless the user asks to commit them.
