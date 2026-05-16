# Claude Autoresearch Coding Kit

This kit adds an autoresearch-style coding workflow to Claude Code:

- A manual skill: `/autoresearch-coding`
- Focused custom agents for planning, implementation, testing, debugging, review, and result analysis
- A reusable experiment ledger: `results.tsv`
- A safe loop: baseline -> hypothesis -> patch -> run -> log -> keep or discard

## Install into a project

From the root of your target repository:

```bash
cp -R path/to/claude-autoresearch-coding-kit/.claude .
```

Then restart Claude Code so it loads the new agents and skill.

## Use

Start Claude Code in the project and run:

```text
/autoresearch-coding improve API latency; metric command: npm test -- --runInBand; direction: lower; editable paths: src/api src/lib; budget: 5
```

For a coordinator-led session:

```bash
claude --agent research-coordinator
```

Then give it an experiment contract:

```text
Goal: reduce checkout endpoint latency.
Metric command: npm run bench:checkout.
Direction: lower is better.
Editable paths: src/checkout, src/db.
Protected paths: migrations, package-lock.json, .env*, infra.
Budget: 8 experiments.
Timeout: 10m per run.
```

## Safety defaults

The workflow assumes a clean git working tree. If the tree is dirty, the agents should stop and ask you to commit, stash, or explicitly permit working with dirty state. The loop should not deploy, delete data, rotate secrets, rewrite protected history, or modify files outside the editable scope.

## Files

```text
.claude/
  skills/autoresearch-coding/SKILL.md
  skills/autoresearch-coding/references/experiment-contract.md
  skills/autoresearch-coding/references/result-ledger.md
  skills/autoresearch-coding/scripts/log_result.py
  skills/autoresearch-coding/scripts/run_logged.py
  agents/research-coordinator.md
  agents/hypothesis-planner.md
  agents/implementation-hacker.md
  agents/test-runner.md
  agents/debug-fixer.md
  agents/code-reviewer.md
  agents/results-analyst.md
```
