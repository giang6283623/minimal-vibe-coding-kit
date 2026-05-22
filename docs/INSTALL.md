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
- `cursor`: `.cursor/rules`, `.cursor/commands`.
- `codex`: `AGENTS.md`, `.agents/skills`, `.codex-plugin`, `.codex` examples.
- `all`: every profile.

## Safe behavior

The installer:

- skips existing files unless `--force` is passed;
- appends managed blocks instead of replacing existing `CLAUDE.md`, `AGENTS.md`, and `.gitignore`;
- does not mark `backbone.yml` initialized;
- does not run package scripts in the target project.

## After install

Paste the universal prompt from `FIRST_PROMPT.md`, or run:

```bash
node scripts/init-backbone.mjs . --propose
```

Review the proposal. After approval:

```bash
node scripts/init-backbone.mjs . --write --yes
```
