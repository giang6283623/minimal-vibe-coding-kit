# Install guide

## Local install

```bash
./install.sh /path/to/project
```

## Node install

```bash
node .vibekit/scripts/mvck.mjs install /path/to/project --profile all
```

Profiles:

- `claude`: `CLAUDE.md`, `.claude/`, Claude skills, agents, commands, rules.
- `cursor`: `.cursor/rules`, `.cursor/commands`, Cursor skill entrypoints.
- `codex`: `AGENTS.md`, `.agents/skills`, `.codex-plugin`, `.codex` examples.
- `all`: every profile.

## Safe behavior

The installer:

- skips existing files unless `--force` is passed;
- appends managed blocks instead of replacing existing `CLAUDE.md`, `AGENTS.md`, and `.gitignore`;
- does not mark `backbone.yml` initialized;
- does not run package scripts in the target project.

Preview without writing:

```bash
node .vibekit/scripts/mvck.mjs install /path/to/project --profile all --dry-run
node .vibekit/scripts/mvck.mjs install /path/to/project --profile all --dry-run --json
```

## Update an existing project

When a newer kit version ships, refresh kit-owned files without touching user-owned ones:

```bash
npx --yes minimal-vibe-coding-kit@latest update .
# or from a local kit clone:
node /path/to/kit/.vibekit/scripts/mvck.mjs update /path/to/project
```

The updater:

- refreshes kit-owned surfaces (`.vibekit/skills/`, `.vibekit/commands/`, `.vibekit/scripts/`, `.vibekit/docs/`, and the `.claude/`, `.cursor/`, `.agents/`, `.codex*` mirrors) and adds any new kit skills;
- never overwrites `backbone.yml`, `CLAUDE.md`, `AGENTS.md` content outside the managed block, or `settings.json` files — those are seeded only if missing;
- backs up every replaced kit file to `.vibekit/update-backup/<timestamp>/` (disable with `--no-backup`);
- never deletes files you added, and skips re-seeding one-time files after `mvck finalize`;
- records the kit version in `.vibekit/KIT_VERSION` (shown by `mvck doctor`).

Preview without writing:

```bash
npx --yes minimal-vibe-coding-kit@latest update . --dry-run
npx --yes minimal-vibe-coding-kit@latest update . --dry-run --json
```

Note: run the updater from a newer kit (npx or a local clone), not via the project's own `.vibekit/scripts/mvck.mjs` copy — source and target would be the same files.

## After install

Paste the universal prompt from `.vibekit/init/FIRST_PROMPT.md`, or run:

```bash
node .vibekit/scripts/init-backbone.mjs . --propose
```

Use a preset when you already know the target stack:

```bash
node .vibekit/scripts/mvck.mjs init . --preset nextjs --propose
node .vibekit/scripts/mvck.mjs init . --preset wordpress --propose
node .vibekit/scripts/mvck.mjs init . --preset python --propose
node .vibekit/scripts/mvck.mjs init . --preset laravel --propose
node .vibekit/scripts/mvck.mjs init . --preset docker --propose
```

Review the proposal. After approval:

```bash
node .vibekit/scripts/init-backbone.mjs . --write --yes
```

## Doctor

Run a read-only health check after install:

```bash
node .vibekit/scripts/mvck.mjs doctor .
```

Generate a handoff report:

```bash
node .vibekit/scripts/mvck.mjs doctor . --write-report
```

## Native reasoning skills

The installer includes three flexible custom reasoning skills across Claude, Codex, and Cursor. These install as full skill folders, including examples and references for progressive disclosure:

- `clearthought`: clarify ambiguous tasks and choose a reasoning mode.
- `sequential-thinking`: split complex work into ordered implementation steps.
- `reviewing-4p-priorities`: classify review findings or bugs as P0-P4 and choose fix order.

## Visual design loop skill

The installer also includes `visual-design-loop` for Claude and Codex surfaces. Use it when a loop goal touches UI polish, screenshots, rendering, visual QA, or visible frontend behavior.

## User-invoked utility skills

Two user-invoked skills install across Claude, Codex, and Cursor surfaces:

- `memento`: write a `MEMENTO.md` working note before closing a multi-day task (`/memento`), then resume from it in the next session (`/memento resume`).
- `coding-level`: set the explanation register from 0 (ELI5) to 5 (expert peer) with `/coding-level N`; stays active until reinvoked.
