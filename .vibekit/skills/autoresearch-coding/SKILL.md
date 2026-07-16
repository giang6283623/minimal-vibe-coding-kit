---
name: autoresearch-coding
description: Run a metric-driven coding experiment loop. Use when improving a repo through repeated hypotheses, benchmark-guided changes, validation, keep/discard decisions, or safe workflow enhancement. Requires a goal, metric command, direction, editable paths, protected paths, and budget.
disable-model-invocation: true
argument-hint: goal; metric command; direction; editable paths; protected paths; budget; timeout
---

# Autoresearch Coding Loop

Run a controlled experiment loop. Do not perform open-ended destructive work.

## Contract

Extract or infer:

- Goal.
- Metric command.
- Direction: `lower` or `higher` is better.
- Editable paths.
- Protected paths.
- Budget, default 3.
- Timeout, default 10 minutes.

If the metric command or editable scope is missing, infer conservative defaults and show the contract before editing. If no safe metric exists, ask for one.
Always print the resolved contract before the baseline run, and label inferred fields.

For this kit itself, use:

```text
goal: improve Minimal Vibe Coding Kit quality
metric command: node .vibekit/scripts/validate-kit.mjs .
direction: higher
editable paths: .vibekit/docs .vibekit/scripts .vibekit/skills .vibekit/commands .claude .cursor .agents .codex-plugin .github README.md AGENTS.md .vibekit/init/CLAUDE-template.md .vibekit/init/FIRST_TIME_INIT.md .vibekit/init/FIRST_PROMPT.md backbone.yml package.json install.sh install.ps1
protected paths: .git .env* node_modules vendor secrets lockfiles
budget: 3
```

## Setup

1. Read `backbone.yml`. If `meta.template_status` is `uninitialized`, follow `.vibekit/init/FIRST_TIME_INIT.md` and wait for explicit approval before experiment edits.
2. Inspect `git status --short`.
3. If user changes exist, stop unless the user permits dirty-state experimentation.
4. Create or switch to an experiment branch named `autoresearch/<date>-<slug>` when a git repo is available. If branch creation is blocked by permissions, ask for approval once and record any approved fallback.
5. Create local-only paths if missing:
   - `.autoresearch/logs/`
   - `.autoresearch/notes/`
   - `results.tsv`
6. Initialize `results.tsv` with:

```text
commit	metric_value	direction	status	seconds	log_path	description
```

Do not commit `.autoresearch/` or `results.tsv` unless the user asks.

## Baseline

Before edits:

1. Run the metric command once.
2. Save output to `.autoresearch/logs/baseline.log`.
3. Extract a metric value using `references/metric-extraction.md`. If ambiguous, use pass/fail plus warning count and explain.
4. Append a baseline row with status `keep`.

## Experiment loop

For each experiment:

1. Read the best kept result from `results.tsv`.
2. Form one small hypothesis.
3. Modify only editable paths.
4. Run the metric command with timeout and log output.
5. Decide:
   - `keep`: metric improves, or equal metric with simpler safer code.
   - `discard`: worse or equal without simplification.
   - `crash`: command fails, times out, or no usable metric.
6. Append a row to `results.tsv`.
7. Keep good changes; revert discarded or crashed changes.
8. If a crash is from a trivial patch mistake, fix once and rerun.

If a kept change touches agent surfaces such as `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.codex-plugin/**`, `.vibekit/skills/**`, `.vibekit/commands/**`, `.vibekit/scripts/**`, hooks, or MCP config, run the AgentShield probe before final reporting.

## Delegation

Use subagents when available:

- `hypothesis-planner`: next experiment idea.
- `implementation-hacker`: apply scoped patch.
- `test-runner`: run noisy commands and return metrics.
- `debug-fixer`: fix trivial crash bugs.
- `code-reviewer`: review kept changes.
- `results-analyst`: summarize ledger.
- `security-reviewer`: review agent-surface changes.

## Stop

Stop when budget is reached, metric is missing, protected paths are needed, three unrelated crashes happen, or the user changes the goal.

## Final report

Report baseline, best metric, kept/discarded/crashed counts, changed files, validation output, security probe result when relevant, risks, and log locations.
