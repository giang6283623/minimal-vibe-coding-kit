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

- Goal and observable success condition.
- Metric command as an argument vector, not an interpolated shell string.
- Metric extraction rule, direction (`lower` or `higher`), minimum meaningful delta, and accepted exit codes.
- Repeat count, aggregation, tolerance, and warmup policy. Default to one measured run only for deterministic checks; otherwise use at least three and report variance.
- Editable paths.
- Protected paths, including metric scripts, fixtures, expected outputs, and other oracle assets.
- Budget, default 3.
- Per-run timeout, default 10 minutes.
- Required environment, tool versions, seed, and network or service dependencies.

If the metric command or editable scope is missing, infer conservative defaults and show the contract before editing. If no safe metric exists, ask for one. Always print the resolved contract before the baseline run, label inferred fields, and fail closed when editable and protected paths overlap.

Treat a metric command as executable authority. Prefer a repository-owned, already documented validation command. Inspect unfamiliar scripts before running them. Do not use deploys, migrations, package lifecycle scripts, untrusted hooks, or commands with external side effects as a metric unless the user explicitly authorizes that exact effect. Pass commands to `scripts/run_logged.py` as argv after `--`; never concatenate user-controlled text into a shell command.

For this kit itself, use:

```text
goal: improve Minimal Vibe Coding Kit quality
metric command: node .vibekit/scripts/validate-kit.mjs .
direction: higher
metric extraction: exit 0 = 1, validation failure = 0; warnings are a secondary measure
minimum delta: 1, except an equal score may keep a predeclared safety simplification with focused regression proof
measurement: deterministic, 1 run, tolerance 0, no warmup
editable paths: .vibekit/docs .vibekit/scripts .vibekit/skills .vibekit/commands .claude .cursor .agents .grok .kimi-code .codex .codex-plugin .github README.md AGENTS.md .vibekit/init/CLAUDE-template.md .vibekit/init/FIRST_TIME_INIT.md .vibekit/init/FIRST_PROMPT.md backbone.yml package.json install.sh install.ps1
protected paths: .git .env* node_modules vendor secrets lockfiles and the metric oracle unless a new contract is approved
budget: 3
```

## Setup

1. Read `backbone.yml`. If `meta.template_status` is `uninitialized`, follow `.vibekit/init/FIRST_TIME_INIT.md` and wait for explicit approval before experiment edits.
2. Inspect `git status --short`.
3. If user changes exist, stop unless the user permits dirty-state experimentation. When permitted, record a baseline fingerprint containing `HEAD`, the changed-path inventory, and a digest of the starting diff. Never record secret contents.
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

Before each trial, snapshot only the editable files that the trial will touch and record their hashes. This is the experiment-owned trial delta. Never use `git reset`, `git clean`, checkout replacement, or a broad revert to discard a trial in a dirty tree.

## Baseline

Before edits:

1. Capture the metric command and protected oracle asset digests.
2. Run the declared warmups, then the declared measured repetitions in the same environment.
3. Save bounded, redacted output under `.autoresearch/logs/`; logs must be project-local, owner-only, and must not contain secrets.
4. Extract the metric value using `references/metric-extraction.md`. If ambiguous, use pass/fail plus warning count and explain.
5. Append a baseline row with status `keep`.

## Experiment loop

For each experiment:

1. Read the best kept result from `results.tsv`.
2. Form one small hypothesis.
3. Modify only editable paths.
4. Run the exact metric command with the declared timeout, repetitions, environment, and log bounds.
5. Decide:
   - `keep`: the aggregate improves by at least the minimum delta, or it is within tolerance and a predeclared secondary safety or simplicity measure improves with focused proof.
   - `discard`: the aggregate is worse, is within tolerance without the predeclared secondary improvement, or improves only by changing the oracle.
   - `crash`: the harness times out, cannot start, loses dependencies, or produces no usable metric. A declared validation exit code may be a valid score of zero rather than a crash.
6. Append a row to `results.tsv`.
7. Keep good changes. Revert only the current experiment-owned trial delta for discarded or crashed changes, then verify the pre-trial hashes and the baseline dirty-path inventory.
8. If a crash is from a trivial patch mistake, fix once and rerun.

Do not tune against one noisy observation. Compare aggregates, retain every measured value in the log, report variance, and treat improvements smaller than the declared tolerance or minimum delta as ties. Do not modify metric or oracle assets during a trial. If an oracle change is necessary, close the trial, revise the contract, take a new baseline, and disclose the break in comparability.

If a kept change touches agent surfaces such as `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `.agents/**`, `.grok/**`, `.kimi-code/**`, `.codex/**`, `.codex-plugin/**`, `.vibekit/skills/**`, `.vibekit/commands/**`, `.vibekit/scripts/**`, hooks, or MCP config, run the AgentShield probe before final reporting.

## Delegation

Before dispatching the first subagent, follow .vibekit/docs/ORCHESTRATION_MODES.md in the parent session. Keep the selected provider mode separate from this experiment's editable scope, metric, budget, and safety gates.

Delegate only when the task is large enough to benefit and the runtime can enforce the required scope. Never let an implementation lane edit metric or oracle assets, and never call a same-context review independent. Sequential execution remains valid for small bounded experiments.

When delegation is proportionate, use only the roles needed:

- `hypothesis-planner`: next experiment idea.
- `implementation-hacker`: apply scoped patch.
- `test-runner`: run noisy commands and return metrics.
- `debug-fixer`: fix trivial crash bugs.
- `code-reviewer`: review kept changes.
- `results-analyst`: summarize ledger.
- `security-reviewer`: review agent-surface changes.

## Stop

Stop when budget is reached, the metric is missing or untrustworthy, protected paths are needed, the oracle drifts, one scope or security invariant is violated, three consecutive crashes happen, or the user changes the goal. A repeated crash consumes budget; it never creates an unbounded repair loop.

## Final report

Before reporting, rerun the metric and repository validation on the exact integrated tree, verify the protected oracle digest is unchanged, and confirm no discarded trial delta remains.

Report baseline, every aggregate and variance, best metric, minimum delta, kept/discarded/crashed counts, changed files, validation output, security probe result when relevant, baseline and final fingerprints, risks, and log locations. Distinguish deterministic evidence, self-review, and independent review.
