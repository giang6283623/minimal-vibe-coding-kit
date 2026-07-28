# Kimi notes

Kimi Code CLI (the `kimi` CLI, running Kimi K3 by default) loads `AGENTS.md` hierarchically from the repository root down to the working directory, with `.kimi/AGENTS.md` taking priority in each directory. The root `AGENTS.md` this kit maintains is therefore native Kimi configuration; no extra file is required.

Repository skills live in `.kimi/skills/`, Kimi's highest-priority project-level brand directory (`.kimi/skills` > `.claude/skills` > `.codex/skills`, with the generic `.agents/skills` always discovered as well). Invoke a skill with `/skill:<name>`, for example `/skill:sequential-thinking` or `/skill:prompt-sharpener`, or let the model pick it up from each skill's `description`. User-level skills can live in `~/.kimi/skills/` and extra directories can be declared with `extra_skill_dirs` in `config.toml` or the `--skills-dir` flag.

Guardrails: the kit's root `AGENTS.md` managed block (backbone-first, small diffs, writing style, safe-delete, AgentShield on agent-surface changes) applies to Kimi sessions exactly as it does to Claude Code, Codex, and Grok sessions. Keep `MOONSHOT_API_KEY` and other credentials out of prompts, logs, and skill files.

Native custom reasoning skills:

- `clearthought`: structured reasoning for broad or ambiguous coding tasks.
- `sequential-thinking`: step-by-step task splitting with revisions and branches.
- `reviewing-4p-priorities`: P0-P4 review triage and fix ordering.
- `graph-engineering-verified-orchestration`: bounded dependency graphs with verified execution; use `--format=ascii` renders in the Kimi TUI.
