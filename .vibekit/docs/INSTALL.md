# Install guide

## Install from npm

```bash
# one-shot (recommended) - adds nothing to the project's dependencies:
npx --yes minimal-vibe-coding-kit@latest install /path/to/project

# or, after `npm i -D minimal-vibe-coding-kit` inside the project:
npx mvck install .
```

`npm i` alone only places the kit in `node_modules/` and nothing is active yet; `mvck install` (alias: `vibe-kit`) is the step that copies the kit files into the repo root.

## Local install

```bash
./install.sh /path/to/project
```

## Node install

```bash
node .vibekit/scripts/mvck.mjs install /path/to/project --profile all
```

Profiles:

- `claude`: `CLAUDE.md`, `.claude/`, Claude skills, agents, commands, rules, deny-list settings.
- `cursor`: `.cursor/rules`, `.cursor/commands`, `.cursor/cli.json` CLI permissions, Cursor skill entrypoints.
- `codex`: `AGENTS.md`, `.agents/skills`, `.codex/rules` execution-policy rules, `.codex-plugin`, `.codex` examples. Install and update give MVCK-owned manifests a project-scoped plugin name (`mvck-<folder-name>`) so Codex skill pickers can distinguish different projects. Names are normalized and capped at 64 characters, with a short stable hash for long or non-ASCII folder names. Existing project-owned plugin manifests are preserved unless install is explicitly run with `--force`; projects that share a folder name can still collide, so rename one folder if that happens.
- `opencode`: `AGENTS.md`, the shared `.agents/skills` registry, `.opencode/commands`, and a seed-only `opencode.json` permission baseline. OpenCode and Codex intentionally share one skill registry; installing OpenCode alone does not create `.codex/` or `.codex-plugin/`. Existing `opencode.json` files are preserved.
- `grok`: `AGENTS.md`, `.grok/rules`, `.grok/skills`, `.grok/config.toml` permission rules, user config example.
- `kimi`: `AGENTS.md`, `.kimi-code/README.md`, and the full `.kimi-code/skills` mirror.
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

- refreshes kit-owned surfaces (`.vibekit/skills/`, `.vibekit/commands/`, `.vibekit/scripts/`, `.vibekit/docs/`, and the `.claude/`, `.cursor/`, `.agents/`, `.opencode/`, `.grok/`, `.kimi-code/`, `.codex*` mirrors) and adds any new kit skills;
- never overwrites `backbone.yml`, `CLAUDE.md`, `AGENTS.md` content outside the managed block, or `settings.json` files - those are seeded only if missing;
- never overwrites an existing `opencode.json`; it is seeded only if missing;
- backs up every replaced kit file to `.vibekit/update-backup/<timestamp>/` (disable with `--no-backup`);
- never deletes files you added, and skips re-seeding one-time files after `mvck finalize`;
- records the kit version in `.vibekit/KIT_VERSION` (shown by `mvck doctor`).

Preview without writing:

```bash
npx --yes minimal-vibe-coding-kit@latest update . --dry-run
npx --yes minimal-vibe-coding-kit@latest update . --dry-run --json
```

### Codex structured questions

When the Codex profile is active and the installed Codex CLI lists `default_mode_request_user_input`, an interactive update recommends enabling structured questions in Default mode for that project. This lets Codex present clear multiple-choice questions when a decision materially affects the work.

The choices are:

- Yes: enable `default_mode_request_user_input = true` under `[features]` in `.codex/config.toml`.
- No: keep it disabled now and ask again on the next init or update.
- Don't show this again: keep it disabled and store a project-local dismissal in `.vibekit/preferences.json`.

The updater preserves unrelated Codex settings and backs up an existing `.codex/config.toml` before changing the approved feature. It never changes `~/.codex/config.toml`. For non-interactive use, pass `--codex-default-mode yes`, `--codex-default-mode no`, or `--codex-default-mode never`. JSON and dry-run updates do not prompt unless one of these explicit choices is supplied.

Note: run the updater from a newer kit (npx or a local clone), not via the project's own `.vibekit/scripts/mvck.mjs` copy - source and target would be the same files.

### Multi-agent orchestration preference

Before the first child agent or multi-agent lane is dispatched, the parent follows .vibekit/docs/ORCHESTRATION_MODES.md. It prefers the active provider's native structured-question tool and falls back to one concise parent-conversation question at a time when that tool is unavailable.

- Default preserves the active provider's normal behavior and default model.
- Auto inventories ready Codex, Claude, Cursor, OpenCode, Grok, and Kimi adapters, then chooses the lowest-cost capable model above the task's safety and quality floor.
- Custom lets the user bind verified providers and models to named roles or lanes.

The user may apply the choice once or select Don't show again to remember it in the existing project-local .vibekit/preferences.json. Child agents return needs_user_input to the parent instead of asking the user directly. .vibekit/parallel-analysis.json remains a separate executor-detail cache and cannot override the global mode.

Inspect, remember, or reset the local choice with:

~~~bash
node .vibekit/scripts/orchestration-preference.mjs show .
node .vibekit/scripts/orchestration-preference.mjs remember auto .
node .vibekit/scripts/orchestration-preference.mjs forget .
~~~

For optional Cursor SDK routing, follow [CURSOR_SDK.md](CURSOR_SDK.md). The adapter verifies Node.js, SDK version, authentication, the live account model catalog, project-root safety, and bounded local tool access before it becomes a choice.

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

Doctor never executes scripts owned by the target repository by default. To also run the repo's `validate-kit.mjs` and AgentShield probe (only for repositories you trust), opt in explicitly:

```bash
node .vibekit/scripts/mvck.mjs doctor . --run-repo-checks
```

Generate a handoff report:

```bash
node .vibekit/scripts/mvck.mjs doctor . --write-report
```

## Native reasoning skills

The installer includes three flexible custom reasoning skills across Claude, Codex, Cursor, Grok, and Kimi. These install as full skill folders, including examples and references for progressive disclosure:

- `clearthought`: clarify ambiguous tasks and choose a reasoning mode.
- `sequential-thinking`: split complex work into ordered implementation steps.
- `reviewing-4p-priorities`: classify review findings or bugs as P0-P4 and choose fix order.

## Visual design loop skill

The installer also includes `visual-design-loop` for Claude, Codex, Grok, and Kimi surfaces. Use it when a loop goal touches UI polish, screenshots, rendering, visual QA, or visible frontend behavior.

## User-invoked utility skills

Sixteen user-invoked skills install across Claude, Codex, Cursor, Grok, and Kimi surfaces:

- `memento`: write a `MEMENTO.md` working note before closing a multi-day task (`/memento`), then resume from it in the next session (`/memento resume`).
- `coding-level`: set the explanation register from 0 (ELI5) to 5 (expert peer) with `/coding-level N`; stays active until reinvoked.
- `graph-engineering-verified-orchestration`: design and optionally execute a bounded dependency graph with explicit artifacts, enforceable isolation, objective verification, budgets, rollback, and human gates; unresolved controls force plan-only mode.
- `clean-delivery`: deliver one observable behavior through Specify, Code, Clean, Architect, Harden, and Verify gates, with a validated story, protected verifier assets, proportional TDD, architecture review, and reproducible proof (`/clean-delivery`).
- `proofline-orchestration`: govern complex work through the original Keeper, Wayfinder, Countervoice, and Maker roles, with expiring authority, effective capability probes, typed signals, evidence-bound Proof Returns, protected acceptance oracles, fenced integration, an executable sandbox ledger, and an optional manual Paseo adapter.
- `agent-control-center`: coordinate one task through a verified native, explicitly selected, or automatically selected controller while the active host enforces tools, permissions, bounded work orders, proof receipts, and proportional topology.
- `swap-control-center`: ask the user to choose a verified controller provider, transport, model, and supported reasoning effort. It can propose current official setup and a bounded smoke test, but requires approval before installation, configuration, login, billing, or a paid request.
- `threat-model-security-review`: review application source or security-sensitive diffs with a repository-specific threat model, explicit coverage, source-to-sink evidence, safe validation statuses, and one-finding-at-a-time remediation. It does not install or invoke an external scanner.
- `prompt-sharpener`: sharpen a rough prompt into a precise one with `/prompt-sharpener <rough prompt>`, then execute the sharpened version immediately in the same turn.
- `claim`: vet a request to bring something new into the repo with `/claim <request>` - validate URLs and references against official sources, check fit with existing rules and skills, confirm anything unclear, then integrate and document it.
- `wait-what`: when the agent's last message did not land, `/wait-what [the part that lost you]` makes it stop and re-pitch: same facts and decisions, plain language in the user's language, project terms from the glossary named in `backbone.yml` `project.context`; zero new work.
- `tutien`: turn Git history and explicitly supplied AI-chat exports into a private xianxia coding-reflection mode with `/tutien` (realm, token use, workflow habits, evidence-bound suggestions). Once enabled, every reply keeps an adaptive cultivation-novel voice in the user's language, activation asks for an optional fictional-avatar `humiliation=0..10` level, analysis remains read-only and aggregate-only by default, and `/tutien off` disables the mode.
- `the-creator`: create original but workable art, designs, interfaces, methods, processes, or systems with `/the-creator level N`; each level cumulatively relaxes 10% of eligible conventions while preserving safety, logic, authorization, and functional acceptance.
- `mermaid`: generate styled diagrams across 31 Mermaid types, adapt density to `/coding-level`, and optionally visualize multi-step documentation or debugging flows.
- `clone-website`: plan, build, and verify a bounded website clone with explicit rights, dynamic fidelity, scope, stack, and backend choices, plus neutralized local research defaults.
- `model-provider-settings`: inspect and update provider-native model, reasoning, context, and compaction settings from current official documentation, with exact scope, preview, approval, secret handling, rollback, and provider-specific verification.

### Control Center routing

Invoke the provider-neutral workflow with an explicit controller when needed:

```text
Use $agent-control-center controller=native to coordinate this task.
Use $agent-control-center controller=auto to select from verified routes.
Use $swap-control-center to choose Codex or another controller provider and its runtime settings.
```

The controller owns planning and acceptance. The active application or CLI remains the host and dispatches its own agents. Plain MCP is request-response coordination, not direct control of another provider's Agent window. Application access, CLI access, SDK access, API quota, and MCP readiness are classified independently. `swap-control-center` uses the host's structured question tool when exposed, otherwise it asks one concise parent-conversation question at a time. It reads model and reasoning choices from a fresh authenticated catalog, not from hardcoded names. The skills never install an adapter, start a login flow, enable billing, send a paid smoke request, or bypass a quota without the required user approval.

For the optional Codex bridge, register `codex mcp-server` in the host's personal or user-level MCP settings, following that host's current MCP documentation. Do not add a repository MCP file just to enable Control Center. Treat the route as ready only after the host exposes the expected `codex` start tool and `codex-reply` continuation tool and a bounded request succeeds. This bridge does not require Cursor CLI or Cursor SDK. If only the interactive Codex application is available, use the manual handoff contract instead.

### Proofline sandbox ledger

Start with the installed authentication case, replace every fixture value with evidence from the current task, then validate the exact contract and run the repository harness when available:

```bash
node .vibekit/skills/proofline-orchestration/scripts/run-proofline-sandbox.mjs \
  .vibekit/skills/proofline-orchestration/examples/auth-migration-case.json
npm run test:proofline
```

The validator is dependency-free and tests declared policy, digest binding, signal transitions, replay rejection, scope, budgets, liveness, fencing, protected verification, evidence handling, safe non-final states, and shared-state seal consumption. Its gateway is an in-process policy simulator, not durable cross-process enforcement. It does not prove that a live agent runtime, OS sandbox, MCP server, Paseo daemon, or provider enforced the declared boundaries. Missing effective capability probes force sequential or plan-only operation.
