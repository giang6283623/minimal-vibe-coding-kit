---
name: parallel-analysis
description: Fan out 2-5 independent read-only analysis lanes across the repo using provider-ready native subagents or configured adapters, then merge the lane reports and verify them with a refutation pass. Use for repo-wide questions, large uncommitted-diff reviews, multi-doc reading, impact analysis, or consistency audits. Before dispatch, resolve the project's Default, Auto, or Custom orchestration preference.
argument-hint: "<analysis question, diff, or review target>"
user-invocable: true
effort: medium
---

# Parallel Analysis (Multi-Agent Fan-Out)

Split a large analysis into independent read-only lanes, run them concurrently
with the resolved ready adapters, merge the lane reports, and verify merged claims
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

## Orchestration preference and executor setup

Immediately before the first lane dispatch, follow .vibekit/docs/ORCHESTRATION_MODES.md in the parent session. Resolve Default, Auto, or Custom before selecting executors. The preference is global project state; .vibekit/parallel-analysis.json stores only skill-specific adapter details.

1. Read a remembered orchestration preference when present. If it is not remembered, use the parent runtime's native structured-question tool or its plain parent-conversation fallback.
2. Inspect .vibekit/parallel-analysis.json when present. Reuse only adapters whose non-mutating preflight still passes. A stale executor cache never suppresses an unresolved global mode question.
3. Build a bounded inventory of the active provider plus Codex, Claude, Cursor, Grok, and Kimi adapters that are already installed or exposed.
4. Classify every candidate as ready, installed-unverified, or unavailable using the shared contract. Auto uses ready adapters only.
5. Apply the selected mode:
   - Default: use the active provider's native child-agent facility and default model. If the host exposes no such facility, run the lanes sequentially in the current parent; do not switch providers.
   - Auto: split the independent lanes first, then route each lane to the lowest-cost ready model that satisfies context, tool, risk, and verification requirements. A heterogeneous set is allowed.
   - Custom: validate the user's role or lane assignments against the ready inventory. Ask in batches of at most three native questions when an assignment is missing.

### Readiness and model resolution

- native-subagents: ready only when the active Codex, Claude, Cursor, Grok, or Kimi host exposes a child-agent API with the required read-only boundary. Use the host's default model unless the remembered Custom assignment names another verified model.
- cursor-cli: cursor-agent must exist, report an authenticated session, expose the requested model, and support the read-only invocation below. Never assume a model alias from documentation or an old config.
- codex-cli: codex --version must succeed and the CLI must support a read-only exec invocation. Use its configured default model unless the user chose a verified model.
- provider CLI adapter: a Claude, Grok, or Kimi executable alone is installed-unverified. Mark it ready only when the project has a known non-interactive, read-only invocation contract plus a non-mutating authentication and model preflight.

Do not run login flows, inspect credentials, install a CLI, or silently change provider configuration. If readiness cannot be proven, exclude that adapter from Auto and show it as unavailable in Custom.

### Adapter cache

A version 2 cache may record verified execution details:

~~~json
{
  "version": 2,
  "adapters": {
    "current": {
      "kind": "native-subagents",
      "model": "provider-default",
      "readOnly": true,
      "status": "ready"
    }
  },
  "fallback": "current",
  "configuredAt": "2026-08-05T00:00:00Z"
}
~~~

Never store credentials, tokens, account data, or full preflight output. Existing version 1 executor, model, and fallback files remain readable as a legacy adapter cache, but they do not choose the global orchestration mode. To change execution details, ask for parallel-analysis setup again.

## Running a lane (per executor)

Every lane is READ-ONLY: search, read, summarize - never edit files, execute
project binaries, run hooks, or trigger installs/deploys/migrations.

- `native-subagents`: dispatch every lane through the active parent runtime's native child-agent facility with an explicit read-only brief. If the host cannot enforce read-only access, run sequentially in the parent instead of claiming lane isolation.
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
back-to-back without changing the briefs - merge and verification stay the
same.

## Workflow

1. **Scope.** State the question in one sentence. Split it into 2-5 lanes that
   are independent of each other (by directory, package, concern, or doc set).
   If lanes would depend on each other's output, merge them or run two rounds.
2. **Brief.** Give each lane a numbered brief: exact paths, the questions to
   answer, and the required return format ("facts only, numbered sections,
   findings as `file:line - issue - why it matters`").
3. **Launch all lanes at once** with the resolved ready adapter assignments.
4. **Prepare while waiting.** Build the merge skeleton; do not duplicate lane
   work.
5. **Merge.** Combine lane reports into one findings list. Mark conflicts
   between lanes and unknowns explicitly - never average away a disagreement.
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
findings as file:line - issue - why it matters.
```

## Guardrails

- 2-5 lanes per round; needing more means the question is under-scoped.
- Lanes are read-only; only the main session edits files. Agent-surface edits
  (`backbone.yml`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`,
  `.agents/**`, `.grok/**`, `.kimi-code/**`, `.codex/**`, `.codex-plugin/**`,
  kit skills/commands) additionally require the
  `agentshield-security-review` skill afterwards.
- Respect `backbone.yml` `policy.protected_paths` in every lane brief.
- Never put secrets in lane briefs or executor prompts: no `.env*` contents,
  credentials, tokens, private keys, or customer data.
- This skill produces analysis, not decisions; a lane may not conclude
  "therefore change X" without main-session review.
