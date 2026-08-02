# Kimi notes

Kimi Code CLI (the successor to the older Kimi CLI, which is being wound down) reads project instructions from the root `AGENTS.md`, with `.kimi-code/AGENTS.md` taking priority when present. Global instructions can live at `$KIMI_CODE_HOME/AGENTS.md` (default `~/.kimi-code/AGENTS.md`) or the generic `~/.agents/AGENTS.md`. The root `AGENTS.md` this kit maintains is therefore native Kimi configuration; no extra file is required.

Repository skills live in `.kimi-code/skills/`, Kimi Code's project-level brand skills directory. The generic `.agents/skills/` directory is discovered as well, and the brand directory wins when a skill name exists in both. Invoke a skill with `/skill:<name>`, for example `/skill:sequential-thinking` or `/skill:prompt-sharpener`, or let the model pick it up from each skill's `description`. User-level skills can live in `$KIMI_CODE_HOME/skills/` (default `~/.kimi-code/skills/`) or `~/.agents/skills/`, and extra directories can be declared with `extra_skill_dirs` in `config.toml`.

Guardrails: the kit's root `AGENTS.md` managed block (backbone-first, small diffs, writing style, safe-delete, AgentShield on agent-surface changes) applies to Kimi sessions exactly as it does to Claude Code, Codex, and Grok sessions. Keep `MOONSHOT_API_KEY` and other credentials out of prompts, logs, and skill files.

Native custom reasoning skills:

- `clearthought`: structured reasoning for broad or ambiguous coding tasks.
- `sequential-thinking`: step-by-step task splitting with revisions and branches.
- `reviewing-4p-priorities`: P0-P4 review triage and fix ordering.
- `graph-engineering-verified-orchestration`: bounded dependency graphs with verified execution; use `--format=ascii` renders in the Kimi TUI.
- `proofline-orchestration`: role-separated governance with independent challenge, typed signals, and evidence-bound Proof Returns.
