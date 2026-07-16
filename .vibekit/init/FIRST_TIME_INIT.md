# .vibekit/init/FIRST_TIME_INIT.md - bootstrap runbook

Audience: Claude, Cursor, Codex, or any AI coding agent in a repo that just received Minimal Vibe Coding Kit.

Keep this flow short. Detailed schema notes live in `.vibekit/docs/BACKBONE_REFERENCE.md`.

## Requirements to print before starting

Before writing anything, print this checklist and mark each item as found, missing, or inferred:

1. `backbone.yml` exists.
2. `AGENTS.md` exists or will be created/merged.
3. `CLAUDE.md` exists or will be created from `.vibekit/init/CLAUDE-template.md` when Claude support is installed.
4. At least one harness folder exists: `.claude/`, `.cursor/`, `.agents/`, or `.codex-plugin/`.
5. Git status is known. If user changes exist, do not overwrite them.
6. A validation command is inferred or set to `node .vibekit/scripts/validate-kit.mjs .` for the kit itself.
7. Protected paths include `.env*`, secrets, lockfiles, generated files, build output, migrations, and infra unless the user says otherwise.
8. Existing naming, architecture, resource, and localization conventions are scanned or marked missing.

## Canonical prompt

```text
Read .vibekit/init/FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff for backbone.yml and managed instruction blocks, and wait for my yes before writing.
Include inferred project conventions for naming, architecture, resources, localization, generated definitions, and per-app/package differences.
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
- Conventions: infer naming style, folder architecture, shared resource access, localization/message access, generated-code boundaries, and per-app or per-package differences.
- Project mode: `greenfield` when no source code exists yet, otherwise `brownfield`. Stored as `project.mode`.
- PRD/docs: detect an existing PRD, requirements, or spec document. Stored as `project.prd` (path or `none`).

## Project understanding (PRD)

Always offer a short interview during init so the kit understands what the project is and where to focus, then propose a PRD. Do this whether the repo is empty, has code, or already has docs.

Ask (keep it short):

1. What is this project and who is it for?
2. What core problem does it solve, and what is the primary goal/focus right now?
3. What does success look like (key outcomes or metrics)?
4. What are the key constraints or non-goals?
5. Brownfield only: which existing area should we improve first?

Then:

- If `project.prd` is `none`, propose creating `.vibekit/docs/PRD.md` from `.vibekit/docs/templates/PRD_TEMPLATE.md` using the answers, and set `project.prd` to that path in the same diff.
- If a PRD already exists, read it, link it in `project.prd`, and offer to refresh it without overwriting unapproved content.
- Record domain terms and acronyms in `.vibekit/docs/CONTEXT.md` (scaffold from `.vibekit/docs/templates/CONTEXT_TEMPLATE.md`) and link it in `project.context`, so future agents stay concise.
- Keep the PRD short: it captures intent and focus, not a full specification.

## FIRST_TIME_INIT_RULES

Create project rules from evidence in the existing repo, not from a fixed language or framework template.

- Scope rules to the smallest accurate boundary: repo, app, package, service, module, or folder. In monorepos and multi-repo workspaces, do not force one package's style onto another when evidence differs.
- Naming: detect dominant file, directory, symbol, test, component, handler, model, and module naming patterns from nearby code. If no pattern is clear, propose a neutral default and ask before writing it into `backbone.yml`.
- Architecture: detect existing structures such as MVC, MVVM, feature modules, services/repositories, domain/application/infrastructure layers, route/page/screen folders, package boundaries, or framework-specific layouts. New code should enter the nearest matching structure before introducing a new top-level pattern.
- Resources: detect whether assets, images, icons, routes, API paths, themes, configs, or other shared resources are accessed through constants, registries, generated APIs, or helper modules. If such a pattern exists, rules must prefer that accessor over hardcoded literals. For example, prefer a detected `AppImages.logo` or equivalent project accessor over a raw path such as `assets/images/logo.png`.
- Localization and copy: detect catalogs and accessors such as `.arb`, locale folders, message files, generated localization APIs, or translation helpers. If present, rules must prefer those accessors over hardcoded user-facing text.
- Generated and shared definitions: detect generated files, enums, schemas, OpenAPI/GraphQL clients, design tokens, route maps, or other single-source definitions. Rules should reuse or update the source definition instead of duplicating literals.
- Missing conventions: if the repo lacks a shared abstraction and adding one would affect many files, propose it as a pending rule and ask the user to reply `yes`, `edit`, or `abort` before implementation.
- Store confirmed rules in `backbone.yml` under `conventions`. Future agents must follow those confirmed rules and ask before changing them.

Optional helper:

```bash
node .vibekit/scripts/init-backbone.mjs . --propose
```

## Propose before writing

Show one unified diff for:

- `backbone.yml`
- the `backbone.yml` `conventions` rules inferred from existing code, including evidence and unresolved questions
- `CLAUDE.md` managed block or new file when Claude is active
- `AGENTS.md` managed block or new file when Codex/general agent support is active
- missing `.cursor/rules` or `.agents/skills` shims only if the installer did not add them

Ask exactly:

```text
Apply this proposed backbone and convention rules? Reply yes, edit, or abort.
```

## Apply after user says yes

1. Write approved changes only.
2. Set `meta.template_status: initialized`.
3. Set `meta.initialized_at` to current UTC ISO timestamp.
4. Create `.vibekit/INIT_DONE` with the same timestamp.
5. Run the validation command from `backbone.yml`.
6. Print a short completion summary.
7. Offer graduation: once the user confirms setup is done, run the cleanup in the Graduation section below to remove one-time bootstrap files.

CLI helper after approval:

```bash
node .vibekit/scripts/init-backbone.mjs . --write --yes
```

## Merge rules

### CLAUDE.md

- If no `CLAUDE.md` exists, copy `.vibekit/init/CLAUDE-template.md` to `CLAUDE.md`.
- If `CLAUDE.md` exists, append or replace only this managed block:

```markdown
<!-- BEGIN: minimal-vibe-coding-kit -->
@AGENTS.md

## Minimal Vibe Coding Kit

- Read `backbone.yml` before changing code.
- If `meta.template_status` is `uninitialized`, follow `.vibekit/init/FIRST_TIME_INIT.md` and wait for approval before writing.
- After init, follow `backbone.yml` `conventions` before adding new project patterns.
- Prefer project skills for multi-step workflows: `/autoresearch-coding`, `/security-scan`, `/daily-enhance`.
<!-- END: minimal-vibe-coding-kit -->
```

### AGENTS.md

- If no `AGENTS.md` exists, create it from this kit.
- If it exists, append or replace only the Minimal Vibe managed block.
- Keep project-specific content outside the managed block.

## Graduation (cleanup after setup)

Once init is `initialized` and the first prompt is complete, the bootstrap files are no longer needed in the project. Offer to graduate them so the repo stays clean.

- Preview: `node .vibekit/scripts/vibekit-finalize.mjs . --propose`
- Apply after the user agrees: `node .vibekit/scripts/vibekit-finalize.mjs . --write --yes`

This moves one-time files (`.vibekit/init/FIRST_TIME_INIT.md`, `.vibekit/init/FIRST_PROMPT.md`, `.vibekit/init/PUSH_TO_GITHUB.md`, `.vibekit/init/CLAUDE-template.md` once `CLAUDE.md` exists) into the folder named by `automation.finalize.cleanup_dir` (default `_vibekit-cleanup/`), writes a `RESTORE.md`, and sets `automation.finalize.marker`. It is idempotent, reversible with `--restore --write`, and refuses to run on the kit source repo. The durable project map is `backbone.yml`; none of the graduated files are needed to keep working. Delete the cleanup folder when satisfied.

## Guardrails

- No silent writes to root instructions, rules, skills, workflows, or `backbone.yml`.
- Do not run package scripts, hooks, MCP servers, deploys, migrations, or destructive commands during init.
- Do not modify protected paths unless the user explicitly approves.
- Keep `CLAUDE.md`, `AGENTS.md`, and Cursor rules concise. Move procedures into skills.
- Do not hardcode paths, resources, user-facing text, config keys, routes, or generated values when the repo already has a shared accessor or definition.
- If unsure, produce a proposal and ask for `yes`, `edit`, or `abort`.
