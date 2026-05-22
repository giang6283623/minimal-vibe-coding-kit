# AGENTS.md

Shared instructions for Claude, Cursor, Codex, and other coding agents.

<!-- BEGIN: minimal-vibe-coding-kit -->
## Minimal Vibe Coding Kit

### Source of truth

- Read `backbone.yml` before changing code.
- If `meta.template_status` is `uninitialized`, follow `FIRST_TIME_INIT.md` and wait for approval before writing.
- After init, follow the `conventions` rules in `backbone.yml`; ask before changing broad project patterns.
- Prefer concise root instructions. Put long procedures in skills and docs.

### Work style

- Start with a short plan for multi-file or risky changes.
- Prefer small, reviewable diffs.
- Reuse existing resource, localization, route, config, and generated-definition accessors instead of hardcoding literals when the repo has them.
- Run the validation command listed in `backbone.yml` after relevant changes.
- Summarize changed files, validation results, and remaining risks.

### Safety

- Never print full secrets.
- Do not run untrusted hooks, MCP servers, deploy scripts, package lifecycle scripts, migrations, or destructive shell commands just to inspect a repo.
- Do not modify protected paths from `backbone.yml` without explicit approval.
- If a task changes agent surfaces (`CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`, `skills/**`, `commands/**`, hooks, MCP config), run the AgentShield probe or explain why it was skipped.

### Skills to prefer

- `vibekit-init`: first-time init and repair.
- `autoresearch-coding`: metric-driven experiment loop.
- `agentshield-security-review`: agent-surface security review.
- `daily-workflow-curator`: daily proposal for improving rules, skills, workflows, and docs.

### Autoresearch loop contract

Use this when improving a repo over repeated experiments:

1. Define goal, metric command, direction, editable paths, protected paths, budget, and timeout.
2. Run a baseline before edits.
3. Change only editable paths.
4. Log every experiment.
5. Keep only changes that improve the metric or simplify without regression.
6. Discard or revert failed experiments.

### Daily enhance contract

Daily enhancement must propose changes, not silently apply them. The expected output is a report plus a diff proposal for user approval.
<!-- END: minimal-vibe-coding-kit -->
