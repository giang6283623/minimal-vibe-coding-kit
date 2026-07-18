# Grok notes

Grok Build (the `grok` CLI) reads `AGENTS.md` from the repo root down to the working directory (Codex-style), plus every `*.md` rule in `.grok/rules/`, and repository skills from `.grok/skills/`. User-invocable skills also appear as slash commands, for example `/memento` or `/prompt-sharpener`.

Useful built-ins include `/plan`, `/skills`, `/plugins`, `/hooks`, `/mcps`, and `/model`; `grok inspect` lists the config sources, instructions, skills, plugins, hooks, and MCP servers discovered for the current directory, and `grok -p "<prompt>"` runs headless.

Guardrails ship in two layers. This repo's `.grok/config.toml` carries project-scoped `[permission]` deny rules for dangerous commands — project configs support MCP servers, plugins, and permission rules. User preferences such as `[ui] permission_mode` are user-scoped only and belong in `~/.grok/config.toml`; see `config.example.toml`. Project `.grok/hooks/` require `/hooks-trust` before they run.

Native custom reasoning skills:

- `clearthought`: structured reasoning for broad or ambiguous coding tasks.
- `sequential-thinking`: step-by-step task splitting with revisions and branches.
- `reviewing-4p-priorities`: P0-P4 review triage and fix ordering.
