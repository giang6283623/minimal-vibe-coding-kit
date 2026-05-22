# Install guide

## Local install

```bash
./install.sh /path/to/project
```

## Node install

```bash
node scripts/mvck.mjs install /path/to/project --profile all
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
node scripts/mvck.mjs install /path/to/project --profile all --dry-run
node scripts/mvck.mjs install /path/to/project --profile all --dry-run --json
```

## After install

Paste the universal prompt from `FIRST_PROMPT.md`, or run:

```bash
node scripts/init-backbone.mjs . --propose
```

Use a preset when you already know the target stack:

```bash
node scripts/mvck.mjs init . --preset nextjs --propose
node scripts/mvck.mjs init . --preset wordpress --propose
node scripts/mvck.mjs init . --preset python --propose
node scripts/mvck.mjs init . --preset laravel --propose
node scripts/mvck.mjs init . --preset docker --propose
```

Review the proposal. After approval:

```bash
node scripts/init-backbone.mjs . --write --yes
```

## Doctor

Run a read-only health check after install:

```bash
node scripts/mvck.mjs doctor .
```

Generate a handoff report:

```bash
node scripts/mvck.mjs doctor . --write-report
```

## Native reasoning skills

The installer includes three flexible custom reasoning skills across Claude, Codex, and Cursor. These install as full skill folders, including examples and references for progressive disclosure:

- `clearthought`: clarify ambiguous tasks and choose a reasoning mode.
- `sequential-thinking`: split complex work into ordered implementation steps.
- `reviewing-4p-priorities`: classify review findings or bugs as P0-P4 and choose fix order.
