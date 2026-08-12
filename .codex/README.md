# Codex notes

Codex reads `AGENTS.md` and repository skills from `.agents/skills`. This kit also includes `.codex-plugin/plugin.json` for plugin packaging.

Useful built-ins in Codex CLI include `/init`, `/skills`, `/review`, `/permissions`, `/plan`, and `/goal` when available.

Native custom reasoning skills:

- `clearthought`: structured reasoning for broad or ambiguous coding tasks.
- `sequential-thinking`: step-by-step task splitting with revisions and branches.
- `reviewing-4p-priorities`: P0-P4 review triage and fix ordering.
- `agent-control-center`: provider-neutral controller ownership, bounded worker dispatch, receipts, and safe fallbacks.
- `swap-control-center`: dynamic verified controller, transport, model, and reasoning selection with one bounded transfer.

Project-scoped Proofline roles live in `.codex/agents/`:

- `proofline_keeper`: read-only mandate, gate, budget, and signal custody.
- `proofline_wayfinder`: bounded planning, integration, and combined verification.
- `proofline_countervoice`: read-only premise, evidence, oracle, and acceptance challenge.
- `proofline_maker`: bounded implementation with a reproducible Proof Return.

Invoke `proofline-orchestration` or `/proofline` to use the contract. Codex custom-agent files omit model pins so a parent can apply task-specific routing. Codex resolves model and reasoning settings independently: an agent-file pin, an explicit spawn value, the corresponding `[agents]` default, then the parent value.

For Auto or Custom routing, use `.vibekit/scripts/orchestration-routing.mjs` to validate a fresh runtime inventory, including the selected agent profile's nullable model pins, and produce exact `agent_type`, `model`, `reasoning_effort`, and `fork_turns` values before the native spawn call. After spawn, accept the lane only when an externally authenticated control-plane receipt passes the helper's exact binding check. The helper cannot authenticate caller-supplied JSON. If the host exposes no such receipt, report `requested-not-attested`; do not claim strict model enforcement. Role labels and configured sandboxes remain advisory until the active runtime proves their effective settings.
