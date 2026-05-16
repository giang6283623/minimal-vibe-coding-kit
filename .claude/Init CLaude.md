# Init Claude — Project Bootstrap (Template)

> Per-session entry point. The AI reads this **after** confirming init is done
> (see `CLAUDE.md` → FIRST-TIME INIT TRIGGER). All concrete values live in
> `backbone.yml`. This file only describes *behavior*.
>
> Placeholders `<<...>>` are filled by the first-time init flow defined in
> `FIRST_TIME_INIT.md`. If you still see them, init has not completed.

## Project map (sourced from `backbone.yml`)

- Project name: `<<project.name>>`
- Type: `<<project.type>>` (single-repo / mono-repo / multi-repo)
- Primary language: `<<project.primary_language>>`
- Repos / roots: see `project.repos` in `backbone.yml`
- Agent config: `.claude/` (or `.cursor/` mirror)
- Structure map: `backbone.yml` (always the source of truth)
- Init runbook: `FIRST_TIME_INIT.md`

## First-load order (per session)

1. Read `backbone.yml`. If `meta.template_status` is not `initialized` and `.vibekit/INIT_DONE` is missing, stop and run `FIRST_TIME_INIT.md`.
2. Read every file under `structure.claude.rules` (if the list exists).
3. **Lazily** load workflows from `structure.claude.workflows` only when the current task matches the workflow's scope.
4. For complex tasks, load reasoning skills as needed:
   - `.claude/skills/sequential-thinking/SKILL.md` — exploration and step-by-step.
   - `.claude/skills/clearthought/SKILL.md` — 37 structured-reasoning operations.
   - `.claude/skills/reviewing-4p-priorities/SKILL.md` — P0–P4 triage.
   - `.claude/skills/autoresearch-coding/SKILL.md` — metric-driven research loop.

## Default quality gates

Use the commands declared in `backbone.yml → conventions.command_checks`. Do not invent commands. If a check is missing, ask the user before assuming one. Examples (replace with the actual entries from `backbone.yml`):

- Default: `<<conventions.command_checks.default>>`
- Per-repo (if multi-repo): one entry per repo under the same key (e.g. `backend`, `frontend`).

## Environment notes

- Dev ports: see `conventions.ports` in `backbone.yml`.
- API prefix / health path: see `conventions.api_prefix` and `conventions.health_path` (omit if not a web project).
- **Never print secrets** from any path matched by `conventions.protected_paths` (typically `.env*`, `**/secrets/**`).
- Never modify a path matched by `conventions.protected_paths` without explicit user approval.

## Reasoning policy

- **Normal mode**: natural language + direct code changes. Default.
- **Deep mode**: short structured sections (Assumptions / Options / Decision / Risks). Use when the task is ambiguous or risky.
- **JSON mode**: only when the user explicitly asks for JSON output.
- **Council / Sequential / Clearthought**: invoke when the user asks, or proactively if a change touches more than two files or has non-obvious trade-offs.

## Branching & commit defaults

- Default branch: `<<conventions.default_branch>>`
- Branch naming: `<<conventions.branch_naming>>` (e.g. `feat/2026-05-16-add-search`)
- Commit style: `<<conventions.commit_style>>`
- Experiment branches: `autoresearch/<YYYY-MM-DD>-<slug>` per `automation.autoresearch`.

## Done criteria for any task

- Relevant `command_checks` ran green, or are clearly reported as skipped with reason.
- Changed files listed.
- Risks and follow-up actions listed for non-trivial changes.
- Nothing under `conventions.protected_paths` was modified silently.
- No `rm` was used; deletions went through `trash` (see `CLAUDE.md`).

## Project-specific notes

<!--
  After init, the AI may add a short list of project-specific gotchas below
  (domain glossary, ownership boundaries, known fragile areas). Keep it
  terse — `backbone.yml` remains the source of truth for paths and commands.
-->

_(none yet — filled in after first-time init)_
