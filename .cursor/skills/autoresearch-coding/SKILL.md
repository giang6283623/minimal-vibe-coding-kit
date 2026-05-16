---
name: autoresearch-coding
description: Run a metric-driven coding experiment loop inspired by autoresearch. Use manually when the user wants Claude Code to improve a codebase through repeated experiments, benchmark-guided optimization, test-driven repair, or keep/discard comparison of code changes.
disable-model-invocation: true
argument-hint: "goal; metric command; direction; editable paths; budget"
---

# Autoresearch Coding Loop

Run a controlled coding experiment loop. Treat the user's request as an experiment contract. Do not run open-ended destructive work.

## Inputs to extract

From `$ARGUMENTS`, identify:

- Goal: what to improve.
- Metric command: test, benchmark, lint, or evaluation command.
- Direction: `lower` or `higher` is better.
- Editable paths: files or directories allowed to change.
- Protected paths: files or directories that must not change.
- Budget: number of experiments. Default to 3 if not specified.
- Timeout: maximum per run. Default to 10 minutes if not specified.

If the metric command or editable scope is missing, infer a conservative default from the repository, then show the inferred contract before making changes. If the repository has no clear test or benchmark command, ask the user for the metric command.

See `references/experiment-contract.md` for the contract format and `references/result-ledger.md` for ledger rules.

## Required setup

1. Inspect `git status --short`.
2. If there are uncommitted user changes, stop before making edits unless the user explicitly allowed dirty-state experimentation.
3. Create or switch to an experiment branch named `autoresearch/<date>-<slug>`.
4. Create these local-only paths if missing:
   - `.autoresearch/logs/`
   - `.autoresearch/notes/`
   - `results.tsv`
5. Initialize `results.tsv` with this header if it does not exist:

```tsv
commit	metric_value	direction	status	seconds	log_path	description
```

Do not commit `results.tsv` or `.autoresearch/` unless the user explicitly asks.

## Baseline first

Before making any code change:

1. Run the metric command once as the baseline.
2. Save the full output to `.autoresearch/logs/baseline.log`.
3. Extract the metric value. If extraction is ambiguous, summarize the command output and ask the user which value to optimize.
4. Append the baseline row to `results.tsv` with status `keep`.

## Experiment loop

For each experiment until the budget is reached or the user interrupts:

1. Read the best result so far from `results.tsv`.
2. Form one hypothesis that is small enough to evaluate in one run.
3. Modify only the editable paths. Do not touch protected paths.
4. Commit the patch with a short experiment message before running it.
5. Run the metric command with timeout and redirect output to a new log file.
6. Extract the metric value and elapsed seconds.
7. Decide status:
   - `keep`: metric improves over the best kept result, or metric is equal with meaningfully simpler code.
   - `discard`: metric is worse or equal without simplification.
   - `crash`: command fails, times out, or produces no usable metric.
8. Append a row to `results.tsv`.
9. If status is `keep`, keep the commit and continue from it.
10. If status is `discard`, reset back to the previous kept commit.
11. If status is `crash`, inspect the last 80 lines of the log. Fix only trivial mistakes caused by the patch, amend the commit, and rerun once. If it still crashes, reset back to the previous kept commit.

## Delegation pattern

Use subagents when available:

- `hypothesis-planner`: generate the next experiment idea from code and results.
- `implementation-hacker`: apply the selected patch within editable paths.
- `test-runner`: run noisy commands and return only metrics, failures, and log paths.
- `debug-fixer`: repair trivial crash bugs in the active experiment.
- `code-reviewer`: review kept changes for risks before the final summary.
- `results-analyst`: summarize the ledger and suggest next high-value experiments.

Keep verbose logs out of the main conversation. Prefer log files and concise extracted summaries.

## Stop conditions

Stop and report when:

- Budget is reached.
- The metric command is missing or ambiguous.
- The working tree has unapproved user changes.
- A required command would modify protected files or external systems.
- Three consecutive experiments crash for unrelated reasons.
- The user interrupts or changes the goal.

## Final response

Report:

- Best kept commit and metric.
- Baseline metric and improvement.
- Number of experiments run, kept, discarded, and crashed.
- Changed files.
- Important risks or follow-up tests.
- Location of `results.tsv` and logs.
