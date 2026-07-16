<div align="center">

**Read in:** **English** · [Tiếng Việt](README.vi.md)

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.4.0-2ea44f.svg)](CHANGELOG.md)
![Claude](https://img.shields.io/badge/Claude%20Code-Commands%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Rules%20%26%20Commands-1f6feb)
![Codex](https://img.shields.io/badge/Codex-AGENTS.md%20%26%20Plugin-6f42c1)
![AgentShield](https://img.shields.io/badge/Security-AgentShield-d62828)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)

**One installable AI-coding workflow kit for Claude Code, Cursor, and Codex — any repo, any language.**

Install → paste one prompt → approve the proposal → code with guardrails.

</div>

---

## What is this?

A small kit of shared **rules**, **skills**, and **commands**, plus one **`backbone.yml`** manifest, so Claude Code, Cursor, and Codex all understand your project the same way.

- Never overwrites your existing `CLAUDE.md` / `AGENTS.md` — it only adds managed blocks.
- Every setup write waits for your explicit approval.
- Security review of agent surfaces (AgentShield) is part of the normal workflow.

## Quick Start

Three steps, about two minutes.

**1. Install into your project** (no clone needed):

```bash
npx github:giang6283623/minimal-vibe-coding-kit install /path/to/your-project
```

From a local clone instead: `./install.sh /path/to/your-project` (Windows: `./install.ps1 -Target C:\path\to\your-project`).

**2. Open the project in Claude Code, Cursor, or Codex and paste:**

```text
Read .vibekit/init/FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff
for backbone.yml and managed instruction blocks, and wait for my yes before writing.
```

**3. Review the proposed diff and answer `yes`.**

The agent fills `backbone.yml` with your detected stack and conventions and flips it to `initialized`. Done — every later session reads it automatically and skips init.

Optional health check any time:

```bash
node .vibekit/scripts/mvck.mjs doctor .
```

## What lands in your repo

Install adds exactly this — nothing else in your project is touched:

```text
your-project/
├── backbone.yml              ← project map agents read first (single source of truth)
├── AGENTS.md                 ← shared agent instructions (managed block)
├── CLAUDE.md                 ← short; imports AGENTS.md (created only if missing)
├── .gitignore                ← kit entries appended inside a managed block
├── .claude/                  ← Claude Code: rules, commands, agents, skills
├── .cursor/                  ← Cursor: rules, commands, skills
├── .agents/                  ← Codex / portable skills
├── .codex/  .codex-plugin/   ← Codex config example + plugin manifest
└── .vibekit/                 ← everything kit-owned, in ONE folder
    ├── skills/               ← canonical shared skills (mirrored to the harness dirs)
    ├── commands/             ← shared command prompts
    ├── scripts/              ← mvck CLI, init, validate, doctor, security probe
    ├── docs/                 ← deeper references
    └── init/                 ← one-time onboarding files (removable via /vibe-finalize)
```

Existing files are never replaced — the kit merges managed blocks (`BEGIN/END: minimal-vibe-coding-kit`) and skips anything you already own.

## How the pieces connect

```text
You (prompt) ──▶ Claude Code / Cursor / Codex
                      │  reads first
                      ▼
        backbone.yml  +  AGENTS.md / CLAUDE.md  +  rules
                      │  loads on demand
                      ▼
        skills (procedures)  +  commands (shortcuts)
                      │  guarded by
                      ▼
        protected paths · propose-before-write · AgentShield probe
```

- **`backbone.yml`** — paths, conventions, protected paths, and the validate command for your repo.
- **Rules** — short, always-loaded guardrails (read backbone first, small diffs, security review on agent surfaces).
- **Skills** — repeatable procedures, loaded only when a task needs them.
- **Commands** — one-word shortcuts to the most common skills.

## Guide — day-to-day usage

1. **Just code.** Ask for features and fixes normally; the agent follows `backbone.yml` conventions and keeps diffs small.
2. **Big or vague task?** Start with the `clearthought` or `sequential-thinking` skill to get a plan first.
3. **Repo-wide question or big review?** Use `parallel-analysis` — it fans out read-only analysis lanes and verifies the merged result.
4. **Changed `.claude/`, skills, hooks, or installer scripts?** Run `/security-scan` before merging.
5. **Want measurable improvements?** Run `/autoresearch-coding` with a metric and budget.
6. **Keep the setup sharp:** `/daily-enhance` proposes improvements — it never applies them silently.
7. **Onboarding finished for good?** `/vibe-finalize` moves one-time bootstrap files out.

## Commands

| Command | What it does | Example |
| --- | --- | --- |
| `/init-vibe` | First-time init or repair: propose one diff, wait for approval. | `/init-vibe` — then review the diff and answer `yes`. |
| `/security-scan` | Read-only AgentShield probe + optional scanner over agent surfaces. | `/security-scan` before merging changes to `.claude/**` or skills. |
| `/daily-enhance` | Propose-only report to improve rules, skills, and workflows. | `/daily-enhance` — review the proposed diff, then approve. |
| `/autoresearch-coding` | Metric-driven experiment loop with baseline and budget. | `/autoresearch-coding` Goal: fewer lint errors. Budget: 3. |
| `/council` | Coordinates reviewer/researcher/analyst agents into one merged plan. | `/council` on this branch diff. |
| `/vibe-finalize` | Graduate the project: move one-time bootstrap files to `_vibekit-cleanup/`. | `/vibe-finalize` — preview first, apply after approval. |

## Skills

All 12 skills live in `.vibekit/skills/` and are mirrored for each tool. Invoke them by name ("Use the X skill…") or via the commands above.

| Skill | Use it when | Example prompt |
| --- | --- | --- |
| `vibekit-init` | First-time setup, or `backbone.yml` / managed blocks need repair. | "Use the vibekit-init skill. Propose one diff and wait for my yes." |
| `parallel-analysis` | Repo-wide questions, large diff reviews, consistency audits. | "Use parallel-analysis: where is auth handled and what depends on it?" |
| `agentshield-security-review` | Auditing agent config, skills, hooks, MCP, commands before merge. | "Use agentshield-security-review on .claude/** and .vibekit/skills/**." |
| `autoresearch-coding` | Improving the repo through measured experiments. | "Use autoresearch-coding. Metric: `npm test`. Direction: higher. Budget: 3." |
| `daily-workflow-curator` | Periodic tune-up of rules, skills, and workflows (propose-only). | "Use daily-workflow-curator and propose today's improvements." |
| `path-sensitive-shell-safety` | Before editing shell/installer/deploy logic with path variables or `rm`/`mv`/`rsync`. | "Use path-sensitive-shell-safety before changing this cleanup script." |
| `visual-design-loop` | UI polish: render → screenshot → review → fix, in a loop. | "Use visual-design-loop on /dashboard. Budget 3 loops." |
| `clearthought` | Ambiguous requirements, design tradeoffs, risky decisions. | "Use clearthought. Operation: implementation_plan. Split this feature into safe tasks." |
| `sequential-thinking` | Step-by-step decomposition of complex work. | "Use sequential-thinking. Break this refactor into ordered steps with tests." |
| `reviewing-4p-priorities` | Triaging bugs/findings into P0–P4 fix order. | "Use reviewing-4p-priorities. Classify these findings and give a fix sequence." |
| `memento` | Multi-day tasks: save context before stopping, resume next session. | "/memento — write MEMENTO.md with Goal, Done, Stuck, Next." |
| `coding-level` | Setting how detailed explanations should be (0 = ELI5 … 5 = expert). | "/coding-level 2" |

## Advanced

### Install profiles

Install only the surfaces you use (default is `all`):

```bash
npx github:giang6283623/minimal-vibe-coding-kit install . --profile claude          # Claude Code only
npx github:giang6283623/minimal-vibe-coding-kit install . --profile claude,cursor   # Claude + Cursor
npx github:giang6283623/minimal-vibe-coding-kit install . --profile codex           # Codex / AGENTS.md agents
```

Flags: `--force` (overwrite existing kit files), `--dry-run` (preview), `--json` (machine-readable plan).

### Updating an installed project

Run inside your project when the kit ships new skills or scripts:

```bash
npx github:giang6283623/minimal-vibe-coding-kit update . --dry-run   # preview
npx github:giang6283623/minimal-vibe-coding-kit update .             # apply
```

`update` refreshes **kit-owned files only**, never touches `backbone.yml` or your own content, updates managed blocks in place, and backs up changed files to `.vibekit/update-backup/<timestamp>/`. Details: [.vibekit/docs/INSTALL.md](.vibekit/docs/INSTALL.md).

### Autoresearch loop

```text
Use the autoresearch-coding skill.
Goal: improve maintainability. Metric command: <your validate command>. Direction: higher.
Editable paths: src/ docs/. Protected paths: .git .env* node_modules lockfiles.
Budget: 3.
```

Contract: baseline first → one small experiment at a time → keep only metric-positive changes → log everything.

### Security review (AgentShield)

```bash
node .vibekit/scripts/agentshield-probe.mjs .                          # fast read-only probe
npx ecc-agentshield scan --path . --format text --min-severity medium  # optional full scan
```

Any change to `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`, or `.vibekit/skills|commands|scripts/**` should trigger a review. Model: [.vibekit/docs/SECURITY_MODEL.md](.vibekit/docs/SECURITY_MODEL.md).

### Doctor and reports

```bash
node .vibekit/scripts/mvck.mjs doctor .                 # read-only health check
node .vibekit/scripts/mvck.mjs doctor . --write-report  # writes VIBE_REPORT.md
node .vibekit/scripts/daily-enhance.mjs . --write-report
```

### For kit developers

```bash
npm test                # syntax + real temp-dir install test + structure validation
npm run validate:all    # npm test + AgentShield probe + npm pack dry-run
```

Publishing checklist: [.vibekit/init/PUSH_TO_GITHUB.md](.vibekit/init/PUSH_TO_GITHUB.md). Deeper docs: [.vibekit/docs/](.vibekit/docs/).

<details>
<summary><strong>Troubleshooting</strong></summary>

| Symptom | Fix |
| --- | --- |
| Agent ignores the init flow | Re-run the installer, or copy [.vibekit/init/CLAUDE-template.md](.vibekit/init/CLAUDE-template.md) to `CLAUDE.md`. |
| Agent re-asks to init every session | Run init and approve; confirm `meta.template_status: initialized` in `backbone.yml`. |
| Wrong stack detected | Remove stale lockfiles, or edit `backbone.yml` directly. |
| Agent touches a path it shouldn't | Add the path to `policy.protected_paths` in `backbone.yml` (globs supported). |
| AgentShield probe warning | Install Python 3, or ignore — it is a warning, not a failure. |
| Scripts missing after install | Re-run install with `--force`, or copy `.vibekit/scripts/` manually. |

</details>

## Contributing

Issues and PRs welcome at [`giang6283623/minimal-vibe-coding-kit`](https://github.com/giang6283623/minimal-vibe-coding-kit). Before a PR: mirror skill changes across `.claude/`, `.cursor/`, `.agents/`, keep templates project-neutral, and run `npm run validate:all`. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

**Created by:** [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)
**Powered by:** Caffeine, Determination, AI Collaboration, and Weekend Coding Sessions.

## License

MIT. See [LICENSE](LICENSE).

> 🇻🇳 *If you love Vietnam and its people, you are fully free to use everything in here at no cost.*
