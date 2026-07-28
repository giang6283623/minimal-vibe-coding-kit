---
name: parallel-analysis
description: Fan out 2-5 independent read-only analysis lanes across the repo using your configured executor (Cursor CLI Composer, Claude subagents, or Codex CLI), then merge the lane reports and verify them with a refutation pass. Use for repo-wide questions, large uncommitted-diff reviews, multi-doc reading, impact analysis, or consistency audits. On first use it asks which provider/model to use and saves the answer so it never asks again.
argument-hint: "<analysis question, diff, or review target>"
user-invocable: true
effort: medium
---

# Parallel Analysis (Multi-Agent Fan-Out)

Split a large analysis into independent read-only lanes, run them concurrently
with the configured executor, merge the lane reports, and verify merged claims
with a skeptical refutation pass. One round of parallel lanes replaces slow
serial reading; the verification lane replaces manual double-checking.

This skill is project-agnostic: it works in any repo where the kit is
installed, using that repo's `backbone.yml` (if present) for boundaries.

## Best Use

- Repo-wide questions ("where is X handled, what depends on Y").
- Reviewing a large uncommitted diff by concern (backend vs frontend vs i18n
  vs scripts).
- Reading several large docs, plans, or reference trees at once.
- Pre-change impact analysis across packages/apps listed in `backbone.yml`
  `paths.apps`.
- Consistency audits (docs vs code, rules vs skills, config vs actual layout).

Do NOT use for single-file questions or quick lookups; direct reads are faster.

## Executor Setup (first use only)

Lane execution is delegated to ONE configured executor. The choice is stored
in `.vibekit/parallel-analysis.json`; while that file exists and its preflight
passes, NEVER ask again.

1. **If `.vibekit/parallel-analysis.json` exists**: read it, run the matching
   preflight below, and proceed silently on success. If preflight fails
   (binary missing, logged out), tell the user what broke, offer to re-run
   setup, and update the file with their answer.
2. **If it does not exist**: detect what is available, then ask the user ONE
   question — "Which provider should run parallel analysis lanes?" — using the
   harness-native prompt (AskUserQuestion in Claude Code; a plain chat
   question in Cursor/Codex). Offer, in this order:
   - **Cursor CLI + Composer 2.5 Fast (recommended)** — fastest lane executor;
     requires `cursor-agent` installed and logged in.
   - **Claude subagents** — no extra install; lanes run as read-only Claude
     Code subagents (Explore/general-purpose). Choose this automatically if
     the user declines external CLIs.
   - **Codex CLI** — lanes run via `codex exec` in a read-only sandbox with
     the best available Codex model.
3. **Resolve the model** for the chosen provider (see per-executor notes),
   confirm the resolved value in one line, and write the config file. Include
   a fallback executor so lanes still run when the primary is unavailable.

### Preflights and model resolution

- `cursor-cli`: `cursor-agent status` must report logged in (otherwise the
  user runs `cursor-agent login` once). Resolve the model with
  `cursor-agent --list-models` and prefer the Composer 2.5 fast variant
  (e.g. `composer-2.5-fast`); if absent, use the newest Composer model and
  record what was picked.
- `claude-subagents`: available whenever running inside Claude Code; no
  binary needed. Use read-only subagent types only.
- `codex-cli`: `codex --version` must succeed. Use the CLI's default/best
  coding model unless the user names one; record the resolved model.

### Config file — `.vibekit/parallel-analysis.json`

```json
{
  "executor": "cursor-cli",
  "model": "composer-2.5-fast",
  "fallback": "claude-subagents",
  "configuredAt": "2026-07-16T07:30:00Z"
}
```

`executor` is one of `cursor-cli` | `claude-subagents` | `codex-cli`. The file
is local state (gitignored by default); a team may commit it deliberately to
share a default. To change the choice later, delete the file or ask for
"parallel-analysis setup" again.

## Running a lane (per executor)

Every lane is READ-ONLY: search, read, summarize — never edit files, execute
project binaries, run hooks, or trigger installs/deploys/migrations.

- `cursor-cli`:

  ```sh
  cursor-agent -p --mode ask --output-format text \
    --model "<configured-model>" \
    --workspace "<repo-root>" \
    "<lane brief>"
  ```

  Never pass `--force` or `--yolo`; `--mode ask` keeps Composer read-only.
  One workspace per lane; a question spanning multiple repos becomes one lane
  per repo.
- `claude-subagents`: launch each lane as a read-only subagent with the lane
  brief as its prompt, all lanes in ONE message so they run concurrently.
- `codex-cli`:

  ```sh
  codex exec --sandbox read-only -C "<repo-root>" "<lane brief>"
  ```

If the harness cannot run lanes concurrently (plain CLI loop), run them
back-to-back without changing the briefs — merge and verification stay the
same.

## Workflow

1. **Scope.** State the question in one sentence. Split it into 2-5 lanes that
   are independent of each other (by directory, package, concern, or doc set).
   If lanes would depend on each other's output, merge them or run two rounds.
2. **Brief.** Give each lane a numbered brief: exact paths, the questions to
   answer, and the required return format ("facts only, numbered sections,
   findings as `file:line — issue — why it matters`").
3. **Launch all lanes at once** with the configured executor.
4. **Prepare while waiting.** Build the merge skeleton; do not duplicate lane
   work.
5. **Merge.** Combine lane reports into one findings list. Mark conflicts
   between lanes and unknowns explicitly — never average away a disagreement.
6. **Verify.** Run one verification lane that receives the merged claims (not
   the reasoning) with the instruction: "Default-skeptical: confirm or refute
   each claim against the repo with file:line evidence." Drop or re-investigate
   every refuted claim; never silently keep one.
7. **Deliver.** Report merged findings, what was verified, and remaining
   unknowns. For issue triage, classify surviving findings with the
   `reviewing-4p-priorities` skill (P0-P4). Decisions and edits stay in the
   main session under the repo's normal review rules.

## Lane brief template

```text
Lane <n>: <one-line purpose>
Workspace: <repo root>
Paths: <exact dirs/files>
Read-only. Do not modify anything or execute binaries/scripts.
Questions:
1. <specific question>
2. <specific question>
Return: numbered sections matching the questions, facts only,
findings as file:line — issue — why it matters.
```

## Guardrails

- 2-5 lanes per round; needing more means the question is under-scoped.
- Lanes are read-only; only the main session edits files. Agent-surface edits
  (`backbone.yml`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`,
  `.agents/**`, `.codex/**`, kit skills/commands) additionally require the
  `agentshield-security-review` skill afterwards.
- Respect `backbone.yml` `policy.protected_paths` in every lane brief.
- Never put secrets in lane briefs or executor prompts: no `.env*` contents,
  credentials, tokens, private keys, or customer data.
- This skill produces analysis, not decisions; a lane may not conclude
  "therefore change X" without main-session review.
