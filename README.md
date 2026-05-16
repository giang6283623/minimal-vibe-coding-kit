<div align="center">

**Read in:** **English** · [Tiếng Việt](README.vi.md)

# Minimal Vibe Coding Kit

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Claude](https://img.shields.io/badge/Claude-Command%20%26%20Skills-111111)
![Cursor](https://img.shields.io/badge/Cursor-Command%20%26%20Skills-1f6feb)
![Markdown](https://img.shields.io/badge/Format-Markdown-000000?logo=markdown&logoColor=white)
![Focus](https://img.shields.io/badge/Focus-Minimal%20%26%20Reusable-2ea44f)

**A minimal, project-agnostic kit for reusable AI-coding workflows — works on any repo, in any language.**

Drop it in, let the AI auto-detect your stack, approve the proposal, start shipping.

</div>

---

## Table of Contents

- [What This Repo Is](#what-this-repo-is)
- [How It Works (Template + Auto-Init)](#how-it-works-template--auto-init)
- [Quick Start](#quick-start)
- [First-Time Init Prompt](#first-time-init-prompt)
- [Repository Layout](#repository-layout)
- [Component Reference](#component-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [MIT License](#mit-license)

> 🇻🇳 Bạn muốn đọc tiếng Việt? Xem [README.vi.md](README.vi.md).

---

## What This Repo Is

A lightweight, project-agnostic kit of shared **rules**, **skills**, **commands**, and a **backbone manifest** that lets AI coding assistants (Claude Code, Cursor, etc.) understand any project consistently.

It is intentionally minimal:

- No heavy framework
- No forced structure
- Three template files do the heavy lifting:
  - [backbone.yml](backbone.yml) — single source of truth for project structure, paths, and conventions.
  - [CLAUDE-template.md](CLAUDE-template.md) — a CLAUDE.md skeleton with a **first-time init trigger**.
  - [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) — the prompt + step-by-step procedure with guardrails to bootstrap any repo.

## How It Works (Template + Auto-Init)

The flow is:

1. You copy the kit into a project. `backbone.yml` ships with `meta.template_status: uninitialized` and `<<PLACEHOLDER>>` values.
2. You either let the AI auto-detect the unfinished state, or paste the prompt from [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md).
3. The AI scans your repo for **stack fingerprints** declared in `backbone.yml → detection` (go.mod, package.json, pyproject.toml, Cargo.toml, framework configs, monorepo markers…).
4. It infers values (project name, language, ports, package manager, command checks, paths) and **proposes a single diff** against `backbone.yml`. If a `CLAUDE.md` already exists in the project, it **appends** the trigger block to the end instead of overwriting.
5. You review and approve (`yes` / `edit` / `abort`). On approval the AI writes the file and flips status to `initialized`.
6. Every later session reads the now-filled `backbone.yml` as the authoritative project map and **skips** the init flow.

No silent edits. No project-specific code shipped in the base kit. Works for single-repo, mono-repo, and multi-repo layouts.

## Quick Start

```bash
# 1. From this kit's root, copy the four artifacts into your target project
cp -R .claude /path/to/your-project/
cp -R .cursor /path/to/your-project/             # only if you also use Cursor
cp backbone.yml /path/to/your-project/
cp FIRST_TIME_INIT.md /path/to/your-project/

# 2. CLAUDE.md handling depends on whether one already exists:
#    - If your project HAS NO CLAUDE.md:
cp CLAUDE-template.md /path/to/your-project/CLAUDE.md
#    - If your project ALREADY HAS a CLAUDE.md:
#      Leave it alone. The AI will append the trigger block during init.

# 3. Open the project in Claude Code (or Cursor)
cd /path/to/your-project
claude                                            # or: cursor .

# 4. Paste the prompt from FIRST_TIME_INIT.md (or just ask the agent to run it).
#    The agent will show a proposed diff, wait for "yes", then mark init done.
```

## First-Time Init Prompt

For the canonical prompt, the guardrails, and the merge-vs-replace logic, see [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md).

Short version you can paste:

```text
Read FIRST_TIME_INIT.md and run the init flow. Detect my stack from the working tree,
propose a filled backbone.yml as a diff, and append (do not overwrite) the trigger
block to my existing CLAUDE.md if I already have one. Wait for my approval before writing.
```

## Repository Layout

```text
.
├── .claude/
│   ├── Init CLaude.md                       ← optional bootstrap instructions
│   ├── agent/                               ← role-specialised sub-agents
│   │   ├── code-reviewer.md
│   │   ├── debug-fixer.md
│   │   ├── hypothesis-planner.md
│   │   ├── implementation-hacker.md
│   │   ├── research-coordinator.md
│   │   ├── results-analyst.md
│   │   └── test-runner.md
│   ├── command/
│   │   └── council.md                       ← multi-agent coordination prompt
│   └── skills/
│       ├── autoresearch-coding/             ← metric-driven research loop
│       ├── clearthought/                    ← 37 structured-reasoning ops
│       ├── reviewing-4p-priorities/         ← P0–P4 issue triage (Fibery model)
│       └── sequential-thinking/             ← step-by-step iterative reasoning
├── .cursor/                                 ← mirror of .claude/ for Cursor
│   ├── Init CLaude.md
│   ├── agent/                               (same 7 agents)
│   ├── command/council.md
│   └── skills/                              (same 4 skills)
├── backbone.yml                ← project manifest template
├── CLAUDE-template.md          ← CLAUDE.md skeleton with init trigger
├── FIRST_TIME_INIT.md          ← init prompt + guardrails
├── LICENSE
├── README.md                   ← you are here (English)
└── README.vi.md                ← Tiếng Việt version
```

## Component Reference

### Templates

| File                                     | Purpose                                                                                                                         | When to Edit                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [backbone.yml](backbone.yml)             | Declares project name, repos, structure, conventions, command checks, protected/editable paths. The AI reads it every session.  | Edited automatically on first init. After that, update manually whenever you move folders, change ports, or add new rules/workflows. |
| [CLAUDE-template.md](CLAUDE-template.md) | Becomes the project's `CLAUDE.md`. Contains the first-time init trigger, the autoresearch rules, and the `trash`-not-`rm` rule. | Edit the _"Project-specific notes"_ section at the bottom. Keep the trigger block untouched so re-init works.                        |
| [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) | Standalone init runbook: ready-to-paste prompt, step-by-step procedure, guardrails (CLAUDE.md merge, done-marker, anti-rerun).  | Tighten guardrails or add stack-specific detection only when needed.                                                                 |

### Commands

| Component                                                | Short Description                | When to Use                                                                  |
| -------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| [.claude/command/council.md](.claude/command/council.md) | Multi-agent coordination prompt. | High-level analysis, planning, or multi-file changes. `use /council n=15, …` |

### Skills (`.claude/skills/`)

| Skill                                                               | Purpose                                                                                                  | When to Use                                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [autoresearch-coding/](.claude/skills/autoresearch-coding/)         | Metric-driven research loop with baseline, experiments, and a results log.                               | Performance tuning, prompt/model search, any task where you can score each attempt. |
| [clearthought/](.claude/skills/clearthought/)                       | 37 structured-reasoning operations (mental models, decision frameworks, simulation, optimisation, etc.). | Complex debugging, architecture trade-offs, decision-making with clear options.     |
| [reviewing-4p-priorities/](.claude/skills/reviewing-4p-priorities/) | Classifies issues/tasks into P0–P4 using the Fibery framework.                                           | Bug triage, backlog grooming, when you need a consistent priority bar.              |
| [sequential-thinking/](.claude/skills/sequential-thinking/)         | Step-by-step iterative reasoning with revision and branching.                                            | Long tasks, staged logic, exploration where scope is unclear.                       |

### Agents (`.claude/agent/`)

Drop-in role prompts for delegated work. Invoke with `claude --agent <name>` or have the council spawn them.

| Agent                                                              | Role                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| [code-reviewer.md](.claude/agent/code-reviewer.md)                 | Independent reviewer for diffs and PR-shaped changes.     |
| [debug-fixer.md](.claude/agent/debug-fixer.md)                     | Reproduces, isolates, and fixes a specific defect.        |
| [hypothesis-planner.md](.claude/agent/hypothesis-planner.md)       | Generates testable hypotheses and an experiment plan.     |
| [implementation-hacker.md](.claude/agent/implementation-hacker.md) | Fast, scrappy implementer for spikes and prototypes.      |
| [research-coordinator.md](.claude/agent/research-coordinator.md)   | Orchestrates the autoresearch loop end-to-end.            |
| [results-analyst.md](.claude/agent/results-analyst.md)             | Reads `results.tsv`, compares runs, recommends next step. |
| [test-runner.md](.claude/agent/test-runner.md)                     | Runs and triages test/lint/typecheck output.              |

### Cursor mirror

[.cursor/](.cursor/) replicates the same `agent/`, `command/`, and `skills/` tree so Cursor users get identical behavior. Keep the two trees in sync.

### Starter Prompts

#### Everyday task — chain steps, each building on the previous

Use this as your default opener. It pins the AI to `CLAUDE.md` + `backbone.yml` (so it respects your protected paths, command checks, and reasoning policy) and forces a step-by-step plan where each step consumes the previous one's findings.

**Template:**

```text
follow CLAUDE.md and backbone.yml to help me step by step:
- Step 1: Analyze ...
- Step 2: Using Step 1's findings, ...
- Step 3: Using Step 2's findings, ...
```

**Example — debug a slow endpoint:**

```text
follow CLAUDE.md and backbone.yml to help me step by step:
- Step 1: Analyze the request path of GET /api/v1/orders and list every layer it touches
  (router → middleware → service → repository → DB query).
- Step 2: Using Step 1's findings, identify the two most likely sources of the 1.2s p95
  latency we're seeing in production logs.
- Step 3: Using Step 2's findings, propose a fix with the smallest diff first, list the
  risks, and write the exact command_checks I should run before merging.
```

**Example — add a feature:**

```text
follow CLAUDE.md and backbone.yml to help me step by step:
- Step 1: Analyze where user notifications are produced today and which paths are
  protected (don't touch them silently).
- Step 2: Using Step 1's findings, design a minimal opt-in email digest that reuses the
  existing notification table — no new migrations unless unavoidable.
- Step 3: Using Step 2's findings, implement Step 2 end-to-end and report changed files,
  risks, and follow-ups.
```

#### Stacked-reasoning variant — when the task is gnarly

Layer in the reasoning skills explicitly when scope is unclear or trade-offs are non-obvious:

```text
use /sequential-thinking, /clearthought, and /council with n=20, follow CLAUDE.md and
backbone.yml to help me step by step:
- Step 1: Analyze ...
- Step 2: Using Step 1's findings, ...
- Step 3: Using Step 2's findings, ...
```

| Item                        | Tip                                                  | Example                                                                         |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `council` command           | `n=` controls agent count.                           | `use /council n=15, how does authentication work?`                              |
| `sequential-thinking` skill | Ask for explicit steps + checkpoints on long tasks.  | `use /sequential-thinking to debug login timeout step by step with checkpoints` |
| `clearthought` skill        | Ask for trade-offs and risks when comparing options. | `use /clearthought to compare JWT vs session auth for this codebase`            |

## Best Practices

**Setup**

- Commit `backbone.yml` and `CLAUDE.md` to your repo. They are project-level config, not personal config.
- Keep secrets out of `backbone.yml`. It lists _paths_ and _commands_, never values.
- After init, skim the generated `backbone.yml` and tighten `conventions.editable_paths` / `protected_paths` to fit your team.

**Day-to-day**

- Treat `backbone.yml` as the source of truth. When you rename a folder or add a workflow, update the manifest first — the AI will follow.
- Use `sequential-thinking` for _exploration_ (scope unclear) and `clearthought` for _decisions_ (options known, need to choose).
- Prefer the `council` command when a change touches more than two files.

**Editing the kit itself**

- Keep base templates project-neutral. No company names, no hardcoded ports, no proprietary frameworks.
- Mirror every change between `.claude/` and `.cursor/` so both tools stay aligned.
- Document each new command/skill with a one-line purpose and one example.
- Small, composable prompts beat large monolithic ones.

**Safety**

- Never bypass the `trash`-not-`rm` rule. Recoverable deletes save weekends.
- Never let the AI silently modify lockfiles, `.env*`, migrations, or infra. These belong in `conventions.protected_paths`.
- Branch experiments under `autoresearch/<YYYY-MM-DD>-<slug>`; commit only when the metric improves.

## Troubleshooting

| Symptom                            | Likely Cause                                                                        | Fix                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI ignores the init flow           | `CLAUDE.md` missing or trigger block edited away.                                   | Re-copy [CLAUDE-template.md](CLAUDE-template.md), or append the trigger block from [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) to your existing `CLAUDE.md`. |
| AI re-asks to init every session   | `meta.template_status` still `uninitialized` because the previous run was aborted.  | Run the init flow once, approve the diff, confirm `template_status` flipped to `initialized` and `initialized_at` is set.                                 |
| AI runs init twice in one minute   | Race between two sessions, or someone reverted the status.                          | The done-marker logic in [FIRST_TIME_INIT.md](FIRST_TIME_INIT.md) short-circuits — confirm `meta.initialized_at` is present; if not, complete the run.    |
| Wrong stack detected               | Lockfile from an old language still in the tree, or detection patterns out of date. | Delete the stale files, or extend `detection.stack_fingerprints` / `framework_hints` in [backbone.yml](backbone.yml).                                     |
| AI touches a path it shouldn't     | The path isn't listed under `conventions.protected_paths`.                          | Add it. Globs are supported.                                                                                                                              |
| Existing CLAUDE.md was overwritten | AI bypassed the merge guardrail.                                                    | Restore from git. Re-run init pointing to [FIRST_TIME_INIT.md § Guardrails](FIRST_TIME_INIT.md#guardrails).                                               |

---

## MIT License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

> 🇻🇳 _If you love Vietnam and its people, you are fully free to use everything in here at no cost._

### Contributing

**Created by**: [GiangBV](https://www.linkedin.com/in/buivangiang1992), [AuPMH](https://www.linkedin.com/in/pham-au-2a1bb1162)
**Powered by**: Caffeine, Determination, AI Collaboration, and Weekend Coding Sessions
