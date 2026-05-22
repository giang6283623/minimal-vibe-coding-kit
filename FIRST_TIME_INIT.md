# FIRST_TIME_INIT.md - bootstrap runbook

Audience: Claude, Cursor, Codex, or any AI coding agent in a repo that just received Minimal Vibe Coding Kit.

Keep this flow short. Detailed schema notes live in `docs/BACKBONE_REFERENCE.md`.

## Requirements to print before starting

Before writing anything, print this checklist and mark each item as found, missing, or inferred:

1. `backbone.yml` exists.
2. `AGENTS.md` exists or will be created/merged.
3. `CLAUDE.md` exists or will be created from `CLAUDE-template.md` when Claude support is installed.
4. At least one harness folder exists: `.claude/`, `.cursor/`, `.agents/`, or `.codex-plugin/`.
5. Git status is known. If user changes exist, do not overwrite them.
6. A validation command is inferred or set to `node scripts/validate-kit.mjs .` for the kit itself.
7. Protected paths include `.env*`, secrets, lockfiles, generated files, build output, migrations, and infra unless the user says otherwise.

## Canonical prompt

```text
Read FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff for backbone.yml and managed instruction blocks, and wait for my yes before writing.
After approval, write the files, run validation, and summarize what changed.
```

## Done check

Open `backbone.yml`.

- If `meta.template_status` is `initialized`, skip init. If `.vibekit/INIT_DONE` is missing, recreate it as a local cache and continue.
- If `meta.template_status` is `uninitialized`, continue.
- If `backbone.yml` is missing, stop and tell the user to install/copy the kit first.

The sentinel file is not required in source control. `backbone.yml` is the durable source of truth.

## Detect

Prefer filesystem evidence over README claims.

- Project name: `package.json:name`, `pyproject.toml` project name, `go.mod` module basename, else folder name.
- Type: monorepo marker (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`, `lerna.json`, `go.work`) means monorepo; otherwise single-repo unless multiple app roots are obvious.
- Primary language: strongest marker or source file counts.
- Package manager: lockfile wins.
- Commands: infer test, lint, typecheck, build from package scripts, Makefile, Go, Python, Rust, Java, dotnet, PHP, Ruby, or existing CI.
- Paths: infer source, tests, docs, config, generated output.

Optional helper:

```bash
node scripts/init-backbone.mjs . --propose
```

## Propose before writing

Show one unified diff for:

- `backbone.yml`
- `CLAUDE.md` managed block or new file when Claude is active
- `AGENTS.md` managed block or new file when Codex/general agent support is active
- missing `.cursor/rules` or `.agents/skills` shims only if the installer did not add them

Ask exactly:

```text
Apply this proposed backbone? Reply yes, edit, or abort.
```

## Apply after user says yes

1. Write approved changes only.
2. Set `meta.template_status: initialized`.
3. Set `meta.initialized_at` to current UTC ISO timestamp.
4. Create `.vibekit/INIT_DONE` with the same timestamp.
5. Run the validation command from `backbone.yml`.
6. Print a short completion summary.

CLI helper after approval:

```bash
node scripts/init-backbone.mjs . --write --yes
```

## Merge rules

### CLAUDE.md

- If no `CLAUDE.md` exists, copy `CLAUDE-template.md` to `CLAUDE.md`.
- If `CLAUDE.md` exists, append or replace only this managed block:

```markdown
<!-- BEGIN: minimal-vibe-coding-kit -->
@AGENTS.md

## Minimal Vibe Coding Kit

- Read `backbone.yml` before changing code.
- If `meta.template_status` is `uninitialized`, follow `FIRST_TIME_INIT.md` and wait for approval before writing.
- Prefer project skills for multi-step workflows: `/autoresearch-coding`, `/security-scan`, `/daily-enhance`.
<!-- END: minimal-vibe-coding-kit -->
```

### AGENTS.md

- If no `AGENTS.md` exists, create it from this kit.
- If it exists, append or replace only the Minimal Vibe managed block.
- Keep project-specific content outside the managed block.

## Guardrails

- No silent writes to root instructions, rules, skills, workflows, or `backbone.yml`.
- Do not run package scripts, hooks, MCP servers, deploys, migrations, or destructive commands during init.
- Do not modify protected paths unless the user explicitly approves.
- Keep `CLAUDE.md`, `AGENTS.md`, and Cursor rules concise. Move procedures into skills.
- If unsure, produce a proposal and ask for `yes`, `edit`, or `abort`.
