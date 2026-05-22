<div align="center">

**Read in:** **English** · [Tiếng Việt](README.vi.md)

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.2.0-2ea44f.svg)](CHANGELOG.md)
![Claude](https://img.shields.io/badge/Claude%20Code-Commands%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Rules%20%26%20Commands-1f6feb)
![Codex](https://img.shields.io/badge/Codex-AGENTS.md%20%26%20Plugin-6f42c1)
![AgentShield](https://img.shields.io/badge/Security-AgentShield-d62828)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)

**One installable AI-coding workflow kit for Claude Code, Cursor, and Codex — works on any repo, in any language.**

Drop it in, let the agent auto-detect your stack, approve the proposal, ship.

</div>

---

## Table of Contents

- [What's New in 0.2.0](#whats-new-in-020)
- [What This Kit Is](#what-this-kit-is)
- [Quick Start](#quick-start)
- [First Prompt](#first-prompt)
- [Install Profiles](#install-profiles)
- [Repository Layout](#repository-layout)
- [Workflow per Tool](#workflow-per-tool)
- [Commands & Skills Reference](#commands--skills-reference)
- [Flexible Reasoning Skills](#flexible-reasoning-skills)
- [Autoresearch Loop](#autoresearch-loop)
- [AgentShield Security Review](#agentshield-security-review)
- [Daily Enhancement](#daily-enhancement)
- [Doctor Report](#doctor-report)
- [Validate Before Release](#validate-before-release)
- [Design Goals](#design-goals)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

> 🇻🇳 Bạn muốn đọc tiếng Việt? Xem [README.vi.md](README.vi.md).

---

## What's New in 0.2.0

| Area | Change |
| --- | --- |
| Installer | One-command CLI: `mvck install <project>` (plus `install.sh` / `install.ps1`). |
| Codex support | Adds `.agents/`, `.codex/`, and `.codex-plugin/plugin.json` surfaces. |
| Shared instructions | New `AGENTS.md` is imported by `CLAUDE.md` to avoid duplication. |
| Backbone | Compact `backbone.yml` template + auto-detection helper. |
| Skills | Adds `vibekit-init`, `agentshield-security-review`, `daily-workflow-curator`. |
| Security | Read-only AgentShield repo probe + scanner integration. |
| Daily loop | Propose-only `daily-enhance` report — never silently rewrites rules. |
| Validation | Syntax checks, install idempotency tests, `mvck doctor`, schema checks, and GitHub Actions workflow. |

Full notes in [CHANGELOG.md](CHANGELOG.md).

## What This Kit Is

A lightweight, project-agnostic kit of shared **rules**, **skills**, **commands**, and a **backbone manifest** that lets AI coding assistants understand any project consistently.

It is intentionally minimal:

- No heavy framework, no forced structure.
- Existing `CLAUDE.md` / `AGENTS.md` are never overwritten — only managed blocks are added.
- Three template files do the heavy lifting:
  - [backbone.yml](backbone.yml) — single source of truth for project structure, paths, and conventions.
  - [CLAUDE-template.md](CLAUDE-template.md) — a short `CLAUDE.md` skeleton that imports `AGENTS.md`.
  - [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) — the init runbook with guardrails for any repo.

The flow:

1. Install the kit into a project. `backbone.yml` ships with `meta.template_status: uninitialized` and `<<PLACEHOLDER>>` values.
2. Paste the [first prompt](#first-prompt) into Claude Code, Cursor, or Codex.
3. The agent scans your repo for stack fingerprints and existing conventions, then **proposes one unified diff**.
4. You review the inferred backbone and project rules (`yes` / `edit` / `abort`). The agent writes only after approval and flips status to `initialized`.
5. Every later session reads the filled `backbone.yml` and skips the init flow.

Works for single-repo, monorepo, and multi-repo layouts. No silent edits. No project-specific code in the base kit.

During first-time init, the proposal also captures repo-specific rules in `backbone.yml` under `conventions`: naming style, folder architecture, shared asset/resource access, localization/message access, generated definitions, and per-app/package differences when evidence differs.

## Quick Start

### 1. Install the kit into any project

From this kit folder:

```bash
./install.sh /path/to/your-project
```

PowerShell on Windows:

```powershell
./install.ps1 -Target C:\path\to\your-project
```

Or with the Node CLI directly:

```bash
node scripts/mvck.mjs install /path/to/your-project --profile all
```

Once this repo is published on GitHub, end users can install from anywhere with:

```bash
npx github:giang6283623/minimal-vibe-coding-kit install /path/to/your-project
```

### 2. Initialize the backbone

```bash
cd /path/to/your-project
node scripts/init-backbone.mjs . --propose      # preview the proposal
node scripts/init-backbone.mjs . --write --yes  # write after you reviewed backbone + rules
```

Optional stack presets:

```bash
node scripts/mvck.mjs init . --preset nextjs --propose
node scripts/mvck.mjs init . --preset wordpress --propose
node scripts/mvck.mjs init . --preset python --propose
node scripts/mvck.mjs init . --preset laravel --propose
node scripts/mvck.mjs init . --preset docker --propose
```

### 3. Validate

```bash
npm test
npm run security:probe
node scripts/mvck.mjs doctor .
```

### 4. Open the project and paste the [first prompt](#first-prompt).

## First Prompt

Paste this into Claude Code, Cursor, or Codex after installing the kit:

```text
Read FIRST_TIME_INIT.md and initialize this repo with Minimal Vibe Coding Kit.
First print the requirements you will check. Then run detection, propose one diff
for backbone.yml and managed instruction blocks, and wait for my yes before writing.
Include inferred project conventions for naming, architecture, resources,
localization, generated definitions, and per-app/package differences.
After approval, write the files, run validation, and summarize what changed.
```

Tool-specific variants live in [FIRST_PROMPT.md](FIRST_PROMPT.md).

## Install Profiles

Install everything (default):

```bash
node scripts/mvck.mjs install . --profile all
```

Install only what you use:

```bash
node scripts/mvck.mjs install . --profile claude          # Claude Code only
node scripts/mvck.mjs install . --profile claude,cursor   # Claude + Cursor
node scripts/mvck.mjs install . --profile codex           # Codex (and any AGENTS.md agent)
```

Useful flags: `--force` (overwrite existing files), `--dry-run` (preview without writing), `--json` (machine-readable install plan).

## Repository Layout

```text
.
├── backbone.yml                  ← project map + workflow config (template)
├── AGENTS.md                     ← shared instructions for Claude, Cursor, Codex
├── CLAUDE-template.md            ← short Claude starter (imports AGENTS.md)
├── FIRST_PROMPT.md               ← copy/paste prompts per tool
├── FIRST_TIME_INIT.md            ← safe init runbook with guardrails
│
├── .claude/                      ← Claude Code surface
│   ├── agents/                   (10 role agents: code-reviewer, debug-fixer, …)
│   ├── commands/                 (/init-vibe, /security-scan, /daily-enhance, /autoresearch-coding, /council)
│   ├── rules/                    (vibe-core, security, autoresearch, tooling)
│   ├── skills/                   (mirrors of shared skills)
│   └── settings.json
│
├── .cursor/                      ← Cursor surface (rules/, commands/, skills/)
├── .agents/skills/               ← portable / Codex skills
├── .codex/                       ← Codex config example
├── .codex-plugin/plugin.json     ← Codex plugin manifest
│
├── skills/                       ← canonical shared skills
│   ├── vibekit-init/
│   ├── autoresearch-coding/
│   ├── agentshield-security-review/
│   ├── daily-workflow-curator/
│   ├── clearthought/
│   ├── sequential-thinking/
│   └── reviewing-4p-priorities/
├── commands/                     ← shared command prompts
│
├── scripts/                      ← mvck CLI, init-backbone, daily-enhance, validate-kit, doctor, install tests
├── bin/                          ← npm bin entries (mvck, vibe-kit)
├── docs/                         ← deeper references (kept out of root)
└── .github/workflows/            ← repo validation workflow
```

## Workflow per Tool

### Claude Code

Claude reads `CLAUDE.md`, `AGENTS.md`, `.claude/rules`, `.claude/commands`, `.claude/agents`, and `.claude/skills`.

Useful slash commands:

```text
/init-vibe              initialize or repair the kit setup
/security-scan          AgentShield probe + scan
/daily-enhance          generate a propose-only improvement report
/autoresearch-coding    run the metric-driven experiment loop
/council                coordinate multiple specialized agents
```

The generated `CLAUDE.md` stays short and imports shared guidance via `@AGENTS.md`.

### Cursor

Cursor receives project rules from:

```text
.cursor/rules/*.mdc      001-vibe-core, 010-init, 020-security-agentshield, 030-autoresearch-loop
.cursor/commands/*.md    same five commands as Claude
.cursor/skills/*         custom native reasoning skills
AGENTS.md
backbone.yml
```

Rules are split by topic so context stays small.

### Codex

Codex receives guidance from:

```text
AGENTS.md
.agents/skills/*/SKILL.md
.codex/config.example.toml
.codex-plugin/plugin.json
backbone.yml
```

Recommended prompt:

```text
Read AGENTS.md and FIRST_TIME_INIT.md. Use the vibekit-init skill if available.
Initialize backbone.yml, keep AGENTS.md concise, and wait for approval before writing.
```

## Commands & Skills Reference

### Commands

| Command | Backed by skill | Use when |
| --- | --- | --- |
| `/init-vibe` | `vibekit-init` | First-time init or repair. Print requirements, propose diff, wait for approval. |
| `/security-scan` | `agentshield-security-review` | Reviewing agent surfaces, hooks, MCP, skills, commands, installer scripts. |
| `/daily-enhance` | `daily-workflow-curator` | Daily proposal to improve rules, skills, workflows, `backbone.yml`. Propose-only. |
| `/autoresearch-coding` | `autoresearch-coding` | Improving a repo through measurable experiments with a baseline + budget. |
| `/council` | (multi-agent) | Coordinate research-coordinator, security-reviewer, code-reviewer, results-analyst. |

### Skills (`skills/` is canonical; `.claude/skills`, `.agents/skills`, and `.cursor/skills` mirror native entrypoints)

| Skill | Purpose |
| --- | --- |
| [`vibekit-init`](skills/vibekit-init/SKILL.md) | First-time init flow: detect stack, propose diff, wait for `yes`, then write. |
| [`autoresearch-coding`](skills/autoresearch-coding/SKILL.md) | Metric-driven research loop with baseline, experiments, and a results log. |
| [`agentshield-security-review`](skills/agentshield-security-review/SKILL.md) | Read-only probe + optional scanner pass for agent-surface security. |
| [`daily-workflow-curator`](skills/daily-workflow-curator/SKILL.md) | Daily report + diff proposal. Never writes silently. |
| [`clearthought`](skills/clearthought/SKILL.md) | Flexible structured reasoning for ambiguous coding, debugging, design, and implementation planning. |
| [`sequential-thinking`](skills/sequential-thinking/SKILL.md) | Step progression, revisions, branches, and task splitting for complex work. |
| [`reviewing-4p-priorities`](skills/reviewing-4p-priorities/SKILL.md) | P0-P4 triage for bugs, review findings, risks, and fix order. |

### Agents (`.claude/agents/`)

Drop-in role prompts: `code-reviewer`, `debug-fixer`, `hypothesis-planner`, `implementation-hacker`, `research-coordinator`, `results-analyst`, `test-runner`, `security-reviewer`, `context-architect`, `workflow-curator`.

## Flexible Reasoning Skills

These three custom skills are native kit skills. They are available in `skills/` and mirrored for Claude, Codex, and Cursor. Each one includes bundled examples and references that are loaded only when the task needs more detail.

Use `clearthought` when the request is broad or ambiguous:

```text
Use the clearthought skill.
Operation: implementation_plan
Problem: Split this feature into safe tasks, identify risks, and define validation.
```

Use `sequential-thinking` when you need step-by-step decomposition:

```text
Use the sequential-thinking skill.
Break this complex requirement into small implementation steps with tests.
```

Use `reviewing-4p-priorities` when review findings or bug reports need fix order:

```text
Use the reviewing-4p-priorities skill.
Classify these issues as P0-P4 and give me the practical fix sequence.
```

Recommended flow for flexible vibe-coding tasks:

1. Run `clearthought` to clarify the problem and select the reasoning mode.
2. Run `sequential-thinking` to split the work into small tasks.
3. Run `reviewing-4p-priorities` to decide what must be fixed first.
4. Run the validation command from `backbone.yml`.

## Autoresearch Loop

Use this when you want the agent to improve a repo through measurable experiments:

```text
Use the autoresearch-coding skill.
Goal: improve this repo for maintainability and coding-agent usefulness.
Metric command: node scripts/validate-kit.mjs .
Direction: higher.
Editable paths: README.md docs scripts skills commands .claude .cursor .agents
                .codex-plugin backbone.yml AGENTS.md CLAUDE-template.md
                FIRST_TIME_INIT.md package.json install.sh install.ps1.
Protected paths: .git .env* node_modules vendor secrets lockfiles.
Budget: 3.
```

Loop contract:

1. Run baseline metric.
2. Make one small experiment.
3. Run metric again.
4. Keep only improvements or safe simplifications.
5. Log result.
6. Repeat until budget is done.

## AgentShield Security Review

Fast read-only probe (no install needed beyond Python):

```bash
node scripts/agentshield-probe.mjs .
```

Optional full scanner pass when npm is available:

```bash
npx ecc-agentshield scan --path . --format text --min-severity medium
```

Security rules:

- Do not run untrusted hooks, MCP servers, package lifecycle scripts, deploy scripts, migrations, or destructive commands just to inspect a repo.
- Never print full secrets.
- Any change to `CLAUDE.md`, `AGENTS.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`, `skills/**`, `commands/**`, hooks, or MCP config should trigger an AgentShield-style review.

## Daily Enhancement

Generate a local report:

```bash
node scripts/daily-enhance.mjs . --write-report
```

Prompt for an agent:

```text
Use the daily-workflow-curator skill. Run the daily report, AgentShield probe,
and kit validation. Propose improvements to rules, skills, workflows, and
backbone.yml. Do not write until I approve the diff.
```

Daily enhancement is **propose-only** by default. It does not silently commit or rewrite your rules.

## Doctor Report

Run a read-only repo health check:

```bash
node scripts/mvck.mjs doctor .
```

Generate `VIBE_REPORT.md` when you want a local handoff report:

```bash
node scripts/mvck.mjs doctor . --write-report
```

Doctor checks backbone initialization, detected commands, Claude/Cursor/Codex surfaces, managed block duplication, protected paths, validation, and the AgentShield probe.

## Validate Before Release

```bash
npm test                # syntax + install idempotency + structure validation
npm run validate:all    # npm test + AgentShield probe + package dry-run
```

Expected result: validation passes, AgentShield probe reports no critical structural issues, and `npm run pack:dry-run` shows the intended package files.

Publishing checklist lives in [PUSH_TO_GITHUB.md](PUSH_TO_GITHUB.md).

## Design Goals

- Work with any language or framework.
- Support existing projects without overwriting custom instructions.
- Keep root files short — long procedures live in skills and `docs/`.
- Make AI workflow improvements measurable through autoresearch.
- Make agent-surface security review part of the normal workflow.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Agent ignores the init flow | `CLAUDE.md` missing or its managed block was removed. | Re-run the installer, or copy [CLAUDE-template.md](CLAUDE-template.md) to `CLAUDE.md`. |
| Agent re-asks to init every session | `meta.template_status` is still `uninitialized`. | Run init, approve the diff, confirm `template_status` is `initialized` and `initialized_at` is set. |
| Wrong stack detected | Stale lockfile from an old language, or detection patterns out of date. | Delete the stale files, or extend detection in [backbone.yml](backbone.yml). |
| Agent touches a path it shouldn't | Path is not listed in `policy.protected_paths`. | Add it (globs supported). |
| Existing `CLAUDE.md` was overwritten | Merge guardrail was bypassed. | Restore from git. Re-run install — the kit only appends managed blocks. |
| Validation warns about AgentShield probe | Python or the probe script is unavailable. | Install Python 3, or skip — it is a warning, not a failure. |
| `node scripts/...` not found after install | Installer skipped existing files. | Re-run with `--force`, or copy `scripts/` manually. |

## Contributing

Issues and PRs welcome at [`giang6283623/minimal-vibe-coding-kit`](https://github.com/giang6283623/minimal-vibe-coding-kit).

When editing the kit:

- Mirror changes between `.claude/`, `.cursor/`, and `.agents/` so all three tools stay aligned.
- Keep templates project-neutral. No company names, no hardcoded ports.
- Document each new command/skill with a one-line purpose and one example.
- Run `npm run validate:all` before opening a PR.
- Review [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

**Created by:** [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)
**Powered by:** Caffeine, Determination, AI Collaboration, and Weekend Coding Sessions.

## License

MIT. See [LICENSE](LICENSE).

> 🇻🇳 *If you love Vietnam and its people, you are fully free to use everything in here at no cost.*
