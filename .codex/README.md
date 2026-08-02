# Codex notes

Codex reads `AGENTS.md` and repository skills from `.agents/skills`. This kit also includes `.codex-plugin/plugin.json` for plugin packaging.

Useful built-ins in Codex CLI include `/init`, `/skills`, `/review`, `/permissions`, `/plan`, and `/goal` when available.

Native custom reasoning skills:

- `clearthought`: structured reasoning for broad or ambiguous coding tasks.
- `sequential-thinking`: step-by-step task splitting with revisions and branches.
- `reviewing-4p-priorities`: P0-P4 review triage and fix ordering.

Project-scoped Proofline roles live in `.codex/agents/`:

- `proofline_keeper`: read-only mandate, gate, budget, and signal custody.
- `proofline_wayfinder`: bounded planning, integration, and combined verification.
- `proofline_countervoice`: read-only premise, evidence, oracle, and acceptance challenge.
- `proofline_maker`: bounded implementation with a reproducible Proof Return.

Invoke `proofline-orchestration` or `/proofline` to use the contract. Codex custom-agent files omit model pins so they inherit the active session model. Role labels guide responsibility; the configured sandbox and actual runtime scopes provide the enforceable boundary.
