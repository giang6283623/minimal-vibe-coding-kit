# Backbone reference

`backbone.yml` is the project map. Keep it short enough that agents can read it every session.

## Required sections

- `meta`: init status and schema version.
- `project`: name, description, repo type, primary language, package manager, `mode` (greenfield/brownfield), `prd` (path or `none`), `context` (glossary path or `none`).
- `paths`: code, tests, docs, and generated output.
- `conventions`: user-reviewed project rules inferred from existing code.
- `commands`: install, test, lint, typecheck, build, validate.
- `policy`: branch, commit, editable paths, protected paths.
- `agent_surfaces`: Claude, Cursor, Codex, Grok, shared skills, shared commands.
- `automation`: autoresearch, daily enhance, finalize (graduation cleanup), security.

## Init status

`meta.template_status` is the durable init flag.

- `uninitialized`: agent must run `.vibekit/init/FIRST_TIME_INIT.md`.
- `initialized`: agent skips init and proceeds.

`.vibekit/INIT_DONE` is a local cache only. It helps prevent same-machine repeat init, but does not need to be committed.

## Command selection

Use the most specific command the repo already supports.

Examples:

- Node: `pnpm test`, `npm test`, `npm run build`.
- Python: `pytest -q`, `ruff check .`, `pyright`.
- Go: `go test ./...`, `go build ./...`.
- Rust: `cargo test`, `cargo clippy --all-targets`.
- Java: `mvn test`, `gradle test`.

If no command is known, leave `validate` as a safe echo and ask the user to fill it.

## Conventions

The `conventions` section is created during first-time init and must be reviewed before writing. It should capture repo-specific rules with evidence, not a fixed framework template.

`conventions.review_required_before_write: true` means: before writing to agent surfaces or instruction files — rules, skills, workflows, commands, root instruction files, and `backbone.yml` itself — the agent must show the proposed diff and wait for explicit approval. It does not gate ordinary code edits inside `policy.editable_paths`. Skills that offer a "clean, proceed in the same turn" path (for example `claim`) must downgrade to propose-and-wait for writes this flag covers.

Include:

- Naming style for files, directories, and symbols.
- Architecture or folder patterns, scoped per app/package when evidence differs.
- Resource access rules for assets, images, routes, API paths, config keys, design tokens, or generated definitions.
- Localization/message access rules when catalogs or generated accessors exist.
- Custom team rules confirmed by the user.

If the repo has an accessor such as `AppImages.logo`, an asset registry, generated routes, `.arb` localization, or a message helper, future work should use that pattern instead of hardcoded literals. If no convention exists and adding one would affect many files, ask before adding the abstraction.

## Protected paths

Protect secrets, generated output, dependency folders, lockfiles, migrations, and infra by default. The user can explicitly approve a narrow exception.

## Editable paths

For normal tasks, editable paths should be narrow. For an initial kit install, `.` is acceptable only until project-specific paths are detected.
